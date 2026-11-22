// THALEOLITHIC papier : qui est qui dans le village, et comment chacun bouge. Les fonctions et les statuts viennent du
// jeu Unity (UngaBungaCampaign.json, characters ; storyboards et clips de CinematicsV15) ; la manière de bouger suit les
// marionnettes du skill (rotation seulement : sautillé, bascule, posture, retournement, accessoires sur pivot).
//   Aurélien, chef de tribu (le directeur général) : pas lents et larges, torse bombé, se déhanche, lève son sceptre
//   et prend la pose héroïque. Alban, chef des rites, gardien du feu sacré : glisse à petits pas de procession,
//   prépare son souffle et lève son bâton rituel d'où monte la fumée, garde sa dignité cérémonielle. Milena, qui lit
//   les nuages et le courant, sceptique : pas vifs, s'arrête, scrute à gauche puis à droite, s'agenouille et déroule sa
//   carte d'écorce. Mathieu, prévention : mesuré, note sur sa tablette. Georges, carrières et constructions : lourd,
//   frappe un support de sa masse. Eliott, expéditions : rapide et léger, s'accroupit sur les traces. Mathilde,
//   soigneuse : vive, se penche pour examiner. Lorette, représentante des habitants : alerte, interrompt d'un bond.
//   Neila, approvisionnements : porte sa hotte, compte. Brok taille le silex, Tarek fend le bois, Orok attise le foyer,
//   Uma porte sa poutre, Kora (chasseuse débutante) trébuche, Ouways peint, Sila touille, Varg (chef voisin) toise,
//   Grumb (le sage auditeur) avance voûté et inspecte, le Petit Os (la mascotte) gambade partout.

// speed (units/s), step (units per stride), hop (units), rock (rad), lean (rad: + toward where it goes, - chest out),
// bow (rad: the bearing at rest, + stooped toward us, - chest out),
// every (s between gestures at rest), gesture, prop (an accessory on a pivot in the right hand), wander (a mascot)
export const PROFILE = {
  aurelien: { speed: 3.0, step: 2.6, hop: 0.05, rock: 0.1, lean: -0.07, bow: -0.06, every: 6.5, gesture: 'pose', prop: 'scepter' },
  alban: { speed: 1.7, step: 0.8, hop: 0.008, rock: 0.018, lean: 0, bow: -0.03, every: 5.5, gesture: 'rite', prop: 'staff' },
  milena: { speed: 4.2, step: 1.4, hop: 0.08, rock: 0.04, lean: 0.05, every: 4, gesture: 'scan', prop: 'map' },
  mathieu: { speed: 3.6, step: 1.7, hop: 0.05, rock: 0.03, lean: 0.02, every: 8, gesture: 'note', prop: 'tablet' },
  georges: { speed: 2.9, step: 1.6, hop: 0.035, rock: 0.08, lean: 0.03, every: 5, gesture: 'strike', prop: 'maul' },
  eliott: { speed: 6.2, step: 2.3, hop: 0.15, rock: 0.04, lean: 0.09, every: 6, gesture: 'track', prop: 'spear' },
  mathilde: { speed: 4.6, step: 1.5, hop: 0.07, rock: 0.03, lean: 0.04, every: 7, gesture: 'kneel', prop: null },
  lorette: { speed: 4.8, step: 1.6, hop: 0.1, rock: 0.05, lean: 0.03, every: 5, gesture: 'interrupt', prop: null },
  neila: { speed: 3.3, step: 1.3, hop: 0.03, rock: 0.11, lean: 0.07, every: 6, gesture: 'count', prop: null },
  brok: { speed: 4.0, step: 1.5, hop: 0.06, rock: 0.04, lean: 0.03, every: 1.6, gesture: 'knap', prop: null },
  tarek: { speed: 4.4, step: 1.9, hop: 0.06, rock: 0.06, lean: 0.04, every: 4, gesture: 'chop', prop: 'axe' },
  orok: { speed: 3.8, step: 1.5, hop: 0.05, rock: 0.04, lean: 0.03, every: 5, gesture: 'fan', prop: null },
  uma: { speed: 4.0, step: 1.6, hop: 0.05, rock: 0.06, lean: 0.04, every: 6, gesture: 'align', prop: 'beam' },
  kora: { speed: 5.2, step: 1.5, hop: 0.13, rock: 0.07, lean: 0.06, every: 5, gesture: 'stumble', prop: 'spear' },
  nork: { speed: 3.9, step: 1.5, hop: 0.05, rock: 0.04, lean: 0.03, every: 4, gesture: 'paint', prop: 'brush' },
  sila: { speed: 4.0, step: 1.4, hop: 0.06, rock: 0.05, lean: 0.03, every: 3, gesture: 'stir', prop: 'ladle' },
  varg: { speed: 2.6, step: 1.9, hop: 0.02, rock: 0.03, lean: -0.05, every: 9, gesture: 'glare', prop: 'spear' },
  grumb: { speed: 1.5, step: 0.75, hop: 0.01, rock: 0.03, lean: 0.14, bow: 0.14, every: 5, gesture: 'inspect', prop: 'cane' },
  petit_os: { speed: 7.0, step: 0.9, hop: 0.22, rock: 0.1, lean: 0.05, every: 2.5, gesture: 'hop', prop: null, wander: 4 },
};
export const DEFAULT = { speed: 4, step: 1.5, hop: 0.06, rock: 0.04, lean: 0.03, every: 6, gesture: null, prop: null };

// a gesture at rest, u from 0 to 1 over dur: { rz (in-plane tilt), rx (lean toward the camera: kneel, crouch), y (hop),
// prop (the accessory's turn about the hand), open (the map unrolled, 0..1), flip (look the other way) }
const bump = (u, a, b) => (u < a || u > b ? 0 : Math.sin((u - a) / (b - a) * Math.PI));
export const GESTURE = {
  pose: { dur: 2.2, at: (u) => ({ y: 0.25 * bump(u, 0, 0.25), rz: -0.08 * bump(u, 0.1, 0.95), prop: -0.35 * bump(u, 0.08, 0.95), lift: 0.75 * bump(u, 0.08, 0.95) }) },
  rite: { dur: 3.2, at: (u) => ({ prop: 0.12 * Math.sin(u * 22) * bump(u, 0.2, 0.85), lift: 0.9 * bump(u, 0.05, 0.95), rz: 0.05 * Math.sin(u * 22) * bump(u, 0.2, 0.85), y: 0.08 * bump(u, 0.05, 0.3) }) },
  scan: { dur: 3.0, at: (u) => ({ flip: u > 0.3 && u < 0.65, rx: 0.32 * bump(u, 0.62, 1), open: bump(u, 0.62, 1) }) },
  note: { dur: 1.8, at: (u) => ({ prop: -0.5 * bump(u, 0, 1), rx: 0.08 * bump(u, 0, 1) }) },
  strike: { dur: 1.4, at: (u) => ({ prop: -1.4 * bump(u, 0, 0.45) - 1.4 * bump(u, 0.5, 0.95), rz: 0.06 * (bump(u, 0.35, 0.5) + bump(u, 0.85, 1)), knock: [0.45, 0.95] }) },
  track: { dur: 2.0, at: (u) => ({ rx: 0.38 * bump(u, 0, 1), prop: 0.9 * bump(u, 0, 1) }) },
  kneel: { dur: 1.8, at: (u) => ({ rx: 0.33 * bump(u, 0, 1) }) },
  interrupt: { dur: 1.0, at: (u) => ({ y: 0.32 * (bump(u, 0, 0.4) + 0.6 * bump(u, 0.45, 0.8)), rz: 0.07 * Math.sin(u * 18) * bump(u, 0, 1) }) },
  count: { dur: 1.6, at: (u) => ({ rz: 0.05 * Math.sin(u * 19) * bump(u, 0, 1) }) },
  knap: { dur: 0.6, at: (u) => ({ rz: 0.06 * bump(u, 0, 0.35), y: 0.04 * bump(u, 0.3, 0.5), knock: [0.35] }) },
  chop: { dur: 1.0, at: (u) => ({ prop: -2.0 * bump(u, 0, 0.55) + 0.4 * bump(u, 0.55, 0.8), rz: 0.05 * bump(u, 0.45, 0.6), knock: [0.5] }) },
  fan: { dur: 1.8, at: (u) => ({ rz: 0.1 * Math.sin(u * 25) * bump(u, 0, 1), rx: 0.15 * bump(u, 0, 1) }) },
  align: { dur: 2.0, at: (u) => ({ prop: 0.25 * Math.sin(u * 9) * bump(u, 0, 1) }) },
  stumble: { dur: 1.3, at: (u) => ({ rz: 0.4 * bump(u, 0, 0.35) - 0.12 * bump(u, 0.35, 0.7), y: 0.1 * bump(u, 0.5, 0.75) }) },
  paint: { dur: 2.0, at: (u) => ({ prop: 0.35 * Math.sin(u * 16) * bump(u, 0, 1) - 0.4 * bump(u, 0, 1) }) },
  stir: { dur: 2.2, at: (u) => ({ prop: 0.45 * Math.sin(u * 12.6) * bump(u, 0, 1) + 0.6 * bump(u, 0, 1), rz: 0.03 * Math.cos(u * 12.6) * bump(u, 0, 1) }) },
  glare: { dur: 2.6, at: (u) => ({ flip: u > 0.25 && u < 0.75, rz: -0.04 * bump(u, 0, 1) }) },
  inspect: { dur: 2.8, at: (u) => ({ rx: 0.28 * bump(u, 0.1, 0.9), flip: u > 0.5 && u < 0.8, prop: 0.3 * bump(u, 0.1, 0.9) }) },
  hop: { dur: 0.9, at: (u) => ({ y: 0.45 * bump(u, 0, 0.5) + 0.25 * bump(u, 0.5, 0.9) }) },
};

// the accessories, drawn with their grip at (0, 0); they turn about the hand
export const PROPS = {
  scepter: { w: 1.4, h: 2.6, draw(g, ink, D, P2, C) { g.fillStyle = ink('#c8b090'); D.rect(g, -0.07, -0.6, 0.14, 2.2); g.fillStyle = ink(C.bone); D.ell(g, 0, 1.75, 0.34, 0.3); D.rect(g, -0.2, 1.45, 0.4, 0.25, 0.05); g.fillStyle = ink('#c84a2a'); P2.fillLeaf(g, -0.3, 1.9, 0.6, 2.2, 0.35); g.fillStyle = ink('#e0a24a'); P2.fillLeaf(g, 0.3, 1.9, 0.55, 1.0, 0.35); g.fillStyle = ink('#2a1a1e', 'print'); D.ell(g, -0.12, 1.78, 0.07, 0.08); D.ell(g, 0.12, 1.78, 0.07, 0.08); } },
  staff: { w: 1.3, h: 3.6, tip: 3.0, draw(g, ink, D, P2, C) { g.fillStyle = ink('#6a4a2a'); D.poly(g, [[-0.06, -0.8], [0.06, -0.8], [0.09, 2.6], [-0.09, 2.6]]); g.fillStyle = ink('#3a2a2a'); D.ell(g, 0, 2.75, 0.22, 0.2); g.fillStyle = ink('#e0a24a'); D.ell(g, 0, 2.95, 0.1, 0.12); for (const [x, a, c] of [[-0.25, 2.6, '#c84a2a'], [0.25, 0.5, '#6f7fb0'], [-0.15, 2.4, C.bone]]) { g.fillStyle = ink(c); P2.fillLeaf(g, x * 0.5, 2.35, 0.7, a, 0.3); } g.fillStyle = ink(C.bone); for (let k = 0; k < 3; k++) D.ell(g, 0.12, 1.9 - k * 0.22, 0.07, 0.09); } },
  map: { w: 1.6, h: 1.0, draw(g, ink, D) { g.fillStyle = ink('#a07850'); D.rect(g, -0.1, -0.1, 1.3, 0.8, 0.05); g.fillStyle = ink('#6a4a2a'); D.ell(g, -0.1, 0.3, 0.1, 0.42); D.ell(g, 1.2, 0.3, 0.1, 0.42); g.strokeStyle = ink('#3a2418', 'print'); g.lineWidth = 0.04; g.beginPath(); g.moveTo(0.1, 0.1); g.quadraticCurveTo(0.5, 0.6, 1.0, 0.2); g.stroke(); g.fillStyle = ink('#6f7fb0', 'print'); D.ell(g, 0.7, 0.45, 0.1, 0.08); } },
  tablet: { w: 0.9, h: 1.1, draw(g, ink, D, P2, C) { g.fillStyle = ink(C.stoneB); D.rect(g, -0.35, -0.1, 0.62, 0.82, 0.06); g.fillStyle = ink(C.ink, 'print'); for (let k = 0; k < 4; k++) D.rect(g, -0.27, 0.05 + k * 0.17, 0.46 - (k % 2) * 0.12, 0.04); } },
  maul: { w: 1.0, h: 2.0, draw(g, ink, D, P2, C) { g.fillStyle = ink('#6a4a2a'); D.rect(g, -0.06, -0.3, 0.12, 1.6); g.fillStyle = ink(C.stone); D.ell(g, 0, 1.35, 0.34, 0.24); g.fillStyle = ink('#c8a870'); D.rect(g, -0.1, 1.05, 0.2, 0.1); } },
  axe: { w: 1.1, h: 1.9, draw(g, ink, D, P2, C) { g.fillStyle = ink('#6a4a2a'); D.rect(g, -0.06, -0.3, 0.12, 1.55); g.fillStyle = ink(C.stone); D.poly(g, [[0.05, 1.0], [0.5, 0.85], [0.55, 1.45], [0.05, 1.3]]); g.fillStyle = ink('#c8a870'); D.rect(g, -0.1, 1.05, 0.2, 0.12); } },
  spear: { w: 0.7, h: 3.6, draw(g, ink, D, P2, C) { g.fillStyle = ink('#6a4a2a'); D.rect(g, -0.05, -1.0, 0.1, 3.4); g.fillStyle = ink(C.stone); D.poly(g, [[-0.15, 2.35], [0.15, 2.35], [0, 2.85]]); g.fillStyle = ink('#c84a2a'); D.poly(g, [[0.05, 2.2], [0.3, 2.05], [0.05, 2.0]]); } },
  brush: { w: 0.6, h: 1.4, draw(g, ink, D, P2, C) { g.fillStyle = ink('#6a4a2a'); D.rect(g, -0.04, -0.2, 0.08, 1.0); g.fillStyle = ink(C.red); D.ell(g, 0, 0.92, 0.1, 0.16); } },
  ladle: { w: 0.8, h: 1.5, draw(g, ink, D) { g.fillStyle = ink('#8a6a3a'); D.rect(g, -0.04, -0.2, 0.08, 1.1); g.fillStyle = ink('#a07850'); D.ell(g, 0, 1.0, 0.2, 0.14); } },
  beam: { w: 3.4, h: 0.6, draw(g, ink, D) { g.fillStyle = ink('#9a6a3a'); D.rect(g, -1.6, -0.12, 3.2, 0.26, 0.05); g.fillStyle = ink('#6a4024', 'print'); for (let k = 0; k < 6; k++) D.rect(g, -1.4 + k * 0.5, -0.06, 0.25, 0.03); } },
  cane: { w: 0.8, h: 3.0, draw(g, ink, D, P2, C) { g.fillStyle = ink('#7a5a3a'); D.poly(g, [[-0.05, -1.4], [0.05, -1.4], [0.08, 1.2], [-0.08, 1.2]]); g.fillStyle = ink(C.bone); D.ell(g, 0, 1.3, 0.16, 0.13); } },
};

// costumes: what each one wears says their rank (drawn under the body, then over it)
export function dress(id, g, ink, D, P2, C, t, layer) {
  const U = layer === 'under';
  if (id === 'aurelien') {
    if (U) { g.fillStyle = ink('#5a3a28'); D.poly(g, [[-0.85, 1.95 * t], [0.85, 1.95 * t], [0.95, 0.5 * t], [0.6, 0.35 * t], [0.3, 0.55 * t], [0, 0.35 * t], [-0.3, 0.55 * t], [-0.6, 0.35 * t], [-0.95, 0.5 * t]]); }
    else { g.fillStyle = ink('#7a5a3a'); for (let k = 0; k < 7; k++) D.ell(g, -0.6 + k * 0.2, 1.97 * t, 0.12, 0.1); g.fillStyle = ink(C.bone); D.ell(g, 0, 1.25 * t, 0.16, 0.13); }
  }
  if (id === 'alban') {
    if (!U) { g.fillStyle = ink('#e8dcc0'); D.poly(g, [[-0.5, 1.95 * t], [0.5, 1.95 * t], [0.72, 0.05], [-0.72, 0.05]]); g.strokeStyle = ink('#c98a3a', 'print'); g.lineWidth = 0.05; for (const [x, y] of [[-0.25, 0.6], [0.28, 1.05], [-0.15, 1.45]]) { g.beginPath(); for (let a = 0; a < 12; a += 0.4) g.lineTo(x + Math.cos(a) * a * 0.012, y + Math.sin(a) * a * 0.012); g.stroke(); }
      g.fillStyle = ink(C.bone); for (let k = 0; k < 7; k++) D.ell(g, -0.36 + k * 0.12, 1.85 * t - Math.sin(k / 6 * Math.PI) * 0.18, 0.05, 0.07); }
  }
  if (id === 'milena') {
    if (U) { g.fillStyle = ink('#4e5a7a'); D.poly(g, [[-0.6, 2.5 * t], [0.6, 2.5 * t], [0.8, 0.5 * t], [-0.8, 0.5 * t]]); D.ell(g, 0, 2.45 * t, 0.5, 0.5); }
    else { g.strokeStyle = ink('#c8d0e8', 'print'); g.lineWidth = 0.05; for (const [x, y] of [[-0.45, 1.0], [0.48, 1.4], [-0.5, 1.7]]) { g.beginPath(); g.arc(x, y * t, 0.1, Math.PI, 0); g.arc(x + 0.14, y * t, 0.08, Math.PI, 0); g.stroke(); } }
  }
  if (id === 'varg') { if (U) { g.fillStyle = ink('#6a6470'); D.ell(g, 0, 2.5 * t, 0.52, 0.45); D.poly(g, [[-0.4, 2.75 * t], [-0.25, 3.05 * t], [-0.12, 2.8 * t]]); D.poly(g, [[0.4, 2.75 * t], [0.25, 3.05 * t], [0.12, 2.8 * t]]); D.poly(g, [[-0.7, 2.2 * t], [0.7, 2.2 * t], [0.6, 1.2 * t], [-0.6, 1.2 * t]]); } }
  if (id === 'neila') { if (U) { g.fillStyle = ink('#b8884a'); D.rect(g, -0.75, 1.0 * t, 1.5, 1.2 * t, 0.12); g.fillStyle = ink('#6a4a2a'); for (const x of [-0.5, -0.1, 0.35]) D.rect(g, x, 2.1 * t, 0.07, 0.6); } else { g.strokeStyle = ink('#7a5a32', 'print'); g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.4, 1.95 * t); g.lineTo(0.4, 1.1 * t); g.stroke(); } }
  if (id === 'georges') { if (!U) { g.fillStyle = ink('#6a4a32'); D.poly(g, [[-0.42, 1.55 * t], [0.42, 1.55 * t], [0.48, 0.7 * t], [-0.48, 0.7 * t]]); } }
  if (id === 'mathilde') { if (!U) { g.fillStyle = ink('#c84a2a'); const hx = -0.2, hy = 1.35 * t; D.ell(g, hx, hy, 0.11, 0.13); for (let f = 0; f < 5; f++) { const a = -0.9 + f * 0.45; D.ell(g, hx + Math.sin(a) * 0.18, hy + Math.cos(a) * 0.18, 0.03, 0.07, -a); } g.fillStyle = ink('#7a8a4a'); D.ell(g, 0.62, 0.95, 0.2, 0.25); P2.fillLeaf(g, 0.62, 1.1, 0.35, 1.3, 0.4); } }
  if (id === 'lorette') { if (!U) { g.fillStyle = ink('#f0e4cc'); for (let k = 0; k < 6; k++) D.ell(g, -0.3 + k * 0.12, 1.9 * t - Math.sin(k / 5 * Math.PI) * 0.12, 0.05, 0.06); g.fillStyle = ink('#6a2a1a'); D.ell(g, -0.42, 2.0 * t, 0.09, 0.3); D.ell(g, 0.42, 2.0 * t, 0.09, 0.3); } }
  if (id === 'eliott' || id === 'kora') { if (!U) { g.fillStyle = ink('#9a7a5a'); D.poly(g, [[-0.55, 1.95 * t], [0, 1.95 * t], [-0.5, 1.4 * t]]); } }
  if (id === 'orok') { if (!U) { g.fillStyle = ink('#3a2a2a', 'print'); for (const [x, y] of [[-0.2, 1.2], [0.15, 0.9], [0.25, 1.5], [-0.18, 2.42]]) D.ell(g, x, y * t, 0.07, 0.05); } }
  if (id === 'nork') { if (!U) { for (const [x, y, c] of [[-0.25, 1.1, '#c84a2a'], [0.2, 1.35, '#e0a24a'], [0.05, 0.85, '#6f7fb0'], [-0.1, 1.5, '#c84a2a']]) { g.fillStyle = ink(c, 'print'); D.ell(g, x, y * t, 0.07, 0.06); } } }
  if (id === 'sila') { if (!U) { g.fillStyle = ink('#e8dcc0'); D.poly(g, [[-0.35, 1.5 * t], [0.35, 1.5 * t], [0.4, 0.7 * t], [-0.4, 0.7 * t]]); } }
}

// what sits on the head, drawn after the face: the chief's feathers, the rites' horns and beard, Milena's feather, the
// sage's long beard, the hunters' feather, the builder's band, the mascot's bone
export function dressTop(id, g, ink, D, P2, C, t) {
  if (id === 'aurelien') for (const [x, a, c] of [[-0.22, 1.9, '#c84a2a'], [0, 1.57, '#e0a24a'], [0.22, 1.25, '#c84a2a']]) { g.fillStyle = ink(c); P2.fillLeaf(g, x, 2.72 * t, 0.55, a, 0.32); }
  if (id === 'alban') { g.fillStyle = ink(C.bone); for (const s of [-1, 1]) P2.fillLimb(g, s * 0.28, 2.65 * t, s * 0.75, 3.05 * t, s * 0.55, 3.35 * t, 0.12, 0.04); g.fillStyle = ink('#d8d0c0'); D.poly(g, [[-0.24, 2.16 * t], [0.24, 2.16 * t], [0, 1.55 * t]]); }
  if (id === 'milena') { g.fillStyle = ink('#e0e8f4'); P2.fillLeaf(g, 0.3, 2.75 * t, 0.5, 1.1, 0.3); }
  if (id === 'grumb') { g.fillStyle = ink('#f0ece0'); D.poly(g, [[-0.3, 2.2 * t], [0.3, 2.2 * t], [0.12, 1.25 * t], [0, 1.1 * t], [-0.12, 1.25 * t]]); }
  if (id === 'eliott' || id === 'kora') { g.fillStyle = ink('#e0a24a'); P2.fillLeaf(g, -0.28, 2.7 * t, 0.5, 2.0, 0.3); }
  if (id === 'uma') { g.fillStyle = ink('#c84a2a'); D.rect(g, -0.36, 2.52 * t, 0.72, 0.1); }
  if (id === 'petit_os') { g.fillStyle = ink(C.bone); P2.fillLimb(g, -0.3, 2.75 * t, 0, 2.95 * t, 0.3, 2.75 * t, 0.06, 0.06); D.ell(g, -0.33, 2.75 * t, 0.08, 0.08); D.ell(g, 0.33, 2.75 * t, 0.08, 0.08); }
}
