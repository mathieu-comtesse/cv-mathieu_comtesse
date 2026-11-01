// Enregistre une démonstration image par image dans un vrai navigateur (Chromium) : la boucle est suspendue, chaque image est rendue avec un pas
// de temps fixe puis capturée. Le rendu logiciel (SwiftShader) ne tient pas le temps réel : la vidéo est donc montée à la cadence cible à partir
// d'images rendues une à une, ce n'est pas une capture en temps réel. Usage : node tools/record-demo.mjs journey|inspect dossier [largeur hauteur fps secondes]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : 'playwright');
const [mode, outdir, W = '960', H = '540', FPS = '16'] = process.argv.slice(2);
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(root, u === '/' ? 'index.html' : u); if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: +W, height: +H } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/spatial.html?reset`); await page.waitForFunction(() => window.__spatial, null, { timeout: 90000 });
await page.evaluate(() => window.__spatial.pause(true));
const dt = 1 / +FPS; let n = 0;
const shot = async () => {
  await page.waitForFunction(() => !window.__spatial.world.busy && window.__spatial.world.loadQueue.length === 0, null, { timeout: 90000, polling: 200 });
  await page.evaluate((d) => window.__spatial.step(d), dt); await page.waitForTimeout(25);
  await page.screenshot({ path: `${outdir}/f${String(n++).padStart(5, '0')}.png`, timeout: 120000 });
};
if (mode === 'journey') {
  // vitesse de défilement : rapide en transit, ralentie près des cadrages, comme un visiteur qui s'attarde
  const info = await page.evaluate(() => ({ L: window.__spatial.timeline.length, tags: Object.values(window.__spatial.timeline.tags) }));
  let u = 0;
  while (u < info.L - 1) {
    const d = Math.min(...info.tags.map((t) => Math.abs(t - u))), v = 1150 * (.3 + .7 * Math.min(1, d / 600));
    u = Math.min(info.L, u + v * dt);
    await page.evaluate((u) => { const S = window.__spatial; S.scroll.current = S.scroll.target = u; S.scroll.tween = null; }, u);
    await shot();
  }
  for (let i = 0; i < 8; i++) await shot();
} else {
  await page.evaluate(() => { const S = window.__spatial, u = S.timeline.uOf('vre') - 700; S.scroll.current = S.scroll.target = u; });
  for (let i = 0; i < 8; i++) await shot();
  await page.evaluate(() => window.__spatial.select('vre'));                  // sélection : vol continu jusqu'au cadrage, puis mélange d'inspection
  for (let i = 0; i < 70; i++) await shot();
  for (let i = 0; i <= 32; i++) { await page.evaluate((i) => { const S = window.__spatial; const m = S.world.machines.get('vre'); const r = Math.sin(i / 32 * Math.PI) * 210; m.setRulers(r, 0); S.rulers.set(r, 0); }, i); await shot(); }
  for (let i = 0; i <= 28; i++) { await page.evaluate((i) => { const S = window.__spatial; const m = S.world.machines.get('vre'); const t = Math.sin(i / 28 * Math.PI) * 170; m.setRulers(0, t); S.rulers.set(0, t); }, i); await shot(); }
  await page.evaluate(() => { const S = window.__spatial; S.rulers.reset(); });
  for (let i = 0; i < 14; i++) await shot();
  await page.evaluate(() => window.__spatial.select('pa', { push: false }));   // navigation directe vers un autre projet : l'inspection se referme, la caméra repart
  for (let i = 0; i < 80; i++) await shot();
}
console.log('images', n, 'erreurs', JSON.stringify(errors.slice(0, 3)));
await browser.close(); server.close();
