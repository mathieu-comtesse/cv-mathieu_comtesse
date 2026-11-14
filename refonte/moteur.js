/* Moteur du chemin 3D (mode expo) et des constellations. Code original de ce dépôt, sans dépendance externe.
 *
 * Interfaces (toutes indépendantes les unes des autres, pour pouvoir être remplacées une à une) :
 *   - projection : cvAnchor, cvView, p, cvUnproject, cvSlab          (monde du chemin vers écran, et retour)
 *   - cadres     : cvRaise                                           (relevé animé d'un cadre, de 0 à 1)
 *   - titres     : cvFont, cvTextLayout, cvTextExtrude               (lettres en volume, à partir de n'importe quelle police de la page)
 *   - ciel       : Ciel                                              (étoiles : foyer, libellé, branches, vignettes ; même code à plat et en 3D)
 *   - tracés     : dessineContours, dessineRegles                    (arêtes des cadres, règles graduées du sol)
 *
 * Repère du chemin : (colonne, rangée, hauteur) en pixels CSS de la page. La rangée 0 est au fond, la rangée T au premier plan.
 * Le sol est plat près de l'observateur et se redresse au loin suivant une courbe exponentielle ; les constantes de caméra
 * ont été calées sur des relevés à 1440 × 900, 1920 × 1080, 2560 × 1440 et 390 × 844. */

export const L = { tilt: { angle: 55 }, city: 0.005, cityGrow: 4, layers: { graph: { heroLift: 0.1, spread: 0.17 } } };
const PAS = 64, PROCHE = 40;

export const cvAnchor = (H) => ({ row: 2.298 * H });

/* Vue : profil du sol (65 points, 65 angles) et caméra.
 * `progress` va de 0 (vue à plat : caméra à la verticale, à la distance où un pixel du chemin vaut un pixel d'écran, sol plan,
 * hauteurs nulles : l'image coïncide avec la page) à 1 (vue expo). Entre les deux, la caméra tourne autour du point visé :
 * la bascule entre les deux modes est une vraie transformation de la scène, réversible à tout instant. */
const RISE_AT = 0.35;   // « riseAt » relevé dans la configuration de la scène de la référence (usage lu dans son bundle : hauteurs = lissage de (progression − riseAt) / (1 − riseAt))
export function cvView(progress, W, H, lead = 0) {
  const e = Math.max(0, Math.min(1, progress)), T = 5 * H, ds = T / PAS, pts = new Float32Array(2 * (PAS + 1)), ang = new Float32Array(PAS + 1);
  for (let i = 0; i <= PAS; i++) ang[i] = e * 1.44 * Math.exp(7.33 * (i / PAS - 1));
  for (let i = 0; i < PAS; i++) { const th = (ang[i] + ang[i + 1]) / 2; pts[2 * i + 2] = pts[2 * i] + ds * Math.sin(th); pts[2 * i + 3] = pts[2 * i + 1] - ds * Math.cos(th); }
  const focusRow = lead + H / 2, fov = Math.PI / 4, a = Math.PI / 2 + (0.52709 - Math.PI / 2) * e, d = (0.5 / Math.tan(fov / 2) + (2.018 - 0.5 / Math.tan(fov / 2)) * e) * H, vise = -(T - focusRow) - 0.041 * H * e;
  const montee = Math.max(0, Math.min(1, (e - RISE_AT) / (1 - RISE_AT))), rise = montee * montee * (3 - 2 * montee);   // les hauteurs ne montent qu'une fois la caméra engagée ; courbe de lissage déduite, non lue
  return { W, H, T, ds, pts, ang, e, rise, focusRow, fov, camY: d * Math.sin(a), camZ: vise + d * Math.cos(a), pitch: -a };
}

/* point du monde (x, y, z) pour une position du chemin */
export function monde(view, col, row, h = 0) {
  const a = (view.T - row) / view.ds;
  if (a <= 0) return [col - view.W / 2, h * view.rise, -a * view.ds];          // en deçà du premier plan : le sol continue à plat
  const b = Math.min(a, PAS), i = Math.min(Math.floor(b), PAS - 1), f = b - i, th = view.ang[i] + (view.ang[i + 1] - view.ang[i]) * f, hh = h * view.rise;
  return [col - view.W / 2, view.pts[2 * i] + (view.pts[2 * i + 2] - view.pts[2 * i]) * f + hh * Math.cos(th), view.pts[2 * i + 1] + (view.pts[2 * i + 3] - view.pts[2 * i + 1]) * f + hh * Math.sin(th)];
}

/* projection à l'écran : { x, y, z } (z : distance à la caméra), ou null derrière la caméra */
export function p(view, col, row, h = 0) {
  const [X, Y, Z] = monde(view, col, row, h), dy = Y - view.camY, dz = Z - view.camZ, c = Math.cos(view.pitch), s = Math.sin(view.pitch);
  const y = dy * c + dz * s, d = dy * s - dz * c;
  if (!(d > PROCHE)) return null;
  const f = view.H / 2 / Math.tan(view.fov / 2);
  return { x: view.W / 2 + X / d * f, y: view.H / 2 - y / d * f, z: d };
}

/* position du chemin (colonne, rangée) vue sous le point d'écran (cx, cy), à la hauteur h ; recherche par itérations depuis `depart` */
export function cvUnproject(view, cx, cy, h = 0, depart = [view.W / 2, view.focusRow]) {
  let col = depart[0], row = depart[1];
  for (let k = 0; k < 24; k++) {
    const a = p(view, col, row, h), b = p(view, col + 1, row, h), c = p(view, col, row + 1, h);
    if (!a || !b || !c) return null;
    const j11 = b.x - a.x, j21 = b.y - a.y, j12 = c.x - a.x, j22 = c.y - a.y, det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-9) return null;
    const ex = cx - a.x, ey = cy - a.y, dc = (ex * j22 - ey * j12) / det, dr = (ey * j11 - ex * j21) / det;
    col += dc; row += Math.max(-view.H, Math.min(view.H, dr));
    if (Math.abs(dc) + Math.abs(dr) < 0.01) break;
  }
  return [col, row];
}

/* Cadre épais articulé sur son bord bas (rangée r1, hauteur `base`) et incliné de slab.tilt.
 * Renvoie la position du chemin d'un point de sa face avant, à la distance d du bord bas. */
export function cvSlab(view, slab, r1, base, x, d) {
  const c = Math.cos(slab.tilt), s = Math.sin(slab.tilt);
  return [x, r1 - d * c + slab.depth * s, base + d * s + slab.depth * c];
}

/* Relevé des cadres : un seul cadre relevé à la fois ; chaque cadre va de 0 (posé) à 1 (incliné) avec un amorti. */
export class cvRaise {
  constructor(reduit) { this.reduit = reduit; this.etats = new Map(); this.carte = null; }
  raise(el) { this.carte = el || null; if (el && !this.etats.has(el)) this.etats.set(el, { v: 0, w: 0 }); }
  tiltOf(el) { return this.etats.get(el)?.v || 0; }
  risen() { return this.carte ? { card: this.carte } : null; }
  view() {}
  step() {                                                                   // horloge propre : le relevé dure le même temps quelle que soit la cadence d'images
    const t = performance.now(), ecoule = Math.min(0.25, (t - (this.t0 || t)) / 1000); this.t0 = t;
    for (let reste = ecoule; reste > 1e-4; reste -= 1 / 120) this.pas(Math.min(1 / 120, reste));
  }
  pas(dt) {
    for (const [el, e] of this.etats) {
      const cible = el === this.carte ? 1 : 0;
      if (this.reduit?.matches) { e.v = cible; e.w = 0; }
      else { e.w += ((cible - e.v) * 120 - e.w * 17) * dt; e.v = Math.max(0, Math.min(1.04, e.v + e.w * dt)); }   // ressort légèrement sous-amorti
      if (cible === 0 && e.v < 0.001 && Math.abs(e.w) < 0.01) this.etats.delete(el);
    }
  }
  clear() { this.etats.clear(); this.carte = null; }
}

/* ---------- Titres en volume ----------
 * Le texte est tracé dans un canevas avec la police de la page, puis son contour est relevé (carrés mobiles) et extrudé.
 * Aucune police n'est lue ni embarquée : toute police chargée par la page convient. */
const CORPS = 120;
let mesureur = null;
const ctxMesure = (font) => { mesureur ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true }); mesureur.font = `${font.weight} ${CORPS}px ${font.family}`; return mesureur; };

export function cvFont(family = 'Inter, ui-sans-serif, system-ui, sans-serif', weight = 500) {
  const font = { family, weight, ascent: 0.97 }, m = ctxMesure(font).measureText('Hg');
  if (m.fontBoundingBoxAscent) font.ascent = m.fontBoundingBoxAscent / CORPS;
  return font;
}

export function cvTextLayout(font, texte, { maxWidth = Infinity, lineHeight = 1.1 } = {}) {
  const c = ctxMesure(font), mots = texte.split(/\s+/).filter(Boolean), lignes = [];
  let ligne = '';
  for (const m of mots) { const essai = ligne ? ligne + ' ' + m : m; if (ligne && c.measureText(essai).width / CORPS > maxWidth) { lignes.push(ligne); ligne = m; } else ligne = essai; }
  if (ligne) lignes.push(ligne);
  const marge = 8, larg = Math.ceil(Math.max(1, ...lignes.map((l) => c.measureText(l).width))) + 2 * marge, haut = Math.ceil(CORPS * (lineHeight * (lignes.length - 1) + 1.45)) + 2 * marge;
  const cv = document.createElement('canvas'); cv.width = larg; cv.height = haut;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.font = c.font; g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
  const base0 = marge + CORPS * 1.08;                                   // ligne de base de la première ligne, en pixels du canevas
  lignes.forEach((l, k) => g.fillText(l, marge, base0 + k * lineHeight * CORPS));
  const baseDerniere = base0 + (lignes.length - 1) * lineHeight * CORPS;
  const boucles = contours(g.getImageData(0, 0, larg, haut)).map((b) => b.map(([x, y]) => [(x - marge) / CORPS, (baseDerniere - y) / CORPS]));   // en cadratins, y vers le haut, ligne de base de la dernière ligne à 0
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const b of boucles) for (const [x, y] of b) { bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x); bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y); }
  if (!boucles.length) Object.assign(bounds, { minX: 0, maxX: 0, minY: 0, maxY: 0 });
  return { boucles, bounds, width: bounds.maxX - bounds.minX, lignes };
}

/* contours fermés du masque alpha (seuil 50 %, interpolé), simplifiés */
function contours(img) {
  const W = img.width, H = img.height, a = img.data, f = (i, j) => a[(j * W + i) * 4 + 3] / 255 - 0.5;
  const liens = new Map(), pos = new Map(), lie = (k1, k2) => { (liens.get(k1) || liens.set(k1, []).get(k1)).push(k2); (liens.get(k2) || liens.set(k2, []).get(k2)).push(k1); };
  const cle = (i, j, v) => (j * W + i) * 2 + v;
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const A = f(i, j), B = f(i + 1, j), C = f(i + 1, j + 1), D = f(i, j + 1), cas = (A > 0 ? 8 : 0) | (B > 0 ? 4 : 0) | (C > 0 ? 2 : 0) | (D > 0 ? 1 : 0);
    if (cas === 0 || cas === 15) continue;
    const haut = () => { const k = cle(i, j, 0); pos.has(k) || pos.set(k, [i + A / (A - B), j]); return k; };
    const bas = () => { const k = cle(i, j + 1, 0); pos.has(k) || pos.set(k, [i + D / (D - C), j + 1]); return k; };
    const gauche = () => { const k = cle(i, j, 1); pos.has(k) || pos.set(k, [i, j + A / (A - D)]); return k; };
    const droite = () => { const k = cle(i + 1, j, 1); pos.has(k) || pos.set(k, [i + 1, j + B / (B - C)]); return k; };
    switch (cas) {
      case 1: case 14: lie(gauche(), bas()); break;
      case 2: case 13: lie(bas(), droite()); break;
      case 3: case 12: lie(gauche(), droite()); break;
      case 4: case 11: lie(haut(), droite()); break;
      case 6: case 9: lie(haut(), bas()); break;
      case 7: case 8: lie(haut(), gauche()); break;
      case 5: lie(haut(), gauche()); lie(bas(), droite()); break;
      case 10: lie(haut(), droite()); lie(gauche(), bas()); break;
    }
  }
  const vus = new Set(), boucles = [];
  for (const depart of liens.keys()) {
    if (vus.has(depart)) continue;
    const b = []; let k = depart, avant = -1;
    while (k !== undefined && !vus.has(k)) { vus.add(k); b.push(pos.get(k)); const v = liens.get(k), suivant = v[0] !== avant && !vus.has(v[0]) ? v[0] : v.find((x) => x !== avant && !vus.has(x)); avant = k; k = suivant; }
    if (b.length >= 6) { const s = simplifie(b, 0.3); if (s.length >= 3) boucles.push(s); }
  }
  return boucles;
}
function simplifie(pts, tol) {
  const garde = new Uint8Array(pts.length), pile = [[0, pts.length - 1]]; garde[0] = garde[pts.length - 1] = 1;
  while (pile.length) {
    const [a, b] = pile.pop(); let max = 0, im = -1; const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / n; if (d > max) { max = d; im = i; } }
    if (max > tol) { garde[im] = 1; pile.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => garde[i]);
}
const aire = (b) => { let s = 0; for (let i = 0; i < b.length; i++) { const [x1, y1] = b[i], [x2, y2] = b[(i + 1) % b.length]; s += x1 * y2 - x2 * y1; } return s / 2; };
const dedans = (b, [x, y]) => { let c = false; for (let i = 0, j = b.length - 1; i < b.length; j = i++) { const [xi, yi] = b[i], [xj, yj] = b[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };

/* Extrusion : sommets (x, y, z, nx, ny, nz), z de 0 (dos) à `depth` (face). T est le module three de la page (triangulation). */
export function cvTextExtrude(layout, { depth = 1, T }) {
  const B = layout.boucles, niveau = B.map((b, i) => B.reduce((n, o, j) => n + (j !== i && dedans(o, b[0]) ? 1 : 0), 0)), out = [];
  const pousse = (x, y, z, nx, ny, nz) => out.push(x, y, z, nx, ny, nz);
  B.forEach((b, i) => {
    if (niveau[i] % 2) return;                                             // les trous sont rattachés à leur contour
    const trous = B.filter((o, j) => niveau[j] === niveau[i] + 1 && dedans(b, o[0])), V = (l) => l.map(([x, y]) => new T.Vector2(x, y));
    const tous = [b, ...trous].flat(), tri = T.ShapeUtils.triangulateShape(V(b), trous.map(V));
    for (const [a, c, d] of tri) {
      for (const k of [a, c, d]) pousse(tous[k][0], tous[k][1], depth, 0, 0, 1);
      for (const k of [a, d, c]) pousse(tous[k][0], tous[k][1], 0, 0, 0, -1);
    }
  });
  for (const b of B) {
    const sens = aire(b) > 0 ? 1 : -1;
    for (let i = 0; i < b.length; i++) {
      const [x1, y1] = b[i], [x2, y2] = b[(i + 1) % b.length], l = Math.hypot(x2 - x1, y2 - y1) || 1, nx = (y2 - y1) / l * sens, ny = -(x2 - x1) / l * sens;
      pousse(x1, y1, 0, nx, ny, 0); pousse(x2, y2, 0, nx, ny, 0); pousse(x2, y2, depth, nx, ny, 0);
      pousse(x1, y1, 0, nx, ny, 0); pousse(x2, y2, depth, nx, ny, 0); pousse(x1, y1, depth, nx, ny, 0);
    }
  }
  return { vertices: new Float32Array(out) };
}

/* ---------- Ciel : constellations ----------
 * Une étoile = un foyer (carré blanc), un libellé près du foyer, des branches éditoriales (une par vrai contenu, terminée par une
 * vignette cliquable) et des branches graphiques (points et ramifications tirés du nom, sans contenu associé, non interactives).
 * Toutes les positions sont dans le repère fourni par `proj` : le chemin 3D en mode expo, le plan de la page en mode à plat.
 * Les étoiles bougent donc avec la caméra, sans calque HTML superposé. */
const hache = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); return h >>> 0; };
const alea = (g) => () => { g |= 0; g = g + 0x6D2B79F5 | 0; let t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const adouci = (x) => { x = Math.max(0, Math.min(1, x)); return 1 - (1 - x) ** 3; };
const OR = 2.399963;

export class Ciel {
  constructor() { this.etoiles = new Map(); this.images = new Map(); this.cibles = []; this.survol = null; this.pris = null; }
  vide() { this.etoiles.clear(); this.cibles = []; this.survol = null; }
  image(url) {
    if (!url) return null;
    let im = this.images.get(url); if (!im) { im = new Image(); im.decoding = 'async'; im.src = url; this.images.set(url, im); }
    return im.complete && im.naturalWidth ? im : null;
  }
  /* spec : { groupe, label, num, chapitre, editoriaux:[{title,handle,image}], parent, racine, sol, petit } */
  definit(id, spec) {
    const rd = alea(hache(id + '|' + (spec.label || ''))), ed = spec.editoriaux || [], noeuds = [];
    const eventail = (k, n) => spec.parent || spec.racine ? rd() * 6.283 : -2.5 + (k + 0.5) / n * 3.3 + (rd() - 0.5) * 0.3;     // titres : éventail ouvert vers le haut et la droite
    ed.forEach((e, k) => noeuds.push({ ed: e, a: spec.parent ? k / ed.length * 6.283 + rd() * 0.5 : eventail(k, ed.length), r: 0.62 + rd() * 0.38, dh: (rd() - 0.3) * 0.5, phase: rd() * 6.283, sous: [] }));
    const dens = typeof innerWidth !== 'undefined' && innerWidth < 520 ? 0.5 : 1;   // moins de branches sur petit écran
    const nDeco = Math.round(dens * (spec.racine ? 120 : spec.parent ? 20 + Math.floor(rd() * 10) : spec.petit ? 24 + Math.floor(rd() * 10) : 38 + Math.floor(rd() * 14)));
    for (let k = 0; k < nDeco; k++) {
      const n = { a: eventail(k, nDeco) + (spec.parent || spec.racine ? 0 : rd() * 1.2), r: spec.racine ? 0.12 + Math.sqrt(rd()) * 1.05 : 0.3 + 0.9 * rd() ** 1.3, dh: (rd() - 0.4) * (spec.racine ? 1.6 : 0.6), phase: rd() * 6.283, taille: 1.0 + rd() ** 2 * 2.6, sous: [] };
      if (!spec.racine && rd() < 0.45) for (let q = 0, m = 1 + Math.floor(rd() * 3); q < m; q++) n.sous.push({ a: n.a + (rd() - 0.5) * 1.6, r: 0.12 + rd() * 0.2 });   // ramifications secondaires
      noeuds.push(n);
    }
    const freres = [...this.etoiles.values()].filter((e) => e.parent === spec.parent && spec.parent).length;
    this.etoiles.set(id, { id, ...spec, noeuds, rang: freres, centre: null, rayon: 0, age: -1, ecran: null });
  }
  /* centre : [colonne, rangée, hauteur] dans le repère de `proj`, ou null pour masquer ; rayon dans les mêmes unités */
  place(id, centre, rayon) {
    const e = this.etoiles.get(id); if (!e) return;
    e.centre = centre; if (rayon) e.rayon = rayon;
    if (!centre) return;
    const enfants = [...this.etoiles.values()].filter((x) => x.parent === id), n = enfants.length;
    for (const x of enfants) {                                                   // spirale régulière : les foyers enfants couvrent le disque sans se chevaucher
      const k = x.rang, rr = rayon * (0.3 + 0.66 * Math.sqrt((k + 0.6) / n)), a = k * OR + 0.6;
      x.centre = [centre[0] + Math.cos(a) * rr * (e.etire || 1), centre[1] + Math.sin(a) * rr * 0.78, centre[2] * (0.75 + 0.5 * ((k * 7) % 5) / 4)];
      x.rayon = rayon * 0.3;
    }
  }
  compte(groupe) { let total = 0, editoriaux = 0; for (const e of this.etoiles.values()) if (e.groupe === groupe) { total += e.noeuds.length + 1; editoriaux += e.noeuds.filter((n) => n.ed).length; } return { total, editoriaux }; }
  etat(groupe) { return [...this.etoiles.values()].filter((e) => e.groupe === groupe).map((e) => ({ id: e.id, name: e.label, branches: e.noeuds.filter((n) => n.ed).length, points: e.noeuds.filter((n) => !n.ed).length, visible: !!e.ecran, foyer: e.ecran && [Math.round(e.ecran.x), Math.round(e.ecran.y)], libelle: e.libelleEcran || null })); }
  ecran(groupe) { return this.cibles.filter((c) => c.etoile.groupe === groupe).map((c, index) => ({ index, point: [c.x, c.y], node: c.noeud.ed })); }
  libelles() { return [...this.etoiles.values()].filter((e) => e.ecran && e.label).map((e) => e.label); }
  /* vignette éditoriale sous le pointeur (positions de la dernière image dessinée) */
  /* Saisie : un nœud éditorial se prend, se déplace et revient à sa place quand on le lâche (ressort).
     lache() dit si le geste était un simple clic (moins de 5 px parcourus) et sur quel contenu. */
  saisit(x, y) { let m = null, dm = 22; for (const c of this.cibles) { const d = Math.hypot(c.x - x, c.y - y); if (d < dm) { dm = d; m = c; } } if (!m) return false; this.pris = { noeud: m.noeud, etoile: m.etoile, x0: x, y0: y, trajet: 0 }; return true; }
  tire(x, y) { if (this.pris) this.pris.trajet = Math.max(this.pris.trajet, Math.hypot(x - this.pris.x0, y - this.pris.y0)); }
  lache() { const q = this.pris; this.pris = null; return q ? { clic: q.trajet < 5, ...q.noeud.ed, chapitre: q.etoile.chapitre } : null; }
  touche(x, y) { let m = null, dm = 18; for (const c of this.cibles) { const d = Math.hypot(c.x - x, c.y - y); if (d < dm) { dm = d; m = c; } } return m ? { ...m.noeud.ed, chapitre: m.etoile.chapitre } : null; }

  dessine(ctx, proj, t, { covers = [], souris = { x: -1e4, y: -1e4 }, W = innerWidth, H = innerHeight, dt = 1 / 60, alpha = 1, compact = false } = {}) {
    if (alpha <= 0.003) { this.cibles = []; this.survol = null; return; }
    const A = Math.min(1, alpha), retour = Math.exp(-dt * 9);
    const libre = t !== null, tt = t || 0, cibles = [], cache = (x, y, z) => covers.some((c) => c.z < z - 30 && dansQuad(c.pts, x, y));
    const quads = covers.map((pts) => ({ pts, z: pts.reduce((s, q) => s + q.z, 0) / 4 }));
    covers = quads;
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = A;
    let survol = null, dSurvol = 18;
    for (const e of this.etoiles.values()) {
      e.ecran = null; e.libelleEcran = null;
      if (!e.centre) { e.age = -1; continue; }
      const [c0, r0, h0] = e.centre, F = proj(c0, r0, h0), u = F && proj(c0 + 100, r0, h0);
      if (!F || !u) continue;
      const k = Math.abs(u.x - F.x) / 100;                                       // pixels d'écran par unité, au foyer
      if (F.x < -e.rayon * k - 80 || F.x > W + e.rayon * k + 80 || F.y < -e.rayon * k - 80 || F.y > H + e.rayon * k + 80) { continue; }
      if (e.age < 0) e.age = 0; e.age += libre ? dt : 10;
      e.ecran = F;
      const ech = Math.max(0.55, Math.min(1.5, k)), R = e.rayon;
      /* trace au sol : cercle et tige (étoiles posées) */
      if (e.sol) {
        ctx.strokeStyle = 'rgba(190,210,255,.42)'; ctx.lineWidth = 1; ctx.beginPath(); let ouvert = false;
        for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283, q = proj(c0 + Math.cos(a) * R * 0.62, r0 + Math.sin(a) * R * 0.62, 0); if (!q) { ouvert = false; continue; } ouvert ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); ouvert = true; }
        ctx.stroke();
        const pied = proj(c0, r0, 0); if (pied) { ctx.strokeStyle = 'rgba(150,200,255,.5)'; ctx.beginPath(); ctx.moveTo(pied.x, pied.y); ctx.lineTo(F.x, F.y); ctx.stroke(); }
      }
      /* liaison avec le foyer parent */
      const parent = e.parent && this.etoiles.get(e.parent);
      if (parent?.ecran) { const g = adouci(e.age / 0.9); ctx.strokeStyle = 'rgba(200,215,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(parent.ecran.x, parent.ecran.y); ctx.lineTo(parent.ecran.x + (F.x - parent.ecran.x) * g, parent.ecran.y + (F.y - parent.ecran.y) * g); ctx.stroke(); }
      e.noeuds.forEach((n, j) => {
        const g = adouci((e.age - 0.15 - j * (e.racine ? 0.012 : 0.04)) / 0.8); if (g <= 0) return;
        let wc = c0 + Math.cos(n.a) * R * n.r, wr = r0 + Math.sin(n.a) * R * n.r * 0.78, wh = Math.max(0, h0 + n.dh * R * 0.45);
        if (libre) { wc += Math.sin(tt * 0.4 + n.phase) * R * 0.02; wr += Math.cos(tt * 0.33 + n.phase * 1.7) * R * 0.018; }
        const P = proj(wc, wr, wh); if (!P) return;
        let x = P.x, y = P.y;
        if (libre) { const dx = x - souris.x, dy = y - souris.y, d = Math.hypot(dx, dy); if (d < 150 && d > 1) { const q = (1 - d / 150) * 18 / d * (n.ed ? Math.min(1, d / 60) ** 2 : 1); x += dx * q; y += dy * q; } }   // une vignette ne fuit pas le pointeur qui vient la prendre
        x = F.x + (x - F.x) * g; y = F.y + (y - F.y) * g;
        if (this.pris && this.pris.noeud === n) { n.ox = souris.x - x; n.oy = souris.y - y; } else if (n.ox || n.oy) { n.ox *= retour; n.oy *= retour; if (Math.abs(n.ox) + Math.abs(n.oy) < 0.3) n.ox = n.oy = 0; }
        if (n.ox || n.oy) { x += n.ox; y += n.oy; }
        const voile = cache(x, y, P.z) ? 0.12 : 1, actif = this.survol && this.survol.noeud === n;
        ctx.globalAlpha = voile * A;
        ctx.strokeStyle = n.ed ? (actif ? '#fff' : j < 2 ? 'rgba(95,230,255,.95)' : 'rgba(255,255,255,.78)') : e.racine ? 'rgba(190,210,255,.3)' : 'rgba(225,238,255,.72)';
        ctx.lineWidth = actif ? 2 : 1; ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.moveTo(F.x, F.y); ctx.lineTo(x, y); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
        if (n.ed && libre && g >= 1) {                                           // impulsion lumineuse le long de la branche
          const q = (tt * 0.3 + n.phase / 6.283) % 1, f = Math.min(1, q / 0.75), a = q < 0.75 ? 1 : (1 - q) * 4;
          ctx.fillStyle = `rgba(255,255,255,${(0.95 * a).toFixed(2)})`; ctx.beginPath(); ctx.arc(F.x + (x - F.x) * f, F.y + (y - F.y) * f, 1.7, 0, 6.283); ctx.fill();
        }
        for (const s of n.sous) {                                                // ramifications : petites branches au bout d'une branche graphique
          const Q = proj(wc + Math.cos(s.a) * R * s.r, wr + Math.sin(s.a) * R * s.r * 0.78, wh); if (!Q) continue;
          const qx = x + (Q.x - P.x) * g, qy = y + (Q.y - P.y) * g;
          ctx.strokeStyle = 'rgba(225,238,255,.5)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(qx, qy); ctx.stroke();
          ctx.fillStyle = 'rgba(223,233,255,.8)'; ctx.beginPath(); ctx.arc(qx, qy, 1.2, 0, 6.283); ctx.fill();
        }
        if (n.ed) {
          const kv = 0.72 + (n.phase / 6.283) * 0.8, im = this.image(n.ed.image), w = (im ? 30 : 18) * kv * ech * (compact ? 0.62 : 1), h = (im ? 21 : 14) * kv * ech * (compact ? 0.62 : 1);
          if (im) { ctx.drawImage(im, x - w / 2, y - h / 2, w, h); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h / 2, w, h); }
          else { ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h / 2, w, h); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x - w / 3, y - h * 0.29, w * 2 / 3, h * 0.58); }
          if (voile === 1) { cibles.push({ x, y, noeud: n, etoile: e }); const d = Math.hypot(x - souris.x, y - souris.y); if (d < dSurvol) { dSurvol = d; survol = { noeud: n, x, y }; } }
        } else { ctx.fillStyle = e.racine ? 'rgba(200,215,255,.55)' : 'rgba(223,233,255,.9)'; ctx.beginPath(); ctx.arc(x, y, (n.taille || 1.6) * (e.racine ? 0.8 : 1) * Math.min(1.2, ech), 0, 6.283); ctx.fill(); }
        ctx.globalAlpha = A;
      });
      /* foyer et libellé */
      { const halo = Math.max(16, Math.min(70, (e.racine ? 0.2 : 0.17) * R * k)), gr = ctx.createRadialGradient(F.x, F.y, 0, F.x, F.y, halo); gr.addColorStop(0, 'rgba(210,240,255,.55)'); gr.addColorStop(0.35, 'rgba(120,190,255,.22)'); gr.addColorStop(1, 'rgba(80,140,255,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(F.x, F.y, halo, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      const cote = (e.racine ? 9 : e.parent ? 7 : 9) * Math.min(1.25, Math.max(0.8, ech));
      ctx.fillStyle = '#fff'; ctx.fillRect(F.x - cote / 2, F.y - cote / 2, cote, cote);
      if (e.label && !e.racine) {
        const a = adouci((e.age - 0.2) / 0.6);
        ctx.globalAlpha = a * A; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,10,90,.55)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        if (e.sol) {                                                             // étoile posée : numéro et nom sous le cercle
          const bas = proj(c0, r0 + R * 0.7, 0) || F, texte = compact ? (e.num || '') : (e.num ? e.num + ' ' : '') + e.label;
          ctx.font = `500 ${Math.round(Math.max(9, Math.min(13, 11 * ech)))}px "JetBrains Mono",ui-monospace,monospace`; ctx.textAlign = 'center'; ctx.strokeText(texte, bas.x, bas.y + 12); ctx.fillText(texte, bas.x, bas.y + 12);
          e.libelleEcran = { x: Math.round(bas.x), y: Math.round(bas.y + 12), texte };
        } else {                                                                 // étoile de titre : petit libellé contre le foyer
          ctx.font = `500 ${Math.round(Math.max(11, Math.min(15, 13 * ech)))}px Inter,ui-sans-serif,system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.strokeText(e.label, F.x + cote / 2 + 7, F.y + 4.5); ctx.fillText(e.label, F.x + cote / 2 + 7, F.y + 4.5);
          e.libelleEcran = { x: Math.round(F.x + cote / 2 + 7), y: Math.round(F.y + 4.5), texte: e.label };
        }
        ctx.globalAlpha = A;
      }
    }
    this.cibles = cibles; this.survol = survol;
    if (survol) {                                                                // nom du contenu survolé
      const texte = (survol.noeud.ed.title || '').slice(0, 60);
      ctx.font = '500 11px "JetBrains Mono",ui-monospace,monospace'; ctx.textAlign = survol.x > W - 260 ? 'right' : 'left'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,10,90,.7)'; ctx.fillStyle = '#fff';
      const dx = survol.x > W - 260 ? -18 : 18; ctx.strokeText(texte, survol.x + dx, survol.y + 4); ctx.fillText(texte, survol.x + dx, survol.y + 4);
    }
    ctx.restore();
  }
}
function dansQuad(q, x, y) { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const a = q[i], b = q[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }

/* ---------- Arêtes et ombres des cadres ---------- */
/* `souris` (optionnel) : le cadre sous le pointeur est rehaussé (contour épais, repères d'angle) ; un cadre relevé porte un reflet
   de verre, bande claire oblique qui glisse avec la position horizontale du pointeur. Renvoie le cadre survolé. */
export function dessineContours(ctx, view, boxes, souris = null) {
  let survole = null;
  ctx.save(); ctx.lineJoin = 'round';
  const dessus = (b) => [[b.x0, b.r0], [b.x1, b.r0], [b.x1, b.r1], [b.x0, b.r1]].map(([x, r]) => b.slab ? p(view, ...cvSlab(view, b.slab, b.r1, b.base, x, b.r1 - r)) : p(view, x, r, b.top));
  const ordre = [...boxes].sort((a, c) => a.r1 - c.r1);                        // du fond vers l'observateur
  for (const [rang, b] of ordre.entries()) {
    /* les flancs d'un bloc passent derrière le dessus des blocs plus proches (leur contenu est du DOM, sous ce canevas) */
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, view.W, view.H);
    for (const n of ordre.slice(rang + 1)) { const q = dessus(n); if (q.every(Boolean)) { ctx.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y); ctx.closePath(); } }
    ctx.clip('evenodd');
    const coin = (x, row, epais) => b.slab ? p(view, ...cvSlab(view, { tilt: b.slab.tilt, depth: epais ? b.slab.depth : 0 }, b.r1, b.base, x, b.r1 - row)) : p(view, x, row, epais ? b.top : 0);
    const haut = [[b.x0, b.r0], [b.x1, b.r0], [b.x1, b.r1], [b.x0, b.r1]].map(([x, r]) => coin(x, r, true)), bas = [[b.x0, b.r0], [b.x1, b.r0], [b.x1, b.r1], [b.x0, b.r1]].map(([x, r]) => coin(x, r, false));
    if (!haut.every(Boolean) || !bas.every(Boolean)) continue;
    const trace = (pts) => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); };
    if (b.slab && b.tilted > 0.02) {                                             // ombre portée au sol d'un cadre relevé
      const ombre = [[b.x0, b.r0], [b.x1, b.r0], [b.x1, b.r1], [b.x0, b.r1]].map(([x, r]) => { const w = cvSlab(view, b.slab, b.r1, b.base, x, b.r1 - r); return p(view, w[0] + w[2] * 0.5, w[1] + w[2] * 0.35, 0); });
      if (ombre.every(Boolean)) { ctx.fillStyle = 'rgba(0,0,0,.22)'; trace(ombre); ctx.fill(); }
    }
    const plein = b.hero && !b.slab;                                           // blocs de l'accueil : flancs opaques, à la couleur du sol assombrie
    ctx.fillStyle = plein ? '#041795' : 'rgba(255,255,255,.07)'; trace([haut[1], haut[2], bas[2], bas[1]]); ctx.fill(); trace([haut[0], haut[3], bas[3], bas[0]]); ctx.fill();
    ctx.fillStyle = plein ? '#0a27c4' : 'rgba(255,255,255,.14)'; trace([haut[3], haut[2], bas[2], bas[3]]); ctx.fill();          // tranche avant
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.85; ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(haut[i].x, haut[i].y); ctx.lineTo(bas[i].x, bas[i].y); }
    ctx.moveTo(bas[3].x, bas[3].y); ctx.lineTo(bas[2].x, bas[2].y); ctx.lineTo(bas[1].x, bas[1].y); ctx.moveTo(bas[3].x, bas[3].y); ctx.lineTo(bas[0].x, bas[0].y); ctx.stroke();
    const dedansQuad = souris && dansQuad(haut, souris.x, souris.y);
    if (dedansQuad) survole = b;
    if (b.slab && b.tilted > 0.25 && !b.hero) {                                  // reflet de verre d'un cadre relevé
      const u = souris ? Math.max(0, Math.min(1, (souris.x - haut[0].x) / Math.max(1, haut[1].x - haut[0].x))) : 0.5, g = ctx.createLinearGradient(haut[0].x, haut[0].y, haut[2].x, haut[2].y), c = 0.2 + 0.6 * u, a = 0.13 * Math.min(1, (b.tilted - 0.25) * 2);
      g.addColorStop(Math.max(0, c - 0.22), 'rgba(255,255,255,0)'); g.addColorStop(c, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(Math.min(1, c + 0.05), `rgba(255,255,255,${(a * 0.25).toFixed(3)})`); g.addColorStop(Math.min(1, c + 0.3), 'rgba(255,255,255,0)');
      ctx.fillStyle = g; trace(haut); ctx.fill();
    }
    ctx.strokeStyle = dedansQuad ? '#fff' : 'rgba(255,255,255,.85)'; ctx.lineWidth = dedansQuad ? 1.8 : 1; trace(haut); ctx.stroke();
    if (dedansQuad) {                                                            // repères d'angle du cadre survolé
      ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i < 4; i++) { const q = haut[i], n = haut[(i + 1) % 4], m = haut[(i + 3) % 4], l1 = Math.hypot(n.x - q.x, n.y - q.y) || 1, l2 = Math.hypot(m.x - q.x, m.y - q.y) || 1, k = 12;
        ctx.moveTo(q.x - (n.x - q.x) / l1 * k, q.y - (n.y - q.y) / l1 * k); ctx.lineTo(q.x, q.y); ctx.lineTo(q.x - (m.x - q.x) / l2 * k, q.y - (m.y - q.y) / l2 * k); }
      ctx.stroke();
    }
    if (b.title && b.tilted > 0.5) {                                             // cadre relevé : son nom et ses cotes au-dessus du bord haut
      ctx.globalAlpha = Math.min(1, (b.tilted - 0.5) * 2); ctx.font = '500 10px "JetBrains Mono",ui-monospace,monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText(b.title.slice(0, 48), haut[0].x, haut[0].y - 8); ctx.textAlign = 'right'; ctx.fillText(Math.round(b.x1 - b.x0) + ' × ' + Math.round(b.r1 - b.r0), haut[1].x, haut[1].y - 8); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  ctx.restore();
  return survole;
}

/* ---------- Règles graduées des deux bords du sol : une graduation tous les 100 px de page, chiffrée tous les 500, et le nom de chaque chapitre ---------- */
export function dessineRegles(ctx, view, chapitres) {
  ctx.save(); ctx.font = '500 10px "JetBrains Mono",ui-monospace,monospace'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 0.85; ctx.textBaseline = 'middle';
  const debut = Math.max(view.doc ? view.doc[0] : 0, 0), fin = Math.min(view.doc ? view.doc[1] : view.T, view.T), y0 = Math.ceil((debut + view.offset) / 100) * 100;
  for (let y = y0; y - view.offset <= fin; y += 100) {
    const row = y - view.offset, gros = y % 500 === 0, l = gros ? 26 : 9;
    for (const cote of [-1, 1]) {
      const bord = cote < 0 ? 0 : view.W, a = p(view, bord, row, 0), b = p(view, bord + cote * l, row, 0);
      if (!a || !b || a.y < 0 || a.y > view.H) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (gros) { ctx.textAlign = cote < 0 ? 'right' : 'left'; ctx.fillText(String(y), b.x + cote * 5, b.y); }
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (const c of chapitres) for (const cote of [-1, 1]) {
    const a = p(view, cote < 0 ? -44 : view.W + 44, c.row, 0); if (!a || a.y < 10 || a.y > view.H - 10) continue;
    ctx.textAlign = cote < 0 ? 'right' : 'left'; ctx.fillText(c.name, a.x, a.y - 12);
  }
  ctx.restore();
}

/* ---------- Décor du fond en mode expo : courbe exponentielle numérotée, arcs concentriques, cube filaire ----------
 * Tout est posé dans le repère du chemin (colonne, rangée, hauteur) et projeté par `p` : ces éléments suivent la caméra comme le sol.
 * Les positions et proportions sont calées sur une comparaison à dimensions identiques avec la référence ; aucun élément n'est une image.
 * `t` : temps en secondes (0 en mouvement réduit : tout reste immobile). `numeros` : nombre de chapitres numérotés sur la courbe. */
const ARC_RAYONS = [0.42, 0.62, 0.84, 1.08, 1.34, 1.62];   // en largeurs de page
export function dessineDecor(ctx, view, { t = 0, numeros = 0, base = 0 } = {}) {
  const a = view.e * view.e; if (a < 0.01) return;
  const W = view.W, H = view.H, fois = Math.min(1.6, Math.max(0.6, W / 1512));
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* arcs concentriques sur le plan du sol, de part et d'autre de la bande ; un arc clair les balaie lentement */
  const cx = W * 0.5, cy = Math.max(0, view.doc ? 0 : 0) + 0;
  const trace = (r, d0, d1, pas) => { let on = false; ctx.beginPath(); for (let k = d0; k <= d1; k += pas) { const col = cx + Math.cos(k) * r * W, row = cy + Math.sin(k) * r * W; if (row < 0 || row > view.T) { on = false; continue; } const q = p(view, col, row, 0); if (!q) { on = false; continue; } if (on) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); on = true; } } ctx.stroke(); };
  ctx.lineWidth = 0.8 * fois; ctx.strokeStyle = `rgba(255,255,255,${0.085 * a})`;
  for (const r of ARC_RAYONS) trace(r, 0, Math.PI, 0.02);
  const glisse = ((t * 0.045) % 1), r0 = ARC_RAYONS[3] * W;   // arc clair : un tronçon qui parcourt l'anneau
  const dep = Math.PI * (0.05 + 0.35 * glisse), lon = 0.5;
  for (let s = 0; s < 6; s++) { ctx.lineWidth = (3.2 - s * 0.45) * fois; ctx.strokeStyle = `rgba(255,255,255,${(0.1 + s * 0.06) * a})`; trace(r0 / W, dep + s * lon / 6, dep + lon, 0.02); }
  /* courbe exponentielle posée sur le sol, et son cadre, à la rangée de base (page 1500) */
  if (base > 0 && base < view.T) {
    const g = (u) => (Math.exp(2.2 * u) - 1) / (Math.exp(2.2) - 1), haut = 0.2 * H;
    const A = p(view, 0, base, 0), B = p(view, W, base, 0);
    if (A && B) { ctx.lineWidth = 1 * fois; ctx.strokeStyle = `rgba(255,255,255,${0.55 * a})`; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); }
    ctx.lineWidth = 1 * fois; ctx.strokeStyle = `rgba(255,255,255,${0.7 * a})`; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const u = i / 80, q = p(view, W * u, base, haut * g(u)); if (!q) continue; if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); } ctx.stroke();
    ctx.font = `500 ${Math.round(8 * fois)}px "JetBrains Mono",ui-monospace,monospace`; ctx.textBaseline = 'top';
    for (let i = 0; i < numeros; i++) {
      const u = 0.5 + 0.34 * (numeros > 1 ? i / (numeros - 1) : 0), q = p(view, W * u, base, haut * g(u)); if (!q) continue;
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`; ctx.fillStyle = `rgba(20,40,170,${0.9 * a})`; ctx.beginPath(); ctx.ellipse(q.x, q.y, 4.2 * fois, 2.6 * fois, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.75 * a})`; ctx.textAlign = 'left'; ctx.fillText(String(i + 1).padStart(2, '0'), q.x + 4 * fois, q.y + 3 * fois);
    }
  }
  /* cube filaire (cube dans le cube, relié aux sommets), dans le noir à gauche de la bande, en rotation lente */
  if (view.cube) {
    const [c0, r0c, h0, S] = view.cube, rx = t * 0.21 + 0.55, ry = t * 0.17 + 0.4;
    const sommets = (k) => { const o = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) { let X = x * k, Y = y * k, Z = z * k; const c1 = Math.cos(rx), s1 = Math.sin(rx); [Y, Z] = [Y * c1 - Z * s1, Y * s1 + Z * c1]; const c2 = Math.cos(ry), s2 = Math.sin(ry); [X, Z] = [X * c2 + Z * s2, -X * s2 + Z * c2]; o.push([X, Y, Z]); } return o; };
    const arete = (i, j) => { let n = 0; for (let b = 0; b < 3; b++) n += ((i >> b) & 1) !== ((j >> b) & 1) ? 1 : 0; return n === 1; };
    const ext = sommets(1), int = sommets(0.5), proj = (v) => p(view, c0 + v[0] * S, r0c + v[2] * S, h0 + v[1] * S);
    const E = ext.map(proj), I = int.map(proj); ctx.lineWidth = 1 * fois; ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`; ctx.beginPath();
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (arete(i, j)) for (const L of [E, I]) if (L[i] && L[j]) { ctx.moveTo(L[i].x, L[i].y); ctx.lineTo(L[j].x, L[j].y); }
    for (let i = 0; i < 8; i++) if (E[i] && I[i]) { ctx.moveTo(E[i].x, E[i].y); ctx.lineTo(I[i].x, I[i].y); } ctx.stroke();
  }
  ctx.restore();
}

/* Éclairage du sol : à plat la couleur de la page est inchangée ; en expo le sol est éclairé et devient plus clair.
 * Modèle : gain d'exposition en lumière linéaire (1 à plat, GAIN_EXPO en expo), écrêté. Calé sur une seule observation de la référence
 * (bleu de page #051DAA vu à #1442FF sur l'écran de l'auteur) : les trois canaux s'y accordent avec un gain d'environ 4,5. */
const GAIN_EXPO = 4.5;
const vers_lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const vers_srgb = (l) => { l = Math.max(0, Math.min(1, l)); return Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055)); };
export function cvLit(hex, rise) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m || !(rise > 0)) return hex;
  const n = parseInt(m[1], 16), g = 1 + (GAIN_EXPO - 1) * Math.max(0, Math.min(1, rise));
  return `rgb(${[16, 8, 0].map((s) => vers_srgb(vers_lin((n >> s) & 255) * g)).join(',')})`;
}
