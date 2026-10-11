// Collection « Projets professionnels » : dix figures anatomy, une seule chargée à la fois.
// Chaque figure est une page autonome (figures/*.html) affichée dans un cadre à hauteur ajustée.
// [id, titre, machine, gain, pourquoi cet objet, ce qui bouge et ce que ce mouvement signifie]
const FIGS = [
  ['cerfa', 'CERFA v3', 'Trieuse de fiches', '20–25 h → 1 min 20 s',
    'Une trieuse de cartes lit chaque fiche une à une et la range dans sa case, exactement ce que fait le traitement d’un lot de CERFA.',
    'Chaque fiche quitte le chargeur, passe sous la tête de lecture et tombe dans sa case : le lot est contrôlé fiche par fiche, conformes, doublons, non-conformités et retards séparés.'],
  ['vm', 'VRE / VLE par VM', 'Pointeuses à clé partagée', '30 min par rapport',
    'Une pointeuse relève chaque passage sans qu’on y pense, comme la VM relève les demandes toutes les deux minutes, et sa clé unique dit qu’une seule VM écrit à la fois.',
    'La carte de la demande entre dans la pointeuse qui tient la clé, l’OT s’affiche, puis la carte rejoint l’historique : la demande est relevée, contrôlée et inscrite.'],
  ['vre', 'Extracteur VRE', 'Trieuse à quatre tubes', '25 min par rapport',
    'Une trieuse de pièces compte en triant, ce qui est exactement le travail fait sur un rapport VRE : séparer les équipements par famille et les dénombrer.',
    'Chaque jeton glisse sur la goulotte et tombe dans le tube de sa famille : la hauteur des piles est le comptage BT31, BT33, BT21 et BT11 du rapport.'],
  ['moteur', 'Moteur V4.4', 'Fichier rotatif motorisé', '15 min par rapport',
    'Un fichier rotatif motorisé retrouve une fiche parmi des centaines à partir d’un numéro, comme le moteur retrouve la bonne ligne Excel à partir de l’OT.',
    'Le fichier tourne jusqu’à la fiche de l’OT composé, le tampon y reporte les données et le cavalier se clipse : le rapport est sur la bonne ligne et le Q18 devient visible.'],
  ['gares', 'Gares prioritaires', 'Tableau à palettes', '750–1 687,5 h par an',
    'Le tableau des départs est l’objet que tout le monde sait lire en gare : il donne un ordre de priorité d’un coup d’œil.',
    'Tourner le bouton change le poids de la conformité et de la maintenance, et les palettes se retournent : le classement des gares à surveiller se met à jour.'],
  ['finance', 'Point financier', 'Manomètres à contact', '25 min par jour',
    'Un manomètre à contact montre une pression qui monte et déclenche un signal à un seuil réglé, comme des dépenses qui approchent des fonds du compte.',
    'L’aiguille monte avec les dépenses ; quand elle touche l’index du seuil, le contact s’allume et une enveloppe d’alerte tombe dans le bac, une seule fois.'],
  ['pp', 'Chaîne des PP', 'Classeur à échéances', '40 min par jour',
    'Un classeur à dossiers suspendus rangés par mois d’échéance est la façon physique de ne jamais oublier une date.',
    'Chaque PP lu rejoint la section de son mois, et le curseur qui avance un mois devant aujourd’hui déclenche la relance de chaque dossier qu’il atteint.'],
  ['powerbi', 'Power BI · PP & MOSO', 'Carrousel de classeurs', '6 h 40 de consultation par jour',
    'Un carrousel de classeurs amène le bon dossier devant celui qui le demande, sans qu’il ait à le chercher : c’est le rôle du portail PP & MOSO.',
    'Le carrousel tourne et sort le dossier demandé devant le comptoir, c’est la consultation ; la VM range chaque nouveau PP et archive l’ancien, c’est le traitement.'],
  ['suivi', 'Retrouver tout le suivi', 'Standard à fiches', '10–15 min par recherche',
    'Un standard téléphonique ne stocke rien, il relie : c’est le rôle de l’interface qui mène directement à la bonne source.',
    'La fiche de la recherche, OT, équipement ou bâtiment, se branche sur le jack de la bonne source et la lampe s’allume : le lien direct est établi.'],
  ['studio', 'Studio d’extracteurs', 'Machine à reproduire les clés', '5–10 jours → 4 h',
    'Reproduire une clé, c’est copier la forme d’un modèle sans savoir fabriquer la serrure : le studio copie les zones d’un PDF exemple sans écrire de code.',
    'Le palpeur suit les encoches de la clé modèle pendant que la fraise taille les mêmes dans l’ébauche ; la clé obtenue tourne dans la serrure et ouvre le casier de sa famille, comme l’extracteur traite les PDF de sa famille.'],
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FRAME_CSS = 'html,body{background:transparent!important}.iso-page{width:min(880px,100% - 8px);margin:4px auto 12px}';

export function initFigures(root) {
  if (!root) return;
  root.innerHTML = `<ol class="figs-list">${FIGS.map(([id, title, machine, gain], i) => `<li><button type="button" data-fig="${i}" aria-pressed="false"><span class="figs-n">${String(i + 1).padStart(2, '0')}</span><span class="figs-t">${esc(title)}</span><span class="figs-m">${esc(machine)}</span><span class="figs-g">${esc(gain)}</span></button></li>`).join('')}</ol>
<div class="figs-stage"><div class="figs-why"><p><b>Pourquoi cet objet</b><span data-why></span></p><p><b>Ce qui bouge</b><span data-moves></span></p></div><iframe class="figs-frame" title="" loading="lazy"></iframe><a class="figs-open" target="_blank" rel="noopener">Ouvrir la figure en plein écran</a></div>`;
  const frame = root.querySelector('.figs-frame'), open = root.querySelector('.figs-open'), buttons = [...root.querySelectorAll('[data-fig]')];
  const why = root.querySelector('[data-why]'), moves = root.querySelector('[data-moves]');
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
    const [id, title, , , reason, motion] = FIGS[i], url = 'figures/' + id + '.html';
    why.textContent = reason; moves.textContent = motion;
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
