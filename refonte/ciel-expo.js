import { Ciel, hache } from './moteur.js?v=m36';

const angleOr = 2.399963, cercle = Math.PI * 2;
const tons = ['25,122,220', '85,238,172', '105,131,251'];
const tonsVolume = tons.map(ton=>ton.split(',').map(v=>Math.round(.65*Number(v)+.35*255)).join(','));
const densiteAccueil = [16,12,17,9,20,30,23,10,9,19,57];
const placesAccueil = [[.02,-.47],[.23,.80],[-.41,-.68],[.34,.34],[-.74,-.31],[.8,.15],[-.46,.08],[.45,-.2],[-.65,.52],[.45,-.69],[-.15,.47]];
// Centres mesurés dans le panneau 978 × 830 à 1 440 × 900. L'ordre est celui des onze chapitres.
const foyersAccueilPlat = [
  [473, 73], [600, 580], [153, 275], [918, 412], [165, 605], [598, 233],
  [523, 768], [372, 247], [815, 591], [278, 435], [702, 404],
].map(([x, y]) => [(x / 978 - .5) / .51, (y / 830 - .5) / .48]);

const lumiere = [-Math.sin(-41*Math.PI/180)/Math.tan(35*Math.PI/180),-Math.cos(-41*Math.PI/180)/Math.tan(35*Math.PI/180)];
const mix = (a,b,t) => a+(b-a)*t, phase = v => v-Math.floor(v);
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function pasVolume(osc,dt){
  // Amortissement et ressort de rappel des constellations Expo.
  for(let left=Math.min(.1,dt);left>1e-4;left-=1/120){
    const step=Math.min(1/120,left),decay=Math.exp(-6.5*step);
    for(let axis=0;axis<3;axis++){
      osc.v[axis]=(osc.v[axis]-14*osc.at[axis]*step)*decay;
      osc.at[axis]+=osc.v[axis]*step;
    }
  }
}
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
    const t=i*cercle/64,p=proj(x+Math.cos(t)*r*1.2,y+Math.sin(t)*r,0);
    if(!p){open=false;continue;}
    if(open)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);
    open=true;
  }
  ctx.stroke();
}

export class CielExpo extends Ciel {
  accueil(chapitres, label) {
    this.definit('accueil',{groupe:'accueil',racine:true,label});
    chapitres.forEach((c,i)=>this.definit('accueil:'+c.id,{
      groupe:'accueil',parent:'accueil',num:String(i+1).padStart(2,'0'),label:c.name,chapitre:c.id,
      editoriaux:c.cards,densite:densiteAccueil[i],sol:true
    }));
  }

  definit(id,spec){
    const cards=spec.editoriaux||[], total=Math.max(cards.length,spec.densite||0);
    const editoriaux=new Map(cards.map((card,i)=>[Math.floor(i*total/cards.length),card]));
    const noeuds=Array.from({length:total},(_,i)=>{
      const key=id+':'+i, z=1-2*(i+.5)/total, radius=.46+.54*hache(key)/2**32;
      const a=i*angleOr+hache(key+':angle')/2**32, r=Math.sqrt(1-z*z)*radius;
      return {ed:editoriaux.get(i), at:[Math.cos(a)*r,Math.sin(a)*r,z*radius*.7], hemisphere:i%2?1:-1,
        phase:hache(key+':orbit')/2**32*cercle, fx:0, fy:0,
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
  place(id,centre,rayon,{largeur=rayon,hauteur=rayon,etalement=1,croissance=1,profilPlat=false}={}){
    super.place(id,centre,rayon);
    if(id!=='accueil')return;
    for(const e of this.etoiles.values()){
      if(e.parent!==id)continue;
      if(!centre){e.centre=null;continue;}
      const position=(profilPlat ? foyersAccueilPlat : placesAccueil)[e.rang] || [0,0];
      e.centre=[centre[0]+position[0]*largeur*etalement,centre[1]+position[1]*hauteur*etalement,centre[2]*.57];
      const rayon = (.29 + .10 * Math.sqrt(e.noeuds.length / 57)) * (profilPlat ? 1.45 : 1);
      e.rayon = Math.min(largeur, hauteur) * rayon * Math.max(.001, croissance);
    }
  }
  vide(){super.vide();this.pris=null;}

  dessine(ctx,proj,t,{covers=[],souris,W,H,dt,alpha=1,titres=1,rise=0,unproject,segment,traitPlat,pointPlat,plat=false,ouverture=1,tailleFoyer=1}){
    const masque=p=>covers.some(([a,b,c,d])=>
      Math.min(profondeurTriangle(p,a,b,c),profondeurTriangle(p,a,c,d))<p.z-2
    );
    this.cibles=[];this.survol=null;
    const prev=this.pointerExpo;
    this.pointerExpo=plat||t===null||souris.x<0?null:{x:souris.x,y:souris.y};
    const mouvement=prev&&this.pointerExpo?distance(prev,this.pointerExpo):0;
    let nearest=18;
    ctx.save();
    const foyers=[...this.etoiles.values()].filter(e=>e.parent&&e.centre);
    for(const [i,e] of foyers.entries()){
      const voisins=foyers.filter((n,j)=>j<i&&n.centre).map(n=>({n,d:Math.hypot(n.centre[0]-e.centre[0],n.centre[1]-e.centre[1])})).sort((a,b)=>a.d-b.d).slice(0,2);
      for(const {n} of voisins){
        if(segment)segment(e.centre,n.centre,'123,147,243',.125*alpha*ouverture);
        else{
          const a=proj(...e.centre),b=proj(...n.centre);
          if(!a||!b)continue;
          if(traitPlat){traitPlat(a,b,'128,147,245',.2*ouverture,.55);continue;}
          ctx.strokeStyle='rgba(128,147,245,'+(.2*ouverture)+')';
          ctx.lineWidth=.55;
          trait(ctx,a,b);
        }
      }
    }
    for(const e of this.etoiles.values()){
      e.ecran=e.libelleEcran=null;
      const title=e.groupe==='titre';
      const fondu=this.fondu;
      const relais=fondu&&e.chapitre===fondu.de?1-fondu.poids:fondu&&e.chapitre===fondu.vers?fondu.poids:1;
      const opacity=(title?titres*(.26+.74*relais):alpha)*ouverture;
      if(!e.centre||opacity<=.003)continue;
      const [x,y,h]=e.centre,r=e.rayon,hub=proj(x,y,h);
      if(!hub||hub.x<-W/2||hub.x>1.5*W||hub.y<-H/2||hub.y>1.5*H)continue;
      e.ecran=hub;
      const palette=plat?tons:tonsVolume;
      const color=title?'255,255,255':palette[Math.max(0,e.rang)%palette.length];
      ctx.globalAlpha=opacity;
      const parent=e.parent&&this.etoiles.get(e.parent);
      const trace=(a,b,ink,opacity)=>{
        if(segment)segment(a,b,ink,opacity);
        else{
          const p=proj(...a),q=proj(...b);
          if(!p||!q)return;
          if(traitPlat){traitPlat(p,q,ink,opacity,.75);return;}
          const g=ctx.createLinearGradient(p.x,p.y,q.x,q.y);
          g.addColorStop(0,'rgba('+ink+','+opacity+')');g.addColorStop(1,'rgba(118,137,254,'+opacity*.48+')');
          ctx.strokeStyle=g;ctx.lineWidth=.75;trait(ctx,p,q);
        }
      };
      if(parent?.ecran)trace(parent.centre,e.centre,color,(plat?.46:.26)*opacity);
      if(e.sol&&!plat){
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
      const orbit=title?0:(t??0)*.02*(e.rang%2?-1:1);
      const co=Math.cos(orbit),si=Math.sin(orbit);
      const nodes=e.noeuds.map(n=>{
        const [nx,ny,nz]=n.at;
        let wx=x+r*(co*nx-si*ny),wy=y+r*(si*nx+co*ny);
        let hauteur=Math.max(12,h+(title?r*nz:n.hemisphere*.85*h*Math.sqrt(Math.max(0,1-nx*nx-ny*ny))));
        let p=proj(wx,wy,hauteur);
        if(!p)return null;
        if(!plat&&t!==null&&unproject){
          const hit=distance(p,souris);
          if(mouvement>0&&hit<90&&masque(p)===false&&this.pris?.noeud!==n){
            const [x0,y0]=unproject(souris.x,souris.y,hauteur,[wx,wy])||[wx,wy];
            let dx=wx-x0,dy=wy-y0,length=Math.hypot(dx,dy);
            if(length<2){dx=souris.x-prev.x;dy=souris.y-prev.y;length=mouvement;}
            const impulse=Math.min(360,14*mouvement*(1-hit/90)**2);
            n.volume??={at:[0,0,0],v:[0,0,0]};
            n.volume.v[0]+=dx/length*impulse;n.volume.v[1]+=dy/length*impulse;n.volume.v[2]+=.7*impulse;
          }
          if(n.volume){
            pasVolume(n.volume,dt);
            wx+=n.volume.at[0];wy+=n.volume.at[1];hauteur=Math.max(12,hauteur+n.volume.at[2]);
            p=proj(wx,wy,hauteur);if(!p)return null;
          }
        }else if(t===null)n.volume=null;
        const sx=p.x-souris.x,sy=p.y-souris.y,d=Math.hypot(sx,sy);
        const push=!plat||t===null||d<18||d>90?0:14*(1-d/90)**2;
        n.fx+=((d?push*sx/d:0)-n.fx)*(1-Math.exp(-15*dt));
        n.fy+=((d?push*sy/d:0)-n.fy)*(1-Math.exp(-15*dt));
        p.x+=n.fx;p.y+=n.fy;
        if(this.pris?.noeud===n){n.dx=souris.x-p.x;n.dy=souris.y-p.y;n.vx=n.vy=0;}
        else if(t===null){n.dx=n.dy=n.vx=n.vy=0;}
        else if(n.dx||n.dy||n.vx||n.vy)for(let rest=Math.min(.1,dt);rest>1e-4;rest-=1/120){
          const step=Math.min(1/120,rest);
          n.vx+=(-150*n.dx-8.5*n.vx)*step;n.vy+=(-150*n.dy-8.5*n.vy)*step;
          n.dx+=n.vx*step;n.dy+=n.vy*step;
          if(Math.abs(n.dx)+Math.abs(n.dy)+Math.abs(n.vx)+Math.abs(n.vy)<.03){n.dx=n.dy=n.vx=n.vy=0;break;}
        }
        p.x+=n.dx;p.y+=n.dy;
        if(n.dx||n.dy||n.fx||n.fy){
          const position=unproject?.(p.x,p.y,hauteur,[wx,wy]) || (plat?[p.x,p.y]:null);
          if(position)[wx,wy]=position;
        }
        const world=[wx,wy,hauteur];
        return {p,n,covered:masque(p),world,ground:ombre(world)};
      });
      for(const [a,b] of e.liens)if(nodes[a]&&nodes[b])trace(nodes[a].world,nodes[b].world,color,.09*opacity);
      for(const node of nodes){
        if(!node)continue;
        const {p,n,covered,ground}=node,d=distance(p,souris),hot=!covered&&d<14;
        const dx=p.x-hub.x,dy=p.y-hub.y,dist2=dx*dx+dy*dy;
        const u=dist2?Math.min(1,Math.max(0,((souris.x-hub.x)*dx+(souris.y-hub.y)*dy)/dist2)):0;
        const x=hub.x+dx*u,y=hub.y+dy*u,gap=Math.hypot(souris.x-x,souris.y-y);
        const onBranch=t!==null&&!covered&&gap<12&&u>.16&&u<.93;
        const strength=(onBranch||hot?.9:title?.39:plat?.68:.43)*opacity;
        if(onBranch&&!plat&&unproject){
          const mid=e.centre.map((v,i)=>v+(node.world[i]-v)*u);
          const scale=(1-gap/12)*9/Math.max(1,gap);
          const bend=unproject(x+(x-souris.x)*scale,y+(y-souris.y)*scale,mid[2],mid);
          if(bend){const knot=[bend[0],bend[1],mid[2]];trace(e.centre,knot,color,strength);trace(knot,node.world,color,strength);}
          else trace(e.centre,node.world,color,strength);
        }else trace(e.centre,node.world,hot?'255,255,255':color,strength);
        if(covered)continue;
        ctx.globalAlpha=opacity;
        if(!plat&&ground&&hubShadow&&!masque(ground)&&!masque(hubShadow)){
          ctx.lineWidth=1.1;ctx.strokeStyle='rgba(0,4,37,'+(.22*rise)+')';trait(ctx,hubShadow,ground);
          if(n.ed){ctx.fillStyle='rgba(0,4,37,'+(.19*rise)+')';ctx.fillRect(ground.x-3,ground.y-2,6,4);}
        }
        ctx.lineWidth=1;
        if(t!==null&&!masque(hub)&&(n.ed||n.phases[0]%3===0))impulsions(ctx,hub,p,n.phases,t,color);
        if(n.ed){
          const image=this.image(n.ed.image),side=(image?(title?32:16):(title?7:4))*(hot?1.5:1);
          ctx.fillStyle=image?'#050b26':hot?'#fff':title?'#b6c6e4':'#161c36';
          ctx.fillRect(p.x-side/2,p.y-side/2,side,side);
          if(image)ctx.drawImage(image,p.x-side/2+1,p.y-side/2+1,side-2,side-2);
          if(image){ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1;ctx.strokeRect(p.x-side/2,p.y-side/2,side,side);}
          if(p.x>=0&&p.y>=0&&p.x<=W&&p.y<=H){
            const target={x:p.x,y:p.y,noeud:n,etoile:e};this.cibles.push(target);
            if(d<nearest){this.survol=target;nearest=d;}
          }
        }else{
          const rayon=n.at[2]>.35?2:1.25;
          if(pointPlat)pointPlat(p,color,.69*opacity,rayon);
          else{ctx.fillStyle='rgba('+color+',.69)';ctx.beginPath();ctx.arc(p.x,p.y,rayon,0,cercle);ctx.fill();}
        }
      }
      if(masque(hub))continue;
      ctx.globalAlpha=opacity;
      const diam=title?14:8*tailleFoyer;
      ctx.fillStyle=title?'#e9efff':plat?'#7385ff':'#a1badc';
      if(e.racine){ctx.strokeStyle='#7281ff';ctx.beginPath();ctx.arc(hub.x,hub.y,4,0,cercle);ctx.stroke();}
      else if(pointPlat)pointPlat(hub,'115,133,255',opacity,diam/2,1);
      else ctx.fillRect(hub.x-diam/2,hub.y-diam/2,diam,diam);
      if(plat&&e.sol){
        ctx.font=(W<520?'8':'11')+'px "Sohne Mono",monospace';
        const gros=ctx.font,effectif=String(e.editoriaux?.length ?? e.noeuds.length);
        ctx.font=(W<520?'6':'8')+'px "Sohne Mono",monospace';const largeurEffectif=ctx.measureText(effectif).width;ctx.font=gros;
        const largeurLibelle=ctx.measureText(e.label).width;
        const left = hub.x > W * .73 || hub.x + 13 + largeurLibelle + largeurEffectif > W;
        ctx.textAlign=left?'right':'left';ctx.fillStyle='#fff';
        /* l'effectif du foyer suit le libellé en exposant, comme sur la référence */
        const lx=left?hub.x-9-largeurEffectif-2:hub.x+9,ly=hub.y-9;
        ctx.fillText(e.label,lx,ly);
        ctx.font=(W<520?'6':'8')+'px "Sohne Mono",monospace';ctx.fillStyle='rgba(255,255,255,.62)';ctx.textAlign='left';
        ctx.fillText(effectif,left?hub.x-9-largeurEffectif:lx+largeurLibelle+2,ly-5);ctx.font=gros;
      }
      if(title){
        ctx.font='300 11px "Sohne Mono","JetBrains Mono",monospace';ctx.textAlign='right';ctx.fillStyle='#fff';
        const lx=hub.x-diam-8,ly=hub.y+4;
        const cx=lx-ctx.measureText(e.label).width/2;
        if(!masque({x:lx,y:ly,z:hub.z})&&!masque({x:cx,y:ly,z:hub.z})){
          ctx.fillText(e.label,lx,ly);e.libelleEcran={x:Math.round(lx),y:Math.round(ly),texte:e.label};
        }
      }
    }
    if(this.survol&&!plat){
      const {x,y,noeud}=this.survol,isRight=x>W/2;
      ctx.globalAlpha=1;ctx.font='300 11px "Sohne Mono","JetBrains Mono",monospace';ctx.textAlign=isRight?'right':'left';
      ctx.fillStyle='#fff';ctx.fillText(noeud.ed.title,x+(isRight?-18:18),y+4);
    }
    ctx.restore();
  }
}
