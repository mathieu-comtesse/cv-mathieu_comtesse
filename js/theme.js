/* Mode clair / sombre : par défaut selon l'heure (ou le système), puis le choix mémorisé. Partagé par l'accueil et la page Info. */
export function initTheme() {
  const root = document.documentElement, btn = document.getElementById('theme');
  const ICON = {
    sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.3M12 19.2v2.3M2.5 12h2.3M19.2 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
  };
  const apply = (t) => {
    root.dataset.theme = t;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'dark' ? '#15171b' : '#f5f7fb');
    if (btn) { const slot = btn.querySelector('.dbtn__icon'); if (slot) slot.innerHTML = t === 'dark' ? ICON.sun : ICON.moon; btn.setAttribute('aria-label', t === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'); }
  };
  let saved = null; try { saved = localStorage.getItem('cv3d-theme'); } catch (_) {}
  apply(saved === 'dark' || saved === 'light' ? saved : root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  btn && btn.addEventListener('click', () => {
    const t = root.dataset.theme === 'dark' ? 'light' : 'dark'; apply(t);
    try { localStorage.setItem('cv3d-theme', t); } catch (_) {}
  });
}

/* révélation à l'entrée dans l'écran : les éléments .reveal glissent depuis les côtés (--enter-x) avec un ressort, comme sur le site de référence */
export function initReveal(root = document) {
  const els = [...root.querySelectorAll('.reveal:not(.revealed)')];
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach((e) => e.classList.add('revealed')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}
