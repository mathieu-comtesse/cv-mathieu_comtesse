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
// Approximate hub centres from the user's original Shopify video frame,
// normalized inside the graph panel (not across the full viewport).
const capturedCentres=[
  [.448,.169],[.604,.693],[.914,.518],[.224,.630],[.660,.202],
  [.550,.926],[.343,.384],[.815,.728],[.131,.412],[.704,.440],[.225,.194]
];
for(let i=0;i<capturedCentres.length;i++){
  assert.ok(Math.abs(REFERENCE_HUBS[i].x-capturedCentres[i][0])<.015,
    'Reference hub X must match original video: '+i);
  assert.ok(Math.abs(REFERENCE_HUBS[i].y-capturedCentres[i][1])<.015,
    'Reference hub Y must match original video: '+i);
}

assert.ok(hubs[4].noeuds.length>=30,'Payments: trente ramifications');
assert.ok(hubs[9].noeuds.length>=57,'Developer: cinquante-sept ramifications');
assert.ok(hubs[9].noeuds.filter(n=>n.niveau===3).length>=3,
 'Dense developer constellation must use tertiary branches');
assert.ok(REFERENCE_LINKS.length>=16);
for(let i=0;i<hubs.length;i++){
 const hub=hubs[i],ref=REFERENCE_HUBS[i];
 assert.equal(hub.referenceFlat,true);
 assert.equal(hub.sol,false);
 assert.ok(Math.abs(hub.centre[0]-ref.x*1200)<1e-8,'Hub X reference tolerance');
 assert.ok(Math.abs(hub.centre[1]-ref.y*760)<1e-8,'Hub Y reference tolerance');
 assert.ok(hub.rayon>50&&hub.rayon<200);
 assert.ok(hub.noeuds.length>10);
 let twigs=0;
 for(const n of hub.noeuds){
  assert.equal(n.cv,0,'Branches rectilignes');
  assert.equal(n.ar,0,'Aucune arche 3D');
  assert.equal(n.dh,0,'Branches dans le plan');
  assert.ok(n.ed||n.niveau===1||n.niveau===2||n.niveau===3);
  if(n.par){
    twigs++;
    assert.ok(n.niveau===2||n.niveau===3,'Branches use native 2nd or 3rd levels');
    assert.ok(!n.ed,'Editorial thumbnails stay attached to primary rays');
    assert.ok(hub.noeuds.indexOf(n.par)<hub.noeuds.indexOf(n),'Parent must precede fork');
    assert.ok(n.par.enf.includes(n),'Parent/child references remain consistent');
    if(n.niveau===2){
      assert.equal(n.par.niveau,1,'Secondary twigs must originate on primary rays');
      assert.ok(n.len>=.18&&n.len<=.32);
    }else{
      assert.equal(n.par.niveau,2,'Tertiary twigs must originate on secondary rays');
      assert.ok(n.len>=.11&&n.len<=.185);
    }
  }
 }
 assert.ok(twigs>=2,'Each reference constellation needs real secondary branches');
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
assert.ok(Math.abs(hubs[0].centre[0]-(200+REFERENCE_HUBS[0].x*1000))<1e-8);
assert.ok(Math.abs(hubs[0].centre[1]-(-325+REFERENCE_HUBS[0].y*740))<1e-8);
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
// Expansion of the 2D hero is centered and fully reversible, with no drift.
placeReferenceHubs(ciel,1200,760,{spread:1});
const original=hubs.map(h=>[...h.centre]);
placeReferenceHubs(ciel,1200,760,{spread:1.42});
for(let i=0;i<hubs.length;i++){
  const p=original[i],q=hubs[i].centre;
  assert.ok(Math.abs(q[0]-(600+(p[0]-600)*1.42))<1e-8);
  assert.ok(Math.abs(q[1]-(380+(p[1]-380)*1.42))<1e-8);
}
placeReferenceHubs(ciel,1200,760,{spread:1});
assert.deepEqual(hubs.map(h=>[...h.centre]),original,
  'Restoring the flat hero must restore calibrated star positions exactly');
placeReferenceHubs(ciel,390,844);
assert.ok(hubs.every(h=>h.centre[0]>=0&&h.centre[0]<=390));
assert.ok(hubs.every(h=>h.centre[1]>=0&&h.centre[1]<=844));
// Avoid the old, massively oversized Expo starfield: it must stay anchored
// to the measured hero graph rather than nearly doubling its width/height.
const sceneHTML=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(sceneHTML.includes('const gw=zr.width*(1+.12*view.e),gh=zr.height*(1+.25*view.e);'),
  'Expo constellation footprint should remain close to the original reference');
assert.ok(sceneHTML.includes('racineVisible:false'),
  'The root staging node must not render as a twelfth star');
assert.ok(!fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('expo-technical-hud.js'),
 "L’ancien décor de cubes latéraux ne doit pas être chargé");
assert.ok(!fs.existsSync(new URL('../refonte/expo-reference-ornaments.js',import.meta.url)),
 'Les anciens ornements latéraux doivent être supprimés');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(!html.includes('view.cube=['),'Legacy rotating cube must stay disabled');
assert.ok(!html.includes('N.dessineDecor(ctx,view'),'Legacy 3D peripheral scene must stay disabled');
// The editorial chapter order intentionally differs from the Shopify
// reference order; reference geometry must remain attached to chapter ID.
const shuffled=new Ciel();
shuffled.definit('accueil',{groupe:'accueil',racine:true,label:'Site'});
const keys=['agentic','sidekick','online','merchandising','retail','payments',
 'operations','marketing','fulfillment','developer','shop'];
const referenceKeys=['agentic','sidekick','merchandising','retail','payments',
 'operations','online','marketing','fulfillment','developer','shop'];
for(const key of keys)shuffled.definit('accueil:'+key,{
 groupe:'accueil',parent:'accueil',label:key,editoriaux:[{title:key,handle:key}],sol:true
});
calibrateReferenceBranches(shuffled);
placeReferenceHubs(shuffled,1200,760);
for(const hub of shuffled.etoiles.values()){
 if(hub.parent!=='accueil')continue;
 const key=hub.id.slice('accueil:'.length),ref=REFERENCE_HUBS[referenceKeys.indexOf(key)];
 assert.ok(Math.abs(hub.centre[0]-ref.x*1200)<1e-8,'X must follow chapter identity '+key);
 assert.ok(Math.abs(hub.centre[1]-ref.y*760)<1e-8,'Y must follow chapter identity '+key);
 assert.equal(hub.noeuds.length,ref.points,'Ray count must follow chapter identity '+key);
}
const mappedCalls=[];
drawReferenceLinks({
 save(){},restore(){},beginPath(){},moveTo(x,y){mappedCalls.push(['M',x,y])},
 lineTo(x,y){mappedCalls.push(['L',x,y])},stroke(){}
},shuffled,(x,y)=>({x,y}));
assert.equal(mappedCalls.filter(x=>x[0]==='L').length,REFERENCE_LINKS.length,
 'Link topology must follow reference IDs despite reordered editorial chapters');
console.log('PASS eleven flat reference stars: normalized 2D geometry, straight rays, cross-links and mobile');
