/* Direction artistique « aplats » : volumes simples, une couleur par facette, palette chaude restreinte, ombres violettes, pas de contours.
 * Passe appliquée à tout le décor, sans toucher aux modèles : chaque maillage opaque passe en facettes plates (une couleur par triangle,
 * calée sur la palette), les cartes de feuillage gardent leur silhouette mais perdent leur texture. Les matériaux animés ou lumineux
 * (écrans, lampes, verre, marqués unique) sont laissés tels quels. */
import * as THREE from 'three';

export const PALETTE = [
  '#fff2d4', '#fed8ad', '#fcc59a', '#ffa68a', '#f78a6e', '#ec6a85', '#d85777', '#c94f68', '#cc4b8c',
  '#8a72d6', '#6c6a99', '#494081', '#563a92', '#2b2147', '#6fb08c', '#4f9078', '#2f6b5c', '#004052', '#e0a85a', '#f4d35e',
];

const srgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
function lab(r, g, b) {   // r,g,b linéaires -> Lab
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const swatches = PALETTE.map((h) => { const c = new THREE.Color(h); return { c, lab: lab(c.r, c.g, c.b) }; });
const memo = new Map();
export function snap(r, g, b) {   // couleur linéaire -> couleur de palette la plus proche (linéaire)
  const key = (Math.round(srgb(r) * 31) << 10) | (Math.round(srgb(g) * 31) << 5) | Math.round(srgb(b) * 31);
  let s = memo.get(key);
  if (s) return s;
  const L = lab(r, g, b);
  let best = swatches[0], bd = Infinity;
  for (const w of swatches) {
    const d = 1.4 * (L[0] - w.lab[0]) ** 2 + (L[1] - w.lab[1]) ** 2 + (L[2] - w.lab[2]) ** 2;
    if (d < bd) { bd = d; best = w; }
  }
  memo.set(key, best.c);
  return best.c;
}

/* lecture des textures : une fois par image, réduite à 128 px */
const pixelCache = new WeakMap();
function pixels(tex) {
  if (pixelCache.has(tex)) return pixelCache.get(tex);
  let out = null;
  try {
    const img = tex.image, w0 = img.width || img.videoWidth, h0 = img.height || img.videoHeight;
    if (w0 && h0) {
      const k = Math.min(1, 128 / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, w, h);
      out = { w, h, data: cx.getImageData(0, 0, w, h).data, flipY: tex.flipY, srgb: tex.colorSpace === THREE.SRGBColorSpace };
    }
  } catch (_) { out = null; }
  pixelCache.set(tex, out);
  return out;
}
function sample(px, u, v, out) {
  u -= Math.floor(u); v -= Math.floor(v);
  const x = Math.min(px.w - 1, (u * px.w) | 0), y = Math.min(px.h - 1, ((px.flipY ? 1 - v : v) * px.h) | 0), i = (y * px.w + x) * 4;
  const r = px.data[i] / 255, g = px.data[i + 1] / 255, b = px.data[i + 2] / 255;
  out.set(px.srgb ? lin(r) : r, px.srgb ? lin(g) : g, px.srgb ? lin(b) : b);
  return out;
}
function averageColor(tex) {
  const px = pixels(tex); if (!px) return null;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < px.data.length; i += 4) { if (px.data[i + 3] < 40) continue; r += px.data[i]; g += px.data[i + 1]; b += px.data[i + 2]; n++; }
  if (!n) return null;
  const f = (v) => (px.srgb ? lin(v / n / 255) : v / n / 255);
  return new THREE.Color(f(r), f(g), f(b));
}

/* matériau partagé : trois bandes de lumière, facettes plates, couleur portée par les sommets */
let bands = null;
function flatMaterial() {
  if (flatMaterial.m) return flatMaterial.m;
  bands = new THREE.DataTexture(new Uint8Array([165, 165, 165, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  bands.minFilter = bands.magFilter = THREE.NearestFilter; bands.needsUpdate = true;
  flatMaterial.m = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: bands, flatShading: true });
  return flatMaterial.m;
}

const geoCache = new WeakMap();   // géométrie source -> Map(matériau -> géométrie à facettes)
const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function facetGeometry(src, material) {
  let per = geoCache.get(src); if (!per) geoCache.set(src, per = new Map());
  if (per.has(material)) return per.get(material);
  const g = src.index ? src.toNonIndexed() : src.clone();
  const pos = g.attributes.position, n = pos.count, uv = g.attributes.uv, vc = material.vertexColors ? g.attributes.color : null;
  const px = material.map ? pixels(material.map) : null;
  const col = new Float32Array(n * 3), base = material.color;
  for (let t = 0; t + 2 < n; t += 3) {
    let r = 0, gg = 0, b = 0, k = 0;
    for (let j = 0; j < 3; j++) {
      const i = t + j;
      tmpA.copy(base);
      if (vc) tmpA.multiply(tmpB.setRGB(vc.getX(i), vc.getY(i), vc.getZ(i)));
      if (px && uv) tmpA.multiply(sample(px, uv.getX(i), uv.getY(i), tmpB));
      r += tmpA.r; gg += tmpA.g; b += tmpA.b; k++;
    }
    const c = snap(r / k, gg / k, b / k);
    for (let j = 0; j < 3; j++) { const o = (t + j) * 3; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv'); g.deleteAttribute('tangent');
  g.computeVertexNormals();
  per.set(material, g);
  return g;
}

const keep = (m) => !m || Array.isArray(m) || m.userData?.unique || m.userData?.lowpoly === 'keep' || !(m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial)
  || (m.emissive && m.emissive.getHex() !== 0 && (m.emissiveIntensity ?? 1) > 0) || m.emissiveMap || (m.transparent && !m.map) || m.isMeshPhysicalMaterial && m.transmission > 0 || m.opacity < 1;

function cutout(m) {   // carte de feuillage : silhouette conservée, couleur unique
  if (m.userData.lowpoly) return;
  m.userData.lowpoly = 'cutout';
  const avg = m.map ? averageColor(m.map) : null;
  const tint = (avg ? avg.multiply(m.color) : m.color.clone());
  const c = snap(tint.r, tint.g, tint.b);
  if (m.map) {
    try {
      const px = pixels(m.map);
      if (px) {
        const cv = document.createElement('canvas'); cv.width = px.w; cv.height = px.h;
        const cx = cv.getContext('2d'), id = cx.createImageData(px.w, px.h);
        for (let i = 0; i < px.data.length; i += 4) { id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = px.data[i + 3]; }
        cx.putImageData(id, 0, 0);
        const t = new THREE.CanvasTexture(cv); t.flipY = m.map.flipY; t.wrapS = m.map.wrapS; t.wrapT = m.map.wrapT; t.colorSpace = THREE.SRGBColorSpace;
        m.map = t;
      }
    } catch (_) { /* la texture d'origine reste */ }
  }
  m.color.copy(c); m.roughness = 1; m.metalness = 0; m.envMapIntensity = 0; m.normalMap = m.bumpMap = m.roughnessMap = m.metalnessMap = m.aoMap = null;
  m.needsUpdate = true;
}

export function createLowpoly(scene) {
  const done = new WeakSet();
  const cutouts = [];
  function pass() {
    let changed = 0;
    scene.traverse((o) => {
      if (!o.isMesh || done.has(o)) return;
      if (o.userData.isInk) { o.visible = false; done.add(o); return; }
      done.add(o);
      const m = o.material;
      if (keep(m)) return;
      if (m.transparent || m.alphaTest > 0) { cutout(m); changed++; return; }
      if (!o.geometry?.attributes?.position) return;
      o.geometry = facetGeometry(o.geometry, m);
      o.material = flatMaterial();
      o.userData.lowpolyFrom = m;
      changed++;
    });
    return changed;
  }
  return { pass, cutouts };
}
