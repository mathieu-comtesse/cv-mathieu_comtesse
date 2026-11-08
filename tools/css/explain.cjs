// Explique les écarts d'un sélecteur : toutes les propriétés dont la valeur calculée diffère entre référence et locale (premier élément correspondant, N éléments).
const { chromium } = require('playwright'); const { setup } = require('./lib.cjs');
(async () => {
  const sels = process.argv.slice(2); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const res = {};
  for (const mode of ['ref', 'local']) { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await setup(ctx, mode); const p = await ctx.newPage(); await p.addInitScript(() => { Math.random = () => .5; }); await p.goto('http://localhost:1/'); await p.waitForTimeout(5500);
    res[mode] = await p.evaluate((sels) => Object.fromEntries(sels.map((s) => { const e = document.querySelector(s); if (!e) return [s, null]; const cs = getComputedStyle(e), o = {}; for (let i = 0; i < cs.length; i++) o[cs[i]] = cs.getPropertyValue(cs[i]); return [s, o]; })), sels); await ctx.close(); }
  for (const s of sels) { const r = res.ref[s], l = res.local[s]; console.log('==', s, r ? '' : '(absent)'); if (!r || !l) continue; for (const k of Object.keys(r)) if (r[k] !== l[k] && !/^(block-size|inline-size|perspective-origin|transform-origin|-webkit)/.test(k) && !k.startsWith('--')) console.log('  ', k.padEnd(26), r[k].slice(0, 70)); }
  await b.close();
})();
