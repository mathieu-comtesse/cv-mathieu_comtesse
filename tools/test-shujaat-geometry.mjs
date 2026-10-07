import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.min.js';

const threeURL = new URL('../vendor/three.module.min.js', import.meta.url).href;
const source = (await readFile(new URL('../js/shujaat-geometry.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`);
const { copyShujaatAttribute, copyShujaatGeometry, cloneShujaatObject } =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

// vm creates the same constructor boundary as the Shujaat iframe.
const foreign = vm.runInNewContext(`({
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  indices: new Uint16Array([0, 1, 2]),
  colors: new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]),
  interleaved: new Float32Array([0, 0, 0, 10, 20, 1, 0, 0, 30, 40]),
  half: new Uint16Array([15360, 16384]),
})`);
assert.equal(foreign.positions instanceof Float32Array, false);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(foreign.positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(foreign.colors, 3, true));
geometry.setIndex(new THREE.BufferAttribute(foreign.indices, 1));
geometry.addGroup(0, 3, 0);
geometry.setDrawRange(0, 3);
geometry.morphAttributes.position = [new THREE.BufferAttribute(foreign.positions, 3)];
geometry.morphTargetsRelative = true;
geometry.computeBoundingBox();
geometry.computeBoundingSphere();
const copied = copyShujaatGeometry(geometry);
assert.ok(copied.attributes.position.array instanceof Float32Array);
assert.ok(copied.index.array instanceof Uint16Array);
assert.ok(copied.attributes.color.array instanceof Uint8Array);
assert.equal(copied.attributes.color.normalized, true);
assert.deepEqual([...copied.attributes.position.array], [...foreign.positions]);
assert.deepEqual(copied.groups, geometry.groups);
assert.deepEqual(copied.drawRange, geometry.drawRange);
assert.equal(copied.morphTargetsRelative, true);
assert.ok(copied.morphAttributes.position[0].array instanceof Float32Array);
assert.notEqual(copied.boundingBox, geometry.boundingBox);
copied.attributes.position.array[0] = 42;
assert.equal(foreign.positions[0], 0);

const packed = new THREE.InterleavedBuffer(foreign.interleaved, 5);
const uv = copyShujaatAttribute(new THREE.InterleavedBufferAttribute(packed, 2, 3));
assert.ok(uv.array instanceof Float32Array);
assert.deepEqual([...uv.array], [10, 20, 30, 40]);
const half = copyShujaatAttribute({ array: foreign.half, itemSize: 1, isFloat16BufferAttribute: true });
assert.ok(half.isFloat16BufferAttribute);
assert.equal(half.getX(0), 1);

const root = new THREE.Group();
root.add(new THREE.Mesh(geometry), new THREE.Mesh(geometry));
const clone = cloneShujaatObject(root);
assert.notEqual(clone.children[0].geometry, geometry);
assert.equal(clone.children[0].geometry, clone.children[1].geometry);
assert.equal(root.children[0].geometry, geometry);
const instances = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), 1);
instances.instanceMatrix = new THREE.InstancedBufferAttribute(foreign.positions, 3, false, 2);
const instanceClone = cloneShujaatObject(instances);
assert.ok(instanceClone.instanceMatrix.array instanceof Float32Array);
assert.equal(instanceClone.instanceMatrix.meshPerAttribute, 2);
console.log('PASS: cross-realm geometry, indices, normalized/interleaved/morph/half/instance attributes and source isolation');
