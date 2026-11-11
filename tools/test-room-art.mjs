import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] || 'test-results/room-art');
const baseline = process.argv[3];
const source = process.env.ROOM_ART_SOURCE;
const engine = process.env.ROOM_ART_ENGINE || 'chromium';
const smoke = engine !== 'chromium';
const homeOnly = process.env.ROOM_ART_HOME_ONLY === '1';
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};
const fixture = '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Ma pièce – contrôle de rendu</title>'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<style>body{margin:0;background:#eeede9}#room{position:relative;width:100vw;height:100vh;overflow:hidden}'
  + '#room>button,#room>div,body>.scene-controls{position:absolute;z-index:2}'
  + '#room>.room-navigation{top:20px;left:20px}#room>.room-zoom{top:68px;left:20px}'
  + '#room>.scene-controls{bottom:20px;left:20px}#room>.room-camera{top:106px;left:20px}#room button svg{width:16px;height:16px}</style>'
  + '<script type="importmap">{"imports":{"three":"/vendor/three.module.min.js","three/addons/":"/vendor/"}}</script>'
  + '<div id="room"><div class="bubble"></div></div><script type="module">'
  + 'import {createRoom} from "/js/room.js"; import * as THREE from "three"; window.THREE=THREE;'
  + 'performance.mark("room-start"); try { window.room=await createRoom(document.querySelector("#room"),document.querySelector(".bubble")); } catch (error) { window.roomBootError=error.stack; console.error(error.stack); throw error; }'
  + 'window.room.pauseAutonomy(600000); window.room.opts.noAdapt=true; performance.mark("room-created");'
  + '</script></html>';

await mkdir(output, { recursive: true });
const base = 'http://room.test';
async function serve(context) {
  await context.route(/^https?:\/\//, route => route.abort());
  await context.route(base + '/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/_room-review') {
      await route.fulfill({ body: fixture, contentType: 'text/html' });
      return;
    }
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    let file = resolve(root, '.' + pathname);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
      await route.fulfill({ status: 403 });
      return;
    }
    try {
      if (!extname(file)) {
        const isFolder = await stat(file).then(info => info.isDirectory(), () => false);
        file = isFolder ? resolve(file, 'index.html') : file + '.html';
      }
      const relative = file.slice(root.length).replace(/^[/\\]/, '');
      const body = source
        ? await readFile(resolve(source, relative)).catch(() => readFile(file))
        : await readFile(file);
      await route.fulfill({ body, contentType: types[extname(file)] || 'application/octet-stream' });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
}
const args = ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
if (process.env.SCENE_WEBGL_BACKEND) args.push('--use-angle=' + process.env.SCENE_WEBGL_BACKEND);
let browser;
const result = {};
const initial = baseline ? JSON.parse(await readFile(baseline, 'utf8')) : null;

try {
  browser = await { chromium, firefox, webkit }[engine].launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE,
    headless: true,
    args: smoke ? [] : args,
  });
  for (const [profile, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  })) {
    if (homeOnly || smoke && profile === 'mobile') continue;
    const context = await browser.newContext({ viewport, isMobile: profile === 'mobile', hasTouch: profile === 'mobile' });
    await serve(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    const assets = new Map();
    page.on('response', response => {
      const u = new URL(response.url());
      if (u.origin === base && response.ok() && /\/(?:assets|shupi|js|vendor)\//.test(u.pathname)) {
        assets.set(u.pathname, Number(response.headers()['content-length']) || 0);
      }
    });
    await page.goto(base + '/_room-review', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.roomBootError ||
      window.room && document.querySelector('#room').dataset.sceneReady === 'true', null, { timeout: 50_000 });
    const bootError = await page.evaluate(() => window.roomBootError);
    assert.equal(bootError, undefined, bootError);
    const usableMs = await page.evaluate(() => performance.now() - performance.getEntriesByName('room-start')[0].startTime);
    await page.waitForFunction(() => {
      const data = document.querySelector('#room').dataset;
      return data.detailProps === 'ready' && ['ready', 'fallback'].includes(data.native)
        && window.room.foliage.gardenTrees.every(tree => tree.children.length > 0);
    }, null, { timeout: 90_000 });
    await page.evaluate(() => {
      const r = window.room;
      r.wx.set('clair', 600000);
      r.setCameraMode('free');
    });
    const performanceInfo = await page.evaluate(async () => {
      const { renderer } = window.room;
      const gl = renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const frames = [];
      const longTasks = [];
      const observer = PerformanceObserver.supportedEntryTypes.includes('longtask')
        ? new PerformanceObserver(list => longTasks.push(...list.getEntries().map(entry => entry.duration))) : null;
      observer?.observe({ type: 'longtask' });
      const render = renderer.render;
      let last = 0;
      const durations = [];
      renderer.render = function (...args) {
        const now = performance.now();
        if (last) frames.push(now - last);
        last = now;
        render.apply(this, args);
        durations.push(performance.now() - now);
      };
      await new Promise(done => setTimeout(done, 3500));
      renderer.render = render;
      observer?.disconnect();
      const percentile = (values, p) => {
        const sorted = values.slice().sort((a, b) => a - b);
        return sorted[Math.floor((sorted.length - 1) * p)] ?? null;
      };
      return {
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        samples: frames.length,
        frameMedianMs: percentile(frames, .5), frameP95Ms: percentile(frames, .95),
        renderCpuMedianMs: percentile(durations, .5), longTasks,
        ...renderer.info.render, ...renderer.info.memory, width: gl.drawingBufferWidth, height: gl.drawingBufferHeight,
      };
    });
    const inventory = await page.evaluate(() => {
      const { scene, hero, nav, stations } = window.room;
      const nodes = [];
      const round = a => a.map(v => Number(v.toFixed(5)) || 0);
      const visit = (object, key, visible, owner) => {
        visible &&= object.visible;
        owner = object.userData.id || owner;
        const geometry = object.geometry;
        const list = object.material ? [object.material].flat() : [];
        nodes.push({
          key, type: object.type, name: object.name || undefined, id: object.userData.id, owner,
          authored: object.userData.roomRemaster || undefined,
          position: round(object.position.toArray()), rotation: round(object.quaternion.toArray()),
          scale: round(object.scale.toArray()), visible,
          mesh: geometry ? {
            elements: geometry.index?.count ?? geometry.attributes.position?.count,
            count: object.count, castShadow: object.castShadow, receiveShadow: object.receiveShadow,
            materials: list.map(m => ({ name: m.name, type: m.type, texture: Boolean(m.map) })),
          } : undefined,
          clips: object.animations.length ? object.animations.map(clip => clip.name) : undefined,
          dynamic: object.userData.dynamic || undefined,
        });
        const seen = new Map();
        for (const child of object.children) {
          const token = child.userData.id || child.name || child.type;
          const index = seen.get(token) || 0;
          seen.set(token, index + 1);
          visit(child, key + '/' + token + ':' + index, visible, owner);
        }
      };
      visit(scene, 'room', true);
      return {
        native: document.querySelector('#room').dataset.native,
        ids: [...new Set(nodes.flatMap(o => o.id ? [o.id] : []))].sort(),
        stations: Object.fromEntries(Object.entries(stations).map(([key, st]) => [key, {
          position: round(st.pos), approach: round(st.approach), yaw: st.yaw, label: st.label,
          clip: st.clip, nativeMode: st.nativeMode, ritual: st.ritual,
        }])),
        nav: Object.keys(nav).sort(), heroVisible: hero.group.visible, nodes,
      };
    });
    assert.ok(inventory.heroVisible);
    for (const id of ['desk', 'usm', 'bonsai', 'olivetti', 'mamiya', 'buddha', 'stele']) {
      assert.ok(inventory.ids.includes(id), profile + ' missing ' + id);
    }
    if (initial) {
      const previous = initial[profile].inventory;
      assert.equal(inventory.native, previous.native, profile + ' Native bridge');
      assert.deepEqual(inventory.ids, previous.ids, profile + ' interaction IDs');
      assert.deepEqual(JSON.parse(JSON.stringify(inventory.stations)), previous.stations, profile + ' activity anchors');
      assert.deepEqual(inventory.nav, previous.nav, profile + ' navigation interface');
      const authored = inventory.nodes.filter(node => node.visible && node.mesh && node.authored);
      assert.ok(authored.length >= 19, profile + ' authored visual coverage');
      assert.ok(inventory.nodes.some(node => node.visible && node.name === 'MathieuMesh-v2'), profile + ' rebuilt character');
      for (const id of previous.ids) {
        const wasVisible = previous.nodes.some(node => node.id === id && node.visible);
        if (wasVisible) assert.ok(inventory.nodes.some(node => node.id === id && node.visible), profile + ' active anchor ' + id);
      }
    }
    const controls = await page.evaluate(() => {
      const room = window.room;
      const host = document.querySelector('#room');
      const initial = room.wx.type;
      host.parentElement.querySelector('.weather-btn, [aria-label^="Météo"]').click();
      const weather = room.wx.type !== initial;
      host.querySelector('.room-zoom-in').click();
      const zoom = room.view.tZoom > 1;
      room.view.tZoom = 1;
      const lamp = room.lamps.arc;
      const before = lamp.on;
      room.activate('arc');
      const lighting = lamp.on !== before;
      room.activate('arc');
      const desk = Boolean(room.deskEquipment && room.stations.desk);
      room.wx.set('clair', 600000);
      return { weather, zoom, lighting, desk };
    });
    assert.ok(Object.values(controls).every(Boolean), JSON.stringify(controls));

    if (profile === 'desktop' && !smoke) {
      await page.evaluate(() => document.dispatchEvent(new CustomEvent('project-workshop', { detail: { open: true } })));
      await page.locator('#room > :not(canvas)').evaluateAll(nodes => nodes.forEach(node => { node.style.visibility = 'hidden'; }));
      for (const [name, target, span] of [
        ['ensemble', [-.65, .65, 1.1], 6.8],
        ['bureau', [-3.02, .63, .36], 1.63],
        ['audio', [-.78, .69, -2.20], 1.87],
        ['salon', [1.0, .51, 2.85], 2.16],
        ['personnels', [2.55, .85, 1.68], 1.25],
        ['vegetation', [-2.90, .80, 3.23], 1.42],
        ['chashitsu', [-5.45, .68, 7.54], 2.35],
        ['jardin', [-5.45, 1.1, 9.45], 3.18],
      ]) {
        await page.evaluate(({ name, target, span }) => {
          const { camera, renderer, scene, cs, wx } = window.room;
          if (name === 'jardin') {
            cs.setPanels(1);
            cs.setRoofFade(.3);
            cs.update(1.1, 2, false, wx.k);
          }
          const center = new THREE.Vector3(...target);
          const distance = new THREE.Vector3(7, 5.8, 9);
          camera.position.copy(center).add(distance);
          camera.lookAt(center);
          camera.top = span; camera.bottom = -span;
          camera.left = -span * 1.6; camera.right = span * 1.6;
          camera.updateProjectionMatrix();
          renderer.setSize(1440, 900, false);
          renderer.shadowMap.needsUpdate = true;
          const gl = renderer.getContext();
          renderer.render(scene, camera);
          const canvas = renderer.domElement;
          let display = document.querySelector('#room-proof');
          if (!display) {
            display = document.createElement('img');
            display.id = 'room-proof';
            display.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
            canvas.after(display);
          }
          display.src = canvas.toDataURL();
          gl.finish();
        }, { name, target, span });
        await page.locator('#room-proof').evaluate(image => image.decode());
        await page.screenshot({ path: resolve(output, name + '.png') });
      }
    }
    const resources = [...assets.keys()].sort();
    result[profile] = { viewport, usableMs, performanceInfo, controls, errors, resources, inventory,
      assetBytes: [...assets.values()].reduce((a, b) => a + b, 0) };
    console.log(profile, JSON.stringify({ usableMs, ...performanceInfo, nodes: inventory.nodes.length, native: inventory.native, controls }));
    if (initial && !smoke) {
      // App interactions run after the visual snapshot, with the render loop resumed.
      await page.evaluate(() => {
        document.querySelector('#room-proof')?.remove();
        document.querySelectorAll('#room > :not(canvas)').forEach(node => { node.style.visibility = ''; });
        document.dispatchEvent(new CustomEvent('project-workshop', { detail: { open: false } }));
      });
      const interactions = await page.evaluate(() => {
        const r = window.room;
        const powered = r.deskEquipment.powered;
        r.activate('deskstrip');
        const deskPower = r.deskEquipment.powered !== powered;
        r.activate('deskstrip');
        const opened = r.crate.isOpen;
        r.activate('usm');
        const musicDrawer = r.crate.isOpen !== opened;
        r.activate('usm');
        const shoji = r.cs.panels[0].target;
        r.activate('shoji0');
        const tea = r.cs.panels[0].target !== shoji;
        r.activate('shoji0');
        r.retro.setStrip(true);
        const ps = r.retro.state;
        r.activate('ps1power');
        const consolePower = r.retro.state !== ps;
        r.retro.powerOff();
        return { deskPower, musicDrawer, tea, consolePower };
      });
      assert.ok(Object.values(interactions).every(Boolean), JSON.stringify(interactions));
      result[profile].interactions = interactions;

      const frame = () => page.locator('#room').getAttribute('data-scene-frames').then(Number);
      const beforePause = await frame();
      await page.evaluate(() => document.dispatchEvent(new CustomEvent('project-workshop', { detail: { open: true } })));
      await page.waitForTimeout(250);
      assert.ok(await frame() - beforePause < 8, 'frame loop paused');
      const paused = await frame();
      await page.evaluate(() => document.dispatchEvent(new CustomEvent('project-workshop', { detail: { open: false } })));
      await page.waitForFunction(previous => Number(document.querySelector('#room').dataset.sceneFrames) > previous + 3, paused);
      result[profile].interactions.resume = true;

      if (profile === 'mobile') {
        const zoomButton = await page.locator('#room .room-zoom-in').boundingBox();
        assert.ok(zoomButton, 'mobile zoom button');
        const oldZoom = await page.evaluate(() => window.room.view.tZoom);
        await page.touchscreen.tap(zoomButton.x + zoomButton.width / 2, zoomButton.y + zoomButton.height / 2);
        assert.ok(await page.evaluate(() => window.room.view.tZoom) > oldZoom, 'touch zoom');
        result[profile].interactions.touchZoom = true;
      } else {
        await page.locator('#room button[data-navigation="rotate"]').click();
        const oldAz = await page.evaluate(() => window.room.view.tAz);
        await page.locator('#room > canvas').focus();
        await page.keyboard.press('ArrowLeft');
        assert.notEqual(await page.evaluate(() => window.room.view.tAz), oldAz, 'keyboard rotation');
        result[profile].interactions.keyboardRotation = true;

        await page.evaluate(() => {
          const r = window.room;
          r.pauseAutonomy(600000);
          r.director.spawn(...r.nav.nearest(-1.6, 1.85), .7);
          r.goTo('alocasia');
        });
        await page.waitForFunction(() => window.room.director.locomoting);
        await page.waitForFunction(() => {
          const r = window.room;
          return r.director.mode === 'activity' && r.director.current === r.stations.alocasia;
        });
        result[profile].interactions.walkAndWater = true;
        await page.evaluate(() => {
          const r = window.room;
          r.leave();
          r.director.spawn(...r.stations.desk.approach, .7);
          r.goTo('desk');
        });
        await page.waitForFunction(() => {
          const r = window.room;
          return r.director.current === r.stations.desk && r.director.mode === 'activity';
        }, null, { timeout: 24_000 });
        result[profile].interactions.deskSeated = await page.evaluate(() => {
          const r = window.room;
          return Number.isFinite(r.hero.hipContactY()) &&
            r.hero.wp('hand_l').distanceTo(r.hero.wp('hand_r')) > .12;
        });
        assert.ok(result[profile].interactions.deskSeated, 'rebuilt character in desk activity');

        await page.evaluate(() => {
          const r = window.room;
          r.leave();
          r.director.spawn(...r.nav.nearest(-3.5, 7.4), .7);
          r.goTo('cha');
        });
        await page.waitForFunction(() => window.room.ritual.state.active && window.room.cs.vista.visible, null, { timeout: 30_000 });
        result[profile].interactions.teaRitual = true;
      }

      if (profile === 'desktop') {
        const lost = await page.evaluate(() => {
          const r = window.room;
          const gl = r.renderer.getContext();
          const extension = gl.getExtension('WEBGL_lose_context');
          if (!extension) return false;
          r.renderer.domElement.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 350), { once: true });
          extension.loseContext();
          return true;
        });
        if (lost) {
          const beforeLoss = await frame();
          await page.waitForTimeout(600);
          await page.waitForFunction(previous => !window.room.renderer.getContext().isContextLost() &&
            Number(document.querySelector('#room').dataset.sceneFrames) > previous + 3, beforeLoss);
          result[profile].interactions.contextRestored = true;
        }
      }
    }
    assert.deepEqual(errors, [], profile + ' uncaught browser errors');
    await context.close();
  }
  const publicPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await serve(publicPage.context());
  let roomFromCheckout = false;
  publicPage.on('response', response => {
    if (response.url().startsWith(base + '/js/room.js?') && response.ok()) roomFromCheckout = true;
  });
  const homeErrors = [];
  publicPage.on('pageerror', error => homeErrors.push(error.message));
  try {
    await publicPage.goto(base, { waitUntil: 'domcontentloaded' });
    await publicPage.locator('[data-cv-room3d]').scrollIntoViewIfNeeded({ timeout: 30000 });
    await publicPage.waitForFunction(() => window.__cvRoom3d?.scene &&
      document.querySelector('[data-cv-room3d]').dataset.sceneReady === 'true',
      null, { timeout: smoke ? 30000 : 90000 });
  } catch (error) {
    result.home = await publicPage.evaluate(() => ({
      ready: document.querySelector('[data-cv-room3d]')?.dataset.sceneReady,
      state: window.__cvTransfer?.room3d,
      errors: window.__cvTransfer?.errors?.slice(0, 12),
    })).catch(() => ({}));
    result.home.error = error.message;
    result.home.pageErrors = homeErrors.slice(0, 12);
    console.error('HOME_DIAGNOSTIC', JSON.stringify(result.home));
    if (!source) throw error;
  }
  if (!result.home?.error) {
    const homeActions = {};
    if (!source && !smoke) {
      await publicPage.waitForFunction(() => {
        const room = window.__cvRoom3d;
        const data = document.querySelector('[data-cv-room3d]').dataset;
        return data.native === 'ready' && room.nativeBridge?.coffeeMug.getObjectByName('Tasse');
      }, null, { timeout: 30_000 });
      const frame = await publicPage.locator('[data-cv-room3d]').getAttribute('data-scene-frames');
      await publicPage.waitForFunction(previous => {
        const data = document.querySelector('[data-cv-room3d]').dataset;
        return data.native === 'ready' && Number(data.sceneFrames) > Number(previous) + 12;
      }, frame);
      homeActions.shoji = await publicPage.evaluate(() => {
        const room = window.__cvRoom3d;
        room.pauseAutonomy(600000);
        return room.cs.panels.map((panel, i) => {
          const before = panel.target;
          room.activate('shoji' + i);
          const toggled = panel.target !== before;
          room.activate('shoji' + i);
          return toggled && panel.target === before;
        });
      });
      assert.deepEqual(homeActions.shoji, [true, true, true]);
      await publicPage.evaluate(() => {
        const room = window.__cvRoom3d;
        room.leave();
        room.director.spawn(...room.stations.desk.approach, .7);
        room.goTo('desk');
      });
      await publicPage.waitForFunction(() => {
        const room = window.__cvRoom3d;
        return room.director.current === room.stations.desk && room.director.mode === 'activity';
      }, null, { timeout: 24_000 });
      const mugPosition = await publicPage.evaluate(() => {
        const room = window.__cvRoom3d;
        room.activate('coffee');
        return room.nativeBridge.coffeeMug.position.toArray();
      });
      await publicPage.waitForFunction(position => {
        const mug = window.__cvRoom3d.nativeBridge.coffeeMug;
        return mug.position.distanceTo(mug.position.clone().fromArray(position)) > .15;
      }, mugPosition);
      await publicPage.waitForFunction(position => {
        const mug = window.__cvRoom3d.nativeBridge.coffeeMug;
        return mug.position.distanceTo(mug.position.clone().fromArray(position)) < .06;
      }, mugPosition);
      homeActions.mugReturned = true;
    }
    result.home = await publicPage.evaluate(() => ({
      ready: document.querySelector('[data-cv-room3d]').dataset.sceneReady,
      detailProps: document.querySelector('[data-cv-room3d]').dataset.detailProps,
      native: document.querySelector('[data-cv-room3d]').dataset.native,
      teaPanels: window.__cvRoom3d.cs.panels.length,
      art: Boolean(window.__cvRoom3d.scene.getObjectByName('MathieuMesh-v2') &&
      window.__cvRoom3d.scene.getObjectByName('Modèle BureauUSM')),
      mode: window.__cvRoom3d.cameraMode,
    }));
    result.home.actions = homeActions;
    if (!source) {
      assert.ok(roomFromCheckout && result.home.art, 'Home loads the room from this checkout');
      assert.ok(result.home.teaPanels > 0, 'Tea room available on current home');
    }
  }
  await publicPage.close();
} finally {
  await writeFile(resolve(output, 'room-scene.json'), JSON.stringify(result, null, 2) + '\n');
  await browser?.close();

}
