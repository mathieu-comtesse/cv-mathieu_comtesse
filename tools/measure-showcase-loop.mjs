// Mesure attribuée de la boucle de showcase.js, avant (version de référence passée en argument) et après (version courante), même page, même viewport, mêmes médias, même scénario.
//   node tools/measure-showcase-loop.mjs <fichier showcase.js de référence> [répétitions]
// Instrumentation par transformation du texte des deux versions (aucune modification du code livré) : rappels rAF de la vitrine (ticks), appels à update(), calculs réels,
// temps CPU de update(), réveils, instant du dernier rappel. Scénarios : repos, défilement, changement d'étape, ouverture d'une capture. Rendu logiciel : on compare des comptes et des
// millisecondes de JavaScript, JAMAIS des images par seconde.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), REF = process.argv[2], REPS = +(process.argv[3] || 3);
if (!REF) { console.error('usage : node tools/measure-showcase-loop.mjs <showcase.js de référence> [répétitions]'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const instr = (src) => {
  let o = src;
  o = o.replace('const update = (st, now) => {', 'const update = (st, now) => { const __t = performance.now(); try { return update0(st, now); } finally { __M.updates++; __M.cpu += performance.now() - __t; } };\n  const update0 = (st, now) => {');
  o = o.replace('if (key === st.key && !dirty) return; st.key = key;', 'if (key === st.key && !dirty) { __M.skipped++; return; } st.key = key; __M.computed++;');
  o = o.replace('const tick = (t) => {', 'const tick = (t) => { __M.ticks++; __M.lastTick = performance.now();');
  o = o.replace('const wake = (ms = 1400) => {', 'const wake = (ms = 1400) => { __M.wakes++;');
  return 'window.__M = window.__M || { ticks: 0, updates: 0, computed: 0, skipped: 0, cpu: 0, wakes: 0, lastTick: 0 };\nconst __M = window.__M;\n' + o;
};
const VAR = { avant: instr(fs.readFileSync(path.resolve(REF), 'utf8')), apres: instr(fs.readFileSync(path.join(root, 'refonte/showcase.js'), 'utf8')) };
for (const [k, v] of Object.entries(VAR)) if (!v.includes('__M.ticks++') || !v.includes('__M.updates++')) { console.error('instrumentation impossible pour la variante « ' + k + ' » (code source inattendu)'); process.exit(3); }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const res = { avant: [], apres: [] };
const snap = (p) => p.evaluate(() => ({ ...window.__M }));
const diff = (a, b2) => ({ ticks: b2.ticks - a.ticks, updates: b2.updates - a.updates, calculs: b2.computed - a.computed, ignores: b2.skipped - a.skipped, cpu_ms: +(b2.cpu - a.cpu).toFixed(2), reveils: b2.wakes - a.wakes });
for (let r = 0; r < REPS; r++) for (const mode of r % 2 ? ['apres', 'avant'] : ['avant', 'apres']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route('https://comtesse.me/assets/showcase/**', (route) => { const f = path.join(root, new URL(route.request().url()).pathname); fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: T[path.extname(f)] }) : route.fulfill({ status: 404, body: '' }); });
  await ctx.route('**/refonte/showcase.js*', (route) => route.fulfill({ body: VAR[mode], contentType: 'text/javascript' }));
  const p = await ctx.newPage(); await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(12000);
  await p.evaluate(() => document.querySelector('[data-showcase="projet-cerfa"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(6500);
  const out = {};
  /* repos : 3 s sans aucune interaction */
  let a = await snap(p); await p.waitForTimeout(3000); out.repos = diff(a, await snap(p));
  /* défilement : 12 coups de molette sur 1,8 s, puis délai d'arrêt (dernier rappel de la vitrine - dernière molette) */
  a = await snap(p); let tw = 0; for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, i % 2 ? -60 : 60); tw = await p.evaluate(() => performance.now()); await p.waitForTimeout(150); }
  out.defilement = diff(a, await snap(p));
  let last = (await snap(p)).ticks, still = 0, t0 = Date.now(); while (Date.now() - t0 < 6000 && still < 800) { await p.waitForTimeout(100); const n = (await snap(p)).ticks; if (n === last) still += 100; else { still = 0; last = n; } }
  const lt = (await snap(p)).lastTick; out.arret_apres_derniere_molette_ms = Date.now() - t0 >= 6000 ? '>6000 (ne s\'arrête pas)' : Math.max(0, Math.round(lt - tw));
  /* changement d'étape : clic sur l'onglet 3 */
  a = await snap(p); await p.evaluate(() => document.querySelector('[data-showcase="projet-cerfa"] .sc-tabs button[data-go="3"]').click()); await p.waitForTimeout(2000); out.etape = diff(a, await snap(p));
  /* ouverture d'une capture */
  a = await snap(p); await p.evaluate(() => document.querySelector('[data-showcase="projet-cerfa"] .sc-win[role="button"]').click()); await p.waitForTimeout(2000); out.capture = diff(a, await snap(p)); await p.keyboard.press('Escape');
  res[mode].push(out); await ctx.close();
}
await b.close(); srv.close();
const med = (xs) => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const lines = ['| scénario | mesure | avant | après |', '|---|---|---|---|'];
for (const sc of ['repos', 'defilement', 'etape', 'capture']) for (const k of ['ticks', 'updates', 'calculs', 'ignores', 'cpu_ms', 'reveils']) lines.push(`| ${sc} | ${k} | ${med(res.avant.map((x) => x[sc][k]))} | ${med(res.apres.map((x) => x[sc][k]))} |`);
lines.push(`| arrêt | délai après la dernière molette (ms) | ${res.avant.map((x) => x.arret_apres_derniere_molette_ms).join(' ; ')} | ${res.apres.map((x) => x.arret_apres_derniere_molette_ms).join(' ; ')} |`);
console.log('Médiane de ' + REPS + ' répétitions, rendu logiciel (comptes et JavaScript, pas d\'images par seconde)\n' + lines.join('\n')); fs.writeFileSync(path.join(root, 'docs/showcase/mesure-boucle.json'), JSON.stringify(res, null, 1));
