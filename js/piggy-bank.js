import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/GLTFLoader.js';
import {ANNUAL_TOTAL,euroCoinRhythm} from './annual-gains.js?v=cv-scene-v45';
export function initPiggyBank(host){
 host.dataset.piggy='loading';
 const status=document.createElement('span');status.className='piggy-status';status.setAttribute('role','status');status.textContent='Chargement de la tirelire 3D…';host.append(status);
 const lazy=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){lazy.disconnect();mountPiggyBank(host);}}, {rootMargin:'200px'});lazy.observe(host);
}
async function mountPiggyBank(host){
 const canvas=document.createElement('canvas'),status=host.querySelector('.piggy-status');
 canvas.className='piggy-3d';canvas.tabIndex=0;canvas.setAttribute('aria-label','Tirelire rose en céramique : glissez pour pivoter, ou utilisez les flèches');
 host.append(canvas);
 let renderer,observer,raf=0;
 try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.75,1.75,1.75,-1.75,.1,30);camera.position.set(3.8,3.1,5.6);camera.lookAt(0,1.35,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x9c7189,2.2));const key=new THREE.DirectionalLight(0xffffff,3.1);key.position.set(2,5,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=3;key.shadow.camera.bottom=-2;key.shadow.bias=-.0005;scene.add(key);const rim=new THREE.DirectionalLight(0xffddeb,1.5);rim.position.set(-3,3,-2);scene.add(rim);
  const [pig,coin]=await Promise.all(['piggy-bank-user','one-euro-coin-user'].map(name=>new GLTFLoader().loadAsync('assets/'+name+'.glb?v=cv-scene-v40')));
  const assembly=new THREE.Group();assembly.rotation.y=.35;scene.add(assembly);assembly.add(pig.scene);
  const falling=coin.scene;assembly.add(falling);falling.visible=false;
  const coinOrientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2),coinSpin=new THREE.Quaternion(),coinNormal=new THREE.Vector3(0,1,0);
  pig.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});falling.traverse(o=>{if(o.isMesh)o.castShadow=true;});falling.scale.setScalar(.50/.17);
  const slot=pig.scene.getObjectByName('CoinSlotAnchor');if(!slot)throw Error('Fente absente');const anchor=assembly.worldToLocal(slot.getWorldPosition(new THREE.Vector3()));
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.ShadowMaterial({opacity:.13}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.006;shadow.receiveShadow=true;scene.add(shadow);
  host.dataset.piggy='ready';status?.remove();host.dataset.model='piggy-bank-user';host.dataset.slotLength=String(slot.userData.slotLength);host.dataset.slotWidth=String(slot.userData.slotWidth);host.dataset.coinDiameter=String(slot.userData.coinDiameter);host.dataset.coinThickness=String(.009254978*.50/.17);
  const resize=new ResizeObserver(()=>{const width=host.clientWidth,height=300;renderer.setSize(width,height,false);const horizontal=1.75;camera.left=-horizontal;camera.right=horizontal;camera.top=horizontal*height/width;camera.bottom=-camera.top;camera.updateProjectionMatrix();});resize.observe(host);host.dataset.coinAsset='one-euro-coin-user.glb';
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
    const progress=(activeSeconds-dropStart)/1.4;host.dataset.coinPhase=String(progress);falling.visible=progress>=0&&progress<1;
    if(falling.visible){falling.position.copy(anchor);falling.position.y+=.85-1.36*progress*progress;falling.quaternion.copy(coinOrientation).multiply(coinSpin.setFromAxisAngle(coinNormal,progress*.7));host.dataset.coinX=String(falling.position.x);host.dataset.coinZ=String(falling.position.z);host.dataset.coinY=String(falling.position.y);}
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
  addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();renderer.dispose();},{once:true});
 }catch(e){canvas.remove();host.dataset.piggy='unavailable';if(status)status.textContent='Tirelire 3D indisponible';renderer?.dispose();console.warn('La tirelire 3D ne peut pas être affichée',e.message);}
}
