import { Ciel, hache } from './moteur.js?v=m34';

const angleOr = 2.399963, cercle = Math.PI * 2;
const tons = ['131,185,244', '154,169,255', '133,202,226'];
const lumiere = [-Math.sin(-41*Math.PI/180)/Math.tan(35*Math.PI/180),-Math.cos(-41*Math.PI/180)/Math.tan(35*Math.PI/180)];
const mix = (a,b,t) => a+(b-a)*t, phase = v => v-Math.floor(v);
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function profondeurTriangle(p,a,b,c) {
  const ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y;
  const det=ux*vy-uy*vx;
  if(Math.abs(det)<1e-6)return Infinity;
  const dx=p.x-a.x,dy=p.y-a.y;
  const wB=(dx*vy-dy*vx)/det,wC=(ux*dy-uy*dx)/det,wA=1-wB-wC;
  if(Math.min(wA,wB,wC)<0)return Infinity;
  return 1/(wA/a.z+wB/b.z+wC/c.z);
}
function trait(ctx,a,b) {
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
function impulsions(ctx,a,b,identifiants,t,color) {
  for(const id of identifiants){
    const speed=(.1+id%7*.015)*1.5, offset=(id>>>8)%1000/1000;
    const cycle=time=>id%2?phase(time*speed+offset):1-phase(time*speed+offset);
    const head=cycle(t),tail=cycle(t-1);
    if(Math.abs(head-tail)>.5)continue;
    const from={x:mix(a.x,b.x,tail),y:mix(a.y,b.y,tail)},to={x:mix(a.x,b.x,head),y:mix(a.y,b.y,head)};
    const gradient=ctx.createLinearGradient(from.x,from.y,to.x,to.y);
    gradient.addColorStop(0,'rgba('+color+',0)');gradient.addColorStop(1,'rgba('+color+',.48)');
    ctx.strokeStyle=gradient;trait(ctx,from,to);
    ctx.fillStyle='rgba('+color+',.6)';ctx.fillRect(to.x-1,to.y-1,2,2);
  }
}
function anneau(ctx,proj,x,y,r,alpha){
  ctx.strokeStyle='rgba(255,255,255,'+alpha+')';ctx.lineWidth=.85;ctx.beginPath();
  let open=false;
  for(let i=0;i<=64;i++){
    const t=i*cercle/64,p=proj(x+Math.cos(t)*r,y+Math.sin(t)*r,0);
    if(!p){open=false;continue;}
    if(open)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
    open=true;
  }
  ctx.stroke();
}

export class CielExpo extends Ciel {
  definit(id,spec){
    const cards=spec.editoriaux||[], total=Math.max(cards.length,spec.densite||0);
    const editoriaux=new Map(cards.map((card,i)=>[Math.floor(i*total/cards.length),card]));
    const noeuds=Array.from({length:total},(_,i)=>{
      const key=id+':'+i, z=1-2*(i+.5)/total, radius=.6+.4*hache(key)/2**32;
      const a=i*angleOr+hache(key+':angle')/2**32, r=Math.sqrt(1-z*z)*radius;
      return {ed:editoriaux.get(i), at:[Math.cos(a)*r,Math.sin(a)*r,z*radius*.7], hemisphere:i%2?1:-1,
        phases:[hache(key+':dot:0'),hache(key+':dot:1')],dx:0,dy:0,vx:0,vy:0};
    });
    const liens=new Map();
    if(spec.groupe==='titre')noeuds.forEach(({at},i)=>{
      const near=noeuds.map((n,j)=>({j,d:Math.hypot(at[0]-n.at[0],at[1]-n.at[1],at[2]-n.at[2])}))
        .filter(({j})=>i!==j).sort((a,b)=>a.d-b.d).slice(0,2);
      for(const {j} of near)liens.set(Math.min(i,j)+':'+Math.max(i,j),[i,j]);
    });
    this.etoiles.set(id,{id,...spec,noeuds,liens:[...liens.values()],rang:this.etoiles.size-1,centre:null});
  }
  place(id,centre,rayon){
    super.place(id,centre,rayon);
    if(id!=='accueil')return;
    for(const e of this.etoiles.values()){
      if(e.parent!==id)continue;
      if(centre&&e.centre)e.centre[2]=centre[2]*.57;
      else e.centre=null;
    }
  }
  vide(){super.vide();this.pris=null;}

  dessine(ctx,proj,t,{covers,souris,W,H,dt,alpha,titres,rise,unproject,segment}){
    const masque=p=>covers.some(([a,b,c,d])=>
      Math.min(profondeurTriangle(p,a,b,c),profondeurTriangle(p,a,c,d))<p.z-2
    );
    this.cibles=[];this.survol=null;
    let nearest=18;
    ctx.save();
    for(const e of this.etoiles.values()){
      e.ecran=e.libelleEcran=null;
      const title=e.groupe==='titre',opacity=title?titres:alpha;
      if(!e.centre||opacity<=.003)continue;
      const [x,y,h]=e.centre,r=e.rayon,hub=proj(x,y,h);
      if(!hub||hub.x<-W/2||hub.x>1.5*W||hub.y<-H/2||hub.y>1.5*H)continue;
      e.ecran=hub;
      const color=title?'255,255,255':tons[Math.max(0,e.rang)%tons.length];
      ctx.globalAlpha=opacity;
      const parent=e.parent&&this.etoiles.get(e.parent);
      if(parent?.ecran)segment(parent.centre,e.centre,color,.3*opacity);
      if(e.sol){
        const f=this.fondu,active=f?(e.chapitre===f.de?1-f.poids:0)+(e.chapitre===f.vers?f.poids:0):Number(e.chapitre===this.actif);
        const radius=Math.max(24,r*.9),lit=distance(hub,souris)<14||this.pris?.etoile===e;
        anneau(ctx,proj,x,y,radius,.35+.55*Math.max(active,Number(lit)));
        const p=proj(x,y+radius+14,0), dx=proj(x+100,y+radius+14,0), texte=e.num+' '+e.label;
        if(p&&dx&&!masque(p)){
          const px=Math.min(13,Math.max(6,.15*Math.abs(dx.x-p.x)));
          ctx.font='300 '+px+'px "Sohne Mono","JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillStyle='#fff';
          ctx.fillText(texte,p.x,p.y);e.libelleEcran={x:Math.round(p.x),y:Math.round(p.y),texte};
        }
      }
      const ombre=([c,row,haut])=>proj(c+lumiere[0]*haut*rise,row+lumiere[1]*haut*rise,0);
      const hubShadow=ombre(e.centre);
      const nodes=e.noeuds.map(n=>{
        const [nx,ny,nz]=n.at;
        let wx=x+r*nx,wy=y+r*ny;
        const hauteur=Math.max(12,h+(title?r*nz:n.hemisphere*.85*h*Math.sqrt(Math.max(0,1-nx*nx-ny*ny))));
        const p=proj(wx,wy,hauteur);
        if(!p)return null;
        if(this.pris?.noeud===n){n.dx=souris.x-p.x;n.dy=souris.y-p.y;n.vx=n.vy=0;}
        else if(t===null){n.dx=n.dy=n.vx=n.vy=0;}
        else if(n.dx||n.dy||n.vx||n.vy)for(let rest=Math.min(.1,dt);rest>1e-4;rest-=1/120){
          const step=Math.min(1/120,rest);
          n.vx+=(-150*n.dx-8.5*n.vx)*step;n.vy+=(-150*n.dy-8.5*n.vy)*step;
          n.dx+=n.vx*step;n.dy+=n.vy*step;
          if(Math.abs(n.dx)+Math.abs(n.dy)+Math.abs(n.vx)+Math.abs(n.vy)<.03){n.dx=n.dy=n.vx=n.vy=0;break;}
        }
        p.x+=n.dx;p.y+=n.dy;
        if(n.dx||n.dy){
          const position=unproject(p.x,p.y,hauteur,[wx,wy]);
          if(position)[wx,wy]=position;
        }
        const world=[wx,wy,hauteur];
        return {p,n,covered:masque(p),world,ground:ombre(world)};
      });
      for(const [a,b] of e.liens)if(nodes[a]&&nodes[b])segment(nodes[a].world,nodes[b].world,color,.084*opacity);
      for(const node of nodes){
        if(!node)continue;
        const {p,n,covered,ground}=node,d=distance(p,souris),hot=!covered&&d<14;
        segment(e.centre,node.world,hot?'255,255,255':color,(hot?.9:title?.39:.45)*opacity);
        if(covered)continue;
        ctx.globalAlpha=opacity;
        if(ground&&hubShadow&&!masque(ground)&&!masque(hubShadow)){
          ctx.lineWidth=1.1;ctx.strokeStyle='rgba(0,4,37,'+(.22*rise)+')';trait(ctx,hubShadow,ground);
          if(n.ed){ctx.fillStyle='rgba(0,4,37,'+(.19*rise)+')';ctx.fillRect(ground.x-3,ground.y-2,6,4);}
        }
        ctx.lineWidth=1;
        if(t!==null&&!masque(hub)&&(n.ed||n.phases[0]%3===0))impulsions(ctx,hub,p,n.phases,t,color);
        if(n.ed){
          const image=this.image(n.ed.image),side=(image?(title?32:16):(title?14:8))*(hot?1.5:1);
          ctx.fillStyle=image?'#050b26':hot?'#fff':title?'#b6c6e4':'#161c36';
          ctx.fillRect(p.x-side/2,p.y-side/2,side,side);
          if(image)ctx.drawImage(image,p.x-side/2+1,p.y-side/2+1,side-2,side-2);
          ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=1;ctx.strokeRect(p.x-side/2,p.y-side/2,side,side);
          if(p.x>=0&&p.y>=0&&p.x<=W&&p.y<=H){
            const target={x:p.x,y:p.y,noeud:n,etoile:e};this.cibles.push(target);
            if(d<nearest){this.survol=target;nearest=d;}
          }
        }else{
          ctx.fillStyle='rgba('+color+',.69)';ctx.beginPath();ctx.arc(p.x,p.y,n.at[2]>.35?2:1.25,0,cercle);ctx.fill();
        }
      }
      if(masque(hub))continue;
      ctx.globalAlpha=opacity;
      const diam=title?14:8;
      ctx.fillStyle=title?'#e9efff':'#a1badc';ctx.fillRect(hub.x-diam/2,hub.y-diam/2,diam,diam);
      if(title){
        ctx.font='300 11px "Sohne Mono","JetBrains Mono",monospace';ctx.textAlign='right';ctx.fillStyle='#fff';
        const lx=hub.x-diam-8,ly=hub.y+4;
        const cx=lx-ctx.measureText(e.label).width/2;
        if(!masque({x:lx,y:ly,z:hub.z})&&!masque({x:cx,y:ly,z:hub.z})){
          ctx.fillText(e.label,lx,ly);e.libelleEcran={x:Math.round(lx),y:Math.round(ly),texte:e.label};
        }
      }
    }
    if(this.survol){
      const {x,y,noeud}=this.survol,isRight=x>W/2;
      ctx.globalAlpha=1;ctx.font='300 11px "Sohne Mono","JetBrains Mono",monospace';ctx.textAlign=isRight?'right':'left';
      ctx.fillStyle='#fff';ctx.fillText(noeud.ed.title,x+(isRight?-18:18),y+4);
    }
    ctx.restore();
  }
}
