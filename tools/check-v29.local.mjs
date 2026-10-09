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
await page.waitForTimeout(1200);
const evidence={};
evidence.painting=await page.evaluate(async()=>{const T=await import('three'),r=window.room;return ['painting','usm','rug'].map(id=>{let o;r.scene.traverse(n=>{if(n.userData.id===id&&!o)o=n;});const b=new T.Box3().setFromObject(o);return {id,min:b.min.toArray(),max:b.max.toArray(),pos:o.position.toArray()};});});
assert.ok(evidence.painting[0].min[1]>.93&&evidence.painting[0].min[2]<evidence.painting[1].min[2]);
assert.equal(evidence.painting[0].pos[0],evidence.painting[1].pos[0]);

await page.evaluate(()=>{const r=window.room;r.setCameraMode('free');r.target.set(-.7,.95,-2.3);r.view.tZoom=2.3;r.view.tAz=.55;r.view.tEl=.3;});await page.waitForTimeout(1200);await page.screenshot({path:path.join(output,'tableau-au-dessus-usm.png')});

evidence.projects=await page.evaluate(async()=>{const D=await import('./js/projects-data.js?v=cv-scene-v29'),P=await import('./js/pages.js?v=cv-scene-v29'),C=await import('./js/data.js?v=cv-scene-v29');return {cards:D.PRO_CARDS.map(p=>({id:p.id,title:p.title})),moteur:D.PRO_CARDS.find(p=>p.id==='moteur44'),oldPage:!!P.PAGES['projet-charte'],oldProject:C.PRO.some(p=>p.id==='projet-charte'),rate:D.HOURLY_RATE};});
assert.equal(evidence.projects.cards.length,11);assert.equal(evidence.projects.oldPage,false);assert.equal(evidence.projects.oldProject,false);assert.ok(!evidence.projects.cards.some(p=>p.id==='charte'));
assert.equal(evidence.projects.moteur.money,'8,73 € / rapport');assert.equal((5/60*evidence.projects.rate).toFixed(2),'8.73');assert.match(evidence.projects.moteur.sub,/Q18 visibles/);
await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('#mq-pro').dataset.previewFrames)>8);
assert.equal(await page.getByRole('button',{name:'Explorer Interface commune',exact:true}).count(),0);
const point=await page.locator('#mq-pro').evaluate(root=>{const a=root.getBoundingClientRect();for(const b of root.querySelectorAll('[data-project]')){const r=b.getBoundingClientRect();if(r.left>=a.left&&r.left+100<a.right)return {x:r.left+50,y:r.top+40};}throw Error('No visible workshop');});await page.mouse.click(point.x,point.y);await page.locator('.process-dialog [data-project="2"]').click();await page.waitForFunction(()=>document.querySelector('.process-dialog').dataset.loaded==='moteur44'&&window.__processModel?.getObjectByName('Moteur44Rotor'));
evidence.gains=await page.locator('.process-outcome').innerText();assert.ok(evidence.gains.includes("5 min / rapport"));assert.ok(evidence.gains.includes("8,73 € / rapport"));assert.match(evidence.gains,/104,74/);assert.match(evidence.gains,/Q18/);
evidence.steps=[];
for(let step=0;step<5;step++){await page.locator('.process-step').nth(step).click();await page.waitForFunction(step=>window.__processModel.userData.activeAction.step===step,step);evidence.steps.push(await page.evaluate(()=>({action:window.__processModel.userData.activeAction,state:window.__processModel.userData.moteur44State})));assert.ok(evidence.steps[step].action.objects.length);}
await page.locator('.process-step').nth(1).click();const rotor0=await page.evaluate(()=>window.__processModel.getObjectByName('Moteur44Rotor').quaternion.toArray());await page.locator('.process-play').click();await page.waitForTimeout(1000);const rotor1=await page.evaluate(()=>window.__processModel.getObjectByName('Moteur44Rotor').quaternion.toArray());assert.ok(Math.hypot(...rotor1.map((x,i)=>x-rotor0[i]))>.1);
await page.locator('.process-step').nth(2).click();await page.waitForFunction(()=>window.__processModel.userData.moteur44State?.excelWritten);assert.ok(await page.evaluate(()=>window.__processModel.getObjectByName('Moteur44ExcelRecord').visible));
await page.locator('.process-step').nth(3).click();await page.locator('.process-play').click();await page.waitForFunction(()=>{const m=window.__processModel,c=m.getObjectByName('Moteur44Q18Shutter');return document.querySelector('.process-dialog').dataset.playing==='true'&&m.userData.moteur44State?.step===3&&m.userData.moteur44State.q18Visible&&c.position.y-c.userData.machineRest.p.y>.9;});await page.locator('.process-play').click();
evidence.q18=await page.evaluate(()=>{const m=window.__processModel,q=m.getObjectByName('Moteur44Q18Record'),c=m.getObjectByName('Moteur44Q18Shutter');return {visible:q.visible,lift:c.position.y-c.userData.machineRest.p.y};});assert.ok(evidence.q18.visible&&evidence.q18.lift>.9);
await page.locator('.process-dialog').screenshot({path:path.join(output,'moteur44-q18-gains.png')});await page.locator('.process-stage').screenshot({path:path.join(output,'moteur44-atelier.png')});await page.locator('.process-outcome').screenshot({path:path.join(output,'moteur44-gains.png')});
evidence.conveyors=[];
for(const id of ['finance','cerfa','studio','powerbi','terrain']){
 const index=evidence.projects.cards.findIndex(p=>p.id===id);await page.locator('.process-dialog [data-project="'+index+'"]').click();await page.waitForFunction(id=>document.querySelector('.process-dialog').dataset.loaded===id&&window.__processModel.userData.conveyors?.length>0,id);
 const before=await page.evaluate(()=>{const m=window.__processModel,roller=m.getObjectByProperty('isMesh',true);let found;m.traverse(o=>{if(!found&&/^LiveRoller_|^LivePaperRoller/.test(o.name))found=o;});return {distance:m.userData.conveyors[0].distance,q:found.quaternion.toArray(),p:found.position.toArray()};});await page.waitForTimeout(600);
 const after=await page.evaluate(()=>{const m=window.__processModel;let found;m.traverse(o=>{if(!found&&/^LiveRoller_|^LivePaperRoller/.test(o.name))found=o;});return {distance:m.userData.conveyors[0].distance,q:found.quaternion.toArray(),p:found.position.toArray(),banks:m.userData.conveyors};});assert.ok(after.distance>before.distance+.01);assert.ok(Math.hypot(...after.q.map((x,i)=>x-before.q[i]))>.01);assert.ok(Math.hypot(...after.p.map((x,i)=>x-before.p[i]))<.00001);evidence.conveyors.push({id,banks:after.banks});
 if(id==='powerbi')await page.locator('.process-stage').screenshot({path:path.join(output,'convoyeur-powerbi.png')});
}
for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(150);assert.ok(await page.locator('.process-dialog').evaluate(d=>d.scrollWidth<=innerWidth+1));}
await page.locator('.process-back').click();await page.waitForTimeout(200);await page.screenshot({path:path.join(output,'accueil-moteur44.png')});assert.deepEqual(errors,[]);await writeFile(path.join(output,'validation.json'),JSON.stringify({...evidence,errors},null,2));console.log('V29_MOTEUR44_OK',JSON.stringify(evidence));await browser.close();
