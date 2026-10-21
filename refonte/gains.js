// Gains : un explorateur simple et direct, dans l'esprit des outils d'analyse produit.
//   Panneau de réglages (mesuré en, périmètre, scénario, taux) · type de graphique (barres, aires empilées, anneau) · indicateurs · légende cliquable
//   · détail par outil avec cases à cocher et export CSV · seuil de rentabilité.
// Les chiffres viennent des données réelles du site (js/annual-gains.js) ; rien n'est saisi à la main. Graphiques en SVG, sans bibliothèque.
import './footer.js';
import './navfx.js';

const DATA = JSON.parse(document.getElementById('gx-data').textContent);
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nf = (d = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmt = (n, d = 0) => nf(d).format(n);
const eur = (n) => fmt(n, 0) + ' €';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLORS = ['#2f6df6', '#8bb42a', '#7a3fb0', '#4cc4c9', '#ff7f5c', '#b08be8', '#1f4e8c'];

const st = { scope: 'declared', scen: 'mid', rate: DATA.rate, measure: 'hours', chart: 'bars', sort: 'value', step: 'month', off: new Set(), hover: null };
const rows = DATA.rows.map((r, i) => ({ ...r, color: COLORS[i % COLORS.length], buildHours: r.buildDays * 7 }));
const inScope = () => rows.filter((r) => st.scope === 'all' || !r.estimated);
const visible = () => inScope().filter((r) => !st.off.has(r.id));
const hoursOf = (r, scen = st.scen) => (scen === 'min' ? r.minHours : scen === 'max' ? r.maxHours : (r.minHours + r.maxHours) / 2);
const sum = (list, f) => list.reduce((a, r) => a + f(r), 0);

const MEASURES = {
  hours: { label: 'Heures', f: (r) => hoursOf(r), fmt: (v) => fmt(v) + ' h', axis: 'Heures par an' },
  value: { label: 'Valeur', f: (r) => hoursOf(r) * st.rate, fmt: (v) => eur(v), axis: 'Euros par an' },
  fte: { label: 'Postes', f: (r) => hoursOf(r) / DATA.fte, fmt: (v) => fmt(v, 2) + (v >= 2 ? ' postes' : ' poste'), axis: 'Postes équivalents' },
  net: { label: 'Net année 1', f: (r) => hoursOf(r) - r.buildHours - r.upkeepHours, fmt: (v) => fmt(v) + ' h', axis: 'Heures nettes, année 1' }
};
const M = () => MEASURES[st.measure];

/* ---------------------------------------------------------------- info-bulle */
const tip = document.createElement('div'); tip.className = 'gx-tip'; tip.setAttribute('role', 'tooltip'); document.body.append(tip);
const showTip = (html, x, y) => { tip.innerHTML = html; tip.classList.add('on'); const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = clamp(x + 16, 8, innerWidth - w - 8) + 'px'; tip.style.top = clamp(y + 16, 8, innerHeight - h - 8) + 'px'; };
const hideTip = () => tip.classList.remove('on');
const rowTip = (r) => '<b>' + esc(r.title) + '</b><span>' + M().fmt(M().f(r)) + '</span><span>' + fmt(r.minHours) + (r.maxHours !== r.minHours ? ' – ' + fmt(r.maxHours) : '') + ' h/an · ' + eur(r.minHours * st.rate) + (r.maxHours !== r.minHours ? ' – ' + eur(r.maxHours * st.rate) : '') + '</span><i>' + esc(r.basis) + '</i>' + (r.estimated ? '<em>Estimation, hors volumes fournis</em>' : '');

/* ---------------------------------------------------------------- indicateurs */
function kpis() {
  const list = visible(), m = M(), total = sum(list, (r) => m.f(r)), hours = sum(list, (r) => hoursOf(r));
  const G = hours, B = sum(list, (r) => r.buildHours), U = sum(list, (r) => r.upkeepHours), be = G - U > 0 ? B / ((G - U) / DATA.days) : null;
  const k = [
    [m.label + ' · par an', m.fmt(total), list.length + ' outil' + (list.length > 1 ? 's' : '')],
    ['Par jour ouvré', st.measure === 'fte' ? fmt(hours / DATA.days, 1) + ' h' : m.fmt(total / DATA.days), 'année de ' + DATA.days + ' jours de 7 h'],
    ['Postes équivalents', fmt(hours / DATA.fte, 2), 'poste à temps plein = ' + fmt(DATA.fte) + ' h'],
    ['Rentabilisé au', be === null ? '–' : 'jour ' + Math.ceil(be), 'construction ' + fmt(B) + ' h · entretien ' + fmt(U) + ' h']
  ];
  $('gx-kpis').innerHTML = k.map(([a, b, c]) => `<div class="gx-kpi"><span>${esc(a)}</span><b>${esc(b)}</b><small>${esc(c)}</small></div>`).join('');
}

/* ---------------------------------------------------------------- graphique : barres */
function bars(host) {
  const m = M(), list = visible().map((r) => ({ r, v: m.f(r) })).sort((a, b) => (st.sort === 'alpha' ? a.r.title.localeCompare(b.r.title, 'fr') : b.v - a.v));
  const W = 820, H = 360, L = 60, Rr = 14, T = 22, B = 76, max = Math.max(...list.map((x) => Math.max(x.v, m.f({ ...x.r, minHours: x.r.maxHours, maxHours: x.r.maxHours }))), 1) * 1.1;
  const sy = (v) => T + (1 - v / max) * (H - T - B), band = (W - L - Rr) / Math.max(1, list.length), bw = Math.min(88, band * .66);
  let g = '<defs><pattern id="gxh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#a9bdf2"/><line x1="0" y1="0" x2="0" y2="7" stroke="#cfdcff" stroke-width="3"/></pattern></defs>';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = sy(v); g += `<line x1="${L}" y1="${y}" x2="${W - Rr}" y2="${y}" class="gx-grid-l"/><text x="${L - 10}" y="${y + 3.5}" class="gx-ax" text-anchor="end">${fmt(v >= 10 ? Math.round(v) : v, v >= 10 ? 0 : 2)}</text>`; }
  g += `<text transform="rotate(-90 14 ${(T + H - B) / 2})" x="14" y="${(T + H - B) / 2}" class="gx-axt" text-anchor="middle">${esc(m.axis)}</text>`;
  list.forEach(({ r, v }, i) => {
    const x = L + band * i + (band - bw) / 2, y = sy(Math.max(0, v)), h = Math.max(2, sy(0) - y), hov = st.hover === r.id, dim = st.hover && !hov;
    const words = r.title.split(' '), l1 = [], l2 = []; let n = 0; words.forEach((w) => { if (n + w.length <= 14 || !l1.length) { l1.push(w); n += w.length + 1; } else l2.push(w); });
    g += `<g class="gx-b${dim ? ' dim' : ''}" data-id="${r.id}" tabindex="0" role="button" aria-label="${esc(r.title)} : ${esc(m.fmt(v))}">
      <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${r.color}" class="gx-bar"/>
      ${r.estimated ? `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="url(#gxh)" opacity=".92" class="gx-bar"/><rect x="${x + .5}" y="${y + .5}" width="${bw - 1}" height="${Math.max(1, h - 1)}" rx="3" fill="none" stroke="${r.color}" stroke-width="1.4"/>` : ''}
      <g transform="translate(${x + bw / 2} ${Math.max(T + 14, y + 16)})"><rect x="-26" y="-11" width="52" height="20" rx="4" class="gx-pill"/><text class="gx-pill-t" text-anchor="middle" y="4">${esc(st.measure === 'fte' ? fmt(v, 2) : st.measure === 'value' ? fmt(v / 1000, v >= 1e5 ? 0 : 1) + ' k€' : fmt(v))}</text></g>
      <text x="${x + bw / 2}" y="${H - B + 22}" class="gx-xl" text-anchor="middle">${esc(l1.join(' '))}</text><text x="${x + bw / 2}" y="${H - B + 36}" class="gx-xl" text-anchor="middle">${esc(l2.join(' ').slice(0, 18))}</text></g>`;
  });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="gx-svg" role="group" aria-label="${esc(m.axis)} par outil">${g}</svg>`;
  host.querySelectorAll('.gx-b').forEach((el) => hook(el, rows.find((x) => x.id === el.dataset.id)));
}

/* ---------------------------------------------------------------- graphique : aires empilées (cumul sur l'année) */
function area(host) {
  const meas = st.measure === 'net' ? MEASURES.hours : M(), list = visible(), D = DATA.days, step = st.step === 'day' ? 1 : st.step === 'week' ? 5 : 21;
  const days = []; for (let d = 0; d < D; d += step) days.push(d); days.push(D);
  const W = 820, H = 360, L = 64, Rr = 16, T = 20, B = 44, total = sum(list, (r) => meas.f(r)) || 1, max = total * 1.06;
  const sx = (d) => L + d / D * (W - L - Rr), sy = (v) => T + (1 - v / max) * (H - T - B);
  const stack = list.map((r) => ({ r, k: meas.f(r) / D }));
  let g = ''; for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = sy(v); g += `<line x1="${L}" y1="${y}" x2="${W - Rr}" y2="${y}" class="gx-grid-l"/><text x="${L - 10}" y="${y + 3.5}" class="gx-ax" text-anchor="end">${fmt(v >= 100 ? Math.round(v) : v, v >= 100 ? 0 : 2)}</text>`; }
  for (let i = 0; i <= 5; i++) { const d = Math.round(D * i / 5); g += `<text x="${sx(d)}" y="${H - 14}" class="gx-ax" text-anchor="middle">j${d}</text>`; }
  g += `<text transform="rotate(-90 14 ${(T + H - B) / 2})" x="14" y="${(T + H - B) / 2}" class="gx-axt" text-anchor="middle">${esc(meas.axis)}${st.measure === 'net' ? ' (cumul brut)' : ''} · cumul</text>`;
  let lower = days.map(() => 0);
  stack.forEach(({ r, k }) => {
    const upper = days.map((d, i) => lower[i] + k * d), top = days.map((d, i) => `${sx(d).toFixed(1)},${sy(upper[i]).toFixed(1)}`), bottom = days.map((d, i) => `${sx(d).toFixed(1)},${sy(lower[i]).toFixed(1)}`).reverse();
    const dim = st.hover && st.hover !== r.id;
    g += `<g class="gx-a${dim ? ' dim' : ''}" data-id="${r.id}"><polygon points="${top.join(' ')} ${bottom.join(' ')}" fill="${r.color}" fill-opacity="${r.estimated ? .55 : .9}" class="gx-area"/><polyline points="${top.join(' ')}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/></g>`;
    lower = upper;
  });
  g += `<g class="gx-cross" style="display:none"><line y1="${T}" y2="${H - B}" class="gx-cl"/></g><rect class="gx-catch" x="${L}" y="${T}" width="${W - L - Rr}" height="${H - T - B}" fill="transparent"/>`;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="gx-svg" role="img" aria-label="Gains cumulés sur l’année, empilés par outil">${g}</svg>`;
  const svg = host.querySelector('svg'), cross = svg.querySelector('.gx-cross'), catcher = svg.querySelector('.gx-catch');
  catcher.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, d = clamp(Math.round((x - L) / (W - L - Rr) * D), 0, D);
    cross.style.display = ''; cross.querySelector('line').setAttribute('x1', sx(d)); cross.querySelector('line').setAttribute('x2', sx(d));
    showTip('<b>Jour ' + d + ' / ' + D + '</b>' + stack.map(({ r: rr, k }) => `<span><i class="gx-dot" style="background:${rr.color}"></i>${esc(rr.title)} : ${meas.fmt(k * d)}</span>`).join('') + '<span><b>Total : ' + meas.fmt(stack.reduce((a, s) => a + s.k * d, 0)) + '</b></span>', e.clientX, e.clientY);
  });
  catcher.addEventListener('pointerleave', () => { cross.style.display = 'none'; hideTip(); });
}

/* ---------------------------------------------------------------- graphique : anneau */
function pie(host) {
  const m = M(), list = visible().map((r) => ({ r, v: Math.max(0, m.f(r)) })).sort((a, b) => b.v - a.v), total = sum(list, (x) => x.v) || 1, R = 92, C = 2 * Math.PI * R;
  let off = 0, arcs = '';
  list.forEach(({ r, v }) => {
    const f = v / total, len = Math.max(0, f * C - 2), hov = st.hover === r.id, dim = st.hover && !hov;
    arcs += `<circle class="gx-arc${dim ? ' dim' : ''}" data-id="${r.id}" cx="130" cy="130" r="${R}" fill="none" stroke="${r.color}" stroke-width="${hov ? 46 : 38}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 130 130)"${r.estimated ? ' stroke-opacity=".6"' : ''}/>`;
    off += f * C;
  });
  const cur = st.hover ? list.find((x) => x.r.id === st.hover) : null;
  host.innerHTML = `<div class="gx-pie"><svg viewBox="0 0 260 260" class="gx-pie-svg" role="img" aria-label="Répartition par outil">${arcs}<text x="130" y="124" text-anchor="middle" class="gx-dn1">${esc(cur ? m.fmt(cur.v) : m.fmt(total))}</text><text x="130" y="146" text-anchor="middle" class="gx-dn2">${cur ? fmt(cur.v / total * 100, 1) + ' %' : 'total'}</text></svg>
    <ul class="gx-pie-l">${list.map(({ r, v }) => `<li data-id="${r.id}"><i style="background:${r.color}"></i><span>${esc(r.title)}</span><b>${fmt(v / total * 100, 1)} %</b></li>`).join('')}</ul></div>`;
  host.querySelectorAll('.gx-arc,.gx-pie-l li').forEach((el) => hook(el, rows.find((x) => x.id === el.dataset.id)));
}

/* survol / clic communs */
function hook(el, r) {
  el.addEventListener('pointermove', (e) => { showTip(rowTip(r), e.clientX, e.clientY); if (st.hover !== r.id) setHover(r.id); });
  el.addEventListener('pointerleave', () => { hideTip(); setHover(null); });
  el.addEventListener('focus', () => setHover(r.id)); el.addEventListener('blur', () => setHover(null));
}
function setHover(id) {
  if (st.hover === id) return; st.hover = id;
  document.querySelectorAll('[data-id]').forEach((el) => { const on = !id || el.dataset.id === id; el.classList.toggle('dim', !on); el.classList.toggle('hot', !!id && on); });
}

/* ---------------------------------------------------------------- légende cliquable (deux colonnes) */
function legend() {
  const list = inScope();
  $('gx-legend').innerHTML = list.map((r) => `<button type="button" class="gx-lg${st.off.has(r.id) ? ' off' : ''}" data-id="${r.id}" aria-pressed="${!st.off.has(r.id)}"><i style="background:${r.color}"></i><span>${esc(r.title)}</span>${r.estimated ? '<em>estimé</em>' : ''}</button>`).join('');
  $('gx-legend').querySelectorAll('.gx-lg').forEach((b) => { b.addEventListener('click', () => toggle(b.dataset.id)); b.addEventListener('pointerenter', () => setHover(b.dataset.id)); b.addEventListener('pointerleave', () => setHover(null)); });
}
function toggle(id) { if (st.off.has(id)) st.off.delete(id); else if (visible().length > 1) st.off.add(id); render(); }

/* ---------------------------------------------------------------- détail par outil, cases à cocher, export */
function table() {
  const list = inScope(), m = M(), totalV = sum(list.filter((r) => !st.off.has(r.id)), (r) => m.f(r)) || 1;
  $('gx-table').innerHTML = `<table class="gx-t"><thead><tr><th class="chk"></th><th>Outil</th><th>Fiabilité</th><th class="num">Heures / jour ouvré</th><th class="num">${esc(m.label)} / an</th><th class="num">Part</th><th class="num">Retour</th></tr></thead><tbody>` +
    list.map((r) => { const v = m.f(r), on = !st.off.has(r.id), pay = r.buildHours > 0 ? r.buildHours / (hoursOf(r) / DATA.days) : null;
      return `<tr data-id="${r.id}" class="${on ? '' : 'off'}"><td class="chk"><input type="checkbox" ${on ? 'checked' : ''} aria-label="Afficher ${esc(r.title)}"></td><td><i class="gx-dot" style="background:${r.color}"></i>${esc(r.title)}<small>${esc(r.basis)}</small></td><td><span class="gx-badge${r.estimated ? ' est' : ''}">${r.estimated ? 'estimé' : 'fourni'}</span></td><td class="num">${fmt(hoursOf(r) / DATA.days, 2)} h</td><td class="num">${esc(m.fmt(v))}</td><td class="num">${on ? fmt(v / totalV * 100, 1) + ' %' : '–'}</td><td class="num">${pay === null ? '–' : (pay < 1 ? '< 1' : fmt(pay, 1)) + ' j'}</td></tr>`; }).join('') + '</tbody></table>';
  $('gx-table').querySelectorAll('tbody tr').forEach((tr) => {
    tr.querySelector('input').addEventListener('change', () => toggle(tr.dataset.id));
    tr.addEventListener('pointerenter', () => setHover(tr.dataset.id)); tr.addEventListener('pointerleave', () => setHover(null));
  });
}
function exportCsv() {
  const head = ['Outil', 'Fiabilité', 'Volumes et durée', 'Heures bas', 'Heures haut', 'Heures (scénario)', 'Valeur (€)', 'Postes', 'Construction (h)', 'Entretien (h)', 'Net année 1 (h)'];
  const num = (n, d = 2) => String(+n.toFixed(d)).replace('.', ',');
  const lines = inScope().filter((r) => !st.off.has(r.id)).map((r) => [r.title, r.estimated ? 'estimé' : 'fourni', r.basis, num(r.minHours), num(r.maxHours), num(hoursOf(r)), num(hoursOf(r) * st.rate, 0), num(hoursOf(r) / DATA.fte), num(r.buildHours, 1), num(r.upkeepHours, 1), num(hoursOf(r) - r.buildHours - r.upkeepHours)]);
  const csv = '﻿' + [head, ...lines].map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'gains-comtesse.csv'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------------------------------------------------------------- seuil de rentabilité (carte compacte) */
function breakeven() {
  const list = visible(), G = sum(list, (r) => hoursOf(r)), B = sum(list, (r) => r.buildHours), U = sum(list, (r) => r.upkeepHours), D = DATA.days;
  const net = (d) => G * d / D - B - U * d / D, lo = -B * 1.1, hi = Math.max(net(D), 1) * 1.08;
  const W = 820, H = 230, L = 64, Rr = 16, T = 18, Bm = 34, sx = (d) => L + d / D * (W - L - Rr), sy = (v) => T + (hi - v) / (hi - lo) * (H - T - Bm);
  const pts = Array.from({ length: D + 1 }, (_, d) => sx(d).toFixed(1) + ' ' + sy(net(d)).toFixed(1)), line = 'M' + pts.join('L'), z = sy(0), be = G - U > 0 ? B / ((G - U) / D) : null;
  let g = ''; for (let i = 0; i <= 3; i++) { const v = lo + (hi - lo) * i / 3, y = sy(v); g += `<line x1="${L}" y1="${y}" x2="${W - Rr}" y2="${y}" class="gx-grid-l"/><text x="${L - 10}" y="${y + 3.5}" class="gx-ax" text-anchor="end">${fmt(v)}</text>`; }
  for (let i = 0; i <= 5; i++) { const d = Math.round(D * i / 5); g += `<text x="${sx(d)}" y="${H - 10}" class="gx-ax" text-anchor="middle">j${d}</text>`; }
  const beX = be !== null && be <= D ? sx(be) : null;
  host('gx-be').innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="gx-svg" role="img" aria-label="Gain net cumulé"><defs><clipPath id="gxp"><rect x="${L}" y="${T}" width="${W - L - Rr}" height="${Math.max(0, z - T)}"/></clipPath><clipPath id="gxn"><rect x="${L}" y="${z}" width="${W - L - Rr}" height="${Math.max(0, H - Bm - z)}"/></clipPath></defs>${g}<line x1="${L}" y1="${z}" x2="${W - Rr}" y2="${z}" class="gx-zero"/>
    <path d="${line}L${sx(D)} ${z}L${sx(0)} ${z}Z" fill="rgb(47 109 246 / .28)" clip-path="url(#gxp)"/><path d="${line}L${sx(D)} ${z}L${sx(0)} ${z}Z" fill="rgb(255 111 111 / .2)" clip-path="url(#gxn)"/><path d="${line}" class="gx-curve-l"/>
    ${beX !== null ? `<line x1="${beX}" y1="${T}" x2="${beX}" y2="${H - Bm}" class="gx-be"/><circle cx="${beX}" cy="${z}" r="5" class="gx-be-dot"/><text x="${clamp(beX, 110, W - 120)}" y="${T + 10}" text-anchor="middle" class="gx-be-t">rentabilisé au jour ${Math.ceil(be)}</text>` : `<text x="${W / 2}" y="${T + 10}" text-anchor="middle" class="gx-be-t">seuil non atteint sur l’année</text>`}</svg>`;
}
const host = (id) => $(id);

/* ---------------------------------------------------------------- orchestration */
function render() {
  $('gx-rate-lbl').textContent = fmt(st.rate, 2) + ' €'; $('gx-rate-out').textContent = fmt(st.rate, 2) + ' €/h';
  document.querySelectorAll('#gx-chart-types button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === st.chart)));
  $('gx-step').hidden = st.chart !== 'area'; $('gx-sort').hidden = st.chart !== 'bars';
  document.querySelectorAll('#gx-step button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === st.step)));
  document.querySelectorAll('#gx-sort button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === st.sort)));
  const stage = $('gx-stage'); stage.classList.remove('gx-swap'); void stage.offsetWidth; stage.classList.add('gx-swap');
  (st.chart === 'area' ? area : st.chart === 'pie' ? pie : bars)(stage);
  kpis(); legend(); table(); breakeven();
  st.hover = null;
}
function group(id, key, onChange) {
  $(id).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st[key] = b.dataset.v; $(id).querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); if (onChange) onChange(); render(); });
}
group('gx-measure', 'measure'); group('gx-scope', 'scope', () => { st.off.forEach((id) => { if (!inScope().some((r) => r.id === id)) st.off.delete(id); }); }); group('gx-scen', 'scen');
group('gx-chart-types', 'chart'); group('gx-step', 'step'); group('gx-sort', 'sort');
$('gx-rate').addEventListener('input', (e) => { st.rate = +e.target.value; render(); });
$('gx-reset').addEventListener('click', () => { st.rate = DATA.rate; $('gx-rate').value = DATA.rate; render(); });
$('gx-csv').addEventListener('click', exportCsv);
$('gx-days').textContent = fmt(DATA.days); $('gx-fte').textContent = fmt(DATA.fte);
render();
document.querySelectorAll('.gx-panel,.gx-main-col>*,.gx-method').forEach((c, i) => { c.style.setProperty('--d', (i * 60) + 'ms'); c.classList.add('gx-in'); });

// tirelire des gains annuels et explicatif « Effet cascade » (code d'origine du site), chargés à part : une erreur ici ne touche pas l'explorateur
import('../js/home.js?v=cv-light-v21').then((m) => m.initAnnualGains()).catch((e) => console.warn('tirelire indisponible', e));
