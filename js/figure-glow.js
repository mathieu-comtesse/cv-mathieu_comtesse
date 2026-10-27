// Surbrillance des pièces qui s'actionnent (technique isoglow) : une pièce qui bouge, change de contenu
// ou s'allume prend la couleur d'accent de sa machine, avec un halo doux qui s'éteint quand elle s'arrête.
// Script autonome : chargé par chaque figures/*.html, aucune dépendance.
(() => {
  const ACCENT = { cerfa: '#fb7185', vm: '#22d3ee', vre: '#a78bfa', moteur: '#ff9d3c', gares: '#a3e635', finance: '#fbbf24', pp: '#2dd4bf', powerbi: '#60a5fa', suivi: '#f472b6', studio: '#fb923c', vrestudio: '#34d399' };
  const name = (location.pathname.match(/([\w-]+)\.html$/) || [])[1];
  const svg = document.querySelector('.iso-stage svg');
  if (!svg) return;
  const root = document.documentElement;
  root.style.setProperty('--g', ACCENT[name] || '#ff9d3c');

  const css = document.createElement('style');
  css.textContent = `
.iso-stage [data-part]{transition:filter .35s ease-out}
.iso-stage [data-part] .iso-top,.iso-stage [data-part] .iso-fill,.iso-stage [data-part] .iso-shade,.iso-stage [data-part] .iso-edge,.iso-stage [data-part] .iso-line{transition:fill .35s ease-out,stroke .35s ease-out}
/* pièce en mouvement : face éclairée teintée, arêtes à l'accent, halo */
.iso-stage [data-part].glow .iso-top,.iso-stage [data-part].glow .iso-fill{fill:color-mix(in srgb,var(--g) 30%,var(--anatomy-top))}
.iso-stage [data-part].glow .iso-shade{fill:color-mix(in srgb,var(--g) 16%,var(--anatomy-shade-1))}
.iso-stage [data-part].glow .iso-edge,.iso-stage [data-part].glow .iso-line{stroke:color-mix(in srgb,var(--g) 75%,var(--anatomy-hi))}
.iso-stage [data-part].glow{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--g) 55%,transparent))}
/* voyants allumés : émissifs en permanence */
.iso-stage .fig-lamp[data-on="true"]{fill:var(--g);stroke:var(--g)}
.iso-stage .fig-lamp[data-on="true"]{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--g) 70%,transparent))}
@media (prefers-reduced-motion:reduce){.iso-stage [data-part].glow{filter:none}}`;
  document.head.append(css);

  const HOLD = 420, seen = new Map(), sig = new WeakMap();
  const partOf = (n) => (n.nodeType === 1 ? n : n.parentElement)?.closest('[data-part]');
  const wake = (part) => { part.classList.add('glow'); seen.set(part, performance.now()); };
  new MutationObserver((records) => {
    const check = new Set();
    for (const r of records) {
      const part = partOf(r.target);
      if (!part || part.classList.contains('fig-lamp')) continue;
      if (r.type === 'attributes') { if (r.target.getAttribute(r.attributeName) !== r.oldValue) wake(part); }
      else if (r.type === 'characterData') { if (r.target.data !== r.oldValue) wake(part); }
      else check.add(part);
    }
    // innerHTML réécrit à chaque image : on ne réveille que si le contenu a vraiment changé.
    for (const part of check) { const s = part.innerHTML; if (sig.has(part) && sig.get(part) !== s) wake(part); sig.set(part, s); }
  }).observe(svg, { attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true, childList: true, subtree: true });

  setInterval(() => {
    const now = performance.now();
    for (const [part, t] of seen) if (now - t > HOLD) { part.classList.remove('glow'); seen.delete(part); }
  }, 120);
})();
