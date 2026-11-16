import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chapterJourney,chapterHandover,chapterColourAtRow,chapterStarPose,chapterStarAnchor,chapterColourWave,mixHex} from '../refonte/fall26-chapter-transition.js';

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
assert.equal(chapterHandover(center,sections,H).colour,mixHex('#051DAA','#7000A9',chapterJourney(.5).colour));
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
assert.equal(chapterColourAtRow(sections[1].top,sections,H),mixHex('#051DAA','#7000A9',chapterJourney(.5).colour),
  'Expo floor colour at a chapter boundary must be the same colour phase for that scroll position');
assert.equal(chapterColourAtRow(sections[1].top-H*.38,sections,H),'#051DAA');
assert.equal(chapterColourAtRow(sections[1].top+H*.38,sections,H),'#7000A9');
const theme=fs.readFileSync(new URL('../refonte/theme-stars.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(theme.includes('chapterHandover(scrollY,timeline,H)'), 'Flat chapter animation must use shared timeline');
assert.ok(theme.includes('document.body.style.setProperty'), 'Body colour must be updated by shared timeline');
assert.ok(theme.includes('const shrink=pose.scale;'), 'Flat stars must use the shared star pose');
assert.ok(theme.includes('plein=!libre?1:participating?pose.weight'),
 'Incoming and outgoing title fill must follow the same handover progression');
assert.ok(theme.includes('if (fingerprint !== dernierFond)'),
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
assert.ok(motor.includes("e.transitionOpening == null"),'Expo branches must use the shared opening during handover');
assert.ok(html.includes('e.transitionOpening=pose.participating?pose.opening:null;'),'Expo stars must share branch opening with flat');
assert.ok(theme.includes('const weight=pose.weight;'),
 'Non-active flat stars must stay hidden after the transition completes');
assert.ok(html.includes('e.transitionOpacity=pose.opacity;'),
 'Expo stars must not reappear after their outgoing fade completes');
assert.ok(theme.includes('const participating=pose.participating;'),
  'Both incoming and outgoing constellations must remain alive throughout the shared transition');
assert.ok(theme.includes('const alpha=(participating?1:localAlpha)*intro*pose.opacity;'),
  'Outgoing star opacity must follow the common timeline instead of the old heading viewport');
assert.ok(theme.includes('const anchor=chapterStarAnchor(chapterIndex,handover,W,H);'),
  'Transition stars must use independent, video-calibrated screen-space pivots');

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

// At 50% the source video has two different focal points, upper-right for
// the incoming star and lower-left for the departing star.
const half={from:0,to:1,active:1,progress:.5};
const departing=chapterStarAnchor(0,half,1440,900);
const arriving=chapterStarAnchor(1,half,1440,900);
assert.ok(Math.abs(departing.x/1440-.49)<.001&&Math.abs(departing.y/900-.72)<.001,
 'Departing star must move down-left instead of sharing a pivot');
assert.ok(Math.abs(arriving.x/1440-.54)<.001&&Math.abs(arriving.y/900-.42)<.001,
 'Incoming star must appear higher than outgoing star');
assert.ok(Math.hypot(arriving.x-departing.x,arriving.y-departing.y)>900*.28,
 'Transition stars must be visually distinct');
const steady=chapterStarAnchor(0,{from:0,to:0,active:0,progress:0},1440,900);
assert.ok(Math.abs(steady.x-864)<1e-9&&Math.abs(steady.y-504)<1e-9,
 'Steady chapter star must not jump away from its resting position');
assert.ok(html.includes('const chap=!!p.heading.chapter'),
 'Moved 3D headings must retain chapter classification captured before DOM reparenting');
assert.ok(html.includes('p.heading?.chapter'),
 'Expo fallback must locate chapter heading even after the original DOM has moved');
assert.ok(theme.includes('chapterStarAnchor(chapterIndex,handover,W,H)'),
 'Flat star geometry must use the calibrated separated centres');
assert.ok(html.includes('C.chapterStarAnchor(chapterIndex,handover,innerWidth,innerHeight)'),
 'Expo star geometry must share the same separated centres');

assert.deepEqual(chapterJourney(0),{gather:0,reveal:0,pan:0,isolate:0,colour:0});
assert.equal(chapterJourney(.08).reveal,1);
assert.equal(chapterJourney(.11).colour,0);
assert.equal(chapterJourney(.30).gather,1);
assert.equal(chapterJourney(.63).colour,1);
assert.equal(chapterJourney(.50).isolate,0);
assert.equal(chapterJourney(.75).isolate,.5);
assert.equal(chapterJourney(.25).pan,.0625);
const journeyPose=(index,linear)=>chapterStarPose(index,
 {from:0,to:1,active:linear>=.5?1:0,progress:linear,linear});
assert.equal(journeyPose(0,0).opening,1);
assert.equal(journeyPose(0,.3).opening,0);
assert.equal(journeyPose(1,.02).opacity,0);
assert.equal(journeyPose(1,.5).opening,0);
assert.equal(journeyPose(1,.75).opening,.5);
assert.equal(journeyPose(1,1).opening,1);

const waveStart=chapterColourWave('#051DAA','#7000A9',0);
const waveHalf=chapterColourWave('#051DAA','#7000A9',.5);
const waveEnd=chapterColourWave('#051DAA','#7000A9',1);
assert.deepEqual(waveStart,{top:'#051DAA',middle:'#051DAA',bottom:'#051DAA'});
assert.deepEqual(waveEnd,{top:'#7000A9',middle:'#7000A9',bottom:'#7000A9'});
assert.notEqual(waveHalf.top,waveHalf.middle,'Colour wave must not be a uniform crossfade');
assert.notEqual(waveHalf.bottom,waveHalf.middle,'Colour wave must be spatially graduated');
assert.ok(theme.includes('--cv-chapter-middle'),'Flat transition must expose the video-derived colour band');

console.log('PASS synchronized reversible chapter stars and interpolated flat/Expo colours');
