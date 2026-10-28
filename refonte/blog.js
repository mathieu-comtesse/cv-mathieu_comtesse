// Page blog : symbole infini en particules + apparitions au défilement.
import { initInfinity } from './infinity.js';
import './footer.js';
import './navfx.js';
import './tabview.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const els = document.querySelectorAll('.rf-rv');
if (reduced || !('IntersectionObserver' in window)) els.forEach((e) => e.classList.add('rf-in'));
else {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rf-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .05 });
  els.forEach((e) => io.observe(e));
}
const c = document.getElementById('rf-inf');
if (c) initInfinity(c);
