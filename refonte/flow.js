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
/* logos en couleur des quatre outils Microsoft du parcours (dessinés ici d'après les logos fournis) */
const BRAND = {
  powerbi: '<rect x="3.2" y="12" width="6.6" height="9.6" rx="1.3" fill="#F7E08A"/><rect x="8.4" y="6.6" width="6.6" height="15" rx="1.3" fill="#F3D24F"/><rect x="13.6" y="1.8" width="7" height="19.8" rx="1.3" fill="#E8AB12"/><rect x="8.4" y="12" width="1.4" height="9.6" fill="#F3D24F"/>',
  automate: '<defs><linearGradient id="flpa1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d63e4"/><stop offset="1" stop-color="#142a86"/></linearGradient><linearGradient id="flpa2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2865ea"/><stop offset="1" stop-color="#4f93ff"/></linearGradient><linearGradient id="flpa3" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#52a8ff"/><stop offset="1" stop-color="#6fd8ff"/></linearGradient></defs><path d="M3.9 6c0-1.600 1.100-2.800 2.800-2.800h7.200c.6 0 1.100.2 1.500.6L9.200 13.800 4.700 9.600C4.100 9 3.900 8.500 3.900 8z" fill="url(#flpa1)"/><path d="m14.300 3.400 3.900 3.700c1 .9 1 2.200.1 3.200L9 20c-.6.700-1.400.9-2.300.9h-.6c-1.300 0-2.200-1-2.200-2.200 0-.6.200-1.100.7-1.600z" fill="url(#flpa2)"/><path d="m17.600 7.200 2.800 2.800c.9.900.9 2.100.1 3l-8.400 7.600c-.5.400-1 .6-1.600.6H8.700c.9 0 1.600-.3 2.200-1l8.100-9.100c.4-.5.400-1.200-.1-1.700z" fill="url(#flpa3)"/>',
  outlook: '<defs><linearGradient id="flol1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#37d0ff"/><stop offset="1" stop-color="#0f8dfa"/></linearGradient><linearGradient id="flol2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a6be0"/><stop offset="1" stop-color="#4a2fc6"/></linearGradient><linearGradient id="flol3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b8cf0"/><stop offset="1" stop-color="#1a3fae"/></linearGradient></defs><path d="M2.600 8.600C2.600 6.500 4 5 6 5h12c2 0 3.400 1.500 3.400 3.600V17c0 2.300-1.700 4-4 4H7.200c-2.700 0-4.600-1.800-4.600-4.200z" fill="url(#flol1)"/><path d="m3.200 8.700 8.200-5.500c.9-.6 2-.6 2.900 0l7.300 4.800c.5.300.8.800.8 1.400L12.600 14z" fill="url(#flol2)" opacity=".92"/><path d="M5.200 9.100 11 5.200c.6-.4 1.300-.4 1.900 0l5.500 3.600L12 12.600z" fill="url(#flol3)" opacity=".7"/><rect x="1" y="10.500" width="10" height="10" rx="2.600" fill="#1665d8"/><circle cx="6" cy="15.500" r="2.500" fill="none" stroke="#fff" stroke-width="1.800"/>',
  sharepoint: '<defs><linearGradient id="flsp1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a9ca0"/><stop offset="1" stop-color="#056b70"/></linearGradient></defs><circle cx="13.200" cy="8" r="6.600" fill="#0b6f72"/><circle cx="16.800" cy="13.200" r="6.200" fill="#1c9ca2"/><circle cx="12.600" cy="17.400" r="4.500" fill="#38c8d0"/><rect x="1.100" y="6.200" width="11.600" height="11.600" rx="1.800" fill="url(#flsp1)"/><text x="6.900" y="15.200" font-size="9.500" font-weight="700" font-family="Arial,Helvetica,sans-serif" fill="#fff" text-anchor="middle">S</text>'
};
const glyph = (k) => ICONS[k] || ICONS.check;
const svgIcon = (k, cls) => (BRAND[k] ? `<svg class="${cls} fl-brand" viewBox="0 0 24 24" aria-hidden="true">${BRAND[k]}</svg>` : `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph(k)}</svg>`);
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

/* ================================================================ vue « magie » : schéma en perspective (3D réelle, CSS)
   Cases en serpentin sur le « sol » (contours en pointillés, liaisons, libellés) ; à mesure que la case mobile les atteint, chaque case se soulève au-dessus
   de son contour et son voyant s'allume. Même transformation que la référence : translate3d(-20px,100px,50px) rotateY(20deg) rotateX(50deg) scale(1.5),
   conteneur de 1100 px (90 vw), perspective 1450 px, ouverture 1,35 s en cubic-bezier(.22,1,.36,1). Parcours automatique : mêmes durées que la référence
   (arrêt de 2,5 s sur chaque case, trajet de 2,4 s, case mobile esquisse → trait → plein → couleur). */
const T = { lead: 800, dwell: 2500, travel: 2400, hold: 2600 };
const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function layoutSnake(n, narrow) {
  const BOX = 59, cols = narrow ? 3 : 5, W = narrow ? 420 : 843, ROW = narrow ? 158 : 175, TOP = 28.5, M = 30;
  const px = (W - 2 * M - BOX) / (cols - 1), rows = Math.ceil(n / cols);
  const pos = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols); let c = i % cols; if (r % 2) c = cols - 1 - c;
    return { x: M + c * px, y: TOP + r * ROW, r, c, i };
  });
  return { BOX, cols, W, H: TOP + (rows - 1) * ROW + BOX + 56, pos, rows };
}

function build3d(items, L) {
  const { BOX, pos } = L, plane = document.createElement('div');
  plane.className = 'fl3'; plane.style.width = L.W + 'px'; plane.style.height = L.H + 'px';
  const put = (cls, css, html) => { const e = document.createElement('div'); e.className = cls; Object.assign(e.style, css); if (html) e.innerHTML = html; plane.append(e); return e; };
  const dash = (x, y, w, h) => put('l3 ' + (h === 0 ? 'lh' : 'lv'), { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  for (let i = 0; i < pos.length - 1; i++) {                       // liaisons en pointillés, au sol
    const a = pos[i], b = pos[i + 1], cy = a.y + BOX / 2;
    if (a.r === b.r) { const x1 = Math.min(a.x, b.x) + BOX + 4, x2 = Math.max(a.x, b.x) - 4; dash(x1, cy, x2 - x1, 0); }
    else {
      const right = a.x > L.W / 2, ox = right ? a.x + BOX + 16 : a.x - 16, ex = right ? a.x + BOX + 4 : a.x - 4, cy2 = b.y + BOX / 2;
      dash(Math.min(ex, ox), cy, Math.abs(ox - ex), 0); dash(ox, cy, 0, cy2 - cy); dash(Math.min(ex, ox), cy2, Math.abs(ox - ex), 0);
    }
  }
  const cells = pos.map((p, i) => {
    const it = items[i];
    put('b3', { left: p.x + 'px', top: p.y + 'px' });                                                   // contour au sol
    put('t3', { left: (p.x - 20) + 'px', top: (p.y + BOX + 8) + 'px', width: (BOX + 40) + 'px' }, '<b>' + esc(cut(it.title, L.cols === 5 ? 24 : 18)) + '</b><i>' + esc(TECH[it.icon] || '') + '</i>');
    const shadow = put('s3', { left: p.x + 'px', top: p.y + 'px' });
    const tile = put('k3', { left: p.x + 'px', top: p.y + 'px' }, svgIcon(it.icon, 'k3-i'));
    const led = put('d3', { left: (p.x + BOX - 8) + 'px', top: (p.y + 2) + 'px' });
    return { tile, led, shadow };
  });
  const mv = put('m3', { left: '0px', top: '0px' }, '<i class="m3-h"></i><i class="m3-o"></i><i class="m3-s"></i><i class="m3-c"></i><span class="m3-i"></span>');
  const parts = { h: mv.querySelector('.m3-h'), o: mv.querySelector('.m3-o'), s: mv.querySelector('.m3-s'), c: mv.querySelector('.m3-c'), i: mv.querySelector('.m3-i') };
  return { plane, cells, mv, parts, icon: '' };
}

/* instant t (ms) → état : position de la case mobile, case atteinte, avancement */
function timeline(n) {
  const unit = T.dwell + T.travel, run = T.lead + n * T.dwell + (n - 1) * T.travel;
  return { run, total: run + T.hold, at(t) {
    if (t < T.lead) return { s: 0, reach: -1, p: 0 };
    const u = t - T.lead, i = Math.min(n - 1, Math.floor(u / unit)), within = u - i * unit;
    let s = i;
    if (i < n - 1 && within > T.dwell) s = i + easeInOut(clamp((within - T.dwell) / T.travel, 0, 1));
    return { s, reach: i, p: clamp(t / run, 0, 1) };
  } };
}

function draw3d(st, items, L, tl, t) {
  const n = items.length, { s, reach, p } = tl.at(t);
  const i0 = Math.min(Math.max(0, n - 2), Math.floor(s)), g = n > 1 ? s - i0 : 0;
  const a = L.pos[i0], b = L.pos[Math.min(n - 1, i0 + 1)];
  let x, y;
  if (a.r === b.r) { x = a.x + (b.x - a.x) * g; y = a.y + (b.y - a.y) * g; }
  else {
    const off = a.x > L.W / 2 ? 40 : -40;
    if (g < 1 / 3) { x = a.x + off * smooth(g * 3, 0, 1); y = a.y; }
    else if (g < 2 / 3) { x = a.x + off; y = a.y + (b.y - a.y) * smooth(g * 3 - 1, 0, 1); }
    else { x = a.x + off + (b.x - a.x - off) * smooth(g * 3 - 2, 0, 1); y = b.y; }
  }
  st.mv.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,1px)';
  const lk = looks(p);
  st.parts.h.style.opacity = lk.hatch.toFixed(3); st.parts.o.style.opacity = lk.outline.toFixed(3); st.parts.s.style.opacity = lk.solid.toFixed(3); st.parts.c.style.opacity = lk.color.toFixed(3);
  const fade = t > tl.run - 900 ? clamp(1 - (t - (tl.run - 900)) / 900, 0, 1) : 1;   // la case mobile s'efface à la fin du parcours
  st.mv.style.opacity = fade.toFixed(3); st.mv.classList.toggle('fl-done', lk.color > .5);
  const near = clamp(Math.round(s), 0, n - 1);
  if (st.icon !== items[near].icon) { st.icon = items[near].icon; st.parts.i.innerHTML = svgIcon(st.icon, 'm3-ico'); }
  st.cells.forEach((c, i) => {
    const up = reach >= 0 && i <= reach;
    c.tile.classList.toggle('up', up); c.shadow.classList.toggle('up', up); c.led.classList.toggle('up', up); c.led.classList.toggle('cur', i === reach);
  });
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

  /* --- « Cliquez ici pour voir la magie » : le schéma en perspective, parcours automatique, mêmes animations à l'ouverture et à la fermeture --- */
  const ov = document.createElement('div');
  ov.className = 'fl-ov'; ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = '<button type="button" class="fl-ov-x" aria-label="Fermer le schéma en perspective">×</button><div class="fl-ov-c"><div class="fl-ov-w"></div></div><p class="fl-ov-cap">VUE EN PERSPECTIVE · ÉCHAP POUR FERMER</p>';
  document.body.append(ov);
  const center = ov.querySelector('.fl-ov-c'), wrap = ov.querySelector('.fl-ov-w');
  let L = null, st = null, tl = null, ra = 0, t0 = 0, timer = 0;
  const lower = () => st && st.cells.forEach((c) => { c.tile.classList.remove('up'); c.shadow.classList.remove('up'); c.led.classList.remove('up', 'cur'); });
  const frame3 = () => {
    let t = performance.now() - t0;
    if (t >= tl.total) { t0 = performance.now(); t = 0; lower(); }                 // le parcours reprend depuis le début
    draw3d(st, items, L, tl, t); ra = requestAnimationFrame(frame3);
  };
  const open = () => {
    clearTimeout(timer); cancelAnimationFrame(ra);
    L = layoutSnake(items.length, matchMedia('(max-width: 640px)').matches); tl = timeline(items.length);
    st = build3d(items, L);
    const k = center.clientWidth / L.W || 1;
    st.plane.style.transform = 'scale(' + k + ')'; wrap.style.height = (L.H * k) + 'px';
    wrap.replaceChildren(st.plane);
    draw3d(st, items, L, tl, 0);
    void ov.offsetWidth;
    ov.classList.add('is-open'); ov.setAttribute('aria-hidden', 'false'); document.body.classList.add('fl-lock');
    t0 = performance.now(); ra = requestAnimationFrame(frame3); ov.querySelector('.fl-ov-x').focus();
  };
  const close = () => {
    cancelAnimationFrame(ra); lower();                                              // les cases redescendent pendant que la vue se redresse
    ov.classList.remove('is-open'); ov.setAttribute('aria-hidden', 'true'); document.body.classList.remove('fl-lock');
    timer = setTimeout(() => { if (!ov.classList.contains('is-open')) wrap.replaceChildren(); }, 1450);
  };
  root.querySelector('.rf-flow-magic')?.addEventListener('click', open);
  ov.querySelector('.fl-ov-x').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target === center) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('is-open')) close(); });
  return { open, close };
}
