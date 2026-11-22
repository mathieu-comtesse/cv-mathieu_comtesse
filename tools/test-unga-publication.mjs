import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {UNIV}=await import('../js/projects-data.js');
assert.equal(UNIV.title,'THALEOLITHIC');
assert.equal(UNIV.url,'thaleolithic/');
const game=path.join(root,'thaleolithic');
const pedagogy=JSON.parse(fs.readFileSync(path.join(game,'Source','Resources','CampaignV17.json'),'utf8'));
const activityIds=new Set(pedagogy.activities.map(activity=>activity.id));
assert.equal(activityIds.size,24,'Catalogue pédagogique de 24 activités distinctes');
for(const activity of pedagogy.activities){
  assert.equal(pedagogy.quests.filter(quest=>quest.actionIds.includes(activity.id)).length,1,activity.id+' doit avoir une quête parente');
  assert.ok(activity.site&&activity.actor&&activity.clause&&activity.evidence&&activity.cards.length,activity.id+' métadonnées pédagogiques');
  assert.ok(activity.cards.every(card=>card.question&&card.choices[card.correct]),activity.id+' réponses canoniques');
}
const sst=pedagogy.activities.find(activity=>activity.id==='V17_SYSTEM');
assert.deepEqual([sst.site,sst.actor,sst.clause,sst.mode],['grand_menhir','mathieu','4.4','assemble']);
assert.deepEqual(sst.cards.map(card=>card.correct),[0,1,2,0],'Réponses SST préservées');
assert.equal(pedagogy.quests.find(quest=>quest.id==='V17_CONTEXT').giverId,'aurelien');
// the published game is the paper edition (THALEOLITHIC en papier): its page, its modules, its data and its fonts
const html=fs.readFileSync(path.join(game,'index.html'),'utf8');
for(const match of html.matchAll(/<script\b(?![^>]*type="(?:module|importmap)")[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.Script(match[1]);
assert.ok(html.includes('viewport-fit=cover'));
assert.ok(fs.readFileSync(path.join(game,'ui.css'),'utf8').includes('safe-area-inset'));
const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
for(const target of Object.values(imports))assert.ok(fs.existsSync(path.join(game,target.replace(/\/$/,''))),'importmap: '+target);
assert.match(html,/<script type="module" src="\.\/main\.js"><\/script>/);
for(const file of ['main.js','campaign.js','scene.js','ui.js','ui.css','harness.js','paper-ui.js','sound.js','talk.js','nav.js','wild.js','fauna.js','cine.js','stats.js'])assert.ok(fs.statSync(path.join(game,file)).size>0,file);
for(const name of ['UngaBungaCampaign.json','UngaBungaQuests.json','MenhirDuel.json'])JSON.parse(fs.readFileSync(path.join(game,'Source','Resources',name),'utf8'));
const bytes=fs.readdirSync(path.join(game,'fonts')).filter((f)=>f.endsWith('.woff2')).reduce((n,f)=>n+fs.statSync(path.join(game,'fonts',f)).size,0);
for(const alias of ['talas-refonte','unga-bunga-45001']){
  const legacy=fs.readFileSync(path.join(root,alias,'index.html'),'utf8');
  const script=legacy.match(/<script>([\s\S]*?)<\/script>/)[1];
  let destination;
  const current=new URL(`https://comtesse.me/${alias}/?source=ancien&lang=fr#chapitre-2`);
  vm.runInNewContext(script,{URL,location:{href:current.href,search:current.search,hash:current.hash,replace(value){destination=String(value);}},document:{querySelector(){return {};}}});
  assert.equal(destination,'https://comtesse.me/thaleolithic/?source=ancien&lang=fr#chapitre-2');
}
const post=fs.readFileSync(path.join(root,'projet-talas.html'),'utf8');
assert.ok(post.includes('href="thaleolithic/"'));
assert.ok(post.includes('THALEOLITHIC'));
assert.ok(!/UNGA\s+BUNGA/.test(post+html));
for(const page of ['index.html','blog.html','projet-gares.html','projet-lettres.html'])assert.ok(!/UNGA\s+BUNGA/.test(fs.readFileSync(path.join(root,page),'utf8')),`${page}: obsolete public game title`);
assert.ok(fs.existsSync(path.join(game,'thaleolithic-accueil.webp')));
console.log(`THALEOLITHIC publication: paper edition page, modules, data, illustration and legacy redirects. Fonts ${(bytes/1024).toFixed(0)} KiB.`);
