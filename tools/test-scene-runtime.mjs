import { assertLightRoomVisible } from './check-render-visibility.mjs';
import { sceneTestProfile } from './scene-test-profile.mjs';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_PACKAGE
  ? pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = process.env.SCENE_TEST_OUTPUT || path.join(root, 'test-results');
await mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE,
  args: ['--enable-webgl', `--use-angle=${process.env.SCENE_WEBGL_BACKEND || 'swiftshader'}`, '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:.5 });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    const errors = [];
    const missingResources = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text());
      if (message.type() === 'warning' && message.text().startsWith('[Native]')) console.log(message.text());
    });
    page.on('response', (response) => { if (response.status() >= 400) missingResources.push(response.url()); });
    // Serve the real repository through intercepted requests: no external host,
    // live user profile, or network listener is needed for this regression test.
    await context.route('http://scene.test/**', async (route) => {
      const url = new URL(route.request().url());
      const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!filename.startsWith(root)) return route.fulfill({ status: 403 });
      try {
        const body = await readFile(filename);
        await route.fulfill({ body, contentType: types[path.extname(filename)] || 'application/octet-stream' });
      } catch {
        await route.fulfill({ status: 404, body: url.pathname });
      }
    });
    await page.goto('http://scene.test/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('room')?.dataset.sceneReady === 'true', null, { timeout: 60000 });
    // Pause autonomous destinations before loading can place the actor mid-route.
    // Keep the render loop active at a bounded software-test resolution.
    await page.evaluate(() => { const r=window.room; r.pauseAutonomy(600000); r.opts.noAdapt=true; r.renderer.setPixelRatio(.5); for(const st of Object.values(r.stations)) st.maxMs=300000; });
    try {
      await page.waitForFunction(() => document.getElementById('room')?.dataset.native === 'ready', null, { timeout: 60000 });
    } catch (error) {
      console.log(await page.evaluate(() => {
        const api = document.querySelector('iframe')?.contentWindow.shupiHeader?.scene;
        const scene = api?.shupi.scene;
        return { bridge: document.getElementById('room').dataset.native, api: Object.keys(api || {}),
          desk: ['Standing desk', 'Fractal North chalk white PC', 'Ceramic coffee mug', 'Apple Studio Display',
            'Logitech MX Keys keyboard', 'Logitech MX Master 4 mouse', 'Nommo left speaker', 'Nommo right speaker']
            .map(name => { const object = scene?.getObjectByName(name); return { name, visible: object?.visible,
              scale: object?.scale.toArray(), position: object?.position.toArray() }; }) };
      }));
      throw error;
    }
    await sceneTestProfile(page);
    const state = () => page.evaluate(() => ({
      frames: Number(document.getElementById('room').dataset.sceneFrames),
      bridge: document.getElementById('room').dataset.native,
      hero: window.room.hero.group.visible,
      position: window.room.hero.group.position.toArray(),
      mode: window.room.director.mode,
    }));
    const before = await state();
    await page.waitForTimeout(2000);
    const after = await state();
    const deskBounds = await page.evaluate(() => window.room.bbox('desk'));
    assert.ok(deskBounds[1].every((max, i) => max - deskBounds[0][i] < 4), 'Imported desk must retain its physical size');
    assert.ok(await page.evaluate(() => {
      return ['GamingLandscapeMonitor','GamingPortraitMonitor','GamingMonitorArms','GamingDeskMat','Moonlander','LogitechMXMaster2S'].every(name=>{
        const object=window.room.scene.getObjectByName(name);let meshes=0;
        object?.traverse(child=>{if(child.isMesh)meshes++;});return object?.visible&&meshes>0;
      });
    }), 'The customized desk equipment must remain visible after native loading');
    assert.ok(after.frames > before.frames + 5, 'Rendering must continue after the iframe loads');
    assert.ok(after.hero, 'Character must appear');
    await page.screenshot({ path: path.join(output, `scene-${viewport.width}.png`) });
    await assertLightRoomVisible(path.join(output, `scene-${viewport.width}.png`));
    assert.deepEqual(errors, [], 'Scene must render without runtime/console errors');

    // Exercise the existing sofa interaction and verify the moving controller.
    if (viewport.width === 1440) {
      const padHome = await page.evaluate(() => window.room.retro.pad.position.toArray());
      await page.evaluate(() => { window.room.pauseAutonomy(600000); window.room.goTo('sofa'); });
      try {
        // A CPU-only runner advances the capped simulation clock slowly.
        // Still require the complete real route and the authored activity.
        await page.waitForFunction(() => window.room.director.mode === 'activity' &&
          window.room.director.current === window.room.stations.sofa, null, {
            timeout: (process.env.SCENE_WEBGL_BACKEND || 'swiftshader') === 'swiftshader' ? 360000 : 180000,
          });
      } catch(error) {
        const failure=await page.evaluate(()=>{const r=window.room;return {frames:document.getElementById('room').dataset.sceneFrames,mode:r.director.mode,position:r.hero.group.position.toArray(),current:r.director.current?.label,approach:r.stations.sofa.approach};});
        await writeFile(path.join(output,'sofa-route-failure.json'),JSON.stringify(failure,null,2));console.error('SOFA_ROUTE_FAILURE',JSON.stringify(failure));throw error;
      }
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(output, 'scene-sofa.png') });
      assert.ok(await page.evaluate(() => {
        const { retro, hero } = window.room;
        const left = hero.bones.hand_l.getWorldPosition(hero.group.position.clone());
        const right = hero.bones.hand_r.getWorldPosition(left.clone());
        const center = left.add(right).multiplyScalar(0.5); center.y -= 0.012;
        const pad = retro.pad.getWorldPosition(center.clone());
        return retro.padHeld && pad.distanceTo(center) < 0.08;
      }), 'The controller must be held between the hands');
      await page.evaluate(() => window.room.leave());
      await page.waitForFunction(home => {
        const { retro } = window.room;
        return !retro.padHeld && retro.pad.position.distanceTo(retro.pad.position.clone().fromArray(home)) < 0.01;
      }, padHome, { timeout: 30000 });

      // A future incompatible optional mesh must restore the local desk and keep
      // advancing frames, instead of stranding the initial carpet frame.
      const firstFrame = after.frames;
      await page.evaluate(() => {
        const effects = window.room.scene.getObjectByName('NativeMotionEffects');
        let template;
        window.room.scene.getObjectByName('GamingLandscapeMonitor').traverse(object => {
          if (!template && object.isMesh) template = object;
        });
        // Inject a deterministic render failure. Foreign typed arrays can be
        // accepted by newer Chromium versions and no longer trigger an error.
        const probe = template.clone();
        probe.name = 'OptionalMeshFailureProbe';
        probe.visible = true;
        probe.frustumCulled = false;
        probe.onBeforeRender = () => { throw new TypeError('Simulated optional mesh incompatibility'); };
        effects.add(probe);
      });
      await page.waitForFunction(() => document.getElementById('room').dataset.native === 'fallback');
      await page.waitForTimeout(1000);
      const fallback = await state();
      assert.ok(fallback.frames > firstFrame, 'Local rendering must recover from an optional mesh failure');
      assert.deepEqual(errors, [], 'Recovery must avoid uncaught runtime errors');
      results.push({ viewport, before, after, sofa: true, fallback, missingResources });
    } else results.push({ viewport, before, after, missingResources });
    await context.close();
  }
  await writeFile(path.join(output, 'runtime-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
