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

const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.text().slice(0,220))});
await context.addInitScript(()=>{window.audioEvidence=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const b=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<b.length;i+=64)peak=Math.max(peak,Math.abs(b[i]));window.audioEvidence.push({peak,state:this.context.state});}return original.apply(this,args);};});
    await context.route('http://scene.test/**', async (route) => {
      const url = new URL(route.request().url());
      const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!filename.startsWith(root)) return route.fulfill({ status: 403 });
      try {
        let body = await readFile(filename);if(filename.endsWith('project-dioramas.js'))body=Buffer.from(body.toString().replace('controls.update();','window.__processModel=model;controls.update();'));
        await route.fulfill({ body, contentType: types[path.extname(filename)] || 'application/octet-stream' });
      } catch {
        await route.fulfill({ status: 404, body: url.pathname });
      }
    });

await page.goto('http://scene.test/');await page.waitForFunction(()=>document.getElementById('room')?.dataset.native==='ready',null,{timeout:180000});await page.evaluate(()=>{let r=window.room;r.pauseAutonomy(3600000);r.opts.noAdapt=true;for(const s of Object.values(r.stations))s.maxMs=3600000;});



const result={};await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.locator('#mq-pro [data-project="0"]').nth(1).click();await page.locator('.process-projects [data-project="9"]').click();await page.waitForFunction(()=>document.querySelector('.process-dialog').dataset.loaded==='terrain');
await page.locator('.process-step[data-step="1"]').click();await page.locator('.process-play').click();await page.waitForTimeout(2500);
result.molten=await page.evaluate(()=>{const m=window.__processModel;return {stream:m.getObjectByName('MoltenPourStream').visible,pool:m.getObjectByName('MoltenSteelPool').material.emissiveIntensity,fill:m.getObjectByName('MoltenCastFill').visible,flames:m.children.filter(o=>o.name.startsWith('ForgeFlame')).filter(o=>o.material.opacity>.05).length};});assert.ok(result.molten.stream&&result.molten.pool>1&&result.molten.fill&&result.molten.flames>5);await page.screenshot({path:path.join(output,'molten-casting.png')});
await page.locator('.process-step[data-step="2"]').click();await page.locator('.process-play').click();await page.waitForTimeout(1400);const hammer=[];for(let i=0;i<12;i++){hammer.push(await page.evaluate(()=>window.__processModel.getObjectByName('MachineForgeHammer').position.y));await page.waitForTimeout(100);}console.log('HAMMER_SAMPLES',JSON.stringify(hammer));const hrest=await page.evaluate(()=>{const h=window.__processModel.getObjectByName('MachineForgeHammer');return {rest:h.userData.machineRest.p.toArray(),p:h.position.toArray(),b:window.__processModel.getObjectByName('ActivityRawBillet').position.toArray(),playing:document.querySelector('.process-dialog').dataset.playing};});console.log('HAMMER_STATE',JSON.stringify(hrest));assert.ok(Math.max(...hammer)-Math.min(...hammer)>.15);result.hammer=hammer;await page.screenshot({path:path.join(output,'hammer-forging.png')});
await page.locator('.process-projects [data-project="7"]').click();await page.waitForFunction(()=>document.querySelector('.process-dialog').dataset.loaded==='suivi');await page.locator('.process-step[data-step="1"]').click();await page.locator('.process-play').click();await page.waitForTimeout(200);const a=await page.evaluate(()=>window.__processModel.getObjectByName('PortTransferredContainer').position.toArray());await page.waitForTimeout(1800);const b=await page.evaluate(()=>window.__processModel.getObjectByName('PortTransferredContainer').position.toArray());assert.ok(b[1]>a[1]+.5);assert.ok(Math.abs(b[2]-a[2])>.1);result.container={start:a,lifted:b};await page.screenshot({path:path.join(output,'port-unloading.png')});
await page.locator('.process-projects [data-project="2"]').click();await page.waitForFunction(()=>document.querySelector('.process-dialog').dataset.loaded==='pa');await page.locator('.process-step[data-step="1"]').click();await page.locator('.process-play').click();const forkA=await page.evaluate(()=>window.__processModel.getObjectByName('DeliveryForklift').position.toArray());await page.waitForTimeout(2000);const forkB=await page.evaluate(()=>window.__processModel.getObjectByName('DeliveryForklift').position.toArray());assert.ok(forkB[0]-forkA[0]>.4);result.forklift={start:forkA,end:forkB};await page.screenshot({path:path.join(output,'warehouse-loading.png')});
assert.deepEqual(errors,[]);await writeFile(path.join(output,'machines-validation.json'),JSON.stringify({result,errors},null,2));await browser.close();console.log('V24_MACHINES_OK');
