import {surfaceGraph,fluidePointeur} from './fall26-graph-adapter.js?v=1';
import {tonePapier} from './section-colours.js?v=5';
// La poussière est attachée au papier. Les éclats du pointeur vivent dans le plan de l’écran.
const grains=Array.from({length:110},()=>({
  x:Math.random(),y:Math.random(),phase:Math.random()*6.28,size:Math.random()>.92?3:1.4
}));
const sparks=[];
let fluide,graph,lastFrame=0;
function flatPointer(){
  if(!graph){graph=surfaceGraph("position:fixed;inset:0;pointer-events:none;z-index:4;width:100%;height:100%");graph.canvas.dataset.cvPointerShader="";document.body.append(graph.canvas);fluide=fluidePointeur();}
  return graph;
}
let last=null,overlay,raf=0;
function paintSparks(time){
  raf=0;
  const expo=document.documentElement.classList.contains('cv-parity-active');
  if(graph)graph.canvas.style.display=expo?'none':'';
  if(graph?.active&&!expo){
    const t=time/1000,settings=fluide.settings,e=fluide.alive(t,settings);
    const root=document.documentElement,tone=tonePapier(root.dataset.cvInk);
    const intensity=root.hasAttribute('data-cv-flat-colour')?1:.4;
    graph.render(innerWidth,innerHeight,Math.min(2,devicePixelRatio||1),[],fluide.frame(tone,settings,intensity,0,t));
    if(e){raf=requestAnimationFrame(paintSparks);lastFrame=t;return;}
    if(t-lastFrame<.1){raf=requestAnimationFrame(paintSparks);return;}
  }
  if(!overlay){
    overlay=document.createElement('canvas');
    overlay.setAttribute('aria-hidden','true');
    overlay.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:90;width:100%;height:100%';
    document.body.append(overlay);
  }
  const dpr=Math.min(2,devicePixelRatio||1);
  if(overlay.width!==Math.round(innerWidth*dpr)||overlay.height!==Math.round(innerHeight*dpr)){
    overlay.width=Math.round(innerWidth*dpr);overlay.height=Math.round(innerHeight*dpr);
  }
  const ctx=overlay.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
  etincelles(ctx,time/1000);
  if(sparks.length)raf=requestAnimationFrame(paintSparks);
}
addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const now=performance.now()/1000;
  if(last&&now-last.t<.035)return;
  const previous=last, distance=previous?Math.hypot(e.clientX-previous.x,e.clientY-previous.y):0;
  last={x:e.clientX,y:e.clientY,t:now};
  if(!document.documentElement.classList.contains("cv-parity-active")&&flatPointer().active&&previous){
    fluide.stir(previous,last,Math.max(.008,now-previous.t),now,fluide.settings);
    if(!raf)raf=requestAnimationFrame(paintSparks);
    return;
  }
  if(distance<3)return;
  for(let i=0;i<Math.min(4,Math.ceil(distance/12));i++){
    sparks.push({x:e.clientX+(Math.random()-.5)*12,y:e.clientY+(Math.random()-.5)*12,t:now,
      vx:(Math.random()-.5)*82,vy:-15-Math.random()*48,size:2+Math.random()*4});
  }
  if(sparks.length>72)sparks.splice(0,sparks.length-72);
  if(!raf)raf=requestAnimationFrame(paintSparks);
},{passive:true});
export function poussiere(ctx,W,H,t,offset,project){
  ctx.save();
  for(const g of grains){
    const row=((g.y*H-offset*.34)%H+H)%H, p=project?project(g.x,row/H):{x:g.x*W,y:row};
    if(!p)continue;
    ctx.fillStyle='rgba(228,241,255,'+(.03+.4*((1+Math.sin((t??0)*1.8+g.phase))*.5)**4)+')';
    ctx.fillRect(p.x,p.y,g.size,g.size);
  }
  ctx.restore();
}
// Deux silhouettes filaires placées à des coordonnées fixes du chemin, projetées par la même caméra que les cadres.
export function reperesAtelier(ctx,view,project,firstRow){
  if(view.e<.12||!Number.isFinite(firstRow))return;
  const scale=view.W/1440;
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=1;
  function figure(row,draw){
    const base=firstRow+row-view.offset;
    if(base<0||base>view.T)return;
    const at=([x,y,z])=>project(1.23*view.W+x*scale,base+y*scale,z*scale);
    const center=at([0,0,70]);
    if(!center||center.y< -130||center.y>view.H+130)return;
    const line=points=>{
      const projected=points.map(at);
      if(projected.some(p=>!p))return;
      ctx.moveTo(projected[0].x,projected[0].y);
      for(const p of projected.slice(1))ctx.lineTo(p.x,p.y);
    };
    ctx.beginPath();draw(line);ctx.stroke();
  }
  figure(-470,line=>{
    const point=(u,v)=>{
      const ring=118+38*Math.cos(v),x=ring*Math.cos(u),y=ring*Math.sin(u),z=38*Math.sin(v);
      return [x,y*.68-z*.73,96+y*.73+z*.68];
    };
    for(let i=0;i<16;i++)line(Array.from({length:25},(_,j)=>point(i*Math.PI/8,j*Math.PI/12)));
    for(let j=0;j<8;j++)line(Array.from({length:49},(_,i)=>point(i*Math.PI/24,j*Math.PI/4)));
  });
  // Réservoir et cadran du Point financier.
  figure(960,line=>{
    const ring=(x,y,z,r,i)=>[x+r*Math.cos(i*Math.PI/16),y+r*Math.sin(i*Math.PI/16),z];
    for(const z of [0,20,60,106,144])line(Array.from({length:33},(_,i)=>ring(-34,0,z,45,i)));
    for(let i=0;i<32;i+=4)line([ring(-34,0,0,45,i),ring(-34,0,144,45,i)]);
    line([[12,0,22],[52,0,22],[52,0,72]]);
    line(Array.from({length:33},(_,i)=>[52+33*Math.cos(i*Math.PI/16),0,100+33*Math.sin(i*Math.PI/16)]));
    line([[52,0,100],[71,0,118]]);
  });
  ctx.restore();
}
let notePanel,noteText,noteLink,shown;
function mountNotes(){
  notePanel=document.createElement('aside');
  notePanel.className='cv-wire-note';notePanel.hidden=true;
  const title=document.createElement('strong');title.textContent='Notes';
  noteText=document.createElement('p');noteLink=document.createElement('a');
  notePanel.append(title,noteText,noteLink);document.body.append(notePanel);
}
export function notesCadre(ctx,targets,W,H,pointer){
  if(!notePanel)mountNotes();
  // Choix stable lors du passage de la carte à sa note.
  const current=targets.filter(n=>n.y<H*.82&&n.bottom>H*.16);
  const target=current.find(n=>n.element.contains(document.activeElement)&&document.activeElement!==document.body)||
    current.find(n=>pointer.y>=n.y&&pointer.y<=n.bottom&&pointer.x>=n.element.getBoundingClientRect().left&&pointer.x<=n.x)||
    current.find(n=>n.element===shown)||current[0];
  if(!target||W<940){notePanel.hidden=true;shown=null;return;}
  const {element,x,y}=target,link=element.querySelector('.cv-pf-link'),source=element.querySelector('.sc-note');
  if(!link||!source){notePanel.hidden=true;shown=null;return;}
  const room=W-x-23,edge=Math.max(55,Math.min(H-58,y));
  const width=Math.min(270,room-12);
  if(width<142){notePanel.hidden=true;shown=null;return;}
  const nx=Math.min(W-width-12,x+32);

  if(element!==shown){
    noteText.textContent=source.textContent;
    noteLink.href=link.href;noteLink.textContent=element.querySelector('h3')?.textContent||'Lire la fiche';
    shown=element;
  }
  notePanel.style.width=width+'px';
  notePanel.hidden=false;
  const ny=Math.max(65,Math.min(H-notePanel.offsetHeight-16,edge+48));
  notePanel.style.transform='translate('+nx+'px,'+ny+'px)';
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.52)';ctx.lineWidth=.85;
  const sy=Math.max(55,Math.min(H-18,y+12)),ey=ny+19;
  ctx.beginPath();ctx.moveTo(x,sy);ctx.lineTo(nx-5,ey);ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillRect(x-2,sy-2,4,4);ctx.fillRect(nx-7,ey-2,4,4);ctx.restore();
}
export function etincelles(ctx,t){
  if(t===null)return;
  ctx.save();
  for(let i=sparks.length-1;i>=0;i--){
    const s=sparks[i],age=t-s.t;
    if(age>.62){sparks.splice(i,1);continue;}
    const size=s.size*(1-age/.65),x=s.x+s.vx*age,y=s.y+s.vy*age+age*age*42;
    ctx.globalAlpha=Math.max(0,1-age/.62);
    ctx.fillStyle='#f8fbff';ctx.fillRect(x,y,size,size);
    if(document.documentElement.classList.contains('cv-parity-active')){
      ctx.fillStyle='#a6c5e2';ctx.beginPath();ctx.moveTo(x+size,y);ctx.lineTo(x+size*1.55,y-size*.35);ctx.lineTo(x+size*1.55,y+size*.65);ctx.lineTo(x+size,y+size);ctx.fill();
      ctx.fillStyle='#d9edff';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+size*.55,y-size*.35);ctx.lineTo(x+size*1.55,y-size*.35);ctx.lineTo(x+size,y);ctx.fill();
    }else{
      ctx.fillStyle='#a5b7ca';ctx.fillRect(x+size,y+size*.22,size*.4,size*.78);
    }
  }
  ctx.restore();
}
