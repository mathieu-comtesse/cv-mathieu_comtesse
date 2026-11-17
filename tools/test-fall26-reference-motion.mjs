import assert from 'node:assert/strict';
import { ReferenceMotion, pointerRepulsion } from '../refonte/fall26-reference-motion.js';

const makeHub=(order, position) => ({
  centre:position, rayon:100, referenceOrbitOrder:order, noeuds:[{
    a:0, r:1, referenceCos:1, referenceSin:0,
  }],
});
const makeMotion=()=>({motion:new ReferenceMotion(),hubs:[makeHub(0,[0,0]),makeHub(1,[500,500])]});
function advance(model, count, opts={}) {
  for(let index=0;index<count;index++) model.motion.step(model.hubs,{
    dt:1/60, pointer:null, viewport:[741,741],...opts,
  });
}
const rest=makeMotion();
advance(rest,360);
const [even,odd]=rest.hubs.map(hub=>hub.noeuds[0].referenceMotion);
assert.ok(even.y>2&&odd.y< -2,'Neighbouring stars orbit in opposite directions');
assert.ok(Math.abs(even.y+odd.y)<1e-9);
assert.ok(Math.abs(Math.hypot(even.x,even.y)-100)<1e-9,'The orbit preserves spoke length');
assert.ok(Math.abs(rest.motion.phase-.12)<1e-9);
const slower=makeMotion();
advance(slower,360,{leafHover:true});
assert.ok(slower.motion.phase<rest.motion.phase*.23,'Picking a leaf slows the orbit');

const contraction=makeMotion();
advance(contraction,60,{pointer:[0,0]});
const leaf=contraction.hubs[0].noeuds[0];
assert.ok(leaf.referenceMotion.length>74.99&&leaf.referenceMotion.length<75.1);
assert.ok(contraction.hubs[1].noeuds[0].referenceMotion.length>99.99);
advance(contraction,180);
assert.ok(leaf.referenceMotion.length>=99.98,'Leaving the hub releases the contraction');
advance(contraction,1,{enabled:false});
assert.equal(contraction.motion.phase,0);
assert.equal(leaf.referenceMotion,null,'Reduced motion discards active simulation offsets');

assert.equal(pointerRepulsion(260,0,10,0,1,1),null);
assert.equal(pointerRepulsion(15,0,500,0,1,1),null);
assert.equal(pointerRepulsion(280,0,500,0,1,1),null);
assert.deepEqual(pointerRepulsion(100,0,500,0,1,1),[0,0]);
assert.ok(pointerRepulsion(80,80,0,900,1,1)[1]>0);
const sweep=makeMotion();
advance(sweep,1,{pointer:[85,-120]});
advance(sweep,1,{pointer:[85,-60]});
assert.ok(sweep.hubs[0].noeuds[0].referenceMotion.y>0,'A sweep carries the leaf in its direction');
const hold=makeMotion();
advance(hold,1,{pointer:[85,-120]});
advance(hold,1,{pointer:[85,-60],grabbed:hold.hubs[0].noeuds[0]});
assert.ok(hold.hubs[0].noeuds[0].referenceMotion.y < sweep.hubs[0].noeuds[0].referenceMotion.y);

const thirty=makeMotion(), oneTwenty=makeMotion();
advance(thirty,180,{dt:1/30});
advance(oneTwenty,720,{dt:1/120});
assert.ok(Math.abs(thirty.motion.phase-oneTwenty.motion.phase)<1e-9);
assert.deepEqual(thirty.hubs,oneTwenty.hubs);
console.log('PASS alternate orbit, hover contraction, pointer sweep, reduced motion and fixed-step determinism');
