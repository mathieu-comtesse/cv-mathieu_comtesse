// La Manufacture de Nisaru : outils de construction (méthode Anatomy transposée en Three.js).
// Chaque pièce est un solide réel (boîte chanfreinée, cylindre, engrenage, ressort, courroie...). Les pièces d'un même ensemble qui partagent un
// matériau sont fusionnées en un seul maillage (peu d'appels de rendu) ; seules les pièces mobiles sont des objets à part, posés sur un pivot.
// Repère de figure : x vers la droite, y vers l'avant, z vers le haut ; il devient (x, z, y) dans la scène.
import * as THREE from 'three';

export const PAL = {
  graphite: '#666b75', iron: '#464a53', steel: '#b9bec6', steelDk: '#858b95', bronze: '#a8733c', brass: '#d2ab50',
  ceramic: '#e9e6dd', rubber: '#1b1c20', paper: '#f6efdc', paperEdge: '#d9ceb2',
  blue: '#5aa0ff', amber: '#ffb347', green: '#5fd39a', gold: '#ffe08a', rose: '#ff6fa8', red: '#e5584b', orange: '#ff9d3c'
};

export function makeMats() {
  const std = (color, roughness = .55, metalness = .12, o = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...o });
  const M = {
    graphite: std(PAL.graphite, .74, .08), iron: std(PAL.iron, .62, .1), steel: std(PAL.steel, .42, .22), steelDk: std(PAL.steelDk, .5, .2),
    bronze: std(PAL.bronze, .5, .2), brass: std(PAL.brass, .38, .24), ceramic: std(PAL.ceramic, .7, .02), rubber: std(PAL.rubber, .9, 0),
    paper: std(PAL.paper, .92, 0), paperEdge: std(PAL.paperEdge, .92, 0),
    glass: std('#a9cfe3', .08, .05, { transparent: true, opacity: .26, depthWrite: false })
  };
  return M;
}

const sw = (m) => m;                                 // repère de figure -> scène : (x, y, z) devient (x, z, y)

/** fusion simple de géométries (position + normale) en une seule */
export function mergeGeos(geos) {
  const ng = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of ng) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of ng) {
    const p = g.attributes.position.array, q = g.attributes.normal.array;
    pos.set(p, o * 3); nor.set(q, o * 3); o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}

export class Part {
  /** origin : point de pivot en repère de figure ; toute la géométrie est construite en coordonnées de figure absolues */
  constructor(name, mats, origin = [0, 0, 0]) {
    this.name = name; this.M = mats; this.o = origin; this.b = new Map(); this.count = 0; this.extra = []; this.solids = [];            // solids : boîte englobante de chaque pièce (repère local), pour les audits d'interférence
    this.root = new THREE.Group(); this.root.name = name; this.root.position.set(origin[0], origin[2], origin[1]);
  }
  _put(key, geo, x, y, z) {
    geo.translate(x - this.o[0], z - this.o[2], y - this.o[1]);
    geo.computeBoundingBox(); this.solids.push({ k: key, b: geo.boundingBox.clone() });
    let l = this.b.get(key); if (!l) this.b.set(key, l = []); l.push(geo); this.count++;
  }
  /** boîte centrée en (x, y, z), largeur w (x), profondeur d (y), hauteur h (z), arêtes chanfreinées de c */
  box(x, y, z, w, d, h, key = 'graphite', c = 0) {
    let g;
    if (c > 0 && Math.min(w, d, h) > 2.4 * c) {
      const s = new THREE.Shape(); const a = (w - 2 * c) / 2, b = (d - 2 * c) / 2;
      s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, b); s.lineTo(-a, b); s.closePath();
      g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * c, bevelEnabled: true, bevelSize: c, bevelThickness: c, bevelSegments: 1, curveSegments: 1 });
      g.translate(0, 0, -(h - 2 * c) / 2); g.rotateX(-Math.PI / 2);
    } else g = new THREE.BoxGeometry(w, h, d);
    this._put(key, g, x, y, z); return this;
  }
  /** cylindre vertical (axe z), base en z0 */
  cylZ(x, y, z0, r, h, key = 'steel', seg = 22, r2 = r) { this._put(key, new THREE.CylinderGeometry(r2, r, h, seg), x, y, z0 + h / 2); return this; }
  /** cylindre d'axe x, de x0 à x1 */
  cylX(x0, x1, y, z, r, key = 'steel', seg = 22) { this._put(key, new THREE.CylinderGeometry(r, r, x1 - x0, seg).rotateZ(Math.PI / 2), (x0 + x1) / 2, y, z); return this; }
  /** cylindre d'axe y, de y0 à y1 */
  cylY(y0, y1, x, z, r, key = 'steel', seg = 22, r2 = r) { this._put(key, new THREE.CylinderGeometry(r2, r, y1 - y0, seg).rotateX(Math.PI / 2), x, (y0 + y1) / 2, z); return this; }
  /** engrenage d'axe y */
  gearY(x, z, y0, y1, r, teeth, key = 'steel', hole = 0) {
    const s = new THREE.Shape(), p = Math.PI * 2 / teeth, rr = r * .86;
    for (let i = 0; i < teeth; i++) {
      const a = i * p;
      for (const [da, rad] of [[-.28, rr], [-.14, r], [.14, r], [.28, rr]]) { const q = a + da * p; (i === 0 && da === -.28 ? s.moveTo : s.lineTo).call(s, Math.cos(q) * rad, Math.sin(q) * rad); }
    }
    s.closePath(); if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -(y1 - y0) / 2);
    this._put(key, g, x, (y0 + y1) / 2, z); return this;
  }
  /** courroie fermée entre deux poulies d'axe y (anneau en stade dans le plan x, z) */
  beltY(x1, z1, x2, z2, r, y0, y1, key = 'rubber', t = .9) {
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    const stadium = (R, path) => {
      path.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false); path.lineTo(-L, R); path.absarc(-L, 0, R, Math.PI / 2, 3 * Math.PI / 2, false); path.lineTo(0, -R);
    };
    const s = new THREE.Shape(); stadium(r + t, s); const h = new THREE.Path(); stadium(r, h); s.holes.push(h);
    const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 8 }); g.translate(L / 2, 0, -(y1 - y0) / 2);
    g.rotateZ(a); this._put(key, g, (x1 + x2) / 2 + 0 * dx, (y0 + y1) / 2, (z1 + z2) / 2 + 0 * dz); return this;
  }
  /** ressort hélicoïdal d'axe y */
  springY(x, z, y0, y1, r, turns, wire = .45, key = 'steelDk') {
    const pts = []; const n = Math.max(12, turns * 10);
    for (let i = 0; i <= n; i++) { const u = i / n, a = u * turns * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, y0 + (y1 - y0) * u)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 5, false);
    g.translate(0, 0, 0); // axe three z = y de figure ; on place l'origine en (x, ., z)
    g.translate(x - this.o[0], z - this.o[2], -this.o[1]); g.computeBoundingBox(); this.solids.push({ k: key, b: g.boundingBox.clone() }); let l = this.b.get(key); if (!l) this.b.set(key, l = []); l.push(g); this.count++; return this;
  }
  /** têtes de vis : petits cylindres posés sur une face ('z' dessus, 'y' devant, 'x' côté droit) */
  bolts(list, face = 'z', r = .9, key = 'steelDk') {
    for (const [x, y, z] of list) {
      const g = new THREE.CylinderGeometry(r, r, .7, 8);
      if (face === 'y') g.rotateX(Math.PI / 2); else if (face === 'x') g.rotateZ(Math.PI / 2);
      this._put(key, g, x, y, z);
    }
    return this;
  }
  /** pièce déjà construite (géométrie en repère de scène), ajoutée à un matériau */
  geo(key, g, x = 0, y = 0, z = 0) { this._put(key, g, x, y, z); return this; }
  /** objet à part (lampe, étiquette, feuille...) ajouté sans fusion */
  add(obj) { this.root.add(obj); this.count++; return obj; }
  done() {
    for (const [key, list] of this.b) {
      const m = new THREE.Mesh(mergeGeos(list), this.M[key]);
      m.castShadow = key !== 'glass'; m.receiveShadow = true; m.userData.noGlow = true; m.name = this.name + ':' + key; this.root.add(m);
      if (key === 'glass') m.renderOrder = 4;
    }
    this.b.clear(); return this.root;
  }
}

/** étiquette gravée : plan texturé (texte court, sans tiret cadratin ni point médian) */
const labelCache = new Map();
export function labelTexture(text, { w = 256, h = 64, fg = '#1d1f24', bg = '#d9d2bd', font = '700 30px ui-monospace,Menlo,Consolas,monospace' } = {}) {
  const k = text + fg + bg; if (labelCache.has(k)) return labelCache.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.globalAlpha = .55; x.lineWidth = 3; x.strokeRect(3, 3, w - 6, h - 6); x.globalAlpha = 1;
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = 30; while (x.measureText(text).width > w - 22 && size > 11) { size -= 2; x.font = font.replace('30px', size + 'px'); }
  x.fillText(text, w / 2, h / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; labelCache.set(k, t); return t;
}
/** face : 'y' (devant), 'x' (flanc droit), 'z' (dessus) */
export function label(text, x, y, z, w, h, face = 'y', opts) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: labelTexture(text, opts), roughness: .6, metalness: 0 }));
  if (face === 'z') m.rotation.x = -Math.PI / 2; else if (face === 'x') m.rotation.y = Math.PI / 2;
  m.position.set(x, z, y); m.userData.noGlow = true; return m;
}
/** voyant : petit cylindre émissif, intensité pilotée par l'animation */
export function lamp(x, y, z, r, color, face = 'y') {
  const mat = new THREE.MeshStandardMaterial({ color: '#2b2d33', emissive: color, emissiveIntensity: 0, roughness: .4, metalness: 0 });
  const g = new THREE.CylinderGeometry(r, r, 1.2, 14); if (face === 'y') g.rotateX(Math.PI / 2); else if (face === 'x') g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.set(x, z, y); m.userData.noGlow = true; m.userData.lamp = color; m.userData.base = '#2b2d33'; return m;
}
export const setLamp = (m, v) => { m.material.emissiveIntensity = v * 1.6; m.material.color.set(v > .05 ? m.userData.lamp : m.userData.base); if (v > .05) m.material.color.multiplyScalar(.5 + .5 * v); };

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
export const easeOut = (u) => { u = clamp(u); return 1 - (1 - u) ** 3; };
export const easeIn = (u) => { u = clamp(u); return u * u * u; };
export const lerp = (a, b, u) => a + (b - a) * u;
export const at = (o, x, y, z) => { o.position.set(x, z, y); return o; };   // place un objet de la scène à un point de figure
