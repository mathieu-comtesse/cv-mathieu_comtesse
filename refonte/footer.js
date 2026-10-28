// Pied de page : valeurs vivantes (navigateur, heure, dimensions) saisies lettre par lettre à l'arrivée dans l'écran.
// Adresse propre : seul « comtesse.me » (ou le nom de la page, sans « .html » ni ancre) reste affiché dans la barre d'adresse.
{
  const clean = (p) => p.replace(/index\.html$/, '').replace(/\.html$/, '');
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  const wanted = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
  const tidy = (keepHash) => { try { const c = clean(location.pathname) || '/'; if (!local && (c !== location.pathname || (!keepHash && (location.hash || location.search)))) history.replaceState(null, '', c + (keepHash ? location.hash : '')); } catch {} };
  tidy(true);
  // arrivée depuis une autre page avec une ancre (#projets, #contact…) : on se place sur la section une fois la page mise en place, puis on efface l'ancre
  const land = () => { const t = wanted && document.getElementById(wanted); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 20, behavior: 'instant' }); };
  addEventListener('load', () => { land(); setTimeout(land, 250); setTimeout(() => { land(); tidy(false); }, 900); });
  // cache + préchauffage du décor de l'accueil depuis toutes les pages
  if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then((r) => { const go = () => r.active && r.active.postMessage('warm'); 'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 2500); }).catch(() => {});
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !u.hash || clean(u.pathname).replace(/\/$/, '') !== clean(location.pathname).replace(/\/$/, '')) return;
    const t = document.getElementById(decodeURIComponent(u.hash.slice(1)));
    if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}
const el = (id) => document.getElementById(id);
const browser = (() => {
  const u = navigator.userAgent;
  if (/Edg\//.test(u)) return 'Edge';
  if (/Firefox\//.test(u)) return 'Firefox';
  if (/Chrome\//.test(u)) return 'Chrome';
  if (/Safari\//.test(u)) return 'Safari';
  return 'Navigateur';
})();
const fields = {
  'rf-f-browser': () => browser,
  'rf-f-time': () => new Date().toLocaleTimeString('fr-FR', { hour12: false }),
  'rf-f-dim': () => `${innerWidth}x${innerHeight}`
};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let live = false;
function fill() { for (const [id, fn] of Object.entries(fields)) { const e = el(id); if (e) e.textContent = fn(); } }

const foot = document.querySelector('.rf-foot');
if (foot) {
  const typed = [...foot.querySelectorAll('dd')];
  const targets = new Map(typed.map((d) => [d, d.dataset.t || '']));
  const typeAll = () => {
    for (const d of typed) {
      const full = d.dataset.t ?? (fields[d.id] ? fields[d.id]() : d.textContent);
      if (reduced) { d.textContent = full; continue; }
      d.textContent = '';
      let i = 0; const step = () => { d.textContent = full.slice(0, ++i); if (i < full.length) setTimeout(step, 55 + Math.random() * 40); };
      setTimeout(step, 150 + Math.random() * 250);
    }
    setTimeout(() => { live = true; fill(); }, 1600);
  };
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); typeAll(); } }, { threshold: .2 }).observe(foot);
  setInterval(() => { if (live) fill(); }, 1000);
  addEventListener('resize', () => { if (live) fill(); });
}
