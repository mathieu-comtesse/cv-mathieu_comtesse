// Rendu « trait » des machines : chaque pièce n'est plus qu'un tracé de ses arêtes (comme un SVG), sans remplissage, sans lumière ni ombre.
// Les pièces restent dans la scène (matériau masqué) : animations, visibilité, sélection au pointeur et surbrillance continuent de fonctionner,
// les traits étant enfants des pièces. Les écrans et étiquettes (textures dessinées) restent affichés à plat : ils portent les valeurs animées.
import * as THREE from 'three';

export const INK = '#f2f6ff';
const PAPER = new THREE.Color('#f4efe1'), TEXT = '#15171c';   // cartouches : fond crème, texte noir
const ANGLE = 35;                                    // arête tracée si les deux faces font plus de 35° (silhouette d'une boîte, cercles d'un cylindre)
const edgeCache = new WeakMap();

/** arêtes d'une géométrie ; une forme lisse sans arête vive (bille) prend son maillage de méridiens et parallèles */
export function edgesOf(geo) {
  let e = edgeCache.get(geo);
  if (!e) { e = new THREE.EdgesGeometry(geo, ANGLE); if (!e.attributes.position.count) { e.dispose(); e = new THREE.EdgesGeometry(geo, 1); } edgeCache.set(geo, e); }
  return e;
}

/* arêtes d'un maillage instancié : recopiées pour chaque instance (recalculées quand les instances bougent) */
function bakeInstances(im, base, out) {
  const src = base.attributes.position.array, n = src.length, total = n * im.count;
  let attr = out.getAttribute('position');
  if (!attr || attr.array.length !== total) { attr = new THREE.BufferAttribute(new Float32Array(total), 3); out.setAttribute('position', attr); }
  const a = attr.array, m4 = new THREE.Matrix4(), e = m4.elements;
  for (let i = 0; i < im.count; i++) {
    im.getMatrixAt(i, m4);
    for (let j = 0, k = i * n; j < n; j += 3, k += 3) { const x = src[j], y = src[j + 1], z = src[j + 2];
      a[k] = e[0] * x + e[4] * y + e[8] * z + e[12]; a[k + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; a[k + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]; }
  }
  attr.needsUpdate = true; out.computeBoundingSphere();
}

/** convertit l'arbre `root` en traits ; renvoie sync(), à appeler avant chaque rendu (voyants, matériaux échangés, instances, géométries déformées).
 *  occlude : les faces opaques masquent les arêtes situées derrière elles (lecture d'un plan, pas d'un fil de fer) ;
 *  hidden : opacité des arêtes cachées, tracées en pointillé fin (convention du dessin technique), 0 pour ne pas les tracer ;
 *  fill : couleur d'aplat des faces opaques (null : faces invisibles, seul le fond de page apparaît). */
export function toLines(root, { color = INK, opacity = .85, occlude = false, hidden = 0, fill = null, facets = false, halo = false, focus = 0 } = {}) {
  const lineMats = new Map(), images = new Map(), live = [], skins = new Map();
  const skinMat = occlude || fill ? new THREE.MeshBasicMaterial({ color: fill || 0, colorWrite: !!fill, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, toneMapped: false }) : null;
  if (skinMat && facets) facetTones(skinMat);
  /* peau propre à une pièce qui porte une information de couleur : voyant (s'allume de sa couleur), instances colorées (billes, perles, cordons) */
  const skinOf = (src, o) => {
    if (!fill || !(src.emissive || o.instanceColor)) return skinMat;
    const k = o.instanceColor ? o : src; let m = skins.get(k);
    if (!m) { m = skinMat.clone(); if (o.instanceColor) m.color.set('#ffffff'); if (facets) facetTones(m); skins.set(k, { m, src, inst: !!o.instanceColor }); return m; }
    return m.m;
  };
  const dashMat = hidden ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: hidden, dashSize: 5, gapSize: 4, depthWrite: false, depthFunc: THREE.GreaterDepth }) : null;
  const lineMatOf = (m) => {
    let l = lineMats.get(m);
    if (!l) { l = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }); lineMats.set(m, l); }
    return l;
  };
  const plate = fill ? PAPER : null;   // avec aplat : étiquettes, écrans et compteurs deviennent des cartouches crème à texte noir
  const imageOf = (m) => images.get(m) || images.set(m, inkImage(m, plate ? TEXT : color, plate)).get(m);
  /* habille la pièce selon son matériau du moment : image -> encre, sinon matériau masqué et traits visibles */
  const dress = (it) => {
    const o = it.o, src = Array.isArray(o.material) ? o.material[0] : o.material;
    it.src = o.material;
    if (src.map) { o.material = it.mat = imageOf(src); if (it.lines) it.lines.visible = false; return; }
    if (!it.lines) {
      it.lines = new THREE.LineSegments(o.isInstancedMesh ? it.geo : edgesOf(o.geometry)); it.lines.raycast = () => {}; it.lines.userData.glowShell = true;   // les traits ne comptent ni pour la sélection ni pour la surbrillance
      if (o.isInstancedMesh) { it.lines.matrixAutoUpdate = false; it.lines.matrix.identity(); }
      o.add(it.lines); o.userData.edges = it.lines;
      if (skinMat) {                                 // peau : même géométrie, aplat ou simple masque de profondeur, jamais sélectionnable
        const sm = skinOf(src, o);
        it.skin = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, sm, o.count) : new THREE.Mesh(o.geometry, sm);
        if (o.isInstancedMesh) { it.skin.instanceMatrix = o.instanceMatrix; it.skin.matrixAutoUpdate = false; if (o.instanceColor) it.skin.instanceColor = o.instanceColor; }
        it.skin.raycast = () => {}; it.skin.userData.glowShell = true; o.add(it.skin);
      }
      if (dashMat && !o.isInstancedMesh) { it.dash = new THREE.LineSegments(it.lines.geometry, dashMat); it.dash.computeLineDistances(); it.dash.raycast = () => {}; it.dash.userData.glowShell = true; o.add(it.dash); }
    }
    if (it.skin) it.skin.visible = !src.transparent;   // le verre et les pièces en fondu ne masquent rien
    it.lines.material = focus ? (it.lm = lineMatOf(src).clone()) : lineMatOf(src); it.lines.visible = true;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.visible = false; });   // matériau d'origine gardé (les animations le lisent ou le modifient), jamais dessiné
    it.mat = o.material;
  };
  root.traverse((o) => {
    if (!o.isMesh || o.userData.glowShell) return;
    const it = { o, g: o.geometry, v: o.geometry.attributes.position.version };
    if (o.isInstancedMesh) { it.geo = new THREE.BufferGeometry(); it.iv = o.instanceMatrix.version; bakeInstances(o, edgesOf(o.geometry), it.geo); }
    o.castShadow = o.receiveShadow = false;
    live.push(it);
  });
  live.forEach(dress);
  if (halo && fill) {                                // halo doux sous le socle : la machine repose sur la carte au lieu de flotter
    root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(root), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), haloMat()); h.userData.glowShell = true; h.raycast = () => {}; h.renderOrder = -1;
    h.scale.set(sz.x * 1.25, 1, sz.z * 1.35); const inv = root.matrixWorld.clone().invert(); h.position.copy(new THREE.Vector3(c.x, b.min.y - sz.y * .002, c.z).applyMatrix4(inv));
    h.scale.multiplyScalar(1 / root.getWorldScale(new THREE.Vector3()).x); root.add(h);
    h.geometry.boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); h.frustumCulled = false;   // le halo ne compte pas dans le cadrage de la machine
  }
  return function sync() {
    for (const it of live) {
      const o = it.o;
      if (o.material !== it.mat) dress(it);         // matériau échangé par l'animation (feuille, enveloppe, voyant)
      if (o.isInstancedMesh) { if (o.instanceMatrix.version !== it.iv) { it.iv = o.instanceMatrix.version; bakeInstances(o, edgesOf(o.geometry), it.geo); } }
      else if (it.lines && (o.geometry !== it.g || o.geometry.attributes.position.version !== it.v)) {   // géométrie déformée ou remplacée : arêtes recalculées
        if (o.geometry === it.g) edgeCache.delete(it.g);
        it.g = o.geometry; it.v = it.g.attributes.position.version; it.lines.geometry = edgesOf(it.g);
        if (it.skin) it.skin.geometry = it.g;
        if (it.dash) { it.dash.geometry = it.lines.geometry; it.dash.computeLineDistances(); }
      }
    }
    for (const { m, src, inst } of skins.values()) {   // voyant : la face s'allume de sa couleur, éteint il reprend l'aplat
      if (inst) continue; const lit = src.emissiveIntensity > .05 && (src.emissive.r + src.emissive.g + src.emissive.b) > .05;
      m.color.copy(lit ? src.emissive : skinMat.color);
    }
    for (const [m, l] of lineMats) {                 // voyant allumé : le trait prend sa couleur ; pièce en fondu : le trait s'efface avec elle
      const lit = m.emissive && m.emissiveIntensity > .05 && (m.emissive.r + m.emissive.g + m.emissive.b) > .05;
      l.color.set(lit ? m.emissive : color);
      l.opacity = opacity * (m.transparent ? Math.min(1, m.opacity * 1.6) : 1);
    }
    if (focus) {                                     // accent : la pièce qui bouge reste en trait plein, le reste s'efface à `focus` ; tout revient au plein quand rien ne bouge
      const now = performance.now(), dt = Math.min(.1, (now - (sync.t || now)) / 1000); sync.t = now; let any = false;
      for (const it of live) {
        if (!it.lm) continue; const o = it.o, e = o.matrixWorld.elements, p = it.pm || (it.pm = e.slice());
        let moved = o.visible !== it.pv || (o.isInstancedMesh && o.instanceMatrix.version !== it.pi);
        for (let i = 0; i < 16 && !moved; i++) if (Math.abs(e[i] - p[i]) > 1e-5) moved = true;
        if (moved) { for (let i = 0; i < 16; i++) p[i] = e[i]; it.pv = o.visible; it.pi = o.isInstancedMesh ? o.instanceMatrix.version : 0; it.until = now + 700; }
        if (it.until > now) any = true;
      }
      sync.k = (sync.k ?? 0) + ((any ? 1 : 0) - (sync.k ?? 0)) * (1 - Math.exp(-dt * 3));   // l'effacement n'existe que pendant un mouvement
      for (const it of live) {
        if (!it.lm) continue; const target = it.until > now ? 1 : 0; it.lv = (it.lv ?? 1) + (target - (it.lv ?? 1)) * (1 - Math.exp(-dt * 5));
        const base = lineMatOf(it.src && !Array.isArray(it.src) ? it.src : it.o.material); it.lm.color.copy(base.color);
        it.lm.opacity = base.opacity * (1 - sync.k * (1 - focus) * (1 - it.lv));
      }
    }
    for (const [src, m] of images) { m.map = src.map; m.opacity = .9 * opacity * (src.transparent ? src.opacity : 1); }
  };
}

/* image dessinée (étiquette, écran, compteur, feuille) passée au trait : le texte et les tracés (tout ce qui diffère du fond, pris au coin
   de l'image) prennent l'encre ; une couleur franche (voyant d'état rouge ou vert) garde sa teinte. Sans plaque, le fond devient transparent ;
   avec plaque, il prend la couleur de plaque (cartouche lisible sur l'aplat). */
function inkImage(src, color, plate) {
  const m = new THREE.MeshBasicMaterial({ map: src.map, transparent: true, side: src.side, depthWrite: !!plate, toneMapped: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uInk = { value: new THREE.Color(color) }; sh.uniforms.uPlate = { value: plate || new THREE.Color() };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uInk, uPlate;').replace('#include <map_fragment>', plate ? `
      /* cartouche : l'image est imprimée en noir sur crème ; fond clair -> crème, traits sombres -> noir ; un écran sombre à texte clair est inversé ;
         seules les couleurs vives (voyant, aiguille) gardent leur teinte */
      vec4 tx = texture2D(map, vMapUv), bg = texture2D(map, vec2(.004, .996));
      float l = dot(tx.rgb, vec3(.299, .587, .114)), lb = bg.a > .5 ? dot(bg.rgb, vec3(.299, .587, .114)) : 1.,
            p = lb > .4 ? l / lb : (1. - l) / max(.05, 1. - lb), sat = max(tx.r, max(tx.g, tx.b)) - min(tx.r, min(tx.g, tx.b));
      diffuseColor.rgb = mix(mix(uInk, uPlate, smoothstep(.3, .8, p)), tx.rgb, smoothstep(.35, .5, sat)); diffuseColor.a *= tx.a;` : `
      vec4 tx = texture2D(map, vMapUv), bg = texture2D(map, vec2(.004, .996));
      float sat = max(tx.r, max(tx.g, tx.b)) - min(tx.r, min(tx.g, tx.b)), ink = smoothstep(.08, .3, distance(tx.rgb, bg.rgb));
      diffuseColor.rgb = mix(uInk, tx.rgb, smoothstep(.25, .45, sat)); diffuseColor.a *= ink;`);
  };
  return m;
}

/* tons par orientation de face (règle du dessin isométrique) : dessus plus clair, quatre côtés étagés, dessous plus sombre ; aucune lumière */
function facetTones(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMv;').replace('#include <project_vertex>', '#include <project_vertex>\nvMv = mvPosition.xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMv;').replace('#include <color_fragment>', `#include <color_fragment>
      vec3 nv = normalize(cross(dFdx(vMv), dFdy(vMv))), nw = (vec4(nv, 0.) * viewMatrix).xyz;
      float side = nw.x > abs(nw.z) ? .82 : -nw.x > abs(nw.z) ? 1.06 : nw.z > 0. ? .94 : .74;
      diffuseColor.rgb *= nw.y > .6 ? 1.24 : nw.y < -.6 ? .7 : side;`);
  };
  m.customProgramCacheKey = () => 'facets';
  return m;
}
let haloM;
function haloMat() {
  if (haloM) return haloM;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(3,8,40,.42)'); g.addColorStop(.6, 'rgba(3,8,40,.18)'); g.addColorStop(1, 'rgba(3,8,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (haloM = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
}
