import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/GLTFLoader.js';
import {preparePaper} from './paper-sheet.js?v=cv-scene-v49';

const frames=[1514,1510,1500,1513,1507,1506,1495,1505,1493,1504,1494,1489,1512,1511,1509,1508,1503,1496,1498,1499];
const PAGE_W=1,PAGE_H=1.377;
export function createFilmAlbum(onChange=()=>{}){
 const album=document.createElement('dialog');album.className='film-album';album.setAttribute('aria-labelledby','film-title');
 album.innerHTML='<header><div><span class="film-kicker">Carnet argentique</span><h2 id="film-title">Fragments de montagne</h2></div><button class="film-close" type="button" aria-label="Quitter l’album"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="film-book"><canvas tabindex="0" role="application" aria-label="Livre photo en 3D. Clique pour ouvrir et tourner les pages. Glisse pour pivoter. Flèches pour inspecter, Entrée pour ouvrir, Échap pour quitter."></canvas><button class="film-page film-left" type="button" aria-label="Tourner la page de gauche"><img class="film-photo" alt=""></button><button class="film-page film-right" type="button" aria-label="Ouvrir le livre"><img class="film-photo" alt=""></button><p class="film-loading" role="status">Préparation du carnet…</p></div><footer><output aria-live="polite"></output><button class="film-bind" type="button">Ouvrir le livre</button><button class="film-front-view" type="button" aria-label="Revenir à la vue de lecture">Vue de lecture</button></footer><p class="film-book-hint">Clique pour ouvrir · Glisse pour inspecter</p>';
 document.body.append(album);
 const stage=album.querySelector('.film-book'),canvas=stage.querySelector('canvas'),leftButton=album.querySelector('.film-left'),rightButton=album.querySelector('.film-right'),count=album.querySelector('output'),status=album.querySelector('.film-loading'),bindButton=album.querySelector('.film-bind'),hint=album.querySelector('.film-book-hint');
 const textures=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)'),ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
 let renderer,scene,camera,pivot,book,frontCover,backCover,leftBlock,rightBlock,binding,leftDeck,rightDeck,left,right,turning,pattern,loadTask;
 let spread=0,returnFocus=null,raf=0,flight=null,request=0,press=null,lastTilt=0,form=0,backFold=0,closedSide='front',ready=false;
 const view={pitch:.075,yaw:-.12};
 const announce=()=>{album.dataset.cover=form>.999&&backFold<.001?'open':closedSide;album.dataset.spread=String(spread);album.dataset.frame=String(spread*2);album.dataset.turning=String(!!flight);};
 function sheet(parent,side){
  const geometry=new THREE.PlaneGeometry(PAGE_W,PAGE_H,64,88);geometry.translate(PAGE_W/2,0,0);
  const front=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,metalness:0,side:THREE.FrontSide});
  const back=front.clone();back.side=THREE.BackSide;
  const group=new THREE.Group();group.userData.pageSide=side;parent.add(group);
  const paper=preparePaper(geometry,[front,back],pattern);
  for(const m of [front,back]){const mesh=new THREE.Mesh(geometry,m);mesh.customDepthMaterial=paper.depth;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;group.add(mesh);}
  group.userData={geometry,front,back,paper,pageSide:side};return group;
 }
 const bend=(page,progress,direction=1,tilt=0)=>page.userData.paper.set(progress,direction,tilt);
 const assign=(page,face,t)=>{page.userData[face].map=t;page.userData[face].needsUpdate=true;};
 async function setup(){
  if(loadTask)return loadTask;
  loadTask=(async()=>{
   renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(max-width:809px)').matches?1.5:2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
   scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff8ed','#6f7768',2));
   const key=new THREE.DirectionalLight('#fff8eb',2.6);key.position.set(-2.6,3.1,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:12});key.shadow.bias=-.0003;key.shadow.normalBias=.008;scene.add(key);
   const rim=new THREE.DirectionalLight('#d4e0ee',1.3);rim.position.set(3,-1,-3);scene.add(rim);
   camera=new THREE.PerspectiveCamera(28,1,.1,30);pivot=new THREE.Group();scene.add(pivot);
   const [model,grain]=await Promise.all([new GLTFLoader().loadAsync('assets/film-book-v50.glb'),new THREE.TextureLoader().loadAsync('assets/film-paper-grain-v49.webp')]);
   pattern=grain;pattern.wrapS=pattern.wrapT=THREE.RepeatWrapping;
   book=model.scene;book.name='FloatingFilmBook';pivot.add(book);
   frontCover=book.getObjectByName('FrontCoverHinge');backCover=book.getObjectByName('BackCoverHinge');leftBlock=book.getObjectByName('LeftLeafBlock');rightBlock=book.getObjectByName('RightLeafBlock');binding=book.getObjectByName('BookBinding');
   book.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;if(o.material.map)o.material.map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}});
   frontCover.userData.coverSide='front';backCover.userData.coverSide='back';
   leftDeck=new THREE.Group();rightDeck=new THREE.Group();book.add(leftDeck,rightDeck);
   left=sheet(leftDeck,'left');right=sheet(rightDeck,'right');turning=sheet(book,'turn');turning.visible=false;turning.position.z=.012;
   bend(left,1);bend(right,0);ready=true;album.dataset.modelReady='true';
   new ResizeObserver(resize).observe(stage);pose();resize();
  })();return loadTask;
 }
 function pose(){
  frontCover.rotation.set(0,-Math.PI*form,0);frontCover.position.z=THREE.MathUtils.lerp(.074,-.070,form);
  leftBlock.rotation.set(0,-Math.PI*(1-form),0);leftBlock.position.z=THREE.MathUtils.lerp(.025,0,form);
  leftDeck.rotation.y=leftBlock.rotation.y;leftDeck.position.z=THREE.MathUtils.lerp(.025,.004,form);
  backCover.rotation.set(0,-Math.PI*backFold,0);backCover.position.z=THREE.MathUtils.lerp(-.072,.077,backFold);
  rightBlock.rotation.set(0,-Math.PI*backFold,0);rightDeck.rotation.y=rightBlock.rotation.y;rightDeck.position.z=THREE.MathUtils.lerp(.004,.043,backFold);
  binding.scale.z=THREE.MathUtils.lerp(1,.43,form*(1-backFold));
  // Inspect around the physical centre, including a closed book on either side.
  book.position.x=-.5*(1-form)+.5*backFold;
  pivot.rotation.set(view.pitch,view.yaw,0,'YXZ');
  album.dataset.yaw=String(view.yaw);album.dataset.pitch=String(view.pitch);
 }
 function resize(){
  if(!renderer||!stage.clientWidth)return;renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();render();
 }
 function render(){
  if(!ready||!album.open)return;
  const width=form>.001&&backFold<.999?2.35:1.4,vf=THREE.MathUtils.degToRad(camera.fov)/2;
  // Room for side inspection and raised sheets, without a visible crop frame.
  const tiltedHeight=1.72+Math.abs(Math.sin(view.pitch))*.65;
  const dist=Math.max(tiltedHeight/(2*Math.tan(vf)),width/(2*Math.tan(vf)*camera.aspect))+(flight?.cover ? .35 : 0);
  camera.position.set(0,0,dist);camera.lookAt(0,0,0);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
 }
 async function texture(index){
  if(textures.has(index))return textures.get(index);
  const pending=(async()=>{
   const image=new Image();image.decoding='async';image.src='assets/film/'+frames[index]+'.webp';await image.decode();
   const paper=document.createElement('canvas');paper.width=1024;paper.height=Math.round(1024*PAGE_H);const c=paper.getContext('2d');
   c.fillStyle='#f0ead9';c.fillRect(0,0,paper.width,paper.height);
   for(let i=0;i<2800;i++){c.fillStyle=i%2?'#d7c9b31a':'#ffffff40';c.fillRect((i*7919)%paper.width,(i*3571)%paper.height,1,1);}
   const maxW=paper.width-112,maxH=paper.height-166,k=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight),w=image.naturalWidth*k,h=image.naturalHeight*k,x=(paper.width-w)/2,y=(paper.height-h)/2-12;
   c.fillStyle='#78665120';c.fillRect(x+3,y+4,w,h);c.drawImage(image,x,y,w,h);
   c.fillStyle='#6a6251';c.font='italic 19px Georgia, serif';c.textAlign='left';c.fillText('Fragments de montagne',56,paper.height-43);c.textAlign='right';c.font='18px Georgia, serif';c.fillText(String(index+1).padStart(2,'0'),paper.width-56,paper.height-43);
   const gutter=c.createLinearGradient(0,0,75,0);gutter.addColorStop(0,'#30281833');gutter.addColorStop(1,'#30281800');c.fillStyle=gutter;c.fillRect(0,0,75,paper.height);
   const front=new THREE.CanvasTexture(paper);front.colorSpace=THREE.SRGBColorSpace;front.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());const back=front.clone();back.repeat.x=-1;back.offset.x=1;back.needsUpdate=true;return{front,back};
  })();textures.set(index,pending);try{return await pending;}catch(e){textures.delete(index);throw e;}
 }
 function labels(){
  announce();const open=form>.999&&backFold<.001;
  count.textContent=open?String(spread*2+1).padStart(2,'0')+' — '+String(spread*2+2).padStart(2,'0')+' / '+frames.length:closedSide==='front'?'Première de couverture':'Quatrième de couverture';
  for(const [button,n]of [[leftButton,spread*2],[rightButton,spread*2+1]]){const img=button.querySelector('img');img.src='assets/film/'+frames[n]+'.webp';img.alt='Cliché argentique '+(n+1)+' : paysage de montagne en noir et blanc';button.disabled=!!flight;}
  rightButton.setAttribute('aria-label',open?(spread===9?'Refermer sur la quatrième de couverture':'Tourner la page de droite'):'Ouvrir le livre');
  leftButton.setAttribute('aria-label',open?(spread===0?'Refermer sur la première de couverture':'Tourner la page de gauche'):'Ouvrir le livre');
  bindButton.textContent=open?'Refermer le livre':'Ouvrir le livre';bindButton.disabled=!!flight;
  hint.textContent=open?'Clique sur les pages · Glisse pour inspecter':'Clique pour ouvrir · Glisse pour inspecter';
 }
 async function display(token=request){
  status.hidden=false;
  try{
   const[l,r]=await Promise.all([texture(spread*2),texture(spread*2+1)]);if(token!==request||!album.open)return;
   assign(left,'back',l.back);assign(right,'front',r.front);bend(left,1);bend(right,0);turning.visible=false;status.hidden=true;labels();render();trim();
  }catch{if(token===request){status.hidden=false;status.textContent='Le tirage ne s’est pas chargé. Ferme puis rouvre le carnet.';}}
 }
 function trim(){
  for(const[index,p]of textures)if(index<spread*2-2||index>spread*2+3){textures.delete(index);p.then(t=>{t.front.dispose();t.back.dispose();}).catch(()=>{});}
  for(const i of [spread*2-1,spread*2+2])if(i>=0&&i<frames.length)texture(i).catch(()=>{});
 }
 function cover(open,side=closedSide){
  if(flight||!ready||!album.open)return;
  const token=++request,start=performance.now(),fromForm=form,fromBack=backFold,toForm=open?1:side==='front'?0:1,toBack=open?0:side==='back'?1:0;
  closedSide=side;flight={cover:true};labels();
  const tick=now=>{
   if(token!==request||!album.open)return;const p=reduced.matches?1:Math.min(1,(now-start)/1000),ease=.5*(1-Math.cos(p*Math.PI));
   form=THREE.MathUtils.lerp(fromForm,toForm,ease);backFold=THREE.MathUtils.lerp(fromBack,toBack,ease);pose();render();
   if(p<1){raf=requestAnimationFrame(tick);return;}flight=null;pose();labels();render();
  };tick(start);
 }
 async function flip(direction){
  if(flight||!ready||!album.open)return;
  if(form<.999||backFold>.001){cover(true);return;}
  if(spread+direction<0){cover(false,'front');return;}if(spread+direction>=frames.length/2){cover(false,'back');return;}
  const token=++request,target=spread+direction;flight={loading:true};labels();
  try{
   const[front,back,under]=await Promise.all([texture(direction>0?spread*2+1:spread*2-1),texture(direction>0?spread*2+2:spread*2),texture(direction>0?target*2+1:target*2)]);
   if(token!==request||!album.open)return;assign(turning,'front',front.front);assign(turning,'back',back.back);assign(direction>0?right:left,direction>0?'front':'back',direction>0?under.front:under.back);
   turning.visible=true;flight={start:performance.now(),direction,target,tilt:lastTilt};labels();
   const tick=now=>{
    if(token!==request||!album.open)return;const p=reduced.matches?1:Math.min(1,(now-flight.start)/850),ease=.5*(1-Math.cos(p*Math.PI));bend(turning,direction>0?ease:1-ease,direction,flight.tilt);render();
    if(p<1){raf=requestAnimationFrame(tick);return;}spread=target;flight=null;display(token);
   };tick(performance.now());
  }catch{flight=null;labels();status.hidden=false;status.textContent='Le tirage ne s’est pas chargé.';}
 }
 const resetView=()=>{view.pitch=.075;view.yaw=-.12;pose();render();};
 function pageAt(x,y){
  const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(ndc,camera);
  for(const hit of ray.intersectObject(book,true)){for(let p=hit.object;p&&p!==book;p=p.parent){if(p.userData.pageSide)return p.userData.pageSide;if(p.userData.coverSide)return p.userData.coverSide;}}
  return null;
 }
 stage.addEventListener('pointerdown',e=>{if(!ready||flight||e.button!==0)return;stage.setPointerCapture(e.pointerId);press={id:e.pointerId,x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,moved:false};});
 stage.addEventListener('pointermove',e=>{
  if(!press||press.id!==e.pointerId)return;if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>7)press.moved=true;
  if(press.moved){view.yaw+=(e.clientX-press.px)*.008;view.pitch=THREE.MathUtils.clamp(view.pitch+(e.clientY-press.py)*.006,-1.25,1.25);pose();render();}
  press.px=e.clientX;press.py=e.clientY;
 });
 stage.addEventListener('pointerup',e=>{
  if(!press||press.id!==e.pointerId)return;const moved=press.moved;press=null;if(moved)return;
  const side=pageAt(e.clientX,e.clientY);if(!side)return;
  lastTilt=THREE.MathUtils.clamp((.5-(e.clientY-canvas.getBoundingClientRect().top)/canvas.clientHeight)*40,-25,25);
  if(form<.999||backFold>.001)cover(true);else if(side==='left'||side==='front')flip(-1);else flip(1);
 });
 stage.addEventListener('pointercancel',()=>press=null);
 canvas.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter',' '].includes(e.key))e.preventDefault();
  if(e.key==='Enter'||e.key===' ')form<.999||backFold>.001?cover(true):flip(e.shiftKey?-1:1);
  else if(e.key==='Home')resetView();else if(e.key==='ArrowLeft')view.yaw-=.22;else if(e.key==='ArrowRight')view.yaw+=.22;else if(e.key==='ArrowUp')view.pitch=Math.max(-1.25,view.pitch-.15);else if(e.key==='ArrowDown')view.pitch=Math.min(1.25,view.pitch+.15);
  if(ready){pose();render();}
 });
 leftButton.onclick=e=>{if(e.detail===0)flip(-1);};rightButton.onclick=e=>{if(e.detail===0)flip(1);};bindButton.onclick=()=>cover(form<.999||backFold>.001,'front');album.querySelector('.film-front-view').onclick=resetView;
 const close=()=>{if(album.open)album.close();};album.querySelector('.film-close').onclick=close;
 album.addEventListener('click',e=>{if(e.target!==album)return;const r=album.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 album.addEventListener('close',()=>{request++;cancelAnimationFrame(raf);flight=null;press=null;album.dataset.turning='false';onChange(false);document.dispatchEvent(new CustomEvent('film-album-change',{detail:{open:false}}));returnFocus?.focus({preventScroll:true});});
 return{open(){if(album.open)return;returnFocus=document.activeElement;album.showModal();onChange(true);document.dispatchEvent(new CustomEvent('film-album-change',{detail:{open:true}}));form=backFold=spread=0;closedSide='front';view.pitch=.075;view.yaw=-.12;status.hidden=false;const token=++request;setup().then(()=>{if(token!==request||!album.open)return;pose();resize();labels();display(token);}).catch(()=>{status.textContent='Le livre n’a pas pu être chargé.';});album.querySelector('.film-close').focus({preventScroll:true});},close};
}
