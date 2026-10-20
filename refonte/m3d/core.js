// Outils communs des machines 3D : les dimensions restent celles des plans d'origine (figures/build-*.mjs), en « unités de figure » ;
// le groupe de chaque machine est mis à l'échelle (S) pour tenir sur le plan blueprint. Repère de figure : x vers la droite,
// y vers l'avant (profondeur), z vers le haut ; il devient (x, z, y) dans la scène.
import * as THREE from 'three';

export const S = 9.6 / 236;                 // la plaque de l'établi (236 unités de figure) fait 11 unités sur le plan
export const COL = { hi: '#f7f6f1', mid: '#eceae3', lo: '#cfcdc4', dark: '#9d9c94', ink: '#1d2230', accent: '#f4a259', accentLo: '#e08a3c', glass: '#d6e2f2', screen: '#aab6cf', blue: '#3a5fb0', green: '#35a974', red: '#e5484d' };

const mats = new Map();
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0, ...o }));
  return mats.get(key);
}
const lineMat = new THREE.LineBasicMaterial({ color: 0x1d2230, transparent: true, opacity: .42 });

function finish(geo, m, edges = 32) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, edges), lineMat));
  return mesh;
}

function rrShape(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2; r = Math.min(r, w / 2 - .01, d / 2 - .01);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* Dalle arrondie : coin (x, y), taille w × d, de la hauteur z à z + h (repère de figure). */
export function slab(x, y, w, d, z, h, color = COL.mid, r = 1.2) {
  const geo = new THREE.ExtrudeGeometry(rrShape(w, d, r), { depth: h, bevelEnabled: false, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  const m = finish(geo, mat(color));
  m.position.set(x + w / 2, z, y + d / 2);
  return m;
}
/* Boîte simple centrée sur un point de figure. */
export function box(cx, cy, cz, w, d, h, color = COL.mid, edges = 30) {
  const m = finish(new THREE.BoxGeometry(w, h, d), mat(color), edges);
  m.position.set(cx, cz, cy);
  return m;
}
/* Cylindre vertical : centre (x, y), rayon r, de z à z + h. */
export function cyl(x, y, r, z, h, color = COL.mid, seg = 32) {
  const m = finish(new THREE.CylinderGeometry(r, r, h, seg), mat(color), 40);
  m.position.set(x, z + h / 2, y);
  return m;
}
/* Cylindre d'axe x : de x0 à x1, centre (y, z). */
export function cylX(x0, x1, y, z, r, color = COL.mid, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg); g.rotateZ(Math.PI / 2);
  const m = finish(g, mat(color), 40);
  m.position.set((x0 + x1) / 2, z, y);
  return m;
}
/* Cylindre d'axe y (profondeur) : de y0 à y1, centre (x, z). */
export function cylY(y0, y1, x, z, r, color = COL.mid, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg); g.rotateX(Math.PI / 2);
  const m = finish(g, mat(color), 40);
  m.position.set(x, z, (y0 + y1) / 2);
  return m;
}
/* Fiche : plaque mince verticale (plan x-z) d'épaisseur t, centrée. */
export function card(cx, cy, cz, w, h, t = .5, color = COL.hi, edges = 30) {
  const m = finish(new THREE.BoxGeometry(w, h, t), mat(color), edges);
  m.position.set(cx, cz, cy);
  return m;
}
/* Tube le long d'une courbe (câbles, fils de fiches). */
export function tube(points, r = .6, color = COL.dark) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, z, y)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 8, false), mat(color)); m.castShadow = true; return m;
}
export function group(...children) { const g = new THREE.Group(); children.flat().forEach((c) => c && g.add(c)); return g; }

/* Établi commun : plaque sur quatre pieds, vis d'angle, règle graduée à l'avant et plaque signalétique. */
export function bench(PLATE, { strip, label, plateH = 10, footH = 5 } = {}) {
  const g = new THREE.Group();
  g.add(slab(PLATE.x, PLATE.y, PLATE.w, PLATE.d, -plateH, plateH, COL.mid, PLATE.r ?? 8));
  for (const [x, y] of [[PLATE.x + 22, PLATE.y + 22], [PLATE.x + PLATE.w - 22, PLATE.y + 22], [PLATE.x + 22, PLATE.y + PLATE.d - 22], [PLATE.x + PLATE.w - 22, PLATE.y + PLATE.d - 22]]) {
    g.add(cyl(x, y, 7, -plateH - footH, 1.6, COL.lo, 24), cyl(x, y, 5.4, -plateH - footH + 1.6, footH - 1.6, COL.mid, 24));
  }
  for (const [x, y] of [[PLATE.x + 10, PLATE.y + 10], [PLATE.x + PLATE.w - 10, PLATE.y + 10], [PLATE.x + 10, PLATE.y + PLATE.d - 10], [PLATE.x + PLATE.w - 10, PLATE.y + PLATE.d - 10]]) g.add(cyl(x, y, 1.6, 0, .5, COL.dark, 12));
  if (strip) {
    g.add(slab(strip.x, strip.y, strip.w, strip.d, 0, .6, COL.lo, 1));
    for (let i = 0; i <= 24; i++) g.add(box(strip.x + 4 + i * (strip.w - 8) / 24, strip.y + 2, .7, .5, i % 4 ? 2 : 3.6, .3, COL.ink));
  }
  if (label) { g.add(slab(label.x, label.y, label.w, label.d, 0, .8, COL.lo, 1.2)); for (let i = 0; i < 3; i++) { const lw = (label.w - 12) * [.65, .48, .56][i]; g.add(box(label.x + 6 + lw / 2, label.y + 3 + i * 2.6, .9, lw, .6, .2, COL.dark)); } }
  return g;
}

/* Texture d'afficheur (texte à chiffres) mise à jour à la demande. */
export function display(w, h, { bg = '#aab6cf', fg = '#1d2230', font = 'bold 40px ui-monospace,Menlo,Consolas,monospace' } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w);
  const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let last = null;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  return {
    mesh,
    set(text) { if (text === last) return; last = text; ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, c.width / 2, c.height / 2 + 2); tex.needsUpdate = true; }
  };
}

export const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const hash = (i) => { let h = Math.imul(i + 5, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };

/* Scène d'une machine : lumières douces, ombre portée sur le plan (ShadowMaterial) et groupe mis à l'échelle. */
export function makeStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b8e6, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-9, 16, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 5; sun.shadow.bias = -.0005;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .38, color: 0x000a50 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.position.y = .004;
  scene.add(ground);
  return { renderer, scene };
}
