// Collection « Projets professionnels » : dix figures anatomy, une seule chargée à la fois.
// Chaque figure est une page autonome (figures/*.html) affichée dans un cadre à hauteur ajustée.
const FIGS = [
  ['cerfa', 'CERFA v3', 'Trieuse de fiches', '20–25 h → 1 min 20 s'],
  ['vm', 'VRE / VLE par VM', 'Pointeuses à clé partagée', '30 min par rapport'],
  ['vre', 'Extracteur VRE', 'Trieuse à quatre tubes', '25 min par rapport'],
  ['moteur', 'Moteur V4.4', 'Fichier rotatif motorisé', '15 min par rapport'],
  ['gares', 'Gares prioritaires', 'Tableau à palettes', '750–1 687,5 h par an'],
  ['finance', 'Point financier', 'Manomètres à contact', '25 min par jour'],
  ['pp', 'Chaîne des PP', 'Classeur à échéances', '40 min par jour'],
  ['powerbi', 'Power BI · PP & MOSO', 'Carrousel de classeurs', '6 h 40 de consultation par jour'],
  ['suivi', 'Retrouver tout le suivi', 'Standard à fiches', '10–15 min par recherche'],
  ['studio', 'Studio d’extracteurs', 'Machine à reproduire les clés', '5–10 jours → 4 h'],
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FRAME_CSS = 'html,body{background:transparent!important}.iso-page{width:min(880px,100% - 8px);margin:4px auto 12px}';

export function initFigures(root) {
  if (!root) return;
  root.innerHTML = `<ol class="figs-list">${FIGS.map(([id, title, machine, gain], i) => `<li><button type="button" data-fig="${i}" aria-pressed="false"><span class="figs-n">${String(i + 1).padStart(2, '0')}</span><span class="figs-t">${esc(title)}</span><span class="figs-m">${esc(machine)}</span><span class="figs-g">${esc(gain)}</span></button></li>`).join('')}</ol>
<div class="figs-stage"><iframe class="figs-frame" title="" loading="lazy"></iframe><a class="figs-open" target="_blank" rel="noopener">Ouvrir la figure en plein écran</a></div>`;
  const frame = root.querySelector('.figs-frame'), open = root.querySelector('.figs-open'), buttons = [...root.querySelectorAll('[data-fig]')];
  let resize = null;
  // Thème et fond du site appliqués dans le cadre ; la hauteur suit la page de la figure.
  const theme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const paint = (doc) => { doc.body.dataset.theme = theme(); doc.documentElement.style.colorScheme = theme(); };
  const dress = () => {
    const doc = frame.contentDocument; if (!doc?.body) return;
    if (!doc.getElementById('figs-frame-css')) { const s = doc.createElement('style'); s.id = 'figs-frame-css'; s.textContent = FRAME_CSS; doc.head.append(s); }
    paint(doc);
    // Hauteur du contenu seul : le cadre ne garde pas d'espace vide sous la légende.
    const fit = () => { const page = doc.querySelector('.iso-page'); if (page) frame.style.height = Math.ceil(page.getBoundingClientRect().bottom + 12) + 'px'; };
    resize?.disconnect(); resize = new ResizeObserver(fit); resize.observe(doc.body); fit();
  };
  frame.addEventListener('load', dress);
  new MutationObserver(() => { const doc = frame.contentDocument; if (doc?.body) paint(doc); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const show = (i, focus = false) => {
    const [id, title] = FIGS[i], url = 'figures/' + id + '.html';
    buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    if (frame.getAttribute('src') !== url) { frame.setAttribute('src', url); frame.title = 'Figure ' + String(i + 1).padStart(2, '0') + ' · ' + title; }
    open.href = url;
    if (focus) buttons[i].focus();
  };
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-fig]'); if (b) show(+b.dataset.fig); });
  root.querySelector('.figs-list').addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement); if (i < 0) return;
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (step) { e.preventDefault(); show((i + step + FIGS.length) % FIGS.length, true); }
  });
  show(0);
}
