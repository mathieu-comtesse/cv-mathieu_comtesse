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
export const EXPO_NEAR = 4;
const PAS = 64;
const DEG = Math.PI / 180;
const PITCH = -30.2 * DEG;
const FOV_PLAT = 50 * DEG, FOV_EXPO = 45 * DEG;
const HAUTEUR_EXPO = 1.015;
const RECUL_EXPO = -1;
const COURBURE = 6.54;
const MONTEE = 0.35;

function profilExpo(progression, hauteur) {
  const T = 5 * hauteur;
  const ds = T / PAS;
  const pts = new Float32Array(2 * (PAS + 1));
  const angles = new Float32Array(PAS);
  const courbureMax = Math.expm1(COURBURE);
  let y = 0, z = 0;
  for (let i = 0; i < PAS; i++) {
    const proportion = Math.expm1(COURBURE * (i + 0.5) / PAS) / courbureMax;
    const orientation = Math.PI / 2 + Math.atan2(y - HAUTEUR_EXPO * hauteur, RECUL_EXPO * hauteur - z);
    const angle = progression * proportion * orientation;
    y += ds * Math.sin(angle);
    z -= ds * Math.cos(angle);
    pts[2 * i + 2] = y;
    pts[2 * i + 3] = z;
    angles[i] = angle;
  }
  return { T, ds, pts, angles };
}

function ancrageExpo() {
  // Intersection du rayon central de la caméra avec le ruban au plein Expo.
  const hauteur = 1024;
  const { T, ds, pts } = profilExpo(1, hauteur);
  const directionY = Math.sin(PITCH), directionZ = -Math.cos(PITCH);
  for (let i = 0; i < PAS; i++) {
    const segmentY = pts[2 * i + 2] - pts[2 * i];
    const segmentZ = pts[2 * i + 3] - pts[2 * i + 1];
    const determinant = directionY * segmentZ - directionZ * segmentY;
    if (Math.abs(determinant) < 1e-9) continue;
    const deltaY = pts[2 * i] - HAUTEUR_EXPO * hauteur;
    const deltaZ = pts[2 * i + 1] - RECUL_EXPO * hauteur;
    const fraction = (directionZ * deltaY - directionY * deltaZ) / determinant;
    const distance = (segmentZ * deltaY - segmentY * deltaZ) / determinant;
    if (fraction >= 0 && fraction <= 1 && distance > 0)
      return { row: (T - (i + fraction) * ds) / hauteur, distance: distance / hauteur };
  }
  return { row: 0.5, distance: 1 };
}
const ancrage = ancrageExpo();
export const cvAnchor = H => ({ row: ancrage.row * H });

/* Le profil et la caméra suivent le relevé du module Expo Shopify 5090151.
 * La progression d'entrée est linéaire dans le temps. La rotation, le champ
 * de vision et les hauteurs d'objets suivent deux courbes distinctes. */
export function cvView(progress, W, H, lead = 0) {
  const t = Math.max(0, Math.min(1, progress));
  const e = t < 0.5 ? 4 * t ** 3 : 1 - 4 * (1 - t) ** 3;
  const rise = 1 - (1 - Math.max(0, (t - MONTEE) / (1 - MONTEE))) ** 3;
  const { T, ds, pts, angles } = profilExpo(e, H);
  const ang = new Float32Array(PAS + 1);
  for (let i = 0; i <= PAS; i++) ang[i] = (angles[Math.max(0, i - 1)] + angles[Math.min(PAS - 1, i)]) / 2;

  const focusRow = lead + H / 2;
  const sample = Math.max(0, Math.min(PAS, (T - focusRow) / ds));
  const index = Math.min(PAS - 1, Math.floor(sample)), fraction = sample - index;
  const focusY = pts[index * 2] + (pts[index * 2 + 2] - pts[index * 2]) * fraction;
  const focusZ = pts[index * 2 + 1] + (pts[index * 2 + 3] - pts[index * 2 + 1]) * fraction;
  const pitch = -Math.PI / 2 + (PITCH + Math.PI / 2) * e;
  const fov = FOV_PLAT + (FOV_EXPO - FOV_PLAT) * e;
  const flatDistance = H / (2 * Math.tan(FOV_PLAT / 2));
  const distance = flatDistance + (H * ancrage.distance - flatDistance) * e;

  return { W, H, T, ds, pts, ang, e, rise, focusRow, fov, pitch,
    camY: focusY - distance * Math.sin(pitch),
    camZ: focusZ + distance * Math.cos(pitch) };
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
  if (!(d >= EXPO_NEAR)) return null;
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
const frac = (x) => x - Math.floor(x);
const adouci = (x) => { x = Math.max(0, Math.min(1, x)); return 1 - (1 - x) ** 3; };
const OR = 2.399963;

// Le geste transversal donne une impulsion au fil, avec les réglages
// de retour du contrôleur de référence. Les extrémités restent ancrées.
const WIRE_OMEGA=2*Math.PI*3.1, WIRE_DAMPING=.15;
const WIRE_IMPULSE_LIMIT=14*WIRE_OMEGA/
  Math.exp(-WIRE_DAMPING/Math.sqrt(1-WIRE_DAMPING**2)*Math.acos(WIRE_DAMPING));

function brushWire(node, pointer, dt, now) {
  let spring=node.wireSpring;
  if(pointer && now-(spring?.brushed??-Infinity)>=.065){
    const {from,to}=pointer;
    const dx=to.x-from.x, dy=to.y-from.y;
    const left=Math.min(node.x0,node.cx,node.x1),right=Math.max(node.x0,node.cx,node.x1);
    const top=Math.min(node.y0,node.cy,node.y1),bottom=Math.max(node.y0,node.cy,node.y1);
    if(Math.max(from.x,to.x)>=left && Math.min(from.x,to.x)<=right &&
        Math.max(from.y,to.y)>=top && Math.min(from.y,to.y)<=bottom){
      let ax=node.x0, ay=node.y0;
      for(let i=1;i<=16;i++){
        const at=i/16, u=1-at;
        const bx=u*u*node.x0+2*u*at*node.cx+at*at*node.x1;
        const by=u*u*node.y0+2*u*at*node.cy+at*at*node.y1;
        const tx=bx-ax,ty=by-ay,det=dx*ty-dy*tx;
        if(Math.abs(det)>1e-9){
          const rx=ax-from.x,ry=ay-from.y;
          const onPointer=(rx*ty-ry*tx)/det, onWire=(rx*dy-ry*dx)/det;
          const position=(i-1+onWire)/16;
          if(onPointer>=0 && onPointer<=1 && onWire>=0 && onWire<=1 &&
              position>=.06 && position<=.94){
            const len=Math.hypot(tx,ty),nx=-ty/len,ny=tx/len;
            spring??={x:0,y:0,vx:0,vy:0};
            const speed=(dx*nx+dy*ny)/Math.max(dt,.008);
            const normalSpeed=spring.vx*nx+spring.vy*ny;
            const maxImpulse=Math.max(Math.abs(normalSpeed),WIRE_IMPULSE_LIMIT);
            const delta=Math.max(-maxImpulse,Math.min(maxImpulse,normalSpeed+speed*.2))-normalSpeed;
            spring.vx+=nx*delta; spring.vy+=ny*delta;
            spring.brushed=now;
            break;
          }
        }
        ax=bx;ay=by;
      }
    }
  }
  if(!spring)return;
  for(let left=Math.min(dt,.05);left>0;left-=1/240){
    const step=Math.min(left,1/240);
    spring.vx-=(WIRE_OMEGA**2*spring.x+2*WIRE_DAMPING*WIRE_OMEGA*spring.vx)*step;
    spring.vy-=(WIRE_OMEGA**2*spring.y+2*WIRE_DAMPING*WIRE_OMEGA*spring.vy)*step;
    spring.x+=spring.vx*step; spring.y+=spring.vy*step;
  }
  node.wireSpring=Math.hypot(spring.x,spring.y)<.05 && Math.hypot(spring.vx,spring.vy)<.5?null:spring;
  if(node.wireSpring){node.cx+=2*spring.x;node.cy+=2*spring.y;}
}

export class Ciel {
  constructor() { this.etoiles = new Map(); this.images = new Map(); this.cibles = []; this.survol = null; this.pris = null; }
  vide() { this.etoiles.clear(); this.cibles = []; this.survol = null; this.wirePointer = null; }
  image(url) {
    if (!url) return null;
    let im = this.images.get(url); if (!im) { im = new Image(); im.decoding = 'async'; im.src = url; this.images.set(url, im); }
    return im.complete && im.naturalWidth ? im : null;
  }
  /* spec : { groupe, label, num, chapitre, editoriaux:[{title,handle,image}], parent, racine, sol, petit } */
  /* Chaque nœud est l'extrémité d'une branche. Niveau 0 : branche éditoriale (une par vrai contenu), niveau 1 : rayon fin issu du foyer,
     niveaux 2 et 3 : ramifications qui partent d'un point (t0) de la courbe de leur branche parente. Courbure (cv), arche en hauteur (ar),
     vitesse d'impulsion (vit), angle et longueur des ramifications dérivent de la phase du nœud : même donnée, même géométrie, et aucune
     consommation supplémentaire du générateur aléatoire (les positions des nœuds éditoriaux restent celles de la version précédente). */
  definit(id, spec) {
    const rd = alea(hache(id + '|' + (spec.label || ''))), ed = spec.editoriaux || [], noeuds = [];
    const eventail = (k, n) => spec.parent || spec.racine ? rd() * 6.283 : -2.5 + (k + 0.5) / n * 3.3 + (rd() - 0.5) * 0.3;     // titres : éventail ouvert vers le haut et la droite
    ed.forEach((e, k) => noeuds.push({ ed: e, a: spec.parent ? k / ed.length * 6.283 + rd() * 0.5 : eventail(k, ed.length), r: 0.62 + rd() * 0.38, dh: (rd() - 0.3) * 0.5, phase: rd() * 6.283, sous: [] }));
    const dens = typeof innerWidth !== 'undefined' && innerWidth < 520 ? 0.5 : 1;   // moins de branches sur petit écran
    const nDeco = Math.round(dens * (spec.racine ? 120 : spec.parent ? 20 + Math.floor(rd() * 10) : spec.petit ? 24 + Math.floor(rd() * 10) : 38 + Math.floor(rd() * 14)));
    for (let k = 0; k < nDeco; k++) {
      noeuds.push({ a: eventail(k, nDeco) + (spec.parent || spec.racine ? 0 : rd() * 1.2), r: spec.racine ? 0.12 + Math.sqrt(rd()) * 1.05 : 0.3 + 0.9 * rd() ** 1.3, dh: (rd() - 0.4) * (spec.racine ? 1.6 : 0.6), phase: rd() * 6.283, taille: 1.0 + rd() ** 2 * 2.6, sous: [] });
    }
    noeuds.forEach((n, idx) => {
      const f1 = frac(n.phase * 5.91), f2 = frac(n.phase * 13.7), f3 = frac(n.phase * 3.17), f4 = frac(n.phase * 7.13), f5 = frac(n.phase * 9.3);
      n.cv = (f4 - 0.5) * 0.5; n.ar = frac(n.phase * 3.71) * 0.28; n.vit = 0.8 + 0.5 * f3; n.t0 = 0.35 + 0.5 * f3; n.ang = (f1 - 0.5) * 2.2; n.len = 0.1 + 0.2 * frac(n.phase * 7.3);
      n.enf = []; n.par = null; n.vis = false; n.gg = 0; n.cl = 0;
      if (n.ed) { n.niveau = 0; return; }
      const lv = spec.racine ? (f1 < 0.8 ? 1 : 2) : f1 < 0.56 ? 1 : f1 < 0.86 ? 2 : 3;
      const cands = noeuds.slice(0, idx).filter((q) => q.niveau !== undefined && q.niveau < lv);
      if (lv > 1 && cands.length) { n.par = cands[Math.floor(f2 * cands.length)]; n.par.enf.push(n); n.niveau = lv; } else n.niveau = 1;
      n.pul = n.niveau === 1 && f5 < 0.1;
    });
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

  /* Impulsion lumineuse sur la courbe réelle d'une branche (segment de quatre points pris sur la courbe) ; arrivée en t0, elle se transmet à
     chaque ramification attachée à cette branche, puis aux ramifications de celles-ci. */
  impulsion(ctx, n, tete) {
    if (tete <= 0 || !n.vis || n.gg < 1) return;
    const h = Math.min(1, tete), tl = Math.max(0, h - 0.11), a = tete < 1 ? 1 : Math.max(0, 1 - (tete - 1) * 6);
    if (a > 0) {
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) { const q = tl + (h - tl) * i / 4, o = 1 - q, x = o * o * n.x0 + 2 * o * q * n.cx + q * q * n.x1, y = o * o * n.y0 + 2 * o * q * n.cy + q * q * n.y1; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = `rgba(255,255,255,${(0.6 * a).toFixed(2)})`; ctx.lineWidth = n.niveau === 0 ? 1.4 : 1.05; ctx.stroke();
      const o = 1 - h; ctx.fillStyle = `rgba(255,255,255,${(0.8 * a).toFixed(2)})`; ctx.beginPath(); ctx.arc(o * o * n.x0 + 2 * o * h * n.cx + h * h * n.x1, o * o * n.y0 + 2 * o * h * n.cy + h * h * n.y1, n.niveau === 0 ? 1.5 : 1.1, 0, 6.283); ctx.fill();
    }
    for (const c of n.enf) if (tete > c.t0 && c.vis) this.impulsion(ctx, c, (tete - c.t0) / 0.6);
  }
  /* distance d'un point à la courbe d'une branche (dix points d'échantillonnage) */
  distanceCourbe(n, px, py) {
    let m = 1e9; for (let i = 0; i <= 10; i++) { const q = i / 10, o = 1 - q, x = o * o * n.x0 + 2 * o * q * n.cx + q * q * n.x1, y = o * o * n.y0 + 2 * o * q * n.cy + q * q * n.y1, d = Math.hypot(x - px, y - py); if (d < m) m = d; } return m;
  }
  dessine(ctx, proj, t, { covers = [], souris = { x: -1e4, y: -1e4 }, W = innerWidth, H = innerHeight, dt = 1 / 60, alpha = 1, compact = false, titres = 1, racineVisible = true, labels = true, flightThumbnail = null, hideFlightThumbnail = false } = {}) {
    this.thumbnailInFlight = null;
    if (alpha <= 0.003) { this.cibles = []; this.survol = null; this.survolBranche = null; return; }
    const A = Math.min(1, alpha), retour = Math.exp(-dt * 9);
    const libre = t !== null, tt = t || 0, cibles = [], cache = (x, y, z) => covers.some((c) => c.z < z - 30 && dansQuad(c.pts, x, y));
    const lastPointer=this.wirePointer;
    this.wirePointer=libre && souris.x>=0 && souris.y>=0 && souris.x<W && souris.y<H
      ? {x:souris.x,y:souris.y}:null;
    const pointer=lastPointer && this.wirePointer && !this.pris &&
      (lastPointer.x!==souris.x || lastPointer.y!==souris.y)
      ? {from:lastPointer,to:this.wirePointer}:null;
    const quads = covers.map((pts) => ({ pts, z: pts.reduce((s, q) => s + q.z, 0) / 4 }));
    covers = quads;
    const focus = this.survol ? this.survol.noeud : this.survolBranche ? this.survolBranche.noeud : null, focusE = this.survol ? this.survol.etoile : this.survolBranche ? this.survolBranche.etoile : null;
    const MULT = [1, 0.4, 1.5, 0.12];                                            // classes de rendu : normale, estompée (voisine d'une branche survolée), mise en évidence, voilée par un cadre
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = A;
    let survol = null, dSurvol = 18, brancheMeilleure = null, dBranche = 7;
    for (const e of this.etoiles.values()) {
      e.ecran = null; e.libelleEcran = null;
      if (e.racine && !racineVisible) continue;
      const kT = e.groupe === 'titre' ? titres * (e.transitionOpacity??1) : (e.intro?.reveal??1), aE = A * kT; ctx.globalAlpha = aE; if (kT < 0.02) continue;   /* étoiles de titre : absentes à plat, elles n'apparaissent qu'avec la bascule */
      if (!e.centre) { e.age = -1; continue; }
      const [c0, r0, h0] = e.centre, F = proj(c0, r0, h0), u = F && proj(c0 + 100, r0, h0);
      if (!F || !u) continue;
      const k = Math.abs(u.x - F.x) / 100;                                       // pixels d'écran par unité, au foyer
      if (F.x < -e.rayon * k - 80 || F.x > W + e.rayon * k + 80 || F.y < -e.rayon * k - 80 || F.y > H + e.rayon * k + 80) { continue; }
      if (e.age < 0) e.age = 0; e.age += libre ? dt : 10;
      e.ecran = F;
      const ambient = e.groupe === 'accueil', ech = Math.max(0.55, Math.min(1.5, k)), R = e.rayon * (e.groupe==='titre'?(e.transitionScale??1):1), actifC = !!this.actif && e.chapitre === this.actif, autreC = !!this.actif && !!e.chapitre && e.chapitre !== this.actif;
      const kE = actifC ? 1.25 : autreC ? 0.85 : 1;                              // chapitre actif : branches plus présentes ; les autres s'effacent un peu
      const F0 = proj(c0, r0, 0), ombre = !!F0 && F.y - F0.y > 1.5;                // ombres portées au sol : seulement quand le foyer est au-dessus du sol (expo)
      /* trace au sol : cercle et tige (étoiles posées) */
      if (e.sol) {
        ctx.strokeStyle = 'rgba(190,210,255,.42)'; ctx.lineWidth = 1; ctx.beginPath(); let ouvert = false;
        for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283, q = proj(c0 + Math.cos(a) * R * 0.62, r0 + Math.sin(a) * R * 0.62, 0); if (!q) { ouvert = false; continue; } ouvert ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); ouvert = true; }
        ctx.stroke();
        const pied = proj(c0, r0, 0); if (pied) { ctx.strokeStyle = 'rgba(150,200,255,.5)'; ctx.beginPath(); ctx.moveTo(pied.x, pied.y); ctx.lineTo(F.x, F.y); ctx.stroke(); }
      }
      /* liaison avec le foyer parent : courbe en arche, plus claire côté foyer */
      const parent = e.parent && this.etoiles.get(e.parent);
      if (parent?.ecran && !e.referenceFlat) {
        const g = adouci(e.age / 0.9), ax = parent.ecran.x, ay = parent.ecran.y, bx = ax + (F.x - ax) * g, by = ay + (F.y - ay) * g, dx = bx - ax, dy = by - ay, ccx = ax + dx / 2 - dy * 0.1, ccy = ay + dy / 2 + dx * 0.1, gl = ctx.createLinearGradient(ax, ay, bx, by);
        gl.addColorStop(0, e.groupe === 'accueil' ? 'rgba(75,126,235,.55)' : 'rgba(215,228,255,.62)'); gl.addColorStop(1, e.groupe === 'accueil' ? 'rgba(42,85,196,.24)' : 'rgba(190,210,255,.28)');
        ctx.strokeStyle = gl; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ccx, ccy, bx, by); ctx.stroke();
      }
      /* 1. géométrie de chaque branche (une seule fois par image, sans allocation : tout est écrit dans le nœud) */
      const N = e.noeuds, nb = N.length, cnt = this.cnt || (this.cnt = new Int16Array(16)); cnt.fill(0);
      for (let j = 0; j < nb; j++) {
        const n = N[j]; n.vis = false;
        let g = n.intro ? n.intro.reach : e.transitionOpening == null
          ? adouci((e.age - 0.15 - j * (e.racine ? 0.012 : 0.04) - (n.par ? 0.3 : 0)) / 0.8)
          : .35 + .65 * e.transitionOpening;
        if (n.par) { if (!n.par.vis) continue; g = Math.min(g, n.par.gg); }
        if (g <= 0) continue;
        let x, y, cx, cy, x0 = F.x, y0 = F.y, z = F.z || 0, wc = 0, wr = 0, wh = 0, cwC = 0, cwR = 0, cwH = 0;
        if (!n.par) {
          const angle=n.a+(n.intro?.spin??0); wc = c0 + Math.cos(angle) * R * n.r; wr = r0 + Math.sin(angle) * R * n.r * (e.referenceFlat ? 1 : 0.78); wh = Math.max(0, h0 + n.dh * R * 0.45);
          if (libre && !e.referenceFlat) { wc += Math.sin(tt * 0.4 + n.phase) * R * 0.02; wr += Math.cos(tt * 0.33 + n.phase * 1.7) * R * 0.018; }
          const P = proj(wc, wr, wh); if (!P) continue;
          x = P.x; y = P.y; z = P.z;
          if (libre && !e.referenceFlat && !n.ed) { const dx = x - souris.x, dy = y - souris.y, d = Math.hypot(dx, dy); if (d < 150 && d > 1) { const q = (1 - d / 150) * 18 / d * (n.ed ? Math.min(1, d / 60) ** 2 : 1); x += dx * q; y += dy * q; } }   // une vignette ne fuit pas le pointeur qui vient la prendre
          x = F.x + (x - F.x) * g; y = F.y + (y - F.y) * g;
          if (this.pris && this.pris.noeud === n) { n.ox = souris.x - x; n.oy = souris.y - y; } else if (n.ox || n.oy) { n.ox *= retour; n.oy *= retour; if (Math.abs(n.ox) + Math.abs(n.oy) < 0.3) n.ox = n.oy = 0; }
          if (n.ox || n.oy) { x += n.ox; y += n.oy; }
          const dc = wc - c0, dr = wr - r0, len = Math.hypot(dc, dr) || 1;      // courbure dans le plan du sol, arche en hauteur : la branche est une vraie courbe de l'espace
          cwC = c0 + dc * 0.5 - dr / len * n.cv * len; cwR = r0 + dr * 0.5 + dc / len * n.cv * len; cwH = (h0 + wh) * 0.5 + n.ar * len * 0.35;
          const Cq = proj(cwC, cwR, cwH);
          cx = Cq ? F.x + (Cq.x - F.x) * g : (F.x + x) / 2; cy = Cq ? F.y + (Cq.y - F.y) * g : (F.y + y) / 2;
          if (n.ox || n.oy) { cx += n.ox * 0.5; cy += n.oy * 0.5; }
          if (ombre && n.ed) {                                                   // pied de la branche éditoriale au sol
            const P0 = proj(wc, wr, 0), C0 = proj(cwC, cwR, 0);
            if (P0 && C0) { n.sx = F0.x + (P0.x - F0.x) * g; n.sy = F0.y + (P0.y - F0.y) * g; n.scx = F0.x + (C0.x - F0.x) * g; n.scy = F0.y + (C0.y - F0.y) * g; n.som = true; } else n.som = false;
          } else n.som = false;
        } else {                                                                 // ramification : part d'un point de la courbe parente, dans son sens, tournée de n.ang
          const p = n.par, tj = n.t0, o = 1 - tj, jx = o * o * p.x0 + 2 * o * tj * p.cx + tj * tj * p.x1, jy = o * o * p.y0 + 2 * o * tj * p.cy + tj * tj * p.y1;
          let tx = 2 * o * (p.cx - p.x0) + 2 * tj * (p.x1 - p.cx), ty = 2 * o * (p.cy - p.y0) + 2 * tj * (p.y1 - p.cy); const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
          const ca = Math.cos(n.ang), sa = Math.sin(n.ang), dx = tx * ca - ty * sa, dy = tx * sa + ty * ca, L = n.len * R * k * (n.niveau === 2 ? 1 : 0.7) * g;
          x0 = jx; y0 = jy; x = jx + dx * L; y = jy + dy * L; cx = jx + dx * L * 0.5 - dy * n.cv * L; cy = jy + dy * L * 0.5 + dx * n.cv * L; z = p.z; n.som = false;
        }
        const voile = n.par ? n.par.cl === 3 : cache(x, y, z);
        let hl = false; if (focus) for (let q = n, i = 0; i < 3 && q; i++, q = q.par) if (q === focus) { hl = true; break; }
        const dim = focus && !hl && e === focusE;
        n.cl = voile ? 3 : hl ? 2 : dim ? 1 : 0;
        n.x0 = x0; n.y0 = y0; n.x1 = x; n.y1 = y; n.cx = cx; n.cy = cy; n.gg = g; n.z = z; n.vis = true; cnt[n.niveau * 4 + n.cl]++;
        if(libre && n.ed && !n.par && (pointer || n.wireSpring))
          brushWire(n, !voile && g>.5 ? pointer:null, dt, tt);
        else if(!libre && n.wireSpring)n.wireSpring=null;
      }
      /* 2. ombres portées au sol des branches éditoriales et des cartes (expo) */
      if (ombre) {
        ctx.strokeStyle = 'rgba(0,8,70,.3)'; ctx.lineWidth = 2.4; ctx.beginPath(); let a = 0;
        for (let j = 0; j < nb; j++) { const n = N[j]; if (!n.ed || !n.vis || !n.som) continue; ctx.moveTo(F0.x, F0.y); ctx.quadraticCurveTo(n.scx, n.scy, n.sx, n.sy); a++; }
        if (a) ctx.stroke();
        ctx.fillStyle = 'rgba(0,8,70,.26)'; ctx.beginPath();
        for (let j = 0; j < nb; j++) { const n = N[j]; if (!n.ed || !n.vis || !n.som) continue; ctx.moveTo(n.sx + 11 * ech, n.sy); ctx.ellipse(n.sx, n.sy, 11 * ech, 4.5 * ech, 0, 0, 6.283); }
        ctx.fill();
      }
      /* 3. rayons fins et ramifications, par niveau et par classe de rendu : un seul tracé par lot, en mélange additif (le centre des foyers s'éclaire par recouvrement) */
      ctx.globalCompositeOperation = 'lighter';
      const BASE = e.racine ? [0, 0.2, 0.13, 0.09] : [0, 0.4, 0.29, 0.21], LW = [0, 0.8, 0.7, 0.6];   /* rayons fins et discrets : le centre des foyers ne sature pas */
      for (let lv = 3; lv >= 1; lv--) for (let cl = 0; cl < 4; cl++) {
        if (!cnt[lv * 4 + cl]) continue;
        ctx.strokeStyle = `rgba(${e.referenceFlat?(e.flatTone==='mint'?'39,205,169':e.flatTone==='cyan'?'46,176,239':'78,103,215'):ambient?'77,135,255':'225,238,255'},${Math.min(1, BASE[lv] * MULT[cl] * kE * (e.referenceFlat?2.6:ambient?1.65:1)).toFixed(3)})`; ctx.lineWidth = LW[lv] * (cl === 2 ? 1.5 : 1); ctx.beginPath();
        for (let j = 0; j < nb; j++) { const n = N[j]; if (n.ed || !n.vis || n.niveau !== lv || n.cl !== cl) continue; ctx.moveTo(n.x0, n.y0); ctx.quadraticCurveTo(n.cx, n.cy, n.x1, n.y1); }
        ctx.stroke();
      }
      if (!e.referenceFlat && cnt[4] + cnt[6]) {                                                     // rayons de niveau 1 : second passage plus clair sur leur premier tiers (dégradé foyer vers extrémité)
        ctx.strokeStyle = `rgba(235,245,255,${Math.min(1, (e.racine ? 0.12 : 0.26) * kE).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath();
        for (let j = 0; j < nb; j++) { const n = N[j]; if (n.ed || !n.vis || n.niveau !== 1 || (n.cl !== 0 && n.cl !== 2)) continue; ctx.moveTo(n.x0, n.y0); ctx.quadraticCurveTo(n.x0 + (n.cx - n.x0) * 0.4, n.y0 + (n.cy - n.y0) * 0.4, n.x0 + (n.cx - n.x0) * 0.48 + (n.x1 - n.x0) * 0.16, n.y0 + (n.cy - n.y0) * 0.48 + (n.y1 - n.y0) * 0.16); }
        ctx.stroke();
      }
      /* 4. branches éditoriales : une courbe par contenu, dégradée du foyer vers la carte */
      for (let j = 0; j < nb; j++) {
        const n = N[j]; if (!n.ed || !n.vis) continue;
        const actif = focus === n, gr = ctx.createLinearGradient(n.x0, n.y0, n.x1, n.y1), cy = j < 2, m = MULT[n.cl] * (n.cl === 0 ? kE : 1);
        gr.addColorStop(0, actif ? 'rgba(255,255,255,1)' : cy ? `rgba(120,235,255,${Math.min(1, 1 * m).toFixed(2)})` : ambient ? `rgba(69,123,243,${Math.min(1, 0.9 * m).toFixed(2)})` : `rgba(255,255,255,${Math.min(1, 0.95 * m).toFixed(2)})`);
        gr.addColorStop(1, actif ? 'rgba(255,255,255,1)' : cy ? `rgba(95,230,255,${Math.min(1, 0.7 * m).toFixed(2)})` : ambient ? `rgba(57,109,228,${Math.min(1, 0.58 * m).toFixed(2)})` : `rgba(255,255,255,${Math.min(1, 0.55 * m).toFixed(2)})`);
        ctx.strokeStyle = gr; ctx.lineWidth = actif ? 2.4 : actifC ? 1.4 : 1.15; ctx.beginPath(); ctx.moveTo(n.x0, n.y0); ctx.quadraticCurveTo(n.cx, n.cy, n.x1, n.y1); ctx.stroke();
        if (!compact && libre && !this.pris && souris.x > -1e3) { const d = this.distanceCourbe(n, souris.x, souris.y); if (d < dBranche && n.cl !== 3) { dBranche = d; brancheMeilleure = { noeud: n, etoile: e }; } }
      }
      /* 5. impulsions : le long des courbes réelles, transmises aux ramifications */
      if (libre && !e.referenceFlat) for (let j = 0; j < nb; j++) {
        const n = N[j]; if (!n.vis || n.par || n.gg < 1 || !(n.ed || n.pul)) continue;
        const q = (tt * 0.3 * n.vit + n.phase / 6.283) % 1;
        this.impulsion(ctx, n, q / 0.75);
      }
      ctx.globalCompositeOperation = 'source-over';
      /* 6. extrémités des ramifications (points) */
      for (let lv = 1; lv <= 3; lv++) for (let cl = 0; cl < 4; cl++) {
        if (!cnt[lv * 4 + cl]) continue;
        ctx.globalAlpha = aE * Math.min(1, MULT[cl] * kE); ctx.fillStyle = ambient ? (lv === 1 ? 'rgba(76,137,250,.65)' : 'rgba(80,137,233,.55)') : e.racine ? 'rgba(200,215,255,.55)' : lv === 1 ? 'rgba(223,233,255,.9)' : lv === 2 ? 'rgba(223,233,255,.75)' : 'rgba(223,233,255,.6)'; ctx.beginPath();
        for (let j = 0; j < nb; j++) { const n = N[j]; if (n.ed || !n.vis || n.niveau !== lv || n.cl !== cl) continue; const r = (n.intro?.scale??1) * (n.taille || 1.6) * (e.racine ? 0.8 : 1) * Math.min(1.2, ech) * (lv === 1 ? 1 : lv === 2 ? 0.8 : 0.6); ctx.moveTo(n.x1 + r, n.y1); ctx.arc(n.x1, n.y1, r, 0, 6.283); }
        ctx.fill();
      }
      if (ambient && !e.referenceFlat) {
        /* Une fraction des terminaisons forme les points de haute lumière
           de la référence, sans éclaircir l'ensemble des filaments bleus. */
        ctx.globalAlpha = Math.min(1, aE * 1.1);
        ctx.fillStyle = 'rgba(241,248,255,.95)';
        ctx.beginPath();
        for (let j = 0; j < nb; j++) {
          const n = N[j];
          if (!n.vis || n.ed || n.niveau > 2 || (j + e.rang * 3) % 5 !== 0) continue;
          const radius = (n.intro?.scale??1) * Math.max(1.6, 2.7 * Math.min(1.2, ech));
          ctx.moveTo(n.x1 + radius, n.y1);
          ctx.arc(n.x1, n.y1, radius, 0, 6.283);
        }
        ctx.fill();
      }
      ctx.globalAlpha = aE;
      /* 7. cartes des contenus éditoriaux */
      for (let j = 0; j < nb; j++) {
        const n = N[j]; if (!n.ed || !n.vis) continue;
        const x = n.x1, y = n.y1, voile = n.cl === 3 ? 0.12 : 1;
        ctx.globalAlpha = voile * aE * (n.intro?.reveal??1);
        const kv = (0.72 + (n.phase / 6.283) * 0.8) * (ambient ? .85 : 1);
        const im = this.image(n.ed.image);
        // Normalized screenshot comparison at the same graph viewport:
        // reference editorial endpoints are about 45% smaller than ours.
        // Keep the clickable hit test centred on the same graph node.
        const referenceThumbnailScale=(e.referenceFlat?.57:1)*(n.intro?.scale??1);
        const w = (im ? 30 : 18) * kv * ech * (compact ? 0.62 : 1)*referenceThumbnailScale;
        const h = (im ? 21 : 14) * kv * ech * (compact ? 0.62 : 1)*referenceThumbnailScale;
        if (n === flightThumbnail) {
          this.thumbnailInFlight = { x, y, w, h };
          if (hideFlightThumbnail) { ctx.globalAlpha = aE; continue; }
        }
        if (im) { ctx.drawImage(im, x - w / 2, y - h / 2, w, h); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h / 2, w, h); }
        else {
          // The reference uses pale image-like endpoints, not dark blue
          // placeholder tiles. Preserve their existing interactive hit targets.
          const pale=e.referenceFlat && ambient;
          ctx.strokeStyle=pale?'rgba(227,238,255,.87)':ambient?'rgba(92,145,240,.7)':'rgba(255,255,255,.75)';
          ctx.lineWidth=pale?.85:1;
          ctx.strokeRect(x-w/2,y-h/2,w,h);
          ctx.fillStyle=pale?'rgba(236,245,255,.83)':ambient?'rgba(75,126,235,.65)':'rgba(255,255,255,.92)';
          ctx.fillRect(x-w/3,y-h*.29,w*2/3,h*.58);
        }
        if (voile === 1) { cibles.push({ x, y, noeud: n, etoile: e }); const d = Math.hypot(x - souris.x, y - souris.y); if (d < dSurvol) { dSurvol = d; survol = { noeud: n, x, y, etoile: e }; } }
        ctx.globalAlpha = aE;
      }
      /* foyer et libellé */
      if(!e.referenceFlat){ const halo = Math.max(16, Math.min(70, (e.racine ? 0.2 : 0.17) * R * k)) * (actifC ? 1.25 : 1), gr = ctx.createRadialGradient(F.x, F.y, 0, F.x, F.y, halo); gr.addColorStop(0, `rgba(210,240,255,${Math.min(1, 0.4 * kE).toFixed(2)})`); gr.addColorStop(0.35, `rgba(120,190,255,${Math.min(1, 0.14 * kE).toFixed(2)})`); gr.addColorStop(1, 'rgba(80,140,255,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(F.x, F.y, halo, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
      const cote = (e.intro?.scale??1) * (e.referenceFlat?6.5:(e.racine ? 9 : e.parent ? 7 : 9)) * Math.min(1.25, Math.max(0.8, ech));
      ctx.fillStyle = e.referenceFlat?(e.flatTone==='mint'?'#39e4ae':e.flatTone==='cyan'?'#45cafa':'#667deb'):ambient ? (e.racine ? '#3855a2' : e.rang % 4 === 0 ? '#18ad9c' : '#538cff') : '#fff'; ctx.fillRect(F.x - cote / 2, F.y - cote / 2, cote, cote);
      if (e.label && !e.racine && labels) {
        const a = e.introLabel ?? adouci((e.age - 0.2) / 0.6);
        ctx.globalAlpha = a * aE; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,10,90,.55)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        if(e.referenceFlat){
          const texte=compact?(e.num||''):(e.referenceShortLabel||e.label)+' '+(e.referenceEditorialCount??e.noeuds.filter(n=>n.ed).length);
          ctx.globalAlpha=a*aE*.94;ctx.fillStyle='rgba(226,233,255,.88)';
          ctx.font='400 '+(compact?9:10)+'px "JetBrains Mono",ui-monospace,monospace';
          const marge=cote/2+7;
          const coteDroit=F.x+marge+ctx.measureText(texte).width<=W-4;
          const x=F.x+(coteDroit?marge:-marge), y=F.y-4;
          ctx.textAlign=coteDroit?'left':'right';
          ctx.fillText(texte,x,y);
          e.libelleEcran={x:Math.round(x),y:Math.round(y),texte};
        }else if (e.sol) {                                                       // étoile posée : numéro et nom sous le cercle
          const bas = proj(c0, r0 + R * 0.7, 0) || F, texte = compact ? (e.num || '') : (e.num ? e.num + ' ' : '') + e.label;
          ctx.font = `500 ${Math.round(Math.max(9, Math.min(13, 11 * ech)))}px "JetBrains Mono",ui-monospace,monospace`; ctx.textAlign = 'center'; ctx.strokeText(texte, bas.x, bas.y + 12); ctx.fillText(texte, bas.x, bas.y + 12);
          e.libelleEcran = { x: Math.round(bas.x), y: Math.round(bas.y + 12), texte };
        } else {                                                                 // étoile de titre : petit libellé contre le foyer
          ctx.font = `500 ${Math.round(Math.max(11, Math.min(15, 13 * ech)))}px Inter,ui-sans-serif,system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.strokeText(e.label, F.x + cote / 2 + 7, F.y + 4.5); ctx.fillText(e.label, F.x + cote / 2 + 7, F.y + 4.5);
          e.libelleEcran = { x: Math.round(F.x + cote / 2 + 7), y: Math.round(F.y + 4.5), texte: e.label };
        }
        ctx.globalAlpha = aE;
      }
    }
    this.cibles = cibles; this.survol = survol; this.survolBranche = survol ? null : brancheMeilleure;
    if (survol) { ctx.globalAlpha = A * (survol.etoile.groupe === 'titre' ? titres : 1);                                                                // nom du contenu survolé
      const texte = (survol.noeud.ed.title || '').slice(0, 60);
      ctx.font = '500 11px "JetBrains Mono",ui-monospace,monospace'; ctx.textAlign = survol.x > W - 260 ? 'right' : 'left'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,10,90,.7)'; ctx.fillStyle = '#fff';
      const dx = survol.x > W - 260 ? -18 : 18; ctx.strokeText(texte, survol.x + dx, survol.y + 4); ctx.fillText(texte, survol.x + dx, survol.y + 4);
    }
    ctx.restore();
  }
}
function dansQuad(q, x, y) { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const a = q[i], b = q[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }

/* Position du pointeur sur l'arête projetée du verre, indépendante
 * de sa pente, de son sens et de l'inclinaison de la caméra. */
export function projectedFramePointerRatio(start,end,souris){
  if(!souris)return 0.5;
  const dx=end.x-start.x,dy=end.y-start.y;
  const length2=dx*dx+dy*dy;
  if(length2<1e-6)return 0.5;
  return Math.max(0,Math.min(1,
    ((souris.x-start.x)*dx+(souris.y-start.y)*dy)/length2));
}

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
    if (!haut.every(Boolean) || !bas.every(Boolean)) { ctx.restore(); continue; }
    const trace = (pts) => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); };
    if (b.slab && b.tilted > 0.02) {                                             // ombre portée au sol d'un cadre relevé
      const ombre = [[b.x0, b.r0], [b.x1, b.r0], [b.x1, b.r1], [b.x0, b.r1]].map(([x, r]) => { const w = cvSlab(view, b.slab, b.r1, b.base, x, b.r1 - r); return p(view, w[0] + w[2] * 0.5, w[1] + w[2] * 0.35, 0); });
      if (ombre.every(Boolean)) { ctx.fillStyle = 'rgba(0,0,0,.22)'; trace(ombre); ctx.fill(); }
    }
    const plein = b.hero && !b.slab;                                           // blocs de l'accueil : flancs opaques, à la couleur du sol assombrie
    ctx.fillStyle = plein ? '#071754' : 'rgba(255,255,255,.07)'; trace([haut[1], haut[2], bas[2], bas[1]]); ctx.fill(); trace([haut[0], haut[3], bas[3], bas[0]]); ctx.fill();
    if (plein) { const g = ctx.createLinearGradient(0, haut[3].y, 0, bas[3].y); g.addColorStop(0, '#1939ab'); g.addColorStop(1, '#071655'); ctx.fillStyle = g; } else ctx.fillStyle = 'rgba(255,255,255,.14)'; trace([haut[3], haut[2], bas[2], bas[3]]); ctx.fill();          // tranche avant
    ctx.strokeStyle = plein ? 'rgba(204,224,255,.38)' : 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.85; ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(haut[i].x, haut[i].y); ctx.lineTo(bas[i].x, bas[i].y); }
    ctx.moveTo(bas[3].x, bas[3].y); ctx.lineTo(bas[2].x, bas[2].y); ctx.lineTo(bas[1].x, bas[1].y); ctx.moveTo(bas[3].x, bas[3].y); ctx.lineTo(bas[0].x, bas[0].y); ctx.stroke();
    const dedansQuad = souris && dansQuad(haut, souris.x, souris.y);
    if (dedansQuad) survole = b;
    if (b.slab && b.tilted > 0.25 && !b.hero) {                                  // reflet de verre d'un cadre relevé
      // Project pointer onto the actual upper edge so the reflection follows
      // the tilted frame even when its horizontal screen axis is reversed.
      const u=projectedFramePointerRatio(haut[0],haut[1],souris);
      const g=ctx.createLinearGradient(haut[0].x,haut[0].y,haut[2].x,haut[2].y);
      const c=0.2+0.6*u,a=0.13*Math.min(1,(b.tilted-0.25)*2);
      g.addColorStop(Math.max(0, c - 0.22), 'rgba(255,255,255,0)'); g.addColorStop(c, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(Math.min(1, c + 0.05), `rgba(255,255,255,${(a * 0.25).toFixed(3)})`); g.addColorStop(Math.min(1, c + 0.3), 'rgba(255,255,255,0)');
      ctx.fillStyle = g; trace(haut); ctx.fill();
    }
    if(b.hero){
      // Film vitré très fin, projeté exactement sur la surface du cadre.
      // Ne modifie ni son contenu DOM ni ses événements.
      const glass=ctx.createLinearGradient(haut[0].x,haut[0].y,haut[2].x,haut[2].y);
      glass.addColorStop(0,'rgba(212,235,255,.09)');
      glass.addColorStop(.15,'rgba(197,225,255,0)');
      glass.addColorStop(.65,'rgba(188,212,255,.018)');
      glass.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=glass;trace(haut);ctx.fill();
    }
    ctx.strokeStyle = dedansQuad ? '#fff' : b.hero ? 'rgba(214,235,255,.42)' : 'rgba(255,255,255,.85)'; ctx.lineWidth = dedansQuad ? 1.7 : b.hero ? .75 : 1; trace(haut); ctx.stroke();
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
const ARCS_CLAIRS = [[3, 0.05, 0.4, 0.045, 0, 0.5], [4, 0.6, 0.95, 0.034, 0.37, 0.42], [2, 0.08, 0.3, 0.06, 0.64, 0.35]];   // [anneau, angle min, angle max (en π), vitesse (tours/s), phase, longueur (rad)]
export function dessineDecor(ctx, view, { t = 0, numeros = 0, base = 0 } = {}) {
  const a = view.e * view.e; if (a < 0.01) return;
  const W = view.W, H = view.H, fois = Math.min(1.6, Math.max(0.6, W / 1512));
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* arcs concentriques sur le plan du sol, de part et d'autre de la bande ; un arc clair les balaie lentement */
  const cx = W * 0.5, cy = Math.max(0, view.doc ? 0 : 0) + 0;
  const trace = (r, d0, d1, pas) => { let on = false; ctx.beginPath(); for (let k = d0; k <= d1; k += pas) { const col = cx + Math.cos(k) * r * W, row = cy + Math.sin(k) * r * W; if (row < 0 || row > view.T || (col > 0 && col < W)) { on = false; continue; } const q = p(view, col, row, 0); if (!q) { on = false; continue; } if (on) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); on = true; } } ctx.stroke(); };
  ctx.lineWidth = 0.8 * fois; ctx.strokeStyle = `rgba(255,255,255,${0.085 * a})`;
  for (const r of ARC_RAYONS) trace(r, 0, Math.PI, 0.02);
  /* arcs clairs : plusieurs tronçons circulent en même temps de chaque côté de la bande (la référence en montre au moins un à gauche et un à droite) ;
     anneau, plage d'angles, vitesse et phase propres à chacun, tous déduits du temps : reproductibles, immobiles en mouvement réduit */
  for (const [anneau, a0, a1, vitesse, phase, longueur] of ARCS_CLAIRS) {
    const dep = Math.PI * (a0 + (a1 - a0) * (((t * vitesse + phase) % 1 + 1) % 1)), lon = longueur;
    for (let s = 0; s < 6; s++) { ctx.lineWidth = (3.2 - s * 0.45) * fois; ctx.strokeStyle = `rgba(255,255,255,${(0.1 + s * 0.06) * a})`; trace(ARC_RAYONS[anneau], dep + s * lon / 6, dep + lon, 0.02); }
  }
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
  /* formule au sol, à gauche de la bande : e^(-x) cos(ωx + φ), la courbe correspondante et la valeur de φ qui avance avec le temps.
     Posée sur le plan du sol (colonne -290, page 1367 à 1480) : texte et tracé suivent la perspective de la caméra. */
  {
    const ancre = (c, y) => p(view, c, y - view.offset, 0), O = ancre(-290, 1367), X = ancre(-270, 1367), Y = ancre(-290, 1387);
    if (O && X && Y && !(view.offset === undefined)) {
      const phi = (t * 0.45) % 6.2832, ax = (X.x - O.x) / 20, ay = (X.y - O.y) / 20, bx = (Y.x - O.x) / 20, by = (Y.y - O.y) / 20;
      ctx.save(); ctx.transform(ax, ay, bx, by, O.x, O.y); ctx.globalAlpha = 0.85 * a; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1 / Math.max(0.3, Math.hypot(ax, ay));
      ctx.font = 'italic 500 15px "JetBrains Mono",ui-monospace,monospace'; ctx.textBaseline = 'top'; ctx.fillText('e^(-x) cos(ωx + φ)', 0, 0);
      ctx.beginPath(); for (let i = 0; i <= 64; i++) { const x = i / 64 * 5, yy = 62 - Math.exp(-x * 0.9) * Math.cos(5 * x + phi) * 24; const px = i / 64 * 180; i ? ctx.lineTo(px, yy) : ctx.moveTo(px, yy); } ctx.stroke();
      ctx.font = 'italic 500 13px "JetBrains Mono",ui-monospace,monospace'; ctx.fillText('φ ' + phi.toFixed(2), 74, 96); ctx.restore();
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

/* Couleur du sol 3D, calée sur les 3 séquences vidéo remises le 15 novembre.
 * À plat, conserver les couleurs de marque. En Expo, corriger l'exposition en
 * lumière linéaire par canal. Mesures de la vidéo : bleu ≈(6,20,153),
 * rose ≈(155,0,78), orange ≈(154,33,2), sans reproduire ses pixels. */
const GAIN_EXPO_RGB = [0.75, 0.55, 0.77];
const vers_lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const vers_srgb = (l) => { l = Math.max(0, Math.min(1, l)); return Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055)); };
export function cvLit(hex, rise) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m || !(rise > 0)) return hex;
  const n = parseInt(m[1], 16), t = Math.max(0, Math.min(1, rise));
  return `rgb(${[16, 8, 0].map((s, i) => vers_srgb(vers_lin((n >> s) & 255) * (1 + (GAIN_EXPO_RGB[i] - 1) * t))).join(',')})`;
}

/* ---------- Liste des chapitres : prolongement courbe du dessus du bloc supérieur ----------
 * Dans la référence, la liste n'est pas un panneau posé à part : c'est le dessus du premier bloc qui se prolonge vers l'arrière, d'abord à plat
 * (raccordé à l'arête du bloc, à sa hauteur), puis se relève suivant une loi exponentielle de l'angle d'élévation jusqu'à la verticale, comme
 * le sol de la scène. Les dernières lignes, sur la partie presque plate, sont donc écrasées par la perspective.
 * Tracé point par point dans le repère du chemin (bords, remplissage, texte orienté ligne par ligne) : il suit la caméra ; le calque HTML
 * correspondant est estompé en expo.
 * spec : { x, w, r1, hp, h0, phi0, phi1, items:[{nom, num}], alpha }  -  r1 : rangée de l'arête arrière du bloc, h0 : hauteur du dessus du bloc,
 * hp : longueur de la surface développée (unités de page), phi0 et phi1 : angles d'élévation au raccord et au sommet (rad). */
const COURBE_K = 2.2, COURBE_LEAN = 1.05;
export function dessinePanneauCourbe(ctx, view, { x, w, r1, hp, h0 = 0, phi0 = 0.05, phi1 = 1.45, items = [], alpha = 1, taille = 11 }) {
  if (alpha <= 0.004 || !(hp > 0)) return;
  const N = 48, rows = new Float32Array(N + 1), hs = new Float32Array(N + 1), ds = hp / N, e = view.e;
  const g = (t) => (Math.exp(COURBE_K * t) - 1) / (Math.exp(COURBE_K) - 1);
  hs[0] = h0; for (let k = 0; k < N; k++) { const phi = phi0 + (phi1 - phi0) * e * g((k + 0.5) / N); rows[k + 1] = rows[k] - ds * Math.cos(phi); hs[k + 1] = hs[k] + ds * Math.sin(phi); }
  const at = (u, s) => { const f = Math.max(0, Math.min(N, s / ds)), k = Math.min(N - 1, Math.floor(f)), q = f - k; return p(view, x + u, r1 + rows[k] + (rows[k + 1] - rows[k]) * q, hs[k] + (hs[k + 1] - hs[k]) * q); };
  const bord = [];
  for (let k = 0; k <= N; k++) { const q = at(0, k * ds); if (!q) return; bord.push(q); }
  const droite = []; for (let k = N; k >= 0; k--) { const q = at(w, k * ds); if (!q) return; droite.push(q); }
  { let haut = Infinity, bas = -Infinity; for (const q of bord) { if (q.y < haut) haut = q.y; if (q.y > bas) bas = q.y; } for (const q of droite) { if (q.y < haut) haut = q.y; if (q.y > bas) bas = q.y; } if (bas < 0 || haut > view.H) return; }   /* hors champ : rien à tracer */
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineJoin = 'round';
  ctx.beginPath(); [...bord, ...droite].forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath();
  ctx.fillStyle = 'rgba(3,22,150,.86)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.stroke();
  const n = items.length, haut = hp - 12, pas = haut / Math.max(1, n);
  ctx.font = `500 ${taille}px "JetBrains Mono",ui-monospace,monospace`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
  const place = (u, s, texte, droit) => {
    const P = at(u, s), X = at(u + 20, s), Y = at(u, s + 20); if (!P || !X || !Y) return;
    ctx.save(); ctx.transform((X.x - P.x) / 20, (X.y - P.y) / 20, -(Y.x - P.x) / 20, -(Y.y - P.y) / 20, P.x, P.y); ctx.textAlign = droit ? 'right' : 'left'; ctx.fillText(texte, 0, 0); ctx.restore();
  };
  items.forEach((it, j) => { const s = hp - 8 - (j + 0.75) * pas; if (s < 2) return; place(10, s, it.nom, false); place(w - 10, s, it.num, true); });
  ctx.restore();
}
