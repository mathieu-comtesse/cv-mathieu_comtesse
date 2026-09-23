/* Arène des arcanes : jeu de combat en pixel art, tout dessiné au code.
   La simulation tourne dans un repère de 384 × 216 ; l'image est rendue sur une toile de 256 × 144,
   comme les vidéos de référence (gros pixels, contour sombre, lueurs tramées). L'interface est dessinée à part, au triple. */
(()=>{
'use strict';
const W=384,H=216,GROUND=184,TAU=Math.PI*2,BODY=62;
const RW=256,RH=144,S=RW/W,SG=Math.round(GROUND*S),HS=3;
const X=x=>Math.round(x*S),Y=y=>Math.round(y*S);
const $=id=>document.getElementById(id);
const cv=$('arena-canvas'),ctx=cv.getContext('2d');cv.width=RW;cv.height=RH;ctx.imageSmoothingEnabled=false;
const hc=$('arena-hud'),hx=hc.getContext('2d');hc.width=RW*HS;hc.height=RH*HS;hx.imageSmoothingEnabled=false;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const k=c.getContext('2d');k.imageSmoothingEnabled=false;return [c,k];};
const SPW=104,SPH=80,OXS=52,OYS=70;
const [bgC,bg]=mk(RW,RH),[spr,sk]=mk(SPW,SPH),[sil,sl]=mk(SPW,SPH);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const INK='#0c0916';
let K=ctx,OX=0,OY=0;
const P=(x,y,w,h,c)=>{K.fillStyle=c;K.fillRect(Math.round(x),Math.round(y),w,h);};
const q=(x,y,c)=>{K.fillStyle=c;K.fillRect(Math.round(OX+x),Math.round(OY+y),1,1);};
const qr=(x,y,w,h,c)=>{if(w>0&&h>0){K.fillStyle=c;K.fillRect(Math.round(OX+x),Math.round(OY+y),w,h);}};
const qh=(x0,x1,y,c)=>{x0=Math.round(x0);x1=Math.round(x1);if(x1>=x0){K.fillStyle=c;K.fillRect(OX+x0,Math.round(OY+y),x1-x0+1,1);}};
function line(x0,y0,x1,y1,c,t=1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,o=t>1?Math.floor(t/2):0;let e=dx+dy;K.fillStyle=c;
 for(let i=0;i<500;i++){K.fillRect(x0-o,y0-o,t,t);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}}
const ql=(x0,y0,x1,y1,c,t=1)=>line(OX+x0,OY+y0,OX+x1,OY+y1,c,t);
function disc(cx,cy,r,c){for(let y=-r;y<=r;y++){const w=Math.floor(Math.sqrt(Math.max(0,r*r-y*y))+.35);P(cx-w,cy+y,w*2+1,1,c);}}
function ring(cx,cy,r,c,squash=1,step=1){K.fillStyle=c;const n=Math.max(12,Math.round(r*6.5));for(let i=0;i<n;i+=step){const a=i/n*TAU;K.fillRect(Math.round(cx+Math.cos(a)*r),Math.round(cy+Math.sin(a)*r*squash),1,1);}}
const rnd=(()=>{let s=7;return ()=>(s=(s*1664525+1013904223)>>>0)/4294967296;})();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
const dith=(x,y,v)=>v>(BAYER[y&3][x&3]+.5)/16;

// --- Lueurs tramées : un disque dont la densité de pixels décroît vers le bord, mis en cache ------
const glowCache=new Map();
function glowTex(r,col,str){const key=r+'|'+col+'|'+str;let c=glowCache.get(key);if(c)return c;const n=r*2+1,[cc,k]=mk(n,n);k.fillStyle=col;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const d=Math.hypot(x-r,y-r)/(r+.5);if(d>1)continue;if(dith(x,y,Math.pow(1-d,1.4)*str))k.fillRect(x,y,1,1);}
 if(glowCache.size>600)glowCache.clear();glowCache.set(key,cc);return cc;}
function dglow(x,y,r,col,str=1,add=true,g=ctx){r=Math.round(clamp(r,1,90));if(str<=.02)return;const t=glowTex(r,col,Math.round(clamp(str,0,3)*10)/10);g.globalCompositeOperation=add?'lighter':'source-over';g.drawImage(t,Math.round(x)-r,Math.round(y)-r);g.globalCompositeOperation='source-over';}
function star(x,y,sz,col,core='#ffffff'){x=Math.round(x);y=Math.round(y);if(sz<=1){P(x,y,1,1,col);return;}const a=sz-1;P(x-a,y,a*2+1,1,col);P(x,y-a,1,a*2+1,col);P(x,y,1,1,core);}

// --- Personnages -----------------------------------------------------------
const CHARS=[
 {id:'mage',name:'Orvyn',title:'Archimage',hp:950,speed:62,color:'#5fd4ff',
  pal:{robe:'#b3343f',robeD:'#7a1f34',robeL:'#d6544c',trim:'#f2b63c',trimD:'#b8792a',skin:'#f2c29a',skinD:'#c98464',hair:'#eef0f6',hairD:'#a9aec4',eye:'#1a1022',hat:'#a8303f',hatD:'#6b1c36',hatL:'#c94a4e',rib:'#a46cff',ribD:'#6c40c4',gem:'#3aa4ff',gemL:'#b6f0ff',claw:'#8a5cff',staff:'#a8703a',staffD:'#5e3a1e',boot:'#6b4428',bootD:'#40281a'},
  skills:[['Orbe arcanique','Maintenir pour charger, relâcher pour lancer',18,1.1],['Transfert','Téléportation dans le dos de l’adversaire',25,4],['Pluie d’étoiles','Ultime : météores sur toute l’arène',0,0]]},
 {id:'cleric',name:'Séraphine',title:'Prêtresse',hp:1000,speed:58,color:'#ffd86b',
  pal:{robe:'#b8283c',robeD:'#7a1830',robeL:'#dc4a50',white:'#f6eee2',whiteD:'#c4b8a8',corset:'#3a2430',trim:'#f2c04a',trimD:'#b07a28',skin:'#f6d2b2',skinD:'#d2967a',hair:'#f4d45e',hairD:'#c89830',hairL:'#fff2a8',eye:'#241430',iris:'#4a7ad8',bow:'#d0303e',bowD:'#801828',staff:'#eab544',staffD:'#9a6a22',shoe:'#5a2a2a'},
  skills:[['Colonne sacrée','Un pilier de lumière frappe l’adversaire',28,2.4],['Prière','Soigne et protège quelques secondes',35,8],['Jugement','Ultime : trois colonnes géantes',0,0]]},
 {id:'knight',name:'Bran',title:'Chevalier',hp:1150,speed:54,color:'#f2f6fa',
  pal:{metal:'#b8c2cf',metalD:'#6e7a8c',metalL:'#eef3f8',metalK:'#434c5c',tab:'#2f58a8',tabD:'#1e3a70',tabL:'#4a78c8',trim:'#f2b63c',trimD:'#b07a28',plume:'#d8313f',plumeD:'#8e1a2a',plumeL:'#ff6a6a',leather:'#6a4226',blade:'#e8eef4',bladeD:'#8e9aa8',skin:'#e3b08a'},
  skills:[['Charge au bouclier','Ruée qui repousse et étourdit',22,3],['Parade','Garde parfaite : renvoie les sorts, étourdit',15,4],['Lame solaire','Ultime : vague de lumière tranchante',0,0]]},
 {id:'necro',name:'Morgane',title:'Nécromancienne',hp:900,speed:60,color:'#7cf2a6',
  pal:{robe:'#3e2c5a',robeD:'#241834',robeL:'#5a4282',trim:'#6cf0a0',trimD:'#2e9a62',skin:'#cfd6e2',skinD:'#8e98ac',shade:'#140d20',eye:'#9dffc4',bone:'#ece6d4',boneD:'#aea68e',staff:'#4a3a30',staffD:'#231a16',flame:'#7cf2a6',flameL:'#e2ffe8'},
  skills:[['Feux follets','Trois esprits à tête chercheuse',28,2.8],['Drain de vie','Rayon qui vole des points de vie',30,5],['Armée d’os','Ultime : des mains surgissent du sol',0,0]]}
];
const ARENAS=[
 {name:'Rempart au clair de lune',sub:'Nuit étoilée sur les créneaux'},
 {name:'Cathédrale des vitraux',sub:'Cierges et verre coloré'},
 {name:'Forêt aux lucioles',sub:'Champignons qui luisent'},
 {name:'Forge volcanique',sub:'Lave et braises'}
];

// Pose of the fighter: body offsets, arm and weapon angles, secondary motion (hat, hem, hair).
function pose(f){const t=f.anim,st=f.state,id=f.def.id,moveBack=f.vx*f.facing<0;
 const p={bob:0,step:0,arm:1.1,wpn:-1.5,lean:0,crouch:0,air:false,sway:Math.sin(t*2.1)*.7,hem:0,smear:null,glow:0,shield:false,back:false};
 if(id==='knight'){p.arm=.9;p.wpn=-1.05;}
 if(id==='necro'){p.arm=.9;p.wpn=-1.52;}
 if(st==='idle'){p.bob=Math.floor(t*2.2)%2;}
 else if(st==='walk'){p.step=1+Math.floor(t*9)%4;p.bob=p.step%2;p.hem=moveBack?2:-2;p.sway=moveBack?1.5:-1.5;p.lean=moveBack?0:1;}
 else if(st==='jump'){p.air=true;p.step=5;p.arm=-.5;p.wpn=id==='knight'?-1.9:-1.8;p.hem=f.vy<0?1:-1;p.sway=f.vy<0?2:-1;}
 else if(st==='attack'){const k=clamp(f.stateT/f.dur,0,1);
  if(id==='knight'&&f.sub===2){const a=k<.35?k/.35:1;p.arm=-1.6+a*1.9;p.wpn=-2.4+a*2.4;p.lean=a>.9?2:-1;if(k>.3&&k<.6)p.smear={r:22,a0:-2.2,a1:.2,c:'#fff3b0'};p.glow=1;}
  else{const c=f.combo,a=k<.3?0:k<.5?(k-.3)/.2:1;
   if(c===0){p.arm=-.2+a*.4;p.wpn=-2.1+a*2.2;p.lean=a>0?1:-1;if(a>0&&a<1)p.smear={r:id==='knight'?20:24,a0:-1.9,a1:.15};}
   else if(c===1){p.arm=.9-a*1.4;p.wpn=.9-a*2.3;p.lean=a>0?1:0;if(a>0&&a<1)p.smear={r:id==='knight'?20:24,a0:.8,a1:-1.4};}
   else{p.arm=-1.9+a*2.1;p.wpn=-2.9+a*3.2;p.lean=a>0?2:-1;p.bob=a>0?1:0;if(a>0&&a<1)p.smear={r:id==='knight'?22:26,a0:-2.8,a1:.35};}}}
 else if(st==='charge'){p.arm=-1.05;p.wpn=-1.3;p.bob=Math.floor(t*20)%2;p.glow=1;p.sway=Math.sin(t*20)*.8;p.hem=Math.sin(t*16);}
 else if(st==='cast'){const k=clamp(f.stateT/Math.max(.01,f.dur),0,1);p.glow=1;
  if(id==='mage'){if(f.skill===-1){p.arm=-.35;p.wpn=-.45;p.lean=1;}else{p.arm=-1.1;p.wpn=-1.35;}}
  else if(id==='cleric'){p.arm=-1.5;p.wpn=-1.57;p.bob=k<.3?0:1;}
  else if(id==='necro'){if(f.skill===1){p.arm=-.1;p.wpn=-.25;p.lean=1;}else{p.arm=-.9;p.wpn=-1.25;}p.hem=Math.sin(t*10)*1.2;}
  else{p.arm=-1.2;p.wpn=-1.4;}}
 else if(st==='blink'){p.crouch=1;p.arm=-1;p.wpn=-1.3;p.glow=1;}
 else if(st==='dash'){p.lean=3;p.arm=.1;p.wpn=-.1;p.shield=id==='knight';p.hem=-3;p.sway=-2;p.step=2;}
 else if(st==='block'){p.crouch=1;p.arm=-.2;p.wpn=id==='knight'?-1.3:-.95;p.shield=id==='knight';p.lean=-1;}
 else if(st==='hurt'){p.lean=-2;p.arm=1.6;p.wpn=-2.2;p.bob=1;p.sway=2;p.hem=2;}
 else if(st==='ko'){p.arm=1.6;p.wpn=-.3;}
 return p;}

// Shared helpers for the four character painters (local coordinates: feet at 0, facing right).
function rod(hx,hy,ang,up,down,c,cD){const ux=Math.cos(ang),uy=Math.sin(ang),x0=hx-ux*down,y0=hy-uy*down,x1=hx+ux*up,y1=hy+uy*up,ox=Math.abs(ux)>Math.abs(uy)?0:1,oy=ox?0:1;
 ql(x0+ox,y0+oy,x1+ox,y1+oy,cD);ql(x0,y0,x1,y1,c);return {x:Math.round(x1),y:Math.round(y1),ux,uy};}
function arm(sx,sy,a,len,c,cD,t=3){const hx=sx+Math.cos(a)*len,hy=sy+Math.sin(a)*len;ql(sx,sy+1,hx,hy+1,cD,t);ql(sx,sy,hx,hy,c,t);return {x:Math.round(hx),y:Math.round(hy)};}
function hand(h,c,cD){qr(h.x-1,h.y-1,2,2,c);q(h.x-1,h.y,cD);}
function robe(top,bot,backW,frontW,ps,shade,trim){const E=[];for(let y=top;y<=bot;y++){const v=(y-top)/Math.max(1,bot-top),sw=ps.hem*v*v,lx=ps.lean*(1-v)*.8;
  const xl=Math.round(-3-Math.pow(v,1.2)*backW+sw+lx),xr=Math.round(3+v*frontW+lx+(sw>0?sw*.6:sw*.2));E[y]=[xl,xr];
  for(let x=xl;x<=xr;x++)q(x,y,shade((x-xl)/Math.max(1,xr-xl),y,x,v));}
 return y=>E[Math.round(y)]||[0,0];}

function drawMage(ps,c){const up=ps.bob+ps.crouch,L=ps.lean,a=ps.step===1?2:ps.step===3?-2:0,fy=ps.air?-2:0;
 // boots
 qr(-4-a,-2+fy,4,2,c.bootD);qh(-4-a,-2-a,-2+fy,c.boot);qr(1+a,-2+fy,4,2,c.bootD);qh(1+a,3+a,-2+fy,c.boot);
 const bot=-3+fy,E=robe(-21+up,bot,8,4.5,ps,(u,y)=>y===bot?c.trim:u<.18?c.robeD:u>.47&&u<.63?c.robeL:u>.9?c.robeD:c.robe);
 // belt, tie and gold dots
 const by=-11+up,[bl,br]=E(by);qh(bl,br,by,c.trim);q(bl,by,c.trimD);qh(bl+1,br-1,by+1,c.robeD);
 q(1+L,by,c.trimD);q(1+L,by+1,c.trim);q(2+L,by+2,c.trim);q(1+L,by+3,c.trimD);q(2+L,by+4,c.trim);
 q(E(-15+up)[0]+2,-15+up,c.trim);q(E(-6)[0]+3,-6,c.trim);qh(E(bot)[0],E(bot)[1],bot-1,c.robeD);
 const h=L>0?1:L<0?-1:0,hy=up;
 // hair behind, face, beard
 qr(-3+h,-27+hy,4,5,c.hair);qr(-3+h,-24+hy,1,2,c.hairD);
 qr(2+h,-26+hy,4,2,c.skin);q(2+h,-25+hy,c.skinD);qh(2+h,5+h,-27+hy,c.hair);q(4+h,-26+hy,c.eye);q(6+h,-25+hy,c.skin);q(6+h,-24+hy,c.skinD);
 const bs=Math.round(-ps.hem*.4),BE=[[-24,-2,6],[-23,-2,6],[-22,-2,5],[-21,-1,5],[-20,-1,4],[-19,-1,4],[-18,-1,4],[-17,-1,4],[-16,0,4],[-15,0,4],[-14,0,3],[-13,0,3],[-12,1,3],[-11,1,2],[-10,1,1]];
 for(const [y,x0,x1] of BE){const s=y>-17?bs:0;qh(x0+h+s,x1+h+s,y+hy,c.hair);q(x0+h+s,y+hy,c.hairD);}
 qh(3+h,6+h,-24+hy,c.hairD);q(2+h,-19+hy,c.hairD);q(3+h,-16+hy,c.hairD);q(1+h,-13+hy,c.hairD);
 // hat: brim, band, curled cone (tip sways)
 qh(-5+h,8+h,-29+hy,c.hat);qh(-4+h,7+h,-28+hy,c.hatD);q(-5+h,-29+hy,c.hatD);
 qh(-3+h,5+h,-30+hy,c.trim);q(-3+h,-30+hy,c.trimD);
 const CONE=[[-31,-3,6],[-32,-2,6],[-33,-2,5],[-34,-1,5],[-35,-1,5],[-36,0,5],[-37,0,4],[-38,0,4],[-39,-1,4],[-40,-2,3],[-41,-4,3],[-42,-5,2],[-43,-3,0]];
 for(const [y,x0,x1] of CONE){const s=Math.round(ps.sway*Math.pow((-31-y)/12,2)),X0=x0+h+s,X1=x1+h+s;for(let x=X0;x<=X1;x++){const u=(x-X0)/Math.max(1,X1-X0);q(x,y+hy,u<.25?c.hatD:u>.5&&u<.7?c.hatL:c.hat);}
  if(y>-41){q(X1,y+hy,c.rib);if(y<-33)q(X1-1,y+hy,y<-37?c.rib:c.ribD);}}
 {const s=Math.round(ps.sway*1.1);q(-6+h+s,-40+hy,c.hat);q(-6+h+s,-39+hy,c.hatD);q(-5+h+s,-40+hy,c.hatD);}
 q(1+h,-35+hy,c.trim);q(7+h,-27+hy,c.rib);q(7+h,-26+hy,c.ribD);q(6+h,-26+hy,c.rib);
 // staff, sleeve, hand
 const sx=2+L,sy=-19+up,hd={x:Math.round(sx+Math.cos(ps.arm)*6),y:Math.round(sy+Math.sin(ps.arm)*6)};
 const tip=rod(hd.x,hd.y,ps.wpn,24,13,c.staff,c.staffD);
 const gx=tip.x+Math.round(tip.ux*2),gy=tip.y+Math.round(tip.uy*2);
 q(gx-2,gy-1,c.claw);q(gx+2,gy-1,c.claw);q(gx-2,gy-2,c.claw);q(gx+2,gy-2,c.claw);qr(gx-1,gy-2,3,3,c.gem);q(gx,gy-2,'#ffffff');q(gx-1,gy-1,c.gemL);q(gx+1,gy,'#1f5fc8');
 arm(sx,sy,ps.arm,5,c.robe,c.robeD,3);q(hd.x-2,hd.y,c.trim);hand(hd,c.skin,c.skinD);
 return {x:gx,y:gy-1};}

function drawCleric(ps,c){const up=ps.bob+ps.crouch,L=ps.lean,a=ps.step===1?2:ps.step===3?-2:0,fy=ps.air?-2:0,h=L>0?1:L<0?-1:0;
 // long hair behind the body
 const hs=Math.round(ps.sway*.8);for(let y=-30;y<=-13;y++){const s=Math.round(hs*((y+30)/17)),x0=-6+s+h+(y>-17?1:0);qh(x0,-1+h,y+up,c.hair);q(x0,y+up,c.hairD);if(y%3===0)q(x0+2,y+up,c.hairD);}
 q(-5+hs+h,-12+up,c.hairD);
 qr(-2-a,-1+fy,3,1,c.shoe);qr(1+a,-1+fy,3,1,c.shoe);qr(-2-a,-2+fy,3,1,c.whiteD);qr(1+a,-2+fy,3,1,c.whiteD);
 const bot=-3+fy,E=robe(-14+up,bot,3.5,2.6,ps,(u,y)=>y===bot?c.trim:y===bot-1?c.robeD:u<.2?c.robeD:u>.5&&u<.68?c.robeL:c.robe);
 // white cross on the skirt
 const cx=1+L,cy=-8+up;qr(cx,cy-3,1,6,c.white);qr(cx-2,cy-1,5,1,c.white);q(cx+1,cy-2,c.whiteD);
 // bodice and corset
 for(let y=-22+up;y<=-15+up;y++){const w=y<-21+up?2:3;qh(-w+L,w+L,y,y>-18+up?c.corset:c.white);q(-w+L,y,y>-18+up?c.corset:c.whiteD);}
 q(L,-17+up,c.trim);q(L,-15+up,c.trim);qh(-3+L,3+L,-18+up,c.trimD);qh(-1+L,1+L,-22+up,c.trim);
 // head
 qr(-1+h,-29+up,6,5,c.skin);q(-1+h,-25+up,c.skinD);qr(2+h,-28+up,2,2,c.eye);q(3+h,-27+up,c.iris);q(3+h,-28+up,'#ffffff');q(3+h,-25+up,c.skinD);q(5+h,-27+up,c.skin);
 qh(-2+h,3+h,-33+up,c.hairL);qh(-3+h,5+h,-32+up,c.hair);qh(-3+h,5+h,-31+up,c.hair);qh(-2+h,4+h,-30+up,c.hair);q(1+h,-29+up,c.hair);q(4+h,-29+up,c.hairD);
 for(let y=-30;y<=-25;y++)q(5+h,y+up,y>-27?c.hairD:c.hair);q(-2+h,-29+up,c.hair);q(-2+h,-28+up,c.hairD);for(let y=-29;y<=-25;y++)q(-1+h,y+up,y>-27?c.hairD:c.hair);q(0+h,-29+up,c.hair);q(0+h,-32+up,c.hairL);q(2+h,-33+up,'#ffffff');
 qr(-6+h,-32+up,3,3,c.bow);q(-6+h,-30+up,c.bowD);q(-5+h,-29+up,c.bow);q(-6+h,-28+up,c.bowD);q(-4+h,-31+up,c.bowD);
 // staff with its ornate cross, sleeve, hand
 const sx=2+L,sy=-20+up,hd={x:Math.round(sx+Math.cos(ps.arm)*6),y:Math.round(sy+Math.sin(ps.arm)*6)};
 const t=rod(hd.x,hd.y,ps.wpn,23,15,c.staff,c.staffD),ux=t.ux,uy=t.uy,px=-uy,py=ux;
 const at=(k,s)=>({x:Math.round(t.x+ux*k+px*s),y:Math.round(t.y+uy*k+py*s)});
 for(let k=0;k<=6;k++){const p=at(k,0);q(p.x,p.y,c.staff);}for(let s=-3;s<=3;s++){const p=at(3,s);q(p.x,p.y,c.staff);}
 for(const [k,s] of [[1,-1],[1,1],[5,-1],[5,1],[2,-2],[4,-2],[2,2],[4,2]]){const p=at(k,s);q(p.x,p.y,c.staffD);}
 const cc=at(3,0);q(cc.x,cc.y,'#ff6a4a');const top=at(6,0);q(top.x,top.y,'#fff6c8');
 arm(sx,sy,ps.arm,5,c.white,c.whiteD,3);hand(hd,c.skin,c.skinD);
 return at(3,0);}

function drawKnight(ps,c){const up=ps.bob+ps.crouch,L=ps.lean,h=L>1?1:L<0?-1:0,fy=ps.air?-3:0;
 // legs: thigh and shin follow the walk cycle
 const st=ps.step,off=st===1?[3,-2]:st===3?[-2,3]:st===2?[1,-1]:st===4?[-1,1]:st===5?[2,-1]:[0,0];
 const leg=(bx,o,col,colD)=>{for(let y=-12;y<=-1;y++){const k=(y+12)/11,x=Math.round(bx+o*k+(st===5&&y>-6?1:0));qr(x,y+fy,3,1,col);q(x,y+fy,colD);}const fx=Math.round(bx+o);qr(fx,fy-1,5,1,c.metalK);qr(fx,-2+fy,4,1,colD);q(fx+1,-7+fy,c.metalL);};
 leg(-3+L*.3,off[1],c.metalD,c.metalK);leg(0+L*.5,off[0],c.metal,c.metalD);
 // shield on the back arm (behind), unless guarding with it in front
 const shieldAt=(x0,y0)=>{for(let y=0;y<16;y++){const w=y<10?7:Math.max(1,7-(y-9)*1.2),xa=x0+Math.round((7-w)/2);qh(xa,xa+Math.round(w)-1,y0+y,y===0?c.trim:c.tab);q(xa,y0+y,c.trim);q(xa+Math.round(w)-1,y0+y,c.trimD);}
  qh(x0,x0+6,y0,c.trim);qr(x0+3,y0+2,1,8,c.trim);qr(x0+1,y0+5,5,1,c.trim);q(x0+2,y0+1,c.tabL);q(x0+1,y0+2,c.tabL);};
 if(!ps.shield)shieldAt(-10+L,-24+up);
 // faulds, torso, tabard
 for(let y=-13;y<=-10;y++)qh(-5+L,4+L,y+up,y===-10?c.metalD:c.metal);q(-5+L,-11+up,c.metalK);
 for(let y=-25;y<=-14;y++){const w=y<-22?5:4;qh(-w+L,w-1+L,y+up,c.metal);q(-w+L,y+up,c.metalD);q(w-1+L,y+up,c.metalD);q(-w+1+L,y+up,c.metalL);}
 for(let y=-22;y<=-8;y++){qh(-2+L,2+L,y+up,y>-11?c.tabD:c.tab);q(-2+L,y+up,c.tabD);}
 qr(-1+L,-20+up,3,1,c.trim);qr(L,-21+up,1,5,c.trim);qh(-4+L,3+L,-14+up,c.leather);q(L,-14+up,c.trim);
 qh(-7+L,-3+L,-25+up,c.metalL);qh(-7+L,-3+L,-24+up,c.metal);qh(-6+L,-4+L,-23+up,c.metalD);
 // helmet with visor slit and a flowing plume
 const hy=up;for(let y=-34;y<=-26;y++){const w=y<-32?3:4;qh(-w+h,w+h,y+hy,c.metal);q(-w+h,y+hy,c.metalD);q(w+h,y+hy,c.metalD);}
 qh(-2+h,1+h,-34+hy,c.metalL);q(-2+h,-33+hy,c.metalL);qh(0+h,4+h,-30+hy,INK);q(2+h,-28+hy,INK);q(4+h,-28+hy,INK);qh(-4+h,4+h,-26+hy,c.metalD);qr(-1+h,-33+hy,1,6,c.metalL);
 const ps2=ps.sway;for(let i=0;i<9;i++){const x=-1-i+h,y=-35+Math.round(i*i*.09+Math.sin(i*.8+ps2)*.6+(i>4?ps2*.4:0));qr(x,y+hy,1,3,i<2?c.plumeL:c.plume);q(x,y+hy+2,c.plumeD);}
 // sword arm
 const sx=2+L,sy=-22+up,hd={x:Math.round(sx+Math.cos(ps.arm)*7),y:Math.round(sy+Math.sin(ps.arm)*7)};
 const ux=Math.cos(ps.wpn),uy=Math.sin(ps.wpn),pxp=-uy,pyp=ux,at=(k,s)=>({x:Math.round(hd.x+ux*k+pxp*s),y:Math.round(hd.y+uy*k+pyp*s)});
 ql(at(-3,0).x,at(-3,0).y,hd.x,hd.y,c.leather);const pm=at(-4,0);q(pm.x,pm.y,c.trim);
 const b0=at(2,0),b1=at(19,0),bo=Math.abs(ux)>Math.abs(uy)?[0,1]:[1,0];ql(b0.x+bo[0],b0.y+bo[1],b1.x+bo[0],b1.y+bo[1],c.bladeD);ql(b0.x,b0.y,b1.x,b1.y,c.blade);const tp=at(20,0);q(tp.x,tp.y,c.blade);
 for(let s=-3;s<=3;s++){const g=at(1,s);q(g.x,g.y,s===-3||s===3?c.trimD:c.trim);}
 arm(sx,sy,ps.arm,6,c.metal,c.metalD,3);qr(hd.x-1,hd.y-1,3,3,c.metalD);q(hd.x,hd.y-1,c.metalL);
 if(ps.shield)shieldAt(4+L,-27+up);
 return at(18,0);}

function drawNecro(ps,c){const up=ps.bob+ps.crouch,L=ps.lean,h=L>0?1:L<0?-1:0,fy=ps.air?-2:0;
 const bot=-1+fy,t=performance.now()/1000;
 const E=robe(-22+up,bot,6,3.6,ps,(u,y)=>y===bot-3?c.trim:u<.22?c.robeD:u>.5&&u<.66?c.robeL:c.robe);
 // tattered hem: clear alternate pixels on the last row
 {const [l,r]=E(bot);K.globalCompositeOperation='destination-out';for(let x=l;x<=r;x++)if((x+Math.floor(t*5))%3===0)q(x,bot,'#000');K.globalCompositeOperation='source-over';}
 const sy=-12+up,[sl0,sr0]=E(sy);qh(sl0,sr0,sy,c.trimD);q(1+L,sy,c.bone);q(1+L,sy+1,c.trim);q(2+L,sy+2,c.trimD);
 // hood and shadowed face with glowing eyes
 const HD=[[-35,-2,1],[-34,-3,3],[-33,-4,4],[-32,-4,5],[-31,-5,5],[-30,-5,5],[-29,-5,5],[-28,-5,5],[-27,-5,5],[-26,-5,5],[-25,-4,5],[-24,-4,4],[-23,-4,4]];
 for(const [y,x0,x1] of HD){for(let x=x0;x<=x1;x++){const u=(x-x0)/Math.max(1,x1-x0);q(x+h,y+up,u<.3?c.robeD:u>.55&&u<.75?c.robeL:c.robe);}}
 q(-6+h+Math.round(ps.sway),-32+up,c.robe);q(-7+h+Math.round(ps.sway*1.4),-31+up,c.robeD);
 qr(1+h,-31+up,5,7,c.shade);qr(2+h,-27+up,3,3,c.skinD);qh(2+h,4+h,-25+up,c.skin);q(3+h,-26+up,c.skin);
 const blink=Math.floor(t*1.3)%9===0;if(!blink){q(2+h,-29+up,c.eye);q(4+h,-29+up,c.eye);}
 qh(-4+h,5+h,-23+up,c.trim);
 // staff with a skull and green flame, sleeve, bony hand
 const sx=2+L,sy2=-19+up,hd={x:Math.round(sx+Math.cos(ps.arm)*6),y:Math.round(sy2+Math.sin(ps.arm)*6)};
 const tp=rod(hd.x,hd.y,ps.wpn,22,14,c.staff,c.staffD),gx=tp.x+Math.round(tp.ux*2),gy=tp.y+Math.round(tp.uy*2);
 q(tp.x-1,tp.y+1,c.staffD);q(tp.x+2,tp.y,c.staff);
 qr(gx-2,gy-3,5,4,c.bone);qr(gx-1,gy+1,3,1,c.boneD);q(gx-1,gy-2,c.shade);q(gx+1,gy-2,c.shade);q(gx-1,gy-1,c.flame);q(gx+1,gy-1,c.flame);q(gx,gy,c.boneD);q(gx-2,gy-3,c.boneD);
 const fl=Math.floor(t*10)%3;q(gx,gy-4,c.flame);q(gx-1+fl%2,gy-5,c.flame);q(gx,gy-6-fl%2,c.flameL);q(gx+1,gy-4,c.trimD);
 arm(sx,sy2,ps.arm,5,c.robe,c.robeD,3);q(hd.x-2,hd.y,c.trim);hand(hd,c.skin,c.skinD);
 return {x:gx,y:gy-2};}

const PAINT={mage:drawMage,cleric:drawCleric,knight:drawKnight,necro:drawNecro};
// Paint a fighter into the sprite buffer, then outline it: returns the weapon tip (local coords).
function paint(f,ps){K=sk;OX=OXS;OY=OYS;sk.clearRect(0,0,SPW,SPH);const tip=PAINT[f.def.id](ps,f.def.pal);K=ctx;
 sl.globalCompositeOperation='source-over';sl.clearRect(0,0,SPW,SPH);sl.drawImage(spr,0,0);sl.globalCompositeOperation='source-in';sl.fillStyle=INK;sl.fillRect(0,0,SPW,SPH);sl.globalCompositeOperation='source-over';
 return tip;}
function drawFighter(f,g=ctx){const ps=pose(f),tip=paint(f,ps),fx=X(f.x),fy=Y(f.y),dir=f.facing;
 f.tip={x:f.x+dir*tip.x/S,y:f.y+tip.y/S};
 // shadow: a dithered oval, smaller when airborne
 const air=clamp((GROUND-f.y)/80,0,1);if(f.state!=='ko'||f.stateT<.3){const w=Math.round(10-air*5);for(let x=-w;x<=w;x++)for(let y=0;y<2;y++){const e=1-(x*x)/(w*w+1);if(dith(fx+x,SG+y,e*(.9-air*.5)))P(fx+x,SG+y,1,1,'rgba(6,4,12,.55)');}}
 g.save();g.translate(fx,fy);if(dir<0)g.scale(-1,1);
 if(f.state==='ko'){const k=Math.min(2,Math.floor(f.stateT*10));g.rotate(-Math.PI/4*k);g.translate(k?-2:0,k?2:0);}
 if(f.state==='blink'&&f.stateT>.08&&f.stateT<.2)g.globalAlpha=.3;
 for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])g.drawImage(sil,-OXS+dx,-OYS+dy);
 g.drawImage(spr,-OXS,-OYS);
 if(f.flash>0||f.shield>0||f.stun>0||f.inv>0&&f.state!=='blink'){sl.globalCompositeOperation='source-in';sl.fillStyle=f.flash>0?'#ffffff':f.stun>0?'#ffe066':'#ffd86b';sl.fillRect(0,0,SPW,SPH);sl.globalCompositeOperation='source-over';
  g.globalAlpha=f.flash>0?.9:(Math.floor(f.anim*10)%2?.35:.12);g.drawImage(sil,-OXS,-OYS);}
 g.restore();g.globalAlpha=1;
 // weapon smear on the strike frames
 if(ps.smear&&g===ctx){const sm=ps.smear,hx0=fx+dir*(f.def.id==='knight'?4:5),hy0=fy-20+ps.bob,n=16;for(let i=0;i<=n;i++){const a=sm.a0+(sm.a1-sm.a0)*i/n,k=i/n;
  for(let r=sm.r-3;r<=sm.r+1;r++){const x=hx0+dir*Math.cos(a)*r,y=hy0+Math.sin(a)*r;if(dith(Math.round(x),Math.round(y),k*(1-(sm.r+1-r)/6)))P(x,y,1,1,sm.c||(r>sm.r-1?'#ffffff':'#bfe6ff'));}}}
 if(f.stun>0)for(let i=0;i<3;i++){const a=f.anim*5+i*2.1;star(fx+Math.cos(a)*8,fy-48+Math.sin(a)*2,2,'#ffe066');}}

// --- Décors (256 × 144, repères écran) -------------------------------------------
const deco={stars:[],flames:[],candles:[],flies:[],shrooms:[],embers:[],windows:[],lava:false};
function bands(cols,y0,y1){const n=cols.length,hh=(y1-y0)/n;for(let i=0;i<n;i++){const a=Math.round(y0+i*hh),b=Math.round(y0+(i+1)*hh);P(0,a,RW,b-a,cols[i]);
  if(i){for(let x=0;x<RW;x++){if((x+a)%2===0)P(x,a-1,1,1,cols[i]);if(x%4===(a%4))P(x,a-2,1,1,cols[i]);if((x+a)%2===1)P(x,a,1,1,cols[i-1]);}}}}
function ridge(base,amp,freq,c,seed,rim){let prev=null;for(let x=0;x<RW;x++){const hgt=Math.sin(x*freq+seed)*amp+Math.sin(x*freq*2.7+seed*3)*amp*.35+Math.sin(x*freq*.37+seed)*amp*.7,y=Math.round(base-hgt);P(x,y,1,RH-y,c);if(rim&&prev!==null&&y<=prev)P(x,y,1,1,rim);prev=y;}}
function stones(y0,y1,bw,bh,base,mortar,hl,dark,seedOff=0){P(0,y0,RW,y1-y0,base);for(let y=y0,r=0;y<y1;y+=bh,r++){P(0,y,RW,1,mortar);const off=(r%2)*Math.round(bw/2)+seedOff;
  for(let x=-bw+off;x<RW;x+=bw){P(x,y,1,bh,mortar);const tone=rnd();if(tone<.22)P(x+1,y+1,bw-1,bh-1,dark);else if(tone>.86)P(x+1,y+1,bw-1,bh-1,hl);P(x+1,y+1,bw-2,1,hl);if(rnd()<.35)P(x+2+Math.floor(rnd()*(bw-4)),y+2+Math.floor(rnd()*(bh-3)),1,1,mortar);}}}
function clipped(x,y,w,h,fn){K.save();K.beginPath();K.rect(x,y,w,h);K.clip();fn();K.restore();}
function buildArena(i){K=bg;OX=0;OY=0;bg.clearRect(0,0,RW,RH);for(const k in deco)deco[k]=Array.isArray(deco[k])?[]:false;
 if(i===0){bands(['#0d0e2b','#111338','#161945','#1b1f52','#21265f','#272d6b'],0,106);
  for(let s=0;s<110;s++){const x=Math.floor(rnd()*RW),y=Math.floor(rnd()*100),r=rnd();P(x,y,1,1,r<.12?'#ffffff':r<.45?'#8d93d6':'#4c5290');if(r<.2)deco.stars.push({x,y,p:rnd()*TAU,big:r<.05});}
  K=bg;for(let rr=16;rr>=11;rr--)for(let a=0;a<TAU;a+=.02){const x=Math.round(196+Math.cos(a)*rr),y=Math.round(28+Math.sin(a)*rr);if(dith(x,y,(17-rr)/7))P(x,y,1,1,rr>13?'#232864':'#2b3174');}
  disc(196,28,10,'#efe6c4');disc(198,30,8,'#e6dcb6');P(190,24,3,2,'#d6cba2');P(199,32,2,2,'#d6cba2');P(194,33,2,1,'#d6cba2');P(201,24,2,1,'#d6cba2');P(189,30,1,2,'#d6cba2');
  ridge(100,7,.022,'#1f2350',1.3,'#2a2f66');
  // distant castle
  const cs='#161a3e';P(206,84,34,20,cs);for(const [x,w,h] of [[204,6,26],[216,5,20],[232,7,30]]){P(x,104-h,w,h,cs);for(let k=0;k<w;k+=2)P(x+k,104-h-1,1,1,cs);}P(234,70,3,4,cs);
  for(const [x,y] of [[207,86],[219,92],[234,80],[226,94]])P(x,y,1,1,'#f2c46a');
  ridge(110,6,.036,'#171a41',4.2,'#20245a');ridge(117,4,.05,'#12143a',7.1);
  stones(SG,RH,16,6,'#524b6b','#312d45','#625a7e','#473f5e');P(0,SG,RW,1,'#8d85a8');P(0,SG+1,RW,1,'#6c6488');for(let x=0;x<RW;x+=8)P(x,SG,1,2,'#524b6b');
  // watch tower on the left, with a torch
  clipped(0,56,17,SG-56,()=>stones(56,SG,8,5,'#3c3652','#221f33','#4a4363','#332e47'));P(16,56,1,SG-56,'#241f36');for(const x of [0,9]){P(x,50,6,6,'#433d5b');P(x,50,6,1,'#5c5578');}P(0,56,17,1,'#5c5578');
  P(13,74,4,2,'#5a4632');P(15,72,1,2,'#3a2c20');deco.flames.push({x:14,y:71});}
 else if(i===1){stones(0,SG,16,8,'#27252f','#18161e','#302e39','#211f28');
  for(const x of [0,120,241]){P(x,0,15,SG,'#2f2c39');P(x,0,2,SG,'#3a3747');P(x+12,0,3,SG,'#221f2a');for(let y=6;y<SG;y+=12)P(x,y,15,1,'#221f2a');P(x-2,SG-8,19,8,'#2c2936');P(x-2,SG-8,19,1,'#3c3949');}
  for(const wx of [44,164]){const w=34,top=14,hgt=76;
   for(let y=-2;y<hgt+3;y++){const ay=y+2,arc=ay<w/2+2?Math.round((w/2+2)-Math.sqrt(Math.max(0,((w/2+2))**2-((w/2+2)-ay)**2))):0;P(wx-2+arc,top+y,w+4-arc*2,1,'#3d3a4a');}
   for(let y=0;y<hgt;y++){const arc=y<w/2?Math.round(w/2-Math.sqrt(Math.max(0,(w/2)**2-(w/2-y)**2))):0;for(let x=arc;x<w-arc;x++){const gx=Math.floor((x+y)/5),gy=Math.floor((x-y+80)/5),k=((gx*3+gy*5)%7+7)%7;
    const col=['#2d4fa8','#4f7ee0','#b8303c','#2d4fa8','#d8a040','#6a3a9a','#3e66c8'][k];P(wx+x,top+y,1,1,((x+y)%5)&&((x-y+80)%5)?col:'#15121d');}}
   disc(wx+w/2,top+13,8,'#15121d');disc(wx+w/2,top+13,6,'#c23a3a');disc(wx+w/2,top+13,3,'#e8b04a');P(wx+w/2,top+13,1,1,'#fff0b0');K=bg;line(wx+w/2,top+5,wx+w/2,top+21,'#15121d');line(wx+w/2-8,top+13,wx+w/2+8,top+13,'#15121d');
   P(wx+w/2,top+22,1,hgt-22,'#15121d');P(wx-4,top+hgt,w+8,3,'#3d3a4a');P(wx-4,top+hgt,w+8,1,'#514d62');deco.windows.push({x:wx,w,top,h:hgt});}
  // crimson banners on the central pillar
  for(let y=16;y<60;y++){const w=y>54?Math.max(0,11-(y-54)*2):11;P(122+(11-w)/2,y,w,1,y<18?'#e8b04a':'#8e1c2c');}P(126,24,3,14,'#e8b04a');P(123,29,9,3,'#e8b04a');
  for(const x of [26,100,156,230]){P(x,SG-28,1,26,'#c8962e');P(x+1,SG-28,1,26,'#7a5a1c');P(x-2,SG-3,6,2,'#c8962e');P(x-3,SG-1,8,1,'#7a5a1c');P(x-2,SG-29,6,1,'#e8b04a');P(x-1,SG-35,3,6,'#f3eee0');P(x+1,SG-35,1,6,'#c9c1ae');deco.candles.push({x:x+.5,y:SG-36});}
  for(let x=0,r=0;x<RW;x+=20,r++)for(let rr=0;rr<3;rr++){const xx=x+(rr%2)*10;P(xx,SG+rr*7,20,7,(r+rr)%2?'#34313d':'#3b3845');P(xx,SG+rr*7,20,1,'#48445a');P(xx,SG+rr*7,1,7,'#1d1b23');}P(0,SG,RW,1,'#57526b');}
 else if(i===2){bands(['#06121a','#08171f','#0b1d24','#0e242a','#122c2f','#153432'],0,SG);
  for(let s=0;s<50;s++)P(rnd()*RW,rnd()*60,1,1,rnd()<.2?'#bfe8d8':'#3f6f6a');disc(48,24,7,'#d8efe0');disc(45,22,7,'#08171f');
  const pine=(x,base,h,col)=>{for(let y=0;y<h;y++){const w=Math.round((y/h)*h*.28+1)+((y%5)<2?0:-1);P(x-w,base-h+y,w*2+1,1,col);}P(x,base,1,3,col);};
  for(let k=0;k<30;k++)pine(rnd()*RW,SG-20,20+rnd()*18,'#10282b');ridge(SG-18,3,.05,'#10282b',2);for(let k=0;k<22;k++)pine(rnd()*RW,SG-12,26+rnd()*22,'#0b2023');
  for(let y=SG-34;y<SG-6;y++)for(let x=0;x<RW;x++)if(dith(x,y,.14*Math.sin(Math.PI*(y-SG+34)/28)))P(x,y,1,1,'#2a4a48');
  for(let k=0;k<14;k++)pine(rnd()*RW,SG-4,34+rnd()*26,'#081a1c');
  for(const x of [4,236]){P(x,0,16,SG,'#1a1512');P(x+11,0,5,SG,'#120e0c');P(x,0,2,SG,'#2a211b');for(let y=10;y<SG;y+=9)P(x+3+(y%3),y,5,1,'#120e0c');}
  P(0,SG,RW,RH-SG,'#1a2c20');for(let x=0;x<RW;x++){if(rnd()<.6)P(x,SG-1-Math.floor(rnd()*3),1,2,rnd()<.3?'#3e7a4a':'#2a5a36');if(rnd()<.18)P(x,SG+2+rnd()*18,1,1,'#24422c');}P(0,SG,RW,1,'#2e5a3a');
  for(let k=0;k<8;k++){const x=Math.round(16+rnd()*(RW-32)),pink=rnd()<.5;deco.shrooms.push({x,pink});P(x,SG-4,2,4,'#d9e6d6');P(x+1,SG-4,1,4,'#9fb2a0');P(x-2,SG-7,6,3,pink?'#e0558f':'#46c8d2');P(x-1,SG-8,4,1,pink?'#ff9fcb':'#a6f5f7');P(x-1,SG-6,1,1,'#ffffff');}
  for(let k=0;k<28;k++)deco.flies.push({x:rnd()*RW,y:26+rnd()*90,p:rnd()*TAU,s:.4+rnd()});}
 else{bands(['#120507','#1a080a','#260b0c','#35100f','#481712','#621f14'],0,SG);
  ridge(84,12,.012,'#220a0b',2);for(let x=96;x<136;x++){const hh=Math.abs(x-116);P(x,62+hh*.6,1,40,'#220a0b');}P(110,62,12,2,'#ff7a2a');P(112,60,8,2,'#ffc05a');
  for(let y=64;y<100;y++){P(114+Math.sin(y*.3)*2,y,2,1,y%3?'#ff6a1a':'#ffb347');}
  ridge(100,7,.03,'#180707',7);
  for(let x=0;x<RW;x++)P(x,110+Math.round(Math.sin(x*.05)*1.5),1,12,x%5?'#a8340f':'#e8661e');P(0,118,RW,SG-118,'#180707');deco.lava=true;
  for(const x of [10,226]){clipped(x,44,20,SG-44,()=>stones(44,SG,6,5,'#2a1614','#170b0a','#3a201c','#221210'));P(x,44,20,1,'#4a2a24');P(x+18,44,2,SG-44,'#170b0a');P(x-2,40,24,4,'#3a201c');}
  P(0,SG,RW,RH-SG,'#1c1418');for(let k=0;k<22;k++){let x=rnd()*RW,y=SG+3+rnd()*18;for(let s=0;s<7;s++){P(x,y,2,1,s<3?'#ff6a2a':'#a8340f');x+=rnd()*4-1;y+=rnd()*2-1;}}P(0,SG,RW,1,'#3a2a30');
  for(const x of [62,194]){P(x-6,SG-18,13,18,'#2a1c1e');P(x-6,SG-18,13,1,'#4a3436');P(x-8,SG-20,17,3,'#3a2628');deco.flames.push({x:x,y:SG-21,big:true});}
  for(let k=0;k<40;k++)deco.embers.push({x:rnd()*RW,y:rnd()*RH,v:6+rnd()*14,p:rnd()*TAU});}
 K=ctx;}
// Pillars of the forge drawn after the stones so they read as columns.
function drawDecoLive(t){const i=game.arena;
 for(const s of deco.stars){const tw=Math.sin(t*2+s.p);if(s.big&&tw>.4)star(s.x,s.y,2,'#9aa4ff');else if(tw>.7)P(s.x,s.y,1,1,'#ffffff');}
 for(const f of deco.flames){const n=f.big?7:4,fl=Math.floor(t*12+f.x)%3;dglow(f.x,f.y,f.big?18:12,f.big?'#5a2008':'#4a2a10',1.2);
  for(let k=0;k<n;k++){const w=Math.max(1,Math.round((n-k)*(f.big?1.1:.7))),xo=Math.round(Math.sin(t*9+k)*(k/n)*1.5);P(f.x-Math.floor(w/2)+xo,f.y-k,w,1,k<2?'#ffe38a':k<4?'#ffa030':'#e0501a');}
  if(fl===0)P(f.x,f.y-n-1,1,1,'#ffa030');}
 for(const c of deco.candles){const fl=Math.floor(t*10+c.x)%3;dglow(c.x,c.y-1,10,'#40301a',1.3);P(c.x-.5+(fl===1?1:0),c.y-2,1,2,'#ffcf5a');P(c.x-.5,c.y-1,1,1,'#fff6d0');if(fl===2)P(c.x-.5,c.y-3,1,1,'#ffcf5a');}
 if(i===1){for(const w of deco.windows){for(let y=w.top+w.h;y<SG;y++){const k=(y-w.top-w.h)/(SG-w.top-w.h),x0=w.x+4+k*30,x1=w.x+w.w-4+k*54;for(let x=Math.round(x0);x<x1;x++)if(dith(x,y,.1*(1-k*.7)))P(x,y,1,1,'rgba(150,170,255,.3)');}}
  for(let k=0;k<14;k++){const x=(k*37+t*4)%RW,y=30+((k*53+t*3)%84);P(x,y,1,1,'rgba(255,240,200,.6)');}}
 for(const f of deco.flies){const x=f.x+Math.sin(t*f.s+f.p)*10,y=f.y+Math.cos(t*f.s*1.3+f.p)*6,on=Math.sin(t*3+f.p*3);if(on>-.2){dglow(x,y,4,'#304a10',1.4);P(x,y,1,1,on>.6?'#f4ffb0':'#c6f06a');}}
 for(const s of deco.shrooms)dglow(s.x+1,SG-6,8,s.pink?'#3a1428':'#123a3e',1+.3*Math.sin(t*2+s.x));
 if(deco.lava){for(let x=0;x<RW;x+=2){const y=110+Math.round(Math.sin(x*.05)*1.5);if(Math.sin(x*.3+t*3)>.8)P(x,y,2,1,'#ffd27a');}dglow(116,112,40,'#2a0a04',1);}
 for(const e of deco.embers){e.y-=e.v/60;if(e.y<0){e.y=RH;e.x=rnd()*RW;}const x=e.x+Math.sin(t*2+e.p)*2;P(x,e.y,1,1,e.y>80?'#ffb347':'#ff6a1a');}}

// --- Son (petites puces 8 bits) ---------------------------------------------
let ac=null,muted=false,noise=null;
function audioOn(){if(ac||muted)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ac=new C();noise=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
function tone(type,f0,f1,dur,vol=.12,delay=0){if(!ac||muted)return;const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur+.02);}
function hiss(dur,vol,freq,delay=0){if(!ac||muted)return;const t=ac.currentTime+delay,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noise;f.type='bandpass';f.frequency.value=freq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f).connect(g).connect(ac.destination);s.start(t);s.stop(t+dur);}
const sfx={hit:()=>{hiss(.12,.35,900);tone('square',180,60,.12,.1);},block:()=>{tone('square',900,700,.05,.06);hiss(.05,.15,3000);},swing:()=>hiss(.08,.1,2200),jump:()=>tone('square',300,600,.08,.05),
 cast:()=>{tone('sine',400,1200,.25,.08);tone('triangle',800,1600,.2,.05,.05);},orb:()=>tone('sawtooth',600,200,.3,.05),holy:()=>{for(const [k,f] of [[0,523],[1,659],[2,784]])tone('triangle',f,f,.6,.06,k*.05);},
 dark:()=>{tone('sawtooth',160,90,.4,.07);hiss(.3,.08,400);},boom:()=>{hiss(.35,.4,300);tone('square',120,30,.35,.12);},ko:()=>{tone('square',440,55,.9,.12);hiss(.5,.2,500);},
 round:()=>{tone('square',523,523,.1,.08);tone('square',784,784,.2,.08,.12);},heal:()=>{tone('sine',660,990,.4,.06);tone('sine',880,1320,.4,.04,.1);},parry:()=>{tone('square',1400,1800,.12,.08);tone('triangle',2000,2400,.1,.05,.05);}};

// --- État du jeu ----------------------------------------------------------
const game={phase:'menu',mode:'1p',diff:1,arena:0,sel:[0,1],p:[],round:1,timer:99,phaseT:0,shake:0,hitstop:0,slow:1,proj:[],parts:[],texts:[],fx:[],paused:false,flashW:0,winner:null,stats:[{hits:0,dmg:0},{hits:0,dmg:0}]};
function fighter(def,side){return {def,side,x:side?W-110:110,y:GROUND,vx:0,vy:0,facing:side?-1:1,hp:def.hp,hpShow:def.hp,mana:100,ult:0,state:'idle',stateT:0,dur:0,anim:0,cd:[0,0],combo:0,comboT:0,hitDone:false,charge:0,flash:0,parry:0,shield:0,regen:0,stun:0,inv:0,wins:0,drainT:0,hits:0,hitsT:0,sub:0,tip:null};}
function setState(f,s,keep){if(keep&&f.state===s)return;f.state=s;f.stateT=0;f.hitDone=false;f.sub=0;}
// Particles: k = undefined (pixel), 'star' (twinkling cross), 'smoke' (dithered puff, not additive).
function part(x,y,vx,vy,life,c,s=1,g=0,add=true,k){game.parts.push({x,y,vx,vy,life,max:life,c,s,g,add,k});}
function burst(x,y,n,c,sp=60,life=.5,g=0){for(let i=0;i<n;i++){const a=rnd()*TAU,v=sp*(.3+rnd()*.7);part(x,y,Math.cos(a)*v,Math.sin(a)*v,life*(.5+rnd()*.5),c,rnd()<.3?2:1,g,true,rnd()<.25?'star':undefined);}}
function dust(x,y,n,sp=30){for(let i=0;i<n;i++){const a=Math.PI+rnd()*Math.PI;part(x+rnd()*10-5,y-2,Math.cos(a)*sp*(.5+rnd()),-rnd()*sp*.5,.35+rnd()*.3,'#8a82a3',2,0,false,'smoke');}}
function impact(x,y,c,big){game.fx.push({type:'impact',x,y,t:0,c,big,rot:rnd()*TAU});}
function popup(x,y,text,c='#fff',big=false){if(big)game.texts=game.texts.filter(t=>!t.big);game.texts.push({x,y,text,c,life:big?1.4:.8,big});}

function damage(t,amt,a,o={}){
 if(t.state==='ko'||t.inv>0||game.phase!=='fight')return false;
 const fromFront=((o.fromX??a.x)-t.x)*t.facing>0;
 if(t.parry>0&&fromFront){burst(t.x+t.facing*12,t.y-36,14,'#fff6c0',90,.35);impact(t.x+t.facing*12,t.y-36,'#fff6c0',true);popup(t.x,t.y-74,'PARADE','#ffe066');sfx.parry();if(!o.proj){a.stun=.9;setState(a,'hurt');a.dur=.9;}return 'parry';}
 if(t.state==='block'&&fromFront&&!o.unblockable){amt*=.2;t.vx=-t.facing*50;burst(t.x+t.facing*12,t.y-32,6,'#9fd6ff',50,.25);impact(t.x+t.facing*12,t.y-32,'#9fd6ff',false);sfx.block();}
 else{setState(t,'hurt');t.dur=o.stun||.32;t.vx=(o.dir||Math.sign(t.x-a.x)||1)*(o.knock||70);if(o.launch){t.vy=-o.launch;t.y-=1;}t.flash=.1;game.hitstop=o.big?.12:.06;game.shake=o.big?5:2;sfx.hit();
  burst(t.x,t.y-34,o.big?22:10,o.color||'#ffffff',o.big?120:80,.4);impact(t.x-t.facing*4,t.y-34,o.color||'#ffffff',o.big);}
 if(t.shield>0)amt*=.6;amt=Math.round(amt);
 t.hp=Math.max(0,t.hp-amt);a.ult=Math.min(100,a.ult+amt*.12);t.ult=Math.min(100,t.ult+amt*.07);
 const st=game.stats[a.side];st.dmg+=amt;st.hits++;a.hits=a.hitsT>0?a.hits+1:1;a.hitsT=1.1;if(a.hits>=3)popup(a.side?W-70:70,72,a.hits+' COUPS !','#ffe066');
 popup(t.x+(rnd()*10-5),t.y-76,String(amt),t.state==='block'?'#9fd6ff':'#ffffff');
 if(t.hp<=0)knockout(t,a);return true;}
function knockout(t,a){setState(t,'ko');t.vy=-140;t.vx=Math.sign(t.x-a.x)*90;game.phase='ko';game.phaseT=0;game.slow=.3;game.flashW=.6;a.wins++;sfx.ko();popup(W/2,90,'K.O.','#ff4d5e',true);}

// --- Compétences ------------------------------------------------------------
const ATK=[{dur:.28,at:.1,dmg:42,range:40,knock:40},{dur:.28,at:.1,dmg:42,range:40,knock:40},{dur:.44,at:.17,dmg:78,range:46,knock:150}];
function startAttack(f){f.combo=f.comboT>0?(f.combo+1)%3:0;f.comboT=.5;setState(f,'attack');f.dur=ATK[f.combo].dur;f.atk=ATK[f.combo];f.vx=f.facing*20;sfx.swing();}
function canUse(f,i){if(i===2)return f.ult>=100;const s=f.def.skills[i];return f.cd[i]<=0&&f.mana>=s[2];}
function startSkill(f,o,i){if(!canUse(f,i)){if(i<2&&f.cd[i]<=0)popup(f.x,f.y-74,'MANA','#6fa8ff');return;}
 const s=f.def.skills[i];if(i===2){f.ult=0;game.flashW=.35;popup(f.x,f.y-84,s[0].toUpperCase(),f.def.color);}else{f.mana-=s[2];f.cd[i]=s[3];}
 f.skill=i;const id=f.def.id;
 if(id==='mage'&&i===0){setState(f,'charge');f.charge=0;sfx.cast();return;}
 if(id==='mage'&&i===1){setState(f,'blink');f.dur=.34;f.inv=.3;sfx.cast();return;}
 if(id==='knight'&&i===0){setState(f,'dash');f.dur=.42;sfx.swing();return;}
 if(id==='knight'&&i===1){setState(f,'block');f.parry=.45;f.dur=.45;f.sub=1;sfx.block();return;}
 if(id==='knight'&&i===2){setState(f,'attack');f.dur=.6;f.atk=null;f.sub=2;return;}
 setState(f,'cast');f.dur=id==='necro'&&i===1?1.05:i===2?1.2:id==='cleric'&&i===1?.6:.45;sfx.cast();}
const tipOf=f=>f.tip||{x:f.x+f.facing*14,y:f.y-50};
function skillTick(f,o,dt){const id=f.def.id,i=f.skill,t=f.stateT;
 if(f.state==='attack'&&f.atk){if(!f.hitDone&&t>=f.atk.at){f.hitDone=true;const dx=(o.x-f.x)*f.facing;if(dx>-6&&dx<f.atk.range&&Math.abs(o.y-f.y)<40)damage(o,f.atk.dmg,f,{knock:f.atk.knock,big:f.combo===2,color:f.def.color,stun:f.combo===2?.45:.28});}f.vx*=.8;return;}
 if(id==='knight'&&f.state==='attack'&&f.sub===2){if(!f.hitDone&&t>=.25){f.hitDone=true;game.proj.push({type:'wave',x:f.x+f.facing*18,y:f.y-30,vx:f.facing*250,vy:0,r:18,dmg:260,owner:f,life:2,hit:new Set(),pierce:true});sfx.holy();game.shake=5;}return;}
 if(f.state==='dash'){f.vx=t<.32?f.facing*270:f.vx*.7;if(t<.32&&Math.floor(t*60)%2)part(f.x-f.facing*10,f.y-8-rnd()*50,-f.facing*30,0,.25,'#c3ccd7',2,0,false);
  if(!f.hitDone&&Math.abs(o.x-f.x)<28&&Math.abs(o.y-f.y)<40){f.hitDone=true;damage(o,90,f,{knock:230,stun:.55,big:true,color:'#f2f6fa'});f.vx=-f.facing*40;}return;}
 if(f.state==='blink'){if(!f.hitDone&&t>=.12){f.hitDone=true;burst(f.x,f.y-34,24,'#b48cff',70,.5);const side=o.x>f.x?1:-1;f.x=clamp(o.x+side*30,14,W-14);f.facing=o.x>f.x?1:-1;burst(f.x,f.y-34,24,'#5fd4ff',70,.5);sfx.orb();}return;}
 if(f.state!=='cast')return;
 if(id==='mage'&&i===2){if(t<1&&Math.floor(t*60)%6===0&&f.sub<14){f.sub++;const tx=clamp(o.x+(rnd()*120-60),10,W-10);game.proj.push({type:'meteor',x:tx+50,y:-10-rnd()*30,vx:-55,vy:230,r:5,dmg:42,owner:f,life:3,hit:new Set()});}return;}
 if(id==='cleric'&&(i===0||i===2)){if(!f.hitDone&&t>=.15){f.hitDone=true;const xs=i===2?[o.x,o.x-48,o.x+48]:[o.x];for(const x of xs)game.fx.push({type:'pillar',x:clamp(x,10,W-10),t:0,warn:i===2?.55:.5,life:.6,w:i===2?26:18,dmg:i===2?150:125,owner:f,done:false});sfx.holy();}
  if(t<.4&&rnd()<.7){const tp=tipOf(f),a=rnd()*TAU;part(tp.x+Math.cos(a)*24,tp.y+Math.sin(a)*24,-Math.cos(a)*70,-Math.sin(a)*70,.3,'#ffe27a',1,0,true,rnd()<.4?'star':undefined);}return;}
 if(id==='cleric'&&i===1){if(!f.hitDone&&t>=.2){f.hitDone=true;f.regen=3;f.shield=3.2;sfx.heal();for(let k=0;k<20;k++)part(f.x+rnd()*30-15,f.y-rnd()*50,0,-30-rnd()*30,1,'#ffd86b',1,0,true,k%3?undefined:'star');}return;}
 if(id==='necro'&&i===0){if(!f.hitDone&&t>=.15){f.hitDone=true;for(let k=0;k<3;k++)game.proj.push({type:'wisp',x:f.x+f.facing*14,y:f.y-44-k*10,vx:f.facing*(60+k*20),vy:-30+k*30,r:5,dmg:38,owner:f,life:3.2+k*.2,hit:new Set(),delay:k*.12});sfx.dark();}return;}
 if(id==='necro'&&i===1){f.drainT-=dt;const dx=(o.x-f.x)*f.facing;f.beam=t>.15&&dx>0&&dx<140&&Math.abs(o.y-f.y)<50;if(f.beam&&f.drainT<=0){f.drainT=.1;if(damage(o,14,f,{knock:10,stun:.12,color:'#7cf2a6'}))f.hp=Math.min(f.def.hp,f.hp+10);}return;}
 if(id==='necro'&&i===2){if(t<.9&&Math.floor(t*60)%4===0&&f.sub<12){const x=f.x+f.facing*(24+f.sub*26);f.sub++;if(x>4&&x<W-4)game.fx.push({type:'bones',x,t:0,owner:f,done:false,dmg:48,seed:rnd()});if(f.sub%3===1)sfx.dark();}return;}}

// --- Projectiles et effets ------------------------------------------------------
function updateProj(dt){for(const p of game.proj){if(p.delay>0){p.delay-=dt;continue;}p.life-=dt;const tgt=game.p[1-p.owner.side];
 if(p.type==='wisp'){const dx=tgt.x-p.x,dy=tgt.y-36-p.y,d=Math.hypot(dx,dy)||1;p.vx+=dx/d*260*dt;p.vy+=dy/d*260*dt;const sp=Math.hypot(p.vx,p.vy);if(sp>120){p.vx*=120/sp;p.vy*=120/sp;}if(rnd()<.6)part(p.x-p.vx*.04,p.y,0,-10,.45,rnd()<.5?'#7cf2a6':'#2e9a62',rnd()<.3?2:1);}
 if(p.type==='orb'){for(let k=0;k<2;k++)part(p.x-p.vx*.03+rnd()*8-4,p.y+rnd()*8-4,-p.vx*.15,rnd()*24-12,.35+rnd()*.3,['#5fd4ff','#c79bff','#ff8fd8','#8fe3ff'][Math.floor(rnd()*4)],1,0,true,rnd()<.25?'star':undefined);}
 if(p.type==='meteor'){part(p.x,p.y,rnd()*12-6,-12,.3,rnd()<.5?'#ffb347':'#ff6a1a',2);if(rnd()<.4)part(p.x,p.y,0,-6,.6,'#5a3a3a',2,0,false,'smoke');
  if(p.y>=GROUND-2){p.life=0;burst(p.x,GROUND-3,14,'#ffb347',80,.45,120);impact(p.x,GROUND-6,'#ffb347',true);dust(p.x,GROUND,5,40);sfx.boom();game.shake=3;if(Math.abs(tgt.x-p.x)<20&&tgt.y>GROUND-40)damage(tgt,p.dmg,p.owner,{fromX:p.x,knock:60,color:'#ffb347',proj:true});}}
 if(p.type==='wave'&&rnd()<.9)part(p.x-p.vx*.03,p.y+rnd()*40-20,0,0,.3,'#fff3b0',1,0,true,rnd()<.3?'star':undefined);
 p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<-20||p.x>W+20)p.life=0;
 if(p.type!=='meteor'&&!p.hit.has(tgt)&&Math.abs(p.x-tgt.x)<p.r+9&&p.y>tgt.y-BODY-p.r&&p.y<tgt.y+p.r){
  const r=damage(tgt,p.dmg,p.owner,{fromX:p.x-p.vx*.05,knock:p.type==='wave'?160:80,big:p.dmg>100,color:p.type==='wisp'?'#7cf2a6':p.type==='wave'?'#fff3b0':'#5fd4ff',proj:true,stun:p.dmg>100?.5:.3});
  if(r==='parry'){p.vx*=-1.2;p.vy=0;p.owner=tgt;p.hit=new Set();continue;}p.hit.add(tgt);if(!p.pierce){p.life=0;if(p.type==='orb')for(let k=0;k<26;k++){const a=rnd()*TAU,v=40+rnd()*110;part(p.x,p.y,Math.cos(a)*v,Math.sin(a)*v,.5+rnd()*.5,['#ff8fd8','#ffd86b','#5fd4ff','#c79bff','#ffffff'][k%5],1,60,true,k%4?undefined:'star');}}}}
 // Two opposing spells cancel out in a burst.
 for(const a of game.proj)for(const b of game.proj)if(a!==b&&a.owner!==b.owner&&a.life>0&&b.life>0&&a.type!=='meteor'&&b.type!=='meteor'&&Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r){const big=a.dmg>b.dmg?a:b,small=big===a?b:a;small.life=0;big.dmg-=small.dmg;if(big.dmg<=0)big.life=0;burst((a.x+b.x)/2,(a.y+b.y)/2,16,'#ffffff',90,.4);impact((a.x+b.x)/2,(a.y+b.y)/2,'#ffffff',true);sfx.block();}
 game.proj=game.proj.filter(p=>p.life>0);
 for(const e of game.fx){e.t+=dt;if(!e.owner)continue;const tgt=game.p[1-e.owner.side];
  if(e.type==='pillar'&&!e.done&&e.t>=e.warn){e.done=true;game.shake=4;burst(e.x,GROUND-4,18,'#fff3b0',90,.6,-40);dust(e.x,GROUND,6,50);if(Math.abs(tgt.x-e.x)<e.w/2+8)damage(tgt,e.dmg,e.owner,{fromX:e.x,unblockable:true,knock:40,launch:120,big:true,color:'#ffd86b'});}
  if(e.type==='bones'&&!e.done&&e.t>=.18){e.done=true;burst(e.x,GROUND-2,8,'#e9e4d6',60,.4,160);dust(e.x,GROUND,3,30);if(Math.abs(tgt.x-e.x)<16&&tgt.y>GROUND-10)damage(tgt,e.dmg,e.owner,{fromX:e.x,unblockable:true,launch:150,knock:30,color:'#7cf2a6'});}}
 game.fx=game.fx.filter(e=>e.t<(e.type==='pillar'?e.warn+e.life:e.type==='impact'?.25:.7));}

// Spells and effects, drawn in screen coordinates.
function drawProj(){const T=game.t;
 for(const p of game.proj){if(p.delay>0)continue;const x=X(p.x),y=Y(p.y);
  if(p.type==='orb'){const r=Math.round(p.r*.9);dglow(x,y,r*3+4,'#1c2a8a',1.1);dglow(x,y,r*2+3,'#3a60ff',1.2);dglow(x,y,r+2,'#46d8ff',1.6);disc(x,y,Math.max(1,r-1),'#c6f6ff');P(x,y,1,1,'#ffffff');
   for(let k=0;k<7;k++){const a=k*.9+T*9,d=r+2+((k*7+Math.floor(T*30))%5);P(x+Math.cos(a)*d,y+Math.sin(a)*d,1,1,['#ff8fd8','#8fe3ff','#c79bff'][k%3]);}if(Math.floor(T*20)%2)star(x-Math.sign(p.vx)*(r+3),y-r-1,2,'#ff8fd8');}
  else if(p.type==='wisp'){dglow(x,y,9,'#0e4a2c',1.3);dglow(x,y,5,'#2ea86a',1.3);P(x-2,y-2,5,4,'#e8fff0');P(x-1,y+2,3,1,'#e8fff0');P(x-1,y-1,1,1,'#12301f');P(x+1,y-1,1,1,'#12301f');P(x,y+1,1,1,'#9fe8bc');const d=-Math.sign(p.vx||1);for(let k=1;k<5;k++)P(x+d*(2+k),y+Math.round(Math.sin(T*18+k)*1),1,1,k<3?'#7cf2a6':'#2e9a62');}
  else if(p.type==='meteor'){dglow(x,y,10,'#5a1e06',1.3);dglow(x,y,5,'#e8661e',1.4);disc(x,y,2,'#ffc05a');P(x,y,1,1,'#fff6d0');for(let k=1;k<6;k++)P(x+k,y-k*2,1,1,k<3?'#ffb347':'#e0501a');}
  else if(p.type==='wave'){const d=Math.sign(p.vx);dglow(x,y,20,'#4a3a10',1.2);for(let k=-13;k<=13;k++){const bend=Math.round((1-(k/13)**2)*6)*d;P(x+bend,y+k,2,1,'#fffbe0');P(x+bend-d*2,y+k,1,1,'#ffd86b');if(dith(x,y+k,.5))P(x+bend-d*4,y+k,1,1,'#b88a2a');}}}
 for(const e of game.fx){const ex=X(e.x);
  if(e.type==='pillar'){const hw=Math.round(e.w*S/2);
   if(e.t<e.warn){const k=e.t/e.warn;ring(ex,SG+1,hw+5,'#b88a2a',.28);ring(ex,SG+1,(hw+5)*k,'#fff3b0',.28);
    for(let j=0;j<6;j++){const a=j/6*TAU+e.t*4;P(ex+Math.cos(a)*(hw+5),SG+1+Math.sin(a)*(hw+5)*.28,1,1,'#fff6c8');}
    const cy=SG-8-Math.round(k*30);P(ex,cy-2,1,5,'#ffd86b');P(ex-2,cy,5,1,'#ffd86b');dglow(ex,cy,5,'#4a3a10',1.2);}
   else{const k=1-(e.t-e.warn)/e.life,wd=Math.max(2,Math.round(hw*(.7+.5*k)));dglow(ex,SG-4,wd*2+10,'#4a3a10',1.4*k);
    for(let yy=0;yy<SG;yy++){for(let xx=-wd;xx<=wd;xx++){const u=Math.abs(xx)/wd;if(u<.3)P(ex+xx,yy,1,1,k>.5?'#ffffff':'#fff6c8');else if(u<.6)P(ex+xx,yy,1,1,'#ffe07a');else if(dith(ex+xx,yy+Math.floor(e.t*40),(1-u)*2.2*k))P(ex+xx,yy,1,1,'#e8a83a');}}
    ring(ex,SG+1,wd+6+(1-k)*8,'#fff3b0',.28);if(rnd()<.8)part(e.x+(rnd()-.5)*e.w,GROUND-rnd()*150,0,-50,.4,'#fff3b0',1,0,true,rnd()<.3?'star':undefined);}}
  else if(e.type==='bones'){const k=clamp(e.t/.18,0,1),out=e.t<.18?k:1-clamp((e.t-.4)/.3,0,1),h=Math.round(12*out),s=e.seed>.5?1:-1;
   if(h>0){dglow(ex,SG-3,8,'#0e4a2c',1.3*out);for(let yy=0;yy<h;yy++){P(ex-1,SG-yy,3,1,'#ece6d4');P(ex+1,SG-yy,1,1,'#aea68e');}
    const ty=SG-h;P(ex-3,ty,2,3,'#ece6d4');P(ex+2,ty-1,2,3,'#ece6d4');P(ex-1,ty-2,1,2,'#ece6d4');P(ex+1,ty-3,1,3,'#ece6d4');P(ex+s*4,ty+2,1,2,'#ece6d4');}
   for(let xx=-5;xx<=5;xx++)if(dith(ex+xx,SG,.7))P(ex+xx,SG,1,1,'#2a1a30');}
  else if(e.type==='impact'){const k=e.t/.25,r=Math.round((e.big?9:6)*(.4+k)),x=X(e.x),y=Y(e.y);
   for(let j=0;j<(e.big?8:6);j++){const a=e.rot+j/(e.big?8:6)*TAU,r0=Math.round(r*.4);for(let d=r0;d<=r;d++)if(d>r*k*.9)P(x+Math.cos(a)*d,y+Math.sin(a)*d,1,1,d>r-1?e.c:'#ffffff');}
   if(k<.4){disc(x,y,e.big?3:2,'#ffffff');}}}
 for(const f of game.p){const tp=tipOf(f),tx=X(tp.x),ty=Y(tp.y),fx=X(f.x);
  if(f.state==='cast'&&f.def.id==='necro'&&f.skill===1&&f.beam){const o=game.p[1-f.side],x0=tx,y0=ty,x1=X(o.x),y1=Y(o.y)-24;
   for(let k=0;k<=60;k++){const u=k/60,wv=Math.sin(u*14-game.t*26)*2.2*Math.sin(u*Math.PI);const x=x0+(x1-x0)*u,y=y0+(y1-y0)*u+wv;P(x,y,1,2,k%4?'#7cf2a6':'#e8fff0');if(k%3===0)P(x,y-wv*1.6,1,1,'#2e9a62');}
   dglow(x1,y1,10,'#0e4a2c',1.4);dglow(x0,y0,6,'#2ea86a',1.3);if(rnd()<.7)part(o.x,o.y-36,(tp.x-o.x)*1.6,(tp.y-o.y+36)*1.6,.6,'#7cf2a6',1,0,true,rnd()<.3?'star':undefined);}
  if(f.state==='charge'){const c=f.charge,r=Math.round(3+c*4);dglow(tx,ty,r*3+3,'#2a1a7a',1.2);dglow(tx,ty,r*2+1,'#6a3cff',1.4);dglow(tx,ty,r,'#46d8ff',1.6);P(tx,ty,1,1,'#ffffff');
   for(let s=0;s<2;s++){const a=rnd()*TAU,d=16+rnd()*10;part(tp.x+Math.cos(a)*d/S,tp.y+Math.sin(a)*d/S,-Math.cos(a)*70,-Math.sin(a)*70,.3,['#5fd4ff','#c79bff','#ff8fd8'][s+(rnd()<.3?1:0)],1,0,true,rnd()<.3?'star':undefined);}
   for(let xx=-9;xx<=9;xx++)if(dith(fx+xx,SG,1-Math.abs(xx)/10+Math.sin(game.t*20+xx)*.2))P(fx+xx,SG,1,1,'#46d8ff');
   const bw=Math.round(18*Math.min(1,c/1.5));P(fx-9,SG+4,18,2,INK);P(fx-9,SG+4,bw,1,'#8fe3ff');P(fx-9,SG+5,bw,1,'#3a8ce0');}
  if((f.state==='cast'&&!(f.def.id==='necro'&&f.skill===1))||f.state==='blink'){const col=f.def.id==='cleric'?['#4a3a10','#e8b04a']:f.def.id==='necro'?['#0e4a2c','#2ea86a']:f.def.id==='knight'?['#3a3a3a','#e8eef4']:['#2a1a7a','#6a3cff'];
   dglow(tx,ty,11,col[0],1.2);dglow(tx,ty,5,col[1],1.4);if(Math.floor(game.t*16)%2)star(tx+(Math.floor(game.t*7)%3-1)*5,ty-4,2,f.def.color);
   if(f.def.id==='cleric'){ring(fx,SG+1,12,'#e8b04a',.3);for(let j=0;j<8;j++){const a=j/8*TAU+game.t*3;P(fx+Math.cos(a)*12,SG+1+Math.sin(a)*3.6,1,1,'#fff6c8');}}
   if(f.def.id==='mage')for(let xx=-8;xx<=8;xx++)if(dith(fx+xx,SG,.8-Math.abs(xx)/10))P(fx+xx,SG,1,1,'#46d8ff');}
  if(f.shield>0){const r=17+Math.round(Math.sin(game.t*6));for(let a=0;a<TAU;a+=.05){const x=Math.round(fx+Math.cos(a)*r*.8),y=Math.round(Y(f.y)-22+Math.sin(a)*r);if(dith(x,y,.55))P(x,y,1,1,'#ffd86b');}if(Math.floor(game.t*8)%4===0)star(fx+Math.sin(game.t*3)*10,Y(f.y)-40,2,'#ffe9a0');}
  if(f.regen>0&&rnd()<.4)part(f.x+rnd()*24-12,f.y-rnd()*50,0,-25,.6,'#ffe9a0',1,0,true,rnd()<.3?'star':undefined);}}

// --- Joueurs, IA ---------------------------------------------------------------
const keys={};let prevIn=[{},{}];
const MAP=[{left:['KeyA'],right:['KeyD'],up:['KeyW'],down:['KeyS'],atk:['KeyF'],s1:['KeyG'],s2:['KeyH'],ult:['KeyR']},
 {left:['ArrowLeft'],right:['ArrowRight'],up:['ArrowUp'],down:['ArrowDown'],atk:['KeyK'],s1:['KeyL'],s2:['KeyO'],ult:['KeyP']}];
function readInput(side){const m=MAP[side],r={};for(const k in m)r[k]=m[k].some(c=>keys[c]);
 if(game.mode==='1p'&&side===0){const m2=MAP[1];for(const k in m2)r[k]=r[k]||m2[k].some(c=>keys[c]);r.atk=r.atk||keys.Space;}
 for(const k in touch)r[k]=r[k]||(side===0&&touch[k]);return r;}
const touch={};
const ai={t:0,plan:{},hold:0};
function aiInput(f,o,dt){const lvl=[.35,.6,.85][game.diff];ai.t-=dt;const dx=o.x-f.x,dist=Math.abs(dx),dir=Math.sign(dx)||1;
 if(f.state==='charge'){ai.hold-=dt;return {s1:ai.hold>0};}
 if(ai.t>0)return ai.plan;ai.t=.12+(1-lvl)*.25+rnd()*.1;const p={};
 const threat=game.proj.some(q=>q.owner!==f&&Math.abs(q.x-f.x)<70&&Math.sign(f.x-q.x)===Math.sign(q.vx))||(o.state==='attack'&&dist<46)||(o.state==='dash'&&dist<80);
 if(threat&&rnd()<lvl){if(f.def.id==='knight'&&canUse(f,1))p.s2=true;else if(rnd()<.5)p.down=true;else p.up=true;ai.plan=p;return p;}
 if(f.ult>=100&&rnd()<lvl){p.ult=true;ai.plan=p;return p;}
 const id=f.def.id;
 if(dist>80){if(rnd()<lvl*.7){if(id==='mage'&&canUse(f,0)){p.s1=true;ai.hold=.3+rnd()*.9;}else if(id==='cleric'&&canUse(f,0))p.s1=true;else if(id==='necro'&&canUse(f,0))p.s1=true;else if(id==='knight'&&canUse(f,0)&&dist<150)p.s1=true;}
  if(!p.s1){p[dir>0?'right':'left']=true;if(rnd()<.05)p.up=true;}}
 else if(dist<42){if(id==='cleric'&&f.hp<f.def.hp*.5&&canUse(f,1))p.s2=true;else if(id==='mage'&&canUse(f,1)&&rnd()<.3)p.s2=true;else if(id==='necro'&&canUse(f,1)&&rnd()<.4)p.s2=true;else if(rnd()<.2+lvl*.6)p.atk=true;else p[dir>0?'left':'right']=rnd()<.3;}
 else{if(id==='necro'&&canUse(f,1)&&rnd()<.3)p.s2=true;else p[dir>0?'right':'left']=true;}
 ai.plan=p;return p;}
function updateFighter(f,o,inp,dt){const pr={};for(const k in inp)pr[k]=inp[k]&&!prevIn[f.side][k];prevIn[f.side]={...inp};
 f.anim+=dt;f.stateT+=dt;f.cd[0]=Math.max(0,f.cd[0]-dt);f.cd[1]=Math.max(0,f.cd[1]-dt);f.flash-=dt;f.parry-=dt;f.shield-=dt;f.inv-=dt;f.comboT-=dt;f.hitsT-=dt;
 if(f.state!=='charge')f.mana=Math.min(100,f.mana+9*dt);if(f.regen>0){f.regen-=dt;f.hp=Math.min(f.def.hp,f.hp+50*dt);}
 f.hpShow+=(f.hp-f.hpShow)*Math.min(1,dt*(f.hpShow>f.hp?2.5:10));
 if(f.y<GROUND||f.vy<0){f.vy+=560*dt;f.y+=f.vy*dt;if(f.y>=GROUND){f.y=GROUND;f.vy=0;if(f.state==='jump')setState(f,'idle');if(f.state!=='ko')dust(f.x,GROUND,4);}}
 f.x+=f.vx*dt;if(f.y>=GROUND&&!['walk','dash'].includes(f.state))f.vx*=Math.pow(.0005,dt);f.x=clamp(f.x,12,W-12);
 if(f.state==='ko'||game.phase!=='fight')return;
 if(f.stun>0){f.stun-=dt;if(f.state!=='hurt'){setState(f,'hurt');f.dur=f.stun;}return;}
 if(f.state==='hurt'){if(f.stateT>f.dur)setState(f,'idle');return;}
 if(['attack','cast','dash','blink'].includes(f.state)||(f.state==='block'&&f.sub===1)){skillTick(f,o,dt);if(f.state==='attack'&&f.stateT>=f.dur*.7&&pr.atk&&f.combo<2&&f.atk){startAttack(f);return;}if(f.stateT>=f.dur)setState(f,'idle');return;}
 if(f.state==='charge'){f.charge=Math.min(1.5,f.charge+dt);f.vx=0;if(!inp.s1){game.proj.push({type:'orb',x:f.x+f.facing*40,y:f.y-40,vx:f.facing*(150+f.charge*70),vy:0,r:Math.round(3+f.charge*3),dmg:Math.round(55+f.charge*105),owner:f,life:3,hit:new Set()});sfx.orb();setState(f,'cast');f.dur=.3;f.hitDone=true;f.skill=-1;}return;}
 if(f.y>=GROUND)f.facing=o.x>f.x?1:-1;
 if(inp.down&&f.y>=GROUND){f.vx=0;setState(f,'block',true);return;}else if(f.state==='block')setState(f,'idle');
 if(pr.atk)return startAttack(f);if(pr.s1)return startSkill(f,o,0);if(pr.s2)return startSkill(f,o,1);if(pr.ult)return startSkill(f,o,2);
 const dir=(inp.right?1:0)-(inp.left?1:0);
 if(pr.up&&f.y>=GROUND){f.vy=-235;f.y-=1;setState(f,'jump');sfx.jump();dust(f.x,GROUND,3);}
 if(f.y>=GROUND){f.vx=dir*f.def.speed;if(f.state!=='jump')setState(f,dir?'walk':'idle',true);}else f.vx=dir*f.def.speed*.85;
 // bodies do not overlap
 const gap=o.x-f.x;if(Math.abs(gap)<22&&Math.abs(o.y-f.y)<30){f.x-=Math.sign(gap||1)*(22-Math.abs(gap))/2;}}

// --- Interface (toile au triple, en unités écran de la scène) -----------------
const HP=(x,y,w,h,c)=>{hx.fillStyle=c;hx.fillRect(Math.round(x*HS),Math.round(y*HS),Math.round(w*HS),Math.round(h*HS));};
function htext(s,x,y,c,size=8,align='left',shadow=INK){hx.font=`${size*HS}px VT323, monospace`;hx.textAlign=align;hx.textBaseline='top';if(shadow){hx.fillStyle=shadow;for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,0],[0,-1]])hx.fillText(s,x*HS+dx*HS*.7,y*HS+dy*HS*.7);}hx.fillStyle=c;hx.fillText(s,x*HS,y*HS);}
const faces=new Map();
function face(f){let c=faces.get(f.def.id);if(c)return c;const d=fighter(f.def,0),ps=pose(d);ps.bob=0;paint(d,ps);[c]=mk(16,16);const k=c.getContext('2d');k.fillStyle='#231a30';k.fillRect(0,0,16,16);
 const oy=OYS-{mage:37,cleric:35,knight:37,necro:35}[f.def.id];for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])k.drawImage(sil,OXS-7+dx,oy+dy,16,16,0,0,16,16);k.drawImage(spr,OXS-7,oy,16,16,0,0,16,16);faces.set(f.def.id,c);return c;}
function hud(){hx.clearRect(0,0,hc.width,hc.height);
 for(const f of game.p){const L=f.side===0,bw=84,x0=L?24:RW-24-bw,y=6;
  const fc=face(f);HP(L?4:RW-22,4,18,18,INK);HP(L?5:RW-21,5,16,16,'#3a3249');hx.save();if(!L){hx.translate((RW-5)*HS,0);hx.scale(-1,1);hx.drawImage(fc,0,5*HS,16*HS,16*HS);}else hx.drawImage(fc,5*HS,5*HS,16*HS,16*HS);hx.restore();
  HP(x0-1,y-1,bw+2,8,INK);HP(x0,y,bw,6,'#3a1420');const r=f.hp/f.def.hp,show=Math.round(bw*f.hpShow/f.def.hp),now=Math.round(bw*r);
  HP(L?x0:x0+bw-show,y,show,6,'#ffffff');const hcol=r>.5?['#4fd67a','#2e9a52','#a6f0b8']:r>.25?['#f0c33c','#b08a1c','#ffe890']:['#ff4d5e','#a82a38','#ff9aa4'];
  HP(L?x0:x0+bw-now,y,now,6,hcol[0]);HP(L?x0:x0+bw-now,y+4,now,2,hcol[1]);HP(L?x0:x0+bw-now,y+1,now,1,hcol[2]);for(let k=8;k<bw;k+=8)HP(x0+k,y,1/HS,6,'rgba(12,9,22,.5)');
  const mw=bw*.62,m=Math.round(mw*f.mana/100);HP(L?x0-1:x0+bw-mw-1,y+7,mw+2,4,INK);HP(L?x0:x0+bw-mw,y+8,mw,1,'#1c2140');HP(L?x0:x0+bw-m,y+8,m,1,'#6fa8ff');
  const u=Math.round(mw*f.ult/100);HP(L?x0:x0+bw-mw,y+9,mw,1,'#2a2233');HP(L?x0:x0+bw-u,y+9,u,1,f.ult>=100&&Math.floor(game.t*6)%2?'#ffffff':'#ffc233');
  htext(`${f.def.name}`,L?x0:x0+bw,y+11,'#f3ecff',8,L?'left':'right');if(f.ult>=100&&Math.floor(game.t*3)%2)htext('ULTIME PRÊT',L?x0+32:x0+bw-32,y+11,'#ffc233',7,L?'left':'right');
  for(let k=0;k<2;k++){const px=L?x0+bw-4-k*6:x0+1+k*6;HP(px-1,y+12,5,5,INK);HP(px,y+13,3,3,f.wins>k?'#ffc233':'#3a3249');if(f.wins>k)HP(px,y+13,1,1,'#fff0b0');}
  if(game.mode==='1p'&&!L)continue;
  const keysLbl=L?['F','G','H','R']:['K','L','O','P'];
  for(let k=0;k<4;k++){const sx=L?4+k*15:RW-4-15*4+k*15+1,sy=RH-15,ready=k===0||(k<3?canUse(f,k-1):f.ult>=100);HP(sx,sy,13,12,INK);HP(sx+1,sy+1,11,10,ready?'#3a3249':'#1d1726');HP(sx+1,sy+1,11,1,ready?'#52476a':'#2a2236');
   if(k>0&&k<3&&f.cd[k-1]>0){const hh=10*f.cd[k-1]/f.def.skills[k-1][3];HP(sx+1,sy+1+10-hh,11,hh,'rgba(0,0,0,.6)');}
   htext(keysLbl[k],sx+6.5,sy+1,ready?'#ffffff':'#6e6480',8,'center',false);HP(sx+3,sy+9,7,1,k===0?'#c3ccd7':k===3?'#ffc233':f.def.color);}}
 HP(RW/2-11,3,22,15,INK);HP(RW/2-10,4,20,13,'#2a2233');HP(RW/2-10,4,20,1,'#3f3552');htext(String(Math.ceil(game.timer)).padStart(2,'0'),RW/2,3,game.timer<10&&Math.floor(game.t*4)%2?'#ff4d5e':'#ffffff',14,'center',false);
 htext(`MANCHE ${game.round}`,RW/2,19,'#bdb3d4',7,'center');}
function drawTexts(dt){for(const t of game.texts){t.life-=dt;const a=clamp(t.life*2,0,1);hx.globalAlpha=a;
 if(t.big){const s=Math.round(24+Math.max(0,(t.life-1)*50));htext(t.text,X(t.x),Y(t.y)-s/2,t.c,s,'center');}else{t.y-=24*dt;htext(t.text,X(t.x),Y(t.y),t.c,8,'center');}hx.globalAlpha=1;}game.texts=game.texts.filter(t=>t.life>0);}
function drawParts(dt){for(const p of game.parts){p.life-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;}game.parts=game.parts.filter(p=>p.life>0);
 for(const p of game.parts){const k=clamp(p.life/p.max*1.5,0,1),x=X(p.x),y=Y(p.y);
  if(p.k==='smoke'){const r=Math.max(1,Math.round((1-p.life/p.max)*3+1));dglow(x,y,r,p.c,k*1.4,false);continue;}
  ctx.globalCompositeOperation=p.add?'lighter':'source-over';
  if(p.k==='star'){const sz=p.life/p.max>.5?3:2;if(Math.floor(p.life*20)%3)star(x,y,sz,p.c);}
  else{if(k<.5&&!dith(x,y,k*2))continue;P(x,y,p.s>1?2:1,p.s>1?2:1,p.c);}}
 ctx.globalCompositeOperation='source-over';}

// --- Déroulé des manches ---------------------------------------------------
function startMatch(){audioOn();game.p=[fighter(CHARS[game.sel[0]],0),fighter(CHARS[game.sel[1]],1)];game.round=1;game.stats=[{hits:0,dmg:0},{hits:0,dmg:0}];buildArena(game.arena);startRound();$('arena-menu').hidden=true;$('arena-end').hidden=true;cv.focus();}
function startRound(){for(const f of game.p){const w=f.wins;Object.assign(f,fighter(f.def,f.side),{wins:w});}game.proj=[];game.fx=[];game.parts=[];game.texts=[];game.timer=99;game.phase='intro';game.phaseT=0;game.slow=1;prevIn=[{},{}];popup(W/2,80,`MANCHE ${game.round}`,'#ffffff',true);sfx.round();}
function endMatch(){game.phase='over';const w=game.p.find(f=>f.wins>=2)||game.p.reduce((a,b)=>a.hp>=b.hp?a:b);$('end-title').textContent=`${w.def.name} remporte le combat !`;
 $('end-stats').textContent=game.p.map(f=>`${f.def.name} : ${game.stats[f.side].hits} coups, ${game.stats[f.side].dmg} dégâts`).join(' · ');$('arena-end').hidden=false;}
function stepGame(dt){game.phaseT+=dt;
 if(game.phase==='intro'){if(game.phaseT>1.5){game.phase='fight';popup(W/2,80,'COMBAT !','#ffc233',true);sfx.round();}}
 else if(game.phase==='fight'){game.timer-=dt;if(game.timer<=0){game.timer=0;const [a,b]=game.p,ra=a.hp/a.def.hp,rb=b.hp/b.def.hp;if(ra!==rb){const w=ra>rb?a:b;w.wins++;popup(W/2,80,'TEMPS !','#ffffff',true);}game.phase='ko';game.phaseT=0;}}
 else if(game.phase==='ko'){if(game.phaseT>1.2)game.slow=1;if(game.phaseT>2.6){if(game.p.some(f=>f.wins>=2)||game.round>=5)endMatch();else{game.round++;startRound();}}}
 const [a,b]=game.p,ia=readInput(0),ib=game.mode==='1p'?aiInput(b,a,dt):readInput(1);
 if(game.phase==='fight'||game.phase==='ko'){updateFighter(a,b,game.phase==='fight'?ia:{},dt);updateFighter(b,a,game.phase==='fight'?ib:{},dt);}
 updateProj(dt);}
game.t=0;let last=0;
function frame(ts){const raw=Math.min(.05,(ts-last)/1000||.016);last=ts;
 if(game.phase!=='menu'&&!game.paused&&!game.freeze){let dt=raw*game.slow;if(game.hitstop>0){game.hitstop-=raw;dt=0;}game.t+=dt;if(dt>0)stepGame(dt);}
 const tt=game.phase==='menu'?ts/1000:game.t;
 ctx.save();if(game.shake>0&&!reduced){ctx.translate(Math.round((rnd()-.5)*game.shake),Math.round((rnd()-.5)*game.shake));game.shake=Math.max(0,game.shake-raw*20);}
 ctx.drawImage(bgC,0,0);drawDecoLive(tt);
 if(game.phase==='menu'){demo(raw);}else{drawProj();for(const f of [...game.p].sort((x,y)=>x.state==='ko'?-1:1))drawFighter(f);drawParts(game.paused||game.freeze?0:raw*game.slow);}
 ctx.restore();
 if(game.flashW>0){ctx.fillStyle=`rgba(255,255,255,${game.flashW})`;ctx.fillRect(0,0,RW,RH);game.flashW=Math.max(0,game.flashW-raw*1.5);}
 if(game.phase!=='menu'){hud();drawTexts(game.paused?0:raw);}else hx.clearRect(0,0,hc.width,hc.height);
 if(game.paused){HP(0,0,RW,RH,'rgba(8,6,14,.7)');htext('PAUSE',RW/2,56,'#ffffff',26,'center');htext('Échap pour reprendre',RW/2,82,'#bdb3d4',9,'center');}
 requestAnimationFrame(frame);}
// Menu backdrop: the two chosen fighters idle on the chosen arena.
const demoF=[null,null];function demo(dt){for(let s=0;s<2;s++){if(!demoF[s]||demoF[s].def!==CHARS[game.sel[s]]){demoF[s]=fighter(CHARS[game.sel[s]],s);demoF[s].x=s?W-120:120;}const f=demoF[s];f.anim+=dt;drawFighter(f);}}

// --- Menu ------------------------------------------------------------------------
function portrait(i){const [c,k]=mk(40,44);const f=fighter(CHARS[i],0);paint(f,pose(f));for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])k.drawImage(sil,OXS-20+dx,OYS-42+dy,40,44,0,0,40,44);k.drawImage(spr,OXS-20,OYS-42,40,44,0,0,40,44);return c;}
function menu(){const grid=(id,side)=>{const box=$(id);box.replaceChildren();CHARS.forEach((ch,i)=>{const b=document.createElement('button');b.type='button';b.className='pick'+(game.sel[side]===i?' on':'');b.setAttribute('aria-pressed',game.sel[side]===i);
  const pc=portrait(i);pc.className='pick-art';b.append(pc);const t=document.createElement('span');t.innerHTML=`<b>${ch.name}</b><small>${ch.title}</small>`;b.append(t);b.onclick=()=>{game.sel[side]=i;menu();};box.append(b);});};
 grid('pick-1',0);grid('pick-2',1);
 const ar=$('pick-arena');ar.replaceChildren();ARENAS.forEach((a,i)=>{const b=document.createElement('button');b.type='button';b.className='pick'+(game.arena===i?' on':'');b.innerHTML=`<span><b>${a.name}</b><small>${a.sub}</small></span>`;b.onclick=()=>{game.arena=i;buildArena(i);menu();};ar.append(b);});
 const info=$('skills-info');info.replaceChildren();for(const side of [0,1]){const ch=CHARS[game.sel[side]],d=document.createElement('div');const keysL=side===0?['F','G','H','R']:game.mode==='2p'?['K','L','O','P']:['IA','IA','IA','IA'];
  d.innerHTML=`<b style="color:${ch.color}">${ch.name}</b><ul><li><kbd>${keysL[0]}</kbd> Attaque en trois coups</li>${ch.skills.map((s,k)=>`<li><kbd>${keysL[k+1]}</kbd> ${s[0]} — ${s[1]}${s[2]?` (${s[2]} mana)`:''}</li>`).join('')}</ul>`;info.append(d);}
 $('p2-label').textContent=game.mode==='2p'?'Joueur 2 (flèches · K L O P)':'Adversaire (IA)';}
$('mode').onchange=e=>{game.mode=e.target.value;menu();};$('diff').onchange=e=>{game.diff=+e.target.value;};
$('fight').onclick=startMatch;$('again').onclick=()=>{for(const f of game.p)f.wins=0;startMatch();};$('to-menu').onclick=()=>{game.phase='menu';$('arena-end').hidden=true;$('arena-menu').hidden=false;menu();};
$('sound').onclick=e=>{muted=!muted;e.target.textContent=muted?'Son : non':'Son : oui';};
const GAME_KEYS=new Set(['KeyA','KeyD','KeyW','KeyS','KeyF','KeyG','KeyH','KeyR','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyK','KeyL','KeyO','KeyP','Space']);
addEventListener('keydown',e=>{if(e.code==='Escape'&&(game.phase==='fight'||game.phase==='intro'||game.phase==='ko')){game.paused=!game.paused;return;}if(GAME_KEYS.has(e.code)&&game.phase!=='menu'){e.preventDefault();keys[e.code]=true;}else if(e.code==='Enter'&&game.phase==='menu'&&!/BUTTON|SELECT/.test(e.target.tagName))startMatch();});
addEventListener('keyup',e=>{keys[e.code]=false;});addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(game.phase==='fight')game.paused=true;});
for(const b of document.querySelectorAll('[data-pad]')){b.onpointerdown=e=>{e.preventDefault();audioOn();touch[b.dataset.pad]=true;};b.onpointerup=b.onpointerleave=b.onpointercancel=()=>{touch[b.dataset.pad]=false;};}
buildArena(0);menu();requestAnimationFrame(frame);
// Hook for automated checks: advance the simulation without waiting for animation frames.
game.advance=(n,dt=1/60)=>{for(let i=0;i<n;i++){game.t+=dt;stepGame(dt);for(const pt of game.parts){pt.life-=dt;pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;}}};
game._dbg={paint,pose,spr,sil,fighter,CHARS,setState};game.keys=keys;game.startMatch=startMatch;game.menu=menu;game.buildArena=buildArena;
window.ArenaGame=game;
})();
