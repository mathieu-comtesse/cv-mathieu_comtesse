import {brancheCarte} from './card-wires.js?v=4';

const top=72,bottom=76,clearance=32;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function progressionFilExpo(previous,time,expose){
  if(time===null)return {head:Number(expose),time:0};
  const dt=previous?clamp(time-previous.time,0,.1):0;
  return {head:clamp((previous?.head||0)+dt*(expose?1/.32:-1/.24),0,1),time};
}

export function filExpo(ctx,last,time,{id,menu,marker,corners,height,active,pointer,opacity}){
  const ys=corners.map(p=>p.y),surface={top:Math.min(...ys),bottom:Math.max(...ys)};
  const a=Math.max(top,surface.top),b=Math.min(height-bottom,surface.bottom);
  const visible=Boolean(active&&menu&&marker.y>top+clearance&&marker.y<height-bottom-clearance&&b>a+4);
  const state=progressionFilExpo(last,time,visible);
  const progress=1-(1-state.head)**3;
  if(!menu||!progress)return {...state,progress,drawn:false};
  const end={x:marker.x,y:clamp(marker.y,a+2,Math.max(a+2,b-2))};
  ctx.save();ctx.globalAlpha=opacity;
  const drawn=brancheCarte(ctx,menu,end,{t:state.head===1?time:null,id:'expo:'+id,progress,active:true,pointer,expo:true});
  if(drawn&&end.y!==marker.y&&state.head===1){
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(end.x,end.y,2.3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  return {...state,progress,drawn};
}

export function annotationExpo(ctx,box,view,project){
  if(!box.project||!box.title||box.x1-box.x0<180||box.r1>view.T)return false;
  const side=box.x0+box.x1<view.W*.96?-1:1,edge=side<0?box.x0:box.x1;
  const near=project(edge,box.r0,box.top),foot=project(edge,box.r1,box.top);
  if(!near||!foot||near.y<62||near.y>view.H-54||foot.y<55)return false;
  const width=side===1?view.W-near.x-24:near.x-24;
  if(width<86)return false;
  ctx.save();ctx.globalAlpha=.95*view.rise;ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=1;
  ctx.font='600 15px "Shopify Inter",system-ui,sans-serif';
  ctx.textBaseline='bottom';ctx.textAlign=side>0?'left':'right';
  const length=Math.min(width-25,ctx.measureText(box.title).width),end={x:near.x+side*24,y:near.y-21};
  ctx.beginPath();ctx.arc(near.x,near.y,2.8,0,2*Math.PI);ctx.stroke();
  ctx.beginPath();ctx.moveTo(near.x+side*2.8,near.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x+side*length,end.y);ctx.stroke();
  ctx.fillText(box.title,end.x,end.y-3,length);

  ctx.globalAlpha=.7*view.rise;ctx.font='500 10px "Shopify Inter",system-ui,sans-serif';
  const draw=(points)=>{
    const pointsEcran=points.map(p=>project(...p));
    if(!pointsEcran.every(Boolean))return;
    ctx.beginPath();pointsEcran.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  };
  const label=(text,p)=>{const point=project(...p);if(point)ctx.fillText(text,point.x,point.y);};
  const row=box.r1,scale=1.25,x=edge+side*14*scale,r=row+14*scale;
  draw([[box.x0,row+4,0],[box.x0,row+30,0]]);
  draw([[box.x1,row+4,0],[box.x1,row+30,0]]);
  draw([[box.x0,row+22,0],[box.x1,row+22,0]]);
  ctx.textAlign='center';label('Δx',[(box.x0+box.x1)/2,row+39,0]);
  ctx.textAlign=side>0?'left':'right';
  const axisX=[x+side*70*scale,r,0],axisY=[x,r-110*scale,0],axisZ=[x,r,(1+.6*scale)*box.top];
  draw([axisX,[x,r,0],axisY]);draw([[x,r,0],axisZ]);
  draw(Array.from({length:13},(_,i)=>[x+side*28*scale*Math.cos(i*Math.PI/24),r-28*scale*Math.sin(i*Math.PI/24),0]));
  label('x(t)',axisX);label('y(t)',axisY);label('z(t)',axisZ);label('θ',[x+side*31*scale,r-31*scale,0]);
  ctx.restore();
  return true;
}

