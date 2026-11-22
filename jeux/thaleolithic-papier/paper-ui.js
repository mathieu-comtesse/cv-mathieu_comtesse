// THALEOLITHIC · papier : les fenêtres sont des assemblages de papier découpé, imprimés avec le kit du village (la même
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

// ---- ornaments, printed once and reused --------------------------------------------------------------------------------
const ORN = {};
function ornament(name) {
  if (ORN[name]) return ORN[name];
  const k = K() * 2, r = rng(name.length * 977);
  const trace = (draw, w, h) => shape.fromDrawing((g) => { g.fillStyle = g.strokeStyle = '#fff'; draw(g); }, { w, h, res: 6 });
  let card;
  if (name === 'bone') {             // a knobbly cut-paper bone, 60 px long
    const pts = trace((g) => { g.fillRect(-22, 6, 44, 8); for (const [x, y] of [[-24, 6.5], [-24, 13.5], [24, 6.5], [24, 13.5]]) { g.beginPath(); g.arc(x, y, 5.2, 0, 7); g.fill(); } }, 64, 20);
    card = print(cut(pts, r, 0.6), COL.bone, 31, (P) => { P.g.fillStyle = 'rgba(160,120,70,.35)'; P.g.fillRect(-18, 9, 36, 2); }, k);
  } else if (name === 'flint') {     // a shard of flint with two facets, stuck in like a pin
    const pts = [[0, 0], [7, 14], [5, 30], [-2, 40], [-8, 26], [-6, 12]];
    card = print(cut(pts, r, 0.5), '#8f8aa0', 37, (P) => { const g = P.g; g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(-2, 40); g.lineTo(-1, 20); g.lineTo(-6, 12); g.lineTo(-8, 26); g.fill(); g.fillStyle = 'rgba(40,20,50,.25)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(7, 14); g.lineTo(-1, 20); g.fill(); }, k);
  } else if (name === 'tusk') {      // a curling mammoth tusk
    const pts = trace((g) => { g.lineCap = 'round'; for (let i = 0; i < 26; i++) { const t = i / 25, a = -0.4 + t * 3.6, R = 20 - t * 12; g.lineWidth = 9 - t * 6.5; g.beginPath(); g.arc(0, 25, R, a, a + 0.2); g.stroke(); } }, 54, 52);
    card = print(cut(pts, r, 0.5), '#efe2c0', 41, (P) => { const g = P.g; g.strokeStyle = 'rgba(150,110,60,.4)'; g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(0, 25, 20 - i * 1.7, 0.2 + i * 0.4, 0.5 + i * 0.4); g.stroke(); } }, k);
  } else if (name === 'bead-r' || name === 'bead-o' || name === 'bead-s') {
    const pts = blob(11, 13, r, { amp: 0.8, lobes: 3 });
    card = print(pts, { 'bead-r': COL.blood, 'bead-o': COL.ochre, 'bead-s': '#6f7fb0' }[name], 43, (P) => { const g = P.g; g.fillStyle = 'rgba(255,240,210,.5)'; g.beginPath(); g.ellipse(-2, 9, 2, 1.4, 0, 0, 7); g.fill(); }, k);
  } else if (name === 'feather') {   // a crimson feather with ochre barbs
    const pts = trace((g) => { g.beginPath(); g.ellipse(0, 22, 7, 22, 0, 0, 7); g.fill(); g.fillRect(-1, 0, 2, 4); }, 16, 46);
    card = print(cut(pts, r, 1.4), '#c8402e', 47, (P) => { const g = P.g; g.strokeStyle = '#e0a24a'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 6 + i * 4); g.lineTo(i % 2 ? 6 : -6, 10 + i * 4); g.stroke(); } g.strokeStyle = '#4a2c24'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 1); g.lineTo(0, 42); g.stroke(); }, k);
  }
  return (ORN[name] = card);
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
  sheet: { back: COL.blood, pink: COL.ochre, color: COL.page, amp: 12, stitch: true, orn: ['bone', 'flint', 'tusk', 'beads', 'feather'] },
  hud: { back: COL.plum, pink: COL.ochre, color: COL.page, amp: 8, stitch: true, cords: true, orn: ['flint'] },
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
  for (const o of st.orn || []) {
    const big = st === STYLES.sheet ? 1 : 0.62;
    if (o === 'bone') place(g, ornament('bone'), M + 10 * big, M + 18 * big, -0.7, 1.9 * big);
    if (o === 'flint') place(g, ornament('flint'), W - M - 26 * big, M + 10 * big, 0.45, 1.6 * big);
    if (o === 'tusk') place(g, ornament('tusk'), W - M - 6, H - M + 14, 0.25, 1.8 * big);
    if (o === 'feather') place(g, ornament('feather'), W - M + 8, M + 86, 0.95, 1.8 * big);
    if (o === 'beads') { const x = M + 34, y = H - M - 4; cord(g, x, y - 16, x - 6, y + 56); ['bead-r', 'bead-o', 'bead-s'].forEach((b, i) => place(g, ornament(b), x - 1 - i * 2.2, y + 6 + i * 17, 0.12 * i, 1.5)); }
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
  let face = document.createElement('canvas'), size = '', queued = false;
  const cache = new Map();
  face.className = 'face'; el.prepend(face); el.classList.add('printed', 'p-' + style);
  const draw = () => {
    queued = false;
    if (quantize) el.style.minHeight = '';
    const w = el.offsetWidth; let h = el.offsetHeight; if (!w || !h) return;
    if (quantize) { const max = parseFloat(getComputedStyle(el).maxHeight) || 1e9; h = Math.min(max, Math.ceil(h / quantize) * quantize); el.style.minHeight = h + 'px'; }
    const key = w + 'x' + h; if (key === size) return; size = key;
    let made = cache.get(key);
    if (!made) { made = compose(w, h, seed, st, color); if (cache.size > 12) cache.delete(cache.keys().next().value); cache.set(key, made); }
    const cv = document.createElement('canvas'); cv.width = made.cv.width; cv.height = made.cv.height; cv.getContext('2d').drawImage(made.cv, 0, 0);
    cv.className = 'face'; cv.setAttribute('aria-hidden', 'true');
    Object.assign(cv.style, { left: -made.M + 'px', top: -made.M + 'px', width: w + 2 * made.M + 'px', height: h + 2 * made.M + 'px' });
    face.replaceWith(cv); face = cv;
  };
  const ro = new ResizeObserver(() => { if (!queued) { queued = true; requestAnimationFrame(draw); } });
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
