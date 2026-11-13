import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const assets = new URL('../assets/', import.meta.url);
const output = new URL('room-stylized/', assets);
const plans = [
  { file: 'mamiya-user-v41.glb', part: /^(?:lens pips|mam01)/i, ratio: .69, error: .015 },
  { file: 'olivetti-user-v41.glb', part: /^Object_[01]\./, ratio: .71, error: .012 },
  { file: 'road-bike-clean-v44.glb', part: /^0\.00[28]$/, ratio: .67, error: .011 },
];
await mkdir(output, { recursive: true });
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

function simplify(primitive, ratio, targetError) {
  const index = primitive.getIndices();
  const position = primitive.getAttribute('POSITION');
  if (primitive.getMode() !== 4 || !index || !position || index.getCount() < 1000) return null;
  const indices = Uint32Array.from(index.getArray());
  const size = position.getCount();
  const points = new Float32Array(size * 3);
  const normals = primitive.getAttribute('NORMAL');
  const uv = primitive.getAttribute('TEXCOORD_0');
  const weights = [0.18, 0.18, 0.18, ...(uv ? [.24, .24] : [])];
  const attributes = new Float32Array(size * weights.length);
  const element = [];
  const uvElement = [];
  for (let i = 0; i < size; i++) {
    points.set(position.getElement(i, element), i * 3);
    if (normals) attributes.set(normals.getElement(i, element), i * weights.length);
    if (uv) attributes.set(uv.getElement(i, uvElement), i * weights.length + 3);
  }

  // Preserve each axis extremum, the open seams and hard/UV borders. The
  // optimizer chooses among existing vertices, so UV and position stay paired.
  const lock = new Uint8Array(size);
  for (let axis = 0; axis < 3; axis++) {
    let min = 0, max = 0;
    for (let i = 1; i < size; i++) {
      if (points[i * 3 + axis] < points[min * 3 + axis]) min = i;
      if (points[i * 3 + axis] > points[max * 3 + axis]) max = i;
    }
    lock[min] = lock[max] = 1;
  }
  const [reduced, error] = MeshoptSimplifier.simplifyWithAttributes(indices, points, 3,
    attributes, weights.length, weights, lock, Math.floor(indices.length * ratio / 3) * 3,
    targetError, ['LockBorder', 'Permissive', 'PreserveFolds']);
  if (reduced.length >= indices.length) return null;
  const [remap, count] = MeshoptSimplifier.compactMesh(reduced);
  for (const semantic of primitive.listSemantics()) {
    const source = primitive.getAttribute(semantic);
    const original = source.getArray();
    const stride = source.getElementSize();
    const compact = new original.constructor(count * stride);
    for (let i = 0; i < size; i++) {
      if (remap[i] < count) compact.set(original.subarray(i * stride, (i + 1) * stride), remap[i] * stride);
    }
    const edited = source.clone().setArray(compact);
    primitive.setAttribute(semantic, edited);
    if (source.listParents().length === 1) source.dispose();
  }
  const edited = index.clone().setArray(count < 65536 ? Uint16Array.from(reduced) : reduced);
  primitive.setIndices(edited);
  if (index.listParents().length === 1) index.dispose();
  return { before: indices.length / 3, after: reduced.length / 3, relativeError: error };
}

const hash = async file => createHash('sha256').update(await readFile(file)).digest('hex');
const topology = document => document.getRoot().listNodes().map(node => [
  node.getName(), node.getMatrix(), node.getMesh()?.getName(), node.listChildren().map(child => child.getName()),
]);
const triangleCount = document => document.getRoot().listMeshes().flatMap(mesh => mesh.listPrimitives())
  .reduce((sum, primitive) => sum + (primitive.getIndices() ?? primitive.getAttribute('POSITION')).getCount() / 3, 0);
const report = [];
for (const plan of plans) {
  const source = new URL(plan.file, assets);
  const destination = new URL(plan.file.replace('.glb', '-facets-v1.glb'), output);
  const document = await io.read(fileURLToPath(source));
  const hierarchy = topology(document);
  const before = triangleCount(document);
  const parts = [];
  for (const mesh of document.getRoot().listMeshes()) {
    if (!plan.part.test(mesh.getName())) continue;
    for (const primitive of mesh.listPrimitives()) {
      const change = simplify(primitive, plan.ratio, plan.error);
      if (change) parts.push({ mesh: mesh.getName(), ...change });
    }
  }
  assert.ok(parts.length, plan.file + ' has no simplifiable parts');
  await io.write(fileURLToPath(destination), document);
  const reloaded = await io.read(fileURLToPath(destination));
  assert.deepEqual(topology(reloaded), hierarchy, plan.file + ' node transforms');
  const after = triangleCount(reloaded);
  assert.ok(after < before, plan.file + ' triangle count');
  report.push({
    source: plan.file, output: destination.pathname.split('/').at(-1),
    sourceSha256: await hash(source), sha256: await hash(destination),
    sourceBytes: (await stat(source)).size, bytes: (await stat(destination)).size,
    sourceTriangles: before, triangles: after, parts,
  });
  console.log(plan.file, before, '→', after);
}
await writeFile(new URL('provenance.json', output), JSON.stringify(report, null, 2) + '\n');
