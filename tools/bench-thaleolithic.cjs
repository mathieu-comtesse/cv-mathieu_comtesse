const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.THALEOLITHIC_PLAYWRIGHT || 'playwright');

const root = path.resolve(process.env.THALEOLITHIC_BENCH_ROOT ?? path.join(__dirname, '../thaleolithic'));
const reportFile = process.env.THALEOLITHIC_REPORT;
const mobile = process.argv.includes('--touch');
const config = JSON.parse(fs.readFileSync(path.join(root, 'game-config.json'), 'utf8'));
const origin = 'http://127.0.0.1:8793/';
const files = Object.fromEntries(['loaderUrl', 'dataUrl', 'frameworkUrl', 'codeUrl'].map(key => [key, fs.statSync(
  path.join(root, new URL(config[key], origin).pathname)).size]));
const report = {version: config.version ?? 'V22.1', device: mobile ? 'tactile émulé' : 'bureau',
  delivery: 'ressources locales interceptées par Playwright',
  wasmSampling: 'HEAPU8 observable une fois l’instance Unity rendue au navigateur',
  files, stages: [], errors: []};

const percentile = (values, p) => values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] ?? null;
async function run() {
  const browser = await chromium.launch({executablePath: process.env.THALEOLITHIC_CHROMIUM,
    args: ['--no-proxy-server', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
      process.platform === 'win32' ? '--use-angle=d3d11' : '--use-angle=swiftshader']});
  report.browser = browser.version();
  const context = await browser.newContext(mobile
    ? {viewport: {width: 852, height: 393}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}
    : {viewport: {width: 1280, height: 720}});
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await client.send('Performance.getMetrics')).metrics.map(row => [row.name, row.value]));
  try {
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => {
      if (message.type() === 'error' && /Exception|RuntimeError|out of memory|SendMessage|unhandled/i.test(message.text()))
        report.errors.push(message.text());
    });
    await page.exposeBinding('__benchChunk', (_, name, offset) => {
      const file = path.join(root, 'Build', path.basename(name));
      const size = fs.statSync(file).size;
      if (offset < 0) return size;
      const handle = fs.openSync(file, 'r');
      try {
        const bytes = Buffer.alloc(Math.min(size - offset, 524288));
        fs.readSync(handle, bytes, 0, bytes.length, offset);
        return bytes.toString('base64');
      } finally { fs.closeSync(handle); }
    });
    await page.addInitScript(() => {
      window.measurement = {events: [], heap: [], frames: [], longTasks: []};
      const data = window.measurement;
      const mb = bytes => Number.isFinite(bytes) ? bytes / 1048576 : null;
      function sample() {
        const runtime = typeof instance === 'undefined' ? null : instance?.Module;
        const heap = runtime?.HEAPU8 ?? runtime?.HEAP8;
        data.heap.push({at: performance.now(), wasmMiB: mb(heap?.buffer.byteLength),
          jsMiB: mb(performance.memory?.usedJSHeapSize)});
      }
      setInterval(sample, 250);
      addEventListener('unga-game', ({detail}) => {
        if (detail.type !== 'input' && detail.type !== 'state' && detail.type !== 'diagnostic')
          data.events.push({type: detail.type, at: performance.now()});
      });
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        new PerformanceObserver(rows => data.longTasks.push(...rows.getEntries().map(row => ({at: row.startTime, ms: row.duration}))))
          .observe({type: 'longtask', buffered: true});
      }
      let last;
      function frame(now) {
        if (last !== undefined) data.frames.push({at: now, ms: now - last});
        last = now;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      const original = fetch;
      window.fetch = async (input, options) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.origin !== location.origin || !url.pathname.endsWith('.unityweb')) return original(input, options);
        const size = await window.__benchChunk(url.pathname, -1);
        let offset = 0;
        return new Response(new ReadableStream({
          async pull(controller) {
            if (offset >= size) { controller.close(); return; }
            const bytes = Uint8Array.from(atob(await window.__benchChunk(url.pathname, offset)), value => value.charCodeAt(0));
            offset += bytes.length;
            controller.enqueue(bytes);
          }
        }), {headers: {'Content-Type': 'application/octet-stream', 'Content-Length': String(size)}});
      };
    });
    await page.route(origin + '**', route => {
      const url = new URL(route.request().url());
      const file = path.resolve(root, url.pathname === '/' ? 'index.html' : '.' + url.pathname);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
        return route.fulfill({status: 404, body: ''});
      const mime = {'.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
        '.webp': 'image/webp', '.css': 'text/css'};
      return route.fulfill({path: file, contentType: mime[path.extname(file)] ?? 'application/octet-stream'});
    });
    await page.goto(origin + '?diagnostic=1', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !document.querySelector('#play').disabled, null, {timeout: 180000});
    const readyAt = await page.evaluate(() => performance.now());
    await page.locator('#play').click();
    await page.waitForFunction(() => window.ungaRuntime?.player === 'dylan', null, {timeout: 90000});
    report.startup = {readyAt, playerAt: await page.evaluate(() => performance.now())};
    const checkpoint = async (name, seconds = 8) => {
      const start = await page.evaluate(() => performance.now());
      const before = await metrics();
      await page.waitForTimeout(seconds * 1000);
      const after = await metrics();
      const values = await page.evaluate(start => {
        const data = window.measurement;
        return {frames: data.frames.filter(frame => frame.at >= start).map(frame => frame.ms),
          heap: data.heap.filter(sample => sample.at >= start), longTasks: data.longTasks.filter(task => task.at >= start),
          runtime: window.ungaRuntime, diagnostic: window.thaleolithicDiagnostic?.().metrics};
      }, start);
      const sorted = values.frames.toSorted((a, b) => a - b);
      const peak = key => values.heap.some(sample => sample[key] !== null)
        ? Math.max(...values.heap.map(sample => sample[key] ?? 0)) : null;
      report.stages.push({name, browserFrames: sorted.length, browserFps: sorted.length * 1000 / sorted.reduce((a, b) => a + b, 0),
        medianMs: percentile(sorted, .5), p95Ms: percentile(sorted, .95), p99Ms: percentile(sorted, .99),
        mainThreadMs: (after.TaskDuration - before.TaskDuration) * 1000,
        scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
        longTasks: values.longTasks.length, wasmPeakMiB: peak('wasmMiB'), jsPeakMiB: peak('jsMiB'),
        runtime: values.runtime, diagnostic: values.diagnostic});
      console.log(name, report.stages.at(-1).p95Ms);
    };
    await checkpoint('Cinématique d’ouverture');
    await page.waitForFunction(() => window.ungaRuntime && !window.ungaRuntime.film, null, {timeout: 180000});
    await checkpoint('Village initial après la cinématique', 12);
    report.renderer = await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const renderer = gl?.getExtension('WEBGL_debug_renderer_info');
      return gl && gl.getParameter(renderer?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
    });
    if (reportFile) await page.screenshot({path: reportFile + '.png'});
    report.startup = {...report.startup, ...await page.evaluate(() => {
      const {events, heap, longTasks} = window.measurement;
      const first = events.find(event => event.type === 'GAME_STARTED')?.at ?? performance.now();
      const boot = heap.filter(sample => sample.at <= first);
      const max = key => boot.some(sample => sample[key] !== null) ? Math.max(...boot.map(sample => sample[key] ?? 0)) : null;
      return {events, wasmPeakMiB: max('wasmMiB'), jsPeakMiB: max('jsMiB'), longTasks: longTasks.filter(task => task.at <= first)};
    })};
    assert.deepEqual(report.errors, []);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = String(error);
    throw error;
  } finally {
    if (reportFile) fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({status: report.status, startup: report.startup, version: report.version}));
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });