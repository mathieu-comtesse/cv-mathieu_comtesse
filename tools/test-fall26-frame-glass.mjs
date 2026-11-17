import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectedFramePointerRatio} from '../refonte/moteur.js';

// A reflection must follow the glass edge in any projected orientation.
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`expected ${b}, got ${a}`);
close(projectedFramePointerRatio({x:10,y:10},{x:110,y:10},{x:60,y:40}),.5);
close(projectedFramePointerRatio({x:10,y:10},{x:10,y:110},{x:40,y:85}),.75);
close(projectedFramePointerRatio({x:110,y:110},{x:10,y:10},{x:60,y:60}),.5);
close(projectedFramePointerRatio({x:10,y:10},{x:110,y:110},{x:40,y:40}),.3);
close(projectedFramePointerRatio({x:10,y:10},{x:110,y:110},{x:200,y:200}),1);
close(projectedFramePointerRatio({x:10,y:10},{x:110,y:110},{x:-20,y:-20}),0);
close(projectedFramePointerRatio({x:10,y:10},{x:10,y:10},{x:50,y:20}),.5);
close(projectedFramePointerRatio({x:10,y:10},{x:110,y:110},null),.5);
const source=fs.readFileSync(new URL('../refonte/moteur.js',import.meta.url),'utf8');
assert.match(source,/if \(!haut\.every\(Boolean\) \|\| !bas\.every\(Boolean\)\) \{ ctx\.restore\(\); continue; \}/,
  'Failed frame projection must restore the canvas state before skipping');
assert.match(source,/projectedFramePointerRatio\(haut\[0\],haut\[1\],souris\)/,
  'Glazing must use the tested projected edge geometry');
console.log('PASS Fall26 frame glass geometry and canvas state restoration');
