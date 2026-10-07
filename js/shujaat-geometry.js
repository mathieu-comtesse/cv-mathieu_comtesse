import * as THREE from 'three';

// WebGLAttributes uses instanceof: an iframe's Float32Array fails that check
// in the parent window. Copy values with constructors from the renderer's realm.
const ARRAY_TYPES = {
  Float32Array, Float64Array, Int8Array, Uint8Array, Uint8ClampedArray,
  Int16Array, Uint16Array, Int32Array, Uint32Array,
};

export function copyShujaatAttribute(source) {
  const interleaved = source.isInterleavedBufferAttribute;
  const values = interleaved ? source.data.array : source.array;
  const type = Object.prototype.toString.call(values).slice(8, -1);
  const ArrayType = ARRAY_TYPES[type];
  if (!ArrayType) throw new TypeError(`Unsupported Shujaat attribute: ${type}`);
  let array;
  if (interleaved) {
    array = new ArrayType(source.count * source.itemSize);
    for (let i = 0; i < source.count; i++) {
      for (let j = 0; j < source.itemSize; j++) {
        array[i * source.itemSize + j] = values[i * source.data.stride + source.offset + j];
      }
    }
  } else {
    array = new ArrayType(values);
  }
  const Attribute = source.isFloat16BufferAttribute ? THREE.Float16BufferAttribute
    : source.isInstancedBufferAttribute ? THREE.InstancedBufferAttribute : THREE.BufferAttribute;
  const attribute = new Attribute(array, source.itemSize, source.normalized);
  attribute.name = source.name || '';
  attribute.setUsage((interleaved ? source.data.usage : source.usage) ?? THREE.StaticDrawUsage);
  if (source.gpuType !== undefined) attribute.gpuType = source.gpuType;
  if (source.meshPerAttribute !== undefined) attribute.meshPerAttribute = source.meshPerAttribute;
  return attribute;
}

export function copyShujaatGeometry(source) {
  const geometry = new THREE.BufferGeometry();
  geometry.name = source.name;
  if (source.index) geometry.setIndex(copyShujaatAttribute(source.index));
  for (const [name, attribute] of Object.entries(source.attributes)) {
    geometry.setAttribute(name, copyShujaatAttribute(attribute));
  }
  for (const [name, attributes] of Object.entries(source.morphAttributes || {})) {
    geometry.morphAttributes[name] = attributes.map(copyShujaatAttribute);
  }
  geometry.morphTargetsRelative = source.morphTargetsRelative;
  for (const group of source.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.setDrawRange(source.drawRange.start, source.drawRange.count);
  if (source.boundingBox) geometry.boundingBox = new THREE.Box3().copy(source.boundingBox);
  if (source.boundingSphere) geometry.boundingSphere = new THREE.Sphere().copy(source.boundingSphere);
  return geometry;
}

export function cloneShujaatObject(source, geometries = new WeakMap()) {
  const clone = source.clone(true);
  clone.traverse((object) => {
    if (!object.geometry) return;
    const sourceGeometry = object.geometry;
    if (!geometries.has(sourceGeometry)) geometries.set(sourceGeometry, copyShujaatGeometry(sourceGeometry));
    object.geometry = geometries.get(sourceGeometry);
    if (object.instanceMatrix) object.instanceMatrix = copyShujaatAttribute(object.instanceMatrix);
    if (object.instanceColor) object.instanceColor = copyShujaatAttribute(object.instanceColor);
  });
  return clone;
}
