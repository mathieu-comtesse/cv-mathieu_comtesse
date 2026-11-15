/**
 * Silhouettes scientifiques 2D autour du parcours Expo.
 * Réinterprétation autonome des repères vus dans les vidéos de référence :
 * torus filaire, immeubles en projection, formules et échelle de profondeur.
 * Aucun réseau, aucune texture ou code tiers.
 */
const TAU = Math.PI * 2;
const edge = (ctx,a,b,c,d)=>{ctx.moveTo(a,b);ctx.lineTo(c,d);};
function torus(ctx,cx,cy,R,alpha,t,q){
  const minor=R*.28,tilt=-.32+.015*Math.sin(t*.2),sn=Math.sin(tilt),cs=Math.cos(tilt);
  const U=q<.5?14:24,V=q<.5?5:9;
  const point=(u,v)=>{const r=R+minor*Math.cos(v),x=Math.cos(u)*r,y=Math.sin(u)*r*.78+Math.sin(v)*minor*.9;return[cx+x*cs-y*sn,cy+x*sn+y*cs];};
  ctx.strokeStyle=`rgba(215,224,239,${alpha})`;ctx.lineWidth=.6;
  for(let v=0;v<V;v++){ctx.beginPath();for(let u=0;u<=U;u++){const [x,y]=point(u*TAU/U,v*TAU/V);if(!u)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
  for(let u=0;u<U;u++){ctx.beginPath();for(let v=0;v<=V;v++){const [x,y]=point(u*TAU/U,v*TAU/V);if(!v)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
}
function building(ctx,x,y,w,h,right,alpha,q){
  const rows=q<.5?3:5,cols=q<.5?2:4,dx=w*(right?-.4:.4),dy=-w*.34;
  ctx.strokeStyle=`rgba(207,218,239,${alpha})`;ctx.lineWidth=.65;ctx.beginPath();
  edge(ctx,x,y,x+w,y);edge(ctx,x+w,y,x+w,y-h);edge(ctx,x+w,y-h,x,y-h);edge(ctx,x,y-h,x,y);
  edge(ctx,x,y-h,x+dx,y-h+dy);edge(ctx,x+w,y-h,x+w+dx,y-h+dy);
  edge(ctx,x+dx,y-h+dy,x+w+dx,y-h+dy);edge(ctx,x+w+dx,y-h+dy,x+w+dx,y+dy);edge(ctx,x+w,y,x+w+dx,y+dy);
  for(let i=1;i<rows;i++){let off=h*i/rows;edge(ctx,x,y-off,x+w,y-off);edge(ctx,x+w,y-off,x+w+dx,y-off+dy);}
  for(let i=1;i<cols;i++){let xx=x+w*i/cols;edge(ctx,xx,y,xx,y-h);}
  for(let c=0;c<cols;c++)for(let r=0;r<rows;r++){
    const xa=x+w*(c+.21)/cols,xb=x+w*(c+.79)/cols,ya=y-h*(r+.2)/rows,yb=y-h*(r+.82)/rows;
    edge(ctx,xa,ya,xb,ya);edge(ctx,xb,ya,xb,yb);edge(ctx,xb,yb,xa,yb);
  }
  ctx.stroke();
}
function label(ctx,x,y,value,opacity,px=10){ctx.font=`${px}px ui-monospace, Consolas, monospace`;ctx.fillStyle=`rgba(209,223,247,${opacity})`;ctx.fillText(value,x,y);}
export function drawExpoReferenceOrnaments(ctx,view,{width=view.W,height=view.H,quality=1,reduce=false}={}){
  const w=Number(width),h=Number(height);if(!ctx||!view||w<600||h<=0)return;
  const q=Math.max(0,Math.min(1,Number(quality))),t=reduce?0:Number(view.t||0),depth=Math.max(0,Number(view.offset||0));
  const drift=reduce?0:Math.sin(t*.16)*4,rad=Math.min(w*.065,h*.1);
  torus(ctx,w*.86,h*.31-drift,rad,.28,t,q);
  if(q>=.5)torus(ctx,w*.098,h*.72,rad*.55,.18,-t,q);
  building(ctx,w*.031,h*.85,Math.min(53,w*.043),Math.min(210,h*.23),false,.3,q);
  building(ctx,w*.925,h*.83,Math.min(61,w*.045),Math.min(185,h*.21),true,.33,q);
  const first=Math.max(0,Math.floor(depth/500)*500);
  for(let i=0;i<5;i++){
    const num=first+500*i,y=h*(.08+(num-depth)/500*.24);
    if(y<h*.04||y>h*.93)continue;
    label(ctx,w*.22,y,String(num),.24);label(ctx,w*.76,y,String(num),.24);
    ctx.strokeStyle='rgba(193,210,237,.15)';ctx.lineWidth=.7;ctx.beginPath();edge(ctx,w*.275,y-2,w*.289,y-2);edge(ctx,w*.747,y-2,w*.76,y-2);ctx.stroke();
  }
  if(q>=.5){
    label(ctx,w*.065,h*.54,'y = sin(2πx + φ)',.38,11);
    label(ctx,w*.075,h*.565,'φ  -  3.1416',.22,9);
    label(ctx,w*.818,h*.56,'x² + y² = r²',.34,10);
    label(ctx,w*.812,h*.581,'r : variable',.24,9);
    label(ctx,w*.09,h*.81,'0.6 m',.3,9);
    label(ctx,w*.905,h*.81,'0.9 m',.3,9);
  }
}
