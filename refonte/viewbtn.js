// Bouton « View » des tuiles : pastille de 32 px qui s'étend au survol (ressort 250 / 27), révèle son libellé après 150 ms
// (ressort 250 / 27) et balaie sa flèche (ressort 250 / 33). Valeurs relevées sur le bouton de la référence.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const spring = (initial) => ({ value: initial, velocity: 0 });
const move = (s, target, stiffness, damping, dt) => {
  const force = (target - s.value) * stiffness - s.velocity * damping;
  s.velocity += force * dt; s.value += s.velocity * dt;
  if (Math.abs(s.value - target) < .002 && Math.abs(s.velocity) < .004) { s.value = target; s.velocity = 0; }
};

function setup(btn) {
  const label = btn.querySelector('.view-text'), arrows = btn.querySelector('.view-arrows');
  const back = btn.classList.contains('view-back'), dir = back ? -1 : 1;   // « retour » : même mouvement, en miroir (la pastille s'étire vers la droite, la flèche part vers le haut-gauche)
  const width = spring(32), ax = spring(5), ay = spring(13), ty = spring(24), alpha = spring(0);
  let active = false, textStart = 0, prev = 0, raf = 0, labelWidth = 0;
  const measure = () => {
    const el = document.createElement('span'); el.textContent = label.textContent;
    el.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:560 16px/1.75 Inter,Arial,sans-serif;letter-spacing:-.022em';
    document.body.append(el); labelWidth = el.getBoundingClientRect().width; el.remove();
  };
  const paint = () => {
    btn.style.width = width.value + 'px';
    arrows.style.transform = back ? `translate(${-ax.value}px,${ay.value}px) scaleX(-1) rotate(-45deg)` : `translate(${ax.value}px,${ay.value}px) rotate(-45deg)`;
    label.style.transform = `translateY(${ty.value}px)`;
    label.style.opacity = String(Math.max(0, Math.min(1, alpha.value)));
  };
  const tick = (now) => {
    raf = 0;
    const dt = Math.min(.032, prev ? (now - prev) / 1000 : .016); prev = now;
    if (!labelWidth) measure();
    const wt = active ? labelWidth + (back ? 56 : 48) : 32;
    if (reduced.matches) { width.value = wt; ax.value = active ? 29 : 5; ay.value = active ? -13 : 13; ty.value = active ? 0 : 24; alpha.value = active ? 1 : 0; paint(); return; }
    move(width, wt, 250, 27, dt); move(ax, active ? 29 : 5, 250, 33, dt); move(ay, active ? -13 : 13, 250, 33, dt);
    const textOn = active && now >= textStart + 150;
    move(ty, textOn ? 0 : 24, 250, 27, dt); move(alpha, textOn ? 1 : 0, 250, 27, dt); paint();
    if (Math.abs(width.velocity) + Math.abs(ax.velocity) + Math.abs(ay.velocity) + Math.abs(ty.velocity) + Math.abs(alpha.velocity) > .004 || Math.abs(width.value - wt) > .02 || (active && !textOn)) raf = requestAnimationFrame(tick);
    else prev = 0;
  };
  const activate = (on) => { active = on; textStart = performance.now(); if (!raf) { prev = 0; raf = requestAnimationFrame(tick); } };
  btn.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') activate(true); });
  btn.addEventListener('pointerleave', () => activate(false));
  const tile = btn.closest('a,button');
  tile?.addEventListener('focus', () => { if (tile.matches(':focus-visible')) activate(true); });
  tile?.addEventListener('blur', () => activate(false));
  paint();
}

document.querySelectorAll('.view-action').forEach(setup);
