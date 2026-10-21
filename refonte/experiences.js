// Page Expériences : hublot (store à tirer), chronologie liée au défilement, apparitions, pied de page, barre.
import './footer.js';
import './navfx.js';
import './tabview.js';
import './hublot.js?v=sakthi-pointer-4';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

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

