// Captures comparatives : node tools/perf/capture.cjs <racine> <préfixe-sortie>  (racine = dépôt à servir)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const root = path.resolve(process.argv[2]); const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, h] of [[1440, 900], [1920, 1080], [390, 844]]) for (const pg of ['projet-vre', 'projet-lecteur-vre']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.route(/^https?:\/\/(comtesse\.me|localhost:\d+)\//, async (r) => { const u = new URL(r.request().url()); let f = path.join(root, decodeURIComponent(u.pathname)); if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; try { await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { await r.fulfill({ status: 404, body: '' }); } });
    const p = await ctx.newPage(); await p.goto('http://localhost:1/' + pg); await p.waitForTimeout(5000); await p.screenshot({ path: `${process.argv[3]}-${pg}-${w}.png` }); await ctx.close();
  }
  await b.close();
})();
