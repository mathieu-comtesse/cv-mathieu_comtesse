/* Le monde : un archipel d'îles flottantes construit à partir de la pièce de Mathieu (mobilier refait en volumes simples),
 * de sa platine, de son jardin et de son atelier de processus. Tout le décor fixe tient dans un seul maillage coloré par sommet. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { encre } from './rendu.js';

const PI = Math.PI;
const K = {
  noir: '#2b2731', noir2: '#3b3743', blanc: '#f3ecdc', chrome: '#c6cbd0', bois: '#b9814f', boisClair: '#dcc79c', noyer: '#80492c',
  vertUsm: '#4aa23a', rouge: '#d2452f', orange: '#ee8a3a', jaune: '#f0cf5a', ecran: '#bfe3e6',
  sable: '#e6cfa6', sable2: '#d9b98d', rose: '#cc917f', mauve: '#a97a8c', ocre: '#d6a068', brique: '#c5795f',
  herbe: '#93bf8f', herbe2: '#6fa487', feuille: '#3f8a5f', feuille2: '#2f6f55', eau: '#86c9c4', cristal: '#f3eca5',
  beton: '#d8cdb8', bleu: '#6f8fb8', violet: '#7d6a9c', turquoise: '#5fb3a4',
};
const couleurs = new Map();
const teinte = (h) => { let c = couleurs.get(h); if (!c) { c = new THREE.Color(h); couleurs.set(h, c); } return c; };
const alea = (g) => () => { g |= 0; g = g + 0x6D2B79F5 | 0; let t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const HAUT = new THREE.Vector3(0, 1, 0);

/* ───────── collisions : chaque volume a une emprise au sol (disque ou boîte tournée), un dessus et un dessous ───────── */
export function dedans(c, x, z, marge = 0) {
  const dx = x - c.x, dz = z - c.z;
  if (c.t === 'b') { const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos; return Math.abs(lx) <= c.hw + marge && Math.abs(lz) <= c.hd + marge; }
  const r = (c.rf ? c.rf(Math.atan2(dz, dx)) : c.r) + marge;
  return dx * dx + dz * dz <= r * r;
}
export function repousse(c, p, r) {
  const dx = p.x - c.x, dz = p.z - c.z;
  if (c.t === 'b') {
    let lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
    const ex = c.hw + r - Math.abs(lx), ez = c.hd + r - Math.abs(lz);
    if (ex <= 0 || ez <= 0) return false;
    if (ex < ez) lx = (lx < 0 ? -1 : 1) * (c.hw + r); else lz = (lz < 0 ? -1 : 1) * (c.hd + r);
    p.x = c.x + lx * c.cos + lz * c.sin; p.z = c.z - lx * c.sin + lz * c.cos;
    return true;
  }
  const R = (c.rf ? c.rf(Math.atan2(dz, dx)) : c.r) + r, d2 = dx * dx + dz * dz;
  if (d2 >= R * R) return false;
  const d = Math.sqrt(d2) || 1e-4;
  p.x = c.x + dx / d * R; p.z = c.z + dz / d * R;
  return true;
}

/* ───────── bâtisseur : primitives colorées, empilées dans un repère courant (position, cap, échelle) ───────── */
class Batisseur {
  constructor(monde) { this.monde = monde; this.geos = []; this.m = new THREE.Matrix4(); this.pile = []; this.cap = 0; this.ech = 1; }
  pousse(x, y, z, ry = 0, s = 1) {
    this.pile.push([this.m.clone(), this.cap, this.ech]);
    this.m.multiply(_m.compose(_p.set(x, y, z), _q.setFromAxisAngle(HAUT, ry), _s.set(s, s, s)));
    this.cap += ry; this.ech *= s; return this;
  }
  tire() { [this.m, this.cap, this.ech] = this.pile.pop(); return this; }
  pt(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.m); }
  ajoute(geo, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (n !== 'position') g.deleteAttribute(n);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)).premultiply(this.m);
    g.applyMatrix4(_m);
    const n = g.attributes.position.count, col = new Float32Array(n * 3), k = teinte(c);
    for (let i = 0; i < n; i++) { col[i * 3] = k.r; col[i * 3 + 1] = k.g; col[i * 3 + 2] = k.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geos.push(g); return this;
  }
  /* boîte posée sur y */
  b(c, w, h, d, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) { return this.ajoute(new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z, rx, ry, rz); }
  /* cylindre ou cône posé sur y */
  c(c, rt, rb, h, seg, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.ajoute(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, rx, ry, rz); }
  /* boule à facettes centrée */
  s(c, r, detail, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) { return this.ajoute(new THREE.IcosahedronGeometry(r, detail), c, x, y, z, 0, ry, 0, sx, sy, sz); }
  tube(c, a, b, r, seg = 5, r2 = r) {
    const A = _p.set(a[0], a[1], a[2]).clone(), Bv = new THREE.Vector3(b[0], b[1], b[2]), d = Bv.clone().sub(A), L = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(HAUT, d.normalize()), e = new THREE.Euler().setFromQuaternion(q);
    return this.ajoute(new THREE.CylinderGeometry(r2, r, L, seg), c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, e.x, e.y, e.z);
  }
  tris(c, pts, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    return this.ajoute(g, c, x, y, z, rx, ry, rz, s, s, s);
  }
  solB(w, h, d, x = 0, y = 0, z = 0, ry = 0, plus = {}) {
    const p = this.pt(x, y, z), s = this.ech, a = this.cap + ry;
    return this.monde.col({ t: 'b', x: p.x, z: p.z, bas: p.y, top: p.y + h * s, hw: w * s / 2, hd: d * s / 2, cos: Math.cos(a), sin: Math.sin(a), ...plus });
  }
  solC(r, h, x = 0, y = 0, z = 0, plus = {}) {
    const p = this.pt(x, y, z), s = this.ech;
    return this.monde.col({ t: 'c', x: p.x, z: p.z, bas: p.y, top: p.y + h * s, r: r * s, ...plus });
  }
  maillage(mat) {
    const g = mergeGeometries(this.geos); g.computeVertexNormals(); g.computeBoundingSphere();
    for (const q of this.geos) q.dispose(); this.geos = [];
    const me = new THREE.Mesh(g, mat); me.castShadow = me.receiveShadow = true; return me;
  }
}

/* ───────── décor de la vraie pièce, exporté et allégé par tools/build-monde3d.mjs ───────── */
export async function chargerPiece(url = 'monde3d/assets/piece.bin?v=1') {
  const buf = await (await fetch(url)).arrayBuffer(), nj = new DataView(buf).getUint32(0, true);
  const tete = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, nj)));
  const q = new Uint16Array(buf, 4 + nj, tete.n * 9), coul = new Uint8Array(buf, 4 + nj + tete.n * 18, tete.n * 4);
  const pos = new Float32Array(tete.n * 9);
  for (let i = 0; i < pos.length; i++) pos[i] = tete.min[i % 3] + q[i] / 65535 * tete.taille[i % 3];
  return { pos, coul, objets: new Map(tete.objets.map((o) => [o.id, o])), lampes: tete.lampes };
}
const LIN = Float32Array.from({ length: 256 }, (_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
/* recopie des meubles dans deux lots : matières ordinaires et matières lumineuses (lampes, écrans) */
class Lots {
  constructor() { this.p = [[], []]; this.c = [[], []]; }
  ajoute(piece, o, fn) {
    const { pos, coul } = piece, v = new THREE.Vector3();
    for (let t = o.debut; t < o.debut + o.n; t++) {
      const k = coul[t * 4 + 3] ? 1 : 0, r = LIN[coul[t * 4]], g = LIN[coul[t * 4 + 1]], b = LIN[coul[t * 4 + 2]];
      for (let j = 0; j < 3; j++) { fn(v.set(pos[t * 9 + j * 3], pos[t * 9 + j * 3 + 1], pos[t * 9 + j * 3 + 2])); this.p[k].push(v.x, v.y, v.z); this.c[k].push(r, g, b); }
    }
  }
  maillages(mats) {
    return [0, 1].filter((k) => this.p[k].length).map((k) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.p[k]), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.c[k]), 3));
      g.computeVertexNormals(); g.computeBoundingSphere(); const me = new THREE.Mesh(g, mats[k]); me.castShadow = k === 0; me.receiveShadow = true; return me;
    });
  }
}

/* ───────── terrain ───────── */
function ile(B, o) {
  const { x, z, y, r, graine = 1, sol = K.sable, bord = K.sable2, roche = [K.rose, K.mauve], prof = r * 1.15, nom } = o;
  const a1 = graine * 1.7, a2 = graine * 2.9, a3 = graine * 4.1, rd = alea(graine * 977);
  const rf = (t) => r * (1 + 0.045 * Math.sin(2 * t + a1) + 0.03 * Math.sin(3 * t + a2) + 0.018 * Math.sin(5 * t + a3));
  const N = 40, niveaux = [[1, 0], [0.97, 0.7], [0.9, 0.7 + prof * 0.1], [0.72, 0.7 + prof * 0.32], [0.5, 0.7 + prof * 0.58], [0.27, 0.7 + prof * 0.82]];
  const anneaux = niveaux.map(([f, d], k) => Array.from({ length: N }, (_, i) => {
    const t = i / N * PI * 2, j = k > 1 ? 1 + (rd() - 0.5) * 0.22 : 1, rr = rf(t) * f * j;
    return [x + Math.cos(t) * rr, y - d - (k > 1 ? (rd() - 0.5) * prof * 0.07 : 0), z + Math.sin(t) * rr];
  }));
  const haut = [], flancs = niveaux.map(() => []);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    haut.push(x, y, z, ...anneaux[0][j], ...anneaux[0][i]);
    for (let k = 0; k < anneaux.length - 1; k++) {
      const a = anneaux[k], b = anneaux[k + 1];
      flancs[k].push(...a[i], ...a[j], ...b[i], ...a[j], ...b[j], ...b[i]);
    }
    const d = anneaux[anneaux.length - 1];
    flancs[anneaux.length - 1].push(...d[i], ...d[j], x + (rd() - 0.5) * r * 0.1, y - 0.7 - prof, z);
  }
  B.tris(sol, haut); B.tris(bord, flancs[0]);
  for (let k = 1; k < flancs.length; k++) B.tris(roche[k % 2], flancs[k]);
  /* racines de pierre qui pendent sous l'île */
  for (let i = 0; i < 7; i++) { const t = rd() * PI * 2, d = r * (0.25 + rd() * 0.45), h = prof * (0.25 + rd() * 0.3); B.c(roche[i % 2], r * 0.05, 0, h, 5, x + Math.cos(t) * d, y - 0.7 - prof * 0.45 - h, z + Math.sin(t) * d, PI); }
  return B.monde.col({ t: 'c', x, z, r, rf, top: y, bas: y - 1.4, nom, fixe: true });
}
function pierre(B, x, y, z, r = 1.3, c = K.rose, c2 = K.mauve, graine = 1) {
  const a = graine * 1.3;
  B.c(K.sable, r, r * 0.94, 0.22, 7, x, y - 0.22, z, 0, a); B.c(c, r * 0.94, r * 0.6, 0.6, 7, x, y - 0.82, z, 0, a); B.c(c2, r * 0.6, 0, 0.9, 7, x, y - 1.72, z, PI, a);
  return B.monde.col({ t: 'c', x, z, r, top: y, bas: y - 1.0, fixe: true });
}
function gue(B, a, b, n, fn) { const out = []; for (let i = 1; i <= n; i++) { const u = i / (n + 1); out.push(fn(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, i)); } return out; }
function rocher(B, x, y, z, r, c = K.rose, graine = 1) { const rd = alea(graine * 31 + 7); B.s(c, r, 0, x, y + r * 0.45, z, 1 + rd() * 0.5, 0.7 + rd() * 0.5, 1 + rd() * 0.4, rd() * 6); }
function eclat(B, x, y, z, h = 1.2, c = K.cristal, incl = 0.15, ry = 0) { B.c(c, h * 0.16, h * 0.2, h * 0.7, 5, x, y, z, incl, ry, incl * 0.6); B.c(c, 0, h * 0.16, h * 0.3, 5, x + Math.sin(incl * 0.6) * -h * 0.5, y + h * 0.68, z + Math.sin(incl) * h * 0.5, incl, ry, incl * 0.6); }
function touffe(B, x, y, z, c = K.herbe2, h = 0.45) { for (let i = 0; i < 3; i++) B.c(c, 0, 0.07, h * (0.7 + i * 0.2), 3, x + (i - 1) * 0.1, y, z + (i % 2) * 0.08, (i - 1) * 0.25, i, (i - 1) * 0.3); }
function decor(B, o, graine, { rochers = 6, eclats = 3, touffes = 14, cT = K.herbe2, min = 0.62 } = {}) {
  const rd = alea(graine), pos = () => { const t = rd() * PI * 2, d = o.r * (min + rd() * (0.9 - min)); return [o.x + Math.cos(t) * d, o.z + Math.sin(t) * d]; };
  for (let i = 0; i < rochers; i++) { const [x, z] = pos(); rocher(B, x, o.y, z, 0.35 + rd() * 0.55, i % 2 ? K.rose : K.mauve, graine + i); }
  for (let i = 0; i < eclats; i++) { const [x, z] = pos(); eclat(B, x, o.y, z, 0.7 + rd() * 0.9, K.cristal, 0.1 + rd() * 0.25, rd() * 6); }
  for (let i = 0; i < touffes; i++) { const [x, z] = pos(); touffe(B, x, o.y, z, cT, 0.3 + rd() * 0.3); }
}

/* ───────── mobilier de la pièce, refait en volumes simples (repère : posé au sol, façade vers +z) ───────── */
function mur(B, L = 5.6) {
  /* pan de mur en ruine : briques, restes d'enduit, sommet ébréché */
  const rd = alea(21), n = 9, w = L / n;
  for (let i = 0; i < n; i++) {
    const h = i < 2 ? 1.5 + i * 0.7 : i > 6 ? 3.1 - (i - 6) * 0.8 : 3.0 + (rd() - 0.5) * 0.5, x = -L / 2 + w * (i + 0.5);
    B.b(i % 2 ? K.brique : '#b96e56', w, h, 0.42, x, 0, 0);
    if (i > 1 && i < 7) B.b(K.sable, w * 0.96, h * (0.45 + rd() * 0.3), 0.03, x, 0.5 + rd() * 0.3, 0.215);
    for (let y = 0.35; y < h - 0.2; y += 0.7) B.b('#a55f4a', w * 0.5, 0.05, 0.02, x + (rd() - 0.5) * w * 0.4, y, -0.215);
  }
  B.b(K.sable2, L + 0.3, 0.16, 0.6, 0, 0, 0);
  B.solB(L, 3.0, 0.5, 0, 0, 0); B.solB(w * 2, 1.5, 0.5, -L / 2 + w, 0, 0);
}

/* ───────── éléments de jeu ───────── */
function texte(lignes, { w = 512, h = 160, fond = '#f5e6a6', encreC = '#2a2530', taille = 104 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const trace = () => {
    g.fillStyle = fond; g.fillRect(0, 0, w, h); g.strokeStyle = encreC; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = encreC; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `400 ${taille}px "Lettrage", "Trebuchet MS", sans-serif`; try { g.letterSpacing = '6px'; } catch {}
    lignes.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lignes.length - 1) / 2) * taille * 1.05 + 2)); t.needsUpdate = true;
  };
  trace(); document.fonts?.load(`400 ${taille}px "Lettrage"`).then(trace).catch(() => {});   // le lettrage arrive après la première image
  return t;
}

export function creerMonde(scene, liens, piece) {
  const mat = encre({ vertexColors: true, side: THREE.DoubleSide });
  const monde = { cols: [], anims: [], cristaux: [], portails: [], gues: { platine: [], jardin: [], feuilles: [], pont: [] }, effets: [], piece, depart: new THREE.Vector3(0.6, 0, -0.9), bas: -40, mat };
  monde.col = (c) => { c.actif = c.actif !== false; monde.cols.push(c); return c; };
  const B = new Batisseur(monde);
  const dyn = (fn, parent = scene) => { const b = new Batisseur(monde); fn(b); const me = b.maillage(mat); parent.add(me); return me; };
  const cristal = (x, y, z) => monde.cristaux.push({ x, y, z, pris: false });
  const cristalLocal = (x, y, z) => { const p = B.pt(x, y, z); cristal(p.x, p.y, p.z); };

  /* ═════ 1. La pièce ═════ */
  const I1 = { x: 0, z: 0, y: 0, r: 15, graine: 1, sol: K.sable, bord: K.sable2, nom: 'La pièce' };
  ile(B, I1); decor(B, I1, 101, { min: 0.7 });
  /* les vrais meubles, à leur place exacte dans la pièce (repère de la pièce agrandi et centré sur l'île) */
  const ECH = 1.35, DX = 0.47, DZ = -0.34, lots = new Lots();
  const versIle = (v) => v.set(v.x * ECH + DX, v.y * ECH, v.z * ECH + DZ);
  const HAUTEUR = { desk: 0.76, usm: 0.78, ekstrem: 0.45, chair: 0.5, sofa: 0.46 };          // dessus praticable (le reste dépasse sans bloquer)
  const SANS = new Set(['strip', 'falk', 'arc', 'pump', 'HikingPoles', 'bonsai', 'jblCableLblack', 'jblCableLred', 'jblCableRblack', 'jblCableRred']);
  const ROND = { alocasia: 0.3, dracaena: 0.26, buddha: 0.27, stool: 0.24 };
  for (const o of piece.objets.values()) {
    lots.ajoute(piece, o, versIle);
    if (SANS.has(o.id)) continue;
    const [x0, y0, z0, x1, y1, z1] = o.bb, cx = (x0 + x1) / 2 * ECH + DX, cz = (z0 + z1) / 2 * ECH + DZ, h = (HAUTEUR[o.id] ?? y1) * ECH;
    if (ROND[o.id]) monde.col({ t: 'c', x: cx, z: cz, r: ROND[o.id] * ECH, top: Math.min(h, 0.5 * ECH), bas: 0 });
    else monde.col({ t: 'b', x: cx, z: cz, hw: (x1 - x0) / 2 * ECH, hd: (z1 - z0) / 2 * ECH, cos: 1, sin: 0, top: h, bas: 0 });
    if (o.id === 'sofa') monde.col({ t: 'b', x: cx, z: (z1 - 0.13) * ECH + DZ, hw: (x1 - x0) / 2 * ECH, hd: 0.13 * ECH, cos: 1, sin: 0, top: y1 * ECH, bas: 0 });   // dossier
  }
  monde.lampes = piece.lampes.map((l) => ({ ...l, p: versIle(new THREE.Vector3(...l.p)) }));
  B.pousse(DX, 0, DZ, 0, ECH);
  B.pousse(-1.1, 0, -3.24); mur(B, 2.4); cristalLocal(0.2, 3.9, 0); B.tire();
  const pTapis = B.pt(0, 0.03, 1.1), pTableau = B.pt(-0.7, 1.35, -2.985), echPiece = B.ech;
  B.tire();
  /* tapis et tableau : les deux seules images du décor */
  const charge = new THREE.TextureLoader();
  const image = (url, w, h, pos, rx, carreaux) => {
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), encre({ color: '#cfa08a' })); me.rotation.x = rx; me.position.copy(pos); me.receiveShadow = true; scene.add(me);
    charge.load(url, (t) => {
      const c = document.createElement('canvas'); c.width = carreaux; c.height = Math.round(carreaux * h / w); c.getContext('2d').drawImage(t.image, 0, 0, c.width, c.height);
      const m = new THREE.CanvasTexture(c); m.colorSpace = THREE.SRGBColorSpace; m.magFilter = THREE.NearestFilter; m.minFilter = THREE.NearestFilter; m.generateMipmaps = false;
      me.material.map = m; me.material.color.set('#ffffff'); me.material.needsUpdate = true; t.dispose();
    });
    return me;
  };
  image('assets/tapis.webp?v=cv-scene-v17', 3.1 * echPiece, 4.3 * echPiece, pTapis, -PI / 2, 26);
  image('assets/tableau.jpg?v=cv-scene-v17', 0.72 * echPiece, 0.84 * echPiece, pTableau, 0, 40);
  B.b(K.noyer, 0.8 * echPiece, 0.92 * echPiece, 0.04, pTableau.x, pTableau.y - 0.46 * echPiece, pTableau.z - 0.035);
  cristal(-9.5, 1.0, 6); cristal(-0.9, 1.0, -9.8); cristal(-4.2, 2.6, -0.9);
  /* tremplin vers le haut du mur */
  const tremplin = (x, y, z, force) => {
    const me = dyn((b) => { b.c(K.noir2, 1.2, 1.3, 0.14, 10, 0, 0, 0); b.c(K.orange, 1.02, 1.02, 0.12, 10, 0, 0.14, 0); b.c(K.jaune, 0.5, 0.5, 0.03, 8, 0, 0.26, 0); });
    me.position.set(x, y, z);
    const c = monde.col({ t: 'c', x, z, r: 1.15, top: y + 0.27, bas: y, rebond: force, pulse: 0 });
    monde.anims.push((t, dt) => { c.pulse = Math.max(0, c.pulse - dt * 3); me.scale.y = 1 + Math.sin(c.pulse * 9) * c.pulse * 1.4; });
  };
  tremplin(-5.2, 0, -3.6, 15.5);

  /* ═════ 2. La platine ═════ */
  const I2 = { x: 44, z: 0, y: 2.5, r: 14, graine: 2, sol: '#e9d7b4', bord: K.ocre, roche: [K.ocre, K.rose], nom: 'La platine' };
  ile(B, I2); decor(B, I2, 202, { min: 0.8, touffes: 8 });
  gue(B, [14, 0, 0], [31, 2.5, 0], 4, (x, y, z, i) => { pierre(B, x, y, z + (i % 2 ? 0.6 : -0.6), 1.3, K.rose, K.mauve, i); monde.gues.platine.push({ x, y, z: z + (i % 2 ? 0.6 : -0.6) }); if (i === 2) cristal(x, y + 1.3, z - 0.6); });
  B.pousse(44, 2.5, 0);
  B.b(K.noyer, 13, 0.9, 10.4, 0, 0, 0); B.b(K.noir2, 12.5, 0.1, 9.9, 0, 0.9, 0); B.solB(13, 1.0, 10.4, 0, 0, 0);
  B.b(K.ocre, 3, 0.45, 1.3, 0, 0, 5.85); B.solB(3, 0.45, 1.3, 0, 0, 5.85);
  for (const x of [-5.6, 5.6]) for (const z of [-4.3, 4.3]) B.c(K.noir, 0.7, 0.8, 0.12, 8, x, -0.0, z);
  /* bras de lecture */
  B.c(K.chrome, 0.75, 0.85, 0.7, 10, 4.7, 1.0, -3.3); B.solC(0.8, 0.7, 4.7, 1.0, -3.3);
  B.tube(K.chrome, [4.7, 2.0, -3.3], [2.1, 1.75, 1.4], 0.13, 6); B.c(K.chrome, 0.16, 0.16, 0.5, 6, 4.7, 1.6, -3.3); B.c(K.noir, 0.4, 0.4, 0.6, 8, 5.25, 1.75, -4.25, PI / 2, -0.5);
  B.b(K.noir, 0.6, 0.3, 1.0, 2.0, 1.45, 1.55, -0.5); B.b(K.orange, 0.2, 0.12, 0.3, 1.82, 1.36, 1.86, -0.5);
  cristalLocal(4.9, 2.0, 3.6); cristalLocal(-1.6, 3.1, 0);
  /* pochettes de disques adossées */
  for (const [x, c, c2, a] of [[-4.6, K.rouge, K.jaune, 0.22], [-2.9, K.bleu, K.blanc, 0.3], [-1.2, K.turquoise, K.orange, 0.38]]) { B.b(c, 1.5, 3.0, 0.12, x, 0, -7.4 + a * 0.5, 0, -a); B.c(c2, 0.9, 0.9, 0.05, 10, x, 1.45 + 0.02, -7.36 + a * 2.0, PI / 2 - a); }
  for (const s of [-1, 1]) {
    const o = piece.objets.get(s < 0 ? 'jblL' : 'jblR'), G = 8, [x0, y0, z0, x1, y1, z1] = o.bb, bx = (x0 + x1) / 2, bz = (z0 + z1) / 2, c = B.pt(s * 9.3, 0, -7.6), ry = -s * 0.25, co = Math.cos(ry), si = Math.sin(ry);
    lots.ajoute(piece, o, (v) => { const lx = (v.x - bx) * G, lz = (v.z - bz) * G; v.set(c.x + lx * co + lz * si, c.y + v.y * G, c.z - lx * si + lz * co); });
    monde.col({ t: 'b', x: c.x, z: c.z, hw: (x1 - x0) / 2 * G, hd: (z1 - z0) / 2 * G, cos: co, sin: si, top: c.y + y1 * G, bas: c.y });
    cristal(c.x, c.y + y1 * G + 1.0, c.z);
  }
  const pPlateau = B.pt(-1.6, 1.0, 0), pBouton = B.pt(5.4, 1.0, 4.1), pTr1 = B.pt(-8.4, 0, -3.6), pTr2 = B.pt(8.4, 0, -3.6);
  B.tire();
  tremplin(pTr1.x, pTr1.y, pTr1.z, 19); tremplin(pTr2.x, pTr2.y, pTr2.z, 19);
  const plateau = dyn((b) => {
    b.c(K.noir, 4.3, 4.3, 0.3, 28, 0, 0, 0); b.c('#383440', 3.9, 3.9, 0.33, 28, 0, 0, 0); b.c(K.noir, 3.25, 3.25, 0.35, 24, 0, 0, 0); b.c('#383440', 2.5, 2.5, 0.37, 20, 0, 0, 0);
    b.c(K.orange, 1.5, 1.5, 0.39, 14, 0, 0, 0); b.c(K.blanc, 0.55, 0.55, 0.41, 10, 0, 0, 0); b.b(K.blanc, 0.9, 0.4, 0.22, 0.95, 0, 0); b.b(K.noir, 0.5, 0.4, 0.12, -0.9, 0, 0.3, 0.6);
    b.c(K.chrome, 0.12, 0.12, 1.0, 6, 0, 0, 0);
  });
  plateau.position.copy(pPlateau);
  const cPlateau = monde.plateau = monde.col({ t: 'c', x: pPlateau.x, z: pPlateau.z, r: 4.3, top: pPlateau.y + 0.39, bas: pPlateau.y, dRot: 0, mobile: true });
  let vitesse = 0.55, cible = 0.55;
  monde.anims.push((t, dt) => { vitesse += (cible - vitesse) * Math.min(1, dt * 2); cPlateau.dRot = vitesse * dt; plateau.rotation.y += cPlateau.dRot; });
  /* bouton 33 / 45 tours : une plaque de pression */
  const plaque = (p, c, action) => {
    const me = dyn((b) => { b.c(K.noir2, 0.95, 1.0, 0.08, 10, 0, 0, 0); b.c(c, 0.8, 0.8, 0.1, 10, 0, 0.06, 0); }); me.position.copy(p);
    const col = monde.col({ t: 'c', x: p.x, z: p.z, r: 0.85, top: p.y + 0.14, bas: p.y, appui: 0, surPas: () => { if (col.appui <= 0) action(); col.appui = 0.4; } });
    monde.anims.push((t, dt) => { col.appui = Math.max(0, col.appui - dt); me.scale.y += ((col.appui > 0 ? 0.45 : 1) - me.scale.y) * Math.min(1, dt * 14); });
    return col;
  };
  plaque(pBouton, K.jaune, () => { cible = cible < 1 ? 1.5 : 0.55; monde.son?.('plaque'); monde.dit?.(cible > 1 ? '45 tours' : '33 tours'); });

  /* ascenseur vers l'atelier */
  {
    const a = new THREE.Vector3(44, 2.5, -15.6), b2 = new THREE.Vector3(42.5, 7, -35.4), T = 12;
    const me = dyn((b) => { b.b(K.sable2, 3.2, 0.3, 3.2, 0, -0.3, 0); b.b(K.orange, 2.4, 0.04, 2.4, 0, -0.02, 0); b.b(K.sable2, 1.6, 0.05, 1.6, 0, -0.02, 0); b.c(K.rose, 1.4, 0, 1.3, 6, 0, -1.6, 0, PI); for (const x of [-1.5, 1.5]) for (const z of [-1.5, 1.5]) b.c(K.cristal, 0, 0.12, 0.5, 4, x, 0, z); });
    const c = monde.col({ t: 'b', x: a.x, z: a.z, hw: 1.6, hd: 1.6, cos: 1, sin: 0, top: a.y, bas: a.y - 0.4, dx: 0, dy: 0, dz: 0, mobile: true });
    const p = new THREE.Vector3(); monde.ascenseur = c;
    monde.anims.push((t) => {
      const u = (t % T) / T, tri = u < 0.5 ? u * 2 : 2 - u * 2, f = Math.min(1, Math.max(0, (tri - 0.14) / 0.72)), e = f * f * (3 - 2 * f);
      p.lerpVectors(a, b2, e); c.dx = p.x - c.x; c.dy = p.y - c.top; c.dz = p.z - c.z; c.x = p.x; c.z = p.z; c.top = p.y; c.bas = p.y - 0.4; me.position.copy(p);
    });
  }

  /* ═════ 3. L'atelier des processus ═════ */
  const I3 = { x: 42, z: -50, y: 7, r: 13, graine: 3, sol: K.beton, bord: '#bfb39c', roche: [K.mauve, K.violet], nom: "L'atelier" };
  ile(B, I3); decor(B, I3, 303, { min: 0.84, touffes: 6, rochers: 4 });
  B.pousse(42, 7, -50);
  for (let i = 0; i < 9; i++) B.b(i % 2 ? K.jaune : K.noir2, 0.5, 0.03, 0.9, -1.5 + i * 0.5, 0, 11.2);   // seuil rayé
  /* piles de formulaires : un escalier de papier */
  const pile = (x, z, n, ry = 0) => { for (let i = 0; i < n; i++) B.b(i % 3 === 2 ? '#e4dcc8' : K.blanc, 1.7, 0.15, 2.3, x + ((i * 7) % 3 - 1) * 0.04, i * 0.15, z + ((i * 5) % 3 - 1) * 0.04, ry + ((i * 3) % 5 - 2) * 0.03); B.b(K.bleu, 1.1, 0.012, 0.12, x, n * 0.15, z - 0.7, ry); for (let l = 0; l < 4; l++) B.b('#9a958c', 1.2, 0.012, 0.05, x, n * 0.15, z - 0.3 + l * 0.3, ry); B.solB(1.7, n * 0.15, 2.3, x, 0, z, ry); };
  pile(-3, 6.6, 3); pile(-5.4, 5.2, 6, 0.4); cristalLocal(-5.4, 1.9, 5.2);
  /* tapis roulant */
  B.b(K.noir2, 2.6, 0.75, 10.4, -3, 0, 0); B.b(K.chrome, 0.12, 0.2, 10.4, -4.3, 0.75, 0); B.b(K.chrome, 0.12, 0.2, 10.4, -1.7, 0.75, 0);
  for (let i = 0; i < 6; i++) for (const s of [-1.36, 1.36]) B.c(K.orange, 0.22, 0.22, 0.1, 8, -3 + s, 0.35, -4.4 + i * 1.76, 0, 0, PI / 2);
  B.solB(2.4, 0.9, 10.4, -3, 0, 0, 0, { tapis: [0, -2.6] });
  const pTapisR = B.pt(-3, 0.75, 0);
  cristalLocal(-3, 1.9, -1.5);
  /* la machine : elle avale les formulaires et rend des tableaux de bord */
  B.b(K.turquoise, 5.4, 3.6, 4.6, -3, 0, -8.6); B.b('#4f9c8f', 5.7, 0.3, 4.9, -3, 3.6, -8.6); B.b(K.noir, 2.7, 1.3, 0.3, -3, 0.75, -6.25); B.b(K.jaune, 3.1, 0.14, 0.34, -3, 2.05, -6.25);
  B.c(K.noir2, 0.5, 0.6, 2.4, 7, -1.4, 3.9, -9.6); B.c(K.orange, 0.62, 0.5, 0.3, 7, -1.4, 6.3, -9.6);
  for (let i = 0; i < 3; i++) B.c(i === 1 ? K.rouge : K.cristal, 0.16, 0.16, 0.1, 6, -4.6 + i * 0.5, 2.6, -6.28, PI / 2);
  B.solB(5.4, 3.9, 4.6, -3, 0, -8.6);
  B.b(K.bois, 1.8, 1.25, 1.8, 0.8, 0, -8.2); B.b(K.noyer, 1.9, 0.08, 1.9, 0.8, 1.2, -8.2); B.solB(1.8, 1.3, 1.8, 0.8, 0, -8.2);
  B.b(K.bois, 1.6, 2.5, 1.6, 0.6, 0, -10.1); B.b(K.noyer, 1.7, 0.08, 1.7, 0.6, 2.5, -10.1); B.solB(1.6, 2.6, 1.6, 0.6, 0, -10.1);
  cristalLocal(-4, 4.9, -8.6); monde.effets.push({ type: 'fumee', p: B.pt(-1.4, 6.7, -9.6) });
  const pRoue1 = B.pt(-0.2, 2.6, -6.2), pRoue2 = B.pt(-5.75, 1.9, -7.6), pBras = B.pt(0.3, 0, -1.6);
  /* tableau de bord en relief */
  B.pousse(7.2, 0, -4.6, -0.75);
  for (const x of [-2.4, 2.4]) B.b(K.noir2, 0.25, 1.2, 0.25, x, 0, 0);
  B.b(K.noir, 6.4, 3.7, 0.3, 0, 1.1, 0); B.b(K.blanc, 6.0, 3.3, 0.06, 0, 1.3, 0.17);
  [1.0, 1.7, 1.3, 2.2, 1.9, 2.6].forEach((h, i) => B.b([K.turquoise, K.bleu, K.orange, K.turquoise, K.bleu, K.orange][i], 0.5, h, 0.14, -2.4 + i * 0.68, 1.55, 0.22));
  B.c(K.jaune, 0.75, 0.75, 0.12, 12, 2.0, 3.35, 0.24, PI / 2); B.c(K.rouge, 0.76, 0.76, 0.13, 3, 2.0, 3.35, 0.245, PI / 2);
  for (let i = 0; i < 3; i++) B.b('#9a958c', 1.5, 0.1, 0.05, 2.0, 1.7 + i * 0.3, 0.2);
  B.solB(6.4, 4.8, 0.4, 0, 0, 0); cristalLocal(0, 1.0, 2.2);
  B.tire();
  B.tire();
  /* lattes du tapis roulant, engrenages et bras */
  const lattes = dyn((b) => { for (let i = 0; i < 11; i++) { b.b('#57525f', 2.4, 0.15, 0.82, 0, 0, -5.2 + i + 0.05); b.b(K.jaune, 0.5, 0.16, 0.1, 0, 0, -5.2 + i + 0.4); } });
  lattes.position.copy(pTapisR); monde.anims.push((t) => { lattes.position.z = pTapisR.z + 0.52 - ((t * 2.6) % 1); });
  const roue = (p, r, dents, c, v, axeX = false) => {
    const me = dyn((b) => { b.c(c, r, r, 0.3, dents * 2, 0, -0.15, 0, PI / 2); b.c(K.noir2, r * 0.3, r * 0.3, 0.4, 8, 0, -0.2, 0, PI / 2); for (let i = 0; i < dents; i++) { const a = i / dents * PI * 2; b.ajoute(new THREE.BoxGeometry(r * 0.34, r * 0.3, 0.3), c, Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0, 0, 0, a); } });
    me.position.copy(p); if (axeX) me.rotation.y = PI / 2; monde.anims.push((t, dt) => { me.rotateZ(v * dt); });
  };
  roue(pRoue1, 1.0, 9, K.orange, 0.9); roue(new THREE.Vector3(pRoue1.x + 1.55, pRoue1.y + 0.75, pRoue1.z), 0.62, 6, K.jaune, -1.35); roue(pRoue2, 0.9, 8, K.rouge, -0.7, true);
  {
    const base = new THREE.Group(); base.position.copy(pBras); scene.add(base);
    dyn((b) => { b.c(K.noir2, 0.7, 0.85, 0.5, 8, 0, 0, 0); b.c(K.orange, 0.4, 0.5, 0.7, 8, 0, 0.5, 0); }, base);
    const ep = new THREE.Group(); ep.position.y = 1.2; base.add(ep); dyn((b) => { b.tube(K.orange, [0, 0, 0], [0, 2.3, 0], 0.26, 6, 0.2); b.s(K.noir2, 0.34, 0, 0, 0, 0); }, ep);
    const co = new THREE.Group(); co.position.y = 2.3; ep.add(co); dyn((b) => { b.tube(K.orange, [0, 0, 0], [0, 1.9, 0], 0.2, 6, 0.14); b.s(K.noir2, 0.28, 0, 0, 0, 0); b.b(K.noir2, 0.7, 0.14, 0.2, 0, 1.9, 0); for (const s of [-0.3, 0.3]) b.b(K.chrome, 0.08, 0.5, 0.16, s, 2.0, 0); }, co);
    monde.anims.push((t) => { base.rotation.y = -1.4 + Math.sin(t * 0.5) * 0.7; ep.rotation.z = 0.5 + Math.sin(t * 0.8) * 0.18; co.rotation.z = 1.25 + Math.sin(t * 1.1 + 1) * 0.3; });
    monde.col({ t: 'c', x: pBras.x, z: pBras.z, r: 0.8, top: pBras.y + 1.2, bas: pBras.y });
  }

  /* ═════ 5. Le belvédère (portails) ═════ */
  const I5 = { x: 0, z: -76, y: 13, r: 12, graine: 5, sol: K.sable, bord: K.sable2, roche: [K.rose, K.ocre], nom: 'Le belvédère' };
  ile(B, I5); decor(B, I5, 505, { min: 0.82, eclats: 5 });
  /* feuilles volantes entre l'atelier et le belvédère */
  gue(B, [31.8, 7, -56.3], [9.4, 13, -70.2], 7, (x, y, z, i) => {
    B.b(K.blanc, 2.5, 0.1, 1.9, x, y - 0.1, z, 0.55 + (i % 3 - 1) * 0.25); B.b(K.bleu, 1.6, 0.012, 0.14, x - 0.25, y, z - 0.45, 0.55 + (i % 3 - 1) * 0.25);
    for (let l = 0; l < 3; l++) B.b('#9a958c', 1.7, 0.012, 0.06, x - 0.05 + l * 0.14, y, z - 0.1 + l * 0.26, 0.55 + (i % 3 - 1) * 0.25);
    monde.col({ t: 'c', x, z, r: 1.15, top: y, bas: y - 0.2, fixe: true }); monde.gues.feuilles.push({ x, y, z }); if (i === 4) cristal(x, y + 1.3, z);
  });
  B.pousse(0, 13, -76);
  B.c(K.sable2, 7.6, 7.9, 0.4, 14, 0, 0, -1); B.solC(7.6, 0.4, 0, 0, -1); B.c(K.rose, 5.2, 5.5, 0.4, 12, 0, 0.4, -1.4); B.solC(5.2, 0.4, 0, 0.4, -1.4);
  const portail = (x, z, ry, nom, url, c) => {
    B.pousse(x, 0.8, z, ry);
    for (const s of [-1, 1]) { B.b(K.sable2, 0.7, 0.3, 0.8, s * 1.25, 0, 0); B.b(K.rose, 0.55, 1.2, 0.65, s * 1.25, 0.3, 0); B.b(K.mauve, 0.5, 1.2, 0.6, s * 1.25, 1.5, 0); B.b(K.sable2, 0.66, 0.2, 0.76, s * 1.25, 2.7, 0); B.solB(0.6, 3, 0.7, s * 1.25, 0, 0); }
    B.b(K.rose, 3.5, 0.5, 0.8, 0, 2.9, 0); B.b(K.sable2, 2.2, 0.3, 0.7, 0, 3.4, 0); B.c(c, 0.34, 0.34, 0.1, 8, 0, 3.15 - 0.05, 0.42, PI / 2);
    const p = B.pt(0, 0, 0), pv = B.pt(0, 1.55, 0), pl = B.pt(0, 4.4, 0), cap = B.cap;
    B.tire();
    const disque = dyn((b) => { [[1.0, c], [0.78, K.blanc], [0.56, c], [0.34, K.cristal], [0.14, K.blanc]].forEach(([r, k], i) => { b.c(k, r, r, 0.04 + i * 0.012, 7 + (i % 2), 0, -0.02 - i * 0.006, 0, PI / 2, 0, i * 0.4); }); });
    disque.position.copy(pv); disque.rotation.y = cap; disque.castShadow = false;
    const ecr = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.03), encre({ map: texte([nom]), side: THREE.DoubleSide, emissive: '#8c8c8c' })); ecr.position.copy(pl); ecr.rotation.y = cap; scene.add(ecr);
    monde.anims.push((t, dt) => { disque.rotateZ(dt * 0.9); });
    monde.portails.push({ x: p.x, y: p.y, z: p.z, nom, url });
  };
  portail(-3.3, -2.9, 0.5, 'CONTACT', liens.contact, K.orange);
  portail(0, -4.2, 0, 'CV', liens.cv, K.turquoise);
  portail(3.3, -2.9, -0.5, 'LINKEDIN', liens.linkedin, K.bleu);
  /* grand cristal et oriflammes */
  B.c(K.cristal, 1.0, 1.3, 5.2, 6, 0, 0, -8.6, 0.06, 0.3, -0.05); B.c(K.cristal, 0, 1.0, 2.0, 6, -0.27, 5.15, -8.3, 0.06, 0.3, -0.05); B.solC(1.3, 5, 0, 0, -8.6);
  eclat(B, 1.9, 0, -8.2, 2.6, K.cristal, 0.3, 1); eclat(B, -2.0, 0, -8.9, 2.0, '#e9dc9a', -0.25, 2);
  for (const [x, z, c] of [[-8.3, 2.5, K.rouge], [8.3, 2.5, K.orange], [-6.2, 6.6, K.jaune], [6.2, 6.6, K.turquoise]]) { B.c(K.noyer, 0.06, 0.09, 4.2, 5, x, 0, z); B.tris(c, [0, 4.1, 0, 0, 3.0, 0, 1.5, 3.7, 0.25], x, 0, z); B.tris(c, [0, 2.9, 0, 0, 2.2, 0, 1.0, 2.6, 0.2], x, 0, z); }
  cristalLocal(0, 1.0, -6.4);
  B.tire();

  /* ═════ 4. Le jardin ═════ */
  const I4 = { x: -40, z: -24, y: 3.5, r: 14, graine: 4, sol: K.herbe, bord: K.herbe2, roche: [K.ocre, K.mauve], nom: 'Le jardin' };
  ile(B, I4); decor(B, I4, 404, { min: 0.78, touffes: 26, cT: K.feuille, eclats: 2 });
  gue(B, [-12, 0, -7.2], [-28.9, 3.5, -17.3], 5, (x, y, z, i) => { pierre(B, x + (i % 2 ? 0.5 : -0.5), y, z, 1.3, K.ocre, K.mauve, i + 9); monde.gues.jardin.push({ x: x + (i % 2 ? 0.5 : -0.5), y, z }); });
  B.pousse(-40, 3.5, -24);
  /* bassin */
  { const t = []; for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2, b = (i + 1) / 14 * PI * 2, r1 = 4.2 * (1 + 0.1 * Math.sin(a * 3)), r2 = 4.2 * (1 + 0.1 * Math.sin(b * 3)); t.push(0, 0, 0, Math.cos(b) * r2, 0, Math.sin(b) * r2, Math.cos(a) * r1, 0, Math.sin(a) * r1); if (i % 2) rocher(B, -2 + Math.cos(a) * r1 * 1.04, -0.05, 3.2 + Math.sin(a) * r1 * 1.04, 0.4, i % 4 === 1 ? K.mauve : K.rose, i); } B.tris(K.eau, t, -2, 0.04, 3.2); }
  for (const [x, z, r] of [[-3.6, 4.6, 0.5], [-0.6, 2.2, 0.42], [-2.9, 1.2, 0.36], [0.2, 4.8, 0.3]]) B.c(K.feuille, r, r, 0.03, 7, x, 0.06, z);
  B.c(K.blanc, 0, 0.12, 0.14, 5, -3.6, 0.09, 4.6); B.c('#f1a7b5', 0, 0.1, 0.12, 5, -0.6, 0.09, 2.2);
  for (const [x, z, h] of [[0.9, 3.1, 0.3], [-0.6, 3.5, 0.45], [-2, 3.2, 0.6]]) { B.c(K.mauve, 0.62, 0.8, h, 6, x, 0, z, 0, x); B.solC(0.7, h, x, 0, z); }
  cristalLocal(-2, 1.6, 3.2);
  /* grand bonsaï : le pot, le tronc et trois plateaux de feuillage où l'on grimpe */
  B.pousse(-6.4, 0, -5.2);
  B.c('#5f7f9c', 2.7, 2.2, 1.1, 8, 0, 0.15, 0); B.c('#4d6a86', 2.3, 2.3, 0.15, 8, 0, 0, 0); B.c(K.noyer, 2.45, 2.45, 0.06, 8, 0, 1.22, 0); B.solC(2.7, 1.28, 0, 0, 0);
  B.tube(K.noyer, [0.3, 1.2, 0], [-0.7, 3.2, 0.3], 0.75, 6, 0.55); B.tube(K.noyer, [-0.7, 3.2, 0.3], [0.5, 5.0, -0.4], 0.55, 6, 0.4); B.tube(K.noyer, [0.5, 5.0, -0.4], [0.0, 6.6, 0.2], 0.4, 5, 0.22);
  B.tube(K.noyer, [-0.5, 2.8, 0.2], [-3.0, 2.3, 1.2], 0.3, 5, 0.16); B.tube(K.noyer, [0.3, 4.6, -0.3], [3.0, 3.75, -1.3], 0.26, 5, 0.14);
  const plateauF = (x, y, z, r) => { B.s(K.feuille, r, 1, x, y - r * 0.3, z, 1, 0.34, 1, x); B.s(K.feuille2, r * 0.72, 1, x + r * 0.2, y - r * 0.5, z - r * 0.25, 1, 0.34, 1, z); B.s(K.herbe2, r * 0.6, 1, x - r * 0.3, y - r * 0.24, z + r * 0.3, 1, 0.3, 1, y); B.solC(r * 0.88, 0.5, x, y - 0.5, z); };
  plateauF(-3.2, 2.75, 1.4, 1.7); plateauF(3.3, 4.2, -1.4, 1.8); plateauF(0, 5.7, 0.2, 2.1); plateauF(-0.4, 7.1, 0.2, 1.4);
  cristalLocal(3.3, 5.3, -1.4); cristalLocal(-0.4, 8.2, 0.2); monde.effets.push({ type: 'feuilles', p: B.pt(0, 6.5, 0) });
  B.tire();
  /* pavillon de thé */
  B.pousse(5.2, 0, -2.6, -0.5);
  B.b(K.bois, 4.2, 0.45, 3.4, 0, 0, 0); B.solB(4.2, 0.45, 3.4, 0, 0, 0); B.b(K.boisClair, 3.8, 0.04, 3.0, 0, 0.45, 0);
  for (const x of [-1.8, 1.8]) for (const z of [-1.4, 1.4]) { B.b(K.noyer, 0.2, 2.2, 0.2, x, 0.45, z); B.solB(0.25, 2.2, 0.25, x, 0.45, z); }
  B.b(K.blanc, 3.4, 1.5, 0.06, 0, 0.9, -1.4); for (const x of [-1.1, 0, 1.1]) B.b(K.noyer, 0.06, 1.5, 0.08, x, 0.9, -1.4);
  B.c(K.noir2, 0.4, 3.6, 1.3, 4, 0, 2.65, 0, 0, PI / 4); B.c(K.violet, 0, 0.5, 0.4, 4, 0, 3.9, 0, 0, PI / 4);
  B.c(K.noyer, 0.5, 0.5, 0.18, 8, 0.3, 0.49, 0.2); B.c(K.blanc, 0.09, 0.07, 0.1, 6, 0.3, 0.67, 0.2);
  cristalLocal(-0.9, 1.5, 0.3);
  B.tire();
  /* lanterne de pierre, pins, bambous */
  B.pousse(1.6, 0, 8.2); B.c(K.beton, 0.3, 0.4, 0.2, 6); B.c(K.beton, 0.14, 0.16, 0.7, 6, 0, 0.2, 0); B.b(K.beton, 0.6, 0.1, 0.6, 0, 0.9, 0); B.b(K.jaune, 0.34, 0.34, 0.34, 0, 1.0, 0); B.c(K.mauve, 0, 0.6, 0.4, 4, 0, 1.34, 0, 0, PI / 4); B.solC(0.4, 1.7, 0, 0, 0); B.tire();
  for (const [x, z, h] of [[-10.5, 1, 4.2], [-9.4, -8.6, 5.2], [-1, -10.6, 3.6], [-11, 5.6, 3.2], [9.4, 5.4, 3.8]]) { B.c(K.noyer, 0.16, 0.24, h * 0.35, 5, x, 0, z); for (let i = 0; i < 3; i++) B.c(i % 2 ? K.feuille : K.feuille2, 0, h * (0.34 - i * 0.07), h * 0.36, 6, x, h * (0.25 + i * 0.22), z, 0, i); B.solC(0.3, h, x, 0, z); }
  for (let i = 0; i < 9; i++) { const x = -8.4 + (i % 3) * 0.55 + (i * 0.13) % 0.2, z = 8.2 + Math.floor(i / 3) * 0.5, h = 3 + (i * 0.77) % 1.6; B.c(K.herbe2, 0.06, 0.08, h, 5, x, 0, z, 0.03 * (i % 3 - 1), 0, 0.04 * (i % 2)); for (let j = 0; j < 3; j++) B.c(K.feuille, 0, 0.05, 0.6, 3, x + 0.16, h * (0.6 + j * 0.14), z, 0, j * 2, -1.1); }
  B.solC(1.0, 3, -7.9, 0, 8.7);
  const pPlaque = monde.pPlaque = B.pt(6.3, 0, -8.2);
  B.tire();
  /* le pont de dalles : il sort du vide quand on marche sur la plaque du jardin */
  {
    const dalles = gue(B, [-32.1, 3.5, -34.3], [-6.7, 13, -67.3], 11, (x, y, z, i) => {
      const me = dyn((b) => { b.c(K.sable, 1.45, 1.4, 0.25, 6, 0, -0.25, 0, 0, i); b.c(K.ocre, 1.3, 0.5, 0.8, 6, 0, -1.05, 0, 0, i); b.c(K.cristal, 0, 0.16, 0.5, 4, 0.9, 0, 0.6); });
      me.position.set(x, y - 30, z); me.visible = false;
      const c = monde.col({ t: 'c', x, z, r: 1.42, top: y - 30, bas: y - 31, dx: 0, dy: 0, dz: 0, mobile: true, actif: false });
      if (i === 6) cristal(x, y + 1.3, z);
      monde.gues.pont.push({ x, y, z });
      return { me, c, y, i, u: 0 };
    });
    let leve = -1;
    plaque(pPlaque, K.turquoise, () => { if (leve < 0) { leve = 0; monde.son?.('pont'); monde.dit?.('Un pont se lève', 'dalle après dalle, vers le belvédère'); } });
    monde.anims.push((t, dt) => {
      if (leve < 0) return; leve += dt;
      for (const d of dalles) {
        const u = Math.min(1, Math.max(0, (leve - d.i * 0.22) / 1.3)); if (u === d.u) { d.c.dy = 0; continue; }
        d.u = u; d.me.visible = true; d.c.actif = true;
        const e = 1 - Math.pow(1 - u, 3), ny = d.y - 30 * (1 - e) + Math.sin(u * PI) * 0.5;
        d.c.dy = ny - d.c.top; d.c.top = ny; d.c.bas = ny - 1; d.me.position.y = ny;
      }
    });
  }

  /* ═════ décor fixe : un seul maillage ═════ */
  for (const me of lots.maillages([mat, encre({ vertexColors: true, side: THREE.DoubleSide, emissive: '#9a9a9a' })])) scene.add(me);
  const fixe = B.maillage(mat); scene.add(fixe);

  /* ═════ lointain : désert, fleuve, mesas ═════ */
  {
    const b = new Batisseur(monde), Y = -170, N = 46, T = 2600, h = (x, z) => 14 * Math.sin(x * 0.011 + 1) * Math.cos(z * 0.013) + 8 * Math.sin(x * 0.027 + z * 0.021) + 4 * Math.sin(z * 0.05 + x * 0.03);
    const fl = (x, z) => Math.abs(z + 130 * Math.sin(x * 0.0042 + 0.6) + 60 * Math.sin(x * 0.011) + 140);
    const sable = [], sable2 = [], eau = [], rive = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, c]) => { const x = (a / N - 0.5) * T, z = (c / N - 0.5) * T, f = fl(x, z); return [x, f < 42 ? Y - 3 : Y + h(x, z) * Math.min(1, (f - 42) / 90), z, f]; });
      const f = (q[0][3] + q[2][3]) / 2, dest = f < 42 ? eau : f < 80 ? rive : ((i * 7 + j * 13) % 5 < 2 ? sable2 : sable);
      dest.push(q[0][0], q[0][1], q[0][2], q[2][0], q[2][1], q[2][2], q[1][0], q[1][1], q[1][2], q[0][0], q[0][1], q[0][2], q[3][0], q[3][1], q[3][2], q[2][0], q[2][1], q[2][2]);
    }
    b.tris('#dcc097', sable); b.tris('#d3b185', sable2); b.tris('#8fc7bd', eau); b.tris('#a9bf95', rive);
    const rd = alea(77);
    for (let i = 0; i < 22; i++) {
      const a = rd() * PI * 2, d = 230 + rd() * 800, x = Math.cos(a) * d, z = Math.sin(a) * d - 40; if (fl(x, z) < 120) continue;
      let r = 28 + rd() * 60, y = Y - 6; const n = 2 + Math.floor(rd() * 3);
      for (let k = 0; k < n; k++) { const hh = 22 + rd() * 46; b.c(k % 2 ? K.mauve : K.rose, r * 0.82, r, hh, 7, x, y, z, 0, rd() * 3); y += hh; r *= 0.62 + rd() * 0.2; }
      b.c(K.sable, r * 1.25, r * 1.25, 1.5, 7, x, y, z);
    }
    const loin = b.maillage(mat); loin.castShadow = false; loin.receiveShadow = false; scene.add(loin);
  }
  /* nuages */
  {
    const b = new Batisseur(monde), rd = alea(5);
    for (let i = 0; i < 16; i++) { const a = rd() * PI * 2, d = 170 + rd() * 420, x = Math.cos(a) * d, z = Math.sin(a) * d - 30, y = -70 + rd() * 120, s = 7 + rd() * 11; for (let k = 0; k < 5; k++) b.s(k % 2 ? '#f6efdf' : '#eadfca', s * (0.55 + rd() * 0.5), 1, x + (k - 2) * s * 0.7, y + (rd() - 0.3) * s * 0.3, z + (rd() - 0.5) * s * 0.6, 1.2, 0.42, 1); }
    const nuages = b.maillage(encre({ vertexColors: true, emissive: '#6b6b6b' })); nuages.castShadow = nuages.receiveShadow = false; scene.add(nuages);
    monde.anims.push((t, dt) => { nuages.rotation.y += dt * 0.004; });
  }
  /* oiseaux de papier */
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); scene.add(g);
    dyn((b) => { b.tris(K.blanc, [0, 0, 1.3, 0.28, 0, -0.9, -0.28, 0, -0.9, 0, 0, 1.3, 0, -0.3, -0.7, 0.28, 0, -0.9, 0, 0, 1.3, -0.28, 0, -0.9, 0, -0.3, -0.7]); }, g).castShadow = false;
    const ailes = [-1, 1].map((s) => { const a = dyn((b) => { b.tris(i % 2 ? K.orange : K.rouge, [0, 0, 0.9, s * 2.0, 0, -0.5, 0, 0, -0.8]); }, g); a.castShadow = false; return a; });
    const R = 34 + i * 17, H = 12 + i * 7, v = (i % 2 ? -1 : 1) * (0.12 + i * 0.02), cx = [10, 30, -30, 0][i], cz = [-20, -40, -30, -70][i];
    monde.anims.push((t) => { const a = t * v + i * 2; g.position.set(cx + Math.cos(a) * R, H + Math.sin(t * 0.4 + i) * 2.5, cz + Math.sin(a) * R); g.rotation.y = -a + (v > 0 ? 0 : PI); ailes[0].rotation.z = Math.sin(t * 3.2 + i) * 0.55; ailes[1].rotation.z = -Math.sin(t * 3.2 + i) * 0.55; });
  }
  /* cailloux en suspension autour des îles */
  {
    const b = new Batisseur(monde), rd = alea(909);
    for (const o of [I1, I2, I3, I4, I5]) for (let i = 0; i < 7; i++) { const a = rd() * PI * 2, d = o.r * (1.15 + rd() * 0.5), s = 0.3 + rd() * 0.8; rocher(b, o.x + Math.cos(a) * d, o.y - 2 - rd() * 9, o.z + Math.sin(a) * d, s, i % 2 ? K.rose : K.mauve, i + o.graine * 10); }
    const me = b.maillage(mat); scene.add(me); monde.anims.push((t) => { me.position.y = Math.sin(t * 0.5) * 0.35; });
  }

  monde.maj = (t, dt) => { for (const a of monde.anims) a(t, dt); };
  return monde;
}
