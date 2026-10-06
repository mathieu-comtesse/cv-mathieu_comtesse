/* Mot qui bascule (« équipes. » <-> « agents. »), lettre par lettre : effet repris du CV (fx.js). */
export function initFlip(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('em.flip[data-a][data-b]').forEach((el) => {
    const A = [...el.dataset.a], B = [...el.dataset.b], n = Math.max(A.length, B.length);
    const build = () => {
      const cs = getComputedStyle(el), size = parseFloat(cs.fontSize), ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const w = (c) => (c ? ctx.measureText(c).width / size : 0);
      el.setAttribute('aria-label', el.dataset.a); el.textContent = ''; el.classList.add('is-built');
      el.style.width = Math.max(A.reduce((t, c) => t + w(c), 0), B.reduce((t, c) => t + w(c), 0)) + 'em';
      for (let i = 0; i < n; i++) {
        const a = A[i] || '', b = B[i] || '', s = document.createElement('span');
        s.className = 'fs'; s.setAttribute('aria-hidden', 'true');
        s.style.setProperty('--wa', w(a) + 'em'); s.style.setProperty('--wb', w(b) + 'em');
        s.style.setProperty('--d', (Math.sin(i / n * Math.PI / 2) * 0.9).toFixed(2) + 's');
        s.innerHTML = `<i class="f f1">${a}</i><i class="f f2">${b}</i><i class="f f3">${a}</i>`;
        el.append(s);
      }
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
  });
}
