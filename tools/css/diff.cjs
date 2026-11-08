// Compare les styles calculés (et une capture) de l'accueil avec la feuille de référence externe et avec refonte/site.css.
// Usage : node tools/css/diff.cjs [largeur] [hauteur] [scrollY]
const { chromium } = require('playwright'); const { setup } = require('./lib.cjs'); const fs = require('fs');
const PROPS = ['display', 'position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing', 'color', 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'opacity', 'transform', 'z-index', 'flex-direction', 'flex-grow', 'align-items', 'justify-content', 'grid-template-columns', 'column-gap', 'row-gap', 'overflow-x', 'overflow-y', 'visibility', 'text-align', 'text-transform', 'box-shadow', 'cursor', 'pointer-events', 'text-decoration-line', 'white-space', 'object-fit', 'mix-blend-mode', 'filter', 'backdrop-filter'];
async function grab(b, mode, w, h, y) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); await setup(ctx, mode); const p = await ctx.newPage(); await p.addInitScript(() => { Math.random = () => .5; });
  await p.goto('http://localhost:1/'); await p.waitForTimeout(6000); if (y) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(1500); }
  const rows = await p.evaluate((PROPS) => [...document.querySelectorAll('body, body *')].filter((e) => !['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT'].includes(e.tagName)).map((e) => { const cs = getComputedStyle(e); return [e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/).slice(0, 3).join('.') : ''), PROPS.map((k) => cs.getPropertyValue(k))]; }), PROPS);
  await p.screenshot({ path: `/tmp/css_${mode}_${w}.png` }); await ctx.close(); return rows;
}
(async () => {
  const [, , W = '1440', H = '900', Y = '0'] = process.argv; const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const A = await grab(b, 'ref', +W, +H, +Y), B = await grab(b, 'local', +W, +H, +Y); const n = Math.min(A.length, B.length); let diffEl = 0, diffProps = 0; const byProp = {}, byEl = {};
  for (let i = 0; i < n; i++) { if (A[i][0] !== B[i][0]) continue; let d = 0; PROPS.forEach((k, j) => { if (A[i][1][j] !== B[i][1][j]) { d++; byProp[k] = (byProp[k] || 0) + 1; } }); if (d) { diffEl++; diffProps += d; byEl[A[i][0].slice(0, 60)] = d; } }
  console.log(`éléments ${A.length} (réf) / ${B.length} (locale) ; éléments différents ${diffEl} (${(diffEl / n * 100).toFixed(1)} %) ; propriétés différentes ${diffProps} sur ${n * PROPS.length}`);
  console.log('par propriété', Object.entries(byProp).sort((a, c) => c[1] - a[1]).slice(0, 12).map(([k, v]) => k + ':' + v).join('  '));
  console.log('éléments les plus écartés', Object.entries(byEl).sort((a, c) => c[1] - a[1]).slice(0, 14).map(([k, v]) => v + ' ' + k).join('\n'));
  await b.close();
})();
