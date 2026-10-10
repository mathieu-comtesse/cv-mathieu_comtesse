import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {sceneTestProfile} from './scene-test-profile.mjs';
console.log('TEST_STARTED');
const {chromium}=await import(process.env.PLAYWRIGHT_PACKAGE?pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href:'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),output=path.resolve(root,process.env.SCENE_TEST_OUTPUT||'../../outputs/v48-local');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE,args:['--enable-webgl','--use-angle='+ (process.env.SCENE_WEBGL_BACKEND||'swiftshader'),'--enable-unsafe-swiftshader']});
console.log('BROWSER_STARTED');
const context=await browser.newContext({viewport:{width:1265,height:712},deviceScaleFactor:1}),page=await context.newPage(),errors=[],missing=[];
page.setDefaultTimeout(120000);page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.mp3':'audio/mpeg','.woff2':'font/woff2'};
if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**',async route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await readFile(f),contentType:types[path.extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:u.pathname});}});


const events=[];
await page.addInitScript(()=>{
 const list=[];window.musicEvidence=list;
 let callback;
 Object.defineProperty(window,'onSpotifyIframeApiReady',{configurable:true,get:()=>callback,set:fn=>{
  callback=A=>fn({createController:(slot,options,done)=>A.createController(slot,options,c=>{
   const listen=c.addListener.bind(c);
   c.addListener=(name,handler)=>listen(name,e=>{
    if(name==='playback_update'||name==='playback_started')list.push({at:Date.now(),name,data:e.data});
    handler(e);
   });
   done(c);
  })});
 }});
});
const url=process.env.SCENE_PUBLIC_URL||'http://scene.test/';
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('room')?.dataset.sceneReady==='true');
 await page.evaluate(()=>room.pauseAutonomy(300000));
 await page.getByRole('button',{name:'Lancer la musique',exact:true}).click();
 let done=false;
 for(let i=0;i<30;i++){
  await page.waitForTimeout(5000);
  const state=await page.locator('#spotify-player').evaluate(e=>({...e.dataset}));
  const title=await page.locator('.mp-play').innerText();events.push({at:Date.now(),title,...state});console.log('MUSIC',JSON.stringify(events.at(-1)));
  if(Number(state.generation)>=3&&state.state==='playing'&&Number(state.position)>3000){done=true;break;}
 }
 assert.ok(done,'Deux passages automatiques puis le troisième titre doivent être observés');
 await page.screenshot({scale:'css',path:path.join(output,'musique-continue.png')});
 await page.getByRole('button',{name:'Mettre en pause',exact:true}).click();await page.waitForTimeout(2000);
 assert.equal(await page.locator('#spotify-player').getAttribute('data-state'),'paused');
 await page.getByRole('button',{name:'Reprendre',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#spotify-player').dataset.state==='playing');
 const provider=await page.evaluate(()=>window.musicEvidence);
 await writeFile(path.join(output,'music-live.json'),JSON.stringify({events,provider,errors,missing},null,2));
 console.log('MUSIC_LIVE_OK',JSON.stringify({titles:[...new Set(events.map(e=>e.title))],automaticTransitions:Number(events.at(-1).generation)-1,errors,missing}));
}finally{await writeFile(path.join(output,'music-provider-last.json'),JSON.stringify(await page.evaluate(()=>window.musicEvidence),null,2));await browser.close();}
