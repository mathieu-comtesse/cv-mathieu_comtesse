// Rendu « trait » des machines : chaque pièce n'est plus qu'un tracé de ses arêtes (comme un SVG), sans remplissage, sans lumière ni ombre.
// Les pièces restent dans la scène (matériau masqué) : animations, visibilité, sélection au pointeur et surbrillance continuent de fonctionner,
// les traits étant enfants des pièces. Les écrans et étiquettes (textures dessinées) restent affichés à plat : ils portent les valeurs animées.
import * as THREE from 'three';

export const INK = '#f2f6ff';
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

/** convertit l'arbre `root` en traits ; renvoie sync(), à appeler avant chaque rendu (voyants, matériaux échangés, instances, géométries déformées) */
export function toLines(root, { color = INK, opacity = .85 } = {}) {
  const lineMats = new Map(), images = new Map(), live = [];
  const lineMatOf = (m) => {
    let l = lineMats.get(m);
    if (!l) { l = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }); lineMats.set(m, l); }
    return l;
  };
  const imageOf = (m) => images.get(m) || images.set(m, inkImage(m, color)).get(m);
  /* habille la pièce selon son matériau du moment : image -> encre, sinon matériau masqué et traits visibles */
  const dress = (it) => {
    const o = it.o, src = Array.isArray(o.material) ? o.material[0] : o.material;
    it.src = o.material;
    if (src.map) { o.material = it.mat = imageOf(src); if (it.lines) it.lines.visible = false; return; }
    if (!it.lines) {
      it.lines = new THREE.LineSegments(o.isInstancedMesh ? it.geo : edgesOf(o.geometry)); it.lines.raycast = () => {}; it.lines.userData.glowShell = true;   // les traits ne comptent ni pour la sélection ni pour la surbrillance
      if (o.isInstancedMesh) { it.lines.matrixAutoUpdate = false; it.lines.matrix.identity(); }
      o.add(it.lines); o.userData.edges = it.lines;
    }
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

/* image dessinée (étiquette, écran, compteur, feuille) passée au trait : le fond (couleur du coin de l'image) devient transparent,
   le texte et les tracés prennent l'encre ; une couleur franche (voyant d'état rouge ou vert) garde sa teinte */
function inkImage(src, color) {
  const m = new THREE.MeshBasicMaterial({ map: src.map, transparent: true, side: src.side, depthWrite: false, toneMapped: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uInk = { value: new THREE.Color(color) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uInk;').replace('#include <map_fragment>', `
      vec4 tx = texture2D(map, vMapUv), bg = texture2D(map, vec2(.004, .996));
      float sat = max(tx.r, max(tx.g, tx.b)) - min(tx.r, min(tx.g, tx.b));
      diffuseColor.rgb = mix(uInk, tx.rgb, smoothstep(.25, .45, sat));
      diffuseColor.a *= smoothstep(.08, .3, distance(tx.rgb, bg.rgb));`);
  };
  return m;
}
