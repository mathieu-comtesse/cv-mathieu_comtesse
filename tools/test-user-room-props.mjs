import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {sceneTestProfile} from './scene-test-profile.mjs';
console.log('TEST_STARTED');
const {chromium}=await import(process.env.PLAYWRIGHT_PACKAGE?pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href:'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),output=path.resolve(root,process.env.SCENE_TEST_OUTPUT||'test-results');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE,args:['--enable-webgl','--use-angle='+ (process.env.SCENE_WEBGL_BACKEND||'swiftshader'),'--enable-unsafe-swiftshader']});
console.log('BROWSER_STARTED');
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1}),page=await context.newPage(),errors=[],missing=[];
page.setDefaultTimeout(120000);page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log('BROWSER',m.type(),m.text().slice(0,700));});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**',async route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await readFile(f),contentType:types[path.extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:u.pathname});}});
try{
 console.log('LOADING_PAGE');
 await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/',{waitUntil:'domcontentloaded'});
 console.log('PAGE_LOADED');
 await page.waitForFunction(()=>document.getElementById('room')?.dataset.sceneReady==='true',null,{timeout:120000});
 console.log('SCENE_READY');
 await page.evaluate(()=>{const r=window.room;r.pauseAutonomy(600000);r.opts.noAdapt=true;for(const st of Object.values(r.stations))st.maxMs=300000;});await sceneTestProfile(page);
 await page.waitForFunction(()=>document.getElementById('room')?.dataset.native==='ready',null,{timeout:180000});
 const evidence=await page.evaluate(async()=>{
  const T=await import('three'),r=window.room;const names=['GamingLandscapeMonitor','GamingPortraitMonitor','GamingMonitorArms','GamingDeskMat','GamingDeskSpeakerLeft','GamingDeskSpeakerRight','Moonlander','LogitechMXMaster2S','OlivettiUnderwood280','Mamiya6451000S','SuppliedPlayStation1','SuppliedPS1Controller','USMHallerTable','USMHallerMobile','DreamComputerRTX4090','AsusROGRTX4090','DeskPowerStrip','LandscapeMonitorLightBar','MagnavoxCRT'];
  const localBounds=(obj,parent)=>{parent.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(obj),inv=parent.matrixWorld.clone().invert(),points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new T.Vector3(x,y,z).applyMatrix4(inv));const box=new T.Box3().setFromPoints(points);return{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new T.Vector3()).toArray(),center:box.getCenter(new T.Vector3()).toArray()};};
  const workstation=r.scene.getObjectByName('GamingDeskSetup'),desk=workstation.parent,typewriter=r.scene.getObjectByName('OlivettiUnderwood280'),camera=r.scene.getObjectByName('Mamiya6451000S'),shelf=typewriter.parent.parent;
  const get=name=>localBounds(r.scene.getObjectByName(name),desk);
  const cable=()=>{const retro=r.retro;retro.group.updateWorldMatrix(true,true);const end=retro.group.worldToLocal(retro.pad.localToWorld(retro.padSocket.clone()));return {endError:end.distanceTo(new T.Vector3(...retro.padCord.userData.endpoint)),startError:retro.consolePort.distanceTo(retro.group.worldToLocal(retro.console.getObjectByName('ConsoleControllerPort').getWorldPosition(new T.Vector3()))),staticCables:retro.staticCables.length};};
  return{objects:names.map(name=>({name,present:!!r.scene.getObjectByName(name)})),oldDesk:['UserWorkstation','UserWorkstationTower','UserDeskTelephone','UserDeskLamp','MiniatureChrysler1971','GamingDesktopPC'].map(name=>!!r.scene.getObjectByName(name)),workstation:localBounds(workstation,desk),mat:get('GamingDeskMat'),landscape:get('GamingLandscapeMonitor'),portrait:get('GamingPortraitMonitor'),arms:get('GamingMonitorArms'),mouse:get('LogitechMXMaster2S'),keyboard:get('Moonlander'),typewriter:localBounds(typewriter,shelf),camera:localBounds(camera,shelf),cameraGalleryTarget:camera.userData.photoGalleryTarget,cable:cable(),plantPaths:['alocasia','bonsai','dracaena'].map(id=>{const from=r.nav.nearest(.9,.7),p=r.nav.path(from,r.stations[id].approach),all=[from,...p];return{id,points:p.length,clear:all.slice(1).every((q,i)=>r.nav.line(all[i],q))};})};
 });
 assert.ok(evidence.objects.every(o=>o.present),'All supplied props must survive loading and batching');assert.ok(evidence.oldDesk.every(v=>!v),'The old desk equipment must be replaced');
 console.log('DESK_BOUNDS',JSON.stringify({mat:evidence.mat,keyboard:evidence.keyboard,mouse:evidence.mouse}));
 for(const b of [evidence.mat,evidence.keyboard,evidence.mouse])assert.ok(b.min[0]>=-.75&&b.max[0]<=.75&&b.min[2]>=-.375&&b.max[2]<=.375,'Controls must fit on the desk');
 assert.ok(evidence.mouse.min[0]>evidence.keyboard.max[0],'Mouse must clear keyboard');
 for(const b of [evidence.keyboard,evidence.mouse])assert.ok(b.min[1]>=evidence.mat.max[1]-.001&&b.min[0]>=evidence.mat.min[0]&&b.max[0]<=evidence.mat.max[0]&&b.min[2]>=evidence.mat.min[2]&&b.max[2]<=evidence.mat.max[2],'Restored controls must rest on the mat');
 assert.ok(evidence.landscape.size[0]>evidence.landscape.size[1]*1.8&&evidence.portrait.size[1]>evidence.portrait.size[0]*1.7,'Keep landscape and portrait orientations');
 assert.ok(evidence.arms.min[1]<.74&&evidence.arms.max[1]>1.1,'Articulated arms must retain their desk clamp');
 for(const b of [evidence.typewriter,evidence.camera])assert.ok(b.min[0]>.04&&b.max[0]<.81&&b.min[2]>-.181&&b.max[2]<.181&&Math.abs(b.min[1]-1.303)<.003,'Shelf props must fit entirely on their shelf');
 assert.ok(evidence.typewriter.max[0]<evidence.camera.min[0]);assert.ok(evidence.cameraGalleryTarget);
 assert.ok(evidence.plantPaths.every(p=>p.points>0&&p.clear),'Desk must not block routes');assert.ok(evidence.cable.endError<1e-5&&evidence.cable.startError<1e-5&&evidence.cable.staticCables===5,'Existing cables must connect to the supplied models');
 console.log('PROP_BOUNDS_OK',JSON.stringify(evidence));await writeFile(path.join(output,'room-user-props.json'),JSON.stringify(evidence,null,2));
 await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.view.tZoom=1;r.target.set(0,.8,0);});await page.waitForTimeout(800);await page.screenshot({path:path.join(output,'room-overview.png')});
 for(const [name,target,zoom,az] of [['desk',[-3.1,1.05,.3],2.3,70],['desk-back',[-3.1,1.1,.3],2.3,240],['shelf',[3.4,1.25,1.8],2.6,105]]){
  await page.evaluate(({target,zoom,az})=>{const r=window.room;r.target.set(...target);r.view.tZoom=zoom;r.view.tAz=az*Math.PI/180;r.view.tEl=30*Math.PI/180;},{target,zoom,az});await page.waitForTimeout(800);await page.screenshot({path:path.join(output,'prop-'+name+'.png')});
 }
 await page.evaluate(()=>window.room.director.placeInto(window.room.stations.sofa));
 await page.waitForFunction(()=>window.room.retro.padHeld&&window.room.director.mode==='activity',null,{timeout:120000});
 await page.waitForFunction(()=>{const r=window.room,p=r.retro.pad.getWorldPosition(r.hero.group.position.clone()),h=r.hero.wp('hand_l').add(r.hero.wp('hand_r')).multiplyScalar(.5);return p.distanceTo(h)<.06;},null,{timeout:120000});
 const playing=[];for(let i=0;i<5;i++){await page.waitForTimeout(120);playing.push(await page.evaluate(async()=>{const T=await import('three'),r=window.room,retro=r.retro;retro.group.updateWorldMatrix(true,true);const end=retro.group.worldToLocal(retro.pad.localToWorld(retro.padSocket.clone()));return{held:retro.padHeld,endError:end.distanceTo(new T.Vector3(...retro.padCord.userData.endpoint)),pad:retro.pad.position.toArray()};}));}assert.ok(playing.every(s=>s.held&&s.endError<1e-5));
 await page.evaluate(()=>{const r=window.room;r.target.set(-.35,.75,3.8);r.view.tZoom=2.3;r.view.tAz=140*Math.PI/180;});await page.waitForTimeout(800);await page.screenshot({path:path.join(output,'ps1-in-hands.png')});
 await page.evaluate(()=>window.room.director.stand());await page.waitForFunction(()=>!window.room.retro.padHeld,null,{timeout:120000});
 await page.waitForFunction(()=>window.room.retro.pad.position.distanceTo({x:.28,y:0,z:.78})<.008,null,{timeout:120000});
 const after=await page.evaluate(()=>({frames:Number(document.getElementById('room').dataset.sceneFrames),native:document.getElementById('room').dataset.native}));
 const installation=await page.evaluate(async()=>{
  const T=await import('three'),r=window.room,desk=r.scene.getObjectByName('GamingDeskSetup').parent,chair=r.scene.getObjectByName('HermanMillerSetu'),mobile=r.scene.getObjectByName('USMHallerMobile'),tower=r.scene.getObjectByName('DreamComputerRTX4090');
  const bounds=o=>new T.Box3().setFromObject(o),cb=bounds(chair),mb=bounds(mobile),tb=bounds(tower),inv=desk.matrixWorld.clone().invert(),keyboard=r.scene.getObjectByName('Moonlander').getWorldPosition(new T.Vector3()).applyMatrix4(inv),seat=new T.Vector3(-2.15,0,.48).applyMatrix4(inv);
  const screens=['LandscapeWindows11Screen','PortraitWindows11Screen'].map(name=>{const o=r.scene.getObjectByName(name);return{name,desktop:o.userData.desktop,canvas:o.material.map.image.src,ink:o.parent.children.filter(c=>c.userData.isInk).length};});
  const tv=r.retro.tv.getWorldPosition(new T.Vector3()),pelvis=r.hero.wp('pelvis');return{overlap:cb.intersectsBox(mb),lateralGap:cb.min.z-mb.max.z,chairKeyboardOffset:Math.abs(seat.x-keyboard.x),tower:tb.getSize(new T.Vector3()).toArray(),screens,wires:r.scene.getObjectByName('DeskConnectedCables').children.filter(o=>o.userData.endpoints).map(o=>({name:o.name,endpoints:o.userData.endpoints})),bar:!!r.scene.getObjectByName('LandscapeMonitorLightBar'),GPU:r.scene.getObjectByName('AsusROGRTX4090').userData};
 });
 assert.equal(installation.overlap,false,'Chair and pedestal must not intersect');assert.ok(installation.lateralGap>.03);assert.ok(installation.chairKeyboardOffset<.015);assert.ok(installation.screens.every(s=>s.desktop==='Windows11-spanned'&&s.ink===0));assert.equal(installation.wires.length,8);assert.ok(installation.bar&&installation.GPU.replacement==='RTX2080ti');
 await page.evaluate(()=>window.room.director.placeInto(window.room.stations.sofa));await page.waitForFunction(()=>window.room.director.mode==='activity');await page.waitForTimeout(1800);
 const facing=await page.evaluate(async()=>{const T=await import('three'),r=window.room,p=r.hero.wp('pelvis'),v=r.retro.tv.getWorldPosition(new T.Vector3()).sub(p);v.y=0;v.normalize();return{dot:new T.Vector3(0,0,1).applyQuaternion(r.hero.group.quaternion).dot(v),position:p.toArray()};});assert.ok(facing.dot>.99,'Mathieu must face the TV when playing');
 await page.mouse.click(110,110);await page.evaluate(async()=>{const r=window.room;r.pauseAutonomy(600000);await r.pumpSound.unlock();r.director.placeInto(r.stations.bike);});await page.waitForFunction(()=>window.room.bicyclePump.state.active&&window.room.pumpSound.state.events>2);
 const audio=await page.evaluate(()=>({...window.room.pumpSound.state}));assert.ok(audio.ready&&audio.unlocked&&audio.events>2);await page.evaluate(()=>window.room.setSceneMuted(true));assert.equal(await page.evaluate(()=>window.room.pumpSound.state.playing),0);await page.evaluate(()=>{window.room.setSceneMuted(false);window.room.director.stand();});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.room.pumpSound.state.playing),0);
 await writeFile(path.join(output,'installation-v43.json'),JSON.stringify({installation,facing,audio},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(path.join(output,'room-user-props.json'),JSON.stringify({...evidence,playing,after,errors,missing},null,2));console.log('SUPPLIED_ROOM_PROPS_OK');
}finally{await browser.close();}
