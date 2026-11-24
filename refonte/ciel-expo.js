import { Ciel, hache } from './moteur.js?v=m36';

const angleOr = 2.399963, cercle = Math.PI * 2;
const tons = ['25,122,220', '85,238,172', '105,131,251'];
const tonsVolume = tons.map(ton=>ton.split(',').map(v=>Math.round(.65*Number(v)+.35*255)).join(','));
const densiteAccueil = [16,12,17,9,20,30,23,10,9,19,57];
const placesAccueil = [[.02,-.47],[.23,.80],[-.41,-.68],[.34,.34],[-.74,-.31],[.8,.15],[-.46,.08],[.45,-.2],[-.65,.52],[.45,-.69],[-.15,.47]];
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


const hacheTexte=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return h>>>0;};
/* poussée d'un foyer par la vitesse du pointeur (référence : portée 265, intérieur 24, seuil 24 px/s, vitesse max 1 800, élan 1,45, bouclier 1),
   ressort de rappel ; en coordonnées monde (à plat, l'écran) */
function pousseFoyer(e,Fb,m,pv,vit,dt,pace,q){
  if(!Fb)return;e.dx=e.dx||0;e.dy=e.dy||0;e.vx=e.vx||0;e.vy=e.vy||0;
  /* foyer saisi : il suit le pointeur, vitesse lissée 0,6 / 0,4 (référence) */
  if(q&&q.e===e){if(q.mx!==undefined&&dt>0){const nx=q.mx-Fb.x,ny=q.my-Fb.y,ddx=nx-e.dx,ddy=ny-e.dy;if(ddx||ddy){e.vx=e.vx*.6+ddx/dt*.4;e.vy=e.vy*.6+ddy/dt*.4;q.tm=performance.now();}e.dx=nx;e.dy=ny;}return;}
  e.recup=(e.recup||0)*Math.exp(-1.5*dt);const amort=6+14*e.recup;
  const n=Math.max(1,Math.ceil(dt/(1/60))),h=Math.min(dt,.25)/n;
  for(let i=0;i<n;i++){let ax=-e.dx*16,ay=-e.dy*16;
    if(m&&vit>24){const px=Fb.x+e.dx,py=Fb.y+e.dy,T=px-m.x,P=py-m.y,d=Math.hypot(T,P),A=265,C=24;
      if(d>C&&d<A){const y=Math.min(vit,1800),L=1-(d-C)/(A-C),Hh=(T*pv.x+P*pv.y)/(d*vit),J=1-Math.max(0,Hh),f=L*L*2*J*pace*1.5;
        ax+=(T/d*y+pv.x/vit*y*1.45)*f;ay+=(P/d*y+pv.y/vit*y*1.45)*f;}}
    e.vx=(e.vx+ax*h)*Math.exp(-h*amort);e.vy=(e.vy+ay*h)*Math.exp(-h*amort);e.dx+=e.vx*h;e.dy+=e.vy*h;}
  const r=Math.hypot(e.dx,e.dy),lim=e.recup>.01?1e4:160;if(r>lim){e.dx*=lim/r;e.dy*=lim/r;}
  if(Math.abs(e.dx)+Math.abs(e.dy)+Math.abs(e.vx)+Math.abs(e.vy)<.05)e.dx=e.dy=e.vx=e.vy=0;
}
export class CielExpo extends Ciel {
  /* saisie et lancer d'un foyer (référence) : au lâcher, vitesse × 1,25 × exp(−max(0, arrêt − 80 ms) / 60 ms), plafonnée à 1 400 px/s ;
     un clic (moins de 5 px parcourus) reste un clic */
  saisitFoyer(x,y){let m=null,dm=12;for(const e of this.etoiles.values()){if(!e.parent||!e.ecran)continue;const d=Math.hypot(e.ecran.x-x,e.ecran.y-y);if(d<dm){dm=d;m=e;}}
    if(!m)return false;this.prisF={e:m,ox:m.ecran.x-x,oy:m.ecran.y-y,x0:x,y0:y,trajet:0,t:performance.now()};m.vx=m.vy=0;return true;}
  tireFoyer(x,y){const q=this.prisF;if(!q)return;q.trajet=Math.max(q.trajet,Math.hypot(x-q.x0,y-q.y0));q.mx=x+q.ox;q.my=y+q.oy;}
  lacheFoyer(annule=false){const q=this.prisF;if(!q)return null;this.prisF=null;const e=q.e,k=annule?0:1.25*Math.exp(-Math.max(0,performance.now()-(q.tm||q.t)-80)/60);
    e.vx=(e.vx||0)*k;e.vy=(e.vy||0)*k;const v=Math.hypot(e.vx,e.vy),lim=1400;if(v>lim){e.vx*=lim/v;e.vy*=lim/v;}e.recup=1;return{clic:q.trajet<5,chapitre:e.chapitre};}
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
  place(id,centre,rayon,{largeur=rayon,hauteur=rayon,etalement=1}={}){
    super.place(id,centre,rayon);
    if(id!=='accueil')return;
    for(const e of this.etoiles.values()){
      if(e.parent!==id)continue;
      if(!centre){e.centre=null;continue;}
      const position=placesAccueil[e.rang] || [0,0];
      e.centre=[centre[0]+position[0]*largeur*etalement,centre[1]+position[1]*hauteur*etalement,centre[2]*.57];
      e.rayon=Math.min(largeur,hauteur)*(.29+.10*Math.sqrt(e.noeuds.length/57));
    }
  }
  vide(){super.vide();this.pris=null;}

  dessine(ctx,proj,t,{covers=[],souris,W,H,dt,alpha=1,titres=1,rise=0,unproject,segment,traitPlat,pointPlat,plat=false,ouverture=1}){
    const masque=p=>covers.some(([a,b,c,d])=>
      Math.min(profondeurTriangle(p,a,b,c),profondeurTriangle(p,a,c,d))<p.z-2
    );
    this.survol0=this.survol;this.cibles=[];this.survol=null;
    const prev=this.pointerExpo;
    this.pointerExpo=plat||t===null||souris.x<0?null:{x:souris.x,y:souris.y};
    const mouvement=prev&&this.pointerExpo?distance(prev,this.pointerExpo):0;
    let nearest=18;
    /* lois du graphe de la référence, à plat (relevées dans son module renderer) : poussée des foyers par la vitesse du pointeur,
       resserrement échelonné des rayons du foyer survolé, calme quand un contenu est survolé, lueur des points proches */
    const libre=plat&&t!==null,actifP=libre&&souris.x>-1e3&&!this.pris,unite=Math.max(.4,Math.min(3,Math.min(W,H)/741));
    const pv=this.pv||(this.pv={x:0,y:0,px:souris.x,py:souris.y,ok:false});
    if(actifP&&pv.ok&&dt>0){const ex=(souris.x-pv.px)/dt,ey=(souris.y-pv.py)/dt;if(ex||ey){pv.x=ex;pv.y=ey;}else{pv.x*=Math.exp(-dt/.04);pv.y*=Math.exp(-dt/.04);}}else if(!actifP){pv.x=pv.y=0;}
    pv.px=souris.x;pv.py=souris.y;pv.ok=actifP;const vit=Math.hypot(pv.x,pv.y);
    let fs=this.prisF?this.prisF.e:null;if(actifP&&!fs){let dm=16;for(const e of this.etoiles.values()){if(!e.parent||!e.ecran)continue;const d=distance(e.ecran,souris);if(d<dm){dm=d;fs=e;}}}
    const cibleCalme=libre&&!fs&&this.survol0?1:0;this.calme=libre?(this.calme||0)+(cibleCalme-(this.calme||0))*(1-Math.exp(-10*dt)):0;
    const allure=1-.8*this.calme;this.foyerSurvol=fs;
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
      if(libre&&e.parent)pousseFoyer(e,proj(...e.centre),actifP&&!fs?souris:null,pv,vit,dt,allure,this.prisF);else if(!libre){e.dx=e.dy=e.vx=e.vy=0;}
      const [x0,y0,h]=e.centre,x=x0+(e.dx||0),y=y0+(e.dy||0),r=e.rayon,hub=proj(x,y,h);
      e.tSurvol=e===fs?(e.tSurvol||0)+dt:0;if(libre&&!e.racine)e.ob=(e.ob||0)+.02*allure*(e.rang%2?-1:1)*dt;
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
      const orbit=title?0:libre?(e.ob||0):(t??0)*.02*(e.rang%2?-1:1);
      const co=Math.cos(orbit),si=Math.sin(orbit);
      const nodes=e.noeuds.map(n=>{
        const [nx,ny,nz]=n.at;
        let rn=r;if(libre&&!title){const an=Math.atan2(si*nx+co*ny,co*nx-si*ny),dl=(((an+Math.PI/2)/(2*Math.PI))%1+1)%1*.15,on=e===fs&&e.tSurvol>=dl;
          n.hg=(n.hg||0)+((on?1:0)-(n.hg||0))*(1-Math.exp(-(on?15:3)*dt));if(!on&&n.hg<1e-4)n.hg=0;rn=r*(1-.25*n.hg);}
        let wx=x+rn*(co*nx-si*ny),wy=y+rn*(si*nx+co*ny);
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
        if(libre){const rg=265*unite,dd=actifP?Math.hypot(p.x-souris.x,p.y-souris.y):rg,o=dd<rg?1-dd/rg:0,cib=o*o*(3-2*o),cur=n.lu||0,tt=t;
          n.gs??=(hacheTexte(e.id+':'+n.at.join(','))%1000)/1000*.35;
          if(cib>=cur){if(cib>0)n.tlu=tt;n.lu=cur+(cib-cur)*(1-Math.exp(-24*dt));}else if(tt-(n.tlu||0)>=n.gs)n.lu=cur+(cib-cur)*(1-Math.exp(-3*dt/.6));
          if(Math.abs(n.lu-cib)<.002)n.lu=cib;}
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
          if(n.lu>.02){ctx.save();ctx.globalAlpha=opacity*n.lu;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,rayon,0,cercle);ctx.fill();ctx.restore();}   // lueur : mêlé de blanc
        }
      }
      if(masque(hub))continue;
      ctx.globalAlpha=opacity;
      const diam=title?14:8;
      ctx.fillStyle=title?'#e9efff':plat?'#7385ff':'#a1badc';
      if(e.racine){ctx.strokeStyle='#7281ff';ctx.beginPath();ctx.arc(hub.x,hub.y,4,0,cercle);ctx.stroke();}
      else if(pointPlat)pointPlat(hub,'115,133,255',opacity,diam/2,1);
      else ctx.fillRect(hub.x-diam/2,hub.y-diam/2,diam,diam);
      if(plat&&e.sol){
        const left=hub.x>W*.73;
        ctx.font=(W<520?'8':'11')+'px "Sohne Mono",monospace';
        ctx.textAlign=left?'right':'left';ctx.fillStyle='#fff';
        ctx.fillText(e.label,hub.x+(left?-9:9),hub.y-9);
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
