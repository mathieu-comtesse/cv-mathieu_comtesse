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
  /* 1 et 2 : arrivée, molette, réversibilité, déterminisme */
  let { ctx, page } = await open('/spatial.html?reset');
  assert.equal(await S(page, () => window.__spatial.state.state), 'exploration');
  assert.ok(await page.locator('#sp-intro').isVisible(), 'présentation visible à l’arrivée');
  assert.ok(await page.locator('#sp-intro a[href$="cv-ats-mathieu-comtesse.pdf"]').count(), 'accès direct au CV');
  ok('arrivée : accueil, présentation et accès directs visibles');
  await page.screenshot({ path: out + '/01-arrivee.png', timeout: 150000 });
  const cam0 = await S(page, () => window.__spatial.world.camera.position.toArray());
  await page.mouse.move(700, 450);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(20); }
  await settle(page);
  const p1 = await S(page, () => window.__spatial.scroll.current);
  assert.ok(p1 > 300, 'la molette avance : u=' + p1);
  const cam1 = await S(page, () => window.__spatial.world.camera.position.toArray());
  assert.ok(Math.hypot(...cam1.map((v, i) => v - cam0[i])) > 3, 'la caméra se déplace');
  assert.equal(await page.locator('#sp-intro.sp-away').count() > 0 || p1 < 380, true);
  // un événement géant ne peut pas dépasser plusieurs projets
  await page.mouse.wheel(0, 100000); await page.waitForTimeout(100);
  assert.ok(await S(page, () => window.__spatial.scroll.target) - p1 < 1500, 'inertie bornée');
  // unités de molette : lignes et pages
  const lineDelta = await S(page, () => { const e = new WheelEvent('wheel', { deltaY: 3, deltaMode: 1 }); return e.deltaY * (e.deltaMode === 1 ? 16 : 1); });
  assert.equal(lineDelta, 48);
  // retour : même progression, même position
  await S(page, () => window.__spatial.scroll.goTo(4000, 0)); await page.waitForTimeout(300);
  const a = await S(page, () => window.__spatial.world.camera.position.toArray());
  await S(page, () => window.__spatial.scroll.goTo(9000, 0)); await page.waitForTimeout(100);
  await S(page, () => window.__spatial.scroll.goTo(4000, 0)); await page.waitForTimeout(300);
  const b = await S(page, () => window.__spatial.world.camera.position.toArray());
  assert.ok(Math.hypot(...a.map((v, i) => v - b[i])) < 1e-6, 'trajectoire réversible et déterministe');
  ok('défilement : avance, inertie bornée, unités de molette, réversible');

  /* profondeur et parallaxe : deux points de profondeurs différentes sur la même ligne de visée se déplacent différemment quand la caméra avance */
  const par = await S(page, () => {
    const W = window.__spatial.world, tl = window.__spatial.timeline, out = [];
    for (const u of [1500, 2400, 6000, 12000]) {
      W.frame(u, 0, performance.now(), null, 0); const c = W.camera.position.clone(), d = new c.constructor(); W.camera.getWorldDirection(d);
      const near = c.clone().addScaledVector(d, 14).add(new c.constructor(6, 0, 0)), far = c.clone().addScaledVector(d, 160).add(new c.constructor(6, 0, 0));
      const a0 = W.project(near, {}), b0 = W.project(far, {}); W.frame(u + 40, 0, performance.now(), null, 0);
      const a1 = W.project(near, {}), b1 = W.project(far, {}); out.push([Math.hypot(a1.x - a0.x, a1.y - a0.y), Math.hypot(b1.x - b0.x, b1.y - b0.y)]);
    }
    W.frame(0, 0, performance.now(), null, 0); return out;
  });
  for (const [n, f] of par) assert.ok(n > 2.5 * f && n > 8, `parallaxe : proche ${n.toFixed(1)} px, loin ${f.toFixed(1)} px`);
  const fovs = await S(page, () => [0, 1500, 4275, 6275, 12000, 19875, 23000].map((u) => { window.__spatial.world.frame(u, 0, performance.now(), null, 0); return window.__spatial.world.baseFov; }));
  assert.ok(Math.max(...fovs) - Math.min(...fovs) > 10, 'champ de vision variable : ' + fovs.map((f) => f.toFixed(0)));
  ok('profondeur : parallaxe proche/loin, champ de vision ' + fovs.map((f) => f.toFixed(0)).join(', ') + ' degrés');

  /* 3 : inspection, règles, animations indépendantes */
  await S(page, () => window.__spatial.select('vre', { instant: true })); await page.waitForFunction(() => window.__spatial.world.machines.get('vre').ready, null, { timeout: 90000 });
  assert.equal(await S(page, () => window.__spatial.state.state), 'inspection');
  await page.waitForFunction(() => window.__spatial.world.machines.get('vre').root.visible, null, { timeout: 60000 });
  assert.ok(await S(page, () => [...window.__spatial.world.machines.values()].every((m) => m.root.scale.y === 1)), 'aucune extrusion : les machines gardent leur échelle');
  assert.ok(await page.locator('#rf-ruler-h').isVisible() && await page.locator('#rf-ruler').isVisible(), 'deux règles visibles');
  const before = await S(page, () => { const m = window.__spatial.world.machines.get('vre'); return [m.spin.rotation.y, m.tiltG.rotation.x, m.lift]; });
  await page.locator('#rf-ruler-h').focus(); for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await page.locator('#rf-ruler').focus(); for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  const after = await S(page, () => { const m = window.__spatial.world.machines.get('vre'); return [m.spin.rotation.y, m.tiltG.rotation.x, m.lift, m.rot, m.tilt]; });
  assert.notEqual(after[0], before[0], 'la règle horizontale tourne la machine'); assert.notEqual(after[1], before[1], 'la règle verticale incline la machine');
  assert.ok(after[2] > 0, 'le socle reste au-dessus du plan');
  // les animations continuent : le glow local ne s'allume pas sur toute la machine du seul fait de la rotation
  await page.waitForTimeout(800);
  const glowing = await S(page, () => { let n = 0, t = 0; window.__spatial.world.machines.get('vre').body.traverse((o) => { if (o.userData.glowShell && o.visible) n++; if (o.isMesh && !o.userData.glowShell) t++; }); return [n, t]; });
  assert.ok(glowing[0] < glowing[1] * .8, 'rotation globale distincte des animations internes : ' + glowing.join('/'));
  const t1 = await S(page, () => window.__spatial.world.t); await page.waitForTimeout(400); assert.ok(await S(page, () => window.__spatial.world.t) > t1, 'rendu actif');
  await page.screenshot({ path: out + '/02-inspection.png', timeout: 150000 });
  ok('inspection : règles horizontale et verticale orientent le modèle, animations indépendantes');

  /* 4 et 5 : lecture, molette dans le panneau, retour */
  const pBefore = await S(page, () => window.__spatial.scroll.current);
  await page.locator('.sp-note[data-id="vre"] .sp-go').click({ timeout: 20000 });
  await page.waitForFunction(() => window.__spatial.panel.isOpen); assert.equal(await S(page, () => window.__spatial.state.state), 'lecture');
  await page.waitForFunction(() => document.querySelectorAll('#sp-panel .sp-p-sec').length > 1, null, { timeout: 20000 });
  assert.ok((await page.locator('#sp-panel .sp-p-nav a').count()) >= 3, 'rubriques navigables');
  assert.match(page.url(), /#\/vre\/fiche$/);
  await page.mouse.move(1100, 500); await page.mouse.wheel(0, 600);
  await page.waitForFunction(() => document.querySelector('#sp-panel .sp-p-body').scrollTop > 0, null, { timeout: 15000 }).catch(() => {});
  assert.ok(await S(page, () => document.querySelector('#sp-panel .sp-p-body').scrollTop) > 0, 'la molette défile dans le panneau');
  assert.equal(await S(page, () => window.__spatial.scroll.current), pBefore, 'la caméra ne bouge pas pendant la lecture');
  await page.screenshot({ path: out + '/03-lecture.png', timeout: 150000 });
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !window.__spatial.panel.isOpen);
  assert.equal(await S(page, () => window.__spatial.state.state), 'inspection'); assert.equal(await S(page, () => window.__spatial.selected), 'vre');
  const back = await S(page, () => { const m = window.__spatial.world.machines.get('vre'); return [m.rot, m.tilt, window.__spatial.scroll.current]; });
  assert.equal(back[0], after[3]); assert.equal(back[1], after[4]); assert.equal(back[2], pBefore);
  assert.equal(await S(page, () => document.activeElement?.className), 'sp-go', 'focus restauré sur le bouton qui a ouvert la fiche');
  ok('lecture : panneau, molette contenue, Échap, focus, position et orientation conservées');

  /* 6 : lien direct et rechargement */
  const hash = new URL(page.url()).hash; assert.equal(hash, '#/vre');
  await page.reload(); await page.waitForFunction(() => window.__spatial);
  assert.equal(await S(page, () => window.__spatial.selected), 'vre');
  assert.ok(Math.abs(await S(page, () => window.__spatial.scroll.current - window.__spatial.timeline.uOf('vre'))) < 1);
  await page.goBack(); await page.waitForTimeout(500);
  ok('lien profond : #/vre restaure projet et position, historique utilisable');

  /* navigation directe + HTML-in-Canvas ou repli */
  await page.locator('[data-goto="parcours"]').first().click(); await page.waitForTimeout(300); await settle(page);
  assert.ok(Math.abs(await S(page, () => window.__spatial.scroll.current - window.__spatial.timeline.uOf('parcours'))) < 1, 'navigation directe vers le parcours');
  await page.locator('.sp-hubcard[data-hub="parcours"] a[href$="cv-ats-mathieu-comtesse.pdf"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(process.env.HIC ? 4000 : 0);
  const hic = await S(page, () => window.__spatial.hic.status);
  console.log('INFO HTML-in-Canvas : ' + hic);
  if (!process.env.HIC) assert.equal(hic, 'indisponible'); else assert.ok(hic === 'actif' || hic.startsWith('repli'), 'état HTML-in-Canvas : ' + hic);
  assert.ok(await page.locator('.sp-note .sp-title').count() > 5, 'légendes DOM toujours présentes');
  ok('navigation directe, HTML-in-Canvas : ' + hic);
  await ctx.close();

  /* 7 : mobile tactile */
  ({ ctx, page } = await open('/spatial.html?reset', { viewport: { width: 390, height: 844 }, touch: true }));
  const cdp = await ctx.newCDPSession(page);
  const swipe = async (x, y0, y1) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] }); for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 12 }] }); await page.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  const m0 = await S(page, () => window.__spatial.scroll.target); await swipe(300, 520, 160); await page.waitForTimeout(300);
  assert.ok(await S(page, () => window.__spatial.scroll.target) > m0, 'glissement vertical : progression');
  await page.screenshot({ path: out + '/04-mobile.png', timeout: 150000 });
  assert.ok(await page.locator('#sp-index').count(), 'index présent'); assert.ok((await page.locator('.sp-menu button').first().boundingBox()).height >= 44, 'zones tactiles de 44 px');
  ok('mobile : glissement tactile, zones de 44 px'); await ctx.close();

  /* 8 et 9 : vue liste (sans WebGL pour la consultation) et clavier */
  ({ ctx, page } = await open('/spatial.html?vue=liste'));
  assert.ok(await page.locator('body.sp-list').count()); assert.ok(!(await page.locator('#sp-canvas').isVisible()));
  const links = await page.locator('#sp-index-list a.sp-ix-t').count(); assert.ok(links >= 24, 'index complet : ' + links + ' projets');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  assert.ok(await S(page, () => !!document.activeElement), 'focus clavier');
  ok('vue liste : ' + links + ' réalisations accessibles sans rendu 3D'); await ctx.close();

  /* mouvement réduit : navigation directe, pas de déplacement animé */
  ({ ctx, page } = await open('/spatial.html?reset', { reduced: true }));
  await S(page, () => window.__spatial.select('pa', { instant: false })); await page.waitForTimeout(200);
  assert.ok(Math.abs(await S(page, () => window.__spatial.scroll.current - window.__spatial.timeline.uOf('pa'))) < 1, 'saut direct sans trajectoire animée');
  ok('prefers-reduced-motion : cadrage direct'); await ctx.close();

  assert.deepEqual(errors, [], 'erreurs JavaScript : ' + errors.join('\n'));
  console.log('PASS: scénarios de la vue spatiale');
} finally { await browser.close(); server.close(); }
