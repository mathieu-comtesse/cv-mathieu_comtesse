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
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],missing=[];
page.setDefaultTimeout(120000);page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**',async route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await readFile(f),contentType:types[path.extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:u.pathname});}});

if(process.env.SCENE_BASELINE){const old=JSON.parse(await readFile(path.resolve(root,'../../outputs/v46-baseline-sources.json'),'utf8'));await context.route('http://scene.test/**',async route=>{const key=new URL(route.request().url()).pathname.slice(1);if(old[key])await route.fulfill({body:old[key],contentType:types[path.extname(key)]});else await route.fallback();});}
const evidence={baseline:!!process.env.SCENE_BASELINE};
try{
 await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('room')?.dataset.sceneReady==='true');
 await page.evaluate(()=>window.room.pauseAutonomy(600000));
 const initial=await page.evaluate(()=>{const r=window.room,nav=document.querySelector('.nav').getBoundingClientRect(),controls=document.querySelector('.scene-controls')?.getBoundingClientRect(),room=document.querySelector('#room').getBoundingClientRect();return{nav:{top:nav.top,bottom:nav.bottom},controls:controls?{top:controls.top,bottom:controls.bottom}:null,room:{top:room.top,bottom:room.bottom},pixels:r.renderer.domElement.width*r.renderer.domElement.height,shadowSize:r.scene.children.find(o=>o.isDirectionalLight)?.shadow.mapSize.x,ledButtons:document.querySelectorAll('.room-led').length};});evidence.initial=initial;
 if(!evidence.baseline){assert.ok(initial.nav.top<40&&initial.nav.bottom<80);assert.ok(initial.controls.top>=initial.room.bottom);assert.equal(initial.ledButtons,0);for(const s of ['.room-camera','.room-navigation','.room-zoom'])assert.equal(await page.locator(s).isVisible(),false);assert.match(await page.locator('.hero-pitch').textContent(),/LLM/);}
 if(!evidence.baseline){const weather=await page.locator('.wx-btn').boundingBox(),fill=await page.locator('.wx-btn .dbtn__fill').boundingBox();assert.ok(fill.y>=weather.y&&fill.y+fill.height<=weather.y+weather.height);}
 await page.screenshot({scale:'css',path:path.join(output,'mobile-accueil.png')});
 const gallery=page.locator('.process-gallery');await gallery.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>Number(document.querySelector('.process-gallery').dataset.previewActive)>0,null,{timeout:90000});
 const record=()=>page.evaluate(()=>{const g=document.querySelector('.process-gallery'),c=g.querySelector('canvas'),card=[...g.querySelectorAll('.process-card')].find(o=>{const r=o.getBoundingClientRect();return r.width>1&&r.left<innerWidth&&r.right>0;});return{frames:Number(g.dataset.previewFrames),active:Number(g.dataset.previewActive),pixels:c.width*c.height,profile:g.dataset.previewProfile,mode:g.dataset.scrollMode,step:card.dataset.step,scroll:g.querySelector('.mq-scroll')?.scrollLeft||0,rootFrames:Number(document.querySelector('#room').dataset.sceneFrames)};});
 evidence.before=await record();await page.waitForTimeout(1200);evidence.after=await record();assert.ok(evidence.after.frames>evidence.before.frames+5,'Ateliers animés sur mobile');
 await page.screenshot({scale:'css',path:path.join(output,'mobile-projets.png')});
 if(!evidence.baseline){
  assert.equal(evidence.after.mode,'native');assert.equal(evidence.after.profile,'mobile');
  await page.waitForFunction(s=>{const c=document.querySelector('.process-card[data-live=true]');return c.dataset.step!==s;},evidence.before.step,{timeout:20000});
  const image=await page.locator('.process-card img').first().boundingBox(),cdp=await context.newCDPSession(page),y=Math.min(650,Math.max(130,image.y+image.height*.55)),startY=await page.evaluate(()=>scrollY);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y}]});
  for(let j=1;j<=12;j++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:330-j*22,y}]});await page.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);evidence.swipe=await record();
  assert.ok(evidence.swipe.scroll>140,'Le geste tactile doit faire défiler les cartes');assert.ok(Math.abs(await page.evaluate(()=>scrollY)-startY)<10);assert.equal(await page.locator('.process-dialog[open]').count(),0);
  await page.screenshot({scale:'css',path:path.join(output,'mobile-apres-defilement.png')});
  await gallery.press('ArrowRight');await page.waitForTimeout(300);
  const clickable=page.getByRole('button',{name:'Explorer VRE / VLE · traitement par VM'});await clickable.click();await page.waitForFunction(()=>Number(document.querySelector('.process-dialog').dataset.frames)>5);await page.screenshot({scale:'css',path:path.join(output,'mobile-atelier.png')});await page.getByRole('button',{name:'Retour aux projets'}).click();
  await page.setViewportSize({width:1440,height:1000});await page.locator('#room').scrollIntoViewIfNeeded();await page.waitForTimeout(900);
  assert.equal(await page.locator('.room-camera').isVisible(),true);assert.equal(await page.locator('.room-navigation').isVisible(),true);assert.equal(await page.locator('.room-zoom').isVisible(),true);
  await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.target.set(-3.1,1.05,.3);r.view.tAz=70*Math.PI/180;r.view.tEl=30*Math.PI/180;r.view.tZoom=2.8;});await page.waitForTimeout(1000);
  const hit=await page.evaluate(async()=>{const T=await import('three'),r=window.room,b=r.scene.getObjectByName('LandscapeMonitorLightBar').getObjectByName('Horizontal_light_bar'),c=new T.Box3().setFromObject(b).getCenter(new T.Vector3());return r.toScreen(c.x,c.y,c.z);});await page.mouse.click(...hit);await page.waitForFunction(()=>!window.room.lamps.screenbar.on);await page.mouse.click(...hit);await page.waitForFunction(()=>window.room.lamps.screenbar.on);
  await page.screenshot({scale:'css',path:path.join(output,'bureau-led-sans-bouton.png')});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await writeFile(path.join(output,'validation-v46.json'),JSON.stringify({...evidence,errors,missing},null,2));console.log('MOBILE_CHECK_OK',JSON.stringify(evidence));
}finally{await browser.close();}
