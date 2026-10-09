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

await page.goto('http://scene.test/');await page.waitForFunction(()=>document.getElementById('room')?.dataset.native==='ready',null,{timeout:180000});await page.evaluate(()=>{let r=window.room;r.pauseAutonomy(3600000);r.opts.noAdapt=true;for(const s of Object.values(r.stations))s.maxMs=3600000;});


const evidence=[];
for(const id of ['desk','ekstrem','sofa']){
 await page.evaluate(id=>window.room.director.placeInto(window.room.stations[id]),id);await page.waitForFunction(()=>window.room.director.mode==='activity');await page.waitForTimeout(4500);
 await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.target.copy(r.hero.wp('spine_02'));r.view.tZoom=4;r.view.tAz=r.hero.group.rotation.y+2.1;r.view.tEl=.15;});await page.waitForTimeout(600);
 const snap=await page.evaluate(async()=>{const T=await import('three'),{GLTFExporter}=await import('/tools/GLTFExporter.js'),r=window.room;r.scene.updateMatrixWorld(true);const baked=new T.Group(),root=r.hero.group;const add=o=>{if(!o.isMesh||o.userData.isInk)return;const g=o.geometry.clone(),p=g.attributes.position,v=new T.Vector3();o.skeleton?.update();for(let i=0;i<p.count;i++){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);p.setXYZ(i,v.x,v.y,v.z);}g.deleteAttribute('skinIndex');g.deleteAttribute('skinWeight');g.computeVertexNormals();const mesh=new T.Mesh(g,o.material);mesh.name=(root===o||root.getObjectById(o.id)?'Avatar_':'Seat_')+o.name;baked.add(mesh);};root.traverseVisible(add);
 let seatRoot;r.scene.traverse(o=>{if(!seatRoot&&o.userData.id===r.director.current.seatId&&!o.isMesh)seatRoot=o;});seatRoot?.traverseVisible(add);
 const bones=Object.fromEntries(['pelvis','thigh_l','calf_l','foot_l','ball_l','thigh_r','calf_r','foot_r','ball_r'].map(n=>[n,r.hero.wp(n).toArray()]));
 const metrics=['l','r'].map(sd=>{const hip=r.hero.wp('thigh_'+sd),knee=r.hero.wp('calf_'+sd),ankle=r.hero.wp('foot_'+sd),q=r.hero.bones['foot_'+sd].getWorldQuaternion(new T.Quaternion()).multiply(r.hero.footToSole.get(r.hero.bones['foot_'+sd]));return {side:sd,knee:hip.clone().sub(knee).angleTo(ankle.clone().sub(knee))*180/Math.PI,ankle:knee.clone().sub(ankle).angleTo(new T.Vector3(0,0,1).applyQuaternion(q))*180/Math.PI,up:new T.Vector3(0,1,0).applyQuaternion(q).y};});const glb=await new GLTFExporter().parseAsync(baked,{binary:true});return {bytes:Array.from(new Uint8Array(glb)),metrics,bones,nb:!!r.scene.getObjectByName('NB992:left'),original:r.hero.model.getObjectByName('shoes').visible};});
 assert.ok(!snap.nb&&snap.original);await writeFile(path.join(output,'seat-'+id+'.glb'),Buffer.from(snap.bytes));await writeFile(path.join(output,'seat-'+id+'.json'),JSON.stringify({bones:snap.bones,metrics:snap.metrics},null,2));await page.screenshot({path:path.join(output,'seat-'+id+'.png')});evidence.push({id,metrics:snap.metrics});console.log('SEAT',JSON.stringify(evidence.at(-1)));
}
assert.deepEqual(errors,[]);await writeFile(path.join(output,'seat-validation.json'),JSON.stringify(evidence,null,2));console.log('V24_SEATS_OK');await browser.close();