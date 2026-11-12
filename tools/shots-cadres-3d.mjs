// Captures comparatives des cadres 3D du parcours (perspective large, rapprochée, contenu image, contenu texte, grand mot, mobile).
//   node tools/shots-cadres-3d.mjs <étiquette : avant | apres> [dossier]
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), TAG = process.argv[2] || 'apres', OUT = path.resolve(root, process.argv[3] || 'docs/cadres-3d'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700 });
  await ctx.route('https://comtesse.me/assets/showcase/**', (route) => { const f = path.join(root, new URL(route.request().url()).pathname); fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: T[path.extname(f)] }) : route.fulfill({ status: 404, body: '' }); });
  const p = await ctx.newPage(); await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__scTest, null, { timeout: 90000 }); await p.waitForTimeout(9000);
  const shot = async (name) => { await p.waitForTimeout(2600); await p.screenshot({ path: path.join(OUT, `${TAG}-${name}-${w}.jpg`), type: 'jpeg', quality: 82 }); };
  /* texte : le cadre de texte d'un projet, vu de loin (le grand mot du chapitre est au-dessus) */
  await p.evaluate(() => { const e = document.querySelector('[data-fiche="projet-moteur44"] .cv-pf-text'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - innerHeight * .55, behavior: 'instant' }); }); await shot('mot-et-texte');
  await p.evaluate(() => { const e = document.querySelector('[data-fiche="projet-moteur44"] .cv-pf-text'); scrollTo({ top: e.getBoundingClientRect().top + scrollY - innerHeight * .2, behavior: 'instant' }); }); await shot('texte-perspective');
  /* image : la vitrine de Nisaru */
  await p.evaluate(() => { document.querySelector('[data-showcase="projet-lecteur-vre"]').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(1500); await p.evaluate(() => window.__scTest.go('projet-lecteur-vre', 4)); await shot('image-perspective');
  if (w > 700) { await p.mouse.click(w * .5, h * .5); await shot('rapproche'); await p.keyboard.press('Escape'); }
  await ctx.close();
}
await b.close(); srv.close();
