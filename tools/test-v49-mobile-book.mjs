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

const url=process.env.SCENE_PUBLIC_URL||'http://scene.test/';const evidence={};
const swipe=async(x,y,dx,dy,hold=0)=>{const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});if(hold)await page.waitForTimeout(hold);for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);};
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('room')?.dataset.sceneReady==='true');await page.evaluate(()=>{room.pauseAutonomy(600000);room.opts.noAdapt=true;});
 evidence.arm=await page.evaluate(()=>{const m=[];room.hero.group.traverse(o=>{if(o.isMesh)for(const q of Array.isArray(o.material)?o.material:[o.material])if(q.name==='RightArmBlackTattoo')m.push(q.color.getHexString());});return m;});assert.ok(evidence.arm.length);assert.ok(evidence.arm.every(c=>c==='1c2833'));
 evidence.chair=await page.evaluate(()=>{const c=room.scene.getObjectByName('HermanMillerSetu'),base=c.getObjectByName('SetuFixedBase'),points=[];base.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)>.27&&p.getY(i)<.33)points.push([p.getX(i),p.getY(i),p.getZ(i)]);}});return {axis:c.userData.swivelAxis,samples:points.length,ranges:points.length?[0,1,2].map(k=>[Math.min(...points.map(p=>p[k])),Math.max(...points.map(p=>p[k]))]):[],swivel:c.userData.swivel.position.toArray()};});console.log('CHAIR_AXIS',JSON.stringify(evidence.chair));
 await swipe(190,350,0,-220);evidence.roomScroll=await page.evaluate(()=>scrollY);assert.ok(evidence.roomScroll>120);
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);
 const beforeZoom=await page.evaluate(()=>({zoom:room.view.tZoom,w:room.renderer.domElement.width,h:room.renderer.domElement.height,page:visualViewport.scale}));
 const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:155,y:245,id:1},{x:235,y:335,id:2}]});
 for(let i=1;i<=16;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:155-i*5,y:245-i*5,id:1},{x:235+i*5,y:335+i*5,id:2}]});await page.waitForTimeout(22);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);
 const afterZoom=await page.evaluate(()=>({zoom:room.view.tZoom,w:room.renderer.domElement.width,h:room.renderer.domElement.height,page:visualViewport.scale,mode:room.cameraMode}));
 evidence.pinch={before:beforeZoom,after:afterZoom};assert.ok(afterZoom.zoom>beforeZoom.zoom*2);assert.ok(afterZoom.w*afterZoom.h>beforeZoom.w*beforeZoom.h*3);assert.equal(afterZoom.page,beforeZoom.page);assert.equal(afterZoom.mode,'free');
 await swipe(190,350,0,-180);evidence.afterPinchScroll=await page.evaluate(()=>scrollY);assert.ok(evidence.afterPinchScroll>100);
 await page.locator('.process-gallery').scrollIntoViewIfNeeded();const gallery=page.locator('.process-gallery'),rail=gallery.locator('.mq-scroll');
 evidence.loop=[];const gr=await gallery.boundingBox(),gy=Math.min(650,Math.max(150,gr.y+190));
 for(let i=0;i<45;i++){await swipe(340,gy,-270,0);if(i%10===0)evidence.loop.push(await rail.evaluate(e=>({x:e.scrollLeft,period:+e.parentElement.dataset.marqueePeriod,wraps:+e.parentElement.dataset.loopCount,live:e.parentElement.dataset.previewActive})));assert.ok(await rail.evaluate(e=>e.scrollLeft>10&&e.scrollLeft<e.scrollWidth-e.clientWidth-10));}
 assert.ok(evidence.loop.at(-1).wraps>evidence.loop[0].wraps);
 for(let i=0;i<15;i++)await swipe(40,gy,280,0);
 const visibleCard=await gallery.locator('.process-card').evaluateAll(cards=>cards.find(c=>{const r=c.getBoundingClientRect();return r.left>=-10&&r.left<200;})?.dataset.project);assert.ok(visibleCard!==undefined);
 await gallery.screenshot({path:path.join(output,'projets-mobile.png')});
 await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>room.activate('mamiya'));
 const album=page.locator('.film-album');await page.waitForFunction(()=>document.querySelector('.film-loading').hidden);
 evidence.book=await album.evaluate(e=>({width:e.offsetWidth,height:e.offsetHeight,viewport:[innerWidth,innerHeight],spread:e.dataset.spread}));assert.ok(evidence.book.height<844*.85);await page.screenshot({scale:'css',path:path.join(output,'livre-mobile.png')});
 const br=await album.locator('.film-right').boundingBox();await swipe(br.x+br.width*.8,br.y+br.height*.5,-br.width*.6,0);assert.equal(await album.getAttribute('data-spread'),'0');
 evidence.photos=[];for(let spread=0;spread<10;spread++){await page.waitForFunction(n=>document.querySelector('.film-album').dataset.spread===String(n)&&document.querySelector('.film-loading').hidden,spread);const photos=await album.locator('.film-photo').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})));for(const im of photos){await page.waitForFunction(src=>[...document.querySelectorAll('.film-photo')].find(i=>i.getAttribute('src')===src)?.naturalWidth>0,im.src);evidence.photos.push(im.src);}if(spread<9){await album.locator('.film-right').click();await page.waitForFunction(()=>document.querySelector('.film-album').dataset.turning==='true');if(spread===0){await page.waitForTimeout(430);assert.ok(await album.evaluate(e=>e.dataset.turning==='true'));}if(spread===0)await page.screenshot({scale:'css',path:path.join(output,'livre-page-tourne.png')});await page.waitForFunction(()=>document.querySelector('.film-album').dataset.turning==='false');}}
 assert.equal(new Set(evidence.photos).size,20);await album.locator('.film-left').click();await page.waitForFunction(()=>document.querySelector('.film-album').dataset.spread==='8');await album.locator('.film-close').click();assert.equal(await album.evaluate(e=>e.open),false);
 await page.goto(new URL('info.html',url).href);await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.shupiPortrait);await page.waitForTimeout(500);
 const head=await page.evaluate(()=>{const f=document.querySelector('iframe'),a=f.contentWindow.shupiPortrait.scene,r=f.getBoundingClientRect(),v=a._target.clone();a.character.getObjectByName('Base_HumanHead').getWorldPosition(v);v.project(a.camera);return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};});
 const geometry=()=>page.evaluate(()=>{const a=document.querySelector('iframe').contentWindow.shupiPortrait.scene,arrays=[];a.character.traverse(o=>{if(o.name.endsWith(' deformable')){const p=o.geometry.attributes.position.array;for(let i=0;i<p.length;i+=Math.max(1,Math.floor(p.length/6000)))arrays.push(p[i]);}});return arrays;});
 const geoBefore=await geometry();await swipe(head.x,head.y,60,15,300);const geoAfter=await geometry();evidence.deformed=geoAfter.filter((v,i)=>Math.abs(v-geoBefore[i])>.0001).length;
 let sy=await page.evaluate(()=>scrollY);await swipe(head.x,head.y,0,-170,400);evidence.infoDown=await page.evaluate(()=>scrollY)-sy;assert.ok(evidence.infoDown>90,'Info défile vers le bas même après maintien');
 sy=await page.evaluate(()=>scrollY);await swipe(190,400,0,160,400);evidence.infoUp=sy-await page.evaluate(()=>scrollY);assert.ok(evidence.infoUp>80,'Info défile vers le haut');
 await page.screenshot({scale:'css',path:path.join(output,'info-mobile.png')});
 await page.goto(url);await page.waitForFunction(()=>document.getElementById('room')?.dataset.sceneReady==='true');await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{room.pauseAutonomy(600000);room.activate('mamiya');});await page.waitForFunction(()=>document.querySelector('.film-loading').hidden);await page.screenshot({scale:'css',path:path.join(output,'livre-bureau.png')});
 await album.locator('.film-right').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.film-album').dataset.spread==='1');await page.keyboard.press('Escape');assert.equal(await album.evaluate(e=>e.open),false);
 await page.evaluate(()=>room.activate('mamiya'));await page.mouse.click(10,10);assert.equal(await album.evaluate(e=>e.open),false);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(path.join(output,'validation-v49.json'),JSON.stringify({...evidence,errors,missing},null,2));console.log('V49_OK',JSON.stringify(evidence));
}finally{await writeFile(path.join(output,'partial-v49.json'),JSON.stringify({...evidence,errors,missing},null,2));await browser.close();}
