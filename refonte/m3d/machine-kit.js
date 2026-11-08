// Outils partagés par les nouvelles machines : canevas et textures, matériaux d'atelier, ressort d'axe z, prisme d'extrusion.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const tex = (c, aniso = 4) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
/** matériaux d'atelier ajoutés au jeu de base (makeMats) */
export function workshopMats(M) {
  const std = (color, roughness, metalness, o = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...o });
  Object.assign(M, {
    cast: std('#2c2e35', .55, .14), ivory: std('#efe6cf', .55, 0), bakelite: std('#2a211c', .4, .04), ink: std('#0f1013', .95, 0),
    red: std('#c8372d', .5, .05), alu: std('#c9ced6', .36, .3), blue: std('#2f6fb3', .5, .1), amber: std('#d79a2b', .45, .15), enamel: std('#e8e3d4', .45, .05)
  });
  return M;
}
/** ressort hélicoïdal d'axe z (figure) : tube le long d'une hélice, à ajouter avec Part.geo(key, géométrie, 0, 0, 0) */
export function springGeoZ(x, y, z0, z1, r, turns, wire = .4) {
  const pts = [], n = Math.max(16, turns * 12);
  for (let i = 0; i <= n; i++) { const u = i / n, a = u * turns * TAU; pts.push(new THREE.Vector3(x + Math.cos(a) * r, z0 + (z1 - z0) * u, y + Math.sin(a) * r)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 5, false);
}
/** prisme dont le profil est dans le plan x-z de la figure, étendu de y0 à y1 */
export function prismXZ(pts, y0, y1) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false }); g.translate(0, 0, y0); return g;
}
/** cadre rectangulaire plat (anneau) de largeur w, profondeur d, fente de bord t, épaisseur h, centré à l'origine, dans le plan x-y de la figure */
export function ringGeo(w, d, t, h) {
  const s = new THREE.Shape(), a = w / 2, b = d / 2; s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, b); s.lineTo(-a, b); s.closePath();
  const hole = new THREE.Path(), ia = a - t, ib = b - t; hole.moveTo(-ia, -ib); hole.lineTo(-ia, ib); hole.lineTo(ia, ib); hole.lineTo(ia, -ib); hole.closePath(); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, -h / 2 + h / 2, 0); return g;
}
/** engrenage d'axe x (figure) : roue dentée dans le plan y-z, épaisseur t, centrée à l'origine */
export function gearXGeo(r, teeth, t, hole = 0) {
  const s = new THREE.Shape(), p = TAU / teeth, rr = r * .86;
  for (let i = 0; i < teeth; i++) { const a = i * p; for (const [da, rad] of [[-.28, rr], [-.14, r], [.14, r], [.28, rr]]) { const q = a + da * p; (i === 0 && da === -.28 ? s.moveTo : s.lineTo).call(s, Math.cos(q) * rad, Math.sin(q) * rad); } }
  s.closePath(); if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -t / 2); g.rotateY(Math.PI / 2); return g;   // plan (y fig, z fig) -> scène (z, y) : dents dans le plan y-z
}
