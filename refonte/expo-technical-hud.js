import {drawExpoReferenceOrnaments} from './expo-reference-ornaments.js';
/**
 * Décor technique du mode exposition de comtesse.me.
 * Recréation originale d'après les vidéos Shopify Fall '26 fournies :
 * grandes orbites, graduations, cubes filaires et repères autour du chemin.
 * Aucun code, texture, police ou dépendance Shopify.
 * Se dessine dans le canvas 2D existant, avant le sol, sans nouvelle boucle RAF.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const line=(ctx,x1,y1,x2,y2)=>{ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);};
const orbit=(ctx,x,y,r,alpha,a,b)=>{
  ctx.strokeStyle='rgba(193,209,245,'+alpha+')';
  ctx.beginPath();ctx.arc(x,y,r,a,b);ctx.stroke();
};
function cube(ctx,x,y,size,phase,opacity){
  const angle=.34+.05*Math.sin(phase),s=Math.sin(angle),c=Math.cos(angle);
  const vertices=[];
  for(let z=-1;z<=1;z+=2)for(let py=-1;py<=1;py+=2)for(let px=-1;px<=1;px+=2){
    vertices.push({x:x+size*(px*c+z*s*.68),y:y+size*(py*.87-z*.34+px*.11)});
  }
  ctx.lineWidth=.75;
  ctx.strokeStyle='rgba(215,226,250,'+opacity+')';
  ctx.beginPath();
  for(let i=0;i<8;i++)for(const k of [1,2,4])if(!(i&k)){
    const a=vertices[i],b=vertices[i|k];line(ctx,a.x,a.y,b.x,b.y);
  }
  ctx.stroke();ctx.fillStyle='rgba(232,239,255,'+(opacity*.9)+')';
  for(const p of vertices)ctx.fillRect(p.x-1,p.y-1,2,2);
}
export function drawExpoTechnicalHud(ctx,view,options={}){
  if(!ctx||!view)return;
  const w=Number(options.width||view.W),h=Number(options.height||view.H);
  const amount=clamp(Number(view.e??0),0,1);
  if(!(w>0&&h>0)||amount<.025)return;
  const quality=clamp(Number(options.quality??1),0,1);
  const reduce=options.reduce===true;
  const time=reduce?0:Number(view.t||0);
  const offset=Number(view.offset||0);
  const f=clamp((amount-.08)/.55,0,1),fade=f*f*(3-2*f);
  const drift=reduce?0:Math.sin(time*.16)*4;
  const bias=clamp(offset/Math.max(h,1),-5,20);
  const centers=[
    {x:-w*.08,y:h*.49+drift,flip:false},
    {x:w*1.1,y:h*.35-drift,flip:true}
  ];
  ctx.save();ctx.globalAlpha*=fade;ctx.lineWidth=.75;
  for(let side=0;side<centers.length;side++){
    const p=centers[side],base=Math.max(w*.28,h*.43);
    const start=p.flip?Math.PI*.58:-Math.PI*.54;
    const end=p.flip?Math.PI*1.38:Math.PI*.52;
    for(const [i,scale] of [.57,.76,.98,1.28].entries()){
      orbit(ctx,p.x,p.y,base*scale,[.12,.2,.25,.09][i],start,end);
    }
    const count=quality<.5?24:48,radius=base*.98;
    ctx.strokeStyle='rgba(202,216,242,.24)';ctx.beginPath();
    for(let i=0;i<=count;i++){
      const a=start+(end-start)*i/count,dx=Math.cos(a),dy=Math.sin(a);
      const len=i%6===0?15:i%3===0?9:4;
      line(ctx,p.x+dx*(radius-len),p.y+dy*(radius-len),
        p.x+dx*(radius+2),p.y+dy*(radius+2));
    }
    ctx.stroke();
    ctx.strokeStyle='rgba(168,190,230,.13)';ctx.beginPath();
    line(ctx,p.x,p.y,p.flip?w*.85:w*.15,p.y);
    line(ctx,p.x,p.y-h*.42,p.x,p.y+h*.42);
    ctx.stroke();
    cube(ctx,p.flip?w*.96:w*.065,h*.19+bias*1.2,
      clamp(w*.035,17,46),time*.2+side,.33);
    if(quality>=.5)cube(ctx,p.flip?w*1.025:-w*.016,h*.69-bias*1.6,
      clamp(w*.058,30,76),time*.1+side,.22);
    ctx.strokeStyle='rgba(220,230,255,.31)';ctx.beginPath();
    for(let k=0;k<8;k++){
      const px=p.flip?w*(.87+.024*(k%4)):w*(.045+.027*(k%4));
      const py=h*(.14+.19*Math.floor(k/4))+drift*(k%2?-1:1);
      line(ctx,px-3,py,px+3,py);line(ctx,px,py-3,px,py+3);
    }
    ctx.stroke();
  }
  drawExpoReferenceOrnaments(ctx,view,{width:w,height:h,quality,reduce});
  ctx.restore();
}