/* Chapelet sableux : relief, carte de collision et textures de hauteur partagent
 * le même champ. L'île de construction et le phare restent indépendants. */
import * as THREE from './three.module.js';
import { ajusterPieds } from './atlas-batiments.js';
import { creerSableSource } from './atlas-sable-matiere.js?v=20261019-nacre-tranche';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const distanceSegment=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l2));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};

export function transformerTerres(M){
 if(M.terres)return M.terres;
 const {carte,scene,bats}=M,legacyH=carte.H.slice(),groupe=new THREE.Group();groupe.name='Chapelet de sable';scene.add(groupe);
 function ancien(x,z){const u=(x-carte.x0)/carte.res,v=(z-carte.z0)/carte.res,i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j;if(i<0||j<0||i>=carte.nx-1||j>=carte.nz-1)return M.archipel?.hauteur(x,z)??-50;return (legacyH[i*carte.nz+j]*(1-fu)+legacyH[(i+1)*carte.nz+j]*fu)*(1-fv)+(legacyH[i*carte.nz+j+1]*(1-fu)+legacyH[(i+1)*carte.nz+j+1]*fu)*fv;}
 const iles=[
  {id:'dojo',c:[-7.42,-5.88],r:[4.25,3.15],h:1.08,phase:.4},
  {id:'universites',c:[-10.05,2.30],r:[4.25,6.80],h:.58,phase:1.5},
  {id:'studio',c:[-1.82,-2.45],r:[3.65,3.30],h:.53,phase:2.8},
  {id:'belvedere',c:[5.04,-6.72],r:[4.5,3.85],h:.81,phase:3.9},
  {id:'gare',c:[10.40,3.50],r:[4.95,7.75],h:.43,phase:5.1},
  {id:'arene',c:[.70,5.25],r:[3.10,3.05],h:.55,phase:6.3},
 ];
 const facteurs={avignon:1.40,usp:1.40,lean:1.45,studio:1.45,bi:1.45,sncf:1.45,reseau:1.45,perso:1.45};
 // Empreintes futures : une ceinture de plage continue sous chaque fondation.
 const pads=Object.entries(bats).map(([id,b])=>{
  const s=facteurs[id],box=b.box;
  return {id,x0:b.x+(box.min.x-b.x)*s-.22,x1:b.x+(box.max.x-b.x)*s+.22,z0:b.z+(box.min.z-b.z)*s-.22,z1:b.z+(box.max.z-b.z)*s+.22,h:id==='lean'?.84:id==='bi'?.68:.43};
 });
 function hauteurPrincipale(x,z){
  if(x < -19 || x > 19 || z < -13 || z > 15.8)return -50;
  let h=-4.4,q0=99,q1=99;
  for(const ile of iles){
   const dx=(x-ile.c[0])/ile.r[0],dz=(z-ile.c[1])/ile.r[1],a=Math.atan2(dz,dx),r=Math.hypot(dx,dz)/(1+.065*Math.sin(a*3+ile.phase)+.035*Math.sin(a*5-ile.phase));
   if(r<q0){q1=q0;q0=r;}else if(r<q1)q1=r;
   const v=ile.h*(1-smooth(.30,.93,r))-3.55*smooth(.81,1.48,r);h=Math.max(h,v);
  }
  // Entre les lobes voisins, ouvrir de vrais bras d'eau sans paroi verticale.
  if(q0>.57&&q1<1.20){const canal=(1-smooth(.025,.13,q1-q0))*smooth(.57,.80,q0);h=Math.min(h,h*(1-canal)-.78*canal);}
  for(const pad of pads){
   const dx=Math.max(pad.x0-x,0,x-pad.x1),dz=Math.max(pad.z0-z,0,z-pad.z1),d=Math.hypot(dx,dz);
   if(d<1.10)h=Math.max(h,pad.h-(pad.h+1.10)*smooth(0,1.10,d));
  }
  // Le chenal des trois bateaux garde une profondeur suffisante jusqu'au large.
  const d=distanceSegment(x,z,[4.48,7.7],[4.48,18]);
  if(z>7.2&&d<1.30)h=Math.min(h,-.75-.55*(1-smooth(.2,1.3,d)));
  return h;
 }
 const hauteur=(x,z)=>Math.max(hauteurPrincipale(x,z),M.archipel?.hauteur(x,z)??-50);
 const originalPositions=[];
 M.sourceSandcastle?.group.traverse(o=>{if(o.isMesh)originalPositions.push([o,o.position.y-ancien(o.position.x,o.position.z)]);});

 // Mise à jour en place : les uniformes déjà partagés conservent leurs textures.
 const hh=carte.texH.image.data;
 for(let i=0;i<carte.nx;i++)for(let j=0;j<carte.nz;j++){
  const k=i*carte.nz+j,h=hauteurPrincipale(carte.x0+i*carte.res,carte.z0+j*carte.res);
  carte.H[k]=h;hh[k]=hh instanceof Uint16Array?THREE.DataUtils.toHalfFloat(h):h;carte.eauU8[k]=h<-.025?255:0;
 }
 carte.texH.needsUpdate=carte.texEau.needsUpdate=true;carte.hauteur=hauteur;
 carte.eau=(x,z)=>hauteur(x,z)<-.025;carte.surIle=(x,z)=>hauteur(x,z)>-.3;
 carte.distEau=(x,z)=>Math.max(0,hauteur(x,z))*3.3;

 // Une nappe régulière et douce remplace intégralement l'ancienne croûte rocheuse.
 M.ile.mesh.visible=false;
 const N=192,geo=new THREE.PlaneGeometry(38,28.8,N,N).rotateX(-Math.PI/2),P=geo.attributes.position;
 for(let i=0;i<P.count;i++){const x=P.getX(i),z=P.getZ(i)+1.4;P.setXYZ(i,x,Math.max(-4.4,hauteurPrincipale(x,z)),z);}
 geo.computeVertexNormals();geo.computeBoundingSphere();
 const texture=carte.sandcastle?.textures.Sand,mat=creerSableSource(carte);
 M.archipel.mesh.material=mat;M.ilot.groupe.traverse(o=>{if(o.isMesh&&o.geometry.type==='LatheGeometry')o.material=mat;});
 const mesh=new THREE.Mesh(geo,mat);mesh.name='Six îles de sable';mesh.castShadow=mesh.receiveShadow=true;groupe.add(mesh);

 // Conserver l'architecture et les groupes déjà ciblés par les fiches du parcours.
 const mesures={};
 for(const [id,b] of Object.entries(bats)){
  const s=facteurs[id],oldMatrix=b.groupe.matrixWorld.clone(),newModel=M.B.creer(b.etape.glb);
  b.groupe.clear();for(const o of [...newModel.groupe.children])b.groupe.add(o);
  b.ancres=newModel.ancres;b.groupe.userData.ancres=newModel.ancres;b.groupe.scale.multiplyScalar(s);
  const before=b.groupe.position.y;let y=hauteur(b.x,b.z);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;y=Math.max(y,hauteur(b.x+Math.cos(a)*b.rayon*.48*s,b.z+Math.sin(a)*b.rayon*.48*s));}
  b.groupe.position.y=y-.02;b.groupe.traverse(o=>{if(o.isMesh)o.userData.batiment=b.groupe;});
  b.groupe.updateMatrixWorld(true);ajusterPieds(b.groupe,carte,[b.x,b.z]);b.box.setFromObject(b.groupe);b.haut=b.box.max.y;b.rayon*=s;M.meta.batiments[id].r=b.rayon;
  if(id==='bi'&&M.route?.courbe){const inv=oldMatrix.invert();for(const p of M.route.courbe.points)p.applyMatrix4(inv).applyMatrix4(b.groupe.matrixWorld);M.route.courbe.updateArcLengths();M.route.longueur=M.route.courbe.getLength();}
  mesures[id]={facteur:s,largeur:b.box.max.x-b.box.min.x,hauteur:b.box.max.y-b.box.min.y,base:b.groupe.position.y,ancienneBase:before};
 }
 for(const nom of ['bateau','voilier','yacht'])M.objets[nom].scale.multiplyScalar(1.55);

 // Reposer la boucle ferroviaire sur le relief plutôt que conserver une voie en l'air.
 if(M.voie){
  for(const p of M.voie.courbe.points)p.y=hauteur(p.x,p.z)+.045;M.voie.courbe.updateArcLengths();M.voie.longueur=M.voie.courbe.getLength();
  const matrix=new THREE.Matrix4(),pos=V();
  M.voie.groupe.traverse(o=>{if(!o.isMesh)return;
   if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);matrix.elements[13]+=hauteur(pos.x,pos.z)-ancien(pos.x,pos.z);o.setMatrixAt(i,matrix);}o.instanceMatrix.needsUpdate=true;return;}
   o.geometry=o.geometry.clone();const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,p.getY(i)+hauteur(x,z)-ancien(x,z));}p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();
  });
 }

 // Le réseau suit les îles et franchit seulement leurs bras d'eau par des passerelles.
 M.liaisons.groupe.visible=false;
 const liaisons=creerReseau(M,groupe);M.liaisons=liaisons;carte.distChemin=liaisons.distChemin;

 // Les plantes source avaient été semées sur l'ancien terrain : les recaler et
 // déplacer celles qu'un nouveau chenal ou une façade aurait recouvertes.
 let seed=10717,reposes=0,deplaces=0;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(const [o,offset] of originalPositions){
  if(o.userData.phase===undefined)continue;const marine=!!o.userData.marine;
  const valide=(x,z)=>{const h=hauteur(x,z);return (marine?h<-.22&&h>-2.5:h>.11&&h<1.5)&&liaisons.distChemin(x,z)>.75&&!Object.values(bats).some(b=>Math.hypot(x-b.x,z-b.z)<b.rayon+.25);};
  if(!valide(o.position.x,o.position.z)){let ok=false;for(let i=0;i<600;i++){const x=-15+rng()*31,z=-10+rng()*23;if(valide(x,z)){o.position.x=x;o.position.z=z;ok=true;deplaces++;break;}}if(!ok){o.visible=false;continue;}}
  const h=hauteur(o.position.x,o.position.z),bed=marine?Math.max(h,-M.fondReel.depth(o.position.x,o.position.z)):h;
  const size=o.geometry.parameters?.height??1,scale=marine?THREE.MathUtils.clamp((Math.max(.12,-bed)-.04)/size,.12,.8):1;o.scale.setScalar(scale);
  const dy=size*.44*scale;o.position.y=bed+dy;o.userData.baseY=o.position.y;reposes++;
 }
 if(M.fondReel?.groupe)M.fondReel.groupe.traverse(o=>{
  if(!o.isMesh)return;
  if(o.isInstancedMesh){const matrix=new THREE.Matrix4(),p=V();for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);matrix.elements[13]=-M.fondReel.depth(p.x,p.z);o.setMatrixAt(i,matrix);}o.instanceMatrix.needsUpdate=true;return;}
  const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,-M.fondReel.depth(p.getX(i),p.getZ(i)));p.needsUpdate=true;o.geometry.computeVertexNormals();o.material=mat;
 });
 M.sourceSandcastle?.group.traverse(o=>{if(!o.isMesh||o.userData.phase!==undefined)return;const name=o.geometry.name;if(!/^Rock_|Shell_|Starfish_/.test(name)&&!name.includes('Shell_'))return;const h=Math.max(hauteur(o.position.x,o.position.z),-M.fondReel.depth(o.position.x,o.position.z));o.position.y=h+(name.startsWith('Rock_')?-.04:.02);o.castShadow=o.receiveShadow=true;});
 M.dio.ajouterFond(()=>-50);
 const diagnostic={iles:iles.length,vertices:P.count,triangles:geo.index.count/3,textureSandSource:!!texture,batiments:mesures,bateauxFacteur:1.55,plantesReposees:reposes,plantesDeplacees:deplaces,liaisons:liaisons.diagnostic};
 M.terres={groupe,mesh,iles,hauteur:hauteurPrincipale,diagnostic};return M.terres;
}

function creerReseau(M,groupe){
 const {carte,bats,objets}=M,chemins=[],appuis=[],acces={},surfaces=[];
 const cheminMat=new THREE.MeshStandardMaterial({color:'#e6d6b1',roughness:.98}),bois=new THREE.MeshStandardMaterial({color:'#9c784f',roughness:.85}),rouge=new THREE.MeshStandardMaterial({color:'#b34c38',roughness:.70});
 const cube=new THREE.BoxGeometry(1,1,1),pile=new THREE.CylinderGeometry(1,1.15,1,8),pieces=new Map();
 function instance(geo,mat,position,scale,yaw=0){const key=geo.uuid+mat.uuid;if(!pieces.has(key))pieces.set(key,{geo,mat,m:[]});const m=new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,0)),scale);pieces.get(key).m.push(m);}
 function pieu(x,z,top){const ground=carte.hauteur(x,z),bottom=Math.max(-4.4,ground)-.18;instance(pile,bois,V(x,(top+bottom)/2,z),V(.055,top-bottom,.055));appuis.push({x,z,bas:bottom,terrain:ground,haut:top});}
 const obstacle=(x,z)=>Object.values(bats).some(b=>x>b.box.min.x-.14&&x<b.box.max.x+.14&&z>b.box.min.z-.14&&z<b.box.max.z+.14&&Math.hypot(x-b.x,z-b.z)<b.rayon*.84);
 const W=92,H=76,step=.4,x0=-17,z0=-12,h=new Float32Array(W*H),blocked=new Uint8Array(W*H);
 const point=k=>[x0+Math.floor(k/H)*step,z0+(k%H)*step],idx=(i,j)=>i*H+j;
 for(let k=0;k<h.length;k++){const p=point(k);h[k]=carte.hauteur(...p);blocked[k]=obstacle(...p)?1:0;}
 function proche(p){let kbest=-1,d=Infinity;for(let k=0;k<h.length;k++){if(blocked[k]||h[k]<-.08)continue;const q=point(k),ds=(p[0]-q[0])**2+(p[1]-q[1])**2;if(ds<d){d=ds;kbest=k;}}return kbest;}
 for(const [id,b]of Object.entries(bats)){const d=V(b.etape.vers[0]-b.x,0,b.etape.vers[1]-b.z).normalize(),p=point(proche([b.x+d.x*b.rayon*.94,b.z+d.z*b.rayon*.94]));acces[id]={x:p[0],z:p[1],y:carte.hauteur(...p)+.04};}
 const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
 function trouver(a,b){const start=proche(a),end=proche(b),open=[{k:start,f:0}],g=new Float32Array(h.length).fill(Infinity),prev=new Int32Array(h.length).fill(-1),closed=new Uint8Array(h.length);g[start]=0;const goal=point(end);
  while(open.length){let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;const k=open.splice(best,1)[0].k;if(closed[k])continue;if(k===end){const p=[];for(let u=k;u!==-1;u=prev[u])p.push(point(u));return p.reverse();}closed[k]=1;const i=Math.floor(k/H),j=k%H;
   for(const[di,dj]of neighbors){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=W||nj>=H)continue;const n=idx(ni,nj);if(blocked[n]||closed[n])continue;if(di&&dj&&(blocked[idx(i+di,j)]||blocked[idx(i,j+dj)]))continue;const cost=g[k]+step*Math.hypot(di,dj)*(h[n]<-.06?5:1)+Math.abs(h[n]-h[k])*.4;if(cost<g[n]){g[n]=cost;prev[n]=k;const p=point(n);open.push({k:n,f:cost+Math.hypot(p[0]-goal[0],p[1]-goal[1])});}}
  }return[];
 }
 function route(points,nom,forceBois=false,largeur=.72,profil=null){
  if(points.length<2)return;const samples=points.map((p,i)=>{const h=Math.max(.10,carte.hauteur(...p)+.045,.30*(1-smooth(-.04,.38,carte.hauteur(...p))));return{x:p[0],z:p[1],y:profil?profil(i/(points.length-1),h):h};});
  const pos=[],indices=[];let supportDistance=0;
  for(let i=0;i<samples.length;i++){const p=samples[i],a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],yaw=Math.atan2(b.x-a.x,b.z-a.z),lat=V(Math.cos(yaw),0,-Math.sin(yaw));
   for(const s of[-1,1])pos.push(p.x+lat.x*largeur*.5*s,p.y,p.z+lat.z*largeur*.5*s);
   if(i){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);const prev=samples[i-1],L=Math.hypot(p.x-prev.x,p.z-prev.z),wet=forceBois||carte.hauteur((p.x+prev.x)/2,(p.z+prev.z)/2)<.03;
    if(wet){const n=Math.ceil(L/.13);for(let j=0;j<n;j++){const t=(j+.5)/n;instance(cube,bois,V(THREE.MathUtils.lerp(prev.x,p.x,t),THREE.MathUtils.lerp(prev.y,p.y,t)-.025,THREE.MathUtils.lerp(prev.z,p.z,t)),V(largeur,.05,L/n-.008),Math.atan2(p.x-prev.x,p.z-prev.z));}}
    supportDistance+=L;if(wet&&supportDistance>.72){for(const s of[-1,1])pieu(p.x+lat.x*largeur*.39*s,p.z+lat.z*largeur*.39*s,p.y-.035);supportDistance=0;}
   }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,forceBois?bois:cheminMat);mesh.receiveShadow=true;mesh.name=nom;groupe.add(mesh);
  chemins.push({nom,largeur,points,samples});surfaces.push({points,samples,largeur});
 }
 for(const[a,b]of[['lean','studio'],['lean','avignon'],['avignon','usp'],['studio','bi'],['bi','sncf'],['sncf','reseau']])route(trouver([acces[a].x,acces[a].z],[acces[b].x,acces[b].z]),`${a}-${b}`);
 // Pont cintré élargi : ses appuis et sa surface de marche suivent le même profil.
 objets.pont.clear();objets.pont.position.set(0,0,0);objets.pont.rotation.set(0,0,0);objets.pont.scale.set(1,1,1);
 const nord=[.77,-.90],sud=[.70,Math.min(3.30,bats.perso.box.min.z-.25)],pontPoints=[];
 for(let i=0;i<=32;i++){const t=i/32;pontPoints.push([THREE.MathUtils.lerp(nord[0],sud[0],t),THREE.MathUtils.lerp(nord[1],sud[1],t)]);}
 route(pontPoints,'pont-arene',true,.90,(t,h)=>h+Math.sin(Math.PI*t)*.24);const pontRoute=chemins[chemins.length-1];
 const bridge=groupe.children.find(o=>o.name==='pont-arene');bridge.userData.accessoire='pont';objets.pont.add(bridge);
 for(let i=0;i<pontRoute.samples.length;i++){const p=pontRoute.samples[i];if(i%4===0)for(const s of[-1,1]){pieu(p.x+s*.38,p.z,p.y-.04);instance(cube,rouge,V(p.x+s*.43,p.y+.23,p.z),V(.045,.46,.045));}if(i)for(const s of[-1,1])for(const up of[.22,.46]){const a=pontRoute.samples[i-1],L=Math.hypot(p.x-a.x,p.z-a.z);instance(cube,rouge,V((p.x+a.x)/2+s*.43,(p.y+a.y)/2+up,(p.z+a.z)/2),V(.042,.042,L+.008),Math.atan2(p.x-a.x,p.z-a.z));}}
 route(trouver([acces.studio.x,acces.studio.z],nord),'studio-pont');route(trouver(sud,[acces.perso.x,acces.perso.z]),'pont-perso');
 objets.ponton.clear();objets.ponton.position.set(0,0,0);objets.ponton.rotation.set(0,0,0);objets.ponton.scale.set(1,1,1);
 const entry=[8.9,6.9],qa=M.meta.ponton.a,qb=M.meta.ponton.b,points=[entry,qa];for(let i=1;i<=12;i++)points.push([THREE.MathUtils.lerp(qa[0],qb[0],i/12),THREE.MathUtils.lerp(qa[1],qb[1],i/12)]);
 route(points,'ponton',true,.86);const quai=groupe.children.find(o=>o.name==='ponton');quai.userData.accessoire='ponton';objets.ponton.add(quai);route(trouver([acces.reseau.x,acces.reseau.z],entry),'reseau-ponton');
 for(const lot of pieces.values()){const im=new THREE.InstancedMesh(lot.geo,lot.mat,lot.m.length);lot.m.forEach((m,i)=>im.setMatrixAt(i,m));im.castShadow=im.receiveShadow=true;im.computeBoundingSphere();groupe.add(im);}
 function surfaceMarche(x,z){for(const ch of surfaces)for(let i=1;i<ch.points.length;i++){const a=ch.points[i-1],b=ch.points[i],dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz;if(l2<1e-8)continue;const t=((x-a[0])*dx+(z-a[1])*dz)/l2;if(t>=0&&t<=1&&Math.abs((x-a[0])*dz-(z-a[1])*dx)/Math.sqrt(l2)<ch.largeur*.47)return THREE.MathUtils.lerp(ch.samples[i-1].y,ch.samples[i].y,t);}return null;}
 function distChemin(x,z){let d=Infinity;for(const ch of chemins)for(let i=1;i<ch.points.length;i++)d=Math.min(d,distanceSegment(x,z,ch.points[i-1],ch.points[i]));return d;}
 return{groupe,chemins,acces,appuis,profils:surfaces,surfaceMarche,distChemin,diagnostic:{chemins:chemins.map(c=>({nom:c.nom,points:c.points.length})),appuis:appuis.length,appuisFlottants:appuis.filter(p=>p.bas>p.terrain).length},tick(){}};
}
