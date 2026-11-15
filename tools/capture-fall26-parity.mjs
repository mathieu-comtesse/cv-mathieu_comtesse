/**
 * Capture automatique de la vraie page comtesse.me pour l'audit Fall '26.
 * Dépendances Shopify bloquées. Images/mesures de la branche courante uniquement.
 * Usage : node tools/capture-fall26-parity.mjs [dossier]
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.argv[2]||path.join(root,'test-results','fall26-parity'));
fs.mkdirSync(output,{recursive:true});
const {chromium}=createRequire(root+'/')('playwright');
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary','.bin':'application/octet-stream','.mp4':'video/mp4'};
const srv=http.createServer((req,res)=>{
 const name=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://talas.test').pathname));
 if(!name.startsWith(root+path.sep)||!fs.existsSync(name)||!fs.statSync(name).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':MIME[path.extname(name)]||'application/octet-stream'});fs.createReadStream(name).pipe(res);
}).listen(0,'127.0.0.1');
await new Promise(r=>srv.listening?r():srv.once('listening',r));
const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={capturedAt:new Date().toISOString(),reference:'Shopify Editions Fall 2026',subject:'comtesse.me',screens:[],problems:[],shopifyRequests:0};
async function run(name,viewport,mobile=false,reduce=false){
 const ctx=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:reduce?'reduce':'no-preference'});
 const page=await ctx.newPage(),errors=[],states=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/shopify(cdn)?\.com/,r=>{report.shopifyRequests++;return r.abort()});
 const local=async r=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(r.request().url()).pathname));
  return p.startsWith(root+path.sep)&&fs.existsSync(p)&&fs.statSync(p).isFile()?r.fulfill({path:p}):r.fulfill({status:404,body:''});};
 await page.route('http://talas.test/**',local);
 await page.route('https://comtesse.me/**',local);
 await page.goto('http://talas.test/index.html',{waitUntil:'load',timeout:90000});
 await page.waitForFunction(()=>!!(window.__cvStandardPath&&document.querySelector('.cv-parity-toggle')),null,{timeout:90000});
 await page.waitForTimeout(2200);
 async function capture(label){
  await page.screenshot({path:path.join(output,name+'-'+label+'.png')});
  const details=await page.evaluate(()=>{
   const box=(x)=>{if(!x)return null;const b=x.getBoundingClientRect(),s=getComputedStyle(x);
    return{x:b.x,y:b.y,w:b.width,h:b.height,font:s.fontFamily,size:s.fontSize,color:s.color}};
   const canvases=[...document.querySelectorAll('canvas')].filter(c=>{const b=c.getBoundingClientRect();return b.width>60&&b.height>60&&b.right>0&&b.bottom>0&&b.left<innerWidth&&b.top<innerHeight});
   return {y:scrollY,expo:document.documentElement.classList.contains('cv-parity-active'),progress:window.__cvStandardPath?.progress,nav:box(document.querySelector('.cv-site-nav')),hero:box(document.querySelector('#hero h1')),chapter:box(document.querySelector('.section-hero-pin h2')),canvases:canvases.length,sections:document.querySelectorAll('[data-f26-page-section]').length,starsVisible:window.__cvParity?.etoiles()?.filter(x=>x.visible).length??null};
  });states.push({label,...details});
 }
 await capture('plat-accueil');
 if(!mobile){const nav=page.locator('.cv-site-nav .cv-nav-control').first();if(await nav.count()){await nav.hover();await page.waitForTimeout(350);await capture('plat-survol')}}
 await page.locator('.cv-parity-toggle').click();
 await page.waitForFunction(()=>window.__cvStandardPath?.active&&window.__cvStandardPath.progress>=.999,null,{timeout:60000});
 await page.waitForTimeout(300);await capture('expo-accueil');
 await page.evaluate(()=>scrollTo({top:Math.min(3800,document.documentElement.scrollHeight-innerHeight),behavior:'instant'}));
 await page.waitForTimeout(900);await capture('expo-chapitre');
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!window.__cvStandardPath?.active,null,{timeout:60000});
 await page.waitForTimeout(350);await capture('plat-retour');
 if(states.find(x=>x.label==='expo-accueil')?.canvases===0)errors.push('Mode Expo sans canvas visible');
 if(states.find(x=>x.label==='plat-retour')?.expo)errors.push('Retour à plat incorrect');
 if(states[0].sections!==11)errors.push('Nombre de chapitres incorrect : '+states[0].sections);
 report.screens.push({name,viewport,reduce,states,errors});await ctx.close();
}
try{await run('desktop-1440x900',{width:1440,height:900});await run('mobile-390x844',{width:390,height:844},true,true)}
catch(e){report.problems.push(e.stack||String(e))}
finally{await browser.close();await new Promise(r=>srv.close(r))}
fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({states:report.screens.map(x=>({name:x.name,steps:x.states.map(s=>s.label),errors:x.errors})),problems:report.problems,shopifyRequests:report.shopifyRequests},null,2));
if(report.problems.length||report.shopifyRequests||report.screens.length!==2||report.screens.some(x=>x.errors.length))process.exitCode=1;
