const assert=require('node:assert/strict');
const fs=require('node:fs');
const {pixelRatio}=require('../thaleolithic/render-budget.js');
let checks=0;
for(const [width,height,dpr] of [[3840,2160,2],[1920,1080,1.5],[1280,720,1],[844,390,3],[390,844,3],[800,1280,2]]){
  for(const profile of [0,3]){
    const r=pixelRatio(width,height,dpr,profile);
    const maxWidth=width>=height?1280:720,maxHeight=width>=height?720:1280;
    assert.ok(width*r<=maxWidth+.001&&height*r<=maxHeight+.001);
    assert.ok(r<=Math.max(1,dpr));checks++;
  }
}
assert.equal(pixelRatio(3840,2160,2,0),1/3);checks++;
assert.equal(pixelRatio(3840,2160,2,2),.5);checks++;
const html=fs.readFileSync(new URL('../thaleolithic/index.html',`file://${__filename.replaceAll('\\','/')}`),'utf8');
assert.match(html,/<span class="edition">ISO 45001<\/span>/);checks++;
assert.doesNotMatch(html,/Dylan · Jeu sérieux · ISO 45001/);checks++;
assert.match(html,/devicePixelRatio:renderRatio\(\)/);checks++;
assert.match(html,/instance\.Module\.devicePixelRatio=renderRatio\(\)/);checks++;
console.log(`THALEOLITHIC: ${checks} render-budget and footer checks passed.`);
