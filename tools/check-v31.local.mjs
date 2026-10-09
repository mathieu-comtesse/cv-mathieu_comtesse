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
evidence.routes=await page.evaluate(()=>{const r=window.room,points=[...new Set(Object.values(r.stations))].filter(s=>!s.ritual).map(s=>s.approach),bad=[];let count=0;for(const a of points)for(const b of points){if(a===b)continue;const route=r.nav.path(a,b),all=[a,...route];count++;if(!route.length||all.slice(1).some((p,i)=>!r.nav.line(all[i],p)))bad.push({a,b,route});}return{count,bad};});assert.deepEqual(evidence.routes.bad,[]);
evidence.drawer=await page.evaluate(async()=>{const T=await import('three'),r=window.room,o=r.scene.getObjectByName('USMDrawerFront');const before=o.getWorldPosition(new T.Vector3()).toArray();r.crate.setOpen(true);return{before};});await page.waitForTimeout(700);evidence.drawer.after=await page.evaluate(async()=>{const T=await import('three');return window.room.scene.getObjectByName('USMDrawerFront').getWorldPosition(new T.Vector3()).toArray();});assert.ok(evidence.drawer.after[2]-evidence.drawer.before[2]>.25);await page.evaluate(()=>window.room.crate.setOpen(false));
evidence.cables=await page.evaluate(()=>{const a=[];window.room.scene.traverse(o=>{if(o.userData.connection)a.push(o.userData.connection)});return a});assert.equal(evidence.cables.length,4);
await page.getByRole('button',{name:'Tourner le décor',exact:true}).click();
const canvas=page.locator('#room>canvas'),box=await canvas.boundingBox(),startAz=await page.evaluate(()=>window.room.view.tAz);
await page.mouse.move(box.x+box.width*.68,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.4,box.y+box.height*.46,{steps:12});await page.mouse.up();
evidence.rotation=await page.evaluate(()=>({az:window.room.view.tAz,mode:window.room.cameraMode}));assert.ok(Math.abs(evidence.rotation.az-startAz)>.5);assert.equal(evidence.rotation.mode,'free');
await canvas.focus();const az=await page.evaluate(()=>window.room.view.tAz);await page.keyboard.press('ArrowRight');assert.ok(await page.evaluate(a=>window.room.view.tAz!==a,az));
const zoom=await page.evaluate(()=>window.room.view.tZoom);await page.mouse.wheel(0,260);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.room.view.tZoom),zoom);assert.ok(await page.evaluate(()=>scrollY)>0);await page.evaluate(()=>scrollTo(0,0));
await page.getByRole('button',{name:'Déplacer le décor',exact:true}).click();const target=await page.evaluate(()=>window.room.target.toArray());await page.mouse.move(box.x+box.width*.70,box.y+box.height*.38);await page.mouse.down();await page.mouse.move(box.x+box.width*.80,box.y+box.height*.40,{steps:8});await page.mouse.up();assert.notDeepEqual(await page.evaluate(()=>window.room.target.toArray()),target);
for(const id of ['alocasia','bonsai','dracaena']){
 await page.evaluate(id=>{const r=window.room;r.pauseAutonomy(3600000);r.director.placeInto(r.stations[id]);},id);
 await page.waitForFunction(id=>window.room.director.mode==='activity'&&window.room.director.current===window.room.stations[id],id);
 const trace=await page.evaluate(async id=>{
  const r=window.room,bridge=await (await import('./js/native-room.js?v=cv-scene-v31')).getNativeRoomBridge(),out=[],start=performance.now();
  while(performance.now()-start<60000){out.push({ms:Math.round(performance.now()-start),mode:r.director.mode,current:!!r.director.current,pose:bridge.mode,source:bridge.sceneApi.simDoing,locomoting:r.director.locomoting,pos:r.hero.group.position.toArray(),yaw:r.hero.group.rotation.y});if(r.director.mode==='idle'&&!r.director.current)break;await new Promise(done=>setTimeout(done,120));}
  return {id,trace:out};
 },id);
 await writeFile(path.join(output,id+'-trace.json'),JSON.stringify(trace,null,2));
 assert.equal(trace.trace.at(-1).mode,'idle',id+' fails to leave watering');
 assert.ok(trace.trace.some(t=>t.source?.busy==='water'),id+' never waters');
 const travelled=trace.trace.filter(t=>t.locomoting);assert.ok(travelled.length,id+' has no retreat');
 assert.ok(!trace.trace.some(t=>t.pose==='run'&&!t.locomoting),id+' runs while stationary');
 assert.ok(Math.hypot(trace.trace.at(-1).pos[0]-trace.trace[0].pos[0],trace.trace.at(-1).pos[2]-trace.trace[0].pos[2])>.1);
 evidence[id]=trace;
}
await page.evaluate(()=>{const r=window.room;r.pauseAutonomy(3600000);r.director.placeInto(r.stations.bike);r.setCameraMode('free');r.target.set(2.8,.75,-4.15);r.view.tZoom=3;r.view.tAz=.65;r.view.tEl=.30;});
await page.waitForFunction(()=>window.room.director.mode==='activity'&&window.room.director.current===window.room.stations.bike);
evidence.pump=await page.evaluate(async()=>{const r=window.room,o=r.scene.getObjectByName('BicycleFloorPump'),samples=[],start=performance.now();while(performance.now()-start<60000){const d=o.userData.pump;samples.push({...d,pressure:[...d.pressure],handErrors:[...d.handErrors]});if(d.pressure[1]>.99)break;await new Promise(done=>setTimeout(done,160));}return samples;});
await writeFile(path.join(output,'pump-trace.json'),JSON.stringify(evidence.pump,null,2));
assert.ok(evidence.pump.some(s=>s.pressure[0]>.95)&&evidence.pump.some(s=>s.pressure[1]>.95),'both tyres not pumped');
const active=evidence.pump.filter(s=>s.active);evidence.maxHandError=Math.max(...active.flatMap(s=>s.handErrors));assert.ok(evidence.maxHandError<.045,'Hands fail contact: '+evidence.maxHandError);
assert.ok(Math.max(...active.map(s=>s.handleY))-Math.min(...active.map(s=>s.handleY))>.18);
await page.evaluate(()=>{const r=window.room;r.pauseAutonomy(3600000);r.director.placeInto(r.stations.bike);});await page.waitForFunction(()=>window.room.director.mode==='activity'&&window.room.director.current===window.room.stations.bike);await page.waitForTimeout(1700);await page.screenshot({path:path.join(output,'pompe-en-action.png')});
await page.evaluate(()=>{const r=window.room;r.director.spawn(.9,.7,.7);r.setCameraMode('free');r.target.set(-.5,.9,-2.45);r.view.tZoom=2;r.view.tAz=.15;r.view.tEl=.34;});await page.waitForTimeout(1200);await page.screenshot({path:path.join(output,'usm-jbl-cables.png')});
evidence.pp=await page.evaluate(async()=>{const {PRO_CARDS,HOURLY_RATE}=await import('./js/projects-data.js?v=cv-scene-v31');const {PAGES}=await import('./js/pages.js?v=cv-scene-v31');const p=PRO_CARDS.find(p=>p.id==='powerbi');return {project:p,rate:HOURLY_RATE,pp:PAGES['projet-3'].html,portail:PAGES['projet-4'].html};});
assert.equal(evidence.pp.project.time,'15–20 min / PP');assert.equal(evidence.pp.project.money,'26,19–34,91 € / PP');assert.equal((Math.round(15*Math.round(evidence.pp.rate*100)/60)/100).toFixed(2),'26.19');assert.equal((Math.round(20*Math.round(evidence.pp.rate*100)/60)/100).toFixed(2),'34.91');for(const h of [evidence.pp.pp,evidence.pp.portail]){assert.match(h,/15 à 20 minutes/);assert.match(h,/26,19 à 34,91/);assert.match(h,/archivage automatique/);assert.match(h,/extraction des champs par la VM/);}
await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('#mq-pro').dataset.previewFrames)>8);
const point=await page.locator('#mq-pro').evaluate(root=>{const a=root.getBoundingClientRect();for(const b of root.querySelectorAll('[data-project]')){const r=b.getBoundingClientRect();if(r.left>=a.left&&r.left+100<a.right)return {x:r.left+50,y:r.top+40};}throw Error('No visible workshop');});await page.mouse.click(point.x,point.y);await page.getByRole('dialog').getByRole('button',{name:'Power BI · PP & MOSO',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.process-dialog').dataset.loaded==='powerbi'&&window.__processModel?.userData.conveyors?.length>0);
evidence.gains=await page.locator('.process-outcome').innerText();assert.match(evidence.gains,/15–20 min/);assert.match(evidence.gains,/26,19–34,91/);assert.match(evidence.gains,/SharePoint/);assert.match(evidence.gains,/archivage/);
evidence.actions=[];for(let i=0;i<7;i++){await page.locator('.process-step').nth(i).click();await page.waitForFunction(i=>window.__processModel.userData.activeAction.step===i,i);evidence.actions.push(await page.evaluate(()=>window.__processModel.userData.activeAction));assert.ok(evidence.actions[i].objects.length);}
await page.locator('.process-step').nth(1).click();await page.locator('.process-play').click();const distance=await page.evaluate(()=>window.__processModel.userData.conveyors[0].distance);await page.waitForTimeout(600);assert.ok(await page.evaluate(d=>window.__processModel.userData.conveyors[0].distance>d,distance));await page.locator('.process-play').click();await page.locator('.process-step').nth(3).click();await page.waitForFunction(()=>window.__processModel.userData.activeAction.step===3);
await page.locator('.process-outcome').screenshot({path:path.join(output,'pp-moso-gains.png')});await page.locator('.process-dialog').screenshot({path:path.join(output,'pp-moso-extraction-vm.png')});
assert.match(evidence.gains,/6 h 40/);assert.match(evidence.gains,/698,27/);assert.match(evidence.gains,/500 PP/);assert.match(evidence.gains,/13 092,50/);assert.deepEqual(errors,[]);evidence.errors=errors;await writeFile(path.join(output,'validation.json'),JSON.stringify(evidence,null,2));console.log('PP_MOSO_VM_OK');await browser.close();
