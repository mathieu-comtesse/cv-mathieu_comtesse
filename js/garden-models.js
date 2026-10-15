/* Modèles 3D du jardin du thé, chargés à la première ouverture des shoji (le jardin n'existe pas avant) :
 *  - lanterne de pierre « Japanese Stone Lantern » (Kirill Duhovny, CC BY 4.0) ;
 *  - cyprès chauve « Bald Cypress » (BaptisteBerard, CC BY 4.0) ;
 *  - fleur de lotus « Stylized Lotus Flower » (Kigha, CC BY 4.0) ;
 *  - rochers moussus « Moss Rock 08 / 12, Rock Pack Vol.2 » (Kless Gyzen, CC BY 4.0) ;
 *  - toit de temple « Japanese Temple Roof » (Fallout: Tokugawa, CC BY 4.0), réduit à un seul versant.
 * Chaque modèle est ramené à un gabarit unitaire (base posée en y = 0, centré, hauteur ou largeur de 1) : les appelants n'ont qu'à choisir l'échelle. */
import { THREE } from './kit.js?v=cv-scene-v29';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

const FILES = {
  lantern: 'assets/stone-lantern.glb?v=garden1', cypress: 'assets/bald-cypress.glb?v=garden1', lotus: 'assets/lotus-flower.glb?v=garden1',
  moss8: 'assets/moss-rock-08.glb?v=garden1', moss12: 'assets/moss-rock-12.glb?v=garden1', roof: 'assets/temple-roof-half.glb?v=garden1',
};
let task = null;

/** Gabarit unitaire : base au sol (y = 0), centré en x et z, hauteur (ou plus grande largeur) égale à 1. */
function unit(scene, by = 'height') {
  scene.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(scene, true), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const inner = new THREE.Group(), root = new THREE.Group();
  inner.add(scene); scene.position.set(-c.x, -bb.min.y, -c.z);
  inner.scale.setScalar(1 / (by === 'width' ? Math.max(size.x, size.z) : size.y)); root.add(inner);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.noInk = true; } });
  root.userData.inner = inner; root.userData.size = size;
  return root;
}

export function loadGardenModels() {
  if (task) return task;
  task = (async () => {
    const L = new GLTFLoader(), get = async (k) => (await L.loadAsync(FILES[k])).scene;
    const [lan, cyp, lot, m8, m12, roof] = await Promise.all(['lantern', 'cypress', 'lotus', 'moss8', 'moss12', 'roof'].map(get));
    const M = {};
    // lanterne : feu intérieur qui s'allume la nuit (matériau partagé entre toutes les lanternes)
    M.lantern = unit(lan);
    const glow = new THREE.MeshStandardMaterial({ color: '#2a2418', emissive: '#ffb347', emissiveIntensity: 0, roughness: 0.6 });
    const fire = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), glow); fire.position.set(0, 1.5, 0); fire.userData.noInk = true;
    M.lantern.userData.inner.children[0].add(fire);                                   // en unités du modèle (hauteur 2,21) : la boîte à feu est au tiers supérieur
    M.lantern.userData.glow = glow;
    M.cypress = unit(cyp);
    M.cypress.traverse((o) => { if (o.isMesh) { const m = o.material; m.side = THREE.DoubleSide; if (m.alphaTest === 0 && m.transparent) { m.alphaTest = 0.4; m.transparent = false; m.depthWrite = true; } } });
    M.lotus = unit(lot, 'width');
    M.moss = [unit(m8, 'width'), unit(m12, 'width')];
    // toit : repère d'origine du fichier (crête à z = 0 et y maximal, avant-toit à z = +9,5, largeur x de −8,4 à 8,3)
    roof.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.noInk = true; } });
    M.roof = roof;
    return M;
  })();
  task.catch(() => { task = null; });
  return task;
}
