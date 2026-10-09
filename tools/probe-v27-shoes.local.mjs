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



await page.waitForTimeout(3000);
const snap=await page.evaluate(async()=>{const T=await import('three'),{GLTFExporter}=await import('/tools/GLTFExporter.js'),r=window.room,h=r.hero;h.stop();h.setNativePose(null);h.setPost(null);h.poseStanding();h.group.position.set(0,0,0);h.group.rotation.set(0,0,0);r.scene.updateMatrixWorld(true);const points={left:[],right:[]},data={},baked=new T.Group(),shoeMeshes=[];h.model.getObjectByName('shoes').traverse(o=>{if(o.isMesh&&!o.userData.isInk&&!['Material #382','Material #1064','Material #79'].includes(o.material.name))shoeMeshes.push(o)});
for(const mesh of shoeMeshes){mesh.skeleton.update();const g=mesh.geometry.clone(),p=g.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);p.setXYZ(i,v.x,v.y,v.z);const si=g.attributes.skinIndex,sw=g.attributes.skinWeight;let l=0,rr=0;for(let j=0;j<4;j++){const n=mesh.skeleton.bones[si.getComponent(i,j)]?.name||'';if(n.endsWith('_l'))l+=sw.getComponent(i,j);if(n.endsWith('_r'))rr+=sw.getComponent(i,j);}if(!g.index||Array.from(g.index.array).includes(i))points[l>=rr?'left':'right'].push(v.clone());}g.deleteAttribute('skinIndex');g.deleteAttribute('skinWeight');g.computeVertexNormals();const m=new T.Mesh(g,mesh.material);m.name='Original_'+mesh.name;baked.add(m);}
for(const [side,sd]of [['left','l'],['right','r']]){const bone=h.bones['foot_'+sd],ball=h.bones['ball_'+sd],f=bone.getWorldPosition(new T.Vector3()),fw=ball.getWorldPosition(new T.Vector3()).sub(f);fw.y=0;fw.normalize();const up=new T.Vector3(0,1,0),x=up.clone().cross(fw);const basis=new T.Matrix4().makeBasis(x,up,fw).setPosition(f);const inv=basis.clone().invert(),bb=new T.Box3().setFromPoints(points[side].map(p=>p.clone().applyMatrix4(inv)));data[side]={boneMatrix:bone.matrixWorld.toArray(),basis:basis.toArray(),min:bb.min.toArray(),max:bb.max.toArray(),size:bb.getSize(new T.Vector3()).toArray(),vertices:points[side].map(p=>p.toArray())};}
const glb=await new GLTFExporter().parseAsync(baked,{binary:true});return{bytes:Array.from(new Uint8Array(glb)),data};});
await writeFile(path.join(output,'original-red-shoes.glb'),Buffer.from(snap.bytes));await writeFile(path.join(output,'original-red-shoes.json'),JSON.stringify(snap.data,null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(snap.data).map(([k,v])=>[k,{min:v.min,max:v.max,size:v.size}]))));await browser.close();
