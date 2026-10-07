import { initTheme, initReveal } from './theme.js?v=3cff226';
import { initPortrait } from './portrait.js?v=3cff226';

initTheme();
initReveal();

/* titre : les lettres montent une à une, comme sur la page Info de la référence */
{
  const h = document.querySelector('.info-heading');
  if (h && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const w of n.textContent.split(/(\s+)/)) {
            if (/^\s+$/.test(w) || !w) { frag.append(w); continue; }
            const word = document.createElement('span'); word.className = 'w'; word.setAttribute('aria-hidden', 'true');
            for (const c of w) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++); word.append(s); }
            frag.append(word);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h);
  }
}

const host = document.getElementById('portrait');
initPortrait(host).catch((e) => { console.error(e); host.remove(); });
