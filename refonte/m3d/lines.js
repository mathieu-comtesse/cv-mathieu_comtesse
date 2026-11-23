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
export function toLines(root, { color = INK, opacity = .85, occlude = false, hidden = 0, fill = null } = {}) {
  const lineMats = new Map(), images = new Map(), live = [];
  const skinMat = occlude || fill ? new THREE.MeshBasicMaterial({ color: fill || 0, colorWrite: !!fill, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, toneMapped: false }) : null;
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
        it.skin = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, skinMat, o.count) : new THREE.Mesh(o.geometry, skinMat);
        if (o.isInstancedMesh) { it.skin.instanceMatrix = o.instanceMatrix; it.skin.matrixAutoUpdate = false; }
        it.skin.raycast = () => {}; it.skin.userData.glowShell = true; o.add(it.skin);
      }
      if (dashMat && !o.isInstancedMesh) { it.dash = new THREE.LineSegments(it.lines.geometry, dashMat); it.dash.computeLineDistances(); it.dash.raycast = () => {}; it.dash.userData.glowShell = true; o.add(it.dash); }
    }
    if (it.skin) it.skin.visible = !src.transparent;   // le verre et les pièces en fondu ne masquent rien
    it.lines.material = lineMatOf(src); it.lines.visible = true;
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
    for (const [m, l] of lineMats) {                 // voyant allumé : le trait prend sa couleur ; pièce en fondu : le trait s'efface avec elle
      const lit = m.emissive && m.emissiveIntensity > .05 && (m.emissive.r + m.emissive.g + m.emissive.b) > .05;
      l.color.set(lit ? m.emissive : color);
      l.opacity = opacity * (m.transparent ? Math.min(1, m.opacity * 1.6) : 1);
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
