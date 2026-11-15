import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Ciel} from '../refonte/moteur.js';
import {REFERENCE_HUBS,REFERENCE_LINKS,REFERENCE_SPOKES,referenceSpokeAngles,calibrateReferenceBranches,placeReferenceHubs,drawReferenceLinks,drawReferenceStage} from '../refonte/fall26-reference-graph.js';

const ciel=new Ciel();
ciel.definit('accueil',{groupe:'accueil',racine:true,label:'Site'});
for(let i=0;i<11;i++)ciel.definit('accueil:'+i,{
  groupe:'accueil',parent:'accueil',label:'Chapitre '+i,
  editoriaux:[{handle:'c'+i,title:'Projet '+i}],sol:true
});
assert.equal(calibrateReferenceBranches(ciel),11);
const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil').sort((a,b)=>a.rang-b.rang);
placeReferenceHubs(ciel,1200,760);
assert.equal(REFERENCE_HUBS.length,11);
assert.ok(hubs[4].noeuds.length>=30,'Payments: trente ramifications');
assert.ok(hubs[9].noeuds.length>=57,'Developer: cinquante-sept ramifications');
assert.ok(REFERENCE_LINKS.length>=16);
for(let i=0;i<hubs.length;i++){
 const hub=hubs[i],ref=REFERENCE_HUBS[i];
 assert.equal(hub.referenceFlat,true);
 assert.equal(hub.sol,false);
 assert.equal(hub.centre[0],ref.x*1200);
 assert.equal(hub.centre[1],ref.y*760);
 assert.ok(hub.rayon>50&&hub.rayon<200);
 assert.ok(hub.noeuds.length>10);
 for(const n of hub.noeuds){
  assert.equal(n.par,null,'Aucune ramification courbe parasite');
  assert.equal(n.cv,0,'Rayons rectilignes');
  assert.equal(n.ar,0,'Aucune arche 3D');
  assert.equal(n.dh,0,'Branches dans le plan');
  assert.ok(n.ed||n.niveau===1);
 }
}
for(let i=0;i<REFERENCE_HUBS.length;i++){
 const e=hubs[i],angles=referenceSpokeAngles(i,e.noeuds.length),observed=e.noeuds.map(n=>n.a);
 assert.equal(e.noeuds.length,REFERENCE_HUBS[i].points,'Exact ray count for star '+i);
 assert.equal(angles.length,e.noeuds.length);
 assert.equal(new Set(observed.map(v=>Math.round(v*1e5))).size,observed.length,
   'Each star ray must have a unique direction');
 assert.ok(observed.every(v=>Number.isFinite(v)&&v>=0&&v<=Math.PI*2));
 assert.ok(observed.every(v=>angles.some(a=>Math.abs(a-v)<1e-8)),'Star ray must follow reference angular palette');
 assert.ok(e.noeuds.every(n=>n.r>=.65&&n.r<=1.27),'Natural nonuniform spoke lengths');
 assert.ok(REFERENCE_SPOKES[i].length>=14);
}
const calls=[];
const ctx={save(){},restore(){},beginPath(){},closePath(){},fill(){calls.push(['F'])},moveTo(x,y){calls.push(['M',x,y])},lineTo(x,y){calls.push(['L',x,y])},stroke(){}};
drawReferenceLinks(ctx,ciel,(x,y,z)=>({x,y,z}));
assert.equal(calls.filter(x=>x[0]==='L').length,REFERENCE_LINKS.length);
drawReferenceStage(ctx,ciel,(x,y,z)=>({x,y,z}),1);
assert.ok(calls.some(x=>x[0]==='F'),'Projected dark backing is drawn below 3D hub network');
placeReferenceHubs(ciel,1000,740,{left:200,top:-325,lift:90});
assert.equal(hubs[0].centre[0],200+REFERENCE_HUBS[0].x*1000);
assert.equal(hubs[0].centre[1],-325+REFERENCE_HUBS[0].y*740);
assert.equal(hubs[0].centre[2],90,'3D hub follows 3D lift');
// A parent layout pass may restore the original spiral: the reference pass
// must restore all 11 measured coordinates at every resize and mode switch.
ciel.place('accueil',[600,380,0],300);
assert.ok(hubs.some((hub,i)=>Math.abs(hub.centre[0]-REFERENCE_HUBS[i].x*1200)>1),
  'Parent layout changes the reference positions before the explicit override');
assert.equal(placeReferenceHubs(ciel,1200,760),11);
for(let i=0;i<hubs.length;i++){
  assert.deepEqual(hubs[i].centre,[REFERENCE_HUBS[i].x*1200,REFERENCE_HUBS[i].y*760,0]);
}
const atFlat=hubs.map(h=>[...h.centre,h.rayon]);
assert.equal(placeReferenceHubs(ciel,1200,760),11);
assert.deepEqual(hubs.map(h=>[...h.centre,h.rayon]),atFlat,
  'Repeated draw passes do not introduce positional drift');
assert.equal(placeReferenceHubs(ciel,0,760),0,
  'A hidden or zero-width section does not produce invalid coordinates');
assert.deepEqual(hubs.map(h=>[...h.centre,h.rayon]),atFlat);
// The mode switch must affect scale but never drift the measured hub positions.
placeReferenceHubs(ciel,1200,760,{expo:0});
const flatLayout=hubs.map(e=>({centre:[...e.centre],rayon:e.rayon}));
placeReferenceHubs(ciel,1200,760,{expo:.5});
for(let i=0;i<hubs.length;i++){
 assert.deepEqual(hubs[i].centre,flatLayout[i].centre);
 assert.ok(Math.abs(hubs[i].rayon/flatLayout[i].rayon-.84)<1e-9);
}
placeReferenceHubs(ciel,1200,760,{expo:1});
for(let i=0;i<hubs.length;i++){
 assert.deepEqual(hubs[i].centre,flatLayout[i].centre);
 assert.ok(Math.abs(hubs[i].rayon/flatLayout[i].rayon-.68)<1e-9);
}
placeReferenceHubs(ciel,1200,760,{expo:0});
assert.deepEqual(hubs.map(e=>({centre:[...e.centre],rayon:e.rayon})),flatLayout,
 'Returning to flat restores exact prior geometry');
placeReferenceHubs(ciel,390,844);
assert.ok(hubs.every(h=>h.centre[0]>=0&&h.centre[0]<=390));
assert.ok(hubs.every(h=>h.centre[1]>=0&&h.centre[1]<=844));
assert.ok(!fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('expo-technical-hud.js'),
 "L’ancien décor de cubes latéraux ne doit pas être chargé");
assert.ok(!fs.existsSync(new URL('../refonte/expo-reference-ornaments.js',import.meta.url)),
 'Les anciens ornements latéraux doivent être supprimés');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!html.includes('view.cube=['),'Legacy rotating cube must stay disabled');
assert.ok(!html.includes('N.dessineDecor(ctx,view'),'Legacy 3D peripheral scene must stay disabled');
console.log('PASS eleven flat reference stars: normalized 2D geometry, straight rays, cross-links and mobile');
