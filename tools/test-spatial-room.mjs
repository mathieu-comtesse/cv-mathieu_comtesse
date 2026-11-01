// Scénario de la vraie pièce d'accueil intégrée au voyage (lent : la pièce complète est rendue en logiciel). Mêmes variables que test-spatial-browser.mjs.
// Scénarios de la vue spatiale dans un vrai navigateur (Chromium, rendu logiciel). Variables : PLAYWRIGHT_PACKAGE (chemin de playwright/index.mjs),
// HIC=1 pour activer HTML-in-Canvas (CanvasDrawElement) et vérifier le chemin natif.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(root, u === '/' ? 'index.html' : u);
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const base = 'http://localhost:' + server.address().port;
const out = path.resolve(process.env.SPATIAL_OUT || '/tmp/spatial-test'); fs.mkdirSync(out, { recursive: true });
const flags = process.env.HIC ? ['--enable-blink-features=CanvasDrawElement'] : [];
const browser = await chromium.launch({ args: [...flags, '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ok = (m) => console.log('OK  ' + m);
const errors = [];
async function open(url, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(url + ' : ' + e.message));
  await page.goto(base + url); await page.waitForFunction(() => window.__spatial, null, { timeout: 90000 });
  return { ctx, page };
}
const S = (page, fn, arg) => page.evaluate(fn, arg);
const settle = (page) => page.waitForFunction(() => !window.__spatial.scroll.moving, null, { timeout: 60000 });

try {
  let ctx, page;
  /* la vraie pièce : même composant que l'accueil, rendue avec la caméra du voyage */
  ({ ctx, page } = await open('/spatial.html?reset'));
  await page.waitForFunction(() => window.__spatial.room && document.querySelector('#room canvas') && +document.getElementById('room').dataset.sceneFrames > 2, null, { timeout: 280000, polling: 1000 });
  const roomInfo = await S(page, () => { const R = window.__spatial.room; return { hero: !!R.hero, items: R.bbox ? true : false, frames: +document.getElementById('room').dataset.sceneFrames }; });
  assert.ok(roomInfo.hero, 'le personnage de la pièce est présent');
  assert.equal(await page.locator('#stage.sp-room-hidden').count(), 0, 'la pièce est visible à l’arrivée');
  const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-3;
  await page.waitForTimeout(1500);
  assert.ok(await S(page, () => { const w = window.__spatial.world.camera.position, r = window.__spatial.room.camera.position; return Math.hypot(w.x - r.x, w.y - r.y, w.z - r.z) < 1e-3; }), 'à u = 0 la caméra du monde est celle de la pièce');
  await S(page, () => window.__spatial.scroll.goTo(700, 0)); await page.waitForTimeout(2500);
  assert.ok(await S(page, () => { const w = window.__spatial.world.camera.position, r = window.__spatial.room.camera.position; return Math.hypot(w.x - r.x, w.y - r.y, w.z - r.z) < 1e-3 && window.__spatial.world.camera.position.distanceTo(window.__spatial.room.target) > 30; }), 'pendant la transition les deux moteurs partagent la même caméra');
  assert.equal(await page.locator('#stage.sp-room-hidden').count(), 0, 'la pièce reste visible pendant le recul');
  await page.screenshot({ path: out + '/05-transition-piece.png', timeout: 150000 });
  await S(page, () => window.__spatial.scroll.goTo(12000, 0)); await page.waitForTimeout(2500);
  assert.equal(await page.locator('#stage.sp-room-hidden').count(), 1, 'la pièce est suspendue loin de l’origine');
  await S(page, () => window.__spatial.select('accueil', { instant: true })); await page.waitForTimeout(3000);
  assert.equal(await page.locator('#stage.sp-room-hidden').count(), 0, 'retour à l’accueil : la pièce revient'); assert.equal(await S(page, () => window.__spatial.scroll.current), 0);
  await page.locator('#rf-ruler-h').focus(); const az0 = await S(page, () => window.__spatial.room.view.tAz); for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  assert.notEqual(await S(page, () => window.__spatial.room.view.tAz), az0, 'la règle de l’accueil tourne la vraie pièce');
  ok('pièce : personnage présent, caméra commune pendant la transition, suspension lointaine, retour à l’accueil, règles de la pièce'); await ctx.close();


  assert.deepEqual(errors, [], 'erreurs JavaScript : ' + errors.join('\n'));
  console.log('PASS: scénario de la vraie pièce');
} finally { await browser.close(); server.close(); }
