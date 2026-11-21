import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const match=html.match(/const cvChapterRecords=(\[[^\n]+\]);/);
assert.ok(match,'Chapter metadata required for the hero graph');
const chapters=JSON.parse(match[1]);
assert.equal(chapters.length,11);
const images=chapters.flatMap(c=>c.cards).filter(c=>c.image);
assert.ok(images.length>=6,'Original portfolio visual thumbnails must reach constellation endpoints');
for(const card of images){
  assert.ok(card.image.startsWith('assets/'),'Thumbnails must resolve inside preview branch: '+card.handle);
  assert.ok(fs.existsSync(new URL(card.image,root)),'Missing real project visual: '+card.image);
}
console.log('PASS Fall26 constellation thumbnails: '+images.length+' local project images');
