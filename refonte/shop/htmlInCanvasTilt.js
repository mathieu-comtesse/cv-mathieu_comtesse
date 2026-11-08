/* Transitions de vue autour des changements d'état du rendu, et suspension de l'inclinaison pendant une mesure. */
export const tiltHandlers = new Map();
export function transition(update, name) {
  if (typeof document.startViewTransition !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) return update();
  if (typeof ViewTransition !== 'function' || !('types' in ViewTransition.prototype)) { document.startViewTransition(update); return; }
  document.startViewTransition({ update, types: ['html-in-canvas', `html-in-canvas-${name}`] });
}
/** Exécute fn avec l'inclinaison désactivée, puis la rétablit. */
export function withoutTilt(fn) {
  for (const handler of tiltHandlers.values()) handler(false);
  try { return fn(); } finally { for (const handler of tiltHandlers.values()) handler(true); }
}
export { transition as c, tiltHandlers as t, withoutTilt as u };
