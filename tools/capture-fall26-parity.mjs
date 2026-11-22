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
  const screenshot=await page.screenshot({path:path.join(output,name+'-'+label+'.png')});
  let graphStats=null;
  let exteriorGrid=null;
  if(label==='expo-premier-chapitre'&&!mobile)exteriorGrid=await page.evaluate(async png=>{
    const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
    const x=Math.floor(c.width*.05),y=Math.floor(c.height*.18);
    const w=Math.floor(c.width*.18),h=Math.floor(c.height*.16);
    const d=g.getImageData(x,y,w,h).data;
    let lum=0,high=0;for(let i=0;i<d.length;i+=4){
      const l=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;lum+=l;if(l>25)high++;
    }
    return{rect:{x,y,w,h},meanLuminance:+(lum/(w*h)).toFixed(3),above25Pct:+(high*100/(w*h)).toFixed(3)};
  },screenshot.toString('base64'));
  if(label==='plat-accueil'&&!mobile)graphStats=await page.evaluate(async png=>{
    const graph=document.querySelector('.cv-hero-graph');if(!graph)return null;
    const r=graph.getBoundingClientRect(),im=new Image();
    im.src='data:image/png;base64,'+png;await im.decode();
    const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(im,0,0);
    const x=Math.max(0,Math.floor(r.left)),y=Math.max(0,Math.floor(r.top));
    const w=Math.min(canvas.width-x,Math.ceil(r.right)-x),h=Math.min(canvas.height-y,Math.ceil(r.bottom)-y);
    if(w<=0||h<=0)return null;
    const data=context.getImageData(x,y,w,h).data;
    let lum=0,bright70=0,bright100=0,blue=0;
    const n=w*h;
    for(let i=0;i<data.length;i+=4){
      const R=data[i],G=data[i+1],B=data[i+2],l=.2126*R+.7152*G+.0722*B;
      lum+=l;if(l>70)bright70++;if(l>100)bright100++;
      if(B>R*1.8&&B>G*1.4&&Math.max(R,G,B)>70)blue++;
    }
    return{rect:{x,y,w,h},meanLuminance:+(lum/n).toFixed(3),over70Pct:+(bright70*100/n).toFixed(3),
      over100Pct:+(bright100*100/n).toFixed(3),bluePixelsPct:+(blue*100/n).toFixed(3)};
  },screenshot.toString('base64'));
  const details=await page.evaluate((lab)=>{
   const box=(x)=>{if(!x)return null;const b=x.getBoundingClientRect(),s=getComputedStyle(x);
    return{x:b.x,y:b.y,w:b.width,h:b.height,font:s.fontFamily,size:s.fontSize,color:s.color}};
   const canvases=[...document.querySelectorAll('canvas')].filter(c=>{const b=c.getBoundingClientRect();return b.width>60&&b.height>60&&b.right>0&&b.bottom>0&&b.left<innerWidth&&b.top<innerHeight});
   return {chapterTransition:window.__cvChapterTransition||null,
    bodyBackground:lab.includes('-transition-')?getComputedStyle(document.body).backgroundColor:null,
    bodyGradient:lab.includes('-transition-')?getComputedStyle(document.body).backgroundImage:null,
    chapterTitleFills:lab.startsWith('plat-transition-')?[...document.querySelectorAll('section[data-f26-page-section] .section-hero-pin h2')].slice(0,2).map(h=>+h.style.getPropertyValue('--cv-fill')):null,
    y:scrollY,expo:document.documentElement.classList.contains('cv-parity-active'),progress:window.__cvStandardPath?.progress,nav:box(document.querySelector('.cv-site-nav')),hero:box(document.querySelector('#hero h1')),chapter:box(document.querySelector('.section-hero-pin h2')),canvases:canvases.length,sections:document.querySelectorAll('[data-f26-page-section]').length,starsVisible:window.__cvParity?.etoiles()?.filter(x=>x.visible).length??null,
    starFoci:lab==='expo-transition-50'?window.__cvParity?.etoiles()?.filter(x=>x.visible).map(x=>x.foyer):null,
    hero3DHubs:lab==='expo-accueil'?window.__cvParity?.heroHubs?.():null,home3DFrames:lab==='expo-accueil'?window.__cvParity?.boxes?.().filter(b=>b.hero).map(b=>({title:b.title,top:b.top,thick:b.thickPx,tilt:b.tilted,corners:b.cornersProjected})):null,flatGraph:lab==='plat-accueil'?({visible:window.__cvHeroGraph?.ciel.etat('accueil').filter(s=>s.visible).length??null,labels:window.__cvHeroGraph?.ciel.etat('accueil').filter(s=>s.libelle).length??null,performance:window.__cvHeroGraph?.performance?.()??null}):null,mobileHeroProbe:lab==='plat-retour'&&innerWidth<600?(()=>{let e=document.querySelector('#hero h1'),out=[];for(let i=0;e&&i<7;i++,e=e.parentElement){const c=getComputedStyle(e),r=e.getBoundingClientRect();out.push({node:e.id||e.className?.toString().slice(0,60)||e.tagName,position:c.position,transform:c.transform,top:+r.top.toFixed(1),height:+r.height.toFixed(1)});}return out;})():null};
  },label);states.push({label,...details,graphStats,exteriorGrid});
 }
 const firstChapterY=await page.evaluate(()=>{const h=document.querySelector('.section-hero-pin h2');return h?scrollY+h.getBoundingClientRect().top:null;});
 await capture('plat-accueil');
 // Three evidence frames per display mode at fixed positions of the same
 // scroll-driven chapter transition. These are not arbitrary time samples.
 async function transitionFrames(mode){
  if(mobile)return;
  const points=await page.evaluate(()=>{
    const sections=[...document.querySelectorAll('section[data-f26-page-section]')];
    const target=sections[1].getBoundingClientRect().top+scrollY;
    const centre=target-innerHeight*.55,half=innerHeight*.38;
    return [.25,.5,.75].map(t=>Math.max(0,centre-half+2*half*t));
  });
  for(let i=0;i<points.length;i++){
    await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),points[i]);
    await page.waitForTimeout(200);
    await capture(mode+'-transition-'+[25,50,75][i]);
  }
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(220);
 }
 await transitionFrames('plat');
 if(!mobile){const nav=page.locator('.cv-site-nav .cv-nav-control').first();if(await nav.count()){await nav.hover();await page.waitForTimeout(350);await capture('plat-survol')}}
 await page.locator('.cv-parity-toggle').click();
 await page.waitForFunction(()=>window.__cvStandardPath?.active&&window.__cvStandardPath.progress>=.999,null,{timeout:60000});
 await page.waitForTimeout(300);await capture('expo-accueil');
 await transitionFrames('expo');
 if(!mobile&&Number.isFinite(firstChapterY)){
  await page.evaluate(y=>scrollTo({top:Math.max(0,y-350),behavior:'instant'}),firstChapterY);
  await page.waitForTimeout(800);await capture('expo-premier-chapitre');
 }
 await page.evaluate(()=>scrollTo({top:Math.min(3800,document.documentElement.scrollHeight-innerHeight),behavior:'instant'}));
 await page.waitForTimeout(900);await capture('expo-chapitre');
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!window.__cvStandardPath?.active,null,{timeout:60000});
 await page.waitForTimeout(350);await capture('plat-retour');
 // Cross-mode check at the same three geometric scroll positions.
 // CSS background and flat title fill must agree with the shared progress.
 if(!mobile){
  for(const mode of ['plat','expo'])for(const fraction of [.25,.5,.75]){
   const label=mode+'-transition-'+Math.round(fraction*100);
   const frame=states.find(s=>s.label===label),p=fraction*fraction*(3-2*fraction);
   if(!frame){errors.push('État manquant : '+label);continue;}
   const actual=frame.chapterTransition?.progress;
   if(!Number.isFinite(actual)||Math.abs(actual-p)>.04)
    errors.push('Horloge de chapitre désynchronisée : '+label+' '+actual+' vs '+p);
   const hex=frame.chapterTransition?.colour||'';
   const expected=/^#[0-9a-f]{6}$/i.test(hex)?[0,2,4].map(i=>parseInt(hex.slice(i+1,i+3),16)):null;
   const rgb=(frame.bodyBackground||'').match(/[0-9]+/g)?.slice(0,3).map(Number);
   if(!expected||!rgb||rgb.length!==3||Math.max(...rgb.map((v,i)=>Math.abs(v-expected[i])))>3)
    errors.push('Fond de page différent du chapitre : '+label+' '+frame.bodyBackground+' / '+hex);
   if(label==='expo-transition-50'){
    const foci=frame.starFoci||[];
    const targets=[[.54,.42],[.49,.72]].map(([x,y])=>[x*viewport.width,y*viewport.height]);
    for(const [x,y] of targets){
      if(!foci.some(([fx,fy])=>Math.hypot(fx-x,fy-y)<90))
        errors.push('Une des deux étoiles Expo est absente du foyer attendu : '+JSON.stringify({target:[x,y],foci}));
    }
   }
   if(mode==='plat'&&fraction===.5){
    const wave=frame.chapterTransition?.wave;
    if(!wave||wave.top===wave.middle||wave.bottom===wave.middle)
      errors.push('Absence de balayage chromatique spatial : '+JSON.stringify(wave));
    if(!String(frame.bodyGradient).includes('linear-gradient'))
      errors.push('Dégradé chromatique absent de la page à plat : '+frame.bodyGradient);
   }
   if(mode==='plat'){
    const [outgoing,incoming]=frame.chapterTitleFills||[];
    if(!Number.isFinite(outgoing)||!Number.isFinite(incoming)||Math.abs(outgoing+incoming-1)>.04)
      errors.push('Remplissage des deux titres désynchronisé : '+label+' '+JSON.stringify(frame.chapterTitleFills));
   }
  }
 }
 if(states.find(x=>x.label==='expo-accueil')?.canvases===0)errors.push('Mode Expo sans canvas visible');
 if(states.find(x=>x.label==='plat-retour')?.expo||Math.abs(states.find(x=>x.label==='plat-retour')?.progress??1)>1e-3)errors.push('Retour à plat ou état de progression incorrect');
 if(states[0].sections<4)errors.push('Sections réelles absentes : '+states[0].sections);
 if(!mobile){
  const grid=states.find(x=>x.label==='expo-premier-chapitre')?.exteriorGrid;
  if(!grid||grid.meanLuminance<9||grid.meanLuminance>15.5)
    errors.push('Quadrillage extérieur trop éloigné du repère vidéo : '+JSON.stringify(grid));
  const metric=states[0].graphStats,flat=states[0].flatGraph;
  if(flat?.visible!==11||flat?.labels!==11)errors.push('Constellations de référence ou légendes non conformes : '+JSON.stringify(flat));
  if(!metric||metric.meanLuminance>12||metric.over100Pct>1.8||metric.bluePixelsPct<.5)
    errors.push('Luminance des constellations hors tolérance vidéo : '+JSON.stringify(metric));
 }

 report.screens.push({name,viewport,reduce,states,errors});await ctx.close();
}
try{await run('desktop-1440x900',{width:1440,height:900});await run('mobile-390x844',{width:390,height:844},true,true)}
catch(e){report.problems.push(e.stack||String(e))}
finally{await browser.close();await new Promise(r=>srv.close(r))}
fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({states:report.screens.map(x=>({name:x.name,steps:x.states.map(s=>s.label),errors:x.errors})),problems:report.problems,shopifyRequests:report.shopifyRequests,graphStats:report.screens[0]?.states.find(x=>x.label==='plat-accueil')?.graphStats},null,2));
if(report.problems.length||report.shopifyRequests||report.screens.length!==2||report.screens.some(x=>x.errors.length))process.exitCode=1;
