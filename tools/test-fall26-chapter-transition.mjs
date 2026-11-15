import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chapterHandover,chapterColourAtRow,chapterStarPose,mixHex} from '../refonte/fall26-chapter-transition.js';

const sections=[
  {top:1000,colour:'#051DAA'},
  {top:3000,colour:'#7000A9'},
  {top:5100,colour:'#B2005B'},
  {top:7200,colour:'#0F0F0F'}
],H=900;
const center=sections[1].top-H*.55;
const begin=center-H*.38,end=center+H*.38;
assert.equal(mixHex('#000000','#FFFFFF',.5),'#808080');
assert.equal(chapterHandover(begin-1,sections,H).colour,'#051DAA');
assert.equal(chapterHandover(begin,sections,H).progress,0);
assert.equal(chapterHandover(end,sections,H).progress,1);
assert.equal(chapterHandover(end+1,sections,H).colour,'#7000A9');
assert.equal(chapterHandover(center,sections,H).colour,mixHex('#051DAA','#7000A9',.5));
assert.equal(chapterHandover(center,sections,H).from,0);
assert.equal(chapterHandover(center,sections,H).to,1);
assert.equal(chapterHandover(center,sections,H).progress,.5);
const values=Array.from({length:51},(_,i)=>chapterHandover(begin+(end-begin)*i/50,sections,H).progress);
assert.ok(values.every((v,i)=>i===0||v>=values[i-1]),'Transition progress must be monotonic');
for(const x of [0,.1,.25,.5,.75,.9,1]){
  const p=begin+(end-begin)*x;
  assert.deepEqual(chapterHandover(p,sections,H),chapterHandover(p,sections,H),
    'A scroll position must always produce the same output, forward and reverse');
}
assert.equal(chapterColourAtRow(sections[1].top,sections,H),mixHex('#051DAA','#7000A9',.5),
  'Expo floor colour at a chapter boundary must be the same 50% blend');
assert.equal(chapterColourAtRow(sections[1].top-H*.38,sections,H),'#051DAA');
assert.equal(chapterColourAtRow(sections[1].top+H*.38,sections,H),'#7000A9');
const theme=fs.readFileSync(new URL('../refonte/theme-stars.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(theme.includes('chapterHandover(scrollY,timeline,H)'), 'Flat chapter animation must use shared timeline');
assert.ok(theme.includes('document.body.style.setProperty'), 'Body colour must be updated by shared timeline');
assert.ok(theme.includes('const shrink=pose.scale;'), 'Flat stars must use the shared star pose');
assert.ok(theme.includes('plein=!libre?1:participating?pose.weight'),
 'Incoming and outgoing title fill must follow the same handover progression');
assert.ok(theme.includes('if (handover.colour !== dernierFond)'),
 'Avoid a redundant global style invalidation on every animation frame');
assert.ok(theme.includes('.sort((a,b)=>b.weight-a.weight)[0]'),
 'Click picking must favor the incoming star as it becomes dominant');
assert.ok(html.includes('C.chapterColourAtRow(view.offset+(a+b)/2,stops,innerHeight)'),
  'Expo floor must be interpolated by the same chapter timeline');
assert.ok(!html.includes('for(const [bi,band] of bands.entries())'),
  'Old hard-edged floor colour bands must be removed');
const motor=fs.readFileSync(new URL('../refonte/moteur.js',import.meta.url),'utf8');
assert.ok(motor.includes("e.transitionOpacity??1"),'Expo title stars must fade by handover weight');
assert.ok(motor.includes("e.transitionScale??1"),'Expo title stars must shrink while leaving');
assert.ok(motor.includes("e.transitionAngle||0"),'Expo title stars must rotate on the same timeline');
assert.ok(html.includes('e.transitionAngle=pose.angle;'),'Expo stars must share the flat rotation');
assert.ok(theme.includes('const weight=pose.weight;'),
 'Non-active flat stars must stay hidden after the transition completes');
assert.ok(html.includes('e.transitionOpacity=pose.weight;'),
 'Expo stars must not reappear after their outgoing fade completes');
assert.ok(theme.includes('const participating=pose.participating;'),
  'Both incoming and outgoing constellations must remain alive throughout the shared transition');
assert.ok(theme.includes('const alpha=(participating?1:localAlpha)*intro*weight;'),
  'Outgoing star opacity must follow the common timeline instead of the old heading viewport');
assert.ok(theme.includes('hy = participating?H*.56:'),
  'Transition stars must share a stable screen-space pivot');

for(const p of [0,.1,.25,.5,.75,.9,1]){
 const handover={from:0,to:1,progress:p,active:p>=.5?1:0};
 const a=chapterStarPose(0,handover),b=chapterStarPose(1,handover),hidden=chapterStarPose(2,handover);
 assert.ok(Math.abs(a.weight+b.weight-1)<1e-12,'Handover must conserve combined opacity');
 assert.equal(hidden.weight,0,'Other chapters must remain hidden');
 assert.ok(a.scale>=.48&&a.scale<=1&&b.scale>=.48&&b.scale<=1);
 assert.deepEqual(chapterStarPose(0,handover),a,'Pose must be deterministic for reverse scrolling');
}
assert.equal(chapterStarPose(2,{from:2,to:2,active:2,progress:1}).weight,1);
assert.equal(chapterStarPose(1,{from:2,to:2,active:2,progress:1}).weight,0);
assert.ok(html.includes('C.chapterStarPose(chapterIndex,handover)'), 'Expo must call the shared pose');

console.log('PASS synchronized reversible chapter stars and interpolated flat/Expo colours');
