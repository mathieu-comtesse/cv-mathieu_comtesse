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
const warn = [];
for (const id of ids) {                                  // une page neuve par machine ; la comparaison se fait dans la même image : seul l'état « fusionné / d'origine » change
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }), page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'warning' && /fusion|indisponible/.test(m.text())) warn.push(id + ' : ' + m.text().slice(0, 160)); });
  await page.goto(base + '/spatial.html?reset&noroom'); await page.waitForFunction(() => window.__spatial, null, { timeout: 90000 });
  await page.evaluate(() => { window.__spatial.pause(true); document.querySelectorAll('.sp-notes,.sp-top,.sp-intro,.sp-chap,.sp-hubcards').forEach((e) => { e.style.visibility = 'hidden'; }); });
  await page.evaluate((id) => { const S = window.__spatial; S.scroll.current = S.scroll.target = S.timeline.uOf(id); S.scroll.tween = null; S.select(id, { instant: true }); }, id);
  try { await page.waitForFunction((id) => { window.__spatial.step(1 / 24); const m = window.__spatial.world.machines.get(id); return m.ready && m.root.visible; }, id, { timeout: 90000, polling: 400 }); }
  catch { console.error(id, 'ignorée'); await ctx.close(); continue; }
  await page.evaluate(() => { const S = window.__spatial; for (let i = 0; i < 90; i++) S.step(1 / 24); S.world.t = 9.958; S.step(1 / 24); });
  await page.waitForTimeout(900); await page.evaluate(() => window.__spatial.step(0));
  const stats = await page.evaluate((id) => window.__spatial.world.stats.optimize[id] || null, id);
  const one = async (merged, name) => {
    const calls = await page.evaluate(({ id, merged }) => { const S = window.__spatial; S.world.machines.get(id).showMerged(merged); S.world.renderer.render(S.world.scene, S.world.camera); return S.world.renderer.info.render.calls; }, { id, merged });
    await page.screenshot({ path: `${out}/${id}-${name}.png`, timeout: 120000 }); return calls;
  };
  const withMerge = await one(true, 'fusionne'), without = await one(false, 'origine');
  await page.evaluate((id) => window.__spatial.world.machines.get(id).showMerged(true), id);
  result[id] = { withMerge, without, stats }; console.error(id, without, '->', withMerge, JSON.stringify(stats));
  await ctx.close();
}
await browser.close(); server.close();
const diff = (a, b) => JSON.parse(execFileSync('python3', ['-W', 'ignore', '-c', `import sys,json\nfrom PIL import Image,ImageChops\na=Image.open(sys.argv[1]).convert('RGB');b=Image.open(sys.argv[2]).convert('RGB')\nd=ImageChops.difference(a,b).convert('L');px=list(d.getdata());n=sum(1 for v in px if v>0)\nprint(json.dumps({'pct':100*n/len(px),'max':max(px)}))`, a, b]));
console.log('| Machine | Appels de rendu, maillages d\'origine | avec fusion | Maillages et arêtes regroupés | Pixels différents (même image) |\n|---|---|---|---|---|');

for (const id of ids) { const r = result[id]; if (!r) { console.log(`| ${id} | non mesuré | non mesuré | | |`); continue; } const d = diff(`${out}/${id}-origine.png`, `${out}/${id}-fusionne.png`); tn += r.without; to += r.withMerge; const o = r.stats;
  console.log(`| ${id} | ${r.without} | ${r.withMerge} | ${o ? o.mergedObjects + ' objets pour ' + (o.meshes + o.lines) + ' éléments fixes, ' + o.moving + ' mobiles' : 'aucun'} | ${d.pct.toFixed(4)} % (max ${d.max}/255) |`); }
console.log(`| total | ${tn} | ${to} | | |`);
console.log(warn.length ? 'Avertissements :\n' + warn.join('\n') : 'Aucun avertissement');
