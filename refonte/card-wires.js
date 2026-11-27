import { hache } from './moteur.js?v=project-face1';

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

const limit = n => Math.max(0, Math.min(1, n));
const ease = n => n*n*(3-2*n);

export function avanceFil(state, time, visible, delay=0) {
  if(time===null)return {head:Number(visible),time:null,age:0};
  const dt=state?.time==null?0:Math.min(.055,Math.max(0,time-state.time));
  const age=visible?(state?.age||0)+dt:0;
  const head=limit((state?.head||0)+(visible?(age>=delay?dt/.34:0):-dt/.24));
  return {head,time,age};
}

// Une liaison sortante conserve ses ancrages jusqu'à la fin du retrait.
export function lienMenuSurvole(nav) {
  return nav.querySelector('a:hover')||nav.querySelector('a:focus-visible');
}

export function arcMenu(ctx,nav,state,time,preview,alpha=1) {
  const active=nav.querySelector('[aria-current="location"]');
  if(active!==state.active){
    state.previous=state.active;
    state.active=active;
    state.changed=time??0;
  }
  const target=preview||((time!==null&&time-state.changed<.68)?state.previous:null);
  const arcs=state.arcs??=[];
  if(active&&target&&active!==target&&!arcs.some(a=>a.source===active&&a.target===target)){
    arcs.push({source:active,target,progress:null});
  }
  const rows=[...nav.querySelectorAll('a')].map(origineChapitre);
  for(const arc of arcs){
    const selected=arc.source===active&&arc.target===target;
    arc.progress=avanceFil(arc.progress,time,selected);
    const edge=ease(arc.progress.head);
    if(!edge)continue;
    const [start,end]=[arc.source,arc.target].map(origineChapitre);
    const gap=end.y-start.y;
    if(Math.abs(gap)<2)continue;
    const reach=Math.min(105,19+Math.abs(gap)*.32);
    // La courbe quitte le menu à l'horizontale et rejoint le point d'arrivée.
    const point=t=>({x:start.x+(end.x-start.x)*t+reach*4*t*(1-t),
      y:start.y+gap*ease(t)});
    const pulse=selected&&time!==null?limit((arc.progress.age-.29)/.57):0;
    ctx.save();
    ctx.lineCap='round';
    ctx.lineWidth=.85;
    const light=ctx.createLinearGradient(start.x,start.y,end.x,end.y);
    light.addColorStop(0,'#c1f7edbb');light.addColorStop(.56,'#b4d7fc48');light.addColorStop(1,'#e5f7ffaf');
    ctx.strokeStyle=light;
    ctx.globalAlpha=alpha*Math.min(1,edge*2);
    ctx.beginPath();ctx.moveTo(start.x,start.y);
    for(let i=1;i<=32;i++){
      const p=point(i*edge/32);
      ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
    for(const row of rows){
      const ratio=(row.y-start.y)/gap;
      if(ratio<=.01||ratio>=.99)continue;
      let lo=0,hi=1;
      for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(ease(mid)<ratio)lo=mid;else hi=mid;}
      const t=(lo+hi)/2;
      if(t>=edge)continue;
      const pin=point(t), endX=row.x+5;
      const spread=limit((edge-t)*6);
      const branchGlow=Math.max(0,1-Math.abs(pulse-t)*7);
      ctx.globalAlpha=alpha*spread;
      ctx.strokeStyle=branchGlow>.2?'#a9efd994':'#c4deef45';
      ctx.beginPath();ctx.moveTo(pin.x,row.y);ctx.lineTo(pin.x+(endX-pin.x)*spread,row.y);ctx.stroke();
    }
    ctx.globalAlpha=alpha;
    ctx.fillStyle='#e5fff9';
    ctx.beginPath();ctx.arc(start.x,start.y,2.2,0,Math.PI*2);ctx.fill();
    const tip=point(edge);
    ctx.beginPath();ctx.arc(tip.x,tip.y,edge<1?1.7:2.35,0,Math.PI*2);ctx.fill();
    if(pulse>0&&pulse<edge){
      const light=point(pulse);
      ctx.globalAlpha=alpha*Math.sin(Math.PI*pulse)*.82;
      ctx.beginPath();ctx.arc(light.x,light.y,1.6,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  state.arcs=arcs.filter(arc=>arc.progress.head>0||arc.source===active&&arc.target===target);
}
