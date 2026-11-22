import assert from 'node:assert/strict';
import {cvLit} from '../refonte/moteur.js';
const targets=[
  ['#051DAA',[6,20,153],'bleu'],
  ['#B2005B',[155,0,78],'rose'],
  ['#B03400',[154,33,2],'orange']
];
const rgb=value=>(value.match(/\d+/g)||[]).map(Number);
for(const [source,target,name] of targets){
  assert.equal(cvLit(source,0),source,`${name} : identique à plat`);
  const result=rgb(cvLit(source,1));
  assert.equal(result.length,3,`${name} : couleur RGB en Expo`);
  for(let i=0;i<3;i++)assert.ok(Math.abs(result[i]-target[i])<=5,
    `${name} canal ${i}: mesuré ${result[i]}, vidéo ${target[i]}`);
  const middle=rgb(cvLit(source,.5));
  for(let i=0;i<3;i++)assert.ok(middle[i]>=Math.min(result[i],rgb(cvLit(source,0.000001))[i])-1 &&
    middle[i]<=Math.max(result[i],rgb(cvLit(source,0.000001))[i])+2,
    `${name}: transition chromatique bornée`);
}
console.log('PASS Fall26 floor colours: blue, pink, orange and flat transition');
