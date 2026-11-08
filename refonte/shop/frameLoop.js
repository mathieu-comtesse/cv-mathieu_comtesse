/* Planificateur d'images partagé : une seule boucle d'animation pour tous les abonnés, appelés avec (temps, écart).
   Les abonnés « tardifs » passent après les autres dans la même image. */
const early = new Set(), late = new Set();
let handle = 0, lastTime = 0, inFrame = false;

function tick(time) {
  const delta = time - lastTime;
  lastTime = time; handle = 0; inFrame = true;
  for (const fn of [...early, ...late]) {
    if (!early.has(fn) && !late.has(fn)) continue;            // désabonné pendant l'image
    try { fn(time, delta); } catch (error) { reportError(error); }
  }
  inFrame = false;
  if (early.size || late.size) handle = requestAnimationFrame(tick);
}

/** S'abonne ; renvoie la fonction de désabonnement. options : { signal, late } */
export function subscribe(callback, options) {
  const signal = options?.signal;
  if (signal?.aborted) return () => {};
  const entry = (time, delta) => callback(time, delta), set = options?.late ? late : early;
  set.add(entry);
  if (!handle && !inFrame) { lastTime = performance.now(); handle = requestAnimationFrame(tick); }
  const stop = () => {
    signal?.removeEventListener('abort', stop);
    set.delete(entry);
    if (!early.size && !late.size && handle) { cancelAnimationFrame(handle); handle = 0; }
  };
  signal?.addEventListener('abort', stop);
  return stop;
}
/** Comme subscribe, mais une seule fois. */
export function once(callback, options) {
  const stop = subscribe((time) => { stop(); callback(time); }, options);
  return stop;
}
export { once as n, subscribe as o };
