import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { loadBuffer } from './kit.js?v=cv-scene-v29';

const families = ['desk', 'furniture', 'audio', 'electronics', 'personal', 'foliage', 'chashitsu'];

export async function loadRoomModels() {
  const models = new Map();
  await Promise.all(families.map(async family => {
    const url = 'assets/room-remaster/' + family + '/' + family + '-v2.glb';
    try {
      const gltf = await new GLTFLoader().parseAsync(await loadBuffer(url), '');
      for (const object of gltf.scene.children) models.set(object.name, object);
    } catch (error) {
      console.warn('[Ma pièce]', family, error);
    }
  }));
  return models;
}

// The existing Object3D stays in charge of placement, interactions, and animation.
// The authored visual occupies its local envelope and inherits the same pivot.
export function replaceRoomVisual(models, target, name, { omit, includeOwnerMeshes = false, yaw = 0, exact = false, y = 0, z = 0, height = 1 } = {}) {
  const model = models.get(name);
  if (!model || !target) return null;
  const visual = model.clone(true);
  const orientation = new THREE.Group();
  orientation.add(visual);
  visual.rotation.y += yaw;
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  const sources = [];
  target.updateWorldMatrix(true, true);
  const local = target.matrixWorld.clone().invert();
  target.traverseVisible(object => {
    const id = object.userData.id;
    if (!object.isMesh || object.userData.isInk || omit?.(object)) return;
    if (id && !(includeOwnerMeshes && id === target.userData.id)) return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const matrix = new THREE.Matrix4().multiplyMatrices(local, object.matrixWorld);
    box.union(geometry.boundingBox.clone().applyMatrix4(matrix));
    sources.push(object);
  });
  if (box.isEmpty() && !exact) return null;
  orientation.updateMatrixWorld(true);
  const original = new THREE.Box3().setFromObject(orientation);
  if (!exact) {
    const dims = original.getSize(new THREE.Vector3());
    box.getSize(size);
    if (dims.x < .00001 || dims.y < .00001 || dims.z < .00001 ||
        size.x < .00001 || size.y < .00001 || size.z < .00001) return null;
    orientation.scale.copy(size.divide(dims));
    orientation.scale.y *= height;
    original.getCenter(center).multiply(orientation.scale);
    orientation.position.copy(box.getCenter(size).sub(center));
    orientation.position.y = box.min.y - original.min.y * orientation.scale.y;
  }
  orientation.position.y += y;
  orientation.position.z += z;
  for (const object of sources) {
    if (object !== target) {
      object.visible = false;
      object.raycast = () => {};
      continue;
    }
    // Mesh owners keep their children visible and can still provide the hit target.
    const hidden = material => {
      const copy = material.clone();
      copy.visible = false;
      return copy;
    };
    object.material = Array.isArray(object.material) ? object.material.map(hidden) : hidden(object.material);
  }
  // Suppress the legacy ink outlines attached beside the old surfaces.
  target.traverse(object => { if (object.userData.isInk) object.visible = false; });
  visual.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = object.receiveShadow = true;
    object.userData.roomRemaster = name;
    if (['Alocasia', 'Dracaena', 'Bonsai'].includes(name)) object.userData.roomFoliage = true;
  });
  orientation.name = 'Modèle ' + name;
  orientation.userData.roomRemaster = name;
  orientation.userData.batchRoot = true;
  orientation.userData.dynamic = true;
  target.add(orientation);
  return orientation;
}

const gardenModels = {
  pine: 'PinJardin', cherry: 'CerisierJardin', weeping: 'CerisierJardin',
  maple: 'ErableJardin', ginkgo: 'GinkgoJardin',
};

export function createRoomGardenFactory(models) {
  if (!Object.values(gardenModels).every(name => models.has(name))) return undefined;
  return (species, seed, height) => {
    const source = models.get(gardenModels[species] ?? gardenModels.pine);
    const tree = new THREE.Group();
    const crown = source.clone();
    if (!crown.geometry.boundingBox) crown.geometry.computeBoundingBox();
    crown.scale.setScalar(height / crown.geometry.boundingBox.max.y);
    crown.userData.roomRemaster = source.name;
    crown.userData.roomFoliage = true;
    crown.castShadow = crown.receiveShadow = true;
    tree.name = 'Jardin ' + species;
    tree.userData.tree = true;
    tree.add(crown);
    return tree;
  };
}
