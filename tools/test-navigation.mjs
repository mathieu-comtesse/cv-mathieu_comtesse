import assert from 'node:assert/strict';
import {createNav} from '../js/nav.js';
const nav=createNav({x0:0,x1:5,z0:0,z1:5,cell:.1,radius:0});nav.block({x0:2.01,x1:2.09,z0:2.01,z1:2.09});
const cases=[[[.1307801343,.6324885043],[3.1698132826,3.0020947606]],[[.15,.15],[3.17,3.002]]];
for(let i=0;i<100;i++)cases.push([[.05+((i*17)%100)/100*1.8,.05+((i*29)%100)/100*1.8],[3+((i*37)%100)/100*1.8,3+((i*43)%100)/100*1.8]]);
for(const[from,to]of cases){const route=nav.path(from,to);assert.ok(route.length);const all=[from,...route];for(let i=1;i<all.length;i++){assert.ok(nav.line(all[i-1],all[i]),'Planned segment must be accepted by the movement collision guard');for(let j=0;j<=1000;j++){const t=j/1000;assert.ok(nav.free(all[i-1][0]+(all[i][0]-all[i-1][0])*t,all[i-1][1]+(all[i][1]-all[i-1][1])*t));}}assert.deepEqual(route.at(-1),to);}
assert.equal(nav.line([1.95,2.15],[2.15,1.95]),false);
console.log('PASS: 102 complete routes and blocked corner');
