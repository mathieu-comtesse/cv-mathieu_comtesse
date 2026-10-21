// Tableau de bord des gains : heures libérées, valeur annuelle, répartition, cumul et seuil de rentabilité, délai de retour, détail triable.
// Les chiffres viennent des données réelles du site (js/annual-gains.js) ; rien n'est saisi à la main. Graphiques en SVG, sans bibliothèque.
import './footer.js';
import './navfx.js';

const reduced = false;                                         // les animations sont toujours jouées
const DATA = JSON.parse(document.getElementById('gx-data').textContent);
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nf = (d = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
const fmt = (n, d = 0) => nf(d).format(n);
const eur = (n) => fmt(n, 0) + ' €';
const NS = 'http://www.w3.org/2000/svg';
const COLORS = ['#4f8cff', '#39e0ff', '#8f7bff', '#35e08a', '#ffd028', '#ff8a5c', '#ff6fae'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const st = { scope: 'declared', scen: 'mid', rate: DATA.rate, sel: null, sort: { key: 'hours', dir: -1 } };
const rows = DATA.rows.map((r, i) => ({ ...r, color: COLORS[i % COLORS.length], buildHours: r.buildDays * 7 }));
const included = () => rows.filter((r) => st.scope === 'all' || !r.estimated);
const hoursOf = (r, scen = st.scen) => (scen === 'min' ? r.minHours : scen === 'max' ? r.maxHours : (r.minHours + r.maxHours) / 2);
const sum = (list, f) => list.reduce((a, r) => a + f(r), 0);

/* ---------------------------------------------------------------- compteurs animés */
const tweens = new WeakMap();
function count(el, to, format) {
  const from = tweens.get(el)?.value ?? 0;
  cancelAnimationFrame(tweens.get(el)?.raf || 0);
  const t0 = performance.now(), D = 800, st0 = { value: from, raf: 0 };
  const step = (now) => {
    const k = clamp((now - t0) / D, 0, 1), e = 1 - Math.pow(1 - k, 3);
    st0.value = from + (to - from) * e; el.textContent = format(st0.value);
    if (k < 1) st0.raf = requestAnimationFrame(step);
  };
  st0.raf = requestAnimationFrame(step); tweens.set(el, st0);
}

/* ---------------------------------------------------------------- indicateurs */
function kpis() {
  const list = included(), mid = sum(list, (r) => hoursOf(r)), lo = sum(list, (r) => r.minHours), hi = sum(list, (r) => r.maxHours);
  const cost = sum(list, (r) => r.buildHours + r.upkeepHours), net = mid - cost;
  const cards = [
    { k: 'Heures libérées par an', v: mid, f: (x) => fmt(x) + ' h', s: 'de ' + fmt(lo) + ' à ' + fmt(hi) + ' h selon le scénario', c: '#4f8cff', spark: list.map((r) => hoursOf(r)) },
    { k: 'Valeur annuelle', v: mid * st.rate, f: (x) => eur(x), s: 'à ' + fmt(st.rate, 2) + ' €/h · de ' + eur(lo * st.rate) + ' à ' + eur(hi * st.rate), c: '#35e08a', spark: list.map((r) => hoursOf(r) * st.rate) },
    { k: 'Postes équivalents', v: mid / DATA.fte, f: (x) => fmt(x, 2), s: 'poste à temps plein = ' + fmt(DATA.fte) + ' h par an', c: '#39e0ff', spark: list.map((r) => hoursOf(r)) },
    { k: 'Gain net, année 1', v: net, f: (x) => fmt(x) + ' h', s: fmt(net * st.rate, 0) + ' € · après ' + fmt(cost) + ' h de construction et d’entretien', c: '#ffd028', spark: list.map((r) => hoursOf(r) - r.buildHours - r.upkeepHours) }
  ];
  const host = $('gx-kpis');
  if (!host.children.length) {
    host.innerHTML = cards.map((c, i) => `<article class="gx-kpi" style="--c:${c.c}"><p class="gx-kpi-k">${c.k}</p><p class="gx-kpi-v" id="gx-kv${i}">0</p><p class="gx-kpi-s" id="gx-ks${i}"></p><svg class="gx-spark" id="gx-sp${i}" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true"></svg></article>`).join('');
  }
  cards.forEach((c, i) => {
    count($('gx-kv' + i), c.v, c.f); $('gx-ks' + i).textContent = c.s;
    const max = Math.max(...c.spark.map(Math.abs), 1), w = 120 / Math.max(1, c.spark.length);
    $('gx-sp' + i).innerHTML = c.spark.map((v, j) => { const h = Math.max(1.5, Math.abs(v) / max * 26); return `<rect x="${(j * w + 1).toFixed(1)}" y="${(28 - h).toFixed(1)}" width="${(w - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="var(--c)" opacity="${rows[j]?.id === st.sel ? 1 : .55}"/>`; }).join('');
  });
}

/* ---------------------------------------------------------------- info-bulle */
const tip = document.createElement('div'); tip.className = 'gx-tip'; tip.setAttribute('role', 'tooltip'); document.body.append(tip);
const showTip = (html, x, y) => { tip.innerHTML = html; tip.classList.add('on'); const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = clamp(x + 16, 8, innerWidth - w - 8) + 'px'; tip.style.top = clamp(y + 16, 8, innerHeight - h - 8) + 'px'; };
const hideTip = () => tip.classList.remove('on');
const rowTip = (r) => '<b>' + esc(r.title) + '</b><span>' + fmt(r.minHours) + (r.maxHours !== r.minHours ? ' – ' + fmt(r.maxHours) : '') + ' h/an</span><span>' + eur(r.minHours * st.rate) + (r.maxHours !== r.minHours ? ' – ' + eur(r.maxHours * st.rate) : '') + ' /an</span><i>' + esc(r.basis) + '</i>' + (r.estimated ? '<em>Estimation, hors volumes fournis</em>' : '');

/* ---------------------------------------------------------------- barres */
function bars() {
  const list = included().slice().sort((a, b) => hoursOf(b) - hoursOf(a)), max = Math.max(...rows.map((r) => r.maxHours)) * 1.04;
  const RH = 54, W = 760, X0 = 232, X1 = 640, H = list.length * RH + 28;
  const sx = (v) => X0 + (v / max) * (X1 - X0);
  let g = '';
  for (let t = 0; t <= 4; t++) { const v = max * t / 4, x = sx(v); g += `<line x1="${x}" y1="10" x2="${x}" y2="${H - 18}" class="gx-grid-l"/><text x="${x}" y="${H - 3}" class="gx-ax" text-anchor="middle">${fmt(v)}</text>`; }
  list.forEach((r, i) => {
    const y = 18 + i * RH, v = hoursOf(r), sel = st.sel === r.id, dim = st.sel && !sel;
    g += `<g class="gx-row${sel ? ' sel' : ''}${dim ? ' dim' : ''}" data-id="${r.id}" tabindex="0" role="button" aria-label="${esc(r.title)} : ${fmt(v)} heures par an">
      <rect class="gx-hit" x="0" y="${y - 12}" width="${W}" height="${RH - 4}" rx="10"/>
      <text x="0" y="${y + 4}" class="gx-lab">${esc(r.title.length > 26 ? r.title.slice(0, 25) + '…' : r.title)}</text>
      <text x="0" y="${y + 19}" class="gx-lab2">${r.estimated ? 'estimation' : 'volumes fournis'}</text>
      <rect class="gx-track" x="${X0}" y="${y - 2}" width="${X1 - X0}" height="14" rx="7"/>
      <rect class="gx-bar${r.estimated ? ' est' : ''}" x="${X0}" y="${y - 2}" width="${Math.max(6, sx(v) - X0)}" height="14" rx="7" fill="${r.color}" style="--w:${Math.max(6, sx(v) - X0)}px"/>
      <line class="gx-range" x1="${sx(r.minHours)}" y1="${y + 5}" x2="${sx(r.maxHours)}" y2="${y + 5}"/><line class="gx-range" x1="${sx(r.minHours)}" y1="${y - 1}" x2="${sx(r.minHours)}" y2="${y + 11}"/><line class="gx-range" x1="${sx(r.maxHours)}" y1="${y - 1}" x2="${sx(r.maxHours)}" y2="${y + 11}"/>
      <text x="${X1 + 14}" y="${y + 9}" class="gx-val">${fmt(v)} h</text><text x="${W}" y="${y + 9}" text-anchor="end" class="gx-val2">${eur(v * st.rate)}</text></g>`;
  });
  $('gx-bars').innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="gx-svg" role="group" aria-label="Heures libérées par outil">${g}</svg>`;
  $('gx-bars').querySelectorAll('.gx-row').forEach((el) => {
    const r = rows.find((x) => x.id === el.dataset.id);
    el.addEventListener('pointermove', (e) => showTip(rowTip(r), e.clientX, e.clientY)); el.addEventListener('pointerleave', hideTip);
    el.addEventListener('click', () => select(r.id)); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(r.id); } });
  });
}

/* ---------------------------------------------------------------- anneau */
function donut() {
  const list = included().slice().sort((a, b) => hoursOf(b) - hoursOf(a)), total = sum(list, (r) => hoursOf(r)) || 1, R = 74, C = 2 * Math.PI * R;
  let off = 0, arcs = '';
  list.forEach((r) => {
    const f = hoursOf(r) / total, len = Math.max(0, f * C - 3), sel = st.sel === r.id, dim = st.sel && !sel;
    arcs += `<circle class="gx-arc${sel ? ' sel' : ''}${dim ? ' dim' : ''}" data-id="${r.id}" cx="100" cy="100" r="${R}" fill="none" stroke="${r.color}" stroke-width="${sel ? 26 : 20}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 100 100)"${r.estimated ? ' stroke-opacity=".62"' : ''}/>`;
    off += f * C;
  });
  const cur = st.sel ? rows.find((r) => r.id === st.sel) : null;
  $('gx-donut').innerHTML = `<svg viewBox="0 0 200 200" class="gx-donut-svg" role="img" aria-label="Répartition des heures par outil">${arcs}
    <text x="100" y="94" text-anchor="middle" class="gx-dn1">${cur ? fmt(hoursOf(cur)) : fmt(total)}</text><text x="100" y="114" text-anchor="middle" class="gx-dn2">${cur ? 'h · ' + fmt(hoursOf(cur) / total * 100) + ' %' : 'heures par an'}</text></svg>
    <ul class="gx-legend">${list.map((r) => `<li data-id="${r.id}" class="${st.sel === r.id ? 'sel' : ''}"><i style="background:${r.color}"></i><span>${esc(r.title)}</span><b>${fmt(hoursOf(r) / total * 100)} %</b></li>`).join('')}</ul>`;
  $('gx-donut').querySelectorAll('.gx-arc,.gx-legend li').forEach((el) => {
    const r = rows.find((x) => x.id === el.dataset.id);
    el.addEventListener('pointermove', (e) => showTip(rowTip(r), e.clientX, e.clientY)); el.addEventListener('pointerleave', hideTip); el.addEventListener('click', () => select(r.id));
  });
}

/* ---------------------------------------------------------------- courbe de cumul et seuil de rentabilité */
function curve() {
  const list = included(), G = sum(list, (r) => hoursOf(r)), B = sum(list, (r) => r.buildHours), U = sum(list, (r) => r.upkeepHours), D = DATA.days;
  const net = (d) => G * d / D - B - U * d / D;
  const lo = -B * 1.05, hi = Math.max(net(D), 1) * 1.08;
  const W = 760, H = 300, L = 54, Rr = 16, T = 18, Bm = 34, sx = (d) => L + d / D * (W - L - Rr), sy = (v) => T + (hi - v) / (hi - lo) * (H - T - Bm);
  const pts = Array.from({ length: D + 1 }, (_, d) => [sx(d), sy(net(d))]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const z = sy(0), be = G - U > 0 ? B / ((G - U) / D) : null;
  let ticks = ''; for (let i = 0; i <= 5; i++) { const d = Math.round(D * i / 5); ticks += `<text x="${sx(d)}" y="${H - 10}" class="gx-ax" text-anchor="middle">j${d}</text>`; }
  let yt = ''; for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4, y = sy(v); yt += `<line x1="${L}" y1="${y}" x2="${W - Rr}" y2="${y}" class="gx-grid-l"/><text x="${L - 8}" y="${y + 3}" class="gx-ax" text-anchor="end">${fmt(v)}</text>`; }
  const beX = be !== null && be <= D ? sx(be) : null;
  $('gx-curve').innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="gx-svg" role="img" aria-label="Gain net cumulé sur l’année"><defs><linearGradient id="gxa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#35e08a" stop-opacity=".45"/><stop offset="1" stop-color="#35e08a" stop-opacity="0"/></linearGradient><clipPath id="gxpos"><rect x="${L}" y="${T}" width="${W - L - Rr}" height="${Math.max(0, z - T)}"/></clipPath><clipPath id="gxneg"><rect x="${L}" y="${z}" width="${W - L - Rr}" height="${Math.max(0, H - Bm - z)}"/></clipPath></defs>
    ${yt}${ticks}<line x1="${L}" y1="${z}" x2="${W - Rr}" y2="${z}" class="gx-zero"/>
    <path d="${line}L${sx(D)} ${z}L${sx(0)} ${z}Z" fill="url(#gxa)" clip-path="url(#gxpos)"/><path d="${line}L${sx(D)} ${z}L${sx(0)} ${z}Z" fill="rgb(255 111 111 / .18)" clip-path="url(#gxneg)"/>
    <path d="${line}" class="gx-curve-l" pathLength="1"/>
    ${beX !== null ? `<line x1="${beX}" y1="${T}" x2="${beX}" y2="${H - Bm}" class="gx-be"/><circle cx="${beX}" cy="${z}" r="5" class="gx-be-dot"/><text x="${clamp(beX, 120, W - 130)}" y="${T + 12}" text-anchor="middle" class="gx-be-t">rentabilisé au jour ${Math.ceil(be)}</text>` : `<text x="${W / 2}" y="${T + 12}" text-anchor="middle" class="gx-be-t">seuil non atteint sur l’année</text>`}
    <g class="gx-cross" style="display:none"><line y1="${T}" y2="${H - Bm}" class="gx-cl"/><circle r="5" class="gx-cd"/></g><rect class="gx-catch" x="${L}" y="${T}" width="${W - L - Rr}" height="${H - T - Bm}" fill="transparent"/></svg>
    <p class="gx-note">Construction : ${fmt(B)} h · entretien : ${fmt(U)} h sur l’année · gain brut : ${fmt(G)} h</p>`;
  const svg = $('gx-curve').querySelector('svg'), cross = svg.querySelector('.gx-cross'), catcher = svg.querySelector('.gx-catch');
  const pos = (e) => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; return clamp(Math.round((x - L) / (W - L - Rr) * D), 0, D); };
  catcher.addEventListener('pointermove', (e) => {
    const d = pos(e), v = net(d); cross.style.display = ''; cross.querySelector('line').setAttribute('x1', sx(d)); cross.querySelector('line').setAttribute('x2', sx(d)); cross.querySelector('circle').setAttribute('cx', sx(d)); cross.querySelector('circle').setAttribute('cy', sy(v));
    showTip('<b>Jour ' + d + ' / ' + D + '</b><span>' + (v >= 0 ? '+' : '') + fmt(v) + ' h net</span><span>' + (v >= 0 ? '+' : '') + eur(v * st.rate) + '</span>', e.clientX, e.clientY);
  });
  catcher.addEventListener('pointerleave', () => { cross.style.display = 'none'; hideTip(); });
}

/* ---------------------------------------------------------------- délai de retour */
function payback() {
  const list = included().filter((r) => r.buildHours > 0).map((r) => ({ r, days: r.buildHours / (hoursOf(r) / DATA.days) })).sort((a, b) => a.days - b.days);
  const max = Math.max(...list.map((x) => x.days), 1);
  $('gx-pay').innerHTML = '<ul class="gx-pay">' + list.map(({ r, days }) => `<li data-id="${r.id}" class="${st.sel === r.id ? 'sel' : ''}${st.sel && st.sel !== r.id ? ' dim' : ''}"><span>${esc(r.title)}</span><div class="gx-pb"><i style="width:${Math.max(3, days / max * 100).toFixed(1)}%;background:${r.color}"></i></div><b>${days < 1 ? '< 1' : fmt(days, 1)} j</b></li>`).join('') + '</ul><p class="gx-note">Temps de construction ÷ gain journalier. Les lignes sans construction chiffrée ne figurent pas ici.</p>';
  $('gx-pay').querySelectorAll('li').forEach((li) => li.addEventListener('click', () => select(li.dataset.id)));
}

/* ---------------------------------------------------------------- tableau */
function table() {
  const list = included().map((r) => ({ r, hours: hoursOf(r), money: hoursOf(r) * st.rate, build: r.buildDays, kind: r.estimated ? 1 : 0, title: r.title }));
  const { key, dir } = st.sort; list.sort((a, b) => (typeof a[key] === 'string' ? a[key].localeCompare(b[key], 'fr') : a[key] - b[key]) * dir);
  const th = (k, t, cls = '') => `<th class="${cls}"><button type="button" data-k="${k}" class="${st.sort.key === k ? 'on' : ''}">${t}<i>${st.sort.key === k ? (st.sort.dir > 0 ? '↑' : '↓') : ''}</i></button></th>`;
  $('gx-table').innerHTML = `<table class="gx-t"><thead><tr>${th('title', 'Outil')}<th>Volumes et durée</th>${th('hours', 'Heures / an', 'num')}${th('money', 'Valeur / an', 'num')}${th('build', 'Construction', 'num')}${th('kind', 'Fiabilité')}</tr></thead><tbody>${list.map(({ r, hours, money, build }) => `<tr data-id="${r.id}" class="${st.sel === r.id ? 'sel' : ''}${st.sel && st.sel !== r.id ? ' dim' : ''}"><td><i class="gx-dot" style="background:${r.color}"></i>${esc(r.title)}</td><td class="gx-basis">${esc(r.basis)}</td><td class="num">${fmt(hours)} h</td><td class="num">${eur(money)}</td><td class="num">${build ? fmt(build, 1) + ' j' : '–'}</td><td><span class="gx-badge${r.estimated ? ' est' : ''}">${r.estimated ? 'estimé' : 'fourni'}</span></td></tr>`).join('')}</tbody></table>`;
  $('gx-table').querySelectorAll('th button').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k; st.sort = { key: k, dir: st.sort.key === k ? -st.sort.dir : (k === 'title' ? 1 : -1) }; table(); }));
  $('gx-table').querySelectorAll('tbody tr').forEach((tr) => tr.addEventListener('click', () => select(tr.dataset.id)));
}

/* ---------------------------------------------------------------- orchestration */
function select(id) { st.sel = st.sel === id ? null : id; bars(); donut(); payback(); table(); kpis(); }
function render() {
  $('gx-rate-lbl').textContent = fmt(st.rate, 2) + ' €'; $('gx-rate-out').textContent = fmt(st.rate, 2) + ' €/h';
  kpis(); bars(); donut(); curve(); payback(); table();
}
function seg(id, key) {
  const host = $(id);
  host.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st[key] = b.dataset.v; if (st.sel && key === 'scope' && !included().some((r) => r.id === st.sel)) st.sel = null; host.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); });
}
seg('gx-scope', 'scope'); seg('gx-scen', 'scen');
$('gx-rate').addEventListener('input', (e) => { st.rate = +e.target.value; render(); });
$('gx-reset').addEventListener('click', () => { st.rate = DATA.rate; $('gx-rate').value = DATA.rate; render(); });
$('gx-days').textContent = fmt(DATA.days); $('gx-fte').textContent = fmt(DATA.fte);
render();
// apparition en cascade des cartes
const cards = document.querySelectorAll('.gx-kpi,.gx-card,.gx-method');
cards.forEach((c, i) => { c.style.setProperty('--d', (i * 70) + 'ms'); c.classList.add('gx-in'); });
