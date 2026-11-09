/* Interrupteurs de diagnostic, inertes sans ?diag= dans l'URL (aucun effet en production).
   Exemple : ?diag=machine:off,bg:static,dpr:1,fx:off
     machine:off     la machine n'est plus rendue (construite, mais suspendue)
     bg:static       le fond blueprint n'est redessiné que si la caméra change (grain figé)
     bg:off          le fond blueprint n'est jamais redessiné
     dpr:1           densité de pixels forcée à 1 sur tous les rendus WebGL (chemin « léger »)
     shadow:off      ombre portée de la machine désactivée
     aa:off          antialiasing désactivé
     fx:off          animations, transitions, filtres et flous CSS coupés ; fx:blur (flous d'arrière-plan seuls), fx:filter (filtres et ombres de texte), fx:anim (animations et transitions)
     grain:off       voile de grain CSS (.rf-grain, mix-blend-mode overlay) retiré ; grain:static le laisse mais sans animation
     copy:off        accueil : plus de copie WebGL vers Canvas2D (drawImage)
   Les marques de performance (performance.mark « rf:… ») sont toujours posées : coût nul. */
const raw = new URLSearchParams(location.search).get('diag');
export const DIAG = {};
if (raw) for (const p of raw.split(',')) { const [k, v = 'on'] = p.split(':'); if (k) DIAG[k] = v; }
export const diagOn = (k, v = 'off') => DIAG[k] === v;
export const dprCap = (n) => (DIAG.dpr ? Math.min(n, +DIAG.dpr || 1) : n);
export const mark = (n) => { try { performance.mark('rf:' + n); } catch (e) {} };
if (raw) {
  window.__diag = DIAG;
  const FX = { off: '*,*::before,*::after{animation:none!important;transition:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;text-shadow:none!important}',
    blur: '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    filter: '*,*::before,*::after{filter:none!important;text-shadow:none!important}',
    anim: '*,*::before,*::after{animation:none!important;transition:none!important}' }[DIAG.fx]
    || { off: '.rf-grain{display:none!important}', static: '.rf-grain{animation:none!important}' }[DIAG.grain];
  if (FX) { const s = document.createElement('style'); s.textContent = FX; document.head.append(s); }
}
