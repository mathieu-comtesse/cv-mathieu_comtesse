import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chapterHandover,chapterColourAtRow,mixHex} from '../refonte/fall26-chapter-transition.js';

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
assert.ok(theme.includes('const shrink=.48+.52*weight;'), 'Outgoing stars must contract as the next chapter arrives');
assert.ok(html.includes('C.chapterColourAtRow(view.offset+(a+b)/2,stops,innerHeight)'),
  'Expo floor must be interpolated by the same chapter timeline');
assert.ok(!html.includes('for(const [bi,band] of bands.entries())'),
  'Old hard-edged floor colour bands must be removed');
const motor=fs.readFileSync(new URL('../refonte/moteur.js',import.meta.url),'utf8');
assert.ok(motor.includes("e.transitionOpacity??1"),'Expo title stars must fade by handover weight');
assert.ok(motor.includes("e.transitionScale??1"),'Expo title stars must shrink while leaving');
assert.ok(motor.includes("e.transitionAngle||0"),'Expo title stars must rotate on the same timeline');
assert.ok(html.includes('e.transitionAngle=!cross?0:'),'Expo title stars need source-driven rotation');
assert.ok(theme.includes('chapterIndex===handover.active?1:0'),
 'Non-active flat stars must stay hidden after the transition completes');
assert.ok(html.includes("e.chapitre===chapters[handover.active]?.el.id?1:0"),
 'Expo stars must not reappear after their outgoing fade completes');
console.log('PASS synchronized reversible chapter stars and interpolated flat/Expo colours');
