/* Médias « résidents » : seuls les médias des sections visibles restent actifs ; les images différées de la section courante sont chargées. */
const MEDIA = 'data-resident-media', RESIDENT = 'data-resident', STAGED = 'data-on-stage';

function mark(sections, shown, isStaged) {
  const states = sections.flatMap((section) => {
    const sectionShown = shown.includes(section);
    return [...section.querySelectorAll(`[${MEDIA}]`)].map((media) => {
      const shows = sectionShown && media.checkVisibility();
      return { media, shows, staged: shows && isStaged(media) };
    });
  });
  for (const { media, shows, staged } of states) { media.toggleAttribute(RESIDENT, shows); media.toggleAttribute(STAGED, staged); }
}
export const isRendered = (el) => el.getClientRects().length > 0;
export const lazyImages = (root) => [...root.querySelectorAll('img[loading="lazy"]')].filter(isRendered);
export function showSections(sections, shown, isStaged) {
  mark(sections, shown, isStaged);
  for (const img of shown.flatMap(lazyImages)) img.loading = 'eager';
}
export function showAll(sections, isStaged) { mark(sections, sections, isStaged); }
export function watchMedia(root, signal, onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(root, { subtree: true, attributeFilter: [MEDIA] });
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
}
export const residentMedia = (root) => [...root.querySelectorAll(`[${RESIDENT}]`)];
/** Marque résidents les médias déjà dans la fenêtre ; renvoie la fonction qui les relâche. */
export function holdVisible(root) {
  const { innerWidth: w, innerHeight: h } = window;
  const held = [...root.querySelectorAll(`[${MEDIA}]`)].filter((media) => {
    if (media.hasAttribute(RESIDENT) || !media.checkVisibility()) return false;
    const r = media.getBoundingClientRect();
    return r.bottom > 0 && r.top < h && r.right > 0 && r.left < w;
  });
  for (const media of held) { media.toggleAttribute(RESIDENT, true); media.toggleAttribute(STAGED, true); }
  return () => { for (const media of held) { media.toggleAttribute(RESIDENT, false); media.toggleAttribute(STAGED, false); } };
}
/** Déclare un média et notifie (résident, en scène) à chaque changement. */
export function track(media, signal, onChange) {
  let resident = false, staged = false;
  const check = () => {
    if (signal.aborted) return;
    const r = media.hasAttribute(RESIDENT), s = media.hasAttribute(STAGED);
    if (r === resident && s === staged) return;
    resident = r; staged = s; onChange(resident, staged);
  };
  media.toggleAttribute(MEDIA, true);
  const observer = new MutationObserver(check);
  observer.observe(media, { attributeFilter: [RESIDENT, STAGED] });
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  queueMicrotask(check);
}
export { isRendered as a, watchMedia as b, showSections as c, residentMedia as d, holdVisible as h, track as o, showAll as r, lazyImages as s };
