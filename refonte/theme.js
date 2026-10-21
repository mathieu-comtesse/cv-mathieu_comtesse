// Thème sombre / clair : même geste que sur le portfolio de référence — un bouton lune / soleil dans la barre ; au clic, la nouvelle apparence
// se dévoile en un cercle qui grandit depuis le bouton (View Transitions, 0,7 s, ease-in-out), les icônes pivotent et changent d'échelle.
const KEY = 'rf-theme', root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const theme = () => (root.dataset.theme === 'light' ? 'light' : 'dark');
const set = (t) => {
  if (t === 'light') root.dataset.theme = 'light'; else delete root.dataset.theme;
  try { localStorage.setItem(KEY, t); } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f8f6f3' : '#05080d');
  document.querySelectorAll('.rf-theme').forEach(sync);
};
const MOON = '<svg class="rf-theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const SUN = '<svg class="rf-theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
function sync(btn) {
  const dark = theme() === 'dark';
  btn.setAttribute('aria-label', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
  btn.title = dark ? 'Thème clair' : 'Thème sombre';
  btn.setAttribute('aria-pressed', String(!dark));
}
function toggle(btn) {
  const next = theme() === 'dark' ? 'light' : 'dark';
  if (!document.startViewTransition || reduced.matches) { set(next); return; }
  const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => set(next));
  vt.ready.then(() => {
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 700, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' });
  }).catch(() => {});
}
function mount() {
  const nav = document.querySelector('.rf-bnav, nav.nav');
  if (!nav || nav.querySelector('.rf-theme')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'rf-theme'; b.innerHTML = MOON + SUN;
  sync(b); b.addEventListener('click', () => toggle(b));
  nav.append(b);
}
mount();
