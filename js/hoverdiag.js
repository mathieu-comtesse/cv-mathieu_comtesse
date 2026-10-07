/* Hover Image (ObsidianUI) adapté : au survol d'un projet pro, une vignette suit le curseur (échelle 0 → 1, 0,4 s) et affiche un schéma
 * « comment ça marche ». Les schémas sont empilés verticalement dans la vignette ; survoler un autre projet fait glisser la pile (yPercent = -100 × index).
 * Aucune dépendance : le suivi du curseur est un lissage exponentiel équivalent à gsap.quickTo(0,4 s, power3.out), calculé seulement pendant le survol. */
const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function wrap(t, max) { const w = t.split(' '), out = []; let l = ''; for (const x of w) { if ((l + ' ' + x).trim().length > max && l) { out.push(l); l = x; } else l = (l + ' ' + x).trim(); } if (l) out.push(l); return out.slice(0, 3); }

/** Schéma en serpentin : jusqu'à 3 étapes par ligne, flèches entre les étapes, retour à la ligne relié par un coude. */
export function diagramSVG(title, steps) {
  const W = 420, H = 270, P = 16, n = steps.length, perRow = n <= 3 ? n : Math.ceil(n / 2), rows = Math.ceil(n / perRow);
  const gap = 20, bw = (W - 2 * P - (perRow - 1) * gap) / perRow, top = 66, bh = rows === 1 ? 128 : 78, rgap = 26;
  const pos = steps.map((_, i) => { const r = (i / perRow) | 0, c = i % perRow; return { x: P + c * (bw + gap), y: top + r * (bh + rgap) }; });
  let g = `<defs><marker id="dgA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1.5L8 5L1 8.5" fill="none" stroke="var(--dg-ink)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`;
  g += `<text x="${P}" y="26" class="dg-k">COMMENT ÇA MARCHE</text><text x="${P}" y="46" class="dg-t">${esc(title)}</text>`;
  for (let i = 0; i < n - 1; i++) {
    const a = pos[i], b = pos[i + 1];
    if (a.y === b.y) g += `<path d="M${a.x + bw + 2} ${a.y + bh / 2}H${b.x - 3}" class="dg-a" marker-end="url(#dgA)"/>`;
    else { const y1 = a.y + bh, y2 = b.y; g += `<path d="M${a.x + bw / 2} ${y1 + 1}V${y1 + rgap / 2}H${b.x + bw / 2}V${y2 - 3}" class="dg-a" marker-end="url(#dgA)"/>`; }
  }
  steps.forEach(([label, sub], i) => {
    const { x, y } = pos[i], cx = x + bw / 2, lines = wrap(sub, Math.max(12, Math.floor(bw / 6.1)));
    g += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="12" class="dg-b"/><circle cx="${x + 15}" cy="${y + 15}" r="9" class="dg-n"/><text x="${x + 15}" y="${y + 18.5}" class="dg-nn">${i + 1}</text>`;
    g += `<text x="${cx}" y="${y + (rows === 1 ? 62 : 40)}" class="dg-l" text-anchor="middle">${esc(label)}</text>`;
    lines.forEach((ln, k) => { g += `<text x="${cx}" y="${y + (rows === 1 ? 82 : 55) + k * 13}" class="dg-s" text-anchor="middle">${esc(ln)}</text>`; });
  });
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="${NS}" role="img" aria-label="Schéma : ${esc(title)}">${g}</svg>`;
}

export function initHoverDiagrams(root, list) {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;       // pas de survol sur tactile
  const wrapEl = document.createElement('div'); wrapEl.className = 'hd-wrap'; wrapEl.setAttribute('aria-hidden', 'true');
  wrapEl.innerHTML = list.map((p) => `<div class="hd-thumb">${diagramSVG(p.title, p.diag)}</div>`).join('');
  document.body.append(wrapEl);
  const thumbs = [...wrapEl.querySelectorAll('.hd-thumb')];
  let tx = 0, ty = 0, x = 0, y = 0, shown = false, raf = 0, idx = 0;
  const loop = () => {
    const k = 1 - Math.pow(1 - 0.5, 1 / 6);                                   // ≈ 0,4 s pour rattraper le curseur (60 i/s)
    x += (tx - x) * k; y += (ty - y) * k;
    wrapEl.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${shown ? 1 : 0})`;
    if (shown || Math.abs(tx - x) > 0.3) raf = requestAnimationFrame(loop); else raf = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const show = (i) => { idx = i; wrapEl.style.setProperty('--hd-i', i); wrapEl.classList.add('on'); shown = true; kick(); };
  root.addEventListener('pointerover', (e) => { const c = e.target.closest('.pc'); if (c && c.dataset.i !== undefined && !e.target.closest('.is-drag')) show(+c.dataset.i); });
  root.addEventListener('pointermove', (e) => {
    if (root.classList.contains('is-drag')) { shown = false; wrapEl.classList.remove('on'); return; }
    const first = !shown && wrapEl.classList.contains('on'); tx = Math.min(Math.max(e.clientX, 226), innerWidth - 226); ty = Math.min(Math.max(e.clientY - 60, 150), innerHeight - 150);
    if (!raf) { x = tx; y = ty; }
    const c = e.target.closest('.pc'); if (c && +c.dataset.i !== idx) show(+c.dataset.i); else if (c && !shown) { shown = true; kick(); }
  });
  root.addEventListener('pointerleave', () => { shown = false; wrapEl.classList.remove('on'); kick(); });
  root.addEventListener('pointerdown', () => { shown = false; wrapEl.classList.remove('on'); kick(); });
}
