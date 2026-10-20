// Page Expériences : hublot (store à tirer), chronologie liée au défilement, apparitions, pied de page, barre.
import './footer.js';
import './navfx.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------------------------------------------------------------- hublot : le store se tire verticalement
   Mêmes règles que la page de référence : course = hauteur − 30 px ; au lâcher, il s'ouvre ou se ferme selon la distance parcourue
   (seuil de 40 % de la course) ou la vitesse (plus de 700 px/s) ; mouvement de 0,45 s en courbe (.32,.72,0,1) ; un clic sec accompagne chaque changement. */
{
  const glass = document.querySelector('.rf-win-glass'), shutter = document.getElementById('rf-shutter'), grip = document.getElementById('rf-grip');
  let H = 0, y = 0, open = false, touched = false, drag = null, raf = 0, auto = 0;
  const travel = () => -(H - 30);
  const apply = () => { shutter.style.transform = `translateY(${y}px)`; grip.setAttribute('aria-valuenow', String(Math.round(y / (travel() || -1) * 100))); };
  const measure = () => { H = glass.getBoundingClientRect().height; if (open) y = travel(); apply(); };
  let ac = null;
  const click = () => {
    if (reduced) return;
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, len = Math.floor(ac.sampleRate * .09), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * .22)) * (i < len * .5 ? 1 : .6);
      const n = ac.createBufferSource(); n.buffer = buf;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = .8;
      const g = ac.createGain(); g.gain.value = .35; n.connect(bp).connect(g).connect(ac.destination); n.start(t);
    } catch {}
  };
  const bez = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
    return (x) => { let t = x; for (let i = 0; i < 8; i++) { const e = X(t) - x; if (Math.abs(e) < 1e-4) break; const d = (3 * ax * t + 2 * bx) * t + cx; if (!d) break; t -= e / d; } return Y(clamp(t, 0, 1)); };
  };
  const ease = bez(.32, .72, 0, 1);
  const go = (to) => {
    cancelAnimationFrame(raf); const from = y, t0 = performance.now(), D = reduced ? 1 : 450;
    const step = (now) => { const k = clamp((now - t0) / D, 0, 1); y = from + (to - from) * ease(k); apply(); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  const openIt = () => { open = true; go(travel()); click(); };
  const closeIt = () => { open = false; go(0); click(); };
  const touch = () => { if (!touched) { touched = true; clearTimeout(auto); } };
  grip.addEventListener('pointerdown', (e) => { touch(); cancelAnimationFrame(raf); drag = { y0: e.clientY, from: y, t: performance.now(), last: e.clientY, v: 0 }; grip.setPointerCapture(e.pointerId); e.preventDefault(); });
  grip.addEventListener('pointermove', (e) => {
    if (!drag) return; const now = performance.now(), dt = Math.max(1, now - drag.t);
    drag.v = .6 * drag.v + .4 * ((e.clientY - drag.last) / dt * 1000); drag.last = e.clientY; drag.t = now;
    y = clamp(drag.from + e.clientY - drag.y0, travel(), 0); apply();
  });
  const end = () => {
    if (!drag) return; const v = drag.v; drag = null;
    const threshold = .4 * (H - 30);
    if (open) { (y - travel() >= threshold || v > 700) ? closeIt() : openIt(); }
    else { (Math.abs(y) >= threshold || v < -700) ? openIt() : closeIt(); }
  };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  grip.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); touch(); open ? closeIt() : openIt(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); touch(); closeIt(); }
  });
  new ResizeObserver(measure).observe(glass); measure();
  // une ouverture automatique, tant que personne n'a touché au store
  auto = setTimeout(() => { if (!touched) openIt(); }, reduced ? 100 : 1500);
}

/* ---------------------------------------------------------------- chronologie : progression du défilement lissée par un ressort
   (raideur 45, amortissement 20) ; la ligne s'allonge (scaleY) et le point descend (top en %). */
{
  const tl = document.getElementById('rf-tl'), line = document.getElementById('rf-tl-line'), dot = document.getElementById('rf-tl-dot');
  let p = 0, v = 0, last = 0, raf = 0;
  const target = () => clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1);   // progression de toute la page, comme sur la référence
  const paint = () => { line.style.transform = `scaleY(${p.toFixed(4)})`; dot.style.top = (p * 100).toFixed(2) + '%'; };
  const frame = (now) => {
    const dt = Math.min(.032, last ? (now - last) / 1000 : .016); last = now;
    const to = target(), k = 45, c = 20;
    v += (-k * (p - to) - c * v) * dt; p += v * dt;
    paint();
    if (Math.abs(p - to) > .0005 || Math.abs(v) > .002) raf = requestAnimationFrame(frame); else { p = to; v = 0; paint(); raf = 0; last = 0; }
  };
  const kick = () => { if (reduced) { p = target(); paint(); return; } if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', kick, { passive: true }); addEventListener('resize', kick); kick();
}

/* ---------------------------------------------------------------- apparitions */
{
  const els = document.querySelectorAll('.rf-tl-rv');
  if (reduced || !('IntersectionObserver' in window)) els.forEach((e) => e.classList.add('rf-in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rf-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach((e) => io.observe(e));
  }
}
