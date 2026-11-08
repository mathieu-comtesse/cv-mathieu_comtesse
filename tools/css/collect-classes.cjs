// Collecte les classes et attributs réellement présents dans le DOM de l'accueil (après exécution des scripts, défilement compris).
const { chromium } = require('playwright'); const { setup } = require('./lib.cjs'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const all = new Set(), attrs = new Set();
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); await setup(ctx, 'ref'); const p = await ctx.newPage(); await p.goto('http://localhost:1/'); await p.waitForTimeout(5000);
    for (const y of [0, 1500, 4000, 8000, 12000, 18000, 26000]) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(900); const r = await p.evaluate(() => { const c = new Set(), a = new Set(); document.querySelectorAll('*').forEach((e) => { e.classList.forEach((k) => c.add(k)); [...e.attributes].forEach((t) => { if (t.name.startsWith('data-')) a.add(t.name); }); }); return [[...c], [...a]]; }); r[0].forEach((k) => all.add(k)); r[1].forEach((k) => attrs.add(k)); }
    await ctx.close();
  }
  fs.writeFileSync('/tmp/classes.txt', [...all].join('\n')); console.log('classes', all.size, 'attributs data-', attrs.size); await b.close();
})();
