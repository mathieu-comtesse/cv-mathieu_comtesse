// Schéma des étapes d'un projet — d'après la reconstitution du schéma animé fournie (cases de 59 px, liaisons en pointillés, case mobile qui passe
// de l'esquisse hachurée au trait, au plein puis à la couleur, voyant vert, vue inclinée « la magie »). Tracé et icônes écrits pour ce site.
// Les étapes sont celles du projet (titre, texte, icône) ; le défilement fait avancer la case mobile d'étape en étape.
const reduced = false;                                  // l'animation est toujours jouée
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
  sharepoint: '<circle cx="9" cy="9" r="5"/><circle cx="16" cy="8" r="4"/><circle cx="14" cy="16" r="4"/><path d="M7.5 9.5c0-1 1-1.5 1.700-1.500S10.800 8.500 10.800 9.500 9 10.500 9 11.500"/>',
  automate: '<path d="M4 8h9a4 4 0 0 1 0 8H8"/><path d="m10 12-3 4 3 4M20 8l-3-3M20 8l-3 3"/>',
  vm: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><rect x="7" y="7.5" width="5" height="4" rx=".6"/>',
  outlook: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.500 7 8.500 6.500L20.500 7"/>',
  'excel-script': '<rect x="3" y="4" width="13" height="12" rx="2"/><path d="M3 9h13M3 13h13M9 4v12"/><path d="m18.500 14.500 2.500 2.500-2.500 2.500M14.500 14.500 12 17l2.500 2.500"/>',
  powerbi: '<rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="16" y="3" width="4" height="17" rx="1"/>',
  design: '<path d="M4 20l1-4L16.500 4.500a2 2 0 0 1 3 3L8 19z"/><path d="m14 7 3 3"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  query: '<circle cx="10.500" cy="10.500" r="6"/><path d="m15 15 5 5M8 10.500h5"/>',
  q18: '<circle cx="11" cy="11" r="7"/><path d="m15.500 15.500 4.500 4.500"/><path d="M8.500 9h5M8.500 12h3.500"/>'
};
const TECH = {
  pdf: 'PDF', queue: 'File d’attente', extract: 'Extraction · OCR', script: 'Script', check: 'Contrôle', html: 'HTML · JavaScript', chart: 'Visualisation',
  excel: 'Excel', export: 'Export', field: 'Champs', inject: 'Injection', sharepoint: 'SharePoint', automate: 'Power Automate', vm: 'Machine virtuelle',
  outlook: 'Outlook', 'excel-script': 'Script Excel', powerbi: 'Power BI', design: 'Conception', archive: 'Archivage', query: 'Requête', q18: 'Reporteur Q18'
};
const icon = (k, x, y, size, cls) => `<g class="${cls}" transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.check}</g>`;
const cut = (t, n) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t);

/* ---------------------------------------------------------------- géométrie : cases de 59 px en serpentin */
function layout(n, narrow) {
  const BOX = 59, cols = narrow ? 3 : 5, W = narrow ? 420 : 843, ROW = narrow ? 158 : 175, TOP = 28.5, M = 30;
  const px = (W - 2 * M - BOX) / (cols - 1), rows = Math.ceil(n / cols);
  const pos = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols); let c = i % cols; if (r % 2) c = cols - 1 - c;
    return { x: M + c * px, y: TOP + r * ROW, r, c, i };
  });
  return { BOX, cols, W, H: TOP + (rows - 1) * ROW + BOX + 56, pos, rows };
}

function linesOf(L) {
  const { BOX, pos } = L, out = [];
  for (let i = 0; i < pos.length - 1; i++) {
    const a = pos[i], b = pos[i + 1], cy = a.y + BOX / 2;
    if (a.r === b.r) {
      const dir = b.x > a.x ? 1 : -1, x1 = dir > 0 ? a.x + BOX + 4 : a.x - 4, x2 = dir > 0 ? b.x - 4 : b.x + BOX + 4;
      out.push(`<line x1="${x1}" y1="${cy}" x2="${x2}" y2="${cy}"/>`, `<circle cx="${x1}" cy="${cy}" r="2.2"/>`, `<circle cx="${x2}" cy="${cy}" r="2.2"/>`);
    } else {                                           // retour à la ligne : un coude hors des cases
      const right = a.x > L.W / 2, ox = right ? a.x + BOX + 16 : a.x - 16, ex = right ? a.x + BOX + 4 : a.x - 4, cy2 = b.y + BOX / 2;
      out.push(`<path d="M${ex} ${cy}H${ox}V${cy2}H${ex}"/>`, `<circle cx="${ex}" cy="${cy}" r="2.2"/>`, `<circle cx="${ex}" cy="${cy2}" r="2.2"/>`);
    }
  }
  return out.join('');
}

function buildSvg(steps, L) {
  const { BOX, pos, W, H } = L, id = 'fl' + Math.random().toString(36).slice(2, 7);
  // hachures : diagonales régulières, rognées par la case
  let hatchLines = '';
  for (let d = -BOX; d <= BOX; d += 7) hatchLines += `<line x1="${d}" y1="${BOX}" x2="${d + BOX}" y2="0"/>`;
  const boxes = pos.map((p, i) => {
    const s = steps[i];
    return `<g class="fl-box" data-i="${i}"><rect class="fl-rect" x="${p.x}" y="${p.y}" width="${BOX}" height="${BOX}" rx="9.5"/>` +
      `<circle class="fl-led" cx="${p.x + 49.5}" cy="${p.y + 9.5}" r="3"/>` + icon(s.icon, p.x + 15.5, p.y + 15.5, 28, 'fl-ico') +
      `<text class="fl-name" x="${p.x + BOX / 2}" y="${p.y + BOX + 17}" text-anchor="middle">${esc(cut(s.title, L.cols === 5 ? 26 : 19))}</text>` +
      `<text class="fl-tech" x="${p.x + BOX / 2}" y="${p.y + BOX + 30}" text-anchor="middle">${esc(TECH[s.icon] || '')}</text></g>`;
  }).join('');
  const mover = `<g class="fl-mover" transform="translate(${pos[0].x} ${pos[0].y})">
    <rect class="fl-m-base" width="${BOX}" height="${BOX}" rx="9.5"/>
    <g class="fl-m-hatch" clip-path="url(#${id}c)">${hatchLines}</g>
    <rect class="fl-m-outline" x="3" y="3" width="${BOX - 6}" height="${BOX - 6}" rx="7"/>
    <rect class="fl-m-solid" x="3" y="3" width="${BOX - 6}" height="${BOX - 6}" rx="7"/>
    <rect class="fl-m-color" x=".5" y=".5" width="${BOX - 1}" height="${BOX - 1}" rx="9"/>
    <g class="fl-m-icon">${icon(steps[0].icon, 15.5, 15.5, 28, 'fl-m-ico')}</g></g>`;
  return `<svg class="fl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma des ${steps.length} étapes du projet" xmlns="${NS}">
    <defs><clipPath id="${id}c"><rect width="${BOX}" height="${BOX}" rx="9.5"/></clipPath>
    <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3d1c"/><stop offset="1" stop-color="#0e1a0e"/></linearGradient></defs>
    <g class="fl-lines" fill="none" stroke-dasharray="4 4">${linesOf(L)}</g>${boxes}${mover}</svg>`.replace('class="fl-m-color"', `class="fl-m-color" fill="url(#${id}g)"`);
}

/* ---------------------------------------------------------------- composant */
export function initFlow(root) {
  const items = [...root.querySelectorAll('.rf-flow-src li')].map((li) => ({ title: li.querySelector('h3').textContent.trim(), text: li.querySelector('p').textContent.trim(), icon: li.dataset.icon || 'check' }));
  if (!items.length) return;
  const host = root.querySelector('.rf-flow-svg'), cap = root.querySelector('.rf-flow-cap'), magicBtn = root.querySelector('.rf-flow-magic');
  const capK = cap.querySelector('.rf-flow-k'), capT = cap.querySelector('h3'), capP = cap.querySelector('p');
  root.classList.add('rf-flow-on');
  let narrow = matchMedia('(max-width: 640px)').matches, L = null, refs = null;

  const mount = () => {
    L = layout(items.length, narrow);
    host.innerHTML = buildSvg(items, L);
    const svg = host.querySelector('svg');
    refs = { svg, mover: svg.querySelector('.fl-mover'), hatch: svg.querySelector('.fl-m-hatch'), outline: svg.querySelector('.fl-m-outline'), solid: svg.querySelector('.fl-m-solid'), color: svg.querySelector('.fl-m-color'), icon: svg.querySelector('.fl-m-icon'), boxes: [...svg.querySelectorAll('.fl-box')] };
    refs.shownIcon = items[0].icon; draw(progress, true);
  };

  /* progression 0 → 1 sur toutes les étapes : la case mobile s'arrête sur chaque case (arrêt, trajet, arrêt) */
  let progress = 0, shown = -1;
  function draw(p, force) {
    const n = items.length, s = p * (n - 1), i0 = Math.min(n - 2, Math.floor(s)), f = s - i0;
    const g = f < .32 ? 0 : f > .68 ? 1 : smooth(f, .32, .68);
    const a = L.pos[i0], b = L.pos[Math.min(n - 1, i0 + 1)];
    // trajet : en coude quand on change de ligne (on passe par le côté), sinon en ligne droite
    let x, y;
    if (a.r === b.r) { x = a.x + (b.x - a.x) * g; y = a.y + (b.y - a.y) * g; }
    else {                                           // changement de ligne : sortie sur le côté, descente, retour
      const off = a.x > L.W / 2 ? 40 : -40;
      if (g < 1 / 3) { x = a.x + off * smooth(g * 3, 0, 1); y = a.y; }
      else if (g < 2 / 3) { x = a.x + off; y = a.y + (b.y - a.y) * smooth(g * 3 - 1, 0, 1); }
      else { x = a.x + off + (b.x - a.x - off) * smooth(g * 3 - 2, 0, 1); y = b.y; }
    }
    refs.mover.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    // aspect de la case mobile : esquisse → trait → plein → couleur (même enchaînement que le schéma de référence)
    const hatch = 1 - smooth(p, .08, .16), outline = smooth(p, .14, .22) * (1 - smooth(p, .38, .46)), solid = smooth(p, .42, .5) * (1 - smooth(p, .66, .74)), color = smooth(p, .7, .8);
    refs.hatch.style.opacity = hatch.toFixed(3); refs.outline.style.opacity = outline.toFixed(3); refs.solid.style.opacity = solid.toFixed(3); refs.color.style.opacity = color.toFixed(3);
    const near = clamp(Math.round(s), 0, n - 1);
    if (refs.shownIcon !== items[near].icon) { refs.shownIcon = items[near].icon; refs.icon.innerHTML = icon(items[near].icon, 15.5, 15.5, 28, 'fl-m-ico'); }
    refs.mover.classList.toggle('fl-done', color > .5);
    refs.boxes.forEach((bx, i) => { const reached = s >= i - .02; bx.classList.toggle('fl-on', reached); bx.classList.toggle('fl-cur', i === near); });
    if (near !== shown || force) { shown = near; caption(near); }
  }
  function caption(i) {
    const st = items[i];
    cap.classList.remove('fl-fade'); void cap.offsetWidth; cap.classList.add('fl-fade');
    capK.textContent = 'Étape ' + (i + 1) + ' / ' + items.length + (TECH[st.icon] ? ' · ' + TECH[st.icon] : '');
    capT.textContent = st.title; capP.textContent = st.text;
  }

  /* défilement → progression (ressort 45 / 20) */
  const sticky = root.querySelector('.rf-flow-sticky');
  const target = () => {
    const top = root.getBoundingClientRect().top + scrollY, stick = parseFloat(getComputedStyle(sticky).top) || 0;
    const range = Math.max(1, root.offsetHeight - sticky.offsetHeight);
    return clamp((scrollY + stick - top) / range, 0, 1);
  };
  let vel = 0, last = 0, raf = 0;
  const frame = (now) => {
    const dt = Math.min(.032, last ? (now - last) / 1000 : .016); last = now;
    const to = target(), k = 45, c = 20;
    vel += (-k * (progress - to) - c * vel) * dt; progress += vel * dt; draw(clamp(progress, 0, 1));
    if (Math.abs(progress - to) > .0004 || Math.abs(vel) > .002) raf = requestAnimationFrame(frame); else { progress = to; vel = 0; draw(to); raf = 0; last = 0; }
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick);
  matchMedia('(max-width: 640px)').addEventListener('change', (e) => { narrow = e.matches; mount(); kick(); });
  mount(); kick();

  /* vue inclinée (« la magie ») : le schéma en perspective, comme sur le schéma de référence */
  const ov = document.createElement('div');
  ov.className = 'fl-ov'; ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = '<button type="button" class="fl-ov-x" aria-label="Fermer">×</button><div class="fl-ov-c"><div class="fl-ov-w"></div></div><p class="fl-ov-cap">VUE INCLINÉE · ÉCHAP POUR FERMER</p>';
  document.body.append(ov);
  const openMagic = () => { ov.querySelector('.fl-ov-w').replaceChildren(host.querySelector('svg').cloneNode(true)); ov.classList.add('is-open'); ov.setAttribute('aria-hidden', 'false'); document.body.classList.add('fl-lock'); ov.querySelector('.fl-ov-x').focus(); };
  const closeMagic = () => { ov.classList.remove('is-open'); ov.setAttribute('aria-hidden', 'true'); document.body.classList.remove('fl-lock'); setTimeout(() => { if (!ov.classList.contains('is-open')) ov.querySelector('.fl-ov-w').replaceChildren(); }, 400); };
  magicBtn?.addEventListener('click', openMagic);
  ov.querySelector('.fl-ov-x').addEventListener('click', closeMagic);
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('fl-ov-c')) closeMagic(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov.classList.contains('is-open')) closeMagic(); });
}
