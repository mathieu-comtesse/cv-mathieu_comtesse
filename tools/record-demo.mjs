// Enregistre la démonstration complète dans un vrai navigateur (Chromium) : pièce d'accueil, menu, début du défilement, transition vers le blueprint,
// traversée, sélection et rotation d'une machine, ouverture et fermeture de sa fiche, retour à l'accueil.
// La boucle du voyage est suspendue et pilotée image par image (horloge virtuelle, pas de temps fixe) ; les clics et la molette sont de vrais événements.
// Le rendu logiciel (SwiftShader) ne tient pas le temps réel : la vidéo est montée à la cadence cible à partir d'images rendues une à une.
// Usage : node tools/record-demo.mjs dossier [largeur hauteur fps]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : 'playwright');
const [outdir, W = '1280', H = '720', FPS = '12'] = process.argv.slice(2);
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(root, u === '/' ? 'index.html' : u); if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: +W, height: +H } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/spatial.html?reset`); await page.waitForFunction(() => window.__spatial && window.__spatial.room, null, { timeout: 280000 });
await page.waitForFunction(() => +document.getElementById('room').dataset.sceneFrames > 30 && document.getElementById('room').dataset.sceneReady === 'true', null, { timeout: 280000, polling: 1000 });
await page.evaluate(() => window.__spatial.pause(true));
const dt = 1 / +FPS; let n = 0; const marks = [];
const frames = () => page.evaluate(() => +document.getElementById('room').dataset.sceneFrames);
const shot = async () => {
  await page.waitForFunction(() => !window.__spatial.world.busy && window.__spatial.world.loadQueue.length === 0, null, { timeout: 90000, polling: 200 });
  const f0 = await frames();
  await page.evaluate((d) => window.__spatial.step(d), dt);
  // la pièce se rend avec la caméra du monde dans sa propre boucle : on attend son image suivante (si elle est visible)
  if (await page.evaluate(() => !document.getElementById('stage').classList.contains('sp-room-hidden'))) await page.waitForFunction((f) => +document.getElementById('room').dataset.sceneFrames > f, f0, { timeout: 5000, polling: 50 }).catch(() => {});
  await page.screenshot({ path: `${outdir}/f${String(n++).padStart(5, '0')}.png`, timeout: 120000 });
};
const hold = async (k) => { for (let i = 0; i < k; i++) await shot(); };
const mark = (t) => marks.push([n, t]);
mark('Accueil : la vraie pièce'); await hold(30);
mark('Début du défilement : la pièce recule, le blueprint apparaît');
await page.mouse.move(+W * .6, +H * .5);
for (let i = 0; i < 46; i++) { await page.mouse.wheel(0, 70); await shot(); }
mark('Traversée de la zone Maintenance');
for (let i = 0; i < 70; i++) { await page.mouse.wheel(0, 85); await shot(); }
mark('Menu latéral : clic sur « Qualité et sécurité »');
await page.hover('.sp-ch-b[data-ch="qse"]'); await hold(6);
await page.click('.sp-ch-b[data-ch="qse"]'); await hold(52);
mark('Menu latéral : clic sur un projet');
await page.click('.sp-sub-b[data-id="pa"]'); await hold(40);
mark('Inspection : rotation avec les règles');
const rh = await page.locator('#rf-ruler-h').boundingBox(), rv = await page.locator('#rf-ruler').boundingBox();
await page.mouse.move(rh.x + rh.width / 2, rh.y + 20); await page.mouse.down();
for (let i = 0; i < 26; i++) { await page.mouse.move(rh.x + rh.width / 2 + i * 6, rh.y + 20); await shot(); }
await page.mouse.up();
await page.mouse.move(rv.x + 20, rv.y + rv.height / 2); await page.mouse.down();
for (let i = 0; i < 20; i++) { await page.mouse.move(rv.x + 20, rv.y + rv.height / 2 + i * 4); await shot(); }
await page.mouse.up(); await hold(6);
mark('Fiche flottante : ouverture, lecture, fermeture');
await page.locator('.sp-note[data-id="pa"] .sp-go').click(); await hold(14);
await page.mouse.move(+W - 250, +H * .55); for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 140); await shot(); }
await page.keyboard.press('Escape'); await hold(14);
mark('Retour à l’accueil par le menu : la pièce revient');
await page.click('.sp-ch-b[data-ch="accueil"]'); await hold(80);
await hold(16);
fs.writeFileSync(path.join(outdir, 'marques.json'), JSON.stringify({ fps: +FPS, marks }, null, 1));
console.log('images', n, 'erreurs', JSON.stringify(errors.slice(0, 3)));
await browser.close(); server.close();
