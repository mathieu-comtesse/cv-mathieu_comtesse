import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const html=read('index.html');
const entry=read('fall26-studio/index.html');
for(const asset of [
 'refonte/fonts/Inter-latin.woff2',
 'refonte/fonts/InstrumentSerif-Regular.woff2',
 'refonte/fonts/iAWriterQuattroV.ttf',
 'refonte/gains.css',
 'refonte/comtesse-motion.css',
 'refonte/comtesse-motion.js',
 'vendor/three-r187/three.module.js',
 'refonte/flow.js'
])assert.ok(fs.existsSync(new URL(asset,root)),asset+' must exist on the preview branch');
assert.ok(html.includes('const base=new URL(\'./\',location.href).href'),
  'Modules must resolve from the hosting directory');
assert.ok(html.includes('href="./refonte/comtesse-motion.css'),
  'Motion CSS must not resolve from the host root');
assert.ok(html.includes('src="./refonte/comtesse-motion.js'),
  'Motion JS must not resolve from the host root');
assert.ok(html.includes('href="./refonte/gains.css'),
  'Gains styles must resolve from the same checkout');
assert.ok(!html.includes('https://comtesse.me/refonte/fonts/'),
  'Font loading must remain pinned to this revision');
assert.ok(!html.includes("import('https://comtesse.me/refonte/"),
  'No module loading from the production site');
assert.ok(html.includes("await import(articleModuleBase+'refonte/m3d/'+name+'.js')"),
  'Article figures must resolve with the embedded module base');
assert.ok(html.includes('const articleModuleBase = ${JSON.stringify(base)};'),
  'Article module base must be serialized inside the embedded script');
assert.ok(entry.includes('target.hash=location.hash')&&entry.includes('target.search=location.search'),
  'The full preview entrypoint must preserve deep links');
assert.ok(html.includes('refonte/fall26-reference-graph.js'),
  'Must load the full starfield, not the simplified studio mockup');
const flatGraph=read('refonte/hero-graph.js');
const revisionOf = (text, asset) => {
  const prefix = asset + '?v=';
  return text.split(prefix)[1]?.match(/^[\w-]+/)?.[0];
};
for(const asset of ['site.css','hero-graph.js','moteur.js','fall26-reference-graph.js']){
  assert.ok(revisionOf(html,'refonte/'+asset),
    'Preview must version '+asset+' to avoid older cached code');
}
assert.equal(revisionOf(html,'refonte/hero-graph.js'),'fall26-work-flight-2',
  'Preview must load the synchronized thumbnail flight');
assert.equal(revisionOf(flatGraph,'./fall26-hero-flight.js'),'fall26-work-flight-2',
  'The flat graph must load the synchronized flight module');
for(const asset of ['moteur.js','fall26-reference-graph.js']){
  assert.equal(revisionOf(flatGraph,'./'+asset),revisionOf(html,'refonte/'+asset),
    'Flat overview must share the revision of '+asset+' with Expo');
}
console.log('PASS Fall26 branch preview paths and full engine');
