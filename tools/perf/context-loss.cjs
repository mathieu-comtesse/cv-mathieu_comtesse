// Test de perte de contexte WebGL : coupe puis restaure le contexte de la machine d'une page projet, vérifie l'absence d'erreur et que le dessin reprend.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const root = path.resolve(__dirname, '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/^https?:\/\/(comtesse\.me|localhost:\d+)\//, async (r) => { const u = new URL(r.request().url()); let f = path.join(root, decodeURIComponent(u.pathname)); if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; try { await r.fulfill({ body: fs.readFileSync(f), contentType: types[path.extname(f)] || 'application/octet-stream' }); } catch { await r.fulfill({ status: 404, body: '' }); } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto('http://localhost:1/' + (process.argv[2] || 'projet-vre')); await p.waitForTimeout(5000);
  const sum = async () => (await p.screenshot({ clip: { x: 200, y: 250, width: 900, height: 400 } })).length;   /* taille PNG : un canvas vide compresse bien plus qu'une machine dessinée */
  const before = await sum();
  const lost = await p.evaluate(() => { const c = document.querySelector('canvas.rf-m3d'); const gl = c.getContext('webgl2') || c.getContext('webgl'); const e = gl.getExtension('WEBGL_lose_context'); window.__e = e; e.loseContext(); return gl.isContextLost(); });
  await p.waitForTimeout(800); await p.evaluate(() => window.__e.restoreContext()); await p.waitForTimeout(3500);
  const after = await sum(); console.log(JSON.stringify({ lost, before, after, drawsAgain: after > before * .7, errors: errs })); await b.close();
})();
