/* Draggable Marquee (ObsidianUI) en JavaScript pur : piste qui défile en continu, glisser avec élan, flèches du clavier, boucle sans couture.
 * Mêmes réglages que le composant d'origine : speed, repeat 3, throwMultiplier 2.8, friction .975, vitesse max 60, fin de boucle à -1.02 × la largeur d'un jeu. */
export function createMarquee(root, { speed = 1, repeat = 3, throwMultiplier = 2.8, friction = 0.975, maxThrow = 60, loopEnd = -1.02, direction = 1 } = {}) {
  const track = root.querySelector('.mq-track');
  const originals = [...track.children];
  for (let r = 1; r < repeat; r++) originals.forEach((n) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; track.append(c); });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let x = 0, vel = 0, W = 0, min = 0, dragging = false, moved = 0, visible = true, startX = 0, startPtr = 0, lastX = 0, lastT = 0, hover = false;
  const measure = () => {
    const kids = [...track.children].slice(0, originals.length), gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0);
    W = kids.reduce((s, k) => s + k.getBoundingClientRect().width, 0) + gap * Math.max(0, kids.length - 1) + gap;
    min = W * loopEnd;
  };
  const wrap = (v) => { const range = -min; return ((v - min) % range + range) % range + min; };
  const set = () => { track.style.transform = `translate3d(${x}px,0,0)`; };
  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible || document.hidden || !W) return;
    if (!dragging) {
      if (!reduce && !hover) x -= speed * direction;
      x += vel; vel *= friction; if (Math.abs(vel) < 0.01) vel = 0;
    }
    x = wrap(x); set();
  };
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true; moved = 0; vel = 0; startX = x; startPtr = e.clientX; lastX = e.clientX; lastT = performance.now();
    root.setPointerCapture(e.pointerId); root.classList.add('is-drag');
  });
  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startPtr; moved = Math.max(moved, Math.abs(dx));
    x = wrap(startX + dx); set();
    const now = performance.now(), dt = now - lastT;
    if (dt > 0) vel = Math.max(-maxThrow, Math.min(maxThrow, ((e.clientX - lastX) / dt) * 36.67 * throwMultiplier));
    lastX = e.clientX; lastT = now;
  });
  const up = () => { dragging = false; root.classList.remove('is-drag'); };
  root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
  root.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
  root.addEventListener('mouseenter', () => { hover = true; }); root.addEventListener('mouseleave', () => { hover = false; });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault(); x = wrap(x + (e.key === 'ArrowLeft' ? 1 : -1) * root.clientWidth * 0.35); vel = 0; set();
  });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(root);
  new ResizeObserver(measure).observe(track); addEventListener('resize', measure);
  root.querySelectorAll('img').forEach((i) => { if (!i.complete) i.addEventListener('load', measure); });
  measure(); x = wrap(0); set(); requestAnimationFrame(tick);
}
