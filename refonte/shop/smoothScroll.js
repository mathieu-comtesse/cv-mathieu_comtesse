/* Défilement amorti de la page : habillage autour de Lenis (MIT, vendor/lenis.mjs).
   - molette : défilement lissé ; pavé tactile détecté par la cadence des événements (durée très courte, ou défilement natif) ;
   - liens d'ancre de la même page : glissement vers la cible, avec mise à jour de l'adresse et du focus ;
   - désactivé si l'utilisateur réduit les animations ou utilise un pointeur tactile. */
import Lenis from '../../vendor/lenis.js';
import { subscribe } from './frameLoop.js';

const WHEEL_SECONDS = .75, TRACKPAD_SECONDS = .1, LINK_SECONDS = 1.2, TOP_MAX_SECONDS = 3, TOP_SELECTOR = 'a[data-scroll-to-top]';
const inOut = (t) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Vrai si les horodatages ressemblent à un pavé tactile (plus de 50 événements par seconde) ; null si trop peu de mesures. */
export function isTrackpad(stamps) {
  if (stamps.length < 2) return null;
  const span = stamps[stamps.length - 1] - stamps[0];
  return span > 0 && ((stamps.length - 1) / span) * 1000 > 50;
}
function samePageLink(event) {
  if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = event.target instanceof Element ? event.target.closest('a') : null;
  return link && link.origin === location.origin && link.pathname === location.pathname && link.search === location.search ? link : null;
}
const clearHash = () => { if (location.hash) history.replaceState(history.state, '', location.pathname + location.search); };

export function createSmoothScroll(signal, { autoResize = false, easeTrackpad = true, glideLinks = true } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) {
    if (glideLinks) addEventListener('click', (event) => { if (samePageLink(event)?.matches(TOP_SELECTOR)) { event.preventDefault(); clearHash(); scrollTo({ top: 0, behavior: 'instant' }); } }, { signal });
    return null;
  }
  const api = { wheelHook: null };
  const lenis = new Lenis({
    duration: WHEEL_SECONDS, easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)), smoothWheel: true, syncTouch: false, autoRaf: false, autoResize, allowNestedScroll: true,
    prevent: (node) => node instanceof HTMLDialogElement || node.hasAttribute('popover'),
    virtualScroll: ({ event, deltaY }) => {
      if (event.defaultPrevented) return false;
      if (api.wheelHook?.(deltaY, event)) { if (event.cancelable) event.preventDefault(); return false; }   // le jeu intercepte la molette
      return true;
    }
  });
  /* Détection du pavé tactile sur les 10 premiers événements (ou après 2 s). */
  const stamps = []; let timer = 0;
  const judge = () => {
    clearTimeout(timer); removeEventListener('wheel', collect, { capture: true });
    const trackpad = isTrackpad(stamps);
    if (trackpad === null) return;
    lenis.options.duration = trackpad ? TRACKPAD_SECONDS : WHEEL_SECONDS;
    if (trackpad && !easeTrackpad) { lenis.stop(); lenis.destroy(); }
  };
  const collect = (event) => { if (!stamps.length) timer = window.setTimeout(judge, 2000); stamps.push(event.timeStamp); if (stamps.length >= 10) judge(); };
  addEventListener('wheel', collect, { passive: true, capture: true });
  /* Liens d'ancre : glissement vers la cible. */
  addEventListener('click', (event) => {
    const link = glideLinks ? samePageLink(event) : null;
    if (!link) return;
    if (link.matches(TOP_SELECTOR)) { event.preventDefault(); clearHash(); lenis.scrollTo(0, { duration: Math.min(TOP_MAX_SECONDS, Math.max(LINK_SECONDS, window.scrollY / 8000)), easing: inOut }); return; }
    if (!link.hash) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    const from = window.scrollY;
    if (location.hash === link.hash) { history.replaceState(history.state, '', location.pathname + location.search); location.replace(link.hash); } else location.hash = link.hash;
    const to = window.scrollY;
    window.scrollTo({ top: from, behavior: 'instant' });
    target.focus({ preventScroll: true });
    lenis.scrollTo(to, { duration: LINK_SECONDS, easing: inOut });
  }, { signal });
  const restart = () => { lenis.stop(); lenis.start(); };
  if (!glideLinks) window.navigation?.addEventListener('navigate', (event) => { if (event.hashChange) restart(); }, { signal });
  addEventListener('beforetoggle', (event) => { if (event.target instanceof HTMLDialogElement && event.newState === 'open') restart(); }, { capture: true, signal });
  /* Interface publique. */
  let lastY = window.scrollY, wasSmooth = false;
  signal.addEventListener('abort', () => { judge(); lenis.destroy(); }, { once: true });
  Object.defineProperties(api, {
    limit: { get: () => lenis.limit }, target: { get: () => lenis.targetScroll },
    duration: { get: () => lenis.options.duration ?? WHEEL_SECONDS }, easing: { get: () => lenis.isSmooth }
  });
  return Object.assign(api, {
    scrollTo: (to, options) => lenis.scrollTo(to, options),
    wheelTo: (to) => lenis.scrollTo(to, { programmatic: false, lerp: lenis.options.lerp, duration: lenis.options.duration, easing: lenis.options.easing }),
    jump(to) { const y = Math.min(Math.max(0, to), lenis.limit); window.scrollTo({ top: y, behavior: 'instant' }); lenis.animatedScroll = lenis.targetScroll = y; },
    step(time) {
      if (wasSmooth && lenis.isSmooth && Math.abs(window.scrollY - lastY) > .5) restart();   // défilement extérieur pendant l'animation : on se resynchronise
      lenis.raf(time);
      const moved = window.scrollY !== lastY;
      lastY = window.scrollY; wasSmooth = lenis.isSmooth;
      return moved;
    },
    resize: () => lenis.resize()
  });
}
/** Défilement amorti piloté par le planificateur d'images partagé, actif seulement pendant le défilement. */
export function startSmoothScroll(signal) {
  const scroll = createSmoothScroll(signal, { autoResize: true, easeTrackpad: false, glideLinks: false });
  if (!scroll) return;
  let clock = 0, stop;
  const tick = (_time, delta) => { clock += delta; scroll.step(clock); if (!scroll.easing) { stop?.(); stop = undefined; } };
  addEventListener('wheel', () => { if (scroll.easing) stop ??= subscribe(tick, { signal }); }, { passive: true, signal });
}
