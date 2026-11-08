// Sonde : styles calculés d'un sélecteur, référence contre locale. Usage : node tools/css/probe.cjs "<sélecteur>" [propriétés,...]
const { chromium } = require('playwright'); const { setup } = require('./lib.cjs');
(async () => {
  const sel = process.argv[2], props = (process.argv[3] || 'font-family,font-weight,letter-spacing,font-size,line-height,color,display,width,height').split(','); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const out = {};
  for (const mode of ['ref', 'local']) { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await setup(ctx, mode); const p = await ctx.newPage(); await p.goto('http://localhost:1/'); await p.waitForTimeout(5000); out[mode] = await p.evaluate(([s, props]) => [...document.querySelectorAll(s)].slice(0, 3).map((e) => Object.fromEntries(props.map((k) => [k, getComputedStyle(e).getPropertyValue(k)]))), [sel, props]); await ctx.close(); }
  console.log(sel); out.ref.forEach((r, i) => { const l = out.local[i] || {}; for (const k of Object.keys(r)) console.log(' ', i, k.padEnd(16), r[k].slice(0, 60).padEnd(62), r[k] === l[k] ? '=' : '≠ ' + String(l[k]).slice(0, 60)); }); await b.close();
})();
