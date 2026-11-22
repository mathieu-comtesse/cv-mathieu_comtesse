// THALEOLITHIC · papier : les fenêtres sont imprimées sur le papier même du village. La feuille est celle des cartes de la
// scène (paperSheet avec les réglages du harness : stock #f6ecdc, graine 4, fibres 1.5, marbrure 0.08) et chaque fenêtre
// est une carte tirée par printCard, comme une hutte ou un pin : contour découpé à la main (roughen), filet encré à la
// main, bord de coupe (P.rim : trait brun et lumière sur les bords éclairés), fibre multipliée par-dessus l'impression.
// Les petits éléments refaits à chaque rendu (boutons, cartes à choix) prennent la même feuille en tuile.
import { paperSheet, printCard, roughen, shape, rng } from './papercraft/lib/paperkit-2d.js';

const sheet = paperSheet({ size: 512, color: '#f6ecdc', seed: 4, fibres: 1.5, mottle: 0.08 });

// the sheet printed in one colour (multiplied, as on the cards), as a seamless tile for CSS
function tile(color) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = 'multiply'; g.drawImage(sheet, 0, 0);
  return `url(${c.toDataURL('image/jpeg', 0.92)})`;
}
export function installTiles(root = document.documentElement) {
  const inks = { page: '#fbf1de', card: '#fdf6e8', kraft: '#ead6b2', slip: '#fbe3b4', accent: '#b8432f', sage: '#edf0d2' };
  for (const [name, color] of Object.entries(inks)) root.style.setProperty(`--${name}-t`, tile(color));
}

// a line inked by hand: shared corners jittered, a small bulge per segment, a faint bleed under the stroke
function ink(g, corners, width, alpha, r) {
  const pts = [];
  for (let i = 0; i < corners.length; i++) {          // every side, the closing one included
    const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % corners.length], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 36));
    for (let j = 0; j < n; j++) pts.push([ax + (bx - ax) * j / n + (r() - 0.5) * 0.9, ay + (by - ay) * j / n + (r() - 0.5) * 0.9]);
  }
  pts.push(pts[0]);
  const path = new Path2D(); path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], b = (r() - 0.5) * 0.05;
    path.quadraticCurveTo((ax + bx) / 2 - (by - ay) * b, (ay + by) / 2 + (bx - ax) * b, bx, by);
  }
  g.save(); g.strokeStyle = '#2a1a1e'; g.lineCap = g.lineJoin = 'round';
  for (const [a, k] of [[alpha * 0.14, 3.2], [alpha, 1]]) { g.globalAlpha = a; g.lineWidth = width * k; g.stroke(path); }
  g.restore();
}
// the atlas frame: an outer neatline and a thinner inner rule
function neatline(P, w, h, r) {
  for (const [inset, alpha, width] of [[9, 0.66, 1.15], [12.5, 0.34, 0.7]]) {
    const x0 = -w / 2 + inset, x1 = w / 2 - inset, y0 = inset, y1 = h - inset;
    ink(P.g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], width, alpha, r);
  }
}

/**
 * Print `el` as a card of the village: a canvas behind its content, redrawn when its size changes (each size is
 * drawn once, then kept). frame: the atlas neatline; tear: how irregular the scissor cut is.
 */
export function paperize(el, { seed = 1, color = '#fbf1de', frame = false, tear = 1 } = {}) {
  let face = document.createElement('canvas'), size = '', queued = false;
  const cache = new Map();
  face.className = 'face'; face.setAttribute('aria-hidden', 'true'); el.prepend(face); el.classList.add('printed');
  const draw = () => {
    queued = false;
    const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
    const key = w + 'x' + h; if (key === size) return; size = key;
    let card = cache.get(key);
    if (!card) {
      const r = rng(seed * 7919 + w * 31 + h), amp = 1.1 * tear;
      const pts = roughen(shape.rect(w - 2 * amp, h - 2 * amp).map(([x, y]) => [x, y + amp]), r, { amp, step: 3, period: 16, tear: 0.45 * tear, keepBase: false });
      card = printCard(pts, { pxPerUnit: Math.min(1.5, devicePixelRatio || 1), sheet, seed, maxPx: 4096, paint: (P) => { P.fill(color); if (frame) neatline(P, w, h, r); P.rim({ width: 2.2 }); } });
      if (cache.size > 10) cache.delete(cache.keys().next().value);
      cache.set(key, card);
    }
    const b = card.box, cv = document.createElement('canvas');
    cv.width = card.canvas.width; cv.height = card.canvas.height; cv.getContext('2d').drawImage(card.canvas, 0, 0);
    cv.className = 'face'; cv.setAttribute('aria-hidden', 'true');
    Object.assign(cv.style, { left: (b.x0 + w / 2) + 'px', top: (h - b.y1) + 'px', width: b.w + 'px', height: b.h + 'px' });
    face.replaceWith(cv); face = cv;
  };
  new ResizeObserver(() => { if (!queued) { queued = true; requestAnimationFrame(draw); } }).observe(el);
  draw();
}
