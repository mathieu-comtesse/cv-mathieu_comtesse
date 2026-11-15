import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Ciel} from '../refonte/moteur.js';
import {REFERENCE_HUBS,REFERENCE_LINKS,calibrateReferenceBranches,placeReferenceHubs,drawReferenceLinks} from '../refonte/fall26-reference-graph.js';

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
const calls=[];
const ctx={save(){},restore(){},beginPath(){},moveTo(x,y){calls.push(['M',x,y])},lineTo(x,y){calls.push(['L',x,y])},stroke(){}};
drawReferenceLinks(ctx,ciel,(x,y,z)=>({x,y,z}));
assert.equal(calls.filter(x=>x[0]==='L').length,REFERENCE_LINKS.length);
placeReferenceHubs(ciel,1000,740,{left:200,top:-325,lift:90});
assert.equal(hubs[0].centre[0],200+REFERENCE_HUBS[0].x*1000);
assert.equal(hubs[0].centre[1],-325+REFERENCE_HUBS[0].y*740);
assert.equal(hubs[0].centre[2],90,'3D hub follows 3D lift');
placeReferenceHubs(ciel,390,844);
assert.ok(hubs.every(h=>h.centre[0]>=0&&h.centre[0]<=390));
assert.ok(hubs.every(h=>h.centre[1]>=0&&h.centre[1]<=844));
assert.ok(!fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes('expo-technical-hud.js'),
 'L'ancien décor de cubes latéraux ne doit pas être chargé');
assert.ok(!fs.existsSync(new URL('../refonte/expo-reference-ornaments.js',import.meta.url)),
 'Les anciens ornements latéraux doivent être supprimés');
console.log('PASS eleven flat reference stars: normalized 2D geometry, straight rays, cross-links and mobile');
