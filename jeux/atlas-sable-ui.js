// Real particles fall from the silhouette of the HTML controls.
// Controls stay native buttons for keyboard and touch access.
export function creerSableUI(J){
 const canvas=document.createElement('canvas');canvas.className='sand-ui-canvas';canvas.setAttribute('aria-hidden','true');J.hote.append(canvas);const g=canvas.getContext('2d'),buttons=new Map(),particles=[];
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;let elapsed=0,w=0,h=0;
 function discover(){for(const b of J.hote.querySelectorAll('.world-controls button,.sand-tools button,.atlas-options summary,.atlas-options button,.climat-controls button,.climat-controls summary')){if(buttons.has(b))continue;const data={hot:false,pressed:false,phase:Math.random()*7,amount:0};buttons.set(b,data);b.classList.add('sand-flow-button');b.addEventListener('pointerenter',()=>data.hot=true);b.addEventListener('pointerleave',()=>{data.hot=false;data.pressed=false;});b.addEventListener('pointerdown',()=>{data.pressed=true;data.amount=1;});b.addEventListener('pointerup',()=>data.pressed=false);b.addEventListener('focus',()=>data.hot=true);b.addEventListener('blur',()=>data.hot=false);}}
 const observer=new MutationObserver(discover);observer.observe(J.hote,{childList:true,subtree:true});discover();
 return {tick(dt,t){elapsed+=dt;if(elapsed<1/30)return;dt=elapsed;elapsed=0;const box=J.hote.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,1.5);if(w!==box.width||h!==box.height){w=box.width;h=box.height;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';}g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  for(const [b,data] of buttons){if(!b.isConnected){buttons.delete(b);continue;}const r=b.getBoundingClientRect();if(!r.width||!r.height||b.closest('[hidden]')||r.bottom<box.top||r.top>box.bottom)continue;const x=r.x-box.x,y=r.y-box.y,rate=data.hot?14:1.3;data.amount=Math.max(0,data.amount-dt*2);
   if(!reduced&&Math.random()<dt*rate){const side=Math.random(),px=x+6+Math.random()*Math.max(1,r.width-12),py=y+r.height-2;particles.push({x:px,y:py,vx:(side-.5)*14,vy:5+Math.random()*12,life:.6+Math.random()*.9,size:.7+Math.random()*1.1,hue:34+Math.random()*9});}
   if(!reduced&&data.amount>0)for(let i=0;i<2;i++)particles.push({x:x+Math.random()*r.width,y:y+r.height-3,vx:(Math.random()-.5)*35,vy:-8+Math.random()*13,life:.8,size:1+Math.random(),hue:37});
  }
  while(particles.length>400)particles.shift();for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.vy+=85*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;g.fillStyle=`hsla(${p.hue},42%,${57+p.size*10}%,${Math.min(1,p.life*2)})`;g.fillRect(p.x,p.y,p.size,p.size);}
 }};
}
