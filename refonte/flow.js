// Barre des étapes d'un projet, d'après la reconstitution du schéma animé fournie (cases de 59 px, liaisons en pointillés, voyant vert,
// case mobile qui passe de l'esquisse hachurée au trait, au plein puis à la couleur, vue inclinée « la magie »).
// — Sur le côté : une barre verticale de cases, une par étape, alignées sur le texte de l'étape ; la case mobile descend avec le défilement.
// — « Cliquez ici pour voir la magie » : le même schéma en serpentin, en perspective, avec le parcours animé de 20 secondes de la référence.
// Les étapes sont celles du projet (titre, texte, icône) ; les icônes et le tracé sont écrits pour ce site.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* icônes 24 × 24 (trait), une par technologie / geste ; la clé vient des données du projet */
const ICONS = {
  pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 16.5h4"/>',
  queue: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="3" cy="6" r=".6"/><circle cx="3" cy="12" r=".6"/><circle cx="3" cy="18" r=".6"/>',
  extract: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 12h8"/>',
  script: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.6 2.7L16 9.5"/>',
  html: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8.5 12.5 7 14l1.5 1.5M15.5 12.5 17 14l-1.5 1.5M13 12l-2 4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  excel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  export: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
  field: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 10.5v3"/><path d="M11 12h6"/>',
  inject: '<path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  sharepoint: '<circle cx="9" cy="9" r="5"/><circle cx="16" cy="8" r="4"/><circle cx="14" cy="16" r="4"/>',
  automate: '<path d="M4 8h9a4 4 0 0 1 0 8H8"/><path d="m10 12-3 4 3 4M20 8l-3-3M20 8l-3 3"/>',
  vm: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><rect x="7" y="7.5" width="5" height="4" rx=".6"/>',
  outlook: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
  'excel-script': '<rect x="3" y="4" width="13" height="12" rx="2"/><path d="M3 9h13M3 13h13M9 4v12"/><path d="m18.5 14.5 2.5 2.5-2.5 2.5M14.5 14.5 12 17l2.5 2.5"/>',
  powerbi: '<rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="16" y="3" width="4" height="17" rx="1"/>',
  design: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="m14 7 3 3"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  query: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5M8 10.5h5"/>',
  q18: '<circle cx="11" cy="11" r="7"/><path d="m15.5 15.5 4.5 4.5"/><path d="M8.5 9h5M8.5 12h3.5"/>'
};
const TECH = {
  pdf: 'PDF', queue: 'File d’attente', extract: 'Extraction · OCR', script: 'Script', check: 'Contrôle', html: 'HTML · JavaScript', chart: 'Visualisation',
  excel: 'Excel', export: 'Export', field: 'Champs', inject: 'Injection', sharepoint: 'SharePoint', automate: 'Power Automate', vm: 'Machine virtuelle',
  outlook: 'Outlook', 'excel-script': 'Script Excel', powerbi: 'Power BI', design: 'Conception', archive: 'Archivage', query: 'Requête', q18: 'Reporteur Q18'
};
const glyph = (k) => ICONS[k] || ICONS.check;
const svgIcon = (k, cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph(k)}</svg>`;
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);

/* aspect de la case mobile selon l'avancement p (0 → 1) : esquisse → trait → plein → couleur, comme sur le schéma de référence */
const looks = (p) => ({
  hatch: 1 - smooth(p, .08, .16),
  outline: smooth(p, .14, .22) * (1 - smooth(p, .38, .46)),
  solid: smooth(p, .42, .5) * (1 - smooth(p, .66, .74)),
  color: smooth(p, .7, .8)
});
/* arrêt sur chaque case, trajet entre deux : f (0 → 1) → g (0 → 1) avec plateaux aux extrémités */
const dwell = (f) => (f < .3 ? 0 : f > .7 ? 1 : smooth(f, .3, .7));

/* ================================================================ barre latérale (verticale) */
function mountRail(root, items, steps) {
  const rail = root.querySelector('.rf-flow-rail');
  const n = items.length;
  rail.innerHTML = '';
  const boxes = items.map((it) => {
    const b = document.createElement('div'); b.className = 'fl-b';
    b.innerHTML = '<i class="fl-led"></i>' + svgIcon(it.icon, 'fl-ico'); rail.append(b); return b;
  });
  const links = items.slice(1).map(() => { const l = document.createElement('i'); l.className = 'fl-c'; rail.append(l); return l; });
  const mv = document.createElement('div'); mv.className = 'fl-mv';
  mv.innerHTML = '<i class="fl-mv-h"></i><i class="fl-mv-o"></i><i class="fl-mv-s"></i><i class="fl-mv-c"></i><span class="fl-mv-i"></span>';
  rail.append(mv);
  const parts = { h: mv.querySelector('.fl-mv-h'), o: mv.querySelector('.fl-mv-o'), s: mv.querySelector('.fl-mv-s'), c: mv.querySelector('.fl-mv-c'), i: mv.querySelector('.fl-mv-i') };
  let ys = [], bx = 59, shownIcon = '';
  const layout = () => {
    bx = parseFloat(getComputedStyle(rail).getPropertyValue('--bx')) || 59;
    const ol = root.querySelector('.rf-flow-steps'); ys = steps.map((li) => li.offsetTop - ol.offsetTop);
    rail.style.height = (root.querySelector('.rf-flow-steps').offsetHeight) + 'px';
    boxes.forEach((b, i) => { b.style.top = ys[i] + 'px'; });
    links.forEach((l, i) => { const top = ys[i] + bx, h = Math.max(0, ys[i + 1] - top); l.style.top = top + 'px'; l.style.height = h + 'px'; });
  };
  const draw = (s) => {
    const sc = clamp(s, 0, n - 1), i0 = Math.min(n - 2, Math.floor(sc)), f = sc - i0, g = dwell(f);
    const y = n > 1 ? ys[i0] + (ys[i0 + 1] - ys[i0]) * g : ys[0];
    mv.style.transform = `translate3d(0,${(y || 0).toFixed(1)}px,0)`;
    const L = looks(n > 1 ? sc / (n - 1) : 1);
    parts.h.style.opacity = L.hatch.toFixed(3); parts.o.style.opacity = L.outline.toFixed(3); parts.s.style.opacity = L.solid.toFixed(3); parts.c.style.opacity = L.color.toFixed(3);
    mv.classList.toggle('fl-done', L.color > .5);
    const near = clamp(Math.round(sc), 0, n - 1);
    if (shownIcon !== items[near].icon) { shownIcon = items[near].icon; parts.i.innerHTML = svgIcon(shownIcon, 'fl-mv-ico'); }
    boxes.forEach((b, i) => { b.classList.toggle('fl-on', sc >= i - .02); b.classList.toggle('fl-cur', i === near); });
    steps.forEach((li, i) => li.classList.toggle('fl-cur', i === near));
  };
  return { layout, draw };
}

/* ================================================================ schéma en serpentin (vue « magie ») */
function layoutSnake(n, narrow) {
  const BOX = 59, cols = narrow ? 3 : 5, W = narrow ? 420 : 843, ROW = narrow ? 158 : 175, TOP = 28.5, M = 30;
  const px = (W - 2 * M - BOX) / (cols - 1), rows = Math.ceil(n / cols);
  const pos = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols); let c = i % cols; if (r % 2) c = cols - 1 - c;
    return { x: M + c * px, y: TOP + r * ROW, r, c, i };
  });
  return { BOX, cols, W, H: TOP + (rows - 1) * ROW + BOX + 56, pos, rows };
}
function snakeLines(L) {
  const { BOX, pos } = L, out = [];
  for (let i = 0; i < pos.length - 1; i++) {
    const a = pos[i], b = pos[i + 1], cy = a.y + BOX / 2;
    if (a.r === b.r) {
      const dir = b.x > a.x ? 1 : -1, x1 = dir > 0 ? a.x + BOX + 4 : a.x - 4, x2 = dir > 0 ? b.x - 4 : b.x + BOX + 4;
      out.push(`<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}"/>`, `<circle cx="${x1}" cy="${cy}" r="2.2"/>`, `<circle cx="${x2}" cy="${cy}" r="2.2"/>`);
    } else {
      const right = a.x > L.W / 2, ox = right ? a.x + BOX + 16 : a.x - 16, ex = right ? a.x + BOX + 4 : a.x - 4, cy2 = b.y + BOX / 2;
      out.push(`<path d="M${ex} ${cy}H${ox}V${cy2}H${ex}"/>`, `<circle cx="${ex}" cy="${cy}" r="2.2"/>`, `<circle cx="${ex}" cy="${cy2}" r="2.2"/>`);
    }
  }
  return out.join('');
}
function snakeSvg(items, L) {
  const { BOX, pos, W, H } = L, id = 'fl' + Math.random().toString(36).slice(2, 7);
  let hatch = ''; for (let d = -BOX; d <= BOX; d += 7) hatch += `<line x1="${d}" y1="${BOX}" x2="${d + BOX}" y2="0"/>`;
  const ico = (k, x, y, cls) => `<g class="${cls}" transform="translate(${x} ${y}) scale(${28 / 24})" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph(k)}</g>`;
  const boxes = pos.map((p, i) => `<g class="fl-box">` +
    `<rect class="fl-rect" x="${p.x}" y="${p.y}" width="${BOX}" height="${BOX}" rx="9.5"/><circle class="fl-led2" cx="${p.x + 49.5}" cy="${p.y + 9.5}" r="3"/>` + ico(items[i].icon, p.x + 15.5, p.y + 15.5, 'fl-ico2') +
    `<text class="fl-name" x="${p.x + BOX / 2}" y="${p.y + BOX + 17}" text-anchor="middle">${esc(cut(items[i].title, L.cols === 5 ? 26 : 19))}</text>` +
    `<text class="fl-tech" x="${p.x + BOX / 2}" y="${p.y + BOX + 30}" text-anchor="middle">${esc(TECH[items[i].icon] || '')}</text></g>`).join('');
  const mover = `<g class="fl-mover" transform="translate(${pos[0].x} ${pos[0].y})"><rect class="fl-m-base" width="${BOX}" height="${BOX}" rx="9.5"/>` +
    `<g class="fl-m-hatch" clip-path="url(#${id}c)">${hatch}</g><rect class="fl-m-outline" x="3" y="3" width="${BOX - 6}" height="${BOX - 6}" rx="7"/>` +
    `<rect class="fl-m-solid" x="3" y="3" width="${BOX - 6}" height="${BOX - 6}" rx="7"/><rect class="fl-m-color" x=".5" y=".5" width="${BOX - 1}" height="${BOX - 1}" rx="9" fill="url(#${id}g)"/>` +
    `<g class="fl-m-icon">${ico(items[0].icon, 15.5, 15.5, 'fl-m-ico')}</g></g>`;
  return `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma des ${items.length} étapes du projet" xmlns="${NS}"><defs><clipPath id="${id}c"><rect width="${BOX}" height="${BOX}" rx="9.5"/></clipPath>` +
    `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3d1c"/><stop offset="1" stop-color="#0e1a0e"/></linearGradient></defs>` +
    `<g class="fl-lines" fill="none" stroke-dasharray="4 4">${snakeLines(L)}</g>${boxes}${mover}</svg>`;
}
function snakeDraw(svg, items, L, p) {
  const n = items.length, s = clamp(p, 0, 1) * (n - 1), i0 = Math.min(n - 2, Math.floor(s)), f = s - i0, g = dwell(f);
  const a = L.pos[i0], b = L.pos[Math.min(n - 1, i0 + 1)];
  let x, y;
  if (a.r === b.r) { x = a.x + (b.x - a.x) * g; y = a.y + (b.y - a.y) * g; }
  else {
    const off = a.x > L.W / 2 ? 40 : -40;
    if (g < 1 / 3) { x = a.x + off * smooth(g * 3, 0, 1); y = a.y; }
    else if (g < 2 / 3) { x = a.x + off; y = a.y + (b.y - a.y) * smooth(g * 3 - 1, 0, 1); }
    else { x = a.x + off + (b.x - a.x - off) * smooth(g * 3 - 2, 0, 1); y = b.y; }
  }
  const mv = svg.querySelector('.fl-mover'); mv.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  const lk = looks(p);
  svg.querySelector('.fl-m-hatch').style.opacity = lk.hatch.toFixed(3); svg.querySelector('.fl-m-outline').style.opacity = lk.outline.toFixed(3);
  svg.querySelector('.fl-m-solid').style.opacity = lk.solid.toFixed(3); svg.querySelector('.fl-m-color').style.opacity = lk.color.toFixed(3);
  mv.classList.toggle('fl-done', lk.color > .5);
  const near = clamp(Math.round(s), 0, n - 1);
  if (mv.dataset.icon !== items[near].icon) { mv.dataset.icon = items[near].icon; mv.querySelector('.fl-m-icon').innerHTML = `<g class="fl-m-ico" transform="translate(15.5 15.5) scale(${28 / 24})" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${glyph(items[near].icon)}</g>`; }
  svg.querySelectorAll('.fl-box').forEach((bx, i) => { bx.classList.toggle('fl-on', s >= i - .02); bx.classList.toggle('fl-cur', i === near); });
}

/* ================================================================ composant */
export function initFlow(root) {
  const steps = [...root.querySelectorAll('.rf-flow-step')];
  const items = steps.map((li) => ({ title: li.querySelector('h3').textContent.trim(), text: li.querySelector('p:not(.rf-flow-tech)').textContent.trim(), icon: li.dataset.icon || 'check' }));
  if (!items.length) return;
  steps.forEach((li, i) => { const t = li.querySelector('.rf-flow-tech'); if (t) t.textContent = TECH[items[i].icon] || ''; });
  root.classList.add('rf-flow-on');

  /* --- barre latérale : la case mobile suit le défilement (ressort 45 / 20) --- */
  const rail = mountRail(root, items, steps);
  let pos = [];
  const measure = () => { rail.layout(); pos = steps.map((li) => li.getBoundingClientRect().top + scrollY - innerHeight * .55); };
  const target = () => {
    const y = scrollY, n = pos.length;
    if (y <= pos[0]) return 0; if (y >= pos[n - 1]) return n - 1;
    let i = 0; while (i < n - 2 && y >= pos[i + 1]) i++;
    return i + (y - pos[i]) / Math.max(1, pos[i + 1] - pos[i]);
  };
  let s = 0, vel = 0, last = 0, raf = 0;
  const frame = (now) => {
    const dt = Math.min(.032, last ? (now - last) / 1000 : .016); last = now;
    const to = target(), k = 45, c = 20;
    vel += (-k * (s - to) - c * vel) * dt; s += vel * dt; rail.draw(s);
    if (Math.abs(s - to) > .002 || Math.abs(vel) > .004) raf = requestAnimationFrame(frame); else { s = to; vel = 0; rail.draw(s); raf = 0; last = 0; }
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const remeasure = () => { measure(); kick(); };
  measure(); rail.draw(0); kick();
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', remeasure); addEventListener('load', remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(root.querySelector('.rf-flow-steps'));
  setTimeout(remeasure, 600);
  // apparition des étapes
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rf-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 }); steps.forEach((li) => io.observe(li)); }
  else steps.forEach((li) => li.classList.add('rf-in'));

  /* --- « Cliquez ici pour voir la magie » : schéma en serpentin, en perspective, parcours animé de 20 s --- */
  const ov = document.createElement('div');
  ov.className = 'fl-ov'; ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = '<button type="button" class="fl-ov-x" aria-label="Fermer">×</button><div class="fl-ov-c"><div class="fl-ov-w"></div></div><p class="fl-ov-cap"><button type="button" class="fl-ov-r">↻ Rejouer le parcours</button><span class="fl-ov-t"></span></p>';
  document.body.append(ov);
  const wrap = ov.querySelector('.fl-ov-w'), tEl = ov.querySelector('.fl-ov-t');
  let L = null, svg = null, ra = 0, t0 = 0;
  const DURATION = 20000;
  const play = () => {
    cancelAnimationFrame(ra); t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(performance.now() - t0, DURATION); snakeDraw(svg, items, L, t / DURATION); tEl.textContent = (t / 1000).toFixed(1) + ' s / 20.0 s';
      if (t < DURATION) ra = requestAnimationFrame(tick);
    };
    ra = requestAnimationFrame(tick);
  };
  const open = () => {
    L = layoutSnake(items.length, matchMedia('(max-width: 640px)').matches);
    wrap.innerHTML = snakeSvg(items, L); svg = wrap.querySelector('svg'); snakeDraw(svg, items, L, 0);
    ov.classList.add('is-open'); ov.setAttribute('aria-hidden', 'false'); document.body.classList.add('fl-lock');
    play(); ov.querySelector('.fl-ov-x').focus();
  };
  const close = () => { cancelAnimationFrame(ra); ov.classList.remove('is-open'); ov.setAttribute('aria-hidden', 'true'); document.body.classList.remove('fl-lock'); setTimeout(() => { if (!ov.classList.contains('is-open')) wrap.replaceChildren(); }, 450); };
  root.querySelector('.rf-flow-magic')?.addEventListener('click', open);
  ov.querySelector('.fl-ov-r').addEventListener('click', play);
  ov.querySelector('.fl-ov-x').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('fl-ov-c')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('is-open')) close(); });
  return { open, close };
}
