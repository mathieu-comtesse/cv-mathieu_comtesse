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

await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/?v=cv-scene-v31');
await page.waitForFunction(()=>document.querySelector('#room')?.dataset.native==='ready',null,{timeout:180000});
await page.evaluate(()=>{window.room.pauseAutonomy(3600000);window.room.opts.noAdapt=true;});
await page.waitForTimeout(2500);
const evidence={url:page.url()};assert.ok(!new URL(page.url()).searchParams.has('v'));
await page.evaluate(()=>window.room.director.spawn(.9,.7,.7));
evidence.speakers=await page.evaluate(async()=>{const T=await import('three'),r=window.room;return ['jblL','jblR','usm','painting','pump','bike'].map(id=>{let o;r.scene.traverse(n=>{if(n.userData.id===id&&!o)o=n});if(!o)return{id,missing:true};const bb=new T.Box3().setFromObject(o);return{id,min:bb.min.toArray(),max:bb.max.toArray(),visible:o.visible,meshes:(()=>{let count=0;o.traverse(n=>count+=!!n.isMesh);return count})()};});});assert.ok(evidence.speakers.every(o=>!o.missing&&o.visible));
evidence.routes=await page.evaluate(()=>{const r=window.room,points=[...new Set(Object.values(r.stations))].filter(s=>!s.ritual).map(s=>s.approach),bad=[];let count=0;for(const a of points)for(const b of points){if(a===b)continue;const route=r.nav.path(a,b),all=[a,...route];count++;if(!route.length||all.slice(1).some((p,i)=>!r.nav.line(all[i],p)))bad.push({a,b,route});}return{count,bad};});assert.deepEqual(evidence.routes.bad,[]);const cabinet=evidence.speakers.find(o=>o.id==='usm'),left=evidence.speakers.find(o=>o.id==='jblL'),right=evidence.speakers.find(o=>o.id==='jblR');assert.ok(cabinet.min[0]-left.max[0]>0&&cabinet.min[0]-left.max[0]<.2);assert.ok(right.min[0]-cabinet.max[0]>0&&right.min[0]-cabinet.max[0]<.2);
evidence.drawer=await page.evaluate(async()=>{const T=await import('three'),r=window.room,o=r.scene.getObjectByName('USMDrawerFront');const before=o.getWorldPosition(new T.Vector3()).toArray();r.crate.setOpen(true);return{before};});await page.waitForTimeout(700);evidence.drawer.after=await page.evaluate(async()=>{const T=await import('three');return window.room.scene.getObjectByName('USMDrawerFront').getWorldPosition(new T.Vector3()).toArray();});assert.ok(evidence.drawer.after[2]-evidence.drawer.before[2]>.25);await page.evaluate(()=>window.room.crate.setOpen(false));
evidence.cables=await page.evaluate(()=>{const a=[];window.room.scene.traverse(o=>{if(o.userData.connection)a.push(o.userData.connection)});return a});assert.equal(evidence.cables.length,4);

evidence.jbl=evidence.speakers.filter(o=>/^jbl/.test(o.id));for(const o of evidence.jbl){assert.ok(o.max[1]-o.min[1]>.5&&o.max[1]-o.min[1]<.9);assert.ok(o.min[1]<.08);assert.ok(o.meshes<20);}await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.target.set(-.45,.85,-2.45);r.view.tZoom=2;r.view.tAz=.12;r.view.tEl=.30;document.documentElement.dataset.theme='light';});await page.waitForTimeout(1500);await page.screenshot({path:path.join(output,'usm-jbl-l100.png')});assert.deepEqual(errors,[]);evidence.errors=errors;await writeFile(path.join(output,'jbl-validation.json'),JSON.stringify(evidence,null,2));console.log('JBL_L100_OK');await browser.close();
