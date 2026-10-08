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
await page.evaluate(()=>{window.room.pauseAutonomy(600000);window.room.opts.noAdapt=true;for(const s of Object.values(window.room.stations))s.maxMs=300000;});
assert.equal(await page.evaluate(()=>{return !!window.room.scene.getObjectByName('NativeExactDeskSet')?.getObjectByName('Setu task chair');}),false,'Imported desk must not contain a second office chair');
await page.screenshot({path:path.join(output,'fit-standing.png')});
const report=[];
for (const id of ['ekstrem','alocasia','desk','sofa']) {
 console.log('Checking activity:',id);
 await page.evaluate(id=>window.room.director.placeInto(window.room.stations[id]),id);
 await page.waitForFunction(()=>window.room.director.mode==='activity');
 if(id!=='sofa') {
  // Software WebGL runners advance the capped simulation clock more slowly.
  // Keep the activity assertion and allow its authored approach to complete.
  try {
   await page.waitForFunction(id=>{const a=document.querySelector('iframe').contentWindow.shupiHeader.scene;return a.simDoing?.doing==='busy' && a.simDoing?.busy==={ekstrem:'read',alocasia:'water',desk:'work'}[id]},id,{timeout:120000});
  } catch(error) {
   const diagnostic=await page.evaluate(()=>{const r=window.room,s=document.querySelector('iframe').contentWindow.shupiHeader;return {mode:r.director.mode,source:s.scene.simDoing,position:s.scene.shupi.model.position.toArray(),frames:document.getElementById('room').dataset.sceneFrames};});
   await writeFile(path.join(output,'activity-'+id+'-failure.json'),JSON.stringify(diagnostic,null,2));
   await page.screenshot({path:path.join(output,'activity-'+id+'-failure.png')});
   console.error('Activity did not start:',id,JSON.stringify(diagnostic));
   await browser.close();
   throw error;
  }
 }
 if(['ekstrem','alocasia'].includes(id)) await page.waitForFunction(id=>window.room.scene.getObjectByName('NativeExact:iso:'+(id==='ekstrem'?'book':'can'))?.visible,id,{timeout:15000});
 await page.waitForTimeout(id==='alocasia'?300:1500);
 // Sample the animated state before a slow software screenshot can finish it.
 report.push(await page.evaluate(async id=>{let T=await import('three'),r=window.room,a=document.querySelector('iframe').contentWindow.shupiHeader.scene;
 const obj=n=>r.scene.getObjectByName(n);const book=obj('NativeExact:iso:book'),can=obj('NativeExact:iso:can');
 const pos=o=>o?.getWorldPosition(new T.Vector3()).toArray();
 return {id,source:a.simDoing,head:pos(r.hero.head),pelvis:pos(r.hero.bones.pelvis),handL:pos(r.hero.bones.hand_l),handR:pos(r.hero.bones.hand_r),book:{visible:book?.visible,pos:pos(book)},can:{visible:can?.visible,pos:pos(can)},frames:document.getElementById('room').dataset.sceneFrames};},id));
 await writeFile(path.join(output,'activity-states.json'),JSON.stringify(report,null,2));
 await page.screenshot({path:path.join(output,'activity-'+id+'.png')});
 if(process.env.SCENE_EXPORT_POSES==='1' && ['ekstrem','desk','sofa'].includes(id)) {
  const snapshot=await page.evaluate(async id=>{const {GLTFExporter}=await import('/tools/GLTFExporter.js'),T=await import('three');let r=window.room;const furniture=r.scene.children.flatMap(o=>o.children).find(o=>o.userData.id===(id==='sofa'?'sofa':'chair'));r.scene.updateMatrixWorld(true);const pose=Object.fromEntries(Object.entries(r.hero.bones).map(([n,b])=>[n,{position:b.getWorldPosition(new T.Vector3()).toArray(),matrix:b.matrixWorld.toArray()}]));const baked=new T.Group();for(const root of [r.hero.group,furniture])root?.traverseVisible(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone(),p=geometry.attributes.position,v=new T.Vector3();o.skeleton?.update();for(let i=0;i<p.count;i++){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);p.setXYZ(i,v.x,v.y,v.z);}geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,o.material);mesh.name=o.name;baked.add(mesh);});const glb=await new GLTFExporter().parseAsync(baked,{binary:true});return {bytes:Array.from(new Uint8Array(glb)),pose};},id);
  await writeFile(path.join(output,'pose-'+id+'.glb'),Buffer.from(snapshot.bytes));
  await writeFile(path.join(output,'pose-'+id+'.json'),JSON.stringify(snapshot.pose,null,2));
 }
}
for(const item of report){const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));if(item.id==='ekstrem'){assert.ok(item.book.visible);assert.ok(distance(item.book.pos,item.handL.map((x,i)=>(x+item.handR[i])/2))<.15,'Book must stay between both hands');}if(item.id==='alocasia'){assert.ok(item.can.visible);assert.ok(Math.min(distance(item.can.pos,item.handL),distance(item.can.pos,item.handR))<.5,'Watering can must stay in a hand');}}
await page.evaluate(()=>{window.room.director.stand();window.room.director.setRun(true);window.room.director.go(window.room.stations.alocasia);});
await page.waitForTimeout(2000);
const movement=await page.evaluate(()=>{let r=window.room,e=r.scene.getObjectByName('NativeMotionEffects'),visible=0;e.traverseVisible(o=>{if(o.isMesh)visible++;});const a=document.querySelector('iframe').contentWindow.audioEvidence;return {mode:r.director.mode,run:r.director.running,effects:visible,audio:a.filter(s=>s.peak>0&&s.state==='running').length};});
assert.ok(movement.effects>0,'Original walking/running particles must be visible');assert.ok(movement.audio>0,'Original action sounds must generate audible buffers');
await page.evaluate(()=>window.room.director.lift());await page.waitForTimeout(400);await page.evaluate(()=>{let p=window.room.hero.group.position;window.room.director.drop(p.x,p.z);});await page.waitForTimeout(800);
assert.deepEqual(errors,[],'Activities must not stop the rendering loop');
await writeFile(path.join(output,'feature-test.json'),JSON.stringify({report,movement,errors},null,2));console.log(JSON.stringify({report,movement,errors},null,2));await browser.close();
