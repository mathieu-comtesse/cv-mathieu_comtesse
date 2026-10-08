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

const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:.5});const page=await context.newPage();page.setDefaultTimeout(120000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.text().slice(0,220))});
await context.addInitScript(()=>{window.audioEvidence=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const b=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<b.length;i+=64)peak=Math.max(peak,Math.abs(b[i]));window.audioEvidence.push({peak,state:this.context.state});}return original.apply(this,args);};});
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

await page.goto('http://scene.test/');await page.waitForFunction(()=>document.getElementById('room')?.dataset.native==='ready',null,{timeout:60000});
await sceneTestProfile(page);
await page.mouse.click(720,760);
// The gesture sets an 18-second autonomy pause; extend it after the click.
await page.evaluate(()=>window.room.pauseAutonomy(600000));

await page.evaluate(()=>{window.room.opts.noAdapt=true;window.room.renderer.setPixelRatio(.5);for(const s of Object.values(window.room.stations))s.maxMs=300000;});
const evidence={};
evidence.decor=await page.evaluate(()=>{const r=window.room,names=['Moonlander','CurvedLandscapeMonitor','PortraitMonitor','ErgonomicVerticalMouse','RoadBikeFinish','UltrawideMonitorArm','PortraitMonitorArm','UltrawideWebcam','GamingDesktopPC','Nommo left speaker','Nommo right speaker','DeskMug'];return {objects:names.map(name=>({name,present:!!r.scene.getObjectByName(name)})),ps1:r.stations.sofa.think.obj.getObjectByName('PlayStation1')?.name,chairs:r.scene.getObjectsByProperty('name','HermanMillerSetu').length};});
assert.ok(evidence.decor.objects.every(x=>x.present));assert.equal(evidence.decor.chairs,1);assert.equal(evidence.decor.ps1,'PlayStation1');
await page.evaluate(()=>window.room.director.placeInto(window.room.stations.alocasia));await page.waitForFunction(()=>document.querySelector('iframe').contentWindow.shupiHeader.scene.simDoing?.busy==='water');
await page.waitForFunction(()=>{let g=window.room.scene.getObjectByName('NativeMotionEffects')?.getObjectByName('iso:water');return g?.children.some(o=>o.visible);},null,{timeout:30000});
evidence.water=await page.evaluate(async()=>{const T=await import('three'),r=window.room,c=r.scene.getObjectByName('NativeExact:iso:can'),t=r.stations.alocasia.waterTarget;c.updateWorldMatrix(true,true);const tip=new T.Vector3(c.userData.spout.x,c.userData.spout.y,c.userData.spout.z).applyMatrix4(c.matrixWorld),cp=c.getWorldPosition(new T.Vector3()),drops=[];r.scene.getObjectByName('NativeMotionEffects').getObjectByName('iso:water').traverseVisible(o=>{if(o.isMesh){const p=o.getWorldPosition(new T.Vector3());if(p.y<t.y+.05)drops.push(Math.hypot(p.x-t.x,p.z-t.z));}});return {spoutError:Math.hypot(tip.x-t.x,tip.z-t.z),handDistance:Math.min(cp.distanceTo(r.hero.wp('hand_l')),cp.distanceTo(r.hero.wp('hand_r'))),landingRadii:drops};});
assert.ok(evidence.water.spoutError<.01);assert.ok(evidence.water.handDistance<.5);assert.ok(evidence.water.landingRadii.every(d=>d<.29),'Droplets must land inside the enlarged pot');
for(const id of ['ekstrem','sofa','desk']) {
 await page.evaluate(id=>window.room.director.placeInto(window.room.stations[id]),id);await page.waitForFunction(()=>window.room.director.mode==='activity');
 if(id!=='sofa')await page.waitForFunction(id=>{const a=document.querySelector('iframe').contentWindow.shupiHeader.scene;return a.simDoing?.doing==='busy'&&a.simDoing?.busy===(id==='desk'?'work':'read')&&a.simDoing.activityTime>2;},id,{timeout:120000});
 await page.waitForFunction(id=>{const r=window.room,s=r.stations[id];return s.seatContact && r.hero.hipContactY()-s.seatContact.y<.04;},id,{timeout:60000});
 evidence[id]=await page.evaluate(id=>{const r=window.room,s=r.stations[id],cover=[];r.scene.getObjectByName('NativeExact:iso:book')?.traverse(o=>{if(o.isMesh&&o.material.map)cover.push(o.material.map.image?.src||'');});const p=r.hero.wp('pelvis'),a=s.seatSupport;return {advance:a?(p.x-a[0])*Math.sin(s.yaw)+(p.z-a[2])*Math.cos(s.yaw):null,yaw:r.hero.group.rotation.y,expected:s.yaw,clearance:r.hero.hipContactY()-s.seatContact.y,swivel:r.scene.getObjectByName('SetuSwivel').rotation.y,covers:cover};},id);
 console.log('CONTACT',id,JSON.stringify(evidence[id]));await writeFile(path.join(output,'custom-scene.json'),JSON.stringify(evidence,null,2));
 assert.ok(evidence[id].clearance>=-.003&&evidence[id].clearance<.04,'Pelvis must rest above the seating surface');
 if(id==='ekstrem'){assert.ok(Math.abs(evidence[id].advance-.12)<.002,'Ekstrem actor must advance 12 cm without moving the seat support');assert.ok(Math.abs(evidence[id].yaw-evidence[id].expected)<.001);assert.ok(evidence[id].covers.some(s=>s.includes('popper-front')));}if(id==='desk')assert.ok(Math.abs(evidence[id].swivel)<.05);
}
// Measure both legs and hands in the actor's actual side basis.
await page.evaluate(()=>window.room.director.placeInto(window.room.stations.sofa));await page.waitForFunction(()=>window.room.director.mode==='activity');await page.waitForTimeout(1000);
const armSamples=[];for(let i=0;i<18;i++){await page.waitForTimeout(80);armSamples.push(await page.evaluate(async()=>{const T=await import('three'),r=window.room,p=r.hero.wp('pelvis'),side=new T.Vector3(1,0,0).applyQuaternion(r.hero.group.getWorldQuaternion(new T.Quaternion()));const off=n=>r.hero.wp(n).sub(p).dot(side);return {feet:[off('foot_l'),off('foot_r')],hands:[r.hero.wp('hand_l').toArray(),r.hero.wp('hand_r').toArray()]};}));}
evidence.sofaStability={feet:armSamples[0].feet,maxHandStep:Math.max(...armSamples.slice(1).flatMap((s,i)=>s.hands.map((h,j)=>Math.hypot(...h.map((x,k)=>x-armSamples[i].hands[j][k])))))};
assert.ok(evidence.sofaStability.feet[0]*evidence.sofaStability.feet[1]<0,'Feet must remain on opposite sides');assert.ok(evidence.sofaStability.maxHandStep<.035,'Gamepad hands must not flip between elbow solutions');
evidence.desk=await page.evaluate(async()=>{const T=await import('three'),r=window.room,g=r.scene.getObjectByName('CurvedLandscapeMonitor'),p=r.scene.getObjectByName('PortraitMonitor'),m=r.scene.getObjectByName('DeskMug');const bb=o=>new T.Box3().setFromObject(o).getSize(new T.Vector3()).toArray();return {wideSize:bb(g.getObjectByName('UltrawidePanel')),portraitSize:bb(p.getObjectByName('PortraitPanel')),mugX:m.position.x,webcam:!!g.getObjectByName('UltrawideWebcam')};});
assert.ok(evidence.desk.wideSize[2]>evidence.desk.wideSize[1]);assert.ok(evidence.desk.portraitSize[1]>evidence.desk.portraitSize[2]);assert.ok(evidence.desk.mugX<0);assert.ok(evidence.desk.webcam);
evidence.plantPaths=await page.evaluate(()=>{const r=window.room,from=r.nav.nearest(.9,.7);return ['alocasia','dracaena','bonsai'].map(id=>{const path=r.nav.path(from,r.stations[id].approach),all=[from,...path];return {id,points:path.length,clear:all.slice(1).every((p,i)=>r.nav.line(all[i],p))};});});console.log('PLANT_PATHS',JSON.stringify(evidence.plantPaths));await writeFile(path.join(output,'custom-scene.json'),JSON.stringify(evidence,null,2));assert.ok(evidence.plantPaths.every(x=>x.points>0&&x.clear),'All plant approaches must remain reachable without crossing their obstacles');
await page.evaluate(()=>window.room.director.placeInto(window.room.stations.cha));await page.waitForFunction(()=>window.room.director.mode==='activity');await page.waitForFunction(()=>window.room.cs.panels.every(p=>p.open>.9));await page.evaluate(()=>window.room.director.stand());await page.waitForFunction(()=>window.room.director.mode==='idle',null,{timeout:180000});await page.waitForFunction(()=>window.room.cs.panels.every(p=>p.open<.05),null,{timeout:30000});evidence.teaClosed=true;
await page.evaluate(()=>{const r=window.room;r.director.lift();r.director.drop(.9,.7);});await page.waitForFunction(()=>window.room.director.mode==='idle');
await page.evaluate(()=>window.room.director.go(window.room.stations.alocasia));const motion=[];for(let i=0;i<10;i++){await page.waitForTimeout(160);motion.push(await page.evaluate(()=>{const r=window.room;return {mode:r.director.mode,p:r.hero.group.position.toArray(),q:r.hero.bones.calf_l.quaternion.toArray()};}));}const moving=motion.filter(x=>x.mode==='walk');evidence.walk={samples:moving.length,legChange: moving.length?Math.max(...moving.map(x=>Math.hypot(...x.q.map((v,i)=>v-moving[0].q[i])))):0};assert.ok(evidence.walk.legChange>.02,'Leg joints must animate while the character moves');
await page.evaluate(()=>{let r=window.room;r.director.lift();r.director.drop(.9,.7);r.target.set(0,.7,.8);r.view.tAz=25*Math.PI/180;r.view.tEl=25*Math.PI/180;r.view.tZoom=1;});await page.waitForTimeout(1200);await page.screenshot({path:path.join(output,'scene-custom.png')});
assert.deepEqual(errors,[]);await writeFile(path.join(output,'custom-scene.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));await browser.close();
