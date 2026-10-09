import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/BufferGeometryUtils.js';
export { THREE };

const cache = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  cache.set(key, m);
  return m;
}

export function mesh(geo, m, x = 0, y = 0, z = 0) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = me.receiveShadow = true;
  return me;
}
export const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
export const cyl = (rt, rb, h, m, x, y, z, seg = 28) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
export const sph = (r, m, x, y, z, ws = 20, hs = 14) => mesh(new THREE.SphereGeometry(r, ws, hs), m, x, y, z);

export function group(...children) {
  const g = new THREE.Group();
  for (const c of children) if (c) g.add(c);
  return g;
}

/** Géométrie de boîte à arêtes arrondies (w, h, d), centrée. */
export function rboxGeo(w, h, d, r) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const a = w / 2 - r, b = h / 2 - r, depth = Math.max(d - 2 * r, 1e-4);
  const s = new THREE.Shape();
  s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, b); s.lineTo(-a, b); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}
export const rbox = (w, h, d, r, m, x = 0, y = 0, z = 0) => mesh(rboxGeo(w, h, d, r), m, x, y, z);

/** Tube lisse le long d'une courbe, embouts arrondis. */
export function tube(pts, r, m, { segs = 80, radial = 14, closed = false, caps = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.5);
  const g = group(mesh(new THREE.TubeGeometry(curve, segs, r, radial, closed), m));
  if (caps && !closed) for (const p of [pts[0], pts[pts.length - 1]]) g.add(sph(r, m, p[0], p[1], p[2], radial, 8));
  g.userData.curve = curve;
  return g;
}

/** Segment conique entre deux points. */
export function bone(a, b, r0, r1, m, seg = 8) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg);
  const me = mesh(g, m);
  me.position.copy(va).add(vb).multiplyScalar(0.5);
  me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return me;
}

/** PRNG déterministe pour que la scène soit identique à chaque chargement. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Fusionne les maillages statiques d'un groupe par matériau (moins d'appels de rendu). */
export function bake(root) {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), drop = [];
  // Flatten static multi-material primitives before batching by material.
  const multi=[];root.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&!o.isInstancedMesh&&Array.isArray(o.material)&&o.visible&&!dynamic(o))multi.push(o);});
  for(const o of multi){const source=o.geometry.index?o.geometry.toNonIndexed():o.geometry;for(const gr of source.groups){if(!o.material[gr.materialIndex]||!gr.count)continue;const geom=new THREE.BufferGeometry();for(const [name,attr] of Object.entries(source.attributes)){if(!['position','normal','uv','color'].includes(name))continue;const values=new attr.array.constructor(gr.count*attr.itemSize);for(let i=0;i<gr.count;i++)for(let j=0;j<attr.itemSize;j++)values[i*attr.itemSize+j]=attr.getComponent(gr.start+i,j);geom.setAttribute(name,new THREE.BufferAttribute(values,attr.itemSize,attr.normalized));}const p=new THREE.Mesh(geom,o.material[gr.materialIndex]);p.position.copy(o.position);p.quaternion.copy(o.quaternion);p.scale.copy(o.scale);p.castShadow=o.castShadow;p.receiveShadow=o.receiveShadow;p.userData={...o.userData};o.parent.add(p);}if(source!==o.geometry)source.dispose();o.removeFromParent();}
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
    drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);
  for (const [m, list] of buckets) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const me = new THREE.Mesh(merged, m);
    me.castShadow = me.receiveShadow = true;
    root.add(me);
    list.forEach((g) => g.dispose());
  }
  return root;
}

/* ─── Contours « encre » : coque inversée dont l'épaisseur est constante à l'écran ─── */
export const ink = { color: new THREE.Color('#0d1a2b'), px: 3, res: { value: new THREE.Vector2(1, 1) }, mat: null, matInst: null };
function inkMaterial() {
  if (ink.mat) return ink.mat;
  const vs = `
    uniform float uPx; uniform vec2 uRes;
    void main() {
      vec4 pos = vec4(position, 1.0); vec3 nrm = normal;
      #ifdef USE_INSTANCING
        pos = instanceMatrix * pos; nrm = mat3(instanceMatrix) * nrm;
      #endif
      vec4 clip = projectionMatrix * modelViewMatrix * pos;
      vec3 vn = normalize(normalMatrix * nrm);
      vec2 dir = (projectionMatrix * vec4(vn, 0.0)).xy;
      dir = dir / max(length(dir), 1e-4);
      clip.xy += dir * uPx * 2.0 / uRes * clip.w;
      gl_Position = clip;
    }`;
  const fs = `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`;
  ink.mat = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, side: THREE.BackSide, uniforms: { uPx: { value: ink.px }, uRes: ink.res, uColor: { value: ink.color } } });
  return ink.mat;
}
const hullCache = new WeakMap();
function hullGeometry(geo) {
  if (hullCache.has(geo)) return hullCache.get(geo);
  const g = geo.clone();
  const tmp = new THREE.BufferGeometry();
  tmp.setAttribute('position', geo.attributes.position);
  const merged = mergeVertices(tmp.index ? tmp.toNonIndexed() : tmp, 1e-4);
  merged.computeVertexNormals();
  const n = new Float32Array(geo.attributes.position.count * 3);
  const idx = merged.index, mn = merged.attributes.normal;
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const j = idx ? idx.getX(i) : i;
    n[i * 3] = mn.getX(j); n[i * 3 + 1] = mn.getY(j); n[i * 3 + 2] = mn.getZ(j);
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  hullCache.set(geo, g);
  return g;
}
/** Ajoute un contour encre à chaque maillage (hors instances et matériaux transparents) du groupe. */
export function inkify(root, { instanced = false, skip = null } = {}) {
  const list = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.isInk && (instanced || !o.isInstancedMesh) && !(o.material && (o.material.transparent || o.material.alphaTest > 0)) && !(skip && skip(o))) list.push(o); });
  for (const o of list) {
    const hull = o.isInstancedMesh ? new THREE.InstancedMesh(hullGeometry(o.geometry), inkMaterial(), o.count) : new THREE.Mesh(hullGeometry(o.geometry), inkMaterial());
    if (o.isInstancedMesh) hull.instanceMatrix = o.instanceMatrix;
    hull.userData.isInk = true; hull.castShadow = false; hull.receiveShadow = false;
    hull.position.copy(o.position); hull.quaternion.copy(o.quaternion); hull.scale.copy(o.scale);
    o.parent.add(hull);
  }
  return root;
}

/* ─── Ombre de contact douce sous un objet ─── */
let blobTex = null;
export function contactShadow(w, d, opacity = 0.3) {
  if (!blobTex) blobTex = canvasTexture(128, 128, (c, W, H) => {
    const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    g.addColorStop(0, 'rgba(60,76,110,1)'); g.addColorStop(0.55, 'rgba(60,76,110,0.55)'); g.addColorStop(1, 'rgba(60,76,110,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.renderOrder = -1;
  return m;
}

/** fetch qui accepte aussi les URI data: (version autonome de la page). */
export async function loadBuffer(url) {
  if (url.startsWith('data:')) {
    const bin = atob(url.slice(url.indexOf(',') + 1));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  return r.arrayBuffer();
}

/* ─── Fusion globale des maillages statiques d'un objet de la scène ───
 * Regroupe par (propriétaire cliquable, matériau, ombres) : chaque objet garde son identifiant pour le survol et le clic, mais passe de dizaines
 * de maillages à quelques-uns. Les sous-arbres marqués userData.dynamic (animés) sont laissés intacts ; les matériaux marqués userData.unique
 * (lampes, écran de la télé, interrupteur) ne sont pas dédoublonnés. Les matériaux identiques sont mutualisés pour réduire les changements d'état. */
const matSig = (m) => [m.type, m.color && m.color.getHex(), m.emissive && m.emissive.getHex(), m.emissiveIntensity, m.roughness, m.metalness, m.map && m.map.uuid, m.bumpMap && m.bumpMap.uuid, m.bumpScale,
  m.side, m.vertexColors, m.flatShading, m.opacity, m.transparent, m.alphaTest, m.envMapIntensity, m.depthWrite, m.toneMapped, m.normalMap && m.normalMap.uuid, m.clearcoat].join('|');
export function mergeStatic(root) {
  root.updateWorldMatrix(true, true);
  const sigs = mergeStatic.sigs || (mergeStatic.sigs = new Map());
  const buckets = new Map(), drop = [];
  const ownerOf = (o) => { for (let p = o.parent; p && p !== root.parent; p = p.parent) { if (p.userData && (p.userData.id || p.userData.batchRoot)) return p; if (p === root) return root; } return root; };
  const dynamic = (o) => { for (let p = o; p && p !== root.parent; p = p.parent) if (p.userData && p.userData.dynamic) return true; return false; };
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.visible) return;
    const m = o.material;
    if (m.transparent || dynamic(o)) return;
    let mat = m;
    if (!(m.userData && m.userData.unique)) { const s = matSig(m); if (sigs.has(s)) mat = sigs.get(s); else sigs.set(s, m); }
    const owner = ownerOf(o);
    const isInk = !!o.userData.isInk || m === ink.mat || m === ink.matInst;
    const key = owner.uuid + '|' + mat.uuid + '|' + (o.castShadow && !isInk ? 1 : 0) + (o.receiveShadow && !isInk ? 1 : 0) + '|' + (isInk ? 'i' : '') + (o.geometry.attributes.color ? 'c' : '');
    let b = buckets.get(key); if (!b) { b = { owner, mat, cast: o.castShadow && !isInk, recv: o.receiveShadow && !isInk, list: [], ink: isInk, col: !!o.geometry.attributes.color }; buckets.set(key, b); }
    owner.updateWorldMatrix(true, false);
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && !(k === 'color' && b.col)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(owner.matrixWorld).invert(), o.matrixWorld));
    b.list.push(g); drop.push(o);
  });
  for (const o of drop) o.removeFromParent();
  let made = 0;
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.list, false);
    b.list.forEach((g) => g.dispose());
    if (!merged) continue;
    const me = new THREE.Mesh(merged, b.mat);
    me.castShadow = b.cast && !b.ink; me.receiveShadow = b.recv; if (b.ink) me.userData.isInk = true;
    me.matrixAutoUpdate = false; me.updateMatrix();
    b.owner.add(me); made++;
  }
  return made;
}
