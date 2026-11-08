// Inventaire des requêtes réseau sortantes (hors dépôt) d'une page : node tools/perf/hosts.cjs <chemin> [scrollY...]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const ext = new Map();
  await ctx.route(/^https?:\/\//, async (r) => { const u = new URL(r.request().url()); if (/^(comtesse\.me|localhost:\d+)$/.test(u.host)) { let f = path.join(root, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; try { return await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { return r.fulfill({ status: 404, body: '' }); } } const k = u.host + u.pathname; const e = ext.get(k) || { n: 0, ex: u.pathname.split('/').pop() }; e.n++; ext.set(k, e); r.abort(); });
  const p = await ctx.newPage(); await p.goto('http://localhost:1' + (process.argv[2] || '/')); await p.waitForTimeout(5000);
  for (const y of process.argv.slice(3)) { await p.evaluate((y) => scrollTo(0, +y), y); await p.waitForTimeout(2500); }
  console.log([...ext.entries()].map(([k, v]) => v.n + '  ' + k + ' (ex: ' + v.ex + ')').join('\n') || 'aucune requête externe'); await b.close();
})();
