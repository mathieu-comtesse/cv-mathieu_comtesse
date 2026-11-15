import assert from 'node:assert/strict';
import {drawExpoTechnicalHud} from '../refonte/expo-technical-hud.js';
const calls={};const count=n=>(...args)=>{calls[n]=(calls[n]||0)+1;};
const ctx={save:count('save'),restore:count('restore'),beginPath:count('beginPath'),arc:count('arc'),
 moveTo:count('moveTo'),lineTo:count('lineTo'),stroke:count('stroke'),fillRect:count('fillRect'),fillText:count('fillText'),
 globalAlpha:1,strokeStyle:'',fillStyle:'',lineWidth:1};
const v={W:1440,H:900,e:0,t:0,offset:0};
drawExpoTechnicalHud(ctx,v);
assert.equal(calls.save||0,0,'Aucun dessin à plat');
v.e=1;drawExpoTechnicalHud(ctx,v);
assert.equal(calls.save,1);assert.equal(calls.restore,1);
assert.ok(calls.arc>=8,'Orbites latérales');
assert.ok(calls.lineTo>=100,'Graduations et cubes');
assert.ok(calls.fillText>=2,'Échelles et labels techniques');
drawExpoTechnicalHud(ctx,v,{reduce:true,quality:.25});
assert.equal(calls.save,2);assert.equal(calls.restore,2);
drawExpoTechnicalHud(ctx,{W:0,H:0,e:1});
assert.equal(calls.save,2,'Dimensions nulles ignorées');
console.log('PASS expo hud');
