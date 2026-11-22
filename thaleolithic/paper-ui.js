// THALEOLITHIC papier : les fenêtres sont des assemblages de papier découpé, imprimés avec le kit du village (la même
// feuille paperSheet que les cartes de la scène, printCard et son bord de coupe P.rim). Chaque fenêtre empile un fond
// rouge sang aux bords bosselés, une bande ocre crantée aux ciseaux cranteurs et la feuille crème bosselée, cousue au
// point avant ; des ornements découpés s'y accrochent (un os en travers du coin, un éclat de silex planté comme une
// punaise, une défense de mammouth enroulée, des perles qui pendent) et des cordelettes la suspendent. Les petits
// éléments refaits à chaque rendu (boutons, cartes à choix) prennent la même feuille en tuile.
import { paperSheet, printCard, roughen, shape, rng } from './papercraft/lib/paperkit-2d.js';

const sheet = paperSheet({ size: 512, color: '#f6ecdc', seed: 4, fibres: 1.5, mottle: 0.08 });
const K = () => Math.min(1.5, devicePixelRatio || 1);
const COL = { page: '#fbf1de', card: '#fdf6e8', kraft: '#ead6b2', slip: '#fbe3b4', accent: '#b8432f', sage: '#e4e8c2', blood: '#9a3328', ochre: '#e0a24a', bone: '#f4e6c6', stone: '#a9a2bc', plum: '#7a3858', moss: '#a9b27a' };

// the sheet printed in one colour (multiplied, as on the cards), as a seamless tile for CSS
function tile(color) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = 'multiply'; g.drawImage(sheet, 0, 0);
  return `url(${c.toDataURL('image/jpeg', 0.92)})`;
}
export function installTiles(root = document.documentElement) {
  for (const [name, color] of Object.entries(COL)) root.style.setProperty(`--${name}-t`, tile(color));
  // stop-motion "boil": the cut letters and icons twitch between three poses, a few times a second
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { let n = 0; setInterval(() => { root.dataset.boil = String(n++ % 3); }, 240); }
}

// ---- outlines (shape units = CSS px, y up from the element's bottom edge) ----------------------------------------------
// a lumpy sheet: a boxy superellipse around w×h, each point pushed along its normal by a few slow waves
function blob(w, h, r, { amp = 6, lobes = 7, cx = 0, cy = 0 } = {}) {
  const n = Math.max(80, Math.round((w + h) / 3)), ph = [r() * 6.3, r() * 6.3, r() * 6.3], k = lobes + r() * 2, out = [];
  const P = (t) => { const c = Math.cos(t), s = Math.sin(t); return [cx + Math.sign(c) * Math.pow(Math.abs(c), 0.18) * w / 2, cy + h / 2 + Math.sign(s) * Math.pow(Math.abs(s), 0.18) * h / 2]; };
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, [x, y] = P(t), [x1, y1] = P(t + 0.01), [x0, y0] = P(t - 0.01);
    const tx = x1 - x0, ty = y1 - y0, L = Math.hypot(tx, ty) || 1, nx = ty / L, ny = -tx / L;
    const d = amp * (0.55 * Math.sin(k * t + ph[0]) + 0.3 * Math.sin(k * 2.3 * t + ph[1]) + 0.15 * Math.sin(3 * t + ph[2]));
    out.push([x + nx * d, y + ny * d]);
  }
  return out;
}
// pinking shears: the outline resampled and every other point pushed out, a zigzag of teeth
function pinked(pts, tooth) {
  const res = [], step = tooth / 2; let carry = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], L = Math.hypot(bx - ax, by - ay) || 1e-6, nx = (by - ay) / L, ny = -(bx - ax) / L;
    let s = carry; for (; s < L; s += step) res.push([ax + (bx - ax) * s / L, ay + (by - ay) * s / L, nx, ny]);
    carry = s - L;
  }
  return res.map(([x, y, nx, ny], i) => [x + nx * (i % 2) * tooth * 0.85, y + ny * (i % 2) * tooth * 0.85]);
}
const cut = (pts, r, tear = 1) => roughen(pts, r, { amp: 0.9 * tear, step: 3, period: 16, tear: 0.4 * tear, keepBase: false });
const print = (pts, color, seed, paint, k = K()) => printCard(pts, { pxPerUnit: k, sheet, seed, maxPx: 4096, paint: (P) => { P.fill(color); if (paint) paint(P); P.rim({ width: 2.2 }); } });

// a running stitch of waxed thread just inside an outline
function stitches(g, pts, inset, r) {
  g.save(); g.lineCap = 'round';
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
  const step = 7, path = new Path2D(); let acc = 0, on = true;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], L = Math.hypot(bx - ax, by - ay);
    const pull = (x, y) => { const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1; return [x + dx / d * inset, y + dy / d * inset]; };
    const [px, py] = pull(ax, ay), [qx, qy] = pull(bx, by);
    if (on) { path.moveTo(px, py); path.lineTo(qx, qy); }
    acc += L; if (acc > step) { acc = 0; on = !on; }
  }
  g.strokeStyle = 'rgba(42,26,30,.7)'; g.lineWidth = 1.6; g.stroke(path);
  g.strokeStyle = 'rgba(255,240,210,.55)'; g.lineWidth = 0.6; g.translate(-0.4, 0.4); g.stroke(path);
  g.restore();
}

// ---- ornaments: a whole family of bones, feathers, teeth, shells, flints and beads, each drawn from its own seed, so
// no two windows ever wear the same: different pieces, shapes, colours, places and tilts. Printed once per variant.
const ORN = {};
const FEATHER_COLS = [['#c8402e', '#e0a24a'], ['#2a1a1e', '#f4ecdc'], ['#6f7fb0', '#d8e0f0'], ['#e0a24a', '#7a3a1a'], ['#5a7a3a', '#e0c070'], ['#8a5a8a', '#f3c878'], ['#f4ecdc', '#3a2a3a']];
const BEAD_COLS = [COL.blood, COL.ochre, '#6f7fb0', '#2a1a1e', COL.bone, '#5a7a3a', '#c86a8a', '#d8d0e0'];
const KINDS = {
  femur: (g, r) => { const L = 18 + r() * 8; g.fillRect(-L, 6, 2 * L, 7 + r() * 3); for (const [x, y] of [[-L - 2, 6.5], [-L - 2, 13.5], [L + 2, 6.5], [L + 2, 13.5]]) { g.beginPath(); g.arc(x, y, 4.5 + r() * 1.5, 0, 7); g.fill(); } },
  rib: (g, r) => { g.lineCap = 'round'; g.lineWidth = 5 + r() * 2; g.beginPath(); g.arc(0, -12, 30 + r() * 8, 0.35 + r() * 0.2, 2.6 - r() * 0.3); g.stroke(); },
  jaw: (g, r) => { g.beginPath(); g.moveTo(-26, 4); g.quadraticCurveTo(0, -6, 24, 4); g.lineTo(26, 16); g.quadraticCurveTo(0, 8, -24, 14); g.closePath(); g.fill(); for (let k = 0; k < 7; k++) { const x = -18 + k * 6; g.beginPath(); g.moveTo(x - 2, 12 - (k % 3)); g.lineTo(x, 20 + r() * 3); g.lineTo(x + 2, 12 - (k % 3)); g.fill(); } },
  vertebra: (g, r) => { g.beginPath(); g.ellipse(0, 12, 9, 7, 0, 0, 7); g.fill(); for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { g.save(); g.translate(Math.cos(a) * 10, 12 + Math.sin(a) * 8); g.rotate(a); g.fillRect(0, -2.5, 8 + r() * 5, 5); g.restore(); } },
  antler: (g, r) => { g.lineCap = 'round'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(-22, 22); g.quadraticCurveTo(0, 18, 24, 0); const n = 3 + Math.floor(r() * 2); for (let k = 0; k < n; k++) { const t = 0.25 + k * 0.22, x = -22 + 46 * t, y = 22 - 22 * t; g.moveTo(x, y); g.lineTo(x + 4, y - 9 - r() * 6); } g.stroke(); },
  claw: (g, r) => { g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(-8, 22, 10 + r() * 4, 30); g.quadraticCurveTo(2, 18, 6, 0); g.closePath(); g.fill(); },
  teeth: (g, r) => { g.lineWidth = 1.6; g.beginPath(); g.moveTo(-28, 2); g.quadraticCurveTo(0, 14, 28, 2); g.stroke(); for (let k = 0; k < 7; k++) { const t = k / 6, x = -24 + 48 * t, y = 4 + 9 * Math.sin(t * Math.PI); g.beginPath(); g.moveTo(x - 2.4, y); g.quadraticCurveTo(x, y + 10 + r() * 5, x + 2.4, y); g.fill(); } },
  birdskull: (g) => { g.beginPath(); g.ellipse(-4, 12, 10, 9, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(4, 9); g.lineTo(26, 13); g.lineTo(4, 17); g.fill(); },
  fishbone: (g, r) => { g.lineCap = 'round'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-26, 12); g.lineTo(22, 12); for (let k = 0; k < 7; k++) { const x = -18 + k * 6; g.moveTo(x, 12); g.lineTo(x - 4, 4 - r() * 2); g.moveTo(x, 12); g.lineTo(x - 4, 20 + r() * 2); } g.stroke(); g.beginPath(); g.moveTo(22, 12); g.lineTo(30, 5); g.lineTo(30, 19); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-26, 12); g.lineTo(-34, 6); g.lineTo(-32, 12); g.lineTo(-34, 18); g.closePath(); g.fill(); },
  shell: (g, r) => { const n = 7 + Math.floor(r() * 4); g.beginPath(); g.moveTo(0, 0); for (let k = 0; k <= n; k++) { const a = Math.PI * (0.1 + 0.8 * k / n); g.lineTo(Math.cos(a) * 16, Math.sin(a) * 18); } g.closePath(); g.fill(); g.fillRect(-5, -4, 10, 5); },
  flint: (g, r) => { const pts = [[0, 0], [6 + r() * 3, 12], [5, 28 + r() * 6], [-2, 38 + r() * 6], [-8 - r() * 3, 24], [-6, 10]]; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); },
  tusk: (g, r) => { g.lineCap = 'round'; const turn = 2.6 + r() * 1.6; for (let i = 0; i < 26; i++) { const t = i / 25, a = -0.4 + t * turn, R = 20 - t * 11; g.lineWidth = 9 - t * 6.5; g.beginPath(); g.arc(0, 25, R, a, a + 0.2); g.stroke(); } },
};
const BONE_KINDS = ['femur', 'rib', 'jaw', 'vertebra', 'antler', 'claw', 'teeth', 'birdskull', 'fishbone'];
function ornament(name, v = 0) {
  const key = name + ':' + v; if (ORN[key]) return ORN[key];
  const k = K() * 2, r = rng(name.length * 977 + v * 7919 + 13);
  const trace = (draw, w, h) => shape.fromDrawing((g) => { g.fillStyle = g.strokeStyle = '#fff'; draw(g); }, { w, h, res: 6 });
  let card;
  if (name === 'feather') {   // long, broad, split or banded; in one of seven colourings
    const [c0, c1] = FEATHER_COLS[v % FEATHER_COLS.length], len = 18 + r() * 9, wid = 4 + r() * 5, form = v % 4;
    const pts = trace((g) => { g.beginPath(); g.ellipse(0, len, wid, len, 0, 0, 7); g.fill(); g.fillRect(-1, 0, 2, 4); if (form === 2) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(wid, len * 1.3); g.lineTo(0, len * 1.1); g.lineTo(wid, len * 1.0); g.fill(); g.globalCompositeOperation = 'source-over'; } }, wid * 2 + 4, len * 2 + 6);
    card = print(cut(pts, r, 1.4), c0, 47 + v, (P) => { const g = P.g; g.strokeStyle = c1; g.lineWidth = 1; const n = Math.round(len / 2.4); for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(0, 6 + i * (2 * len - 10) / n); g.lineTo(i % 2 ? wid - 1 : -wid + 1, 10 + i * (2 * len - 10) / n); g.stroke(); } if (form === 3) { g.fillStyle = c1; for (let i = 0; i < 3; i++) g.fillRect(-wid, len * (0.6 + i * 0.4), wid * 2, 2.5); } g.strokeStyle = '#4a2c24'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 1); g.lineTo(0, len * 2 - 2); g.stroke(); }, k);
  } else if (name.startsWith('bead')) {
    const pts = blob(9 + r() * 5, 11 + r() * 4, r, { amp: 0.8, lobes: 3 });
    card = print(pts, BEAD_COLS[v % BEAD_COLS.length], 43 + v, (P) => { const g = P.g; g.fillStyle = 'rgba(255,240,210,.5)'; g.beginPath(); g.ellipse(-2, 9, 2, 1.4, 0, 0, 7); g.fill(); }, k);
  } else {
    const col = name === 'flint' ? ['#8f8aa0', '#7a7488', '#a9a2bc', '#5a5470'][v % 4] : name === 'shell' ? ['#f4e6c6', '#e8c8b0', '#d8d0e0', '#f3c878'][v % 4] : ['#ead9b8', '#e2cfa6', '#f4ecdc', '#d8c4a0'][v % 4];
    const pts = trace((g) => { g.lineWidth = 4; KINDS[name](g, r); }, 74, 52);
    card = print(cut(pts, r, 0.6), col, 31 + v, (P) => { const g = P.g; g.strokeStyle = 'rgba(120,90,60,.35)'; g.lineWidth = 0.8; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-14 + i * 10, 6 + r() * 10); g.lineTo(-8 + i * 10, 8 + r() * 10); g.stroke(); } }, k);
  }
  return (ORN[key] = card);
}
// the set a sheet wears: from 3 to 5 pieces, no two alike, each anchored to its own spot round the edge
function ornamentSet(seed, big) {
  const r = rng(seed * 104729 + 7), spots = [['tl', -0.7], ['tr', 0.45], ['r', 0.95], ['br', 0.25], ['bl', -0.2], ['l', -1.1]].sort(() => r() - 0.5);
  const kinds = [...BONE_KINDS, 'feather', 'feather', 'shell', 'flint', 'tusk', 'beads'].sort(() => r() - 0.5), used = new Set(), out = [];
  const n = big ? 3 + Math.floor(r() * 3) : 2;
  for (const kind of kinds) { if (out.length >= n) break; if (used.has(kind) && kind !== 'feather') continue; used.add(kind); const [spot, a] = spots[out.length]; out.push({ kind, spot, a: a + (r() - 0.5) * 0.6, s: 1.4 + r() * 0.7, v: Math.floor(r() * 997) }); }
  return out;
}
// draw a printed card (its outline in its own units, y up) on a canvas at (x, y) in CSS px, rotated by a
function place(g, card, x, y, a = 0, s = 1) {
  const b = card.box, k = card.pxPerUnit;
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  g.drawImage(card.canvas, b.x0, -b.y1, b.w, b.h);
  g.restore();
  void k;
}
// a cord hanging from above the view to a point of the sheet
function cord(g, x0, y0, x1, y1) {
  g.save(); g.lineCap = 'round';
  g.strokeStyle = 'rgba(42,26,30,.75)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1); g.stroke();
  g.strokeStyle = 'rgba(234,217,184,.55)'; g.lineWidth = 0.8; g.setLineDash([2.5, 2.5]); g.stroke();
  g.restore();
}

// ---- composition --------------------------------------------------------------------------------------------------------
const STYLES = {
  // the big sheets: blood backing, pinked ochre, stitched cream, all the ornaments
  sheet: { back: COL.blood, pink: COL.ochre, color: COL.page, amp: 12, stitch: true, orn: true },
  hud: { back: COL.plum, pink: COL.ochre, color: COL.page, amp: 8, stitch: true, cords: true, orn: 'hud' },
  slip: { back: COL.blood, color: COL.bone, amp: 4 },
  tag: { color: COL.bone, amp: 2, cords: 'one' },
  pin: { color: COL.bone, amp: 2 },
};
function compose(w, h, seed, st, color) {
  const k = K(), M = 80, W = w + 2 * M, H = h + 2 * M, r = rng(seed * 7919 + w * 31 + h);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(W * k); cv.height = Math.ceil(H * k);
  const g = cv.getContext('2d'); g.scale(k, k);
  // shape units -> canvas: x + W/2, (h - y) + M
  const at = (card, dx = 0, dy = 0) => { const b = card.box; g.drawImage(card.canvas, b.x0 + W / 2 + dx, h - b.y1 + M + dy, b.w, b.h); };
  if (st.cords === true) { cord(g, w * 0.2 + M - 10, 0, w * 0.18 + M, M + 8); cord(g, w * 0.8 + M + 10, 0, w * 0.82 + M, M + 8); }
  if (st.cords === 'one') cord(g, W / 2, 0, W / 2, M + 6);
  if (st.back) at(print(cut(blob(w + 30, h + 30, r, { amp: st.amp + 3, lobes: 5, cy: -15 }), r, 1.4), st.back, seed + 1, null, Math.min(k, 1)), 5, 7);
  if (st.pink) at(print(pinked(blob(w + 12, h + 12, r, { amp: st.amp, cy: -6 }), 13), st.pink, seed + 2, null, Math.min(k, 1)));
  const main = cut(blob(w, h, r, { amp: st.amp }), r);
  at(print(main, color || st.color, seed, st.stitch ? (P) => stitches(P.g, main, 9, r) : null));
  if (st.cords && st.stitch) for (const x of [w * 0.18 + M, w * 0.82 + M]) { g.fillStyle = 'rgba(42,26,30,.8)'; g.beginPath(); g.arc(x, M + 9, 2.6, 0, 7); g.fill(); }
  if (st.orn) {
    const big = st === STYLES.sheet ? 1 : 0.62;
    const AT = { tl: [M + 10 * big, M + 18 * big], tr: [W - M - 26 * big, M + 10 * big], r: [W - M + 8, M + 86 + (h * 0.25)], br: [W - M - 6, H - M + 14], bl: [M + 30, H - M - 2], l: [M - 6, M + h * 0.5] };
    for (const o of (st.orn === 'hud' ? ornamentSet(seed, false).slice(0, 1) : ornamentSet(seed, big === 1))) {
      const [x, y] = AT[o.spot];
      if (o.kind === 'beads') { const n = 3 + (o.v % 3); cord(g, x, y - 16, x - 6, y + 20 + n * 17); for (let i = 0; i < n; i++) place(g, ornament('bead', o.v + i * 3), x - 1 - i * 2.2, y + 6 + i * 17, 0.12 * i, 1.5); }
      else place(g, ornament(o.kind, o.v), x, y, o.a, o.s * big);
    }
  }
  return { cv, M };
}

/**
 * Print `el` as a cut-paper construction behind its content, redrawn when its size changes (each size once, then
 * kept). style: sheet | hud | slip | tag. quantize: round the height up to steps, so a sheet whose text changes
 * reuses a few printed sizes instead of printing a new one at every change.
 */
export function paperize(el, { seed = 1, style = 'sheet', color = null, quantize = 0, watch = null } = {}) {
  const st = STYLES[style];
  let face = document.createElement('canvas'), size = '', queued = false, seedNow = seed;
  const cache = new Map();
  face.className = 'face'; el.prepend(face); el.classList.add('printed', 'p-' + style);
  const draw = () => {
    queued = false;
    if (quantize) el.style.minHeight = '';
    const w = el.offsetWidth; let h = el.offsetHeight; if (!w || !h) return;
    if (quantize) { const max = parseFloat(getComputedStyle(el).maxHeight) || 1e9; h = Math.min(max, Math.ceil(h / quantize) * quantize); el.style.minHeight = h + 'px'; }
    const key = w + 'x' + h; if (key === size) return; size = key;
    let made = cache.get(key);
    if (!made) { made = compose(w, h, seedNow, st, color); if (cache.size > 12) cache.delete(cache.keys().next().value); cache.set(key, made); }
    const cv = document.createElement('canvas'); cv.width = made.cv.width; cv.height = made.cv.height; cv.getContext('2d').drawImage(made.cv, 0, 0);
    cv.className = 'face'; cv.setAttribute('aria-hidden', 'true');
    Object.assign(cv.style, { left: -made.M + 'px', top: -made.M + 'px', width: w + 2 * made.M + 'px', height: h + 2 * made.M + 'px' });
    face.replaceWith(cv); face = cv;
  };
  const ro = new ResizeObserver(() => { if (!queued) { queued = true; requestAnimationFrame(draw); } });
  el.reseed = (s) => { seedNow = s; size = ''; cache.clear(); draw(); };   // a sheet that changes its ornaments (the panel, at each opening)
  ro.observe(el); if (watch) ro.observe(watch);   // watch: the content, so a held min-height can shrink back
  draw();
}

// titles cut out letter by letter: each letter its own scrap, tilted, and twitching between three poses (stop motion)
export function cutLetters(el, { chips = false } = {}) {
  if (!el || el.dataset.cut) return;
  const text = el.textContent, r = rng([...text].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7) || 1);
  const tints = ['ochre', 'moss', 'stone', 'bone', 'slip', 'sage'];
  el.dataset.cut = '1'; el.classList.add('cut'); if (chips) el.classList.add('chips'); el.textContent = '';
  for (const word of text.split(/(\s+)/)) {
    if (/^\s+$/.test(word)) { el.append(' '); continue; }
    const w = document.createElement('span'); w.className = 'w';
    for (const ch of word) {
      const s = document.createElement('span'); s.className = 'l'; s.textContent = ch;
      const v = (a) => (r() - 0.5) * a;
      s.style.cssText = `--a0:${v(10).toFixed(1)}deg;--a1:${v(10).toFixed(1)}deg;--a2:${v(10).toFixed(1)}deg;--y0:${v(4).toFixed(1)}px;--y1:${v(4).toFixed(1)}px;--y2:${v(4).toFixed(1)}px`;
      if (chips) s.style.setProperty('--chip', `var(--${tints[Math.floor(r() * tints.length)]}-t)`);
      w.append(s);
    }
    el.append(w);
  }
}
