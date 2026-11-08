/* Parallaxe légère des CTA « Voir la magie » : le bouton suit à peine la souris (±1 sur --px/--py, lu par ui-premium.css). */
if (matchMedia('(hover:hover)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
  const SEL = '.cv-magic3d,.rf-flow-magic';
  document.addEventListener('pointermove', (e) => {
    const b = e.target.closest && e.target.closest(SEL);
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(2));
    b.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(2));
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const b = e.target.closest && e.target.closest(SEL);
    if (b && !b.contains(e.relatedTarget)) { b.style.removeProperty('--px'); b.style.removeProperty('--py'); }
  }, { passive: true });
}
