// Vitrines « outil réel » des cadres du parcours : contenance des fenêtres, états par étape, chargement différé, agrandissement, honnêteté des emplacements.
//   node tools/test-showcase.mjs        LARGEURS=390,768,1440,1920
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), WIDTHS = (process.env.LARGEURS || '390,768,1440,1920').split(',').map(Number);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o));
let chromium; { const req = createRequire(root + '/'); try { ({ chromium } = req('playwright')); } catch { ({ chromium } = createRequire('/tmp/q1/')('playwright')); } }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const fail = []; let ok = 0;
const { SHOWCASE } = await import('../refonte/showcase/config.mjs');
for (const w of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, hasTouch: w < 700 }), p = await ctx.newPage(); p.setDefaultTimeout(60000);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/index.html?uxtest`, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__scTest, null, { timeout: 90000 }); await p.waitForTimeout(6000);
  for (const [slug, cfg] of Object.entries(SHOWCASE)) {
    const tag = `${slug} ${w}`, N = cfg.steps.length;
    /* chargement différé : les captures ne sont pas demandées tant que le cadre n'est pas proche de l'écran */
    const pre = await p.evaluate((s) => [...document.querySelectorAll(`[data-showcase="${s}"] img[data-src]`)].map((i) => !!i.getAttribute('src')), slug);
    if (pre.some(Boolean)) fail.push(`${tag} : capture chargée avant l'approche du cadre`);
    for (let step = 1; step <= N; step++) {
      await p.evaluate(([s, k]) => window.__scTest.go(s, k), [slug, step]); await p.waitForTimeout(250);
      const r = await p.evaluate(([s, k]) => {
        const f = document.querySelector(`[data-showcase="${s}"]`), stage = f.querySelector('.sc-stage'), W = stage.offsetWidth, H = stage.offsetHeight;
        const wins = [...stage.querySelectorAll('.sc-win,.sc-result')].map((e) => ({ id: e.dataset.id || e.className, step: +e.dataset.step, on: e.classList.contains('on'), l: e.offsetLeft, t: e.offsetTop, r: e.offsetLeft + e.offsetWidth, b: e.offsetTop + e.offsetHeight }));
        const log = f.querySelector('.sc-log'), shown = log ? [...log.children].filter((li) => !li.hidden).length : 0;
        return { W, H, wins, shown, total: log ? log.children.length : 0, sel: f.querySelector('[role="tab"][aria-selected="true"]')?.dataset.go, imgs: [...f.querySelectorAll('img[data-src]')].map((i) => ({ src: !!i.getAttribute('src'), nat: i.naturalWidth })) };
      }, [slug, step]);
      r.wins.forEach((e) => { if (e.l < -1 || e.t < -1 || e.r > r.W + 1 || e.b > r.H + 1) fail.push(`${tag} étape ${step} : « ${e.id} » dépasse la scène (${e.l},${e.t},${e.r},${e.b} / ${r.W}x${r.H})`); const want = step >= e.step; if (e.on !== want) fail.push(`${tag} étape ${step} : « ${e.id} » ${e.on ? 'visible trop tôt' : 'absente'}`); });
      if (String(r.sel) !== String(step)) fail.push(`${tag} étape ${step} : onglet sélectionné ${r.sel}`);
      if (step === 1 && r.total && r.shown !== 0) fail.push(`${tag} étape 1 : la console ne devrait pas avoir commencé (${r.shown} lignes)`);
      if (step === N && r.total && r.shown !== r.total) fail.push(`${tag} dernière étape : console incomplète (${r.shown}/${r.total})`);
      if (cfg.windows.some((x) => x.src) && step === 1 && !r.imgs.every((i) => i.src && i.nat > 0)) await p.waitForTimeout(1500);
    }
    /* captures réelles : chargées, agrandissables ; emplacements : jamais présentés comme des captures */
    const auth = cfg.windows.filter((x) => x.src && x.status !== 'missing');
    for (const a of auth) {
      const loaded = await p.evaluate(([s, id]) => { const i = document.querySelector(`[data-showcase="${s}"] .sc-win[data-id="${id}"] img`); return i && i.complete && i.naturalWidth > 0; }, [slug, a.id]);
      if (!loaded) fail.push(`${tag} : capture réelle « ${a.id} » non chargée (${a.src})`);
      if (!fs.existsSync(path.join(root, a.src))) fail.push(`${tag} : fichier absent ${a.src}`);
    }
    const lies = await p.evaluate((s) => [...document.querySelectorAll(`[data-showcase="${s}"] .sc-win[data-status="missing"] img`)].length, slug);
    if (lies) fail.push(`${tag} : un emplacement « à fournir » contient une image`);
    if (auth.length) {
      await p.evaluate(([s, id]) => document.querySelector(`[data-showcase="${s}"] .sc-win[data-id="${id}"]`).click(), [slug, auth[0].id]); await p.waitForTimeout(400);
      if (!(await p.evaluate(() => document.querySelector('dialog.sc-zoom')?.open))) fail.push(`${tag} : la capture ne s'agrandit pas au clic`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(250);
      if (await p.evaluate(() => document.querySelector('dialog.sc-zoom')?.open)) fail.push(`${tag} : Échap ne ferme pas l'agrandissement`);
    }
    /* un emplacement ne réagit pas au clic (pas de faux agrandissement) */
    await p.evaluate((s) => document.querySelector(`[data-showcase="${s}"] .sc-win[data-status="missing"]`)?.click(), slug); await p.waitForTimeout(150);
    if (await p.evaluate(() => document.querySelector('dialog.sc-zoom')?.open)) fail.push(`${tag} : un emplacement « à fournir » ouvre un agrandissement`);
    /* ordonnancement : une fois la page immobile (1,4 s sans mouvement), plus aucune image demandée */
    await p.waitForTimeout(2200); await p.evaluate(() => window.__scTest.reset()); await p.waitForTimeout(1500);
    const idle = await p.evaluate(() => ({ ticks: window.__scTest.ticks(), active: window.__scTest.active() }));
    if (idle.ticks > 2 || idle.active) fail.push(`${tag} : la boucle des vitrines tourne alors que la page est immobile (${idle.ticks} images demandées en 1,5 s)`);
    ok++; console.log('ok    ', tag);
  }
  if (errs.length) fail.push(`${w} : erreurs JavaScript : ${errs.slice(0, 2).join(' | ')}`);
  await ctx.close();
}
await b.close(); srv.close();
const u = [...new Set(fail)]; if (u.length) { console.log('\n' + u.length + ' défaut(s) :'); u.slice(0, 40).forEach((f) => console.log(' - ' + f)); process.exit(1); }
console.log('\nVitrines conformes : ' + ok + ' cadres x largeurs.');
