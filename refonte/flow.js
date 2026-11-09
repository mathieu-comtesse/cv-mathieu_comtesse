// Barre des étapes d'un projet, d'après la reconstitution du schéma animé fournie (cases de 59 px, liaisons en pointillés, voyant vert,
// case mobile qui passe de l'esquisse hachurée au trait, au plein puis à la couleur, vue inclinée « la magie »).
// — Sur le côté : une barre verticale de cases, une par étape, alignées sur le texte de l'étape ; la case mobile descend avec le défilement.
// — « Voir la magie » : le même schéma en serpentin, en perspective, avec le parcours animé de 20 secondes de la référence.
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
const IMG = { excel: 'assets/icons/excel.png', archive: 'assets/icons/archive.png' };                      // logo fourni, détouré
const svgIcon = (k, cls) => (IMG[k] ? `<img class="${cls} fl-brand fl-img" src="${IMG[k]}" alt="" width="28" height="28" draggable="false">` : BRAND[k] ? `<svg class="${cls} fl-brand" viewBox="0 0 24 24" aria-hidden="true">${BRAND[k]}</svg>` : `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyph(k)}</svg>`);
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
    boxes.forEach((b, i) => { const here = Math.abs(sc - i) < .15, done = sc >= i + .15; b.classList.toggle('fl-on', here || done); b.classList.toggle('fl-cur', here); b.classList.toggle('fl-ok', done); });
    steps.forEach((li, i) => li.classList.toggle('fl-cur', i === near));
  };
  return { layout, draw };
}

/* ================================================================ vue « magie » : schéma en perspective (3D réelle, CSS)
   Cases en serpentin sur le « sol » (contours en pointillés, liaisons, libellés) ; à mesure que la case mobile les atteint, chaque case se soulève au-dessus
   de son contour et son voyant s'allume. Même transformation que la référence : translate3d(-20px,100px,50px) rotateY(20deg) rotateX(50deg) scale(1.5),
   conteneur de 1100 px (90 vw), perspective 1450 px, ouverture 1,35 s en cubic-bezier(.22,1,.36,1). Parcours automatique : mêmes durées que la référence
   (arrêt de 2,5 s sur chaque case, trajet de 2,4 s, case mobile esquisse → trait → plein → couleur). */
const T = { lead: 900, dwell: 2300, travel: 1700, hold: 2000 };
const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Disposition : serpentin compact légèrement courbe sur ordinateur ; colonne qui défile sous la caméra sur mobile.
   Le nombre d'étapes fixe le nombre de colonnes, l'ordre de lecture est toujours celui du parcours. */
function layoutSnake(n, narrow) {
  if (narrow) {
    const BOX = 76, GAP = 118, W = 300, M = 44;
    const pos = Array.from({ length: n }, (_, i) => ({ x: W / 2 - BOX / 2 + (i % 2 ? 1 : -1) * 44, y: M + i * GAP, r: i, c: i % 2, i }));
    return { BOX, cols: 1, W, H: M * 2 + (n - 1) * GAP + BOX, pos, rows: n, mobile: true };
  }
  const BOX = 78, cols = clamp(Math.ceil(n / 2), 3, 5), W = 150 * cols - 20, ROW = 156, TOP = 40, M = 40;
  const px = (W - 2 * M - BOX) / Math.max(1, cols - 1), rows = Math.ceil(n / cols);
  const pos = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols); let c = i % cols; if (r % 2) c = cols - 1 - c;
    const bow = Math.sin((cols > 1 ? c / (cols - 1) : .5) * Math.PI) * 18 * (r % 2 ? 1 : -1);
    return { x: M + c * px, y: TOP + r * ROW + bow, r, c, i };
  });
  return { BOX, cols, W, H: TOP + (rows - 1) * ROW + BOX + 80, pos, rows, mobile: false };
}

/* liaison entre deux icônes : courbe douce échantillonnée (position du signal à l'abscisse curviligne), tronquée aux bords des icônes pour le tracé */
function linkOf(a, b, L) {
  const h = L.BOX / 2, ca = { x: a.x + h, y: a.y + h }, cb = { x: b.x + h, y: b.y + h };
  let p1, p2;
  if (L.mobile) { p1 = { x: ca.x, y: ca.y + (cb.y - ca.y) * .55 }; p2 = { x: cb.x, y: cb.y - (cb.y - ca.y) * .55 }; }
  else if (a.r === b.r) { const d = Math.abs(cb.x - ca.x) * .4, sg = Math.sign(cb.x - ca.x); p1 = { x: ca.x + sg * d, y: ca.y - 26 }; p2 = { x: cb.x - sg * d, y: cb.y - 26 }; }
  else { const o = ca.x > L.W / 2 ? 1 : -1, d = 76; p1 = { x: ca.x + o * d, y: ca.y + (cb.y - ca.y) * .08 }; p2 = { x: cb.x + o * d, y: cb.y - (cb.y - ca.y) * .08 }; }
  const N = 48, pts = [], cum = [0];
  for (let k = 0; k <= N; k++) { const u = k / N, v = 1 - u; pts.push({ x: v * v * v * ca.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * cb.x, y: v * v * v * ca.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * cb.y }); if (k) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y)); }
  const len = cum[N], R = L.BOX * .62, keep = pts.map((q, k) => Math.hypot(q.x - ca.x, q.y - ca.y) > R && Math.hypot(q.x - cb.x, q.y - cb.y) > R ? k : -1).filter((k) => k >= 0);
  const k0 = keep[0] ?? 0, k1 = keep[keep.length - 1] ?? N, start = cum[k0], tlen = Math.max(1, cum[k1] - cum[k0]);
  const d = pts.slice(k0, k1 + 1).map((q, k) => (k ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1)).join('');
  const at = (u) => { const s = clamp(u, 0, 1) * len; let k = 1; while (k < N && cum[k] < s) k++; const f = (s - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1]); return { x: pts[k - 1].x + (pts[k].x - pts[k - 1].x) * f, y: pts[k - 1].y + (pts[k].y - pts[k - 1].y) * f }; };
  return { d, len, start, tlen, at };
}

function build3d(items, L) {
  const { BOX, pos } = L, plane = document.createElement('div');
  plane.className = 'fl3'; plane.style.width = L.W + 'px'; plane.style.height = L.H + 'px'; plane.style.setProperty('--bx', BOX + 'px');
  const put = (cls, css, html) => { const e = document.createElement('div'); e.className = cls; Object.assign(e.style, css); if (html) e.innerHTML = html; plane.append(e); return e; };
  const links = pos.slice(1).map((b, i) => linkOf(pos[i], b, L));
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'l3-svg'); svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H); svg.setAttribute('aria-hidden', 'true');
  const mk = (cls, d) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('class', cls); e.setAttribute('d', d); svg.append(e); return e; };
  const wires = links.map((k) => ({ base: mk('l3-b', k.d), fill: mk('l3-f', k.d), glow: mk('l3-g', k.d) }));
  plane.append(svg);
  const cells = pos.map((p, i) => {
    const it = items[i];
    put('t3', { left: (p.x - 34) + 'px', top: (p.y + BOX + 10) + 'px', width: (BOX + 68) + 'px' }, '<b>' + esc(cut(it.title, L.mobile ? 26 : 24)) + '</b><i>' + esc(TECH[it.icon] || '') + '</i>');
    const tile = put('k3', { left: p.x + 'px', top: p.y + 'px' }, svgIcon(it.icon, 'k3-i')); tile.dataset.k = it.icon;
    tile.style.setProperty('--z', (40 + ((i * 7) % 4) * 10) + 'px'); tile.style.setProperty('--rz', (((i % 3) - 1) * 2).toFixed(1) + 'deg');
    const lab = tile.previousElementSibling;
    return { tile, lab };
  });
  const mv = put('m3', { left: '0px', top: '0px' }, '<i class="m3-orb"></i>');
  return { plane, cells, mv, wires, links, cam: { x: L.W / 2, y: L.H / 2, z: 1 }, shown: [] };
}

/* instant t (ms) → état : position du signal (s : indice fractionnaire), icône atteinte, avancement */
function timeline(n) {
  const unit = T.dwell + T.travel, run = T.lead + n * T.dwell + (n - 1) * T.travel;
  return { run, total: run + T.hold, at(t) {
    if (t < T.lead) return { s: 0, reach: -1, moving: false, p: 0 };
    const u = t - T.lead, i = Math.min(n - 1, Math.floor(u / unit)), within = u - i * unit;
    let s = i;
    if (i < n - 1 && within > T.dwell) s = i + easeInOut(clamp((within - T.dwell) / T.travel, 0, 1));
    return { s, reach: i, moving: i < n - 1 && within > T.dwell, p: clamp(t / run, 0, 1) };
  } };
}

/* un seul état pilote tout : icônes (entrée, active, terminée), liaisons (tracé et traînée), tête du signal. Fonction pure de t. */
function draw3d(st, items, L, tl, t) {
  const n = items.length, { s, reach, moving, p } = tl.at(t), fin = t >= tl.run;
  const i0 = Math.min(Math.max(0, n - 2), Math.floor(s)), g = n > 1 ? clamp(s - i0, 0, 1) : 0;
  const head = n > 1 && st.links[i0] ? st.links[i0].at(g) : { x: L.pos[0].x + L.BOX / 2, y: L.pos[0].y + L.BOX / 2 };
  st.mv.style.transform = 'translate3d(' + (head.x - 9).toFixed(1) + 'px,' + (head.y - 9).toFixed(1) + 'px,' + (fin ? 20 : 34) + 'px)';
  st.mv.style.opacity = (t < T.lead * .6 ? 0 : fin ? clamp(1 - (t - tl.run) / 700, 0, 1) : 1).toFixed(2);
  st.mv.classList.toggle('arrive', !moving && reach >= 0 && !fin);
  st.wires.forEach((w, i) => {
    const k = st.links[i], prog = fin || i < i0 ? 1 : i === i0 && moving ? g : 0, tr = k.tlen * .26, hh = clamp((prog * k.len - k.start), 0, k.tlen);
    w.fill.style.strokeDasharray = k.tlen.toFixed(1); w.fill.style.strokeDashoffset = (k.tlen * (1 - (prog >= 1 ? 1 : hh / k.tlen))).toFixed(1); w.fill.style.opacity = prog > 0 ? 1 : 0;
    w.glow.style.strokeDasharray = tr.toFixed(1) + ' ' + (k.tlen * 2).toFixed(1); w.glow.style.strokeDashoffset = (tr - hh).toFixed(1); w.glow.style.opacity = prog > 0 && prog < 1 ? 1 : 0;
  });
  let cur = -1; if (fin) cur = -1; else if (!moving && reach >= 0) cur = reach; else if (moving && g > .82) cur = i0 + 1;
  const dn = fin ? n : cur >= 0 ? cur : (moving ? i0 + 1 : Math.max(0, reach));
  st.cells.forEach((c, i) => {
    const on = t >= 120 + i * 110, here = i === cur, done = fin ? true : i < dn || (i === i0 && moving && cur !== i);
    c.tile.classList.toggle('in', on); c.tile.classList.toggle('cur', here); c.tile.classList.toggle('done', done && !here);
    c.lab.classList.toggle('on', here); c.lab.classList.toggle('dn', done && !here);
  });
  return { reach, moving, finished: fin, p, cur, head };
}

/* ================================================================ composant */
export function initFlow(root, opt = {}) {   // opt.tops() : position des étapes dans la page, quand la page n'est pas affichée telle quelle (parcours 3D)
  const steps = [...root.querySelectorAll('.rf-flow-step')];
  const items = steps.map((li) => ({ title: li.querySelector('h3').textContent.trim(), text: li.querySelector('p:not(.rf-flow-tech)').textContent.trim(), icon: li.dataset.icon || 'check', tech: li.dataset.tech || TECH[li.dataset.icon || 'check'] || '' }));
  if (!items.length) return;
  steps.forEach((li, i) => { const t = li.querySelector('.rf-flow-tech'); if (t) t.textContent = items[i].tech; });
  root.classList.add('rf-flow-on');

  /* --- barre latérale : la case mobile suit le défilement (ressort 45 / 20) --- */
  const rail = mountRail(root, items, steps);
  let pos = [];
  // dans un cadre relevé du parcours 3D, c'est le défilement du cadre qui fait avancer la case
  const view = () => { const S = root.closest('.pc-lift-sc'); return S ? { S, y: S.scrollTop, h: S.clientHeight, top: S.getBoundingClientRect().top - S.scrollTop } : null; };
  const measure = () => { rail.layout(); const v = view(); pos = (v ? steps.map((li) => li.getBoundingClientRect().top - v.top) : (opt.tops?.() || steps.map((li) => li.getBoundingClientRect().top + scrollY))).map((t) => t - (v ? v.h : innerHeight) * .55); };
  const target = () => {
    const v = view(), y = v ? v.y : scrollY, n = pos.length;
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

  let open, close;
  {
  /* --- « Voir la magie » : le processus en perspective, au-dessus du décor. Une seule boucle, un seul temps actif (la page cachée ne le fait pas avancer),
     arrêt sur le résultat, caméra qui suit le signal, sortie vers la machine sans rupture. --- */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ov = document.createElement('div');
  ov.className = 'fl-ov'; ov.setAttribute('aria-hidden', 'true'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Voir la magie : le processus étape par étape');
  const I = { pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.8" height="14" rx="1"/><rect x="13.7" y="5" width="3.8" height="14" rx="1"/></svg>', play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l10.5-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5z"/></svg>', replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/></svg>' };
  ov.setAttribute('aria-modal', 'true');
  const result = (() => { const m = root.closest('.rf-marche'); return { title: m?.dataset.resultTitle || 'Processus terminé.', text: m?.dataset.result || '' }; })();
  ov.innerHTML = '<button type="button" class="fl-ov-x" aria-label="Fermer la magie"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div class="fl-ov-c" aria-hidden="true"><div class="fl-ov-w"></div></div><div class="fl-ov-step" role="status" aria-live="polite"></div><div class="fl-ov-result" role="status" aria-live="polite" hidden></div><div class="fl-ov-end" hidden><button type="button" class="rf-cta rf-cta--quiet" data-act="steps" aria-expanded="false">Revoir les étapes</button><button type="button" class="rf-cta rf-cta--quiet" data-act="replay">Rejouer</button><button type="button" class="rf-cta" data-act="machine">Explorer la machine</button></div><aside class="fl-ov-list" aria-label="Les étapes du processus" hidden><div class="fl-ov-list-h"><h3>Les étapes</h3><button type="button" class="fl-ov-b" data-act="steps-close" aria-label="Fermer la liste des étapes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><ol>' + items.map((it, i) => '<li><span aria-hidden="true">' + (i + 1) + '</span><div><b>' + esc(it.title) + '</b><p>' + esc(it.text) + '</p></div></li>').join('') + '</ol></aside><div class="fl-ov-ctl"><button type="button" class="fl-ov-b" data-act="pause" aria-label="Mettre en pause">' + I.pause + '</button><i class="fl-ov-prog" aria-hidden="true"><b></b></i><button type="button" class="fl-ov-b" data-act="again" aria-label="Rejouer depuis le début">' + I.replay + '</button></div><p class="fl-ov-cap" aria-hidden="true">ÉCHAP POUR FERMER</p>';
  document.body.append(ov);
  const center = ov.querySelector('.fl-ov-c'), wrap = ov.querySelector('.fl-ov-w'), stepBox = ov.querySelector('.fl-ov-step'), endBox = ov.querySelector('.fl-ov-end'), resBox = ov.querySelector('.fl-ov-result'), listBox = ov.querySelector('.fl-ov-list'), listBtn = ov.querySelector('[data-act="steps"]'), prog = ov.querySelector('.fl-ov-prog b'), pauseBtn = ov.querySelector('[data-act="pause"]');
  let wv = 0, L = null, st = null, tl = null, ra = 0, last = 0, tAct = 0, playing = true, timer = 0, opener = null, isOpen = false, shown = -2, fit = 1, Hv = 0;
  const fitOf = () => Math.min(center.clientWidth / L.W, L.mobile ? .98 : innerHeight * .5 / L.H) || 1;
  /* zones sans chevauchement (mobile) : haut = légende, centre = processus, bas = commandes */
  const ZT = 170, ZB = 132;
  const zones = () => { if (L.mobile) { Hv = Math.max(220, innerHeight - ZT - ZB); center.style.marginTop = ZT + 'px'; center.style.alignSelf = 'start'; } else { Hv = Math.round(L.H * fit); center.style.marginTop = ''; center.style.alignSelf = ''; } wrap.style.height = Hv + 'px'; };   // le processus tient dans la moitié de la hauteur : de l'air autour, légende et commandes dégagées
  const caption = (i) => { if (i === shown) return; shown = i; if (i < 0) { stepBox.innerHTML = ''; return; } const it = items[i]; stepBox.innerHTML = '<small>Étape ' + (i + 1) + ' / ' + items.length + '</small><b>' + esc(it.title) + '</b><span>' + esc(it.text) + '</span>'; };
  /* caméra : vue d'ensemble au début et à la fin, rapprochement discret de l'icône active entre les deux (mobile : elle suit le signal) */
  const camera = (r, dt, snap) => {
    const cam = st.cam, Wv = wv, overview = r.finished || tAct < T.lead || reduced;
    const zFull = L.mobile ? Math.max(.6, Math.min(1, Hv / (L.H * fit))) : 1;
    const tz = overview ? zFull : (L.mobile ? 1.04 : 1.08);
    const cx = L.W / 2, cy = L.H / 2, hx = r.head.x, hy = r.head.y;
    const tx = overview ? cx : L.mobile ? hx : cx + (hx - cx) * .3, ty = overview ? cy : L.mobile ? hy : cy + (hy - cy) * .3;
    const k = snap ? 1 : 1 - Math.exp(-dt * 2.6);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
    const sc = fit * cam.z;
    if (L.mobile) st.cells.forEach((c, i) => { const d = clamp(1 - Math.abs(L.pos[i].y + L.BOX / 2 - cam.y) / 470, .22, 1).toFixed(2); if (c.d !== d) { c.d = d; c.tile.style.setProperty('--d', d); c.lab.style.setProperty('--d', d); } });   // mobile : les étapes lointaines s'estompent, le contexte reste lisible
    st.plane.style.transform = 'translate3d(' + (Wv / 2 - cam.x * sc).toFixed(1) + 'px,' + (Hv / 2 - cam.y * sc).toFixed(1) + 'px,0) scale(' + sc.toFixed(4) + ')';
  };
  const showEnd = () => {
    stepBox.innerHTML = ''; shown = -4;
    resBox.innerHTML = '<b>' + esc(result.title) + '</b>' + (result.text ? '<p>' + esc(result.text) + '</p>' : '') + '<small>Résultat de démonstration : données fictives, aucun traitement réel.</small>'; resBox.hidden = false;
    endBox.hidden = false; ov.classList.add('is-done'); pauseBtn.disabled = true;
  };
  const toggleList = (v) => { const on = v ?? listBox.hidden; if (on) { listBox.hidden = false; void listBox.offsetWidth; } listBox.classList.toggle('open', on); listBtn.setAttribute('aria-expanded', String(on)); if (!on) setTimeout(() => { if (!listBox.classList.contains('open')) listBox.hidden = true; }, 450); };
  const sync = (dt, snap) => {
    const r = draw3d(st, items, L, tl, tAct);
    if (!r.finished && !r.moving && r.reach >= 0) caption(r.reach);
    ov.dataset.t = String(Math.round(tAct)); ov.dataset.playing = String(playing);
    camera(r, dt, snap); prog.style.transform = 'scaleX(' + clamp(tAct / tl.total, 0, 1).toFixed(4) + ')';
    if (r.finished && endBox.hidden) showEnd();
    return r;
  };
  const frame = (now) => {
    ra = 0; if (!isOpen) return;
    const dt = last ? Math.min(250, now - last) : 16; last = now;              // le temps hors écran n'est jamais compté : rAF suspendu, last remis à zéro au retour, dt plafonné
    if (playing) tAct = Math.min(tl.total, tAct + dt);
    sync(dt / 1000, false);
    if (playing && tAct < tl.total) ra = requestAnimationFrame(frame);          // arrêt sur le résultat, plus de boucle
  };
  const kick = () => { if (!ra && !reduced && isOpen && playing && tAct < tl.total && !document.hidden) { last = 0; ra = requestAnimationFrame(frame); } };
  const onVis = () => { last = 0; if (!document.hidden) kick(); else if (ra) { cancelAnimationFrame(ra); ra = 0; } };
  const setPlaying = (v) => { playing = v; pauseBtn.innerHTML = v ? I.pause : I.play; pauseBtn.setAttribute('aria-label', v ? 'Mettre en pause' : 'Reprendre'); if (v) kick(); else if (ra) { cancelAnimationFrame(ra); ra = 0; } };
  const start = () => {
    cancelAnimationFrame(ra); ra = 0; tAct = 0; last = 0; shown = -2; endBox.hidden = true; resBox.hidden = true; resBox.innerHTML = ''; toggleList(false); ov.classList.remove('is-done'); pauseBtn.disabled = false; setPlaying(true);
    if (st) { st.cam.x = L.W / 2; st.cam.y = L.H / 2; st.cam.z = 1; }
    if (reduced) { tAct = tl.total; const r = draw3d(st, items, L, tl, tAct); camera(r, 0, true); showEnd(); toggleList(true); prog.style.transform = 'scaleX(1)'; return; }   // mouvements réduits : état final complet, liste des étapes ouverte
    sync(0, true); kick();
  };
  open = () => {
    if (isOpen) return;
    clearTimeout(timer); opener = document.activeElement;
    L = layoutSnake(items.length, matchMedia('(max-width: 640px)').matches); tl = timeline(items.length);
    st = build3d(items, L);
    wv = center.clientWidth; fit = fitOf(); zones(); wrap.replaceChildren(st.plane); st.plane.setAttribute('aria-hidden', 'true');
    isOpen = true; document.addEventListener('visibilitychange', onVis);
    for (const e of [...document.body.children]) if (e !== ov && !e.hasAttribute('inert') && e.tagName !== 'SCRIPT') { e.setAttribute('inert', ''); e.dataset.flInert = '1'; }   // l'arrière-plan n'est plus interactif
    void ov.offsetWidth;
    ov.classList.add('is-open'); ov.setAttribute('aria-hidden', 'false'); document.body.classList.add('fl-lock');
    start(); const xb = ov.querySelector('.fl-ov-x'); void ov.offsetWidth; xb.focus({ preventScroll: true }); if (!ov.contains(document.activeElement)) requestAnimationFrame(() => xb.focus({ preventScroll: true }));   // le focus entre dans le dialogue
  };
  close = (silent) => {
    if (!isOpen) return;
    isOpen = false; cancelAnimationFrame(ra); ra = 0; document.removeEventListener('visibilitychange', onVis);
    ov.classList.remove('is-open', 'is-done', 'is-leaving'); ov.setAttribute('aria-hidden', 'true'); document.body.classList.remove('fl-lock');
    for (const e of document.querySelectorAll('[data-fl-inert]')) { e.removeAttribute('inert'); delete e.dataset.flInert; }
    stepBox.textContent = ''; resBox.hidden = true; toggleList(false); if (!silent) opener?.focus?.({ preventScroll: true });
    timer = setTimeout(() => { if (!isOpen) { wrap.replaceChildren(); st = null; } }, 1450);   // plus aucune animation ni nœud actif après la fermeture
  };
  /* sortie vers la machine : le processus se redresse et s'efface, la machine prend le relais sans second clic */
  const toMachine = () => {
    ov.classList.add('is-leaving');
    setTimeout(() => document.dispatchEvent(new CustomEvent('rf-explore-machine', { detail: { root, fromMagic: true } })), 360);
    setTimeout(() => close(true), 900);
  };
  ov.querySelector('[data-act="replay"]').addEventListener('click', start);
  listBtn.addEventListener('click', () => toggleList());
  ov.querySelector('[data-act="steps-close"]').addEventListener('click', () => { toggleList(false); listBtn.focus({ preventScroll: true }); });
  ov.querySelector('[data-act="again"]').addEventListener('click', start);
  ov.querySelector('[data-act="machine"]').addEventListener('click', toMachine);
  pauseBtn.addEventListener('click', () => setPlaying(!playing));
  /* API de test (non exposée en production : activée seulement par ?uxtest) : positionne la chronologie à un instant donné */
  if (/[?&]uxtest\b/.test(location.search)) window.__rfFlowTest = { seek(ms, hold) { tAct = clamp(ms, 0, tl.total); if (hold === true) setPlaying(false); else if (hold === false) setPlaying(true); sync(0, true); kick(); }, total: () => tl.total, run: () => tl.run, state: () => ({ t: tAct, playing, open: isOpen, finished: tAct >= tl.run, cur: st ? st.cells.findIndex((c) => c.tile.classList.contains('cur')) : -1 }) };
  addEventListener('resize', () => { if (isOpen && !reduced) { wv = center.clientWidth; fit = fitOf(); zones(); if (!playing || tAct >= tl.total) sync(0, true); } });
  root.querySelector('.rf-flow-magic')?.addEventListener('click', open);
  ov.querySelector('.fl-ov-x').addEventListener('click', () => close());
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target === center) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) { if (listBox.classList.contains('open') && !reduced) toggleList(false); else close(); } });
  }
  return { open, close, remeasure, kick };
}
