/* Télé JVC Video Capsule : le film joue sur l'écran bombé du modèle 3D déployé (fenêtre js/jvc-tv.js).
   La caméra est orthographique : un écran rectangulaire se projette donc en parallélogramme, et une simple transformation CSS (matrix) colle
   le lecteur YouTube sur le verre, à chaque image, quel que soit l'angle de vue. Rien n'est hébergé ici : la lecture est assurée par YouTube.
   Effet cathodique : allumage, balayage, vignette, reflet du verre, lueur bleutée, neige entre deux chaînes. Le lecteur n'existe que télé allumée. */
import { FILMS } from './tv-films.js?v=tv3';

const TUBE_W = 640;                       // taille logique du tube ; la transformation CSS la ramène à la taille de l'écran à l'image
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const pad = (n) => String(n).padStart(2, '0');

/**
 * @param container   élément qui contient la pièce (position: relative)
 * @param getScreen   () => { pts: [[x,y]×4 haut-gauche, haut-droit, bas-droit, bas-gauche, en px dans container], facing: 0..1, aspect } | null
 * @param focus       () => void : cadre la caméra de face sur l'écran
 * @param release     () => void : rend la caméra
 * @param getGlass    () => matériau du verre (animé : lueur) ou null (le modèle charge après la pièce)
 * @param isReady     () => boolean : l'écran est dégagé (ex. capot soulevé) ; le film n'apparaît qu'à ce moment
 * @param fallback    () => void : ouvre la fenêtre classique si l'écran n'est pas disponible
 * @param onChange    (ouvert: boolean) => void
 */
export function createJvcScreen({ container, getScreen, focus, release, getGlass = () => null, isReady = () => true, fallback = () => {}, onChange = () => {} }) {
  const tube = document.createElement('div');
  tube.className = 'jvc-tube'; tube.hidden = true;
  tube.innerHTML = `<div class="jvc-crt"><div class="jvc-video"></div><div class="jvc-static"></div><div class="jvc-osd"></div><div class="jvc-glass"></div></div>`;
  const hud = document.createElement('div');
  hud.className = 'jvc-hud'; hud.hidden = true; hud.setAttribute('role', 'group'); hud.setAttribute('aria-label', 'Télé JVC : choix du film');
  hud.innerHTML = `<button type="button" class="jvc-prev" aria-label="Film précédent"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
<div class="jvc-info" aria-live="polite"><span class="jvc-ch"></span><b class="jvc-title"></b><em class="jvc-meta"></em></div>
<button type="button" class="jvc-next" aria-label="Film suivant"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
<select class="jvc-list" aria-label="Choisir un film">${FILMS.map((f, i) => `<option value="${i}">${pad(i + 1)} · ${f.title}</option>`).join('')}</select>
<button type="button" class="jvc-close" aria-label="Éteindre la télé"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
<p class="jvc-hint">Glissez autour de la télé pour la faire pivoter · +/− pour zoomer</p><p class="jvc-note"></p>`;
  container.append(tube, hud);
  for (const el of [tube, hud]) { el.addEventListener('pointerdown', (e) => e.stopPropagation()); el.addEventListener('click', (e) => e.stopPropagation()); el.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true }); }

  const crt = tube.querySelector('.jvc-crt'), video = tube.querySelector('.jvc-video'), stat = tube.querySelector('.jvc-static'), osd = tube.querySelector('.jvc-osd');
  const q = (s) => hud.querySelector(s), list = q('.jvc-list');
  let deck = [], past = [];                                              // les films passent dans un ordre aléatoire : une pioche mélangée, sans répétition tant qu'elle n'est pas vide
  const draw = () => {
    if (!deck.length) { deck = FILMS.map((_, i) => i).filter((i) => i !== current || FILMS.length < 2); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } }
    return deck.pop();
  };
  let isOpen = false, current = Math.floor(Math.random() * FILMS.length), loadTimer = 0, staticTimer = 0, osdTimer = 0, offTimer = 0, lastKey = '', lastAspect = 0, startAt = 0, lastShown = -1;

  function show(i, remember = true) {
    if (remember && isOpen && lastShown >= 0 && lastShown !== i) { past.push(lastShown); if (past.length > 30) past.shift(); }
    current = (i + FILMS.length) % FILMS.length; lastShown = current; deck = deck.filter((k) => k !== current); const f = FILMS[current];
    q('.jvc-ch').textContent = 'CH ' + pad(current + 1); q('.jvc-title').textContent = f.title; q('.jvc-meta').textContent = f.meta;
    q('.jvc-note').textContent = f.note + ' · lecture assurée par YouTube'; list.value = String(current);
    clearTimeout(loadTimer); clearTimeout(staticTimer); clearTimeout(osdTimer);
    video.replaceChildren();                                                // coupe le son de la chaîne précédente
    crt.classList.add('noise'); osd.textContent = 'CH ' + pad(current + 1); osd.classList.add('on');
    loadTimer = setTimeout(() => {
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${f.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3`;
      frame.title = `${f.title}, bande-annonce`;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
      video.replaceChildren(frame);
    }, reduced.matches ? 0 : 380);
    staticTimer = setTimeout(() => crt.classList.remove('noise'), reduced.matches ? 0 : 900);
    osdTimer = setTimeout(() => osd.classList.remove('on'), 2200);
  }

  function open(i) {
    if (isOpen) { if (i != null) show(i); return true; }
    i = i ?? draw(); lastShown = -1; past = [];
    if (!getScreen()) { fallback(); return false; }                            // modèle pas encore chargé : fenêtre classique
    isOpen = true; clearTimeout(offTimer);
    tube.hidden = false; hud.hidden = false; tube.classList.remove('off'); lastKey = ''; startAt = performance.now();
    crt.classList.remove('on'); void crt.offsetWidth; crt.classList.add('on');      // animation d'allumage
    focus(); onChange(true); show(i); update();
    return true;
  }

  function close() {
    if (!isOpen) return;
    isOpen = false; lastShown = -1; clearTimeout(loadTimer); clearTimeout(staticTimer); clearTimeout(osdTimer);
    video.replaceChildren(); crt.classList.remove('noise'); osd.classList.remove('on');
    tube.classList.add('off'); hud.hidden = true;
    offTimer = setTimeout(() => { tube.hidden = true; tube.classList.remove('off'); }, reduced.matches ? 0 : 420);
    const gl = getGlass(); if (gl) { gl.emissive.setRGB(0, 0, 0); gl.emissiveIntensity = 1; }
    release(); onChange(false);
  }

  const next = () => show(draw()), prev = () => { if (past.length) show(past.pop(), false); else show(draw()); };
  q('.jvc-prev').onclick = prev;
  q('.jvc-next').onclick = next;
  q('.jvc-close').onclick = close;
  list.addEventListener('change', () => show(Number(list.value)));
  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest?.('select,input,textarea,iframe')) { e.preventDefault(); if (e.key === 'ArrowRight') next(); else prev(); }
  });

  /** Appelé à chaque image de la pièce : colle le tube sur l'écran et anime la lueur du verre. */
  function update(now = performance.now()) {
    if (!isOpen) return;
    const s = getScreen();
    if (s) {
      const [p0, p1, , p3] = s.pts, h = TUBE_W / s.aspect;
      if (Math.abs(s.aspect - lastAspect) > 0.005) { lastAspect = s.aspect; tube.style.width = TUBE_W + 'px'; tube.style.height = h + 'px'; }
      const m = `matrix(${((p1[0] - p0[0]) / TUBE_W).toFixed(5)},${((p1[1] - p0[1]) / TUBE_W).toFixed(5)},${((p3[0] - p0[0]) / h).toFixed(5)},${((p3[1] - p0[1]) / h).toFixed(5)},${p0[0].toFixed(2)},${p0[1].toFixed(2)})`;
      const shown = isReady() && s.facing > 0.14, key = m + (shown ? '1' : '0');
      if (key !== lastKey) { lastKey = key; tube.style.transform = m; tube.style.visibility = shown ? 'visible' : 'hidden'; }
    }
    const glass = getGlass();
    if (glass) {                                                                // lueur bleutée du tube, visible sur le verre quand on le regarde de biais
      const t = (now - startAt) / 1000, k = Math.min(1, t * 2.5), f = 0.34 + 0.07 * Math.sin(t * 23) + 0.05 * Math.sin(t * 7.3 + 1) + (crt.classList.contains('noise') ? 0.25 : 0);
      glass.emissive.setRGB(0.32 * f * k, 0.58 * f * k, 1.0 * f * k); glass.emissiveIntensity = 1;
    }
  }

  return { open, close, update, get isOpen() { return isOpen; }, get films() { return FILMS; } };
}
