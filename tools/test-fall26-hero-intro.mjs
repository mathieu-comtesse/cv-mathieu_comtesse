import assert from 'node:assert/strict';
import {introRanks,introSample,applyHeroIntro} from '../refonte/fall26-hero-intro.js';
assert.deepEqual(introRanks([0,1,2,3,4,5,6,7,8,9,10]),[0,5,10,4,9,3,8,2,7,1,6]);
for(const leaf of [false,true]){
  assert.equal(introSample(0,.5,leaf).reach,0);
  assert.deepEqual(introSample(10,.5,leaf),{travel:1,reach:1,reveal:1,scale:1,spin:0});
  assert.deepEqual(introSample(0,.5,leaf,true),introSample(10,.5,leaf));
  let previous=0;
  for(let t=0;t<4;t+=.01){const s=introSample(t,.5,leaf);assert.ok(s.reach>=previous);previous=s.reach;assert.ok(Number.isFinite(s.scale));}
}
const make=()=>({etoiles:new Map([['accueil:a',{id:'accueil:a',parent:'accueil',centre:[200,300,0],noeuds:Array.from({length:57},()=>({}))}]])});
const sky=make();applyHeroIntro(sky,0,1000,700);assert.deepEqual(sky.etoiles.get('accueil:a').centre,[500,350,0]);
const final=make();assert.equal(applyHeroIntro(final,10,1000,700),true);assert.deepEqual(final.etoiles.get('accueil:a').centre,[200,300,0]);
const reduced=make();assert.equal(applyHeroIntro(reduced,0,1000,700,true),true);assert.equal(reduced.etoiles.get('accueil:a').introLabel,1);
const dense=make();applyHeroIntro(dense,2.5,1000,700);assert.equal(dense.etoiles.get('accueil:a').introLabel,0);
console.log('Hero intro: stagger, endpoint poses, monotone travel, dense labels and reduced motion passed');
