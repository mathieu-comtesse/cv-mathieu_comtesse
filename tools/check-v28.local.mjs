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

const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.text().slice(0,220))});
await context.addInitScript(()=>{window.audioEvidence=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const b=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<b.length;i+=64)peak=Math.max(peak,Math.abs(b[i]));window.audioEvidence.push({peak,state:this.context.state});}return original.apply(this,args);};});
    if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**', async (route) => {
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

await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/');await page.waitForFunction(()=>document.getElementById('room')?.dataset.sceneReady==='true',null,{timeout:120000});await sceneTestProfile(page);await page.waitForFunction(()=>document.getElementById('room')?.dataset.native==='ready',null,{timeout:180000});
await sceneTestProfile(page);
await page.mouse.click(720,760);
// The gesture sets an 18-second autonomy pause; extend it after the click.
await page.evaluate(()=>window.room.pauseAutonomy(600000));

await page.evaluate(()=>{window.room.opts.noAdapt=true;for(const s of Object.values(window.room.stations))s.maxMs=300000;});
const evidence={};
evidence.decor=await page.evaluate(()=>{const r=window.room,names=['Moonlander','CurvedLandscapeMonitor','PortraitMonitor','ErgonomicVerticalMouse','RoadBikeFinish','UltrawideMonitorArm','PortraitMonitorArm','UltrawideWebcam','GamingDesktopPC','DeskMug'];return {objects:names.map(name=>({name,present:!!r.scene.getObjectByName(name)})),ps1:r.stations.sofa.think.obj.getObjectByName('PlayStation1')?.name,chairs:r.scene.getObjectsByProperty('name','HermanMillerSetu').length};});
assert.ok(evidence.decor.objects.every(x=>x.present));assert.equal(evidence.decor.chairs,1);assert.equal(evidence.decor.ps1,'PlayStation1');assert.equal(await page.evaluate(()=>window.room.scene.getObjectsByProperty('name','Nommo left speaker').length+window.room.scene.getObjectsByProperty('name','Nommo right speaker').length),0,'Speakers must remain absent after background loading');

evidence.painting=await page.evaluate(async()=>{const T=await import('three'),r=window.room;return ['painting','usm','rug'].map(id=>{let o;r.scene.traverse(n=>{if(n.userData.id===id&&!o)o=n;});const b=new T.Box3().setFromObject(o);return {id,min:b.min.toArray(),max:b.max.toArray(),pos:o.position.toArray()};});});
assert.ok(evidence.painting[0].min[1]>.93&&evidence.painting[0].min[2]<evidence.painting[1].min[2]);
assert.equal(evidence.painting[0].pos[0],evidence.painting[1].pos[0]);
evidence.text=await page.evaluate(async()=>{const D=await import('./js/data.js?v=cv-scene-v28'),P=await import('./js/pages.js?v=cv-scene-v28');return {pitch:document.querySelector('.hero-pitch').textContent,terrain:D.PRO.find(p=>p.title==='Dialogue terrain').lead,firstPerson:/(?<![\p{L}’'])(?:je|mon|mes|ma|moi)(?![\p{L}])|(?<!\p{L})j[’']/iu.test(JSON.stringify([D.PRO,P.PAGES]))};});
assert.ok(evidence.text.pitch.startsWith('Il audite'));assert.ok(evidence.text.terrain.startsWith('Il a mené'));assert.equal(evidence.text.firstPerson,false);
await page.evaluate(()=>{const r=window.room;r.director.spawn(.9,.7,0);r.setCameraMode('free');r.target.set(-.7,.95,-2.3);r.view.tZoom=2.3;r.view.tAz=.55;r.view.tEl=.3;});await page.waitForTimeout(1800);await page.screenshot({path:path.join(output,'tableau-au-dessus-usm.png')});
assert.deepEqual(errors,[]);await writeFile(path.join(output,'validation.json'),JSON.stringify({...evidence,errors},null,2));console.log('V28_CHECK_OK',JSON.stringify(evidence));await browser.close();