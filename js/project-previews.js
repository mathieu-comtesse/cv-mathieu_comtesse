import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import * as THREE from 'three';
import { initProcessMachines } from './process-machines.js?v=cv-scene-v26';

// One renderer serves the visible cards; cloned carousel cards never create contexts.
export function initWorkshopPreviews(host, projects, load, palettes) {
  const canvas=document.createElement('canvas');canvas.className='workshop-previews';canvas.setAttribute('aria-hidden','true');host.append(canvas);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),instances=new Map(),pending=new Set();
  let renderer,environment,visible=false,modal=false,raf=0,last=0,clock=0,frames=0;
  const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible)start();else stop();},{rootMargin:'60px'});observer.observe(host);
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  document.addEventListener('project-workshop',e=>{modal=e.detail.open;modal?stop():start();});
  reduced.addEventListener('change',()=>{instances.forEach(i=>i.elapsed=0);start();});
  function setup(){if(renderer)return;renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();}
  async function request(id){
    if(instances.has(id)||pending.has(id))return;pending.add(id);
    try{const asset=await load(id),project=projects.find(p=>p.id===id),model=asset.scene.clone(true);
      model.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;}});
      const scene=new THREE.Scene();scene.environment=environment;scene.environmentIntensity=.24;scene.add(model,new THREE.HemisphereLight('#ffffff','#bcc6cb',1.3));
      const key=new THREE.DirectionalLight('#fff6e8',2.5);key.position.set(-4,8,6);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:30});key.shadow.bias=-.0004;scene.add(key);
      const camera=new THREE.PerspectiveCamera(32,720/560,.1,60);camera.position.set(8,8,11);const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());center.y=Math.max(.7,center.y*.85);const direction=camera.position.clone().normalize();let distance=camera.position.length();for(let pass=0;pass<2;pass++){camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);camera.updateMatrixWorld();let extent=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(v.x),Math.abs(v.y));}distance*=extent/.92;}camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);
      instances.set(id,{model,scene,camera,machines:initProcessMachines(model,project.diag,palettes[id],id),project,elapsed:0,step:0});
      start();
    }catch(e){console.warn('Workshop preview unavailable',id,e);}finally{pending.delete(id);}
  }
  function start(){if(!raf&&visible&&!modal&&!document.hidden)raf=requestAnimationFrame(draw);}
  function draw(now){
    raf=0;if(!visible||modal||document.hidden)return;
    if(last&&now-last<1000/20){start();return;}const dt=last?Math.min(.08,(now-last)/1000):0;last=now;clock+=dt;
    const box=host.getBoundingClientRect(),width=Math.round(box.width),height=Math.round(box.height);
    if(!width||!height){start();return;}setup();if(canvas.width!==width||canvas.height!==height)renderer.setSize(width,height,false);
    renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
    const active=new Set();
    for(const card of host.querySelectorAll('.process-card')){
      const image=card.querySelector('img'),rect=image.getBoundingClientRect();
      if(rect.right<=box.left||rect.left>=box.right||rect.bottom<0||rect.top>innerHeight)continue;
      const id=projects[Number(card.dataset.project)].id;request(id);const i=instances.get(id);if(!i)continue;
      if(!active.has(id)){if(!reduced.matches){i.elapsed+=dt;if(i.elapsed>=4.6){i.elapsed%=4.6;i.step=(i.step+1)%i.project.diag.length;}}i.machines.update({step:i.step,elapsed:i.elapsed,dt,playing:!reduced.matches,exception:false});active.add(id);}
      const x=rect.left-box.left,y=height-(rect.bottom-box.top),w=rect.width,h=rect.height;
      renderer.setViewport(x,y,w,h);renderer.setScissor(Math.max(0,x),Math.max(0,y),Math.min(w,width-Math.max(0,x)),Math.min(h,height-Math.max(0,y)));
      renderer.shadowMap.needsUpdate=frames%10===0||!i.rendered;i.rendered=true;
      i.camera.aspect=w/h;i.camera.updateProjectionMatrix();renderer.render(i.scene,i.camera);
      image.style.visibility='hidden';card.dataset.live='true';card.dataset.frames=String(frames);card.dataset.step=String(i.step);card.querySelector('.process-card-action').textContent=`${i.step+1}. ${i.project.diag[i.step][0]}`;
    }
    frames++;host.dataset.previewFrames=String(frames);host.dataset.previewActive=String(active.size);
    if(!reduced.matches||pending.size)start();
  }
}
