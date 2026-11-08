/* Repère rond de la navigation (point de section) : position à l'écran, visibilité, état actif. */
let resolveReady;
export const ready = { promise: new Promise((resolve) => { resolveReady = resolve; }), resolve: resolveReady };
export function readDot(id) {
  const dot = document.querySelector(`[data-section-dot="#${CSS.escape(id)}"]`);
  if (!dot) return null;
  const box = dot.getBoundingClientRect();
  return {
    x: box.left + box.width / 2, y: box.top + box.height / 2,
    alpha: dot.checkVisibility({ visibilityProperty: true }) ? Number(getComputedStyle(dot.closest('li') ?? dot).opacity) : 0,
    active: dot.closest('a')?.getAttribute('aria-current') === 'location'
  };
}
export { ready as h, readDot as s };
