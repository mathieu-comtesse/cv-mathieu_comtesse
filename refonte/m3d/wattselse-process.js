/* Quatre machines originales inspirées des principes du génie climatique.
 * Conception spécifique pour le portfolio comtesse.me.
 * Les machines sont faites de géométrie Three.js, sans importer les SVG WattsElse.
 * API compatible avec refonte/m3d/tile.js : { group, update(time), controls }.
 */
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, cylX, cylY, ball, bench, tube, paper, display, ease } from './core.js';

const C = {
  ivory: COL.hi, pale: COL.mid, iron: COL.lo, dark: COL.dark,
  light: '#f0f5ff', blue: '#5588d2', blue2: '#2c539c',
  green: '#37a981', amber: '#f4a259', red: '#db6261',
  screen: '#a9bed2', graphite: '#34445b', glass: '#b8dfea'
};
const TAU = Math.PI * 2;
const lerp = (a,b,t) => a + (b-a)*t;
const phase = (x) => ((x%1)+1)%1;
const pt = (x,y,z) => new THREE.Vector3(x,z,y);
const patch = (g, child) => {g.add(child);return child;};
const makeRoot = (width=300,depth=116) => {
  const g = new THREE.Group();
  g.add(bench({x:-width/2,y:-depth/2,w:width,d:depth,r:9},{strip:{x:-width/2+14,y:depth/2-12,w:width*.36,d:6},label:{x:width/2-87,y:depth/2-17,w:72,d:10}}));
  return g;
};
function screen(g, x,y,z,w,h,text) {
  const d=display(w,h,{bg:'#b9cadd',fg:'#233347',font:'bold 37px ui-monospace, monospace'});
  d.mesh.position.set(x,z,y);g.add(d.mesh);d.set(text);return d;
}
function bar(g, a, b, radius=.8,color=C.graphite) {
  const aa=pt(...a),bb=pt(...b),dif=bb.clone().sub(aa);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,dif.length(),10),mat(color,{metalness:.14,roughness:.5}));
  m.position.copy(aa).add(bb).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dif.normalize());
  m.castShadow=true;g.add(m);return m;
}
function face(g,x,y,z,w,h,color=C.screen) {
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat(color,{roughness:.65,side:THREE.DoubleSide}));
  m.position.set(x,z,y);g.add(m);return m;
}
function light(g,x,y,z,color=C.blue,r=1.9) {
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8), new THREE.MeshBasicMaterial({color}));
  m.position.set(x,z,y);m.userData.glowShell=true;g.add(m);return m;
}
function flow(g, coordinates, count, color=C.blue, radius=1.3) {
  const curve=new THREE.CatmullRomCurve3(coordinates.map(p=>pt(...p)));
  const geo=new THREE.SphereGeometry(radius,9,6);
  const matl=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
  const dots=Array.from({length:count},(_,i)=>{
    const m=new THREE.Mesh(geo,matl.clone());m.userData.glowShell=true;g.add(m);
    return {mesh:m,offset:i/count};
  });
  return (time,speed=1,brightness=1)=>{
    dots.forEach(({mesh,offset})=>{
      const u=phase(time*speed+offset),v=curve.getPoint(u);
      mesh.position.copy(v);mesh.material.opacity=brightness*Math.sin(u*Math.PI)*.88;
      mesh.scale.setScalar(.65+.45*Math.sin(Math.PI*u));
    });
  };
}
function screw(g,x,y,z){g.add(cyl(x,y,1.4,z,.65,C.graphite,12));}
function moduleDoor(g,x,y,z,w,h,color=C.light){
  const k=box(x,y,z,w,1.3,h,color,0);g.add(k);return k;
}
function frameStand(g,x,y,z,ww=32,depth=46,hh=56){
  g.add(slab(x-ww/2,y-depth/2,ww,depth,0,3,C.iron,2));
  for (const xx of [x-ww/2+2,x+ww/2-2]) for (const yy of [y-depth/2+2,y+depth/2-2]) g.add(box(xx,yy,hh/2,2,2,hh,C.ivory,0));
  g.add(slab(x-ww/2,y-depth/2,ww,depth,hh,2,C.pale,1));
}
function spindle(g,x,y,z,r=12) {
  const s=new THREE.Group();s.position.set(x,z,y);
  s.add(new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,3,12).rotateX(Math.PI/2),mat(C.graphite)));
  for (let i=0;i<6;i++) {
    const a=i*TAU/6;
    const vane=new THREE.Mesh(new THREE.BoxGeometry(r,1.3,3),mat(i%2?C.iron:C.ivory));
    vane.position.set(Math.cos(a)*r*.38,Math.sin(a)*r*.38,0);vane.rotation.z=a;s.add(vane);
  }
  g.add(s);return s;
}

// 41 — CTA comme chaîne de conception, de lecture jusqu'à fabrication de l'extracteur.
export function studioMachine() {
  const g=makeRoot(318,126), updateFns=[];
  const stations=[-112,-44,27,99];
  const docs=[];
  g.add(slab(-142,-27,282,54,4,5,C.graphite,3));
  g.add(slab(-145,-23,288,46,9,1.5,C.ivory,2));
  for (const y of [-23,23]) bar(g,[-137,y,12],[136,y,12],.9,C.dark);
  const rotors=[], shutters=[], leds=[], gauges=[];
  stations.forEach((x,i)=>{
    const z0=13, width=52, depth=74;
    frameStand(g,x,0,z0,width,depth,64);
    g.add(box(x,0,28,width-8,depth-13,26,i%2?C.pale:C.light));
    const back=box(x,-depth/2+3,40,width-4,2,40,C.iron);g.add(back);
    shutters.push(moduleDoor(g,x,depth/2-2,42,width-5,38,C.light));
    const rotor=spindle(g,x,-6,57,10);rotors.push(rotor);
    const led=light(g,x+19,depth/2+1,64,C.green);leds.push(led);
    const d=screen(g,x,depth/2+2,27,34,9,['PDF','CHAMPS','TEST','OUTIL'][i]);gauges.push(d);
    for (const xx of [x-22,x+22]) for (const yy of [-28,28]) screw(g,xx,yy,78);
    // Entrée / sortie aérées, montrant la succession de chambres.
    g.add(box(x,-19,72,width-8,2,5,C.pale));
  });
  for(let i=0;i<10;i++){
    const d=paper(11,15,'#ffffff',5);d.rotation.x=-Math.PI/2;g.add(d);docs.push(d);
  }
  // Création progressive d'une cartouche/extracteur physique.
  const extruders=[];
  for(let i=0;i<4;i++){
    const cassette=box(134,-20+i*13,25,14,10,18,[C.ivory,C.pale,C.blue,C.green][i]);
    g.add(cassette);extruders.push(cassette);
  }
  const flows=[
    flow(g,[[-141,0,53],[-112,0,53],[-84,0,53],[-44,0,53]],8,C.blue,.75),
    flow(g,[[-45,0,53],[-8,0,53],[27,0,53],[62,0,53],[99,0,53]],10,C.green,.75)
  ];
  let value=0,manual=false;
  const controls={label:'Étape du processus',min:0,max:3,step:1,
    fmt:v=>['Lire le PDF','Identifier les champs','Vérifier les résultats','Générer l’extracteur'][Math.round(v)] || '',
    get:()=>value,set:v=>{manual=true;value=Math.max(0,Math.min(3,Math.round(v)));}};
  function update(time){
    if(!manual)value=Math.floor(phase(time/18)*4);
    rotors.forEach((r,i)=>{r.rotation.z=time*(.7+i*.21);r.scale.setScalar(i===value?1.12:1);});
    shutters.forEach((d,i)=>{d.position.y=41+16*(i===value?1:.14);});
    leds.forEach((l,i)=>l.scale.setScalar(.7+(i===value?.65:.08)*Math.pow(Math.sin(time*3),2)));
    docs.forEach((d,i)=>{
      const f=phase(time*.035+i*.1);d.position.set(-147+f*282,17+Math.sin(f*TAU)*2,-6+(i%3)*7);
      d.userData.flex?.(.005,.35,.1,i,time);d.visible=true;
    });
    flows.forEach((f,i)=>f(time, i===0?.19:.14,i===value%2?1:.6));
    extruders.forEach((m,i)=>{m.position.y=22+4*Math.sin(time*.8+i*.6);m.scale.setScalar(i===value?1.1:1);});
  }
  update(0);return {group:g,update,controls};
}

// 22 — réseau de distribution et contrôle de comptage BT31/BT33/BT21/BT11.
export function vreMachine() {
  const g=makeRoot(312,125);
  g.add(box(-125,-10,33,41,58,52,C.pale));
  g.add(box(-125,22,47,32,1,24,C.graphite));
  const readout=screen(g,-125,23,49,26,9,'PDF');
  g.add(slab(-145,-46,40,17,4,3,C.ivory,1));
  const spinner=spindle(g,-125,-10,68,11);
  const families=['BT31','BT33','BT21','BT11'], yPos=[-38,-13,13,38];
  const colors=[C.blue,C.green,C.amber,C.red], branches=[], valv=[], dials=[], lamps=[];
  bar(g,[-100,-10,35],[-58,-10,35],3,C.dark);
  g.add(cyl(-56,-10,11,28,17,C.iron,24));
  yPos.forEach((y,i)=>{
    bar(g,[-56,-10,35],[-19,y,35],2.1,C.graphite);
    bar(g,[-19,y,35],[104,y,35],1.9,colors[i]);
    for(const x of [-18,105]) g.add(cyl(x,y,5,26,9,C.pale,16));
    const valve=spindle(g,-11,y,50,7);valv.push(valve);
    g.add(box(69,y,12,70,16,17,C.pale));
    const d=screen(g,73,y+8.2,13,44,9,families[i]);dials.push(d);
    const lamp=light(g,105,y,50,colors[i],2);lamps.push(lamp);
    branches.push(flow(g,[[-89,-10,35],[-54,-10,35],[-19,y,35],[52,y,35],[104,y,35]],7,colors[i],1.15));
  });
  const bin=box(131,0,48,26,91,62,C.pale);g.add(bin);
  screen(g,131,46,64,21,8,'EXCEL');
  screen(g,131,46,48,21,8,'GMAO');
  const outflow=flow(g,[[108,0,64],[122,0,64],[136,0,64]],5,C.green,.95);
  let bat=0;const data=[[18,9,7,3],[12,6,4,0],[24,11,8,5],[9,4,6,2],[15,7,5,4],[21,8,9,1]];
  const controls={label:'Bâtiment de démonstration',min:0,max:5,step:1,
    fmt:n=>'Bâtiment '+String.fromCharCode(65+Math.round(n)),get:()=>bat,set:n=>{bat=Math.max(0,Math.min(5,Math.round(n)));}};
  function update(time){
    spinner.rotation.z=time*1.6;
    readout.set('PDF '+String.fromCharCode(65+bat));
    const counts=data[bat];
    valv.forEach((v,i)=>{v.rotation.z=time*.08+counts[i]/30;});
    dials.forEach((d,i)=>d.set(families[i]+' '+String(counts[i]).padStart(2,'0')));
    branches.forEach((f,i)=>f(time,.09+counts[i]/130,.35+counts[i]/35));
    lamps.forEach((l,i)=>l.scale.setScalar(.65+Math.sin(time*2+i)*.25+Math.min(.7,counts[i]/35)));
    outflow(time,.12,.8);
  }
  update(0);return {group:g,update,controls};
}

// 67 — supervision : de stations/secteurs dispersés vers un système central.
export function mosoMachine() {
  const g=makeRoot(325,132);
  const sensors=[], links=[], spots=[];
  const coords=[[-127,-38],[-127,3],[-127,43],[-48,-38],[-48,43]];
  coords.forEach(([x,y],i)=>{
    g.add(slab(x-13,y-11,28,23,1,4,C.iron,2));
    g.add(box(x,y,22,21,17,32,C.pale));
    const d=screen(g,x,y+8.9,27,17,7,['MOSO','GARES','SECT.','PP','OT'][i]);sensors.push(d);
    const tip=light(g,x+9,y,48,i===0?C.amber:C.green,2.3);spots.push(tip);
    const from=[x+10,y,48],b=[-16,y*.42,46],end=[42,0,51];
    links.push(flow(g,[from,b,end],7,[C.amber,C.blue,C.blue,C.green,C.green][i],.85));
    bar(g,[x+5,y,12],[x+7,y,47],.8,C.graphite);
    g.add(cyl(x-9,y-7,2.1,39,3,C.iron,12));
  });
  // Un automate et son tableau de bord, séparés visuellement des sources.
  g.add(slab(20,-33,105,67,2,5,C.graphite,3));
  g.add(box(68,-14,53,77,51,90,C.pale));
  g.add(box(68,13,56,68,1.8,70,C.graphite));
  const indicators=[];
  for(let r=0;r<3;r++) for(let c=0;c<6;c++){
    indicators.push(light(g,41+c*10.8,15,78-r*11,((r+c)%5===0)?C.amber:C.green,1.8));
  }
  // Pupitre distinct, vue des secteurs et indicateurs regroupés.
  g.add(box(119,30,31,52,25,38,C.ivory));
  const kpi1=screen(g,119,43,37,42,9,'SUIVI');
  const kpi2=screen(g,119,43,24,42,9,'SECTEUR A');
  const bus=flow(g,[[12,0,51],[32,0,51],[68,0,51],[106,30,37]],12,C.blue,1.2);
  const alerts=flow(g,[[31,16,80],[62,16,80],[95,16,80],[113,30,49]],6,C.amber,.9);
  let sector=0, alarm=false;
  const controls={label:'Secteur suivi',min:0,max:4,step:1,
    fmt:n=>['MOSO','Gares','Secteurs','Plans de prévention','Ordres de travail'][Math.round(n)],
    get:()=>sector,set:n=>{sector=Math.max(0,Math.min(4,Math.round(n)));}};
  function update(time){
    alarm=phase(time/28)>.84;
    links.forEach((f,i)=>f(time,.11+(i===sector?.065:0),i===sector?1:.28));
    spots.forEach((l,i)=>l.scale.setScalar(i===sector?1.4+Math.sin(time*3)*.25:.55));
    indicators.forEach((m,i)=>m.scale.setScalar(.68+.45*Math.pow(Math.sin(time*2+i*.36),2)));
    kpi1.set(alarm?'POINT A VERIFIER':'SUIVI MOSO');
    kpi2.set(['MOSO','GARES','SECTEURS','PP','OT'][sector]);
    bus(time,.14,.85);alerts(time,.11,alarm?1:.2);
  }
  update(0);return {group:g,update,controls};
}

// 57 — PID reconçu en validation humaine : proposition, correction, test, publication.
export function regulationMachine() {
  const g=makeRoot(315,129);
  const candidates=[];
  g.add(box(-119,-8,33,64,69,56,C.pale));
  g.add(box(-119,28,47,54,1,30,C.graphite));
  screen(g,-119,29,54,45,8,'CANDIDAT');
  const reader=screen(g,-119,29,39,45,8,'PDF / CADRES');
  const flowIn=flow(g,[[-150,-10,67],[-138,-10,67],[-119,-10,67],[-91,-10,67]],8,C.blue,.95);
  const rails=[-45,2,50];
  const gates=[],knobs=[];
  rails.forEach((x,i)=>{
    g.add(box(x,-11,34,49,57,43,C.ivory));
    g.add(box(x,19,39,42,1,22,C.graphite));
    const d=screen(g,x,20,43,34,9,['CADRAGE','VALIDATION','ESSAI'][i]);
    candidates.push(d);
    const knob=spindle(g,x,-21,70,9);knobs.push(knob);
    const gate=box(x,20,17,28,2,17,C.iron);gates.push(gate);
    for(const a of [-18,18]) screw(g,x+a,16,60);
  });
  g.add(box(113,-11,37,54,57,57,C.pale));
  g.add(box(113,20,42,46,1,28,C.graphite));
  const output=screen(g,113,21,47,40,9,'PUBLICATION');
  const approval=light(g,139,14,74,C.green,3);
  const reject=light(g,86,17,9,C.red,2.1);
  // Flux de correction en boucle, retour du test vers les cadres.
  const fwd=flow(g,[[-90,-12,48],[-45,-12,48],[2,-12,48],[50,-12,48],[112,-12,48]],11,C.green,1);
  const retry=flow(g,[[53,-36,14],[27,-40,14],[-45,-40,14],[-68,-36,35]],9,C.amber,.9);
  const docs=Array.from({length:7},(_,i)=>{const m=paper(10,14,C.light,5);m.rotation.x=-Math.PI/2;g.add(m);return m;});
  let verified=72;
  const controls={label:'Cadres vérifiés (simulation)',min:0,max:100,step:5,
    fmt:n=>Math.round(n)+' % vérifiés',get:()=>verified,set:n=>{verified=Math.max(0,Math.min(100,Number(n)));}};
  function update(time){
    reader.set('PDF / CADRES');
    knobs.forEach((k,i)=>{k.rotation.z=time*(.25+.08*i);});
    gates.forEach((m,i)=>m.position.y=17+7*Math.sin(time*1.5+i)*.5+verified*.04);
    docs.forEach((m,i)=>{const u=phase(time*.055+i/7);m.position.set(-94+u*197,16+Math.sin(u*TAU)*2,-10);m.userData.flex?.(.008,.3,.1,i,time);});
    const published=verified>=100;
    fwd(time,.13,.35+verified/160);retry(time,.12,published?.04:1-verified/120);
    output.set(published?'MODELE VALIDE':'TEST EN COURS');
    approval.scale.setScalar(published?1.3+.2*Math.sin(time*4):.6);
    reject.scale.setScalar(published?.01:.35+(100-verified)/140);
  }
  update(0);return {group:g,update,controls};
}
