// Volumes 3D reconstruits depuis les figures animées du livre (archive WattsElse : Fig 16.1, 52.1 et 69.1).
// Chaque figure est un dessin isométrique fait de solides extrudés : l'anneau du dessus et la silhouette donnent le plan et la hauteur de
// chaque solide ; leur position en profondeur est retrouvée par contact (posé sur un solide dessous, ou appuyé contre une paroi) ;
// les tuyaux (cylindres) sont recalés sur les solides qu'ils joignent. Données : assets/machines/livre-NN.json (tools/reconstruire-livre/).
import * as THREE from 'three';

export async function makeLivre(file) {
  const data = await (await fetch(new URL('../../assets/machines/livre-' + file + '.json', import.meta.url))).json();
  const mats = new Map();
  const mat = (hex) => { let m = mats.get(hex); if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, metalness: 0, flatShading: true }); mats.set(hex, m); } return m; };
  const world = new THREE.Group();
  for (const [flat, z0, h, top, lit] of data.s) {
    const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push(new THREE.Vector2(flat[i], flat[i + 1]));
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: false, curveSegments: 1 });
    const m = new THREE.Mesh(g, [mat(top), mat(lit)]); m.position.z = z0; m.castShadow = m.receiveShadow = true; world.add(m);
  }
  const up = new THREE.Vector3(0, 1, 0);
  for (const [x1, y1, z1, x2, y2, z2, r, hex] of data.t) {
    const a = new THREE.Vector3(x1, y1, z1), b = new THREE.Vector3(x2, y2, z2), len = a.distanceTo(b); if (len < 0.01) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat(hex)); m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); world.add(m);
  }
  // z vers le haut (dessin) -> y vers le haut (Three) ; la face du dessin regarde le coin avant droit de la vue du chemin
  world.rotation.x = -Math.PI / 2;
  const box = new THREE.Box3().setFromObject(world), size = box.getSize(new THREE.Vector3());
  const width = Math.max(size.x, size.z, size.y * 1.6);
  function build() {
    const group = new THREE.Group(), inner = world.clone(true);
    const c = new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3()); inner.position.set(-c.x, -box.min.y, -c.z);
    const turn = new THREE.Group(); turn.add(inner); turn.rotation.y = -(data.a + 90) * Math.PI / 180; group.add(turn);
    return { group, update() {}, controls: null };
  }
  return { width, build };
}
