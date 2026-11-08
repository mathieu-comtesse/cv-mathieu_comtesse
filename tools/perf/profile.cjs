// Profil CPU (CDP) d'une page locale : temps propre par fichier et par fonction. Usage : node tools/perf/profile.cjs <chemin> [secondes] [scrollY]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/^https?:\/\/(comtesse\.me|localhost:\d+)\//, async (r) => { const u = new URL(r.request().url()); let f = path.join(root, decodeURIComponent(u.pathname)); if (u.pathname.endsWith('/')) f = path.join(f, 'index.html'); if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; try { await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { await r.fulfill({ status: 404, body: '' }); } });
  const p = await ctx.newPage(); const c = await ctx.newCDPSession(p); await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 1000 }); await c.send('Profiler.start');
  await p.goto('http://localhost:1' + (process.argv[2] || '/'), { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(3000); if (+process.argv[4]) await p.evaluate((y) => scrollTo(0, y), +process.argv[4]); await p.waitForTimeout((+process.argv[3] || 10) * 1000);
  const { profile } = await c.send('Profiler.stop'); const dt = profile.timeDeltas, self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => { self.set(id, (self.get(id) || 0) + (dt[i] || 0)); });
  const file = new Map(), fn = new Map(); let tot = 0;
  for (const [id, t] of self) { const n = byId.get(id), u = (n.callFrame.url || '(natif)').replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*/, '').slice(-60), k = u + ' ' + n.callFrame.functionName + ':' + n.callFrame.lineNumber; file.set(u, (file.get(u) || 0) + t); fn.set(k, (fn.get(k) || 0) + t); tot += t; }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => (v / 1000).toFixed(0).padStart(6) + ' ms  ' + k);
  console.log('total', (tot / 1000).toFixed(0), 'ms\n--fichiers\n' + top(file, 14).join('\n') + '\n--fonctions\n' + top(fn, 14).join('\n')); await b.close();
})();
