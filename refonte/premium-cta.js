/* Réaction des CTA au pointeur : inclinaison ≤ 2,5°, déplacement ≤ 3 px, reflet qui suit le doigt ou la souris (variables lues par ui-premium.css).
   Un seul écouteur délégué, aucune boucle d'animation ; rien ne s'exécute au tactile ni avec « réduire les animations ». */
if (matchMedia('(hover:hover)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
  const SEL = '.rf-cta,.cv-magic3d,.cv-explore3d';
  document.addEventListener('pointermove', (e) => {
    const b = e.target.closest && e.target.closest(SEL);
    if (!b) return;
    const r = b.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    b.style.setProperty('--mx', ((x / r.width) * 2 - 1).toFixed(2));
    b.style.setProperty('--my', ((y / r.height) * 2 - 1).toFixed(2));
    b.style.setProperty('--sx', x.toFixed(0) + 'px');
    b.style.setProperty('--sy', y.toFixed(0) + 'px');
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const b = e.target.closest && e.target.closest(SEL);
    if (b && !b.contains(e.relatedTarget)) for (const k of ['--mx', '--my', '--sx', '--sy']) b.style.removeProperty(k);
  }, { passive: true });
}
