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
  args: ['--enable-webgl', '--use-angle=d3d11', '--enable-unsafe-swiftshader'] });

const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light'});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.text().slice(0,220))});
await context.addInitScript(()=>{window.audioEvidence=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const b=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<b.length;i+=64)peak=Math.max(peak,Math.abs(b[i]));window.audioEvidence.push({peak,state:this.context.state});}return original.apply(this,args);};});
    await context.route('http://scene.test/**', async (route) => {
      const url = new URL(route.request().url());
      const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!filename.startsWith(root)) return route.fulfill({ status: 403 });
      try {
        let body = await readFile(filename);if(filename.endsWith('project-dioramas.js'))body=Buffer.from(body.toString().replace('controls.update();renderer.render(scene,camera);','window.__processModel=model;controls.update();renderer.render(scene,camera);'));
        await route.fulfill({ body, contentType: types[path.extname(filename)] || 'application/octet-stream' });
      } catch {
        await route.fulfill({ status: 404, body: url.pathname });
      }
    });

await page.goto('http://scene.test/');await page.waitForFunction(()=>document.getElementById('room')?.dataset.native==='ready',null,{timeout:180000});await page.evaluate(()=>{const r=window.room;r.pauseAutonomy(3600000);r.opts.noAdapt=true;for(const s of Object.values(r.stations))s.maxMs=300000;});

const evidence={};for(const view of ['room','projects']){if(view==='projects')await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.waitForTimeout(1800);evidence[view]=await page.evaluate(async()=>{const samples=[];let last=performance.now();await new Promise(done=>{function frame(t){samples.push(t-last);last=t;if(samples.length<120)requestAnimationFrame(frame);else done();}requestAnimationFrame(frame);});samples.sort((a,b)=>a-b);const r=window.room;return {median:samples[60],p95:samples[114],calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,frames:document.querySelector('#room').dataset.sceneFrames,heaviest:(()=>{const a=[];r.scene.traverse(o=>{if(o.isMesh&&o.visible){const tri=(o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3;a.push({name:o.name||o.parent?.name,tri,skin:o.isSkinnedMesh});}});return a.sort((a,b)=>b.tri-a.tri).slice(0,12);})()};});}await writeFile(path.join(output,'performance.json'),JSON.stringify(evidence,null,2));console.log(evidence);await browser.close();
