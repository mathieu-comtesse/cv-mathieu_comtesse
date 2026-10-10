import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {sceneTestProfile} from './scene-test-profile.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_PACKAGE?pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href:'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),output=path.resolve(root,process.env.SCENE_TEST_OUTPUT||'test-results');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE,args:['--enable-webgl','--use-angle='+ (process.env.SCENE_WEBGL_BACKEND||'swiftshader'),'--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1}),page=await context.newPage(),errors=[],missing=[];
page.setDefaultTimeout(120000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**',async route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await readFile(f),contentType:types[path.extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:u.pathname});}});
try{
 await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('room')?.dataset.sceneReady==='true',null,{timeout:120000});
 await page.evaluate(()=>{const r=window.room;r.pauseAutonomy(600000);r.opts.noAdapt=true;for(const st of Object.values(r.stations))st.maxMs=300000;});await sceneTestProfile(page);
 await page.waitForFunction(()=>document.getElementById('room')?.dataset.native==='ready',null,{timeout:180000});
 const evidence=await page.evaluate(async()=>{
  const T=await import('three'),r=window.room;const names=['UserWorkstationMonitor','UserWorkstationKeyboard','UserWorkstationTower','UserWorkstationMouse','UserDeskTelephone','UserDeskLamp','UserDeskStapler','UserDeskPencils','OlivettiUnderwood280','Mamiya6451000S','MiniatureChrysler1971','SuppliedPlayStation1','SuppliedPS1Controller'];
  const localBounds=(obj,parent)=>{parent.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(obj),inv=parent.matrixWorld.clone().invert(),points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new T.Vector3(x,y,z).applyMatrix4(inv));const box=new T.Box3().setFromPoints(points);return{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new T.Vector3()).toArray(),center:box.getCenter(new T.Vector3()).toArray()};};
  const workstation=r.scene.getObjectByName('UserWorkstation'),desk=workstation.parent,typewriter=r.scene.getObjectByName('OlivettiUnderwood280'),camera=r.scene.getObjectByName('Mamiya6451000S'),shelf=typewriter.parent.parent,car=r.scene.getObjectByName('MiniatureChrysler1971');
  const get=name=>localBounds(r.scene.getObjectByName(name),desk);
  const cable=()=>{const retro=r.retro;retro.group.updateWorldMatrix(true,true);const end=retro.group.worldToLocal(retro.pad.localToWorld(retro.padSocket.clone()));return {endError:end.distanceTo(new T.Vector3(...retro.padCord.userData.endpoint)),startError:retro.consolePort.distanceTo(retro.group.worldToLocal(retro.console.getObjectByName('ConsoleControllerPort').getWorldPosition(new T.Vector3()))),staticCables:retro.staticCables.length};};
  return{objects:names.map(name=>({name,present:!!r.scene.getObjectByName(name)})),oldDesk:['Moonlander','CurvedLandscapeMonitor','PortraitMonitor','GamingDesktopPC'].map(name=>!!r.scene.getObjectByName(name)),workstation:localBounds(workstation,desk),phone:get('UserDeskTelephone'),mouse:get('UserWorkstationMouse'),keyboard:get('UserWorkstationKeyboard'),stapler:get('UserDeskStapler'),typewriter:localBounds(typewriter,shelf),camera:localBounds(camera,shelf),car:localBounds(car,r.scene),cameraGalleryTarget:camera.userData.photoGalleryTarget,cable:cable(),plantPaths:['alocasia','bonsai','dracaena'].map(id=>{const from=r.nav.nearest(.9,.7),p=r.nav.path(from,r.stations[id].approach),all=[from,...p];return{id,points:p.length,clear:all.slice(1).every((q,i)=>r.nav.line(all[i],q))};})};
 });
 assert.ok(evidence.objects.every(o=>o.present),'All supplied props must survive loading and batching');assert.ok(evidence.oldDesk.every(v=>!v),'The old desk equipment must be replaced');
 assert.ok(evidence.workstation.min[0]>=-.94&&evidence.workstation.max[0]<=.94&&evidence.workstation.min[2]>=-.41&&evidence.workstation.max[2]<=.41,'Workstation must fit on the desk');
 assert.ok(evidence.phone.center[0]>.3&&evidence.mouse.center[0]>.1);assert.ok(evidence.stapler.center[0]<-.6);assert.ok(evidence.mouse.min[0]>evidence.keyboard.max[0], 'Mouse must clear keyboard');
 for(const b of [evidence.typewriter,evidence.camera])assert.ok(b.min[0]>.04&&b.max[0]<.81&&b.min[2]>-.181&&b.max[2]<.181&&Math.abs(b.min[1]-1.303)<.003,'Shelf props must fit entirely on their shelf');
 assert.ok(evidence.typewriter.max[0]<evidence.camera.min[0]);assert.ok(evidence.cameraGalleryTarget);assert.ok(Math.abs(evidence.car.min[1])<.003&&Math.max(...evidence.car.size)<.78,'Miniature must rest on the floor');
 assert.ok(evidence.plantPaths.every(p=>p.points>0&&p.clear),'Miniature must not block routes');assert.ok(evidence.cable.endError<1e-5&&evidence.cable.startError<1e-5&&evidence.cable.staticCables===5,'Existing cables must connect to the supplied models');
 console.log('PROP_BOUNDS_OK',JSON.stringify(evidence));await writeFile(path.join(output,'room-user-props.json'),JSON.stringify(evidence,null,2));
 await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.view.tZoom=1;r.target.set(0,.8,0);});await page.waitForTimeout(800);await page.screenshot({path:path.join(output,'room-overview.png')});
 for(const [name,target,zoom,az] of [['desk',[-3.1,1.05,.3],2.3,70],['shelf',[3.4,1.25,1.8],2.6,105],['chrysler',[-2.8,.25,-1.9],3.5,40]]){
  await page.evaluate(({target,zoom,az})=>{const r=window.room;r.target.set(...target);r.view.tZoom=zoom;r.view.tAz=az*Math.PI/180;r.view.tEl=30*Math.PI/180;},{target,zoom,az});await page.waitForTimeout(800);await page.screenshot({path:path.join(output,'prop-'+name+'.png')});
 }
 await page.evaluate(()=>window.room.director.placeInto(window.room.stations.sofa));
 await page.waitForFunction(()=>window.room.retro.padHeld&&window.room.director.mode==='activity',null,{timeout:120000});
 await page.waitForFunction(()=>{const r=window.room,p=r.retro.pad.getWorldPosition(r.hero.group.position.clone()),h=r.hero.wp('hand_l').add(r.hero.wp('hand_r')).multiplyScalar(.5);return p.distanceTo(h)<.06;},null,{timeout:120000});
 const playing=[];for(let i=0;i<5;i++){await page.waitForTimeout(120);playing.push(await page.evaluate(async()=>{const T=await import('three'),r=window.room,retro=r.retro;retro.group.updateWorldMatrix(true,true);const end=retro.group.worldToLocal(retro.pad.localToWorld(retro.padSocket.clone()));return{held:retro.padHeld,endError:end.distanceTo(new T.Vector3(...retro.padCord.userData.endpoint)),pad:retro.pad.position.toArray()};}));}assert.ok(playing.every(s=>s.held&&s.endError<1e-5));
 await page.evaluate(()=>{const r=window.room;r.target.set(.8,.75,3.8);r.view.tZoom=2.3;r.view.tAz=140*Math.PI/180;});await page.waitForTimeout(800);await page.screenshot({path:path.join(output,'ps1-in-hands.png')});
 await page.evaluate(()=>window.room.director.stand());await page.waitForFunction(()=>!window.room.retro.padHeld,null,{timeout:120000});
 await page.waitForFunction(()=>window.room.retro.pad.position.distanceTo({x:.28,y:0,z:.78})<.008,null,{timeout:120000});
 const after=await page.evaluate(()=>({frames:Number(document.getElementById('room').dataset.sceneFrames),native:document.getElementById('room').dataset.native}));
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(path.join(output,'room-user-props.json'),JSON.stringify({...evidence,playing,after,errors,missing},null,2));console.log('SUPPLIED_ROOM_PROPS_OK');
}finally{await browser.close();}
