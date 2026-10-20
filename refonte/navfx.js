// Barre de navigation : mêmes comportements que celle de la référence (relevés dans son JavaScript).
//  - entrée par le haut avec un ressort (raideur 45, masse 1) ;
//  - une seule surbrillance partagée, qui glisse sous le bouton survolé avec un ressort (raideur 250, amortissement 27, masse 1),
//    apparaît et disparaît en 180 ms (easeOut), et attend 100 ms avant de s'éteindre ;
//  - flèches gauche / droite pour passer d'un bouton à l'autre.
const nav = document.querySelector('.nav, .rf-bnav');
if (nav) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links = [...nav.querySelectorAll('a')];

  /* ressorts persistants : une seule boucle d'animation par barre, cibles modifiables à tout moment */
  const makeSpring = (k, c, apply, keys) => {
    const s = { k, c, raf: 0, last: 0 };
    keys.forEach((key) => { s[key] = { x: 0, v: 0, to: 0 }; });
    const frame = (now) => {
      const dt = Math.min(.032, (now - (s.last || now)) / 1000); s.last = now;
      let rest = true;
      for (const key of keys) {
        const p = s[key], a = -s.k * (p.x - p.to) - s.c * p.v;
        p.v += a * dt; p.x += p.v * dt;
        if (Math.abs(p.x - p.to) < .04 && Math.abs(p.v) < .04) { p.x = p.to; p.v = 0; } else rest = false;
      }
      apply(s);
      if (rest) { s.raf = 0; s.last = 0; } else s.raf = requestAnimationFrame(frame);
    };
    s.go = () => { if (!s.raf) { s.last = 0; s.raf = requestAnimationFrame(frame); } };
    s.snap = (vals) => { keys.forEach((key) => { s[key].x = s[key].to = vals[key]; s[key].v = 0; }); apply(s); };
    return s;
  };

  /* entrée */
  if (!reduced) {
    const enter = makeSpring(45, 10, (s) => { nav.style.translate = '0 ' + s.y.x + 'px'; }, ['y']);
    enter.snap({ y: -90 }); nav.style.opacity = '0';
    setTimeout(() => { nav.style.opacity = '1'; enter.y.to = 0; enter.go(); }, 350);
  }

  /* surbrillance */
  const hl = document.createElement('span');
  hl.className = 'rf-nav-hl'; hl.setAttribute('aria-hidden', 'true'); nav.prepend(hl);
  const move = makeSpring(250, 27, (s) => { hl.style.transform = 'translateX(' + s.x.x + 'px)'; hl.style.width = Math.max(0, s.w.x) + 'px'; }, ['x', 'w']);
  let shown = false, hideTimer = 0;
  const place = (a) => {
    clearTimeout(hideTimer);
    const nr = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
    const x = r.left - nr.left - nav.clientLeft + nav.scrollLeft, w = r.width;
    if (!shown || reduced) move.snap({ x, w }); else { move.x.to = x; move.w.to = w; move.go(); }
    shown = true; hl.style.opacity = '1';
  };
  const hide = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => { hl.style.opacity = '0'; shown = false; }, 100); };
  links.forEach((a) => { a.addEventListener('pointerenter', () => place(a)); a.addEventListener('focus', () => place(a)); a.addEventListener('blur', hide); });
  nav.addEventListener('pointerleave', hide);

  /* flèches */
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = links.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); links[(i + (e.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length].focus();
  });
}
