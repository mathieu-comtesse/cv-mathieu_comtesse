/* révélation à l'entrée dans l'écran : les éléments .reveal glissent depuis les côtés (--enter-x) avec un ressort, comme sur le site de référence */
export function initReveal(root = document) {
  const els = [...root.querySelectorAll('.reveal:not(.revealed)')];
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach((e) => e.classList.add('revealed')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}
