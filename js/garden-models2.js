/* Modèles 3D du jardin zen (pièce du thé), chargés à la première ouverture des shoji ; ils remplacent les formes procédurales (arbres, herbes, buissons, fougères, rochers, nénuphars).
 * Sources (Sketchfab, tous CC BY 4.0) : saule « Rigged & Animated Weeping Willows » (Jagobo), pin « pine » (local.yany), « Tree exotic. Jeffrey Pine », « Western Juniper » et
 * « Water Lily (Nymphaea Odorata) » (Valery.Li), « Scanned Plants and Grass » (Kless), « Grass Patches - Circle » (brandon_grey), « 3D Fern - 01 » (Grand Dog Studio), « Rocks » (Zambur),
 * « N081j Mossy Rock » (bimage). La teinte de l'eau et la texture du fond du bassin viennent de « Realistic Water and Plants » (Negitropic, licence Sketchfab Standard).
 * Chaque modèle est ramené à un gabarit unitaire (base posée en y = 0, centré, hauteur ou largeur de 1). Les fichiers sont allégés (maillages simplifiés, feuillage éclairci, textures WebP ≤ 512 px). */
import { THREE } from './kit.js?v=cv-scene-v29';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

const DIR = 'assets/jardin/', V = '?v=jardin2';
const NAMES = ['pine', 'willow', 'jeffrey', 'juniper', 'rocks', 'mossyrock', 'fern', 'grasspatch', 'groundcover', 'purpleflower', 'grasstuft', 'lilypad', 'lilyflower'];
let task = null;

/** gabarit unitaire : base au sol, centré en x/z, hauteur (ou plus grande largeur) = 1 */
function unit(scene, by = 'height') {
  scene.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(scene, true), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const inner = new THREE.Group(), root = new THREE.Group();
  inner.add(scene); scene.position.set(-c.x, -bb.min.y, -c.z);
  inner.scale.setScalar(1 / (by === 'width' ? Math.max(size.x, size.z) : size.y)); root.add(inner);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.noInk = true; o.frustumCulled = false; } });
  root.userData.size = size; return root;
}
const fixCutouts = (root, tint) => root.traverse((o) => {
  if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
  for (const m of ms) { if (m.alphaTest > 0 || m.transparent) { m.side = THREE.DoubleSide; m.alphaTest = Math.max(m.alphaTest, 0.4); m.transparent = false; m.depthWrite = true; m.alphaToCoverage = false; } if (tint && /needle/i.test(m.name || '')) m.color.setRGB(...tint); }
});

export function loadGardenModels2() {
  if (task) return task;
  task = (async () => {
    const L = new GLTFLoader(), S = {};
    await Promise.all(NAMES.map(async (n) => { S[n] = (await L.loadAsync(DIR + n + '.glb' + V)).scene; }));
    const M = { trees: {}, rocks: [], mossy: [] };
    for (const t of ['pine', 'willow', 'jeffrey', 'juniper']) { fixCutouts(S[t], t === 'jeffrey' ? [0.45, 1.9, 1.3] : null); M.trees[t] = unit(S[t]); }
    // rochers : chaque maillage du fichier est un rocher à part
    const split = (scene, into) => { const meshes = []; scene.traverse((o) => { if (o.isMesh) meshes.push(o); }); for (const m of meshes) { const g = new THREE.Group(); g.add(m.clone()); into.push(unit(g, 'width')); } };
    split(S.rocks, M.rocks); split(S.mossyrock, M.mossy);
    for (const n of ['fern', 'grasspatch', 'groundcover', 'purpleflower', 'grasstuft']) { fixCutouts(S[n]); M[n] = unit(S[n], 'width'); }
    fixCutouts(S.lilyflower); M.lilyPad = unit(S.lilypad, 'width'); M.lilyFlower = unit(S.lilyflower, 'width');
    // fond du bassin : texture de boue/sable tirée de la scène d'eau fournie, répétée sans raccord (motif en miroir)
    const tl = new THREE.TextureLoader(), [bed, bedN] = await Promise.all([tl.loadAsync(DIR + 'pond-bed.webp' + V), tl.loadAsync(DIR + 'pond-bed-n.webp' + V)]);
    for (const t of [bed, bedN]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; } bed.colorSpace = THREE.SRGBColorSpace;
    M.bed = bed; M.bedN = bedN;
    return M;
  })();
  task.catch(() => { task = null; });
  return task;
}

/** instances d'un gabarit : items = [{ x, y, z, ry, s }] (s : taille en mètres, largeur ou hauteur selon le gabarit) ; un InstancedMesh par maillage du gabarit */
export function instanced(proto, items) {
  const out = new THREE.Group(); proto.updateMatrixWorld(true);
  const d = new THREE.Object3D(), mm = new THREE.Matrix4();
  proto.traverse((o) => {
    if (!o.isMesh) return;
    const base = new THREE.Matrix4().copy(o.matrixWorld), im = new THREE.InstancedMesh(o.geometry, o.material, items.length);
    items.forEach((it, i) => { d.position.set(it.x, it.y ?? 0, it.z); d.rotation.set(0, it.ry ?? 0, 0); d.scale.setScalar(it.s); d.updateMatrix(); mm.multiplyMatrices(d.matrix, base); im.setMatrixAt(i, mm); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.userData.noInk = true; out.add(im);
  });
  return out;
}
