// THALEOLITHIC papier : les bêtes et les ateliers du village, découpés dans le carton comme le reste.
// Élevage (chèvres, moutons, cochons, poules, un chien) dans leurs enclos et leur poulailler ; au-delà de la palissade,
// les espèces de l'âge de glace (mammouths, rhinocéros laineux, aurochs, mégacéros, chevaux, ours des cavernes, loups,
// lion des cavernes). Chaque bête est une carte de profil tournée vers +x (le kit la retourne quand elle change de sens).
// Les ateliers reprennent les postes du jeu Unity : taille du silex, bûcheron, carrière, peaux, séchoir et fumoir,
// cuisine et meule, poterie et four, réserves.

// ---- the animals: (g, ink, D, P2, C) => draw, with their card size ----------------------------------------------------
const legs = (g, ink, D, c, xs, h, w = 0.16, hoof = '#2a1a1e') => { for (const x of xs) { g.fillStyle = ink(c); D.rect(g, x - w / 2, 0.08, w, h + 0.3, w * 0.4); g.fillStyle = ink(hoof); D.rect(g, x - w * 0.6, 0, w * 1.2, 0.12, 0.03); } };
const eye = (g, ink, D, x, y, r = 0.06) => { g.fillStyle = ink('#f4ecdc', 'print'); D.ell(g, x, y, r * 1.3, r * 1.2); g.fillStyle = ink('#2a1a1e', 'print'); D.ell(g, x + r * 0.3, y, r * 0.7, r * 0.8); };
const strokes = (g, ink, D, c, x0, x1, y0, y1, n, len = 0.3) => { g.fillStyle = ink(c, 'print'); for (let k = 0; k < n; k++) { const x = x0 + (x1 - x0) * ((k * 0.618) % 1), y = y0 + (y1 - y0) * ((k * 0.382) % 1); D.rect(g, x, y, 0.05, len); } };

export const BEASTS = {
  goat: { w: 2.7, h: 2.2, draw: (g, ink, D, P2, C, v = 0) => {
    const coat = ['#e8dcc4', '#8a6a4a', '#3a2a24'][v % 3];
    legs(g, ink, D, P2.shade(coat, -0.1), [-0.5, -0.3, 0.35, 0.55], 0.6, 0.12);
    g.fillStyle = ink(coat); D.ell(g, 0, 0.95, 0.75, 0.38); P2.fillLimb(g, 0.55, 1.05, 0.75, 1.35, 0.85, 1.4, 0.24, 0.16); D.ell(g, 0.95, 1.38, 0.24, 0.17);
    g.fillStyle = ink(P2.shade(coat, -0.15)); D.poly(g, [[-0.72, 1.05], [-0.95, 1.4], [-0.78, 1.05]]);
    g.fillStyle = ink('#c8b090'); P2.fillLimb(g, 0.85, 1.5, 0.7, 1.95, 0.45, 1.85, 0.07, 0.03); P2.fillLimb(g, 0.95, 1.5, 0.85, 1.95, 0.62, 1.95, 0.07, 0.03);
    g.fillStyle = ink(P2.shade(coat, -0.25)); D.poly(g, [[1.02, 1.22], [1.1, 1.22], [1.03, 0.95]]);
    eye(g, ink, D, 0.98, 1.42, 0.05);
  } },
  sheep: { w: 2.7, h: 1.9, draw: (g, ink, D, P2, C, v = 0) => {
    const wool = ['#efe6d2', '#d8c8a8', '#b89a78'][v % 3];
    legs(g, ink, D, '#3a2a24', [-0.5, -0.3, 0.3, 0.5], 0.5, 0.11);
    g.fillStyle = ink(wool); for (const [x, y, r] of [[-0.55, 0.9, 0.38], [-0.15, 1.05, 0.42], [0.25, 1.0, 0.4], [0.55, 0.85, 0.32], [-0.2, 0.72, 0.4], [0.2, 0.72, 0.38]]) D.ell(g, x, y, r, r * 0.9);
    g.fillStyle = ink('#3a2a24'); D.ell(g, 0.92, 1.05, 0.26, 0.19); D.ell(g, 0.78, 1.12, 0.14, 0.08, -0.6);
    g.fillStyle = ink(P2.shade(wool, -0.12), 'print'); for (let k = 0; k < 9; k++) D.ell(g, -0.7 + k * 0.16, 0.7 + (k % 3) * 0.15, 0.08, 0.06);
    eye(g, ink, D, 0.98, 1.1, 0.045);
  } },
  pig: { w: 2.9, h: 1.7, draw: (g, ink, D, P2, C, v = 0) => {
    const hide = ['#c8947a', '#8a5a44', '#5a3a2e'][v % 3];
    legs(g, ink, D, P2.shade(hide, -0.1), [-0.55, -0.35, 0.35, 0.55], 0.4, 0.16);
    g.fillStyle = ink(hide); D.ell(g, 0, 0.78, 0.9, 0.45); D.ell(g, 0.85, 0.82, 0.34, 0.3); D.rect(g, 1.05, 0.62, 0.22, 0.3, 0.08);
    g.fillStyle = ink(P2.shade(hide, -0.2)); D.ell(g, 1.25, 0.77, 0.05, 0.12); D.poly(g, [[0.75, 1.05], [0.88, 1.32], [0.95, 1.05]]);
    g.strokeStyle = ink(P2.shade(hide, -0.2)); g.lineWidth = 0.06; g.beginPath(); g.arc(-0.92, 0.92, 0.1, 0, 5); g.stroke();
    strokes(g, ink, D, P2.shade(hide, -0.18), -0.7, 0.6, 1.0, 1.15, 10, 0.12);
    eye(g, ink, D, 0.92, 0.95, 0.045);
  } },
  hen: { w: 1.0, h: 1.0, draw: (g, ink, D, P2, C, v = 0) => {
    const plume = ['#c87a3a', '#ead9b8', '#3a2a2a', '#a05a2a'][v % 4];
    g.fillStyle = ink('#e0a24a'); D.rect(g, -0.08, 0, 0.04, 0.25); D.rect(g, 0.06, 0, 0.04, 0.25);
    g.fillStyle = ink(plume); D.ell(g, 0, 0.42, 0.28, 0.2); D.ell(g, 0.22, 0.6, 0.11, 0.12); D.poly(g, [[-0.22, 0.45], [-0.42, 0.78], [-0.3, 0.42]]);
    g.fillStyle = ink('#c8282a'); D.ell(g, 0.24, 0.73, 0.07, 0.05); D.ell(g, 0.3, 0.55, 0.03, 0.05);
    g.fillStyle = ink('#e0a24a'); D.poly(g, [[0.32, 0.62], [0.42, 0.59], [0.32, 0.56]]);
    g.fillStyle = ink(P2.shade(plume, -0.2), 'print'); D.ell(g, -0.03, 0.42, 0.14, 0.08);
    eye(g, ink, D, 0.25, 0.63, 0.025);
  } },
  dog: { w: 1.8, h: 1.4, draw: (g, ink, D, P2, C) => {
    legs(g, ink, D, '#7a5a3a', [-0.45, -0.3, 0.3, 0.45], 0.5, 0.1, '#5a3a2a');
    g.fillStyle = ink('#9a7048'); D.ell(g, 0, 0.75, 0.55, 0.25); D.ell(g, 0.62, 1.0, 0.22, 0.19); D.poly(g, [[0.75, 1.0], [1.05, 0.92], [0.78, 0.86]]);
    D.poly(g, [[0.55, 1.12], [0.6, 1.38], [0.7, 1.12]]); P2.fillLimb(g, -0.5, 0.8, -0.8, 1.0, -0.85, 1.25, 0.1, 0.06);
    g.fillStyle = ink('#ead9b8', 'print'); D.ell(g, 0.35, 0.68, 0.18, 0.1);
    eye(g, ink, D, 0.68, 1.04, 0.035);
  } },
  rhino: { w: 4.6, h: 2.9, draw: (g, ink, D, P2, C) => {
    legs(g, ink, D, '#5a3a24', [-1.15, -0.75, 0.65, 1.0], 0.85, 0.36, '#2a1a1e');
    g.fillStyle = ink('#7a5232'); D.ell(g, -0.05, 1.45, 1.55, 0.78); D.ell(g, -0.6, 1.95, 0.75, 0.5); P2.fillLimb(g, 1.2, 1.55, 1.6, 1.2, 1.85, 0.95, 0.5, 0.3);
    g.fillStyle = ink(C.bone); D.poly(g, [[1.75, 1.05], [2.15, 1.85], [1.95, 1.05]]); D.poly(g, [[1.45, 1.2], [1.58, 1.62], [1.6, 1.2]]);
    strokes(g, ink, D, '#a07a4a', -1.4, 1.2, 0.8, 1.7, 30, 0.38);
    g.fillStyle = ink('#4a2e1e'); D.poly(g, [[1.15, 1.85], [1.28, 2.15], [1.32, 1.85]]);
    eye(g, ink, D, 1.45, 1.42, 0.05);
  } },
  aurochs: { w: 4.0, h: 2.9, draw: (g, ink, D, P2, C, v = 0) => {
    const hide = v % 2 ? '#3a2420' : '#5a3424';
    legs(g, ink, D, hide, [-1.0, -0.7, 0.6, 0.9], 1.0, 0.22);
    g.fillStyle = ink(hide); D.ell(g, -0.05, 1.55, 1.3, 0.6); D.ell(g, 0.65, 1.75, 0.6, 0.62); P2.fillLimb(g, 1.0, 1.7, 1.35, 1.6, 1.55, 1.3, 0.38, 0.24);
    P2.fillLimb(g, -1.12, 1.68, -1.45, 1.3, -1.4, 0.7, 0.08, 0.05);
    g.fillStyle = ink('#e8dcc4'); P2.fillLimb(g, 1.22, 1.68, 1.75, 2.0, 1.9, 2.55, 0.1, 0.04); P2.fillLimb(g, 1.12, 1.7, 1.45, 2.2, 1.65, 2.6, 0.09, 0.04);
    g.fillStyle = ink('#c8a870', 'print'); D.rect(g, -0.9, 2.05, 1.5, 0.06, 0.03); D.ell(g, 1.6, 1.25, 0.14, 0.1);
    eye(g, ink, D, 1.35, 1.6, 0.05);
  } },
  megaloceros: { w: 4.6, h: 4.6, draw: (g, ink, D, P2, C) => {
    legs(g, ink, D, '#7a4a2a', [-0.85, -0.6, 0.55, 0.8], 1.3, 0.15);
    g.fillStyle = ink('#9a5a32'); D.ell(g, 0, 1.75, 1.1, 0.5); P2.fillLimb(g, 0.8, 1.9, 1.1, 2.4, 1.2, 2.75, 0.34, 0.2); D.ell(g, 1.35, 2.75, 0.34, 0.2); D.poly(g, [[-0.92, 1.88], [-1.3, 2.1], [-0.98, 1.7]]);
    g.fillStyle = ink('#ead9b8', 'print'); D.ell(g, -0.95, 1.65, 0.16, 0.2); D.ell(g, 0.2, 1.4, 0.7, 0.14);
    g.fillStyle = ink('#c8a870');   // the huge palmate antlers
    for (const s of [-1, 1]) { const bx = 1.2 + s * 0.06, px = 0.55 + s * 0.35, py = 3.85 + s * 0.1;   // beam up and back, a broad palm, tines along its top
      P2.fillLimb(g, bx, 2.7, bx - 0.1, 3.3, px + 0.2, py - 0.15, 0.12, 0.1); D.ell(g, px, py, 0.62, 0.3, -0.35);
      for (let k = 0; k < 5; k++) { const tx = px - 0.5 + k * 0.26, ty = py + 0.12 + (2 - Math.abs(k - 2)) * 0.06; D.poly(g, [[tx - 0.09, ty - 0.08], [tx + 0.09, ty - 0.08], [tx + 0.02, ty + 0.38]]); } }
    eye(g, ink, D, 1.42, 2.82, 0.045);
  } },
  horse: { w: 3.4, h: 2.8, draw: (g, ink, D, P2, C, v = 0) => {
    const coat = ['#c8a070', '#b88a58', '#d8b888'][v % 3];
    legs(g, ink, D, '#3a2a24', [-0.8, -0.55, 0.55, 0.78], 1.05, 0.14);
    g.fillStyle = ink(coat); D.ell(g, 0, 1.5, 0.98, 0.45); P2.fillLimb(g, 0.75, 1.6, 1.0, 2.05, 1.15, 2.2, 0.34, 0.22); D.poly(g, [[1.05, 2.3], [1.55, 1.95], [1.5, 1.8], [1.0, 2.05]]);
    g.fillStyle = ink('#2a1a1e'); D.poly(g, [[0.7, 1.85], [1.05, 2.4], [1.12, 2.32], [0.85, 1.8]]); P2.fillLimb(g, -0.85, 1.65, -1.25, 1.3, -1.2, 0.8, 0.12, 0.08);
    g.fillStyle = ink('#3a2a24', 'print'); D.rect(g, -0.95, 1.55, 1.7, 0.05);
    g.fillStyle = ink('#ead9b8', 'print'); D.ell(g, 1.45, 1.85, 0.08, 0.05);
    eye(g, ink, D, 1.12, 2.15, 0.04);
  } },
  bear: { w: 3.4, h: 2.4, draw: (g, ink, D, P2, C) => {
    legs(g, ink, D, '#4a2e1e', [-0.85, -0.55, 0.5, 0.8], 0.6, 0.32, '#2a1a1e');
    g.fillStyle = ink('#5a3826'); D.ell(g, -0.1, 1.15, 1.15, 0.62); D.ell(g, 0.2, 1.6, 0.6, 0.38); D.ell(g, 1.0, 1.15, 0.42, 0.36); D.ell(g, 1.35, 1.05, 0.24, 0.17); D.ell(g, 0.85, 1.48, 0.11, 0.11);
    g.fillStyle = ink('#2a1a1e'); D.ell(g, 1.56, 1.08, 0.06, 0.05);
    strokes(g, ink, D, '#7a5236', -1.0, 0.8, 0.7, 1.5, 22, 0.28);
    eye(g, ink, D, 1.15, 1.22, 0.04);
  } },
  wolf: { w: 2.4, h: 1.6, draw: (g, ink, D, P2, C, v = 0) => {
    const coat = ['#8a8490', '#6a6470', '#a09aa4'][v % 3];
    legs(g, ink, D, P2.shade(coat, -0.15), [-0.55, -0.4, 0.4, 0.55], 0.6, 0.1, '#3a3438');
    g.fillStyle = ink(coat); D.ell(g, 0, 0.88, 0.62, 0.26); D.ell(g, 0.72, 1.1, 0.24, 0.2); D.poly(g, [[0.88, 1.12], [1.22, 1.0], [0.9, 0.95]]); D.poly(g, [[0.62, 1.25], [0.66, 1.55], [0.78, 1.26]]);
    P2.fillLimb(g, -0.58, 0.95, -0.95, 0.85, -1.05, 0.55, 0.16, 0.1);
    g.fillStyle = ink('#e8e0e4', 'print'); D.ell(g, 0.3, 0.75, 0.25, 0.1); D.ell(g, 0.95, 1.02, 0.12, 0.05);
    eye(g, ink, D, 0.8, 1.15, 0.035);
  } },
  lion: { w: 3.6, h: 1.8, draw: (g, ink, D, P2, C) => {   // the cave lion, lying in the sun
    g.fillStyle = ink('#c89a5a'); D.ell(g, -0.1, 0.5, 1.25, 0.42); D.ell(g, 1.1, 0.95, 0.38, 0.34); D.rect(g, 0.6, 0, 1.0, 0.25, 0.1); D.ell(g, 1.4, 0.85, 0.2, 0.15); D.poly(g, [[0.95, 1.2], [1.0, 1.4], [1.12, 1.24]]);
    P2.fillLimb(g, -1.3, 0.5, -1.7, 0.4, -1.6, 0.15, 0.1, 0.06); g.fillStyle = ink('#6a4a2a'); D.ell(g, -1.62, 0.13, 0.1, 0.08); D.ell(g, 1.58, 0.88, 0.05, 0.04);
    g.fillStyle = ink('#e8d0a0', 'print'); D.ell(g, 1.25, 0.78, 0.15, 0.08);
    eye(g, ink, D, 1.2, 1.0, 0.04);
  } },
  // ---- the Cenozoic menagerie (Dylan may leave the camp: some hunt, some defend themselves when frightened) ----------
  smilodon: { w: 3.6, h: 2.0, draw: (g, ink, D, P2, C) => {
    legs(g, ink, D, '#a8743a', [-0.95, -0.7, 0.55, 0.8], 0.75, 0.2, '#5a3a22');
    g.fillStyle = ink('#c8904a'); D.ell(g, -0.1, 1.12, 1.15, 0.42); D.ell(g, 0.95, 1.35, 0.42, 0.36); D.ell(g, 1.3, 1.25, 0.26, 0.2); P2.fillLimb(g, -1.15, 1.2, -1.4, 1.15, -1.5, 0.95, 0.1, 0.07);
    g.fillStyle = ink('#f4ecdc'); for (const sx of [1.28, 1.42]) D.poly(g, [[sx - 0.05, 1.1], [sx + 0.05, 1.1], [sx, 0.62]]);
    g.fillStyle = ink('#8a5a2a', 'print'); for (let k = 0; k < 7; k++) D.ell(g, -0.8 + k * 0.25, 1.25 + (k % 2) * 0.12, 0.07, 0.05);
    g.fillStyle = ink('#5a3a22'); D.poly(g, [[0.85, 1.62], [0.92, 1.85], [1.02, 1.62]]); eye(g, ink, D, 1.1, 1.42, 0.05);
  } },
  gastornis: { w: 2.6, h: 3.4, draw: (g, ink, D, P2, C) => {
    g.fillStyle = ink('#c8a050'); for (const x of [-0.2, 0.2]) { D.rect(g, x - 0.08, 0.06, 0.16, 1.2, 0.05); D.poly(g, [[x - 0.3, 0], [x + 0.3, 0], [x, 0.15]]); }
    g.fillStyle = ink('#3a3448'); D.ell(g, 0, 1.6, 0.75, 0.6); P2.fillLimb(g, 0.4, 1.9, 0.6, 2.5, 0.55, 2.85, 0.3, 0.24); D.poly(g, [[-0.6, 1.8], [-1.15, 2.2], [-0.65, 1.45]]);
    g.fillStyle = ink('#e0a24a'); D.poly(g, [[0.7, 2.95], [1.25, 2.72], [0.75, 2.5]]); g.fillStyle = ink('#c84a2a', 'print'); D.rect(g, 0.72, 2.72, 0.5, 0.04);
    g.fillStyle = ink('#5a5470', 'print'); for (let k = 0; k < 6; k++) P2.fillLeaf(g, -0.4 + k * 0.15, 1.4, 0.35, -1.2, 0.3); eye(g, ink, D, 0.62, 2.92, 0.05);
  } },
  diprotodon: { w: 3.8, h: 2.4, draw: (g, ink, D, P2, C) => {
    legs(g, ink, D, '#5a3a24', [-1.0, -0.7, 0.6, 0.9], 0.75, 0.32, '#2a1a1e');
    g.fillStyle = ink('#7a5236'); D.ell(g, 0, 1.25, 1.35, 0.68); D.ell(g, 1.2, 1.25, 0.48, 0.42); D.rect(g, 1.45, 1.0, 0.38, 0.38, 0.12); D.ell(g, 0.95, 1.68, 0.13, 0.12);
    g.fillStyle = ink('#2a1a1e'); D.ell(g, 1.78, 1.25, 0.08, 0.07); strokes(g, ink, D, '#9a7048', -1.1, 1.0, 0.8, 1.6, 16, 0.25); eye(g, ink, D, 1.3, 1.38, 0.04);
  } },
  megatherium: { w: 3.4, h: 5.0, draw: (g, ink, D, P2, C) => {   // the giant ground sloth, up on its hind legs
    g.fillStyle = ink('#6a5038'); D.rect(g, -0.5, 0.05, 0.4, 1.3, 0.15); D.rect(g, 0.15, 0.05, 0.4, 1.3, 0.15); P2.fillLimb(g, -0.3, 0.6, -1.1, 0.5, -1.4, 0.15, 0.35, 0.2);
    g.fillStyle = ink('#7a6044'); D.ell(g, 0, 2.5, 0.95, 1.35); D.ell(g, 0.1, 3.95, 0.45, 0.42); D.ell(g, 0.45, 3.85, 0.25, 0.18);
    g.fillStyle = ink('#6a5038'); for (const sd of [-1, 1]) P2.fillLimb(g, sd * 0.7, 3.2, sd * 1.25, 3.4, sd * 1.35, 2.6, 0.24, 0.16);
    g.fillStyle = ink('#ead9b8'); for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) D.poly(g, [[sd * 1.3 + k * 0.06, 2.62], [sd * 1.3 + k * 0.06 + 0.06, 2.62], [sd * 1.36 + k * 0.05, 2.15]]);
    strokes(g, ink, D, '#9a7a58', -0.7, 0.7, 1.4, 3.3, 22, 0.35); eye(g, ink, D, 0.3, 4.02, 0.045);
  } },
  glyptotherium: { w: 3.6, h: 2.0, draw: (g, ink, D, P2, C) => {
    legs(g, ink, D, '#5a4a3a', [-0.9, -0.6, 0.5, 0.8], 0.35, 0.22, '#2a1a1e');
    g.fillStyle = ink('#8a7a5a'); D.ell(g, 1.25, 0.65, 0.32, 0.26); P2.fillLimb(g, -1.1, 0.7, -1.6, 0.6, -1.8, 0.5, 0.2, 0.18); D.ell(g, -1.82, 0.5, 0.2, 0.2);
    g.fillStyle = ink('#a08a62'); g.beginPath(); g.ellipse(0, 0.5, 1.35, 1.25, 0, Math.PI, 0, true); g.fill();
    g.strokeStyle = ink('#6a5a3a', 'print'); g.lineWidth = 0.04; for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) { const a = Math.PI * (0.12 + k * 0.125), rr = 0.35 + r * 0.27; g.beginPath(); g.arc(Math.cos(a) * rr, 0.5 + Math.sin(a) * rr * 0.92, 0.11, 0, 6.283); g.stroke(); }
    g.fillStyle = ink('#ead9b8'); for (let k = 0; k < 5; k++) D.poly(g, [[-1.95 + k * 0.08, 0.6], [-1.9 + k * 0.08, 0.78], [-1.85 + k * 0.08, 0.6]]); eye(g, ink, D, 1.35, 0.72, 0.04);
  } },
  harpagornis: { w: 4.6, h: 2.0, draw: (g, ink, D, P2, C) => {   // Haast's eagle, wings spread
    g.fillStyle = ink('#4a3426'); g.beginPath(); g.moveTo(0, 1.0); g.quadraticCurveTo(-1.2, 1.9, -2.2, 1.6); g.lineTo(-1.8, 1.3); g.lineTo(-2.0, 1.15); g.lineTo(-1.5, 0.95); g.lineTo(-1.7, 0.75); g.quadraticCurveTo(-0.8, 0.8, 0, 0.75); g.quadraticCurveTo(0.8, 0.8, 1.7, 0.75); g.lineTo(1.5, 0.95); g.lineTo(2.0, 1.15); g.lineTo(1.8, 1.3); g.lineTo(2.2, 1.6); g.quadraticCurveTo(1.2, 1.9, 0, 1.0); g.fill();
    g.fillStyle = ink('#6a4a32'); D.ell(g, 0, 0.85, 0.32, 0.5); g.fillStyle = ink('#ead9b8'); D.ell(g, 0, 1.3, 0.2, 0.18); g.fillStyle = ink('#e0a24a'); D.poly(g, [[0.12, 1.3], [0.35, 1.22], [0.12, 1.15]]); for (const sd of [-1, 1]) D.poly(g, [[sd * 0.12, 0.38], [sd * 0.22, 0.12], [sd * 0.02, 0.3]]);
  } },
  archaeoindris: { w: 2.4, h: 3.2, draw: (g, ink, D, P2, C) => {   // the giant lemur, gorilla-sized
    g.fillStyle = ink('#5a4a40'); for (const sd of [-1, 1]) P2.fillLimb(g, sd * 0.35, 1.0, sd * 0.45, 0.5, sd * 0.4, 0.05, 0.24, 0.18); D.ell(g, 0, 1.55, 0.7, 0.85); for (const sd of [-1, 1]) P2.fillLimb(g, sd * 0.6, 2.0, sd * 1.0, 1.4, sd * 0.95, 0.6, 0.18, 0.13);
    g.fillStyle = ink('#3a2e2a'); D.ell(g, 0, 2.6, 0.42, 0.4); g.fillStyle = ink('#d8c8a8'); D.ell(g, 0, 2.5, 0.24, 0.2); for (const sd of [-1, 1]) D.ell(g, sd * 0.36, 2.85, 0.14, 0.12); eye(g, ink, D, -0.12, 2.65, 0.07); eye(g, ink, D, 0.12, 2.65, 0.07);
  } },
  sarcosuchus: { w: 6.4, h: 1.7, draw: (g, ink, D, P2, C) => {   // the giant crocodile: a long thin snout with its bulb at the tip, raised eyes, two rows of armour plates
    const top = (x) => x < -0.9 ? 0.46 + 0.5 * (x + 3.0) / 2.1 : x < 0.9 ? 0.96 - 0.04 * Math.abs(x) : x < 1.7 ? 0.92 - (x - 0.9) * 0.08 : 0.82 - (x - 1.7) * 0.18;
    // sprawled legs under the flanks (they reach well into the body), webbed clawed feet
    for (const [hx, fx, back] of [[-0.85, -1.15, 1], [0.7, 0.95, 0]]) {
      g.fillStyle = ink(back ? '#3e4a2c' : '#46532f'); P2.fillLimb(g, hx, 0.62, hx + (fx - hx) * 0.4, 0.3, fx, 0.06, back ? 0.3 : 0.24, 0.13);
      g.fillStyle = ink('#3a4428'); D.ell(g, fx + 0.1, 0.07, 0.24, 0.08); g.fillStyle = ink('#e8dcc0'); for (let k = 0; k < 3; k++) D.poly(g, [[fx + 0.16 + k * 0.08, 0.04], [fx + 0.28 + k * 0.08, 0.0], [fx + 0.2 + k * 0.08, 0.1]]);
    }
    // the tail, thick at the hips, thin and slightly raised at the tip; then the body, the neck, the broad skull
    g.fillStyle = ink('#4e5c34'); g.beginPath(); g.moveTo(-0.6, 0.98); g.quadraticCurveTo(-1.9, 0.8, -3.1, 0.52); g.quadraticCurveTo(-1.9, 0.5, -0.7, 0.34); g.fill();
    D.ell(g, 0.05, 0.64, 1.15, 0.36);
    g.beginPath(); g.moveTo(0.8, 0.96); g.quadraticCurveTo(1.35, 0.98, 1.75, 0.86); g.lineTo(1.82, 0.62); g.quadraticCurveTo(1.3, 0.38, 0.8, 0.36); g.fill();
    // the snout: long and narrow, ending in the bulb (the bulla) that gave it its name
    g.beginPath(); g.moveTo(1.7, 0.88); g.lineTo(2.85, 0.68); g.lineTo(2.88, 0.6); g.lineTo(1.75, 0.64); g.fill();
    D.ell(g, 2.98, 0.68, 0.2, 0.15);
    // the lower jaw, a little open, and the teeth that cross outside it
    g.fillStyle = ink('#6a7444'); g.beginPath(); g.moveTo(1.6, 0.6); g.lineTo(2.9, 0.53); g.quadraticCurveTo(3.05, 0.5, 2.98, 0.44); g.lineTo(1.65, 0.42); g.fill();
    g.fillStyle = ink('#3a1e1a'); g.beginPath(); g.moveTo(1.7, 0.62); g.lineTo(2.9, 0.58); g.lineTo(2.9, 0.54); g.lineTo(1.7, 0.56); g.fill();
    g.fillStyle = ink('#f4ecdc'); for (let k = 0; k < 12; k++) { const x = 1.78 + k * 0.095; D.poly(g, [[x, 0.615], [x + 0.03, 0.54], [x + 0.06, 0.615]]); if (k % 2) D.poly(g, [[x + 0.02, 0.55], [x + 0.05, 0.63], [x + 0.08, 0.55]]); }
    // the pale belly and throat, the darker bands across the tail
    g.fillStyle = ink('#b8ae7a'); D.ell(g, 0.05, 0.42, 1.0, 0.13); g.beginPath(); g.moveTo(0.9, 0.42); g.quadraticCurveTo(1.3, 0.38, 1.7, 0.44); g.lineTo(0.9, 0.5); g.fill();
    g.fillStyle = ink('#34402a', 'print'); for (let k = 0; k < 6; k++) { const x = -1.0 - k * 0.33; D.poly(g, [[x, top(x) - 0.02], [x - 0.12, top(x - 0.12) - 0.02], [x - 0.08, 0.5 + (x + 3) * 0.02], [x + 0.04, 0.5 + (x + 3) * 0.02]]); }
    // two rows of armour plates along the back, the tail's double crest, the raised eye with its slit
    for (let x = -2.8; x < 1.5; x += 0.19) { const y = top(x), big = x < -0.9 ? 0.07 + 0.08 * (x + 2.8) / 1.9 : 0.12;
      g.fillStyle = ink('#3a4628'); D.poly(g, [[x - 0.08, y - 0.03], [x + 0.02, y + big], [x + 0.11, y - 0.03]]);
      g.fillStyle = ink('#6c7a46', 'print'); D.ell(g, x + 0.02, y - 0.1, 0.07, 0.04); }
    g.fillStyle = ink('#4a5630'); D.ell(g, 1.55, 0.98, 0.14, 0.1);
    g.fillStyle = ink('#e0b020'); D.ell(g, 1.57, 1.0, 0.075, 0.055); g.fillStyle = ink('#1a1210'); D.ell(g, 1.57, 1.0, 0.016, 0.05);
    g.fillStyle = ink('#2a3020'); D.ell(g, 3.06, 0.76, 0.04, 0.025);   // the nostril on the bulb
  } },
  canariomys: { w: 1.2, h: 0.6, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#7a6250'); D.ell(g, 0, 0.25, 0.38, 0.2); D.ell(g, 0.36, 0.3, 0.16, 0.13); D.ell(g, 0.3, 0.44, 0.06, 0.06); g.strokeStyle = ink('#c8947a'); g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.36, 0.22); g.quadraticCurveTo(-0.6, 0.1, -0.55, 0.32); g.stroke(); g.fillStyle = ink('#2a1a1e'); D.ell(g, 0.42, 0.33, 0.025, 0.025); } },
  castoroides: { w: 2.0, h: 1.0, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#6a4a32'); D.ell(g, 0, 0.42, 0.7, 0.38); D.ell(g, 0.68, 0.48, 0.26, 0.22); g.fillStyle = ink('#3a2a22'); D.ell(g, -0.82, 0.18, 0.3, 0.1); g.fillStyle = ink('#e0a24a'); D.rect(g, 0.86, 0.3, 0.08, 0.14); eye(g, ink, D, 0.75, 0.55, 0.035); } },
  hare: { w: 1.0, h: 0.9, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#b89a72'); D.ell(g, 0, 0.3, 0.3, 0.2); D.ell(g, 0.28, 0.42, 0.13, 0.12); P2.fillLeaf(g, 0.26, 0.5, 0.32, 1.9, 0.3); D.ell(g, -0.28, 0.32, 0.07, 0.07); g.fillStyle = ink('#2a1a1e'); D.ell(g, 0.33, 0.45, 0.025, 0.025); } },
  tortoise: { w: 1.2, h: 0.7, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#7a8a5a'); D.ell(g, 0.5, 0.18, 0.13, 0.1); g.fillStyle = ink('#8a6a3a'); g.beginPath(); g.ellipse(0, 0.12, 0.45, 0.42, 0, Math.PI, 0, true); g.fill(); g.strokeStyle = ink('#5a4a2a', 'print'); g.lineWidth = 0.03; for (const x of [-0.2, 0.05, 0.28]) { g.beginPath(); g.arc(x, 0.3, 0.1, 0, 6.283); g.stroke(); } } },
  hyracotherium: { w: 1.6, h: 1.2, draw: (g, ink, D, P2, C) => { legs(g, ink, D, '#6a4a32', [-0.35, -0.22, 0.25, 0.38], 0.4, 0.07); g.fillStyle = ink('#9a7048'); D.ell(g, 0, 0.62, 0.48, 0.2); P2.fillLimb(g, 0.38, 0.7, 0.55, 0.9, 0.62, 0.98, 0.14, 0.1); D.ell(g, 0.68, 0.95, 0.16, 0.1); g.fillStyle = ink('#ead9b8', 'print'); for (let k = 0; k < 4; k++) D.rect(g, -0.3 + k * 0.15, 0.55, 0.05, 0.18); eye(g, ink, D, 0.68, 1.0, 0.025); } },
};

// the flora of the Paleogene to the Quaternary, in the clearings outside the stakes
export const PLANTS = {
  treeFern: { w: 3.0, h: 4.2, draw: (g, ink, D, P2) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.15, 0, 0.3, 2.8, 0.06); for (let k = 0; k < 9; k++) { const a = -2.6 + k * 0.4; g.fillStyle = ink(k % 2 ? '#5a7a32' : '#6a8a3a'); P2.fillLeaf(g, 0, 2.8, 1.5, a + Math.PI, 0.25); } } },
  cycad: { w: 2.6, h: 2.2, draw: (g, ink, D, P2) => { g.fillStyle = ink('#7a5a32'); D.poly(g, [[-0.35, 0], [0.35, 0], [0.25, 0.8], [-0.25, 0.8]]); for (let k = 0; k < 9; k++) { g.fillStyle = ink(k % 2 ? '#4a6a2a' : '#6a8a32'); P2.fillLeaf(g, 0, 0.8, 1.2, Math.PI / 2 + (k - 4) * 0.32, 0.22); } g.fillStyle = ink('#c86a2a'); D.ell(g, 0, 0.9, 0.18, 0.2); } },
  ginkgo: { w: 3.2, h: 4.6, draw: (g, ink, D, P2) => { g.fillStyle = ink('#5a3a22'); D.rect(g, -0.13, 0, 0.26, 2.2); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, r = 0.5 + (k % 3) * 0.35; g.fillStyle = ink(k % 3 ? '#e0c040' : '#c8a830'); D.poly(g, [[Math.cos(a) * r * 0.5, 2.9 + Math.sin(a) * r * 0.9], [Math.cos(a) * r * 1.3 + 0.3, 3.1 + Math.sin(a) * r], [Math.cos(a) * r * 1.3 - 0.3, 3.1 + Math.sin(a) * r]]); } D.ell(g, 0, 3.1, 1.1, 1.2); } },
  palm: { w: 3.4, h: 5.0, draw: (g, ink, D, P2) => { g.fillStyle = ink('#8a6a42'); D.poly(g, [[-0.2, 0], [0.2, 0], [0.14, 3.8], [-0.1, 3.8]]); g.fillStyle = ink('#6a4a2a', 'print'); for (let k = 0; k < 9; k++) D.rect(g, -0.18, 0.3 + k * 0.38, 0.34, 0.05); for (let k = 0; k < 7; k++) { g.fillStyle = ink(k % 2 ? '#4a7a32' : '#5a8a3a'); P2.fillLeaf(g, 0, 3.8, 1.6, Math.PI / 2 + (k - 3) * 0.55, 0.22); } } },
  horsetail: { w: 1.6, h: 2.6, draw: (g, ink, D) => { for (let k = 0; k < 5; k++) { const x = -0.5 + k * 0.25, h = 1.6 + (k % 3) * 0.4; g.fillStyle = ink('#6a8a3a'); D.rect(g, x - 0.05, 0, 0.1, h); g.fillStyle = ink('#3a4a22', 'print'); for (let j = 1; j < 6; j++) D.rect(g, x - 0.12, j * h / 6, 0.24, 0.04); g.fillStyle = ink('#8a6a3a'); D.ell(g, x, h + 0.08, 0.07, 0.14); } } },
};

// ---- the herds: where each kind lives, how it moves (paper-life critter behaviours), how many --------------------
// homes in world units; roam in hero heights (the kit's unit)
export const HERDS = [
  // élevage: the goats and sheep in the wattle fold south-west of the gate, the pigs in their sty, the hens round the coop
  { kind: 'goat', at: [[-18.6, 10.4], [-16.2, 11.6], [-17.4, 12.6]], behaviour: 'graze', roam: 0.45, scale: 1.0 },
  { kind: 'sheep', at: [[-15.6, 10.2], [-19.0, 12.2], [-17.0, 9.6]], behaviour: 'graze', roam: 0.45, scale: 1.0 },
  { kind: 'pig', at: [[-26.4, 5.8], [-24.8, 7.0]], behaviour: 'graze', roam: 0.35, scale: 0.95 },
  { kind: 'hen', at: [[20.0, -1.6], [21.6, -1.2], [22.4, -2.6], [19.4, -0.2], [21.0, 0.2]], behaviour: 'peck', roam: 0.5, scale: 1.0, speed: 0.5 },
  { kind: 'dog', at: [[3.0, 2.2]], behaviour: 'pet', roam: 1.2, scale: 1.0 },
  // the wild beasts live in wild.js (roles: predators, defenders, flyers, lurkers, the shy ones)
];

// ---- the workshops and the folds: pieces drawn as cards ---------------------------------------------------------------
export const PIECES = {
  // a hurdle of the fold: woven withies between stakes, a little higher at the ends
  hurdle: { w: 3.6, h: 1.4, draw: (g, ink, D) => { g.fillStyle = ink('#a8885a'); D.rect(g, -1.6, 0.05, 3.2, 1.0, 0.08); g.strokeStyle = ink('#7a5a32', 'print'); g.lineWidth = 0.07; for (let y = 0.15; y < 1.05; y += 0.17) { g.beginPath(); for (let x = -1.6; x <= 1.6; x += 0.1) g.lineTo(x, y + Math.sin(x * 7 + y * 11) * 0.04); g.stroke(); } g.fillStyle = ink('#5a3a22'); for (let k = 0; k < 5; k++) D.rect(g, -1.65 + k * 0.8 - 0.05, 0, 0.1, 1.25); } },
  // the coop: a little hut of wattle on four stilts, a thatched roof, a ladder of rungs for the hens, nest boxes
  coop: { w: 4.2, h: 4.4, draw: (g, ink, D) => { g.fillStyle = ink('#5a3a22'); for (const x of [-1.4, -0.5, 0.5, 1.4]) D.rect(g, x - 0.08, 0, 0.16, 1.5); g.fillStyle = ink('#a8885a'); D.rect(g, -1.6, 1.4, 3.2, 1.5, 0.08); g.strokeStyle = ink('#7a5a32', 'print'); g.lineWidth = 0.07; for (let y = 1.55; y < 2.9; y += 0.18) { g.beginPath(); g.moveTo(-1.6, y); g.lineTo(1.6, y); g.stroke(); } g.fillStyle = ink('#2a1a1e'); D.ell(g, 0.6, 2.0, 0.3, 0.36); g.fillStyle = ink('#c8a050'); D.poly(g, [[-2.0, 2.8], [2.0, 2.8], [0.2, 4.3]]); g.fillStyle = ink('#a8802a', 'print'); for (let k = 0; k < 8; k++) D.rect(g, -1.7 + k * 0.45, 2.85, 0.05, 0.5); g.fillStyle = ink('#7a4a2a'); D.poly(g, [[0.25, 1.65], [0.45, 1.65], [1.7, 0], [1.5, 0]]); g.fillStyle = ink('#c8a870', 'print'); for (let k = 0; k < 5; k++) { const t = (k + 0.5) / 5; D.rect(g, 0.35 + 1.25 * t - 0.15, 1.65 - 1.65 * t, 0.3, 0.05); } g.fillStyle = ink('#c8a050'); D.rect(g, -1.4, 1.55, 0.8, 0.35, 0.05); g.fillStyle = ink('#f4ecdc'); D.ell(g, -1.15, 1.85, 0.08, 0.1); D.ell(g, -0.9, 1.85, 0.08, 0.1); } },
  // the sty: a low lean-to of branches over a muddy wallow
  sty: { w: 4.8, h: 2.6, draw: (g, ink, D) => { g.fillStyle = ink('#6a4a32'); D.ell(g, 0.1, 0.25, 1.7, 0.25); g.fillStyle = ink('#5a3a22'); for (const x of [-1.6, 1.6]) D.rect(g, x - 0.08, 0, 0.16, 1.6); g.fillStyle = ink('#8a6a3a'); D.poly(g, [[-1.9, 1.5], [1.9, 1.9], [1.9, 2.25], [-1.9, 1.85]]); g.fillStyle = ink('#7a8a4a', 'print'); for (let k = 0; k < 9; k++) D.rect(g, -1.8 + k * 0.42, 1.6 + k * 0.04, 0.2, 0.3); } },
  // the knapper's bench: a squared stone anvil, a hide with finished hand-axes and blades laid out, a basket of nodules
  flintBench: { w: 5.2, h: 1.8, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#7a5a3a'); D.rect(g, -2.45, 0, 4.95, 0.12, 0.04); g.fillStyle = ink('#a0683e'); D.poly(g, [[-2.4, 0], [-0.2, 0], [-0.4, 0.55], [-2.2, 0.6]]); g.fillStyle = ink(C.stone); for (const [x, s] of [[-1.9, 1], [-1.3, 0.8], [-0.75, 1.1]]) D.poly(g, [[x - 0.18 * s, 0.32], [x + 0.18 * s, 0.32], [x, 0.75 * s]]); g.fillStyle = ink('#e0a24a'); D.poly(g, [[-1.6, 0.25], [-1.05, 0.3], [-1.3, 0.42]]); g.fillStyle = ink('#6a6480'); D.poly(g, [[0.1, 0], [1.3, 0], [1.2, 0.75], [0.2, 0.8]]); g.fillStyle = ink(C.stoneB); D.poly(g, [[0.2, 0.8], [1.2, 0.75], [1.05, 0.9], [0.35, 0.95]]); g.fillStyle = ink('#8a6a3a'); D.poly(g, [[1.6, 0], [2.4, 0], [2.5, 0.9], [1.5, 0.9]]); g.fillStyle = ink(C.stone); for (let k = 0; k < 4; k++) D.ell(g, 1.7 + k * 0.22, 1.0 + (k % 2) * 0.08, 0.16, 0.13); g.fillStyle = ink('#7a5a32', 'print'); for (let k = 0; k < 3; k++) D.rect(g, 1.55, 0.2 + k * 0.25, 0.9, 0.04); } },
  // the heat pit where flint is baked before knapping, a ring of stones and a few glowing nodules
  heatPit: { w: 2.4, h: 0.9, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#3a2a2a'); D.ell(g, 0, 0.25, 1.0, 0.25); g.fillStyle = ink(C.stone); for (let k = 0; k < 7; k++) D.ell(g, -0.95 + k * 0.32, 0.22 + Math.sin(k) * 0.05, 0.18, 0.16); g.fillStyle = ink('#f08a3a'); D.ell(g, -0.2, 0.42, 0.12, 0.08); D.ell(g, 0.25, 0.4, 0.1, 0.07); } },
  // the woodcutters: a sawhorse with a log, a stacked woodpile between posts, a stump with the axe sunk in it
  sawhorse: { w: 3.6, h: 1.8, draw: (g, ink, D) => { g.fillStyle = ink('#5a3a22'); for (const s of [-1.2, 1.2]) { D.poly(g, [[s - 0.45, 0], [s - 0.3, 0], [s + 0.3, 1.1], [s + 0.15, 1.15]]); D.poly(g, [[s + 0.45, 0], [s + 0.3, 0], [s - 0.3, 1.1], [s - 0.15, 1.15]]); } g.fillStyle = ink('#7a4a2a'); D.rect(g, -1.7, 0.95, 3.4, 0.45, 0.2); g.fillStyle = ink('#e0b080'); D.ell(g, 1.65, 1.17, 0.16, 0.22); g.fillStyle = ink('#5a3a22', 'print'); for (let k = 0; k < 5; k++) D.rect(g, -1.5 + k * 0.6, 1.15, 0.35, 0.04); } },
  woodpile: { w: 3.6, h: 2.4, draw: (g, ink, D) => { g.fillStyle = ink('#4a2e1c'); D.rect(g, -1.5, 0, 3.0, 2.05, 0.06); g.fillStyle = ink('#5a3a22'); for (const s of [-1.5, 1.5]) D.rect(g, s - 0.08, 0, 0.16, 2.2); for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) { g.fillStyle = ink(k % 2 ? '#e0b080' : '#d0a070'); D.ell(g, -1.25 + k * 0.42 + (r % 2) * 0.2, 0.22 + r * 0.38, 0.19, 0.18); g.fillStyle = ink('#a07040', 'print'); D.ell(g, -1.25 + k * 0.42 + (r % 2) * 0.2, 0.22 + r * 0.38, 0.06, 0.06); } } },
  stumpAxe: { w: 1.8, h: 1.8, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#7a4a2a'); D.rect(g, -0.55, 0, 1.1, 0.75, 0.12); g.fillStyle = ink('#e0b080'); D.ell(g, 0, 0.75, 0.55, 0.13); g.fillStyle = ink('#5a3a22'); D.poly(g, [[0.05, 0.8], [0.2, 0.8], [0.75, 1.7], [0.6, 1.75]]); g.fillStyle = ink(C.stone); D.poly(g, [[-0.15, 0.7], [0.3, 0.72], [0.25, 1.0], [-0.1, 0.95]]); } },
  // the quarry: a split face marked with ochre, wedges and a lever, a sledge with a cut block
  quarrySledge: { w: 4.4, h: 2.2, draw: (g, ink, D, P2, C) => { g.fillStyle = ink('#7a4a2a'); D.poly(g, [[-1.9, 0.1], [1.7, 0.1], [2.0, 0.35], [-1.7, 0.4]]); g.fillStyle = ink(C.stone); D.rect(g, -1.3, 0.4, 2.2, 1.2, 0.08); g.fillStyle = ink(C.stoneB); D.rect(g, -1.3, 1.5, 2.2, 0.15, 0.04); g.fillStyle = ink('#c84a2a', 'print'); D.rect(g, -0.2, 0.5, 0.06, 1.0); g.fillStyle = ink('#c8a870'); g.strokeStyle = ink('#c8a870'); g.lineWidth = 0.07; g.beginPath(); g.moveTo(1.9, 0.3); g.quadraticCurveTo(2.2, 0.8, 2.1, 1.4); g.stroke(); g.fillStyle = ink('#5a3a22'); D.poly(g, [[-2.1, 0.4], [-1.95, 0.35], [-1.0, 2.1], [-1.15, 2.15]]); } },
  // the hides: a scraping beam leaning on a trestle, a tanning pit of bark water with a hide soaking
  scrapeBeam: { w: 3.6, h: 1.8, draw: (g, ink, D) => { g.fillStyle = ink('#5a3a22'); D.poly(g, [[-1.6, 0], [-1.45, 0], [1.5, 1.5], [1.35, 1.6]]); D.rect(g, 0.9, 0, 0.14, 1.2); g.fillStyle = ink('#b8885a'); D.poly(g, [[-0.6, 0.5], [0.9, 1.25], [0.75, 0.55], [-0.4, 0.15]]); g.fillStyle = ink('#c8c0dc'); D.ell(g, 0.15, 0.95, 0.18, 0.08); } },
  tanPit: { w: 2.8, h: 0.9, draw: (g, ink, D) => { g.fillStyle = ink('#5a3a22'); D.ell(g, 0, 0.3, 1.25, 0.3); g.fillStyle = ink('#7a4a2a'); D.ell(g, 0, 0.32, 1.05, 0.2); g.fillStyle = ink('#a0683e'); D.poly(g, [[-0.5, 0.35], [0.4, 0.38], [0.6, 0.62], [-0.3, 0.6]]); } },
  // the drying and smoking racks: strips of meat and fish over a smouldering fire under a hide roof
  smokeRack: { w: 4.2, h: 3.4, draw: (g, ink, D) => { g.fillStyle = ink('#4a3a32'); D.rect(g, -1.8, 0, 3.6, 0.1, 0.03); g.fillStyle = ink('#5a3a22'); for (const s of [-1.7, 1.7]) D.rect(g, s - 0.09, 0, 0.18, 2.8); for (const y of [1.6, 2.2]) D.rect(g, -1.8, y, 3.6, 0.1); g.fillStyle = ink('#8a5a3a'); D.poly(g, [[-2.1, 2.7], [2.1, 2.7], [1.7, 3.3], [-1.7, 3.3]]); for (let k = 0; k < 7; k++) { g.fillStyle = ink(k % 2 ? '#a83a2a' : '#c8b090'); D.poly(g, [[-1.5 + k * 0.48, 2.2], [-1.3 + k * 0.48, 2.2], [-1.35 + k * 0.48, 1.7], [-1.45 + k * 0.48, 1.7]]); } for (let k = 0; k < 6; k++) { g.fillStyle = ink('#8f8aa0'); D.ell(g, -1.3 + k * 0.52, 1.36, 0.1, 0.3); } g.fillStyle = ink('#3a2a2a'); D.ell(g, 0, 0.18, 0.9, 0.18); g.fillStyle = ink('#f08a3a'); D.ell(g, 0, 0.28, 0.35, 0.12); } },
  // the kitchen: a quern of two stones with its grain, a clay dome oven, a cooking pit with stones heating
  quern: { w: 2.4, h: 1.0, draw: (g, ink, D, P2, C) => { g.fillStyle = ink(C.stone); D.poly(g, [[-1.0, 0], [1.0, 0], [0.9, 0.4], [-0.9, 0.45]]); g.fillStyle = ink(C.stoneB); D.ell(g, 0.1, 0.6, 0.45, 0.2); g.fillStyle = ink('#e0c070', 'print'); for (let k = 0; k < 8; k++) D.ell(g, -0.8 + k * 0.1, 0.42, 0.05, 0.03); g.fillStyle = ink('#c8a050'); D.ell(g, 0.9, 0.55, 0.25, 0.35); } },
  oven: { w: 2.8, h: 2.2, draw: (g, ink, D) => { g.fillStyle = ink('#b8683a'); g.beginPath(); g.ellipse(0, 0, 1.2, 1.7, 0, Math.PI, 0, true); g.fill(); g.fillStyle = ink('#9a5030', 'print'); for (let k = 0; k < 4; k++) D.rect(g, -1.0, 0.3 + k * 0.35, 2.0, 0.05); g.fillStyle = ink('#2a1a1e'); g.beginPath(); g.ellipse(0, 0, 0.45, 0.6, 0, Math.PI, 0, true); g.fill(); g.fillStyle = ink('#f08a3a'); D.ell(g, 0, 0.12, 0.25, 0.1); g.fillStyle = ink('#3a2a2a'); D.ell(g, 0.4, 1.68, 0.15, 0.06); } },
  // the potter: pots drying on a plank, a lump of clay, a pit kiln covered in sherds
  pottery: { w: 5.0, h: 1.9, draw: (g, ink, D) => { g.fillStyle = ink('#6a5a44'); D.rect(g, -2.2, 0, 4.6, 0.12, 0.04); g.fillStyle = ink('#7a4a2a'); D.rect(g, -2.1, 0.5, 2.4, 0.12, 0.04); for (const s of [-1.6, 1.6]) D.rect(g, s / 1.6 * 1.0 - 1.0 - 0.06, 0, 0.12, 0.5); for (const [x, s, c] of [[-1.8, 0.8, '#c8946a'], [-1.25, 1, '#b8845a'], [-0.6, 0.9, '#d0a07a'], [-0.1, 0.7, '#c08a62']]) { g.fillStyle = ink(c); D.ell(g, x, 0.62 + 0.3 * s, 0.22 * s, 0.3 * s); D.rect(g, x - 0.1 * s, 0.85 + 0.3 * s, 0.2 * s, 0.12 * s, 0.03); } g.fillStyle = ink('#9a6a4a'); D.ell(g, 1.0, 0.2, 0.35, 0.22); g.fillStyle = ink('#3a2a2a'); D.ell(g, 1.75, 0.3, 0.6, 0.3); g.fillStyle = ink('#a0583a'); for (let k = 0; k < 5; k++) D.poly(g, [[1.25 + k * 0.22, 0.35], [1.45 + k * 0.22, 0.38], [1.35 + k * 0.22, 0.65]]); g.fillStyle = ink('#f08a3a', 'print'); D.ell(g, 1.75, 0.3, 0.15, 0.06); } },
  // the stores: baskets of roots and nuts, bundles of reeds
  baskets: { w: 3.4, h: 1.4, draw: (g, ink, D) => { for (const [x, s, c] of [[-1.1, 1, '#c89a5a'], [0, 1.15, '#b88a4a'], [1.1, 0.9, '#d0a868']]) { g.fillStyle = ink(c); D.poly(g, [[x - 0.45 * s, 0], [x + 0.45 * s, 0], [x + 0.55 * s, 0.8 * s], [x - 0.55 * s, 0.8 * s]]); g.fillStyle = ink('#8a6a3a', 'print'); for (let k = 0; k < 3; k++) D.rect(g, x - 0.5 * s, 0.2 * s + k * 0.22 * s, s, 0.04); g.fillStyle = ink(x < 0 ? '#7a4a2a' : x > 0.5 ? '#c84a2a' : '#e0c070'); for (let k = 0; k < 4; k++) D.ell(g, x - 0.3 * s + k * 0.2 * s, 0.85 * s, 0.11 * s, 0.1 * s); } } },
};
