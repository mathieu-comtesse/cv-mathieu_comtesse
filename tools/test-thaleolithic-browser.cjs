const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.THALEOLITHIC_PLAYWRIGHT || 'playwright');
const { installSave, runScenes } = require('./thaleolithic-scene-bench.cjs');
const { runSst } = require('./test-thaleolithic-sst.cjs');

const root = path.resolve(process.env.THALEOLITHIC_TEST_ROOT ?? path.join(__dirname, '../thaleolithic'));
const baseline = process.env.THALEOLITHIC_BASELINE;
const real = process.argv.includes('--real') || Boolean(baseline);
const intercepted = !baseline && process.env.THALEOLITHIC_INTERCEPT === '1';
const softwareRunner = process.argv.includes('--ci');
const chapterSave = process.env.THALEOLITHIC_CHAPTER_SAVE;
const sceneFixtures = process.env.THALEOLITHIC_SCENE_FIXTURES;
const sstSave = process.env.THALEOLITHIC_SST_SAVE;
const videoDir = process.env.THALEOLITHIC_RECORD_DIR;
const enduranceMinutes = Number(process.env.THALEOLITHIC_ENDURANCE_MINUTES || 0);
if (!Number.isFinite(enduranceMinutes) || enduranceMinutes < 0 || (enduranceMinutes && !real))
  throw new Error('L’endurance exige une durée positive et le mode --real');
const types = {'.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
  '.css': 'text/css', '.webp': 'image/webp'};

async function run() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, url.pathname === '/' ? 'index.html' : '.' + url.pathname);
    if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Content-Length': fs.statSync(file).size});
      fs.createReadStream(file).pipe(res);
    } else { res.writeHead(404); res.end(); }
  });
  if (!baseline && !intercepted) await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = baseline || (intercepted ? 'http://127.0.0.1:8793/' : `http://127.0.0.1:${server.address().port}/`);
  const buildVersion = JSON.parse(fs.readFileSync(path.join(root, 'game-config.json'), 'utf8')).version;
  const chapterRequests = [];
  const report = {mode: baseline ? 'public V22.1' : real ? 'WebAssembly ' + buildVersion : 'pont JavaScript simulé', steps: [], errors: []};
  const record = (name, value = true) => { report.steps.push({name, value}); console.log(name, value); };
  let browser, context, page;
  try {
    browser = await chromium.launch({executablePath: process.env.THALEOLITHIC_CHROMIUM,
      args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=swiftshader',
        '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']});
    const mobile = Boolean(baseline) || process.argv.includes('--touch');
    const device = mobile
      ? {viewport: {width: 852, height: 393}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}
      : {viewport: {width: 1280, height: 720}};
    context = await browser.newContext({...device, ...(videoDir && {recordVideo: {dir: videoDir, size: device.viewport}})});
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('crash', () => report.errors.push('Onglet Chromium interrompu'));
    page.on('console', message => {
      if (message.type() === 'error' && /Exception|RuntimeError|abort\(|out of bounds|out of memory|SendMessage|unhandled/i.test(message.text()))
        report.errors.push(message.text());
    });
    await page.addInitScript(() => {
      window.bridgeEvents = [];
      window.addEventListener('unga-game', event => window.bridgeEvents.push(event.detail.type));
    });
    if (intercepted) {
      await page.exposeBinding('__buildChunk', (_, name, offset) => {
        const file = path.join(root, 'Build', path.basename(name));
        const size = fs.statSync(file).size;
        if (offset < 0) return size;
        const handle = fs.openSync(file, 'r');
        try {
          const buffer = Buffer.alloc(Math.min(524288, size - offset));
          fs.readSync(handle, buffer, 0, buffer.length, offset);
          return buffer.toString('base64');
        } finally { fs.closeSync(handle); }
      });
      await page.addInitScript(() => {
        const fetchOriginal = window.fetch;
        window.fetch = async (input, options) => {
          const url = new URL(typeof input === 'string' ? input : input.url, location.href);
          if (url.origin !== location.origin || !url.pathname.endsWith('.unityweb')) return fetchOriginal(input, options);
          const size = await window.__buildChunk(url.pathname, -1);
          let offset = 0;
          return new Response(new ReadableStream({
            async pull(controller) {
              if (offset >= size) { controller.close(); return; }
              const bytes = Uint8Array.from(atob(await window.__buildChunk(url.pathname, offset)), value => value.charCodeAt(0));
              controller.enqueue(bytes);
              offset += bytes.length;
            }
          }), {headers: {'Content-Type': 'application/octet-stream', 'Content-Length': String(size)}});
        };
      });
      await page.route(origin + '**', route => {
        const url = new URL(route.request().url());
        const file = path.resolve(root, url.pathname === '/' ? 'index.html' : '.' + url.pathname);
        return file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
          ? route.fulfill({path: file, contentType: types[path.extname(file)] ?? 'application/octet-stream'})
          : route.fulfill({status: 404, body: ''});
      });
    }
    if (chapterSave) {
      let failed = false;
      await page.route('**/StreamingAssets/*.bundle', route => {
        const name = new URL(route.request().url()).pathname.split('/').at(-1);
        chapterRequests.push(name);
        if (!failed && name.startsWith('iso-08-')) {
          failed = true;
          return route.fulfill({status: 503, body: 'temporary test failure'});
        }
        return route.fulfill({path: path.join(root, 'StreamingAssets', name), contentType: 'application/octet-stream'});
      });
    }
    if (chapterSave || sceneFixtures || sstSave)
      await page.route(origin + 'fixture.html', route => route.fulfill({contentType: 'text/html', body: '<title>Fixture locale</title>'}));
    if (!real) {
      await page.route('**/*.loader.js*', route => route.fulfill({contentType: 'application/javascript', body: `
        window.sent = [];
        window.engines = 0;
        window.answer = 'hold';
        window.emit = detail => dispatchEvent(new CustomEvent('unga-game', {detail}));
        window.createUnityInstance = async () => {
          window.engines++;
          emit({type:'ready',saved:true});
          return {SendMessage(object, method, json) {
            const payload = JSON.parse(json);
            sent.push({object, method, payload});
            if (method !== 'BeginGame') return;
            window.startRequest = payload.request;
            emit({type:'GAME_STARTING',request:payload.request});
            if (answer === 'fail') emit({type:'GAME_START_FAILED',request:payload.request,
              phase:'CAMPAIGN',code:'SAVE_INVALID',message:'Sauvegarde illisible'});
          }};
        };
      `}));
    }
    await page.goto(origin + '?diagnostic=1', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !document.getElementById('play').disabled, null, {timeout: 180000});
    record('Moteur prêt');
    if (!real) {
      await page.locator('#continue').click();
      await page.waitForFunction(() => document.getElementById('welcome').dataset.phase === 'INITIALIZING');
      assert.equal(await page.locator('#welcome').isVisible(), true);
      await page.evaluate(() => emit({type: 'GAME_STARTED', request: startRequest + 1}));
      assert.equal(await page.locator('#welcome').isVisible(), true);
      await page.evaluate(() => emit({type: 'GAME_START_FAILED', request: startRequest, phase: 'CAMPAIGN',
        code: 'SAVE_INVALID', message: 'Sauvegarde illisible'}));
      await page.locator('#error').waitFor({state: 'visible'});
      assert.match(await page.locator('#error-message').textContent(), /SAVE_INVALID/);
      assert.equal(await page.evaluate(() => thaleolithicDiagnostic().error.code), 'SAVE_INVALID');
      await page.locator('#retry').click();
      await page.locator('#continue').click();
      await page.evaluate(() => emit({type: 'GAME_STARTED', request: startRequest, saved: true}));
      await page.locator('#welcome').waitFor({state: 'hidden'});
      assert.equal(await page.evaluate(() => engines), 1);
      assert.equal(await page.evaluate(() => thaleolithicDiagnostic().phase), 'RUNNING');
      assert.deepEqual(await page.evaluate(() => thaleolithicInputLog().map(row => row.phase)
        .filter((phase, i, all) => i === 0 || phase !== all[i - 1])),
        ['NOT_STARTED', 'START_REQUESTED', 'INITIALIZING', 'FAILED', 'NOT_STARTED',
          'START_REQUESTED', 'INITIALIZING', 'READY_TO_PLAY', 'RUNNING']);
      record('Démarrage, accusé obsolète, échec et reprise sur la même instance');
    } else {
      if (softwareRunner) {
        await page.locator('#settings').click();
        await page.locator('#quality').selectOption('0');
        await page.locator('#settings-dialog > button').click();
      }
      await page.locator('#play').click();
      const journeyStarted = Date.now();
      await page.waitForFunction(() => window.ungaRuntime?.player === 'dylan', null, {timeout: 90000});
      if (!baseline) assert.deepEqual(await page.evaluate(() => bridgeEvents.filter(event =>
        ['ready', 'GAME_STARTING', 'GAME_STARTED'].includes(event))), ['ready', 'GAME_STARTING', 'GAME_STARTED']);
      const state = () => page.evaluate(() => window.thaleolithicDiagnostic?.().input ??
        window.thaleolithicInputLog?.().filter(entry => entry.source === 'unity').at(-1));
      const waitState = value => page.waitForFunction(expected => {
        const actual = window.thaleolithicDiagnostic?.().input ??
          window.thaleolithicInputLog?.().filter(entry => entry.source === 'unity').at(-1);
        return actual && Object.entries(expected).every(([key, value]) => actual[key] === value);
      }, value, {timeout: 20000});
      const gameplay = {controls: true, camera: true, suspended: false, paused: false};
      if (softwareRunner) {
        for (let attempts = 0; attempts < 4 && await page.evaluate(() => window.ungaRuntime?.film); attempts++) {
          // Native desktop skip button on the 1280 × 720 QA viewport.
          await page.mouse.click(1163, 687);
          await page.waitForTimeout(1000);
        }
      }
      await page.waitForFunction(() => window.ungaRuntime && !window.ungaRuntime.film, null, {timeout: 150000});
      await waitState(gameplay);
      record('Cinématique terminée, Dylan et caméra actifs', await state());
      if (sstSave) {
        await runSst({page, origin, filename: sstSave, mobile, record, waitState, gameplay,
          reportFile: process.env.THALEOLITHIC_REPORT, buildVersion});
        assert.deepEqual(report.errors, []);
        report.status = 'passed';
        return;
      }
      if (enduranceMinutes) {
        const deadline = journeyStarted + enduranceMinutes * 60_000;
        report.endurance = {targetMinutes: enduranceMinutes, scope: 'une instance Web, ouverture, village, clavier, menus et sauvegardes',
          measurements: [], cycles: 0};
        const persist = () => {
          if (process.env.THALEOLITHIC_REPORT) fs.writeFileSync(process.env.THALEOLITHIC_REPORT, JSON.stringify(report, null, 2));
        };
        await page.locator('#unity-canvas').focus();
        while (Date.now() < deadline) {
          await page.keyboard.press('Escape');
          await waitState({window: 'Pause', controls: false});
          await page.keyboard.press('Escape');
          await waitState(gameplay);
          if (report.endurance.cycles < 4) {
            const key = report.endurance.cycles % 2 === 0 ? 's' : 'w';
            await page.keyboard.down(key);
            try { await page.waitForTimeout(600); }
            finally { await page.keyboard.up(key); }
          }
          report.endurance.cycles++;
          const sample = await page.evaluate(() => {
            const d = thaleolithicDiagnostic();
            return {wasmMiB: d.wasmHeapMiB, jsMiB: d.jsHeapMiB, unity: d.metrics?.performance,
              act: window.ungaRuntime.act, controls: d.input.controls};
          });
          report.endurance.measurements.push({seconds: (Date.now() - journeyStarted) / 1000, ...sample});
          assert.equal(sample.controls, true);
          assert.deepEqual(report.errors, []);
          persist();
          await page.waitForTimeout(Math.min(20000, Math.max(0, deadline - Date.now())));
        }
        report.endurance.seconds = (Date.now() - journeyStarted) / 1000;
        record('Endurance du vrai WebAssembly', {seconds: report.endurance.seconds, cycles: report.endurance.cycles});
        report.status = 'passed';
        return;
      }
      if (sceneFixtures) {
        await runScenes({page, origin, directory: sceneFixtures, report, record, waitState, gameplay,
          reportFile: process.env.THALEOLITHIC_REPORT});
        assert.deepEqual(report.errors, []);
        report.status = 'passed';
        return;
      }
      if (chapterSave) {
        assert.deepEqual(chapterRequests, []);
        assert.match(await page.evaluate(() => window.ungaRuntime.chapterPacks), /07:pending,08:pending/);
        record('Nouvelle partie sans requête de lot ISO');
        await page.waitForTimeout(7000);
        await installSave(page, origin, chapterSave);
        await page.goto(origin + '?diagnostic=1', {waitUntil: 'domcontentloaded'});
        await page.waitForFunction(() => !document.getElementById('continue').disabled, null, {timeout: 180000});
        assert.deepEqual(chapterRequests, []);
        await page.locator('#continue').click();
        await page.waitForFunction(() => window.ungaRuntime?.chapterPacks === '07:ready,08:ready', null, {timeout: 45000});
        await waitState(gameplay);
        assert.equal(chapterRequests.filter(name => name.startsWith('iso-07-')).length, 1);
        assert.equal(chapterRequests.filter(name => name.startsWith('iso-08-')).length, 2);
        record('Reprise avancée et nouvel essai automatique du lot après HTTP 503',
          await page.evaluate(() => ({act: window.ungaRuntime.act, chapterPacks: window.ungaRuntime.chapterPacks})));
        const previousEvent = await page.evaluate(() => thaleolithicDiagnostic().boot.previous?.lastUnityEvent?.type);
        assert.equal(previousEvent, 'GAME_STARTED');
        record('Diagnostic de l’instance précédente conservé', previousEvent);
        const lateSample = await page.evaluate(() => ({act: window.ungaRuntime.act, position: window.ungaRuntime.position,
          heapMiB: thaleolithicDiagnostic().wasmHeapMiB, metrics: thaleolithicDiagnostic().metrics}));
        record('Profil WebAssembly à la reprise du chapitre', lateSample);
        assert.deepEqual(report.errors, []);
        report.status = 'passed';
        return;
      }
      if (!baseline) {
        const visibility = hidden => page.evaluate(value => {
          if (value) Object.defineProperty(document, 'hidden', {configurable: true, value: true});
          else delete document.hidden;
          document.dispatchEvent(new Event('visibilitychange'));
        }, hidden);
        await visibility(true);
        await waitState({controls: false, suspended: true});
        await visibility(false);
        if (mobile) await page.locator('#resume-game').click();
        await waitState(gameplay);
        record('Retour de visibilité et reprise des commandes');
        if (process.argv.includes('--pointer') && !mobile) {
          await page.mouse.click(625, 420);
          await page.waitForFunction(() => document.pointerLockElement === document.getElementById('unity-canvas'));
          await waitState({pointer: true, controls: true});
          await page.evaluate(() => document.exitPointerLock());
          await waitState({pointer: false, controls: true});
          record('Pointer Lock obtenu par clic puis libéré');
        }
        if (!mobile) {
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press('Escape');
            await waitState({window: 'Pause', controls: false});
            await page.mouse.click(640, 258);
            await waitState({window: 'Réglages', parent: 'Pause', controls: false});
            await page.mouse.click(1242, 36);
            await waitState({window: 'Pause', controls: false});
            await page.mouse.click(640, 200);
            await waitState(gameplay);
          }
          record('20 cycles Échap, Réglages, croix et Reprendre');
        }
        const before = await page.evaluate(() => window.ungaRuntime.position);
        const waitForMovement = timeout => page.waitForFunction(start => {
          const position = window.ungaRuntime.position;
          return Math.hypot(position.x - start.x, position.z - start.z) > .3;
        }, before, {timeout, polling: 200});
        if (mobile) {
          const client = await context.newCDPSession(page);
          const touch = (type, points) => client.send('Input.dispatchTouchEvent', {type, touchPoints: points});
          const checkViewport = async (width, height) => {
            await page.waitForFunction(({width, height}) => innerWidth === width && innerHeight === height, {width, height});
            return {width, height};
          };
          const landscape = await checkViewport(852, 393);
          const yaw = await page.evaluate(() => window.thaleolithicDiagnostic().metrics?.yaw);
          await touch('touchStart', [{x: 76, y: 315, id: 1}, {x: 470, y: 180, id: 2}]);
          await touch('touchMove', [{x: 76, y: 350, id: 1}, {x: 730, y: 180, id: 2}]);
          await page.waitForFunction(before => {
            const value = window.thaleolithicDiagnostic().metrics;
            return value && Math.abs(value.yaw - before) > 5 && value.touches === 2;
          }, yaw, {timeout: 12000});
          await touch('touchEnd', []);
          await waitState(gameplay);
          await page.setViewportSize({width: 393, height: 852});
          const portrait = await checkViewport(393, 852);
          await waitState({controls: false, phase: 'PAUSE'});
          await page.setViewportSize({width: 852, height: 393});
          await checkViewport(852, 393);
          await waitState(gameplay);
          record('Multitouch déplacement/caméra et rotation écran', {landscape, portrait});
          await waitForMovement(15000);
        } else {
          await page.locator('#unity-canvas').focus();
          const directions = softwareRunner ? ['s', 'd', 'a'] : ['s'];
          for (const direction of directions) {
            await page.keyboard.down(direction);
            try {
              await waitForMovement(softwareRunner ? 15000 : 30000);
              break;
            } catch (error) {
              if (error.name !== 'TimeoutError' || direction === directions.at(-1)) throw error;
            } finally { await page.keyboard.up(direction); }
          }
        }
        const position = await page.evaluate(() => window.ungaRuntime.position);
        record('Dylan a bougé', Math.hypot(position.x - before.x, position.z - before.z));
        if (!mobile) {
          await page.keyboard.press('Escape');
          await waitState({window: 'Pause', controls: false});
        }
        await page.waitForTimeout(6000);
        await page.reload({waitUntil: 'domcontentloaded'});
        await page.waitForFunction(() => !document.getElementById('continue').disabled, null, {timeout: 180000});
        await page.locator('#continue').click();
        await waitState(gameplay);
        const resumed = await page.evaluate(() => window.ungaRuntime?.position);
        if (resumed) assert.ok(Math.hypot(resumed.x - position.x, resumed.z - position.z) < 2);
        record('Sauvegarde reprise dans le même profil navigateur');
      }
    }
    assert.deepEqual(report.errors, []);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = String(error);
    report.last = await page?.evaluate(() => window.thaleolithicDiagnostic?.() ??
      {label: document.getElementById('loading-label')?.textContent, error: document.getElementById('error-message')?.textContent})
      .catch(() => null);
    if (process.env.THALEOLITHIC_REPORT)
      await page?.screenshot({path: process.env.THALEOLITHIC_REPORT + '.png'}).catch(() => {});
    throw error;
  } finally {
    if (process.env.THALEOLITHIC_REPORT) fs.writeFileSync(process.env.THALEOLITHIC_REPORT, JSON.stringify(report, null, 2));
    await context?.close();
    await browser?.close();
    server.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
