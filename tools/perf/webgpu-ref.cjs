// Capture de l'accueil avec WebGPU actif (SwiftShader Vulkan) et réseau ouvert : sert de référence visuelle au rendu de maillages.
// Usage : node tools/perf/webgpu-ref.cjs <sortie-préfixe> [local]   ('local' = sert le dépôt, sinon ressources externes réelles)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,WebGPU', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/^https?:\/\/(comtesse\.me|localhost:\d+)\//, async (r) => { const u = new URL(r.request().url()); let f = path.join(root, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; try { await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { await r.fulfill({ status: 404, body: '' }); } });
  const p = await ctx.newPage(); const logs = []; p.on('console', (m) => { if (['warning', 'error'].includes(m.type()) && !/GPU stall|ReadPixels|Clock|CONTEXT_LOST|external Instance/.test(m.text())) logs.push(m.text().slice(0, 600)); }); p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message.slice(0, 160)));
  await p.goto('http://localhost:1/' + (process.argv[3] || '')); await p.waitForTimeout(9000);
  const info = await p.evaluate(() => JSON.stringify({ gpu: !!navigator.gpu, path: window.__cvTransfer?.path, geom: window.__cvTransfer?.geometry, errs: (window.__cvTransfer?.errors || []).map((e) => e.part + ':' + String(e.error).slice(0, 70)) }));
  console.log(info);
  for (const name of ['vre', 'vrestudio-musicbox']) { await p.evaluate((n) => window.__cvStandardPath?.focusMachine(n), name); await p.waitForTimeout(7000); await p.screenshot({ path: `${process.argv[2]}-${name}.png` }); console.log(name, await p.evaluate(() => JSON.stringify(window.__cvTransfer?.geometry))); }
  console.log(logs.slice(0, 14).join('\n')); await b.close();
})();
