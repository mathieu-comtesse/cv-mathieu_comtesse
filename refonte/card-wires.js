import { hache } from './moteur.js?v=m36';

// Même tangente horizontale aux deux extrémités que dans le tracé des cartes Fall 26.
export function pointBranche(a,b,t) {
  const dx=b.x-a.x, dy=b.y-a.y;
  const tension=Math.max(.1,.44/(1+.6*Math.abs(dy)/Math.max(1,Math.abs(dx))));
  const u=1-t;
  return {
    x:u*u*u*a.x+3*u*u*t*(a.x+dx*tension)+3*u*t*t*(b.x-dx*tension)+t*t*t*b.x,
    y:a.y+dy*t*t*(3-2*t)
  };
}

const springs=new Map();
export function brancheCarte(ctx,a,b,{t,id,progress,active,pointer,emit,expo=false}) {
  if(progress<=0||Math.abs(b.x-a.x)<6)return false;
  let spring=springs.get(id);
  if(!spring){spring={y:0,v:0,pos:.5,time:t||0,last:null,brushed:-Infinity};springs.set(id,spring);}
  if(t===null){spring.y=0;spring.v=0;spring.last=null;}else{
    const dt=Math.min(.04,Math.max(0,t-spring.time));spring.time=t;
    const previous=spring.last;
    const omega=2*Math.PI*3.1,damping=.15,maxVelocity=14*omega/.8;
    if(pointer&&previous&&t-spring.brushed>=.065&&Math.hypot(pointer.x-previous.x,pointer.y-previous.y)>1){
      const left=Math.min(pointer.x,previous.x)-8,right=Math.max(pointer.x,previous.x)+8;
      const top=Math.min(pointer.y,previous.y)-8,bottom=Math.max(pointer.y,previous.y)+8;
      if(right>=Math.min(a.x,b.x)&&left<=Math.max(a.x,b.x)&&bottom>=Math.min(a.y,b.y)&&top<=Math.max(a.y,b.y)){
        const dx=pointer.x-previous.x,dy=pointer.y-previous.y,length=dx*dx+dy*dy;
        let nearest=8;
        for(let i=3;i<46;i++){
          const u=i/48,p=pointBranche(a,b,u),k=Math.min(1,Math.max(0,((p.x-previous.x)*dx+(p.y-previous.y)*dy)/length));
          const d=Math.hypot(p.x-previous.x-k*dx,p.y-previous.y-k*dy);
          if(d<nearest){nearest=d;spring.pos=u;}
        }
        if(nearest<8){
          const shift=(pointBranche(a,b,spring.pos+.01).y-pointBranche(a,b,spring.pos-.01).y);
          const span=(pointBranche(a,b,spring.pos+.01).x-pointBranche(a,b,spring.pos-.01).x);
          const normal=Math.hypot(span,shift)||1;
          const impulse=(dy*span-dx*shift)/normal/Math.max(.008,dt)*.2;
          spring.v=Math.max(-maxVelocity,Math.min(maxVelocity,spring.v+impulse));spring.brushed=t;
        }
      }
    }
    if(pointer)spring.last={x:pointer.x,y:pointer.y};
    for(let elapsed=dt;elapsed>0;elapsed-=1/240){
      const step=Math.min(elapsed,1/240);
      spring.v+=(-omega*omega*spring.y-2*damping*omega*spring.v)*step;
      spring.y+=spring.v*step;
    }
  }
  const sample=u=>{
    const p=pointBranche(a,b,u);
    p.y+=spring.y*Math.exp(-32*(u-spring.pos)**2)*4*u*(1-u);
    return p;
  };
  const trace=(from,to,steps)=>{
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const p=sample(from+(to-from)*i/steps);
      if(i)ctx.lineTo(p.x,p.y);
      else ctx.moveTo(p.x,p.y);
    }
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap='round';
  ctx.lineWidth=active?1:0.75;
  ctx.strokeStyle=expo?'#fff':active?'rgba(255,255,255,.62)':'rgba(221,232,255,.3)';
  if(emit){
    // Opacité du profil des fils dans wire-BRlyKbjJ.js : départ, milieu, arrivée.
    for(let i=0;i<24;i++){
      const u=i/24,v=(i+1)/24,k=u<.5?1-u*1.6:.2+(u-.5)*1.3;
      emit(sample(u*progress),sample(v*progress),'238,245,255',.2*k,.75);
    }
  }else trace(0,progress,24);
  if(t!==null&&progress>.94){
    for(let i=0;i<2;i++){
      const hash=hache(id+':dot:'+i),speed=(.1+hash%7*.015)*1.5,phase=(hash>>>8)%1000/1000;
      const pos=time=>{const p=time*speed+phase,frac=p-Math.floor(p);return hash%2?frac:1-frac;};
      const head=pos(t),tail=pos(t-1);
      if(Math.abs(head-tail)>.5||Math.max(head,tail)>progress)continue;
      const p=sample(tail),q=sample(head);
      if(Math.hypot(p.x-q.x,p.y-q.y)<.1)continue;
      const gradient=ctx.createLinearGradient(p.x,p.y,q.x,q.y);
      gradient.addColorStop(0,'rgba(236,247,255,0)');
      gradient.addColorStop(1,'rgba(236,247,255,.86)');
      ctx.strokeStyle=gradient;
      ctx.lineWidth=1.32;
      trace(tail,head,8);
      ctx.fillStyle='#ecf7ff';
      ctx.fillRect(q.x-1,q.y-1,2,2);
    }
  }
  ctx.restore();
  return true;
}

export function avanceBranche(y,H,reduit) {
  if(reduit)return 1;
  const n=Math.min(1,Math.max(0,(H*.92-y)/(H*.43)));
  return n*n*(3-2*n);
}

export function origineChapitre(lien) {
  const r=lien.getBoundingClientRect();
  return {x:r.right-2,y:r.top+r.height/2};
}

// Un arc dans la gouttière relie le chapitre lu à celui que le lecteur survole.
export function arcMenu(ctx,nav,state,time,preview,alpha=1) {
  const active=nav.querySelector('[aria-current="location"]');
  if(active!==state.active){
    state.previous=state.active;
    state.active=active;
    state.changed=time??0;
  }
  const other=preview||((time!==null&&time-state.changed<.65)?state.previous:null);
  const visible=Boolean(active&&other&&other!==active);
  const dt=time===null?0:Math.min(.05,Math.max(0,time-(state.time??time)));
  state.amount=time===null?Number(visible):Math.max(0,Math.min(1,(state.amount||0)+dt*(visible?5:-7)));
  state.time=time;
  if(visible)state.ends=[active,other];
  if(!state.amount||!state.ends)return;
  const [source,target]=state.ends.map(origineChapitre);
  const radius=Math.max(20,Math.min(88,Math.abs(source.y-target.y)*.46));
  const point=t=>({x:source.x+(target.x-source.x)*t+4*radius*t*(1-t),y:source.y+(target.y-source.y)*t});
  const edge=state.amount*state.amount*(3-2*state.amount);
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.lineWidth=.85;
  ctx.strokeStyle='#d8edff91';
  ctx.beginPath();
  for(let i=0;i<=28;i++){
    const p=point(i*edge/28);
    if(i)ctx.lineTo(p.x,p.y);
    else ctx.moveTo(p.x,p.y);
  }
  ctx.stroke();
  ctx.strokeStyle='#d8edff36';
  for(const lien of nav.querySelectorAll('a')){
    const row=origineChapitre(lien);
    const t=(row.y-source.y)/(target.y-source.y);
    if(t<=.02||t>=edge-.02)continue;
    ctx.beginPath();
    ctx.moveTo(row.x+7,row.y);
    ctx.lineTo(point(t).x,row.y);
    ctx.stroke();
  }
  ctx.fillStyle='#fff';
  for(const p of [source,point(edge)]){
    ctx.beginPath();
    ctx.arc(p.x,p.y,2.25,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}
