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
const config=JSON.parse(fs.readFileSync(path.join(game,'game-config.json'),'utf8'));
let bytes=0;
for(const key of ['loaderUrl','dataUrl','frameworkUrl','codeUrl']){
  const url=new URL(config[key],'https://example.test/thaleolithic/');
  assert.equal(url.origin,'https://example.test');
  assert.ok(url.pathname.startsWith('/thaleolithic/Build/'));
  const file=path.join(root,decodeURIComponent(url.pathname));
  const buffer=fs.readFileSync(file);bytes+=buffer.length;
  assert.ok(buffer.length>0&&buffer.length<100*1024*1024,`${key}: GitHub file size limit`);
  assert.equal(url.searchParams.get('v'),crypto.createHash('sha256').update(buffer).digest('hex').slice(0,12),`${key}: cache hash`);
  if(key==='loaderUrl')new vm.Script(buffer.toString('utf8'));
  else {
    assert.equal(buffer.readUInt16BE(0),0x1f8b,`${key}: Gzip fallback payload`);
    if(key==='codeUrl')assert.deepEqual(zlib.gunzipSync(buffer).subarray(0,4),Buffer.from([0,97,115,109]));
    if(key==='frameworkUrl')new vm.Script(zlib.gunzipSync(buffer).toString('utf8'));
  }
}
for(const name of config.chapterBundles??[]){
  assert.match(name,/^iso-\d{2}-[a-f0-9]{12}\.bundle$/);
  const bundle=fs.readFileSync(path.join(game,'StreamingAssets',name));
  assert.equal(bundle.subarray(0,7).toString(),'UnityFS');
  assert.ok(name.endsWith('-'+crypto.createHash('sha256').update(bundle).digest('hex').slice(0,12)+'.bundle'));
}
const html=fs.readFileSync(path.join(game,'index.html'),'utf8');
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.Script(match[1]);
const bridge=fs.readFileSync(path.join(game,'browser-bridge.js'),'utf8');
new vm.Script(bridge);
assert.match(bridge,/autoSyncPersistentDataPath:\s*true/);
assert.ok(html.includes('viewport-fit=cover'));
assert.ok(html.includes('safe-area-inset-left'));
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
console.log(`THALEOLITHIC publication: valid WebAssembly, Gzip payloads, cache hashes, JavaScript, illustration and legacy redirect. ${(bytes/1048576).toFixed(1)} MiB.`);
