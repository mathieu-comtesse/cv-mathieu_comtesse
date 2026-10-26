// Refonte : scène fixe (plan blueprint + vraie pièce 3D du site) qui s'estompe au défilement, titre et règles fixes,
// puis présentation « About » qui se fige un moment (paragraphes révélés en suivant le défilement), signature, tirelire,
// sections, contact. Le blog vit dans sa propre page (blog).
import * as THREE from 'three';
import { createRoom } from '../js/room.js?v=nt6-20261026';
import { initUI } from '../js/ui.js?v=cv-monde3d-26';
import { initHome } from '../js/home.js?v=cv-light-v23';
import { initBlueprint } from './blueprint-hero.js';
import './footer.js';
import './navfx.js';
import './viewbtn.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const DEG = Math.PI / 180;
initUI();
// la tirelire des gains (code réel du site) est lancée après l'intro : son rendu 3D ne doit pas figer l'ouverture
const startHome = () => { try { initHome(); } catch (e) { console.error(e); } };

/* ---------------------------------------------------------------- plan + pièce */
let sceneMuted = false;
const stage = $('stage'), caption = $('rf-caption');
const bp = initBlueprint($('rf-bp'), stage);
window.__rfFreeCam = true;           // la caméra ne suit jamais le personnage
let room = null;
const FOLLOW = 3.56;                 // la scène a disparu après 3,56 hauteurs d'écran de défilement (mesuré sur la page de référence)
const HOME = [0.1, 0.8, -0.2];
const follow = () => clamp(scrollY / (FOLLOW * innerHeight), 0, 1);

/* Les deux règles agissent sur la vue (plan et pièce reçoivent exactement la même caméra) :
   - règle horizontale = « Tourner » : glisser à gauche / à droite fait tourner le décor autour de lui-même ;
   - règle verticale = « Incliner » : glisser vers le haut / le bas modifie l'angle de vue, de la vue basse à la vue plongeante. */
let rot = 0;                         // « Tourner » : décalage en pixels de la règle horizontale
let tilt = 0;                        // « Incliner » : décalage en pixels de la règle verticale
const LIM = 250, DEG_PER_PX = .36;   // limite en pixels, degrés d'azimut et d'élévation par pixel
const azimuth = () => (36 + rot * DEG_PER_PX) * DEG;
/* Cliquet de la règle : un clic sec à chaque graduation franchie (son synthétisé, coupé par le bouton de son de la scène). */
let ac = null, lastTick = 0;
function tick(major) {
  if (sceneMuted || reduced) return;
  const now = performance.now(); if (now - lastTick < 16) return; lastTick = now;
  try {
    ac ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime, f = 1 + (Math.random() - .5) * .1;
    const len = Math.floor(ac.sampleRate * .018), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * .16));
    const n = ac.createBufferSource(); n.buffer = buf;
    const bq = ac.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = (major ? 3900 : 3100) * f; bq.Q.value = 1.4;
    const gn = ac.createGain(); gn.gain.value = major ? .55 : .32;
    n.connect(bq).connect(gn).connect(ac.destination); n.start(t);
    const o = ac.createOscillator(), og = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime((major ? 2300 : 1750) * f, t); o.frequency.exponentialRampToValueAtTime(900, t + .02);
    og.gain.setValueAtTime(major ? .07 : .045, t); og.gain.exponentialRampToValueAtTime(.0001, t + .022);
    o.connect(og).connect(ac.destination); o.start(t); o.stop(t + .03);
  } catch {}
}
const lastIdx = { r: 0, t: 0 };
const curVal = (k) => (k === 'r' ? rot : tilt);
function applyView(moved) {
  for (const k of moved || []) {
    const idx = Math.floor(curVal(k) / 5), n = Math.min(3, Math.abs(idx - lastIdx[k]));
    for (let i = 0; i < n; i++) tick((idx - i * Math.sign(idx - lastIdx[k])) % 10 === 0);
    lastIdx[k] = idx;
  }
  if (!moved) for (const k of ['r', 't']) lastIdx[k] = Math.floor(curVal(k) / 5);
  const a = azimuth();
  bp.setYaw(a); bp.setPan(0, 0);
  if (room) {
    if (room.cameraMode !== 'free') room.setCameraMode('free');   // la pièce ne doit pas repasser en suivi du personnage
    room.view.tAz = a;
    room.view.tEl = elev() * DEG;
    room.target.set(HOME[0], HOME[1], HOME[2]);
  }
  $('rf-track').style.transform = `translateY(${tilt}px)`;
  $('rf-track-h').style.transform = `translateX(${rot}px)`;
}
/* La pièce (caméra orthographique) est posée sur le plan en perspective : on fige sa caméra sur l'angle du plan et on la remet en place après un geste. */
/* La caméra orthographique de la pièce devient une perspective calée sur les mêmes étendues à la distance de la cible (40 u) :
   la pièce garde sa taille au centre, mais ce qui est plus proche grossit et ce qui est plus loin rapetisse. Le plan blueprint est rendu
   avec cette même caméra, donc les deux restent sur le même plan, avec la même profondeur. */
function perspectivize(cam) {
  const N = 12, F = 140, R = 40;
  cam.near = N; cam.far = F;
  cam.isOrthographicCamera = false; cam.isPerspectiveCamera = true;
  cam.updateProjectionMatrix = function () {
    const k = N / R;
    this.projectionMatrix.makePerspective(this.left * k, this.right * k, this.top * k, this.bottom * k, N, F);
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  };
  cam.updateProjectionMatrix();
}
const EL0 = 26;                      // élévation de départ (degrés), comme avant
const tiltDeg = () => (tilt >= 0 ? tilt * (82 - EL0) / LIM : tilt * (EL0 - 6) / LIM);   // toute la course de la règle = toute la plage d'angles (6° à 82°)
const elev = () => clamp(EL0 + 14 * follow() + tiltDeg(), 6, 82);   // la règle verticale s'ajoute à l'inclinaison due au défilement
function lockView() { if (!room || room.appOpen || room.crate?.isOpen) return;   // pas de retour de zoom pendant le bac à vinyles ou une application ouverte
  room.setCameraMode('free'); room.view.tZoom = 1; room.view.tEl = elev() * DEG; applyView(); }
let relock = 0;
addEventListener('pointerup', () => { clearTimeout(relock); relock = setTimeout(lockView, 700); });

const muteButton = $('scene-mute');
try { sceneMuted = localStorage.getItem('scene-muted') === '1'; } catch {}
const refreshMute = () => { muteButton.setAttribute('aria-pressed', String(sceneMuted)); muteButton.setAttribute('aria-label', sceneMuted ? 'Activer les sons de la scène' : 'Couper les sons de la scène'); muteButton.title = sceneMuted ? 'Sons de la scène coupés' : 'Sons de la scène actifs'; muteButton.querySelector('.mute-slash').style.display = sceneMuted ? '' : 'none'; room?.setSceneMuted(sceneMuted); };
muteButton.addEventListener('click', () => { sceneMuted = !sceneMuted; try { localStorage.setItem('scene-muted', sceneMuted ? '1' : '0'); } catch {} refreshMute(); });
refreshMute();
document.addEventListener('project-workshop', (e) => { if (e.detail.open) room?.pauseAutonomy(3600000); else room?.pauseAutonomy(3000); });
/* ---------------------------------------------------------------- pièce
   Le plan blueprint n'est relié à la caméra de la pièce qu'une fois celle-ci prête (pas de saut de zoom) ; la tirelire, plus lourde, se charge un peu après. */
const roomEl = $('room');
/* Ouverture : un fond bleu (même teinte que le plan) s'affiche aussitôt avec le titre ; le plan et la pièce n'apparaissent qu'ensemble,
   déjà calés sur la même caméra, en un seul fondu. Plus de pré-image ni de plan qui change de zoom en cours de route. */
const revealStage = () => setTimeout(() => { stage.classList.add('rf-ready'); window.ToddhamIntro?.done(); }, 80);
createRoom(roomEl, $('bubble')).then((r) => { window.room = room = r; perspectivize(room.camera); bp.link(room.camera); refreshMute(); lockView(); onScroll(); revealStage(); }).catch((e) => {
  console.error(e);
  roomEl.insertAdjacentHTML('beforeend', '<p class="hint">La pièce 3D ne peut pas s’afficher sur cet appareil.</p>');
  revealStage();
});
(document.fonts?.ready ?? Promise.resolve()).then(() => setTimeout(() => caption.classList.add('rf-in'), 150));
setTimeout(startHome, 900);

/* ---------------------------------------------------------------- règles graduées (101 graduations, 11 repères, repère blanc fixe au centre) */
function buildTicks(track, horizontal) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i <= 100; i++) {
    const t = document.createElement('div');
    t.className = 'rf-tick' + (i % 10 === 0 ? ' rf-maj' : '');
    t.style[horizontal ? 'left' : 'top'] = i * 5 + 'px';
    if (i % 10 === 0) t.innerHTML = `<span>${(i / 100).toFixed(2)}</span>`;
    frag.append(t);
  }
  track.append(frag);
}
const rulerV = $('rf-ruler'), rulerH = $('rf-ruler-h');
buildTicks($('rf-track'), false); buildTicks($('rf-track-h'), true);
function dragRuler(el, mode) {
  let d = null;
  const horiz = mode === 'turn', key = horiz ? 'r' : 't';
  const get = () => (horiz ? rot : tilt), set = (v) => { v = clamp(v, -LIM, LIM); if (horiz) rot = v; else tilt = v; };
  el.addEventListener('pointerdown', (e) => { if (ac && ac.state === 'suspended') ac.resume(); d = { px: e.clientX, py: e.clientY, v: get() }; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener('pointermove', (e) => { if (!d) return; set(d.v + (horiz ? e.clientX - d.px : e.clientY - d.py)); applyView([key]); });
  const end = () => { d = null; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('dblclick', () => { set(0); applyView(); });
  el.addEventListener('keydown', (e) => {
    const step = 20, dir = horiz ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
    if (e.key in dir) { set(get() + dir[e.key] * step); applyView([key]); e.preventDefault(); } else if (e.key === 'Home') { set(0); applyView(); }
  });
}
dragRuler(rulerH, 'turn'); dragRuler(rulerV, 'tilt');

/* la règle horizontale se place juste au-dessus du titre */
function placeRuler() { document.documentElement.style.setProperty('--rf-cap-h', caption.offsetHeight + 'px'); }
addEventListener('resize', placeRuler); placeRuler(); (document.fonts?.ready ?? Promise.resolve()).then(placeRuler);

/* ---------------------------------------------------------------- défilement */
// Opacité de la scène : valeurs relevées sur la page de référence (en hauteurs d'écran → opacité), interpolées linéairement.
const FADE = [[0, 1], [1, 1], [1.11, .991], [1.78, .444], [2.67, .119], [3.56, 0]];
function stageOpacity(u) {
  if (u <= FADE[0][0]) return FADE[0][1];
  for (let i = 1; i < FADE.length; i++) if (u <= FADE[i][0]) { const [x0, y0] = FADE[i - 1], [x1, y1] = FADE[i]; return y0 + (y1 - y0) * (u - x0) / (x1 - x0); }
  return 0;
}
const paras = [...document.querySelectorAll('.rf-ap')];
let ticking = false;
function onScroll() {
  ticking = false;
  const vh = innerHeight, o = stageOpacity(scrollY / vh), p = follow();
  stage.style.opacity = o.toFixed(3);
  stage.style.zIndex = o <= .001 ? '-1' : '0';
  stage.style.pointerEvents = scrollY > vh * .6 ? 'none' : '';
  caption.style.opacity = Math.min(o, clamp(1 - (scrollY / vh - .6) / .7, 0, 1)).toFixed(3);   // le titre part avant l'arrivée du texte
  for (const r of [rulerV, rulerH]) { r.style.opacity = o.toFixed(3); r.style.pointerEvents = o < .3 ? 'none' : ''; }
  bp.setScroll(p);                                              // plan et pièce descendent ensemble
  if (room) room.view.tEl = elev() * DEG;
  // révélation des paragraphes : translation 16 → 0 px et opacité en suivant la position (début à 90 % de l'écran, fin à 60 %)
  for (const el of paras) {
    const r = el.getBoundingClientRect().top / vh, k = reduced ? 1 : clamp((.9 - r) / .3, 0, 1);
    el.style.transform = k >= 1 ? 'none' : `translateY(${(16 * (1 - k)).toFixed(2)}px)`;
    el.style.opacity = clamp((k - .5) / .5, 0, 1).toFixed(3);
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
// si le bloc de présentation dépasse la hauteur de l'écran, on ne le fige pas (sinon sa fin resterait hors de vue)
function fitAbout() {
  const sec = document.querySelector('.rf-about'), inner = document.querySelector('.rf-about-in');
  if (sec && inner) sec.style.paddingBottom = inner.offsetHeight > innerHeight - 64 ? '0' : '';
}
addEventListener('resize', () => { fitAbout(); onScroll(); });
fitAbout();
onScroll();

/* ---------------------------------------------------------------- titre : flou → net à l'arrivée */


/* ---------------------------------------------------------------- apparitions des autres sections */
{
  const els = document.querySelectorAll('.rf-rv');
  if (reduced || !('IntersectionObserver' in window)) els.forEach((e) => e.classList.add('rf-in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rf-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach((e) => io.observe(e));
  }
}

/* ---------------------------------------------------------------- signature : tracé trait après trait
   pathLength 0→1 et opacité 0→1, 0,45 s entre deux traits, premier trait 1 s en easeInOut, suivants 0,45 s en linéaire,
   déclenchée une fois à l'entrée dans l'écran (marge −100 px). */
{
  const box = $('rf-sign');
  const paths = box ? [...box.querySelectorAll('svg path')] : [];
  if (paths.length && !reduced) {
    paths.forEach((p) => { p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = '1'; p.style.opacity = '0'; });
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      paths.forEach((p, i) => {
        const a = p.animate([{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1 }], { duration: parseFloat(p.style.getPropertyValue('--duration')) * 1000 || 450, delay: parseFloat(p.style.getPropertyValue('--delay')) * 1000 || i * 450, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' });
        a.finished.then(() => { p.style.strokeDashoffset = '0'; p.style.opacity = '1'; }).catch(() => {});
      });
    }, { rootMargin: '0px 0px -100px 0px' }).observe(box);
  }
}

/* ---------------------------------------------------------------- contact : l'adresse se copie (icône « copier » au survol) */
{
  const mail = $('rf-mail');
  const copy = async () => {
    const text = mail.dataset.copy;
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove();
    }
    mail.classList.add('rf-copied'); mail.setAttribute('aria-label', 'Adresse copiée'); clearTimeout(copy.t);
    copy.t = setTimeout(() => { mail.classList.remove('rf-copied'); mail.setAttribute('aria-label', 'Copier l’adresse ' + text); }, 1800);
  };
  mail.addEventListener('click', copy);
  mail.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } });
}

/* ---------------------------------------------------------------- machines animées des projets pro
   Comme sur l'index d'origine : la figure (figures/<nom>.html) s'anime dans la tuile tant qu'elle est visible, puis dans la fiche. */
const CARD_CSS = 'html,body{height:100%;margin:0;background:transparent!important;overflow:hidden!important}.iso-page,.iso-figure,.iso-plate{width:100%!important;max-width:none!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.iso-plate-corners,.iso-legend,.iso-halo{display:none!important}.iso-stage{height:100%!important;pointer-events:none!important}.iso-stage svg{width:100%!important;height:100%!important;display:block}';
const FRAME_CSS = 'html,body{background:transparent!important;overflow:hidden!important}.iso-page{width:min(920px,100% - 4px);margin:4px auto 8px}';
{
  // tuiles : la machine 3D du projet sur le plan blueprint (comme sur les pages projet), animée tant que la tuile est visible
  const active = new Map();
  const mount = async (wrap) => {
    if (active.has(wrap)) return;
    active.set(wrap, null);
    const canvas = document.createElement('canvas'); canvas.className = 'rf-tile-3d'; canvas.setAttribute('aria-hidden', 'true'); wrap.append(canvas);
    try {
      const { mountTile } = await import('./m3d/tile.js');
      const t = await mountTile(wrap.dataset.fig, canvas);
      if (!active.has(wrap)) { t.dispose(); canvas.remove(); return; }
      const ro = new ResizeObserver(() => t.resize()); ro.observe(canvas);
      const t0 = performance.now(); let raf = 0;
      const loop = () => { raf = requestAnimationFrame(loop); if (!document.hidden) t.render((performance.now() - t0) / 1000); };
      if (reduced) t.render(6); else loop();
      wrap.classList.add('rf-on');
      active.set(wrap, { t, ro, canvas, stop: () => cancelAnimationFrame(raf) });
    } catch (e) { console.warn('tuile 3D indisponible', e); canvas.remove(); active.delete(wrap); wrap.classList.add('rf-fallback'); }
  };
  const unmount = (wrap) => {
    const a = active.get(wrap); active.delete(wrap); wrap.classList.remove('rf-on');
    if (a) { a.stop(); a.ro.disconnect(); a.t.dispose(); a.canvas.remove(); }
  };
  {
    const wraps = [...document.querySelectorAll('.rf-tile-bg[data-fig]')];
    const dlg = document.getElementById('rf-dialog');
    const watch = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !dlg.open) mount(e.target); else if (!e.isIntersecting) unmount(e.target); }), { rootMargin: '80px 0px' });
    wraps.forEach((w) => watch.observe(w));
    const refresh = () => { if (dlg.open) wraps.forEach(unmount); else wraps.forEach((w) => { watch.unobserve(w); watch.observe(w); }); };
    dlg.addEventListener('toggle', refresh);
    new MutationObserver(refresh).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  }
  // fiche : la machine complète, en pleine animation
  window.rfMountFigure = (fig) => {
    if (!fig || !fig.dataset.fig) return;
    const frame = document.createElement('iframe');
    frame.className = 'rf-fig-frame'; frame.scrolling = 'no'; frame.title = 'Machine animée'; frame.style.opacity = '0'; frame.src = 'figures/' + fig.dataset.fig + '.html?v=bp2';
    frame.addEventListener('load', () => {
      const doc = frame.contentDocument; if (!doc?.body) return;
      const s = doc.createElement('style'); s.textContent = FRAME_CSS; doc.head.append(s); frame.style.opacity = '';
      const fit = () => { const page = doc.querySelector('.iso-page'); if (page) frame.style.height = Math.ceil(page.getBoundingClientRect().bottom + 8) + 'px'; };
      new ResizeObserver(fit).observe(doc.body); fit();
    });
    fig.querySelector('img')?.remove(); fig.append(frame);
  };
}

/* ---------------------------------------------------------------- détail d'un projet (depuis une tuile, ou depuis le blog : ?projet=<id>) */
{
  const dlg = $('rf-dialog'), body = $('rf-dialog-body');
  const open = (id) => { const t = document.getElementById('d-' + id) || document.getElementById(id); if (!t || !t.content) return; body.replaceChildren(t.content.cloneNode(true)); dlg.showModal(); window.rfMountFigure?.(body.querySelector('.rf-d-fig[data-fig]')); };
  document.querySelectorAll('[data-detail]').forEach((b) => b.addEventListener('click', () => open(b.dataset.detail)));
  dlg.querySelector('.rf-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => body.replaceChildren());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  const wanted = new URLSearchParams(location.search).get('projet');
  if (wanted) addEventListener('load', () => { document.getElementById('projets')?.scrollIntoView({ behavior: 'instant' }); open(wanted); });
}

// Aide à la vérification : ?stop=<id de section> ouvre la page à cet endroit (ex. ?stop=projets).
{
  const id = new URLSearchParams(location.search).get('stop'), el = id && document.getElementById(id);
  if (el) addEventListener('load', () => { scrollTo({ top: el.getBoundingClientRect().top + scrollY - 20, behavior: 'instant' }); onScroll(); });
}
