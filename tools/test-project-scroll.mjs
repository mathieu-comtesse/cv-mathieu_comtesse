// Images de projet attachées à leur cadre pendant le défilement.
//  Ancien contrat : la galerie de processus de la page d'accueil (.process-gallery, js/project-dioramas.js) ; initProjectDioramas n'est plus appelée par aucune page depuis la refonte du 20 octobre 2026
//  (le code vivait dans js/home.js, que plus aucune page ne charge) : la galerie n'existe plus.
//  Contrat actuel : les fenêtres de vitrine (refonte/showcase*, [data-showcase]) des cadres du parcours (index.html) portent des images réelles ; pendant le défilement chaque image reste dans sa fenêtre
//  et dans son cadre, sans dérive, et n'est jamais vide.   node tools/test-project-scroll.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = await import('playwright')); } }
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await context.newPage(), errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE_ERROR', e.message); });
/* les visuels sont réécrits vers https://comtesse.me/assets/... : servis depuis le dépôt (indépendant du déploiement) */
await context.route('https://comtesse.me/assets/**', (route) => { const f = path.join(root, new URL(route.request().url()).pathname); fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: T[path.extname(f)] || 'application/octet-stream' }) : route.fulfill({ status: 404, body: '' }); });
try {
  await page.goto(`http://localhost:${srv.address().port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__scTest, null, { timeout: 120000 }); await page.waitForTimeout(6000);
  const seen = [];
  for (const y of [3400, 5200, 7000, 9000, 11000, 13000, 15000]) {
    await page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y); await page.waitForTimeout(1800);
    /* chargement différé (file d'images de la vitrine) : attendre l'état réel « chargée » des images visibles plutôt qu'un délai fixe */
    await page.waitForFunction(() => [...document.querySelectorAll('[data-showcase] img')].filter((i) => { const b = i.getBoundingClientRect(); return b.width > 4 && b.height > 4 && b.bottom > 0 && b.top < innerHeight; }).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 20000 }).catch(() => {});
    const rows = await page.evaluate(() => [...document.querySelectorAll('[data-showcase]')].map((sc) => { const r = sc.getBoundingClientRect(), imgs = [...sc.querySelectorAll('img')].filter((i) => { const b = i.getBoundingClientRect(); return b.width > 4 && b.height > 4; }); return { id: sc.dataset.showcase, vis: r.bottom > 0 && r.top < innerHeight && r.width > 40, box: [r.left, r.top, r.right, r.bottom], imgs: imgs.map((i) => { const b = i.getBoundingClientRect(); return { box: [b.left, b.top, b.right, b.bottom], loaded: i.complete && i.naturalWidth > 0 }; }) }; }));
    for (const s of rows.filter((q) => q.vis)) for (const im of s.imgs) {
      seen.push(1); assert.ok(im.loaded, `Image non chargée dans la vitrine ${s.id} (défilement ${y})`);
      const [l, t, r, b] = im.box, [L, T2, R, B] = s.box, tol = 2; assert.ok(l >= L - tol && r <= R + tol && t >= T2 - tol && b <= B + tol, `Image hors de sa vitrine ${s.id} (défilement ${y}) : ${im.box} contre ${s.box}`);
    }
  }
  assert.ok(seen.length >= 3, `Moins de trois images de vitrine observées (${seen.length})`);
  assert.deepEqual(errors, []);
  console.log('PROJECT_IMAGES_ATTACHED_OK', seen.length);
} finally { await browser.close(); srv.close(); }
