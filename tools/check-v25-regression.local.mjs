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

const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'light'});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.text().slice(0,220))});
await context.addInitScript(()=>{window.audioEvidence=[];const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const b=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<b.length;i+=64)peak=Math.max(peak,Math.abs(b[i]));window.audioEvidence.push({peak,state:this.context.state});}return original.apply(this,args);};});
    await context.route('http://scene.test/**', async (route) => {
      const url = new URL(route.request().url());
      const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!filename.startsWith(root)) return route.fulfill({ status: 403 });
      try {
        let body = await readFile(filename);if(filename.endsWith('project-dioramas.js'))body=Buffer.from(body.toString().replace('controls.update();','window.__processModel=model;controls.update();'));
        await route.fulfill({ body, contentType: types[path.extname(filename)] || 'application/octet-stream' });
      } catch {
        await route.fulfill({ status: 404, body: url.pathname });
      }
    });


const evidence={character:{},graphics:[],layouts:[]};await page.goto('http://scene.test/');await page.waitForFunction(()=>document.querySelector('#room')?.dataset.native==='ready',null,{timeout:180000});await page.evaluate(()=>{window.room.pauseAutonomy(3600000);for(const s of Object.values(window.room.stations))s.maxMs=3600000;});await page.waitForFunction(()=>document.querySelector('#room').dataset.greeting==='true');evidence.character.greetingSamples=[];let capturedGreeting=false;for(let n=0;n<10;n++){const sample=await page.evaluate(()=>{const h=window.room.hero;return {hand:h.wp('hand_r').y,left:h.wp('hand_l').y,head:h.wp('Head').y};});evidence.character.greetingSamples.push(sample);if(!capturedGreeting&&Math.max(sample.hand,sample.left)>sample.head-.28){await page.screenshot({path:path.join(output,'salut.png')});capturedGreeting=true;}await page.waitForTimeout(160);}assert.ok(capturedGreeting,'Greeting visibly raises a hand');await page.waitForFunction(()=>document.querySelector('#room').dataset.greeting==='false');await page.evaluate(()=>window.room.director.go(window.room.stations.sofa));await page.waitForFunction(()=>window.room.director.mode==='thinking');await page.waitForTimeout(550);assert.ok(await page.locator('#bubble').evaluate(e=>e.classList.contains('show')));await page.waitForFunction(()=>window.room.director.mode==='activity',null,{timeout:25000});await page.waitForTimeout(2000);assert.equal(await page.locator('#bubble').evaluate(e=>e.classList.contains('show')),false);evidence.character.sofa=await page.evaluate(async()=>{const T=await import('three'),r=window.room,p=r.retro.pad.getWorldPosition(new T.Vector3()),l=r.hero.wp('hand_l'),rr=r.hero.wp('hand_r'),middle=l.clone().add(rr).multiplyScalar(.5);let meshes=0;r.retro.pad.traverse(o=>{if(o.isMesh&&o.visible)meshes++;});return {held:r.retro.padHeld,meshes,distance:p.distanceTo(middle),left:p.distanceTo(l),right:p.distanceTo(rr),mode:document.querySelector('iframe').contentWindow.shupiHeader.scene.simDoing,angles:['l','r'].map(sd=>r.hero.wp('thigh_'+sd).sub(r.hero.wp('calf_'+sd)).angleTo(r.hero.wp('foot_'+sd).sub(r.hero.wp('calf_'+sd)))*180/Math.PI)};});assert.ok(evidence.character.sofa.held&&evidence.character.sofa.meshes>5&&evidence.character.sofa.distance<.03);assert.ok(evidence.character.sofa.angles.every(x=>Math.abs(x-90)<2));await page.evaluate(()=>{const r=window.room;r.target.copy(r.hero.wp('spine_02'));r.view.tZoom=4;r.view.tAz=r.hero.group.rotation.y+.85;r.view.tEl=.3;});await page.waitForTimeout(700);await page.screenshot({path:path.join(output,'sofa-manette.png')});await page.evaluate(()=>window.room.director.stand());await page.waitForFunction(()=>window.room.director.mode==='idle');await page.waitForTimeout(700);assert.equal(await page.locator('#bubble').evaluate(e=>e.classList.contains('show')),false);
await page.locator('#mq-pro').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Number(document.querySelector('#mq-pro').dataset.previewFrames)>5);await page.screenshot({path:path.join(output,'accueil-ateliers.png')});
for(let i=0;i<11;i++){if(i===0)await page.locator('#mq-pro [data-project="0"]').nth(1).click();else await page.locator('.process-projects [data-project="'+i+'"]').click();await page.waitForFunction(()=>{const d=document.querySelector('.process-dialog');return d.dataset.loaded===d.dataset.project&&!!window.__processModel;},null,{timeout:60000});await page.waitForTimeout(450);const item=await page.evaluate(()=>{const m=window.__processModel,n=[];m.traverse(o=>n.push(o.name));const canvas=document.querySelector('.process-stage canvas').getBoundingClientRect(),band=document.querySelector('.process-transform').getBoundingClientRect();return {id:document.querySelector('.process-dialog').dataset.project,static:n.filter(n=>n.startsWith('StaticWorkshop')).length,sprites:n.filter(n=>n.startsWith('TransformingTool')).length,people:n.filter(n=>/Worker|Person|Human/.test(n)).length,overlap:band.top<canvas.bottom};});assert.ok(item.static>0);assert.equal(item.sprites,0);assert.equal(item.people,0);assert.equal(item.overlap,false);evidence.graphics.push(item);await page.screenshot({path:path.join(output,'atelier-'+item.id+'.png')});}
for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(350);const layout=await page.evaluate(()=>{const c=document.querySelector('.process-stage canvas').getBoundingClientRect(),b=document.querySelector('.process-transform').getBoundingClientRect();return {width:innerWidth,overlap:b.top<c.bottom,overflow:document.querySelector('.process-dialog').scrollWidth>innerWidth+1};});assert.equal(layout.overlap,false);assert.equal(layout.overflow,false);evidence.layouts.push(layout);}
assert.deepEqual(errors,[]);await writeFile(path.join(output,'validation.json'),JSON.stringify({...evidence,errors},null,2));console.log('V25_VALIDATION_OK',JSON.stringify(evidence));await browser.close();
