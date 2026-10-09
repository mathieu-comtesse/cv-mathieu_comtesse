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
await page.waitForTimeout(3000);
const evidence={camera:{},shoes:[],seats:[],cable:[],workshops:[],carousel:[],layouts:[]};
assert.equal(await page.locator('#room').getAttribute('data-camera-mode'),'follow');
await page.evaluate(()=>window.room.director.spawn(1.6,1.8,.6));await page.waitForTimeout(700);
evidence.camera.follow=await page.evaluate(()=>{const r=window.room;return {target:r.target.toArray(),hero:r.hero.group.position.toArray()};});
assert.ok(Math.hypot(evidence.camera.follow.target[0]-evidence.camera.follow.hero[0],evidence.camera.follow.target[2]-evidence.camera.follow.hero[2])<.03);

await page.locator('.room-camera').click();
const az0=await page.evaluate(()=>window.room.view.tAz);await page.mouse.move(1100,300);await page.mouse.down();await page.mouse.move(850,420,{steps:12});await page.mouse.up();
assert.equal(await page.evaluate(()=>window.room.view.tAz),az0,'Default held left click pans without rotation');
await page.locator('.room-zoom-in').click();await page.locator('.room-zoom-in').click();await page.locator('.room-zoom-in').click();await page.locator('.room-zoom-in').click();await page.locator('.room-zoom-in').click();await page.waitForTimeout(700);
evidence.camera.free=await page.evaluate(()=>{const r=window.room;return {mode:r.cameraMode,target:r.target.toArray(),zoom:r.view.zoom};});assert.equal(evidence.camera.free.mode,'free');assert.ok(evidence.camera.free.zoom>2.6);
await page.mouse.move(1100,300);await page.mouse.wheel(0,480);await page.waitForTimeout(500);evidence.camera.wheel=await page.evaluate(()=>({scroll:scrollY,zoom:window.room.view.tZoom}));assert.ok(evidence.camera.wheel.scroll>150,'Wheel scrolls the page in free camera');assert.ok(Math.abs(evidence.camera.wheel.zoom-3.0517578125)<.001,'Wheel cannot change zoom');
await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>window.room.director.spawn(-1.4,-.5,.2));await page.setViewportSize({width:1000,height:800});await page.waitForTimeout(600);assert.ok(await page.evaluate(t=>window.room.target.distanceTo(window.room.target.clone().fromArray(t))<.02,evidence.camera.free.target),'Manual framing survives movement and resize');
await page.setViewportSize({width:1440,height:900});await page.locator('.room-zoom-reset').click();await page.locator('.room-camera').click();await page.waitForTimeout(600);assert.equal(await page.locator('#room').getAttribute('data-camera-mode'),'follow');await page.mouse.move(1100,300);await page.mouse.wheel(0,350);await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>scrollY)>150);await page.evaluate(()=>scrollTo(0,0));
await page.locator('#room-zoom-range').focus();await page.keyboard.press('Home');await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.room.view.tZoom),.125);await page.keyboard.press('End');await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.room.view.tZoom),16);await page.locator('.room-zoom-reset').click();
evidence.shoes=await page.evaluate(async()=>{const T=await import('three'),r=window.room,h=r.hero,c=await fetch('assets/shoe-calibration-v27.json').then(r=>r.json());h.stop();h.setNativePose(null);h.setPost(null);h.poseStanding();h.group.position.set(0,0,0);h.group.rotation.set(0,0,0);r.scene.updateMatrixWorld(true);return ['left','right'].map(side=>{const s=r.scene.getObjectByName('NB992:'+side),sock=r.scene.getObjectByName('Sock:'+side),inv=new T.Matrix4().fromArray(c.feet[side].basis).invert(),points=[];s.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)points.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).applyMatrix4(inv));});const b=new T.Box3().setFromPoints(points);return {side,size:b.getSize(new T.Vector3()).toArray(),expected:c.feet[side].dimensions,min:b.min.toArray(),max:b.max.toArray(),expectedMin:c.feet[side].min,expectedMax:c.feet[side].max,sock:sock.visible,originalRedVisible:(()=>{let visible=false;h.model.getObjectByName('shoes').traverseVisible(o=>{if(o.isMesh&&['Material #1388','Material #1401','Material #1425'].includes(o.material?.name))visible=true;});return visible;})()};});});
for(const s of evidence.shoes){assert.ok(s.sock&&!s.originalRedVisible);for(let i=0;i<3;i++){assert.ok(Math.abs(s.size[i]-s.expected[i])<.00002,'Same size as red shoes');assert.ok(Math.abs(s.min[i]-s.expectedMin[i])<.00002,'Same heel and lateral registration');assert.ok(Math.abs(s.max[i]-s.expectedMax[i])<.00002);}}
await page.evaluate(()=>window.room.director.spawn(0,0,0));

for(const id of ['desk','ekstrem','sofa']){
 await page.evaluate(id=>window.room.director.placeInto(window.room.stations[id]),id);await page.waitForFunction(()=>window.room.director.mode==='activity');
 if(id!=='sofa')await page.waitForFunction(id=>{const s=document.querySelector('iframe').contentWindow.shupiHeader.scene.simDoing;return s?.busy===(id==='desk'?'work':'read')&&s.activityTime>2;},id,{timeout:120000});
 await page.waitForTimeout(900);
 const state=await page.evaluate(async id=>{const T=await import('three'),r=window.room,c=await fetch('assets/seat-calibration-v26.json').then(r=>r.json()),p=r.hero.wp('pelvis'),yaw=r.hero.group.rotation.y,fit=c[id];let target;if(fit)target=new T.Vector3().fromArray(fit.pelvisLocal).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(...(id==='desk'?[-2.15,0,.3]:[2.3,0,-.95])));return {id,yaw,expectedYaw:r.stations[id].yaw,clearance:r.hero.hipContactY()-r.stations[id].seatContact.y,horizontalError:target?Math.hypot(target.x-p.x,target.z-p.z):0,knees:['l','r'].map(sd=>r.hero.wp('thigh_'+sd).sub(r.hero.wp('calf_'+sd)).angleTo(r.hero.wp('foot_'+sd).sub(r.hero.wp('calf_'+sd)))*180/Math.PI)};},id);
 evidence.seats.push(state);assert.ok(state.horizontalError<.02);assert.ok(state.clearance>=.004&&state.clearance<.015);
 if(id==='ekstrem'){assert.ok(Math.abs(state.yaw-state.expectedYaw)<.001);assert.ok(state.knees.every(k=>k>137&&k<145),'Keep the original relaxed reading legs');}else assert.ok(state.knees.every(k=>Math.abs(k-90)<2));
 await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.target.copy(r.hero.wp('spine_02'));r.view.tZoom=4;r.view.tAz=r.hero.group.rotation.y+2.1;r.view.tEl=.15;});await page.waitForTimeout(600);await page.screenshot({path:path.join(output,'seat-'+id+'.png')});
 if(id==='sofa')for(let i=0;i<10;i++){await page.waitForTimeout(100);const cable=await page.evaluate(async()=>{const T=await import('three'),r=window.room.retro,actual=r.group.localToWorld(new T.Vector3().fromArray(r.padCord.userData.endpoint)),socket=r.pad.localToWorld(r.padSocket.clone()),p=r.padCord.geometry.attributes.position,start=new T.Vector3();for(let j=0;j<6;j++)start.add(new T.Vector3(p.getX(j),p.getY(j),p.getZ(j)));start.multiplyScalar(1/6);return {error:actual.distanceTo(socket),start:start.toArray(),held:r.padHeld};});evidence.cable.push(cable);assert.ok(cable.error<.0001&&cable.held);assert.ok(Math.hypot(cable.start[0]-.475,cable.start[1]-.03,cable.start[2]-.125)<.0001);}
}
await page.evaluate(()=>window.room.director.stand());await page.waitForTimeout(1200);
assert.ok(await page.evaluate(async()=>{const T=await import('three'),r=window.room.retro;return !r.padHeld&&r.group.localToWorld(new T.Vector3().fromArray(r.padCord.userData.endpoint)).distanceTo(r.pad.localToWorld(r.padSocket.clone()))<.0001;}));

await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('#mq-pro').dataset.previewFrames)>6);
for(const id of ['mq-pro','mq-perso']){
 const row=page.locator('#'+id);await row.scrollIntoViewIfNeeded();const box=await row.boundingBox(),x=box.x+box.width*.65,y=box.y+Math.min(box.height*.3,150),before=await page.evaluate(()=>scrollY);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-360,y+3,{steps:12});await page.mouse.up();await page.waitForTimeout(600);
 assert.equal(await page.locator('.process-dialog').evaluate(d=>d.open),false,'A drag must not open a workshop');assert.equal(await page.evaluate(()=>scrollY),before,'Dragging must not move the page');
 evidence.carousel.push({id,transform:await row.locator('.mq-track').getAttribute('style')});
}
await page.locator('#mq-pro').scrollIntoViewIfNeeded();
const clickVisible=async()=>{const point=await page.locator('#mq-pro').evaluate(root=>{const area=root.getBoundingClientRect();for(const b of root.querySelectorAll('[data-project]')){const r=b.getBoundingClientRect();if(r.left>=area.left&&r.left+Math.min(150,r.width)<area.right)return {x:r.left+70,y:r.top+40};}throw Error('No visible card');});await page.mouse.click(point.x,point.y);};
await clickVisible();await page.waitForFunction(()=>document.querySelector('.process-dialog').open&&window.__processModel);
for(let i=0;i<11;i++){
 await page.locator('.process-projects [data-project="'+i+'"]').click();await page.waitForFunction(()=>{const d=document.querySelector('.process-dialog');return d.dataset.project===d.dataset.loaded&&window.__processModel?.userData.activeAction;},null,{timeout:60000});
 await page.locator('.process-play').click();
 const count=await page.locator('.process-step').count();
 for(let step=0;step<count;step++){await page.locator('.process-step').nth(step).click();await page.waitForTimeout(100);assert.ok(await page.evaluate(step=>window.__processModel.userData.activeAction.step===step&&window.__processModel.userData.activeAction.objects.length>0,step));}
 await page.locator('.process-step').nth(Math.min(2,count-1)).click();await page.waitForTimeout(100);
 const state=await page.locator('.process-dialog').evaluate(d=>({id:d.dataset.project,width:d.querySelector('.process-stage').clientWidth,height:d.querySelector('.process-stage').clientHeight,gains:d.querySelector('.process-outcome').textContent,highlight:window.__processModel.userData.activeAction,toolsOverlap:d.querySelector('.process-transform').getBoundingClientRect().top<d.querySelector('.process-stage').getBoundingClientRect().bottom}));
 evidence.workshops.push(state);assert.ok(state.height>=600&&state.width>=1200);assert.equal(state.toolsOverlap,false);
 if(state.id==='vmvre'){assert.match(state.gains,/209 480–261 850/);assert.match(state.gains,/104,74/);assert.match(state.gains,/30 min/);assert.match(state.gains,/4 000–5 000/);}
 if(['terrain','charte'].includes(state.id))assert.equal(state.gains,'');
 await page.locator('.process-stage').screenshot({path:path.join(output,'atelier-'+state.id+'.png')});if(state.id==='vmvre')await page.locator('.process-outcome').screenshot({path:path.join(output,'gains-vmvre.png')});
}
for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(200);const state=await page.locator('.process-dialog').evaluate(d=>({width:innerWidth,overflow:d.scrollWidth>innerWidth+1,overlap:d.querySelector('.process-transform').getBoundingClientRect().top<d.querySelector('.process-stage').getBoundingClientRect().bottom}));evidence.layouts.push(state);assert.equal(state.overflow,false);assert.equal(state.overlap,false);}
await page.locator('.process-back').click();await page.setViewportSize({width:1440,height:900});await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'accueil-ateliers.png')});
assert.deepEqual(errors,[]);await writeFile(path.join(output,'validation.json'),JSON.stringify({...evidence,errors},null,2));console.log('V27_VALIDATION_OK',JSON.stringify(evidence));await browser.close();
