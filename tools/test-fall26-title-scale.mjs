import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const declaration=html.match(/const CHAPTER_TITLE=\{[^\n]+\};\nfunction chapterTitleScale\(bounds,boxW,em\)\{[^\n]+\}/);
assert.ok(declaration,'Chapter heading scale must remain available for verification');

function scale(innerWidth,width=700,headingWidth=430){
  const context={location:{search:''},innerWidth};
  return vm.runInNewContext(declaration[0]+'\nchapterTitleScale({minX:0,maxX:'+headingWidth+'},'+width+',1)',context);
}
assert.ok(scale(1440)<=.82,'Desktop chapter title cannot be magnified');
assert.ok(scale(390)<=.78,'Mobile chapter title cannot be magnified');
assert.ok(scale(1440,500,920)<.82,'Long French titles must shrink further to fit');
assert.ok(scale(390,360,740)<.78,'Long mobile titles must remain within available width');
assert.ok(scale(1440,500,920)>=.55,'Heading must remain readable');
assert.match(html,/lengthadjust="spacingAndGlyphs">Comtesse\.me<\/text>/,
  'Vertical masthead must use compact Comtesse.me label');
assert.ok(html.includes('textlength="384" lengthadjust="spacingAndGlyphs">Comtesse.me</text>'),
  'Mobile header must match the compact desktop masthead');
assert.ok(html.includes("N.cvTextLayout(headingFont,'Comtesse.me',{fontSize:1})"),
  '3D extruded masthead must match the flat SVG lettering');
assert.match(html,/compact:innerWidth<520,racineVisible:false\}\)/,
  'The technical graph root must never render a spurious star in Expo');
console.log('PASS flat/expo chapter typography no longer enlarged 1.6x/2x');
