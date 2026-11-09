// Banc du bus d'images : tâches injectées de 50, 100, 250, 500 ms, reprise d'onglet, gouverneur (baisse, remontée, pas d'oscillation), tâches différées.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'text/html'); fs.createReadStream(f).pipe(r); });
await new Promise((o) => srv.listen(0, o)); const { chromium } = createRequire(root + '/')('playwright'); const b = await chromium.launch(); const p = await b.newPage();
await p.goto(`http://localhost:${srv.address().port}/tools/frame-bus-harness.html`); let bad = 0;
const ok = (c, m) => { console.log(c ? 'ok    ' : 'ECHEC ', m); if (!c) bad++; };
const snap = () => p.evaluate(() => window.__cvBus.snapshot());
await p.waitForTimeout(800); await p.evaluate(() => window.__cvBus.reset());
/* 1. dépassements isolés : chacun doit être compté, y compris >= 250 ms (l'ancien code les écartait) */
for (const ms of [60, 130, 260, 540]) { await p.waitForTimeout(250); await p.evaluate((m) => { window.once = m; }, ms); await p.waitForTimeout(ms + 400); }
let s = await snap(); console.log(JSON.stringify(s));
ok(s.gt50 >= 3 && s.gt100 >= 3 && s.gt200 >= 2 && s.gt500 >= 1, 'interruptions injectées de 60, 130, 260 et 540 ms comptées (>50:' + s.gt50 + ' >100:' + s.gt100 + ' >200:' + s.gt200 + ' >500:' + s.gt500 + ')');
ok(s.max >= 480, 'maximum conservé (' + s.max + ' ms)');
/* 2. reprise d'onglet : jamais comptée comme freeze */
await p.evaluate(() => window.__cvBus.reset()); await p.waitForTimeout(500);
await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
await p.waitForTimeout(1500);
await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
await p.waitForTimeout(800); s = await snap(); ok(s.gt200 === 0 && s.resumes >= 1, 'reprise après masquage : ' + s.resumes + ' reprise(s), 0 freeze compté (>200:' + s.gt200 + ')');
/* 3. gouverneur : charge soutenue de 45 ms par image => la qualité baisse, une seule étape à la fois */
await p.evaluate(() => { window.__cvBus.reset(); window.loopBusy = 45; }); await p.waitForTimeout(9000); s = await snap();
ok(s.niveau >= 1, 'charge soutenue (45 ms/image) : niveau ' + s.niveau + ' (qualité ' + s.qualite + '), raison : ' + await p.evaluate(() => window.__cvBus.lastChange));
/* 4. remontée lente, sans oscillation */
const changes = []; await p.evaluate(() => { window.__chg = []; window.__cvBus.listeners.add((q) => window.__chg.push([Math.round(performance.now()), q])); window.loopBusy = 0; });
await p.waitForTimeout(24000); const chg = await p.evaluate(() => window.__chg); s = await snap();
ok(s.niveau < 2 && chg.length >= 1, 'retour au calme : remontée progressive, changements ' + JSON.stringify(chg.map((c) => c[1])));
ok(chg.every((c, i) => i === 0 || c[0] - chg[i - 1][0] >= 4000), 'au moins 4 s entre deux changements de qualité');
ok(chg.every((c, i) => i === 0 || c[1] > chg[i - 1][1]), 'pas d\'oscillation : la qualité ne fait que remonter');
/* 5. tâches différées */
await p.evaluate(() => { window.__d = 0; for (let i = 0; i < 20; i++) window.__cvBus.defer(() => window.__d++); }); await p.waitForTimeout(1000); ok((await p.evaluate(() => window.__d)) === 20, '20 tâches différées exécutées, une par image au plus');
await b.close(); srv.close(); process.exit(bad ? 1 : 0);
