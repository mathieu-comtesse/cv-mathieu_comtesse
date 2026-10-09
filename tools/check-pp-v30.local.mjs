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
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.text().slice(0,220))});
await context.addInitScript(()=>{window.audioEvidence=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const b=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<b.length;i+=64)peak=Math.max(peak,Math.abs(b[i]));window.audioEvidence.push({peak,state:this.context.state});}return original.apply(this,args);};});
    if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**', async (route) => {
      const url = new URL(route.request().url());
      const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!filename.startsWith(root)) return route.fulfill({ status: 403 });
      try {
        let body=await readFile(filename);if(filename.endsWith('project-dioramas.js'))body=Buffer.from(body.toString().replace('controls.update();renderer.shadowMap','window.__processModel=model;controls.update();renderer.shadowMap'));
        await route.fulfill({ body, contentType: types[path.extname(filename)] || 'application/octet-stream' });
      } catch {
        await route.fulfill({ status: 404, body: url.pathname });
      }
    });

if(process.env.SCENE_PUBLIC_URL)await context.route('**/project-dioramas.js?*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('controls.update();renderer.shadowMap','window.__processModel=model;controls.update();renderer.shadowMap')});});
await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/');
await page.waitForFunction(()=>document.querySelector('#room')?.dataset.native==='ready',null,{timeout:180000});
await page.evaluate(()=>{const r=window.room;r.pauseAutonomy(3600000);r.opts.noAdapt=true;for(const s of Object.values(r.stations))s.maxMs=3600000;});
await page.waitForTimeout(1200);
const evidence={};
evidence.painting=await page.evaluate(async()=>{const T=await import('three'),r=window.room;return ['painting','usm','rug'].map(id=>{let o;r.scene.traverse(n=>{if(n.userData.id===id&&!o)o=n;});const b=new T.Box3().setFromObject(o);return {id,min:b.min.toArray(),max:b.max.toArray(),pos:o.position.toArray()};});});
assert.ok(evidence.painting[0].min[1]>.93&&evidence.painting[0].min[2]<evidence.painting[1].min[2]);
assert.equal(evidence.painting[0].pos[0],evidence.painting[1].pos[0]);

await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.target.set(-.7,.95,-2.3);r.view.tZoom=2.3;r.view.tAz=.55;r.view.tEl=.3;});await page.waitForTimeout(1200);await page.screenshot({path:path.join(output,'tableau-au-dessus-usm.png')});


evidence.pp=await page.evaluate(async()=>{const {PRO_CARDS,HOURLY_RATE}=await import('./js/projects-data.js?v=cv-scene-v30');const {PAGES}=await import('./js/pages.js?v=cv-scene-v30');const p=PRO_CARDS.find(p=>p.id==='powerbi');return {project:p,rate:HOURLY_RATE,pp:PAGES['projet-3'].html,portail:PAGES['projet-4'].html};});
assert.equal(evidence.pp.project.time,'15–20 min / PP');assert.equal(evidence.pp.project.money,'26,19–34,91 € / PP');assert.equal((Math.round(15*Math.round(evidence.pp.rate*100)/60)/100).toFixed(2),'26.19');assert.equal((Math.round(20*Math.round(evidence.pp.rate*100)/60)/100).toFixed(2),'34.91');for(const h of [evidence.pp.pp,evidence.pp.portail]){assert.match(h,/15 à 20 minutes/);assert.match(h,/26,19 à 34,91/);assert.match(h,/archivage automatique/);assert.match(h,/extraction des champs par la VM/);}
await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('#mq-pro').dataset.previewFrames)>8);
const point=await page.locator('#mq-pro').evaluate(root=>{const a=root.getBoundingClientRect();for(const b of root.querySelectorAll('[data-project]')){const r=b.getBoundingClientRect();if(r.left>=a.left&&r.left+100<a.right)return {x:r.left+50,y:r.top+40};}throw Error('No visible workshop');});await page.mouse.click(point.x,point.y);await page.getByRole('dialog').getByRole('button',{name:'Power BI · PP & MOSO',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.process-dialog').dataset.loaded==='powerbi'&&window.__processModel?.userData.conveyors?.length>0);
evidence.gains=await page.locator('.process-outcome').innerText();assert.match(evidence.gains,/15–20 min/);assert.match(evidence.gains,/26,19–34,91/);assert.match(evidence.gains,/SharePoint/);assert.match(evidence.gains,/archivage/);
evidence.actions=[];for(let i=0;i<7;i++){await page.locator('.process-step').nth(i).click();await page.waitForFunction(i=>window.__processModel.userData.activeAction.step===i,i);evidence.actions.push(await page.evaluate(()=>window.__processModel.userData.activeAction));assert.ok(evidence.actions[i].objects.length);}
await page.locator('.process-step').nth(1).click();await page.locator('.process-play').click();const distance=await page.evaluate(()=>window.__processModel.userData.conveyors[0].distance);await page.waitForTimeout(600);assert.ok(await page.evaluate(d=>window.__processModel.userData.conveyors[0].distance>d,distance));await page.locator('.process-play').click();await page.locator('.process-step').nth(3).click();await page.waitForFunction(()=>window.__processModel.userData.activeAction.step===3);
await page.locator('.process-outcome').screenshot({path:path.join(output,'pp-moso-gains.png')});await page.locator('.process-dialog').screenshot({path:path.join(output,'pp-moso-extraction-vm.png')});
assert.deepEqual(errors,[]);evidence.errors=errors;await writeFile(path.join(output,'validation.json'),JSON.stringify(evidence,null,2));console.log('PP_MOSO_VM_OK');await browser.close();
