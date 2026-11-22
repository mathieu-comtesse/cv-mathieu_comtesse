import {c as creerSurface} from './fall26-graph/pointer-DHETQCIL.js';
import {b as SimulationFluide,F as réglagesFluide} from './fall26-graph/renderer-ObA0-sKL.js';

const vide=new Float32Array(0);
const transparent=[0,0,0,0];
export function brancheSpectrale(data,a,b,colour,opacity,clip,width=.75){
  const rgb=colour.split(',').map(n=>Number(n)/255);
  data.push(a.x,a.y,b.x,b.y,width,width,0,0,...rgb,opacity,...rgb,opacity*.48,...clip);
}
export function nœudSpectral(data,p,colour,opacity,clip,radius,shape=0){
  const rgb=colour.split(',').map(n=>Number(n)/255);
  data.push(p.x,p.y,radius,shape,...rgb,opacity,...clip,-1,0,0,1);
}
export function surfaceGraph(placement){
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText=placement;
  const controller=new AbortController();
  let renderer=null,lastW=0,lastH=0,lastDpr=0;
  creerSurface(canvas,'webgpu',controller.signal,()=>{
    renderer?.dispose();renderer=null;canvas.hidden=true;
  }).then(r=>{renderer=r;canvas.hidden=false;}).catch(()=>{canvas.hidden=true;});
  canvas.hidden=true;
  return {
    canvas,
    get active(){return Boolean(renderer);},
    render(width,height,dpr,edges=[],fluid,nodes=[]){
      if(!renderer||!width||!height)return;
      if(lastW!==width||lastH!==height||lastDpr!==dpr){
        renderer.resize(width,height,dpr);lastW=width;lastH=height;lastDpr=dpr;
      }
      renderer.draw({edges:new Float32Array(edges),edgeCount:edges.length/20,nodes:nodes.length?new Float32Array(nodes):vide,nodeCount:nodes.length/16,background:transparent,fluid});
    }
  };
}
export function fluidePointeur(){
  const fluide=new SimulationFluide();
  fluide.settings=réglagesFluide;
  return fluide;
}

