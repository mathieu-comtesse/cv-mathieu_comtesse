import { hache } from './moteur.js?v=m35';

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
export function brancheCarte(ctx,a,b,{t,id,progress,active,pointer}) {
  if(progress<=0||Math.abs(b.x-a.x)<6)return false;
  let spring=springs.get(id);
  if(!spring){spring={y:0,v:0,pos:.5,time:0};springs.set(id,spring);}
  if(t===null){spring.y=0;spring.v=0;}else{
    const dt=Math.min(.04,Math.max(0,t-spring.time));spring.time=t;
    let force=0,nearest=32,pos=.5;
    if(pointer)for(let i=1;i<24;i++){
      const u=i/24,p=pointBranche(a,b,u),d=Math.hypot(pointer.x-p.x,pointer.y-p.y);
      if(d<nearest){nearest=d;pos=u;force=(pointer.y<p.y?1:-1)*22*(1-d/32);}
    }
    if(force)spring.pos=pos;
    spring.v+=(145*(force-spring.y)-12*spring.v)*dt;
    spring.y+=spring.v*dt;
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
  ctx.strokeStyle=active?'rgba(255,255,255,.62)':'rgba(221,232,255,.3)';
  trace(0,progress,24);
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
