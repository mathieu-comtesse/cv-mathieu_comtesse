const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.THALEOLITHIC_PLAYWRIGHT || 'playwright');

const root = path.resolve(process.env.THALEOLITHIC_TEST_ROOT ?? path.join(__dirname, '../thaleolithic'));
const baseline = process.env.THALEOLITHIC_BASELINE;
const real = process.argv.includes('--real') || Boolean(baseline);
const intercepted = !baseline && process.env.THALEOLITHIC_INTERCEPT === '1';
const softwareRunner = process.argv.includes('--ci');
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
  const report = {mode: baseline ? 'public V22.1' : real ? 'WebAssembly ' + buildVersion : 'pont JavaScript simulé', steps: [], errors: []};
  const record = (name, value = true) => { report.steps.push({name, value}); console.log(name, value); };
  let browser, page;
  try {
    browser = await chromium.launch({executablePath: process.env.THALEOLITHIC_CHROMIUM,
      args: [process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=swiftshader',
        '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']});
    const mobile = Boolean(baseline) || process.argv.includes('--touch');
    const context = await browser.newContext(mobile
      ? {viewport: {width: 852, height: 393}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}
      : {viewport: {width: 1280, height: 720}});
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push(String(error)));
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
        if (mobile) {
          const client = await context.newCDPSession(page);
          const touch = (type, points) => client.send('Input.dispatchTouchEvent', {type, touchPoints: points});
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
          await waitState({controls: false, phase: 'PAUSE'});
          await page.setViewportSize({width: 852, height: 393});
          await waitState(gameplay);
          record('Multitouch déplacement/caméra et rotation écran');
        } else {
          await page.keyboard.down('s');
          await page.waitForTimeout(1300);
          await page.keyboard.up('s');
        }
        await page.waitForFunction(before => {
          const p = window.ungaRuntime.position;
          return Math.hypot(p.x - before.x, p.z - before.z) > .3;
        }, before, {timeout: 10000});
        const position = await page.evaluate(() => window.ungaRuntime.position);
        record('Dylan a bougé', Math.hypot(position.x - before.x, position.z - before.z));
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
    await browser?.close();
    server.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });