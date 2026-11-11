// npm install --no-save playwright && npx playwright install
// OUT, TARGET, REFERENCE, CHECKOUT, ENGINE, CHANNEL, VIEWPORT, VIDEO and CASES are optional.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { routeCheckout } from '../route-checkout.mjs';

const require = createRequire(import.meta.url);
const engines = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const engine = process.env.ENGINE || 'chromium';
const reference = process.env.REFERENCE || 'https://www.shopify.com/editions/fall2026';
const target = process.env.TARGET || 'https://comtesse.me/';
const output = path.resolve(process.env.OUT || 'tmp/shopify-hover-parity');
const checkout = process.env.CHECKOUT && path.resolve(process.env.CHECKOUT);
const [width, height] = (process.env.VIEWPORT || '1440x900').split('x').map(Number);
const viewport = { width, height };
const samples = [0, 50, 100, 200, 350, 500, 800];
const tolerance = { heightPx: 1, movementPx: 1, durationMs: 20, rgbChannel: 2 };
const requestedCases = new Set(process.env.CASES?.split(',').filter(Boolean));

const profiles = [
  { id: 'contact', reference: '.roundedButton[href]', target: '.cv-contact-button' },
  { id: 'search', reference: '#desktop-search-button', target: '#desktop-search-button' },
  { id: 'menu', reference: '#all-editions-dropdown-button', target: '#cv-chapters-toggle' },
  { id: 'chapter', reference: '.hero-nav-link', target: '.hero-nav-link' },
  { id: 'card', reference: '#agentic .product-card', target: '#cv-processus .cv-card-content' },
  { id: 'text-link', reference: '#agentic a[data-component-name]', target: '.rf-callout a[href]', targetPath: '/article-finance.html' },
  { id: 'magic', reference: '#agentic .product-card button', target: '.rf-cta[data-demo=magic]', targetPath: '/projet-finance.html' },
  { id: 'explore', reference: '#agentic .product-card button', target: '.rf-cta[data-demo=explore]', targetPath: '/projet-finance.html' },
  { id: 'canvas', reference: '.surfacing__canvas', target: '#hero canvas' },
];

const properties = [
  'cursor', 'visibility', 'opacity', 'padding', 'margin', 'borderWidth', 'borderRadius',
  'borderColor', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow',
  'backgroundColor', 'backgroundImage', 'filter', 'backdropFilter',
  'transform', 'transformOrigin', 'translate', 'scale', 'gridTemplateColumns',
  'fontFamily', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'color',
  'textDecorationLine', 'textDecorationThickness', 'textDecorationColor', 'textUnderlineOffset',
  'transitionProperty', 'transitionDuration', 'transitionDelay', 'transitionTimingFunction',
  'animationName', 'animationDuration', 'animationDelay', 'animationTimingFunction',
];

const browser = await engines[engine].launch({
  headless: process.env.HEADLESS !== '0',
  ...(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {}),
  ...(process.env.SOFTWARE === '1' && engine === 'chromium'
    ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}),
});
await fs.mkdir(output, { recursive: true });
const report = {
  reference, target, checkout, engine, browser: browser.version(), viewport,
  samplingMs: samples, tolerance, cases: [], sessions: {},
};
const assetOrigin = new URL(target).origin;

async function overlay(context) {
  if (checkout) await routeCheckout(context, checkout, assetOrigin, { fallback: true });
}

async function observePage(page) {
  await page.addInitScript(({ instrumentRaf }) => {
    const entries = { longtask: [], event: [], 'layout-shift': [] };
    for (const [type, data] of Object.entries(entries)) {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue;
      const options = { type, buffered: true };
      if (type === 'event') options.durationThreshold = 16;
      new PerformanceObserver(list => data.push(...list.getEntries())).observe(options);
    }
    const contexts = {};
    const seen = new WeakSet();
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
      const result = getContext.call(this, kind, ...options);
      if (result && !seen.has(result)) {
        seen.add(result);
        contexts[kind] = (contexts[kind] || 0) + 1;
      }
      return result;
    };
    const durations = [];
    const rafRuns = new WeakMap();
    let recurringFrameCallbacks = 0;
    if (instrumentRaf) {
      const requestFrame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (callback) {
        return requestFrame(now => {
          const count = (rafRuns.get(callback) || 0) + 1;
          rafRuns.set(callback, count);
          if (count === 10) recurringFrameCallbacks++;
          callback(now);
        });
      };
    }
    window.__hoverParity = {
      entries, contexts, durations,
      get recurringFrameCallbacks() { return instrumentRaf ? recurringFrameCallbacks : undefined; },
      measureFrames(ms) {
        const start = performance.now();
        let previous;
        function frame(now) {
          if (previous !== undefined) durations.push(now - previous);
          previous = now;
          if (now - start < ms) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      },
    };
  }, { instrumentRaf: process.env.INSTRUMENT_RAF === '1' });
}

async function openPage(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await observePage(page);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]));
  await page.waitForTimeout(800);
  return { page, errors, status: response?.status() };
}

async function snapshot(locator) {
  return locator.evaluate((node, keys) => {
    const pick = (element, pseudo) => {
      const style = getComputedStyle(element, pseudo);
      return Object.fromEntries(keys.map(key => [key, style[key]]));
    };
    const rect = node.getBoundingClientRect().toJSON();
    const active = node.matches(':focus-visible');
    const attributes = Object.fromEntries(['aria-pressed','aria-expanded','aria-selected','aria-disabled','disabled']
      .map(key => [key, node.getAttribute(key)]));
    const variables = Object.fromEntries([...node.style].filter(name => name.startsWith('--'))
      .map(name => [name, node.style.getPropertyValue(name)]));
    return {
      rect, active, attributes, variables,
      element: pick(node), before: pick(node, '::before'), after: pick(node, '::after'),
      children: [...node.children].slice(0, 3).map(child => pick(child)),
      animations: node.getAnimations({ subtree: false }).map(animation => ({
        timing: animation.effect.getTiming(), frames: animation.effect.getKeyframes(),
      })),
    };
  }, properties);
}

async function scheduleSample(locator, eventName) {
  await locator.evaluate((node, { eventName, samples }) => {
    window.__hoverParitySequence = new Promise(resolve => {
      const signal = new AbortController();
      const waiting = setTimeout(() => {
        signal.abort();
        resolve({ error: eventName + ' non reçu' });
      }, 4000);
      node.addEventListener(eventName, () => {
        clearTimeout(waiting);
        const start = performance.now();
        const sequence = [];
        function sample() {
          const elapsed = performance.now() - start;
          const requested = samples[sequence.length];
          if (elapsed >= requested) {
            const read = (element, pseudo) => {
              const style = getComputedStyle(element, pseudo);
              return {
                opacity: style.opacity, color: style.color, background: style.backgroundColor,
                border: style.borderColor, shadow: style.boxShadow, transform: style.transform,
                translate: style.translate, scale: style.scale, grid: style.gridTemplateColumns,
                underline: style.textDecorationLine, cursor: style.cursor,
              };
            };
            sequence.push({
              requested, elapsed, bounds: node.getBoundingClientRect().toJSON(),
              state: read(node), before: read(node, '::before'), after: read(node, '::after'),
              children: [...node.children].slice(0, 3).map(child => read(child)),
            });
          }
          if (sequence.length < samples.length) requestAnimationFrame(sample);
          else resolve(sequence);
        }
        sample();
      }, { signal: signal.signal, once: true });
    });
  }, { eventName, samples });
}

async function pointerLocations(locator) {
  return locator.evaluate(node => {
    const r = node.getBoundingClientRect();
    for (const y of [.5, .1, .25, .75, .9]) {
      for (const x of [.5, .25, .75, .1, .9]) {
        const point = [r.x + r.width * x, r.y + r.height * y];
        if (!node.contains(document.elementFromPoint(...point))) continue;
        const away = [[1, innerHeight - 1],[innerWidth - 1, innerHeight - 1],[1, 1],[innerWidth - 1, 1]]
          .find(candidate => !node.contains(document.elementFromPoint(...candidate)));
        if (away) return { point, away, relative: [x,y] };
      }
    }
    return null;
  });
}

async function captureCase(session, selector, name) {
  const { page } = session;
  const locator = page.locator(selector).first();
  try {
    await locator.waitFor({ state: 'visible', timeout: 5500 });
    await locator.evaluate(node => node.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await page.waitForTimeout(600);
    const positions = await pointerLocations(locator);
    if (!positions) return { status: 'occluded', observed: await snapshot(locator) };
    await page.mouse.move(...positions.away);
    await page.waitForTimeout(350);
    const shots = {};
    const shot = async state => {
      const file = name + '-' + state + '.png';
      await page.screenshot({ path: path.join(output, file), timeout: 12000 });
      shots[state] = file;
    };
    const idle = await snapshot(locator);
    await shot('idle');
    await scheduleSample(locator, 'pointerenter');
    await page.mouse.move(...positions.point);
    const entering = await page.evaluate(() => window.__hoverParitySequence);
    const hover = await snapshot(locator);
    await shot('hover');
    await page.mouse.down();
    await page.waitForTimeout(80);
    const pressed = await snapshot(locator);
    await shot('pressed');
    await scheduleSample(locator, 'pointerleave');
    await page.mouse.move(...positions.away);
    await page.mouse.up();
    const leaving = await page.evaluate(() => window.__hoverParitySequence);
    const returned = await snapshot(locator);
    await page.keyboard.press('Tab');
    const focus = await locator.evaluate(node => {
      if (!node.matches('a[href], button, input, [tabindex]')) return false;
      node.focus({ preventScroll: true });
      return document.activeElement === node && node.matches(':focus-visible');
    });
    const keyboard = focus ? await snapshot(locator) : null;
    if (keyboard) await shot('focus');
    await locator.evaluate(node => node.blur());
    return { status: 'captured', relativePointer: positions.relative, idle, entering, hover, pressed, leaving, returned, keyboard, shots };
  } catch (error) {
    await page.mouse.up().catch(() => {});
    return { status: 'error', error: error.message.split('\n')[0] };
  }
}

function compare(a, b) {
  const delta = (x, y) => y - x;
  const displacement = ({ idle, hover }) => Math.hypot(hover.rect.x - idle.rect.x, hover.rect.y - idle.rect.y);
  const color = value => value.match(/^rgb\((\d+), (\d+), (\d+)\)$/)?.slice(1).map(Number);
  const channelDelta = (left, right) => {
    const x = color(left), y = color(right);
    return x && y ? Math.max(...x.map((value, index) => Math.abs(value - y[index]))) : null;
  };
  const height = delta(a.idle.rect.height, b.idle.rect.height);
  const movement = delta(displacement(a), displacement(b));
  const duration = delta(parseFloat(a.idle.element.transitionDuration), parseFloat(b.idle.element.transitionDuration)) * 1000;
  return {
    height, movement, duration, heightWithinTolerance: Math.abs(height) <= tolerance.heightPx,
    movementWithinTolerance: Math.abs(movement) <= tolerance.movementPx,
    durationWithinTolerance: Math.abs(duration) <= tolerance.durationMs,
    idleBackgroundChannelDelta: channelDelta(a.idle.element.backgroundColor, b.idle.element.backgroundColor),
    hoverBackgroundChannelDelta: channelDelta(a.hover.element.backgroundColor, b.hover.element.backgroundColor),
    exact: properties.filter(key => ['idle','hover','pressed','returned']
      .every(state => a[state].element[key] === b[state].element[key])),
  };
}

async function visualOverlay(page, a, b, name) {
  if (!a.shots?.hover || !b.shots?.hover) return;
  const read = async file => (await fs.readFile(path.join(output, file))).toString('base64');
  const layers = await Promise.all([read(a.shots.hover), read(b.shots.hover)]);
  const { data, changed, average } = await page.evaluate(async ({ layers, boxes }) => {
    const bitmaps = await Promise.all(layers.map(base64 => createImageBitmap(
      new Blob([Uint8Array.from(atob(base64), char => char.charCodeAt(0))], { type: 'image/png' }))));
    // Compare identical pixel coordinates around each control, centered without scaling.
    const w = Math.min(...boxes.map(box => Math.floor(box.width)));
    const h = Math.min(...boxes.map(box => Math.floor(box.height)));
    if (w < 1 || h < 1) return { data: null };
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const draw = index => {
      const box = boxes[index];
      context.drawImage(bitmaps[index], Math.round(box.x + (box.width - w) / 2),
        Math.round(box.y + (box.height - h) / 2), w, h, 0, 0, w, h);
    };
    draw(0);
    const first = context.getImageData(0, 0, w, h).data;
    draw(1);
    const second = context.getImageData(0, 0, w, h).data;
    let sum = 0;
    let above = 0;
    for (let i = 0; i < first.length; i += 4) {
      const differences = [0, 1, 2].map(channel => Math.abs(first[i + channel] - second[i + channel]));
      sum += differences.reduce((a, b) => a + b, 0);
      if (Math.max(...differences) > 24) above++;
    }
    context.globalAlpha = .5;
    draw(0);
    return { data: canvas.toDataURL().split(',')[1], changed: above / (w * h), average: sum / (w * h * 3) };
  }, { layers, boxes: [a.hover.rect, b.hover.rect] });
  if (!data) return;
  const file = name + '-overlay.png';
  await fs.writeFile(path.join(output, file), Buffer.from(data, 'base64'));
  return { file, changedAt24: changed, averageChannelDifference: average };
}

async function sessionMetrics({ page, status, errors }) {
  return {
    status, errors,
    ...(await page.evaluate(() => {
      const { durations, entries, contexts, recurringFrameCallbacks } = window.__hoverParity;
      const ordered = durations.toSorted((a, b) => a - b);
      const mean = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
      const quantile = p => ordered[Math.max(0, Math.ceil(ordered.length * p) - 1)] ?? null;
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        url: location.href, scroll: scrollY, contexts,
        fps: mean ? 1000 / mean : null, mean, p95: quantile(.95), p99: quantile(.99), frames: durations.length,
        longTasks: entries.longtask.map(task => task.duration),
        input: entries.event.map(event => ({ name: event.name, duration: event.duration })),
        layoutShifts: entries['layout-shift'].filter(shift => !shift.hadRecentInput).map(shift => shift.value),
        resources: performance.getEntriesByType('resource').length,
        transferBytes: performance.getEntriesByType('resource').reduce((total, resource) => total + resource.transferSize, 0),
        domContentLoaded: navigation?.domContentLoadedEventEnd,
        heap: performance.memory?.usedJSHeapSize,
        recurringFrameCallbacks,
      };
    })),
  };
}

async function traceWindow(page, action) {
  if (engine !== 'chromium') {
    await action();
    return null;
  }
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Performance.enable');
    const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics
      .map(({ name, value }) => [name, value]));
    const before = await read();
    await action();
    const after = await read();
    const counters = {};
    for (const root of ['document','window']) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: root, objectGroup: 'hover-parity' });
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      counters[root] = listeners.filter(listener => listener.type === 'pointermove').length;
    }
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'hover-parity' });
    return {
      layoutMs: 1000 * (after.LayoutDuration - before.LayoutDuration),
      recalcStyleMs: 1000 * (after.RecalcStyleDuration - before.RecalcStyleDuration),
      scriptMs: 1000 * (after.ScriptDuration - before.ScriptDuration),
      taskMs: 1000 * (after.TaskDuration - before.TaskDuration),
      directPointerMoveListeners: counters,
    };
  } finally {
    await cdp.detach();
  }
}

async function menuAndSearch(page, label) {
  const toggle = page.locator('#cv-chapters-toggle');
  if (!await toggle.count()) return { status: 'absent' };
  const read = () => page.evaluate(() => ({
    menu: document.querySelector('#cv-chapters-toggle').getAttribute('aria-expanded'),
    search: document.querySelector('#desktop-search-button').getAttribute('aria-expanded'),
    active: document.activeElement?.id,
    cursor: getComputedStyle(document.querySelector('#desktop-search-input')).cursor,
    results: document.querySelectorAll('.cv-search-results a').length,
    hrefs: [...document.querySelectorAll('#cv-header-chapters a')].map(a => a.getAttribute('href')),
    expected: [...document.querySelectorAll('#hero .hero-nav-link')].map(a => a.getAttribute('href')),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }));
  const states = { initial: await read() };
  await toggle.click({ timeout: 6000 });
  await page.waitForTimeout(330);
  states.open = await read();
  await page.screenshot({ path: path.join(output, 'target-' + label + '-menu-open.png') });
  await page.keyboard.press('Escape');
  states.closed = await read();
  await page.locator('#desktop-search-button').click({ timeout: 6000 });
  await page.locator('#desktop-search-input').fill('Power', { timeout: 6000 });
  await page.waitForTimeout(330);
  states.search = await read();
  await page.screenshot({ path: path.join(output, 'target-' + label + '-search-open.png') });
  await page.keyboard.press('Escape');
  states.searchClosed = await read();
  const passed = states.open.menu === 'true' && states.closed.menu === 'false'
    && states.closed.active === 'cv-chapters-toggle' && states.search.search === 'true'
    && states.search.results > 0 && states.searchClosed.search === 'false'
    && states.searchClosed.active === 'desktop-search-button'
    && states.initial.hrefs.length === 11
    && JSON.stringify(states.initial.hrefs) === JSON.stringify(states.initial.expected)
    && !states.open.horizontalOverflow && !states.search.horizontalOverflow;
  return { status: passed ? 'passed' : 'failed', states };
}

try {
  if (engine === 'chromium') {
    const cdp = await browser.newBrowserCDPSession();
    const { gpu } = await cdp.send('SystemInfo.getInfo');
    report.gpu = {
      renderer: gpu.auxAttributes?.glRenderer,
      webgl: gpu.featureStatus?.webgl, webgpu: gpu.featureStatus?.webgpu,
    };
    await cdp.detach();
  }
  const options = { viewport, serviceWorkers: 'block' };
  if (process.env.VIDEO === '1') options.recordVideo = { dir: path.join(output, 'video'), size: viewport };
  const contexts = {
    reference: await browser.newContext(options),
    target: await browser.newContext(options),
  };
  await overlay(contexts.target);
  const sessions = new Map();
  async function getSession(side, url) {
    const key = side + ' ' + url;
    if (!sessions.has(key)) sessions.set(key, await openPage(contexts[side], url));
    return sessions.get(key);
  }

  if (process.env.SCENARIOS_ONLY !== '1') {
    for (const profile of profiles) {
      if (requestedCases.size && !requestedCases.has(profile.id)) continue;
      const source = await getSession('reference', reference);
      const dest = await getSession('target', profile.targetPath ? new URL(profile.targetPath, target).href : target);
      const left = await captureCase(source, profile.reference, profile.id + '-reference');
      const right = await captureCase(dest, profile.target, profile.id + '-target');
      const comparison = left.status === 'captured' && right.status === 'captured'
        ? compare(left, right) : null;
      if (comparison && ['contact', 'search', 'menu', 'chapter'].includes(profile.id)) {
        comparison.overlay = await visualOverlay(dest.page, left, right, profile.id);
      }
      report.cases.push({ profile, reference: left, target: right, comparison });
      console.log(profile.id, left.status, right.status);
    }
  }

  if (process.env.INTERACTION !== '0') {
    for (const [label, profile] of [
      ['desktop', options],
      ['reduced', { ...options, reducedMotion: 'reduce' }],
      ['touch', { ...options, viewport: { width: 390, height: 844 }, hasTouch: true, ...(engine !== 'firefox' ? { isMobile: true } : {}) }],
    ]) {
      const context = await browser.newContext(profile);
      await overlay(context);
      try {
        const session = await openPage(context, target);
        const outcome = await menuAndSearch(session.page, label);
        await session.page.waitForTimeout(330);
        const file = path.join(output, 'target-' + label + '.png');
        await session.page.screenshot({ path: file });
        report.sessions[label] = { outcome, errors: session.errors };
        console.log(label, outcome.status, session.errors.length, 'page errors');
      } catch (error) {
        report.sessions[label] = { outcome: { status: 'error', error: error.message.split('\n')[0] } };
        console.log(label, report.sessions[label]);
      }
      await context.close();
    }
  }

  for (const [side, url] of [['reference', reference], ['target', target]]) {
    try {
      const session = await getSession(side, url);
      await session.page.bringToFront();
      await session.page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await session.page.waitForTimeout(500);
      const trace = await traceWindow(session.page, async () => {
        await session.page.evaluate(() => window.__hoverParity.measureFrames(1800));
        await session.page.mouse.move(width * .7, height * .4);
        await session.page.mouse.wheel(0, 815);
        await session.page.waitForTimeout(1900);
      });
      report.sessions[side] = { ...(await sessionMetrics(session)), trace };
    } catch (error) {
      report.sessions[side] = { error: error.message.split('\n')[0] };
    }
  }

  await Promise.all(Object.values(contexts).map(context => context.close()));
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
if (Object.values(report.sessions).some(session => ['failed','error'].includes(session.outcome?.status))) process.exitCode = 1;
