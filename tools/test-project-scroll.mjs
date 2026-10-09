import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_PACKAGE?pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href:'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),output=path.resolve(root,process.env.SCENE_TEST_OUTPUT||'test-results');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE,args:['--enable-webgl',process.platform==='win32'?'--use-angle=d3d11':'--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});
page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE_ERROR',m.text());}});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**',async route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await readFile(f),contentType:types[path.extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:u.pathname});}});

const evidence={url:process.env.SCENE_PUBLIC_URL||'http://scene.test/'};try{
await page.goto(evidence.url);const gallery=page.locator('.process-gallery');await gallery.scrollIntoViewIfNeeded();
await page.waitForFunction(()=>Number(document.querySelector('.process-gallery').dataset.previewActive)>=3,null,{timeout:90000});
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1000);
await page.evaluate(()=>{window.originalRaf=requestAnimationFrame;window.requestAnimationFrame=()=>9999999;});await page.waitForTimeout(150);
const item=page.locator('.process-card[data-live=true]').nth(await page.evaluate(()=>[...document.querySelectorAll('.process-card[data-live=true]')].findIndex(o=>{const b=o.querySelector('img').getBoundingClientRect();return b.left>12&&b.right<innerWidth-12&&b.top>0&&b.bottom<innerHeight;})));
const rect=await item.locator('img').boundingBox();const before=await page.screenshot({path:path.join(output,'avant-glissement.png')});
await page.mouse.move(rect.x+rect.width*.45,rect.y+rect.height*.65);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.45+80,rect.y+rect.height*.65,{steps:8});
const afterRect=await item.locator('img').boundingBox(),after=await page.screenshot({path:path.join(output,'pendant-glissement.png')});
evidence.pixelComparison=await page.evaluate(async({a,b,r,s})=>{
 const decode=async bytes=>createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));
 const x=await decode(a),y=await decode(b),surface=new OffscreenCanvas(x.width,x.height),ctx=surface.getContext('2d');
 const w=Math.floor(r.width)-24,h=Math.floor(r.height)-24;ctx.drawImage(x,0,0);const old=ctx.getImageData(Math.round(r.x)+12,Math.round(r.y)+12,w,h).data;
 ctx.clearRect(0,0,x.width,x.height);ctx.drawImage(y,0,0);const moved=ctx.getImageData(Math.round(s.x)+12,Math.round(s.y)+12,w,h).data;
 let error=0,changed=0;for(let i=0;i<old.length;i+=4){let d=0;for(let c=0;c<3;c++){d+=Math.abs(old[i+c]-moved[i+c]);error+=Math.abs(old[i+c]-moved[i+c]);}if(d>30)changed++;}
 return {meanError:error/(w*h*3),changedPixels:changed/(w*h),width:w,height:h,cardMovement:s.x-r.x};
},{a:[...before],b:[...after],r:rect,s:afterRect});
console.log('SCROLL_PIXEL_ALIGNMENT',JSON.stringify(evidence.pixelComparison));assert.ok(Math.abs(evidence.pixelComparison.cardMovement-80)<.1);
if(process.env.SCENE_EXPECT_JITTER)assert.ok(evidence.pixelComparison.meanError>1,'Baseline jitter not reproduced');
else assert.ok(evidence.pixelComparison.meanError<.8,'Scene moves relative to its card between WebGL frames');
await page.mouse.up();await page.evaluate(()=>window.requestAnimationFrame=window.originalRaf);
if(!process.env.SCENE_EXPECT_JITTER){
 await gallery.press('ArrowRight');await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(400);
 const record=()=>page.evaluate(()=>{const g=document.querySelector('.process-gallery'),c=g.querySelector('canvas');return {frames:Number(g.dataset.previewFrames),x:Number(c.dataset.trackX),paint:Number(c.dataset.paintX),shift:Number(c.dataset.shift),period:Number(g.dataset.marqueePeriod)};});
 const g=await gallery.boundingBox();await page.mouse.move(g.x+g.width*.75,g.y+180);await page.mouse.down();for(let i=1;i<=18;i++){await page.mouse.move(g.x+g.width*.75-i*32,g.y+180);(evidence.drag??=[]).push(await record());}await page.mouse.up();
 await page.waitForTimeout(250);evidence.inertia=await record();await gallery.press('ArrowLeft');await page.waitForTimeout(200);evidence.keyboard=await record();
 for(let i=0;i<16;i++){await gallery.press('ArrowRight');await page.waitForTimeout(65);}evidence.wrap=await record();assert.ok(evidence.wrap.x<=0&&evidence.wrap.x>=-evidence.wrap.period);assert.ok(evidence.inertia.frames>evidence.drag[0].frames);
 assert.equal(await page.locator('.process-dialog[open]').count(),0);await page.screenshot({path:path.join(output,'projets-defilement-stable.png')});
}
assert.deepEqual(errors,[]);console.log(process.env.SCENE_EXPECT_JITTER?'BASELINE_JITTER_REPRODUCED':'PROJECT_SCROLL_FIXED');
}finally{evidence.errors=errors;await writeFile(path.join(output,'scroll-validation.json'),JSON.stringify(evidence,null,2));await browser.close();}
