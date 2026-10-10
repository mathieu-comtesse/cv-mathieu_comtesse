import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/GLTFLoader.js';
import {ANNUAL_TOTAL,euroCoinRhythm} from './annual-gains.js?v=cv-scene-v36';
const MODEL='6d190692d90a4a9db58131855d8c9f33';
let sdk;
function loadSDK(){
 if(window.Sketchfab)return Promise.resolve(window.Sketchfab);
 return sdk??=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Lecteur indisponible')),30000);
  const script=document.createElement('script');script.src='https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
  script.onload=()=>{clearTimeout(timeout);resolve(window.Sketchfab);};script.onerror=()=>{clearTimeout(timeout);reject(Error('Lecteur indisponible'));};document.head.append(script);
 });
}
export function initPiggyBank(host){
 let launched=false;
 const lazy=new IntersectionObserver(([entry])=>{if(entry.isIntersecting&&!launched){launched=true;lazy.disconnect();mountReference(host);}}, {rootMargin:'200px'});
 lazy.observe(host);
}
async function mountReference(host){
 const iframe=document.createElement('iframe'),canvas=document.createElement('canvas');
 iframe.className='piggy-reference';iframe.title='Cerdo hucha, tirelire de Legado 3D';iframe.allow='autoplay; fullscreen';iframe.allowFullscreen=true;
 canvas.className='piggy-3d piggy-coins-3d';canvas.tabIndex=0;canvas.setAttribute('aria-label','Tirelire 3D : glissez pour pivoter, ou utilisez les flèches');
 const credit=document.createElement('a');credit.className='piggy-credit';credit.href='https://sketchfab.com/3d-models/cerdo-hucha-'+MODEL;credit.target='_blank';credit.rel='noopener';credit.textContent='Cerdo hucha · Legado 3D / Sketchfab';
 host.append(iframe,canvas,credit);host.dataset.piggy='loading';
 let renderer,api,observer,resize,raf=0;
 try{
  const Sketchfab=await loadSDK();
  api=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Chargement du modèle interrompu')),60000);
   new Sketchfab(iframe).init(MODEL,{autostart:1,camera:0,scrollwheel:0,dnt:1,success(viewer){
    viewer.addEventListener('viewerready',()=>{clearTimeout(timeout);resolve(viewer);});
   },error(){clearTimeout(timeout);reject(Error('Modèle indisponible'));}});
  });
  api.setBackground({color:[.961,.969,.98]});
  const original=await new Promise((resolve,reject)=>api.getCameraLookAt((e,c)=>e?reject(e):resolve(c)));
  const target=original.target,dx=original.position[0]-target[0],dy=original.position[1]-target[1],dz=original.position[2]-target[2];
  const distance=Math.hypot(dx,dy,dz)*.98,baseYaw=Math.atan2(dy,dx),basePitch=Math.asin(dz/Math.hypot(dx,dy,dz));
  let yaw=0,pitch=0,projection=null,requesting=false,dirty=true,moving=false;
  api.addEventListener('camerastart',()=>{moving=true;dirty=true;});
  api.addEventListener('camerastop',()=>{moving=false;dirty=true;api.getCameraLookAt((e,c)=>{if(e)return;const x=c.position[0]-c.target[0],y=c.position[1]-c.target[1];yaw=Math.atan2(y,x)-baseYaw;host.dataset.rotation=String(yaw);});});
  const updateCamera=()=>{
   const a=baseYaw+yaw,b=Math.max(.05,Math.min(1.25,basePitch+pitch)),r=distance*Math.cos(b);
   api.setCameraLookAt([target[0]+r*Math.cos(a),target[1]+r*Math.sin(a),target[2]+distance*Math.sin(b)],target,0,()=>{dirty=true;});
   host.dataset.rotation=String(yaw);
  };
  updateCamera();
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,300,300,0,.1,100);camera.position.z=20;
  scene.add(new THREE.HemisphereLight(0xffffff,0x6c5b49,2.1));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(1,3,5);scene.add(key);
  const coin=await new GLTFLoader().loadAsync('assets/one-euro-coin.glb?v=cv-scene-v36'),falling=coin.scene;scene.add(falling);falling.visible=false;
  const bounds=new THREE.Box3().setFromObject(falling),diameter=bounds.getSize(new THREE.Vector3()).x;falling.scale.setScalar(19/diameter);
  for(const svg of host.querySelectorAll('svg'))svg.setAttribute('hidden','');
  host.dataset.piggy='ready';host.dataset.model=MODEL;
  let width=300,height=300;
  const measure=()=>{width=iframe.clientWidth;height=iframe.clientHeight;renderer.setSize(width,height,false);camera.right=width;camera.top=height;camera.updateProjectionMatrix();dirty=true;};
  resize=new ResizeObserver(measure);resize.observe(iframe);measure();
  const box=host.closest('.annual-gains'),label=box.querySelector('[data-coin-rate]'),daysInput=box.querySelector('[data-working-days]'),hoursInput=box.querySelector('[data-working-hours]');
  let config={days:225,hours:7};try{const stored=JSON.parse(localStorage.getItem('cv-piggy-work-basis-v1')||'null');if(stored&&stored.days>=1&&stored.days<=366&&stored.hours>=1&&stored.hours<=24)config=stored;}catch{}
  daysInput.value=config.days;hoursInput.value=config.hours;
  let rhythm,activeSeconds=0,nextCoin=0,dropStart=-10,visible=false,last=0,previousPaint=0,frames=0;
  const configure=()=>{
   const days=Number(daysInput.value),hours=Number(hoursInput.value);if(days<1||days>366||hours<1||hours>24)return;
   rhythm=euroCoinRhythm(ANNUAL_TOTAL,days,hours);nextCoin=activeSeconds+rhythm.secondsPerEuro;
   label.textContent='1 € toutes les '+rhythm.secondsPerEuro.toLocaleString('fr-FR',{maximumFractionDigits:2})+' s · moyenne annuelle '+Math.round(rhythm.meanMoney).toLocaleString('fr-FR')+' € ÷ '+rhythm.workingSeconds.toLocaleString('fr-FR')+' secondes travaillées/an';
   host.dataset.coinInterval=String(rhythm.secondsPerEuro);try{localStorage.setItem('cv-piggy-work-basis-v1',JSON.stringify({days,hours}));}catch{}
  };configure();daysInput.addEventListener('change',configure);hoursInput.addEventListener('change',configure);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const project=()=>{if(requesting)return;requesting=true;
   api.getWorldToScreenCoordinates([.0033,-.0388,.104],p=>{projection=p.canvasCoord;requesting=false;dirty=false;});
  };
  const paint=now=>{
   raf=0;if(!visible||document.hidden)return;
   if(now-previousPaint<1000/24){raf=requestAnimationFrame(paint);return;}
   const dt=last?Math.min(.2,Math.max(0,(now-last)/1000)):0;last=now;previousPaint=now;
   if(dirty||moving)project();
   if(!reduced.matches){
    activeSeconds+=dt;
    if(activeSeconds>=nextCoin){dropStart=activeSeconds;nextCoin+=rhythm.secondsPerEuro;host.dataset.coins=String(Number(host.dataset.coins||0)+1);}
    const progress=(activeSeconds-dropStart)/1.15;host.dataset.coinPhase=String(progress);falling.visible=!!projection&&progress>=0&&progress<1;
    if(falling.visible){const x=projection[0],y=projection[1];falling.position.set(x,height-y+Math.min(55,Math.max(20,y-18))*(1-progress*progress),0);falling.rotation.set(Math.PI/2,progress*1.3,0);host.dataset.coinX=String(x);host.dataset.coinY=String(y);}
   }else falling.visible=false;
   renderer.render(scene,camera);host.dataset.frames=String(++frames);raf=requestAnimationFrame(paint);
  };
  const start=()=>{if(visible&&!document.hidden){api.start();if(!raf){last=0;raf=requestAnimationFrame(paint);}}else{api.stop();cancelAnimationFrame(raf);raf=0;}};
  observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;start();});observer.observe(host);document.addEventListener('visibilitychange',start);
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft'||e.key==='ArrowRight')yaw+=e.key==='ArrowLeft'?-.2:.2;else pitch=Math.max(-.15,Math.min(.65,pitch+(e.key==='ArrowUp'?-.1:.1)));updateCamera();});
  addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();renderer.dispose();api.stop();document.removeEventListener('visibilitychange',start);},{once:true});
 }catch(e){
  cancelAnimationFrame(raf);observer?.disconnect();resize?.disconnect();renderer?.dispose();api?.stop();iframe.remove();canvas.remove();credit.remove();
  host.dataset.piggy='fallback';const {initPiggyBank}=await import('./piggy-bank-local.js?v=cv-scene-v37');await initPiggyBank(host);
 }
}
