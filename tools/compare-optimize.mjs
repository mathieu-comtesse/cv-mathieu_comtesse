// Compare, machine par machine, le rendu avec et sans fusion des maillages statiques (?noopt) : appels de rendu et écart de pixels.
// Local (Python et Pillow requis pour l'écart). Variables : PLAYWRIGHT_PACKAGE, SPATIAL_OUT.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(root, u === '/' ? 'index.html' : u); if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html'; if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
const base = 'http://localhost:' + server.address().port, out = path.resolve(process.env.SPATIAL_OUT || '/tmp/spatial-opt'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ids = ['vm', 'moteur44', 'vre', 'pa', 'powerbi', 'cerfa', 'gares', 'suivi', 'finance', 'studio', 'lecteur-vre'];
const result = {};
for (const mode of ['noopt', 'opt']) {
  for (const id of ids) {                                  // une page neuve par machine : mémoire et temps de rendu logiciel restent comparables
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }), page = await ctx.newPage();
    await page.goto(base + '/spatial.html?reset' + (mode === 'noopt' ? '&noopt' : '')); await page.waitForFunction(() => window.__spatial, null, { timeout: 90000 });
    await page.evaluate(() => { window.__spatial.pause(true); document.querySelectorAll('.sp-notes,.sp-top,.sp-intro,.sp-rail,.sp-hubcards').forEach((e) => { e.style.visibility = 'hidden'; }); });
    await page.evaluate((id) => { const S = window.__spatial; S.scroll.current = S.scroll.target = S.timeline.uOf(id); S.scroll.tween = null; S.select(id, { instant: true }); S.world.want(id); }, id);
    await page.waitForFunction((id) => { window.__spatial.step(1 / 24); const m = window.__spatial.world.machines.get(id); return m.ready && m.root.visible; }, id, { timeout: 90000, polling: 400 });
    await page.evaluate(() => { const S = window.__spatial; for (let i = 0; i < 90; i++) S.step(1 / 24); S.world.t = 9.958; S.step(1 / 24); });   // inspection établie, horloge à 10 s
    await page.waitForTimeout(900); await page.evaluate(() => window.__spatial.step(0));
    const info = await page.evaluate((id) => ({ calls: window.__spatial.world.renderer.info.render.calls, tri: window.__spatial.world.renderer.info.render.triangles, opt: window.__spatial.world.stats.optimize[id] || null }), id);
    await page.screenshot({ path: `${out}/${id}-${mode}.png`, timeout: 120000 }); console.error(mode, id, info.calls);
    (result[id] ??= {})[mode] = info;
    await ctx.close();
  }
}
await browser.close(); server.close();
const diff = (a, b) => JSON.parse(execFileSync('python3', ['-c', `import sys,json\nfrom PIL import Image,ImageChops\na=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB')\nd=ImageChops.difference(a,b).convert('L');px=d.getdata();n=sum(1 for v in px if v>12)\nprint(json.dumps({'pct':100*n/len(px),'max':max(px)}))`, a, b]));
console.log('| Machine | Appels de rendu sans fusion | avec fusion | Maillages et arêtes fusionnés | Écart de pixels (> 12/255) |\n|---|---|---|---|---|');
let tn = 0, to = 0;
for (const id of ids) { const r = result[id], d = diff(`${out}/${id}-noopt.png`, `${out}/${id}-opt.png`); tn += r.noopt.calls; to += r.opt.calls; const o = r.opt.opt;
  console.log(`| ${id} | ${r.noopt.calls} | ${r.opt.calls} | ${o ? o.mergedObjects + ' objets pour ' + (o.meshes + o.lines) + ' éléments (' + o.moving + ' mobiles)' : 'aucune'} | ${d.pct.toFixed(3)} % (max ${d.max}) |`); }
console.log(`| total | ${tn} | ${to} | | |`);
