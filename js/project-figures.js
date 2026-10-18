// Projets professionnels : le défilement des cartes (titres et gains) présente désormais les machines
// dessinées (figures/*.html, compétence anatomy) ; un clic ouvre la machine animée et ses explications.
import { showFinanceEmails } from './finance-emails.js?v=cv-scene-v49';
import { createMarquee } from './marquee.js?v=cv-projects-v15';

// Projet → [figure, objet, idée, l'objet en action] ; l'objet est l'explication.
const MACHINES = {
  cerfa: ['cerfa', 'Trieuse de fiches',
    'Vérifier un lot de fiches à la main, c’est relire chaque case de chaque fiche, et un retard passe facilement inaperçu.',
    'Prenons l’exemple d’une trieuse de cartes : un chargeur, une tête de lecture et quatre cases. Sans elle, 300 fiches CERFA et attestations demandent 20 à 25 h de relecture ; avec elle, chaque fiche passe sous la tête et tombe dans sa case, conforme, doublon, non-conformité ou retard, et le lot est trié en 1 min 20 s.'],
  vmvre: ['vm', 'Pointeuses à clé partagée',
    'Une seule machine doit inscrire les rapports à la fois, sinon le même rapport peut être inscrit deux fois.',
    'Prenons l’exemple de deux pointeuses et d’une seule clé. Seule celle qui tient la clé relève la plus ancienne demande toutes les deux minutes, contrôle le code R004 et l’OT, puis range la carte dans l’historique, qui écarte les doublons ; la reprise par la seconde pointeuse reste à concevoir. Chaque rapport inscrit ainsi rend 30 min.'],
  vre: ['vre', 'Trieuse à quatre tubes',
    'Compter à la main les équipements d’un rapport électrique, c’est relire chaque ligne en tenant quatre totaux de tête.',
    'Prenons l’exemple d’une trieuse de pièces à quatre tubes. Sans elle, le comptage complet demandait environ 25 min par rapport ; avec elle, chaque équipement glisse sur la goulotte et tombe dans le tube de sa famille, BT31, BT33, BT21 ou BT11, et la hauteur des piles donne les totaux du bâtiment.'],
  moteur44: ['moteur', 'Fichier rotatif motorisé',
    'Reporter un rapport dans un grand classeur, c’est d’abord retrouver la bonne ligne parmi des milliers.',
    'Prenons l’exemple d’un fichier rotatif motorisé. Sans lui, on cherche la ligne de l’OT et on recopie les données depuis SharePoint, 15 min par rapport ; avec lui, on compose l’OT, le fichier tourne jusqu’à la bonne fiche, le tampon y reporte les données et un cavalier rend le Q18 visible dans le suivi qui alimente Power BI, pour les COSI et les clients de l’ABE SUD IdF.'],
  gares: ['gares', 'Tableau à palettes',
    'Savoir quelles gares surveiller en premier demandait de croiser plusieurs sources à chaque consultation.',
    'Prenons l’exemple d’un tableau des départs. Sans lui, chaque consultation prenait 10 à 15 min ; avec lui, un bouton dose conformité et maintenance, les palettes se retournent et les gares prioritaires s’affichent, classées par un modèle de 19 tables et 159 mesures.'],
  finance: ['finance', 'Manomètres à contact',
    'Un dépassement de budget se voit trop tard quand on pointe les comptes à la main, périmètre par périmètre.',
    'Prenons l’exemple de cinq manomètres à contact, un par périmètre : CS, Locatif, MEC, PPTM et GLOBAL. Sans eux, le pointage prenait 5 min par périmètre et par jour ; avec eux, l’aiguille monte avec les dépenses et, quand elle touche l’index du seuil, le contact envoie une alerte, et une de plus si les dépenses dépassent les fonds. En exploitation, chaque périmètre en envoie environ 6 par semaine : 5 × 6, soit 30 alertes par semaine, qui remplissent le bac.'],
  pa: ['pp', 'Classeur à échéances',
    'Une échéance de plan de prévention s’oublie quand elle dort dans un dossier parmi des centaines.',
    'Prenons l’exemple d’un classeur à dossiers suspendus rangés par mois d’échéance. Sans lui, contrôler et saisir chaque plan prenait 10 min ; avec lui, chaque PP lu rejoint la section de son mois, et le curseur qui avance devant aujourd’hui déclenche la relance de chaque dossier qu’il atteint. La machine est auto-apprenante : corriger ou compléter une cellule Excel suffit, un script Excel la met à jour.'],
  powerbi: ['powerbi', 'Carrousel de classeurs',
    'Un plan de prévention bien rangé ne sert que si on le retrouve en quelques secondes.',
    'Prenons l’exemple d’un carrousel de classeurs. Sans lui, extraire, ranger et archiver un PP prenait 15 à 20 min, et le retrouver 10 min ; avec lui, la VM range chaque nouveau PP et archive l’ancien, et le carrousel amène le dossier demandé devant le comptoir, 40 fois par jour.'],
  suivi: ['suivi', 'Standard à fiches',
    'Les informations d’un OT sont réparties entre plusieurs outils, et les chercher une à une prend du temps.',
    'Prenons l’exemple d’un standard téléphonique à fiches. Sans lui, une recherche passait d’un outil à l’autre, jusqu’à près d’une heure ; avec lui, la fiche de l’OT, de l’équipement ou du bâtiment se branche sur la bonne source et le lien direct s’établit, sans recopier les données.'],
  studio: ['studio', 'Machine à reproduire les clés',
    'Créer un extracteur pour une nouvelle famille de PDF demandait des jours de développement.',
    'Prenons l’exemple d’une machine à reproduire les clés. Sans elle, il fallait 5 à 10 jours de code ; avec elle, le palpeur suit les zones tracées sur un PDF exemple et la fraise taille la même clé en 4 h, une clé qui ouvre le casier de sa famille et travaille sur l’appareil, sans qu’aucun PDF ne le quitte.'],
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const FRAME_CSS = 'html,body{background:transparent!important;overflow:hidden!important}.iso-page{width:min(920px,100% - 4px);margin:4px auto 8px}';
const kindOf = (p) => (p.id === 'vmvre' ? 'Continuité de traitement' : p.id === 'finance' ? 'Pilotage financier' : 'Processus métier');
const timeLabel = (p) => (p.gainStatus === 'estimated' ? 'Temps libéré (estimé)' : 'Temps libéré');
const moneyLabel = (p, long) => (p.gainStatus === 'result' ? 'Résultat' : p.gainStatus === 'estimated' ? 'Valorisation estimée' : long ? 'Valorisation financière du temps' : 'Valorisation financière');
const dayLabel = (d, halves) => (halves ? d * 2 + ' demi-journées' : d === 0.5 ? 'Une demi-journée' : d === 1 ? '1 jour' : String(d).replace('.', ',') + (d < 2 ? ' jour' : ' jours'));
const buildHTML = (p) => (p.build ? `<span><small>Construction</small><b>${dayLabel(p.build.days, p.build.halves)}</b>${p.build.upkeep === true ? 'puis une amélioration d’une demi-journée par mois' : p.build.upkeep === 'once' ? 'puis une seule amélioration d’une demi-journée, deux mois après la mise en service' : p.build.upkeep === false ? (p.id === 'pa' ? 'auto-apprenante, sans maintenance' : 'puis autonome, sans maintenance') : 'essais auprès des équipes compris'}</span>` : '');
const gainsHTML = (p) => p.gainStatus === 'none' ? '' : `<span><small>${timeLabel(p)}</small><b>${esc(p.time)}</b>${esc(p.timeCtx)}</span><span><small>${moneyLabel(p, true)}</small><b>${esc(p.money)}</b>${esc(p.moneyCtx)}</span>` + buildHTML(p) +
  (p.extraGains || []).map((g) => `<span><small>Temps libéré</small><b>${esc(g.time)}</b>${esc(g.timeCtx)}</span><span><small>Valorisation du temps</small><b>${esc(g.money)}</b>${esc(g.moneyCtx)}</span>`).join('') +
  (p.gainBasis ? `<p class="process-gain-basis">${esc(p.gainBasis)}</p>` : '');


export function initProjectFigures(host, projects) {
  const list = projects.filter((p) => MACHINES[p.id]);
  host.className = 'marquee process-gallery';
  host.innerHTML = `<div class="mq-track process-track">${list.map((p, i) => { const [fig, object] = MACHINES[p.id]; return `<button class="process-card" type="button" data-project="${i}" aria-label="Faire fonctionner ${esc(object.toLowerCase())} : ${esc(p.title)}"><span class="process-kind">${kindOf(p)}</span><span class="machine-wrap" data-fig="${fig}"><img class="machine-light" src="assets/figures/${fig}-light.webp?v=bp2" alt="" width="840" height="600" loading="lazy"></span><b>${esc(p.title)}</b><span>${esc(object)}</span>${p.gainStatus !== 'none' ? `<small class="process-card-gains"><span><em>${timeLabel(p)}</em><strong>${esc(p.time)}</strong><i>${esc(p.timeCtx)}</i></span><span><em>${moneyLabel(p)}</em><strong>${esc(p.money)}</strong><i>${esc(p.moneyCtx)}</i></span></small>` : ''}</button>`; }).join('')}</div><p class="process-hint">Glissez pour parcourir · cliquez sur une machine pour la faire fonctionner</p>`;
  createMarquee(host, { loopEnd: -1, speed: 0.35 });
  host.querySelectorAll('img').forEach((img) => { img.draggable = false; });

  // Sur la page, chaque machine s'anime : la figure vit dans un cadre posé sur sa vignette tant que la carte est visible.
  const CARD_CSS = 'html,body{height:100%;margin:0;background:transparent!important;overflow:hidden!important}.iso-page,.iso-figure,.iso-plate{width:100%!important;max-width:none!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.iso-plate-corners,.iso-legend,.iso-halo{display:none!important}.iso-stage{height:100%!important;pointer-events:none!important}.iso-stage svg{width:100%!important;height:100%!important;display:block}';
  function mountLive(wrap) {
    if (wrap.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.className = 'machine-live'; f.scrolling = 'no'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.src = 'figures/' + wrap.dataset.fig + '.html?v=glow1';
    f.addEventListener('load', () => {
      const doc = f.contentDocument; if (!doc?.body) return;
      const s = doc.createElement('style'); s.textContent = CARD_CSS; doc.head.append(s);
      const svg = doc.querySelector('.iso-stage svg');
      if (svg) { const b = svg.getBBox(), pad = Math.max(b.width, b.height) * 0.03; svg.setAttribute('viewBox', [b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad].join(' ')); }
      wrap.classList.add('live');
    });
    wrap.append(f);
  }
  const unmountLive = (wrap) => { wrap.classList.remove('live'); wrap.querySelector('iframe')?.remove(); };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let paused = false;
    const wraps = [...host.querySelectorAll('.machine-wrap')];
    const watch = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting && !paused) mountLive(e.target); else if (!e.isIntersecting) unmountLive(e.target); }), { rootMargin: '0px 120px' });
    wraps.forEach((w) => watch.observe(w));
    document.addEventListener('project-workshop', (e) => { paused = e.detail.open; if (paused) wraps.forEach(unmountLive); else wraps.forEach((w) => { watch.unobserve(w); watch.observe(w); }); });
  }

  const modal = document.createElement('dialog');
  modal.className = 'process-dialog figure-dialog'; modal.setAttribute('aria-labelledby', 'process-title');
  modal.innerHTML = `<div class="process-toolbar"><button type="button" class="process-back">Retour aux projets</button><span>Les machines des projets</span></div>
<div class="process-content"><div class="process-copy figure-head"><p class="process-eyebrow"></p><h2 id="process-title"></h2><p class="figure-why"></p></div><div class="figure-stage"></div><div class="process-copy"><div class="process-outcome"></div><details class="process-study" hidden><summary>Lire la fiche complète</summary><div></div></details><div class="finance-mail-host" hidden></div><p class="process-foot"><a class="figure-full" target="_blank" rel="noopener">Ouvrir la machine en plein écran</a> · les quantités montrées par les machines sont illustratives, les gains sont ceux des projets</p></div><div class="process-projects" aria-label="Choisir un autre projet"></div></div><button type="button" class="figure-nav prev" aria-label="Projet précédent"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><button type="button" class="figure-nav next" aria-label="Projet suivant"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>`;
  document.body.append(modal);
  const stage = modal.querySelector('.figure-stage');
  let opener = null, resize = null, cur = 0;
  function mount(fig, title) {
    resize?.disconnect();
    const frame = document.createElement('iframe');
    frame.className = 'figure-frame'; frame.style.opacity = '0'; frame.scrolling = 'no'; frame.title = title; frame.src = 'figures/' + fig + '.html?v=bp2';
    frame.addEventListener('load', () => {
      const doc = frame.contentDocument; if (!doc?.body) return;
      const s = doc.createElement('style'); s.textContent = FRAME_CSS; doc.head.append(s); frame.style.opacity = '';
      const fit = () => { const page = doc.querySelector('.iso-page'); if (page) frame.style.height = Math.ceil(page.getBoundingClientRect().bottom + 8) + 'px'; };
      resize = new ResizeObserver(fit); resize.observe(doc.body); fit();
    });
    stage.replaceChildren(frame);
  }
  function close() { modal.close(); resize?.disconnect(); stage.replaceChildren(); document.body.classList.remove('lock'); document.dispatchEvent(new CustomEvent('project-workshop', { detail: { open: false } })); opener?.focus(); }
  function open(n, trigger) {
    const p = list[n], [fig, object, idea, action] = MACHINES[p.id];
    opener = trigger || opener; cur = n;
    if (!modal.open) { modal.showModal(); document.body.classList.add('lock'); document.dispatchEvent(new CustomEvent('project-workshop', { detail: { open: true } })); }
    modal.scrollTop = 0; modal.dataset.project = p.id;
    modal.querySelector('.process-eyebrow').textContent = kindOf(p) + ' · ' + object;
    modal.querySelector('#process-title').textContent = p.title;
    modal.querySelector('.figure-why').innerHTML = `<em>${esc(idea)}</em> ${esc(action)}`;
    modal.querySelector('.process-outcome').innerHTML = gainsHTML(p);
    const study = modal.querySelector('.process-study'); study.hidden = !p.pro; study.open = false;
    study.querySelector('div').innerHTML = p.pro ? [p.pro.lead, p.pro.gain, p.pro.team].filter(Boolean).map((t) => '<p>' + esc(t) + '</p>').join('') : '';
    const mails = modal.querySelector('.finance-mail-host'); mails.hidden = p.id !== 'finance'; if (p.id === 'finance') showFinanceEmails(mails);
    modal.querySelector('.figure-full').href = 'figures/' + fig + '.html';
    modal.querySelector('.process-projects').innerHTML = list.map((q, i) => `<button type="button" data-project="${i}" aria-current="${i === n ? 'true' : 'false'}">${esc(q.title)}</button>`).join('');
    mount(fig, object + ' · ' + p.title);
    modal.querySelector('.process-back').focus();
  }
  function step(d) {
    open((cur + d + list.length) % list.length);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) modal.querySelector('.process-content').animate([{ opacity: 0, transform: `translateX(${d * 28}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  modal.querySelector('.figure-nav.prev').onclick = () => step(-1);
  modal.querySelector('.figure-nav.next').onclick = () => step(1);
  modal.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1); } });
  host.addEventListener('click', (e) => { const b = e.target.closest('button[data-project]'); if (b) open(Number(b.dataset.project), b); });
  modal.addEventListener('click', (e) => { const b = e.target.closest('.process-projects button[data-project]'); if (b) open(Number(b.dataset.project)); });
  modal.querySelector('.process-back').onclick = close;
  modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
}
