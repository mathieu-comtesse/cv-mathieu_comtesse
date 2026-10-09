import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/GLTFLoader.js';
import {ANNUAL_TOTAL,euroCoinRhythm} from './annual-gains.js?v=cv-scene-v36';
export async function initPiggyBank(host){
 const fallback=[...host.querySelectorAll('svg')],canvas=document.createElement('canvas');
 canvas.className='piggy-3d';canvas.tabIndex=0;canvas.setAttribute('aria-label','Tirelire rose 3D : glissez pour pivoter, ou utilisez les flèches');
 host.append(canvas);
 let renderer,observer,raf=0;
 try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(150,156,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.4,1.4,1.55,-1.55,.1,30);camera.position.set(3.8,2.6,5.6);camera.lookAt(0,1.13,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x9c7189,2.2));const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(2,5,5);scene.add(key);const rim=new THREE.DirectionalLight(0xffddeb,1.5);rim.position.set(-3,3,-2);scene.add(rim);
  const [pig,coin]=await Promise.all(['pink-piggy-bank','one-euro-coin'].map(name=>new GLTFLoader().loadAsync('assets/'+name+'.glb?v=cv-scene-v36')));
  const assembly=new THREE.Group();assembly.rotation.y=-.45;scene.add(assembly);assembly.add(pig.scene);
  const falling=coin.scene;assembly.add(falling);falling.rotation.x=Math.PI/2;falling.visible=false;
  for(const el of fallback)el.setAttribute('hidden','');
  host.dataset.piggy='ready';
  const box=host.closest('.annual-gains'),label=box.querySelector('[data-coin-rate]'),daysInput=box.querySelector('[data-working-days]'),hoursInput=box.querySelector('[data-working-hours]');
  let config={days:225,hours:7};try{const stored=JSON.parse(localStorage.getItem('cv-piggy-work-basis-v1')||'null');if(stored&&stored.days>=1&&stored.days<=366&&stored.hours>=1&&stored.hours<=24)config=stored;}catch{}
  daysInput.value=config.days;hoursInput.value=config.hours;
  let rhythm,activeSeconds=0,nextCoin=0,dropStart=-10,visible=false,last=0,previousPaint=0,frames=0,pointer=null;
  const configure=()=>{
   const days=Number(daysInput.value),hours=Number(hoursInput.value);if(days<1||days>366||hours<1||hours>24)return;
   config={days,hours};rhythm=euroCoinRhythm(ANNUAL_TOTAL,days,hours);nextCoin=activeSeconds+rhythm.secondsPerEuro;
   label.textContent='1 € toutes les '+rhythm.secondsPerEuro.toLocaleString('fr-FR',{maximumFractionDigits:2})+' s · moyenne annuelle '+Math.round(rhythm.meanMoney).toLocaleString('fr-FR')+' € ÷ '+rhythm.workingSeconds.toLocaleString('fr-FR')+' secondes travaillées/an';
   host.dataset.coinInterval=String(rhythm.secondsPerEuro);try{localStorage.setItem('cv-piggy-work-basis-v1',JSON.stringify(config));}catch{}
  };
  configure();daysInput.addEventListener('change',configure);hoursInput.addEventListener('change',configure);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const paint=now=>{
   raf=0;if(!visible||document.hidden)return;
   if(now-previousPaint<1000/24){raf=requestAnimationFrame(paint);return;}
   const dt=last?Math.max(0,(now-last)/1000):0;last=now;previousPaint=now;
   if(!reduced.matches){
    activeSeconds+=dt;
    if(activeSeconds>=nextCoin){dropStart=activeSeconds;nextCoin+=rhythm.secondsPerEuro;host.dataset.coins=String(Number(host.dataset.coins||0)+1);}
    const progress=(activeSeconds-dropStart)/1.15;falling.visible=progress>=0&&progress<1;
    if(falling.visible){falling.position.set(-.11,2.78-1.36*progress*progress,0);falling.rotation.set(Math.PI/2,Math.sin(progress*Math.PI)*.6,0);}
   }else falling.visible=false;
   renderer.render(scene,camera);host.dataset.frames=String(++frames);raf=requestAnimationFrame(paint);
  };
  const start=()=>{if(visible&&!document.hidden&&!raf){last=0;raf=requestAnimationFrame(paint);}};
  observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)start();else{cancelAnimationFrame(raf);raf=0;}});
  observer.observe(host);document.addEventListener('visibilitychange',start);
  canvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;assembly.rotation.y+=(e.clientX-pointer.x)*.016;assembly.rotation.x=Math.max(-.35,Math.min(.35,assembly.rotation.x+(e.clientY-pointer.y)*.009));pointer.x=e.clientX;pointer.y=e.clientY;host.dataset.rotation=String(assembly.rotation.y);});
  const release=()=>pointer=null;canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key.includes('Left')||e.key.includes('Right'))assembly.rotation.y+=e.key==='ArrowLeft'?-.2:.2;else assembly.rotation.x=Math.max(-.35,Math.min(.35,assembly.rotation.x+(e.key==='ArrowUp'?-.1:.1)));host.dataset.rotation=String(assembly.rotation.y);});
  addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose();},{once:true});
 }catch(e){canvas.remove();host.dataset.piggy='fallback';renderer?.dispose();console.warn('La tirelire 3D ne peut pas être affichée',e.message);}
}
