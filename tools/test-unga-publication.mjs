import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const game=path.join(root,'unga-bunga-45001');
const config=JSON.parse(fs.readFileSync(path.join(game,'game-config.json'),'utf8'));
let bytes=0;
for(const key of ['loaderUrl','dataUrl','frameworkUrl','codeUrl']){
  const url=new URL(config[key],'https://example.test/unga-bunga-45001/');
  assert.equal(url.origin,'https://example.test');
  assert.ok(url.pathname.startsWith('/unga-bunga-45001/Build/'));
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
const html=fs.readFileSync(path.join(game,'index.html'),'utf8');
for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.Script(match[1]);
assert.ok(html.includes('autoSyncPersistentDataPath:true'));
assert.ok(html.includes('viewport-fit=cover'));
assert.ok(html.includes('safe-area-inset-left'));
const legacy=fs.readFileSync(path.join(root,'talas-refonte/index.html'),'utf8');
const script=legacy.match(/<script>([\s\S]*?)<\/script>/)[1];
let destination;
const current=new URL('https://comtesse.me/talas-refonte/?source=ancien&lang=fr#chapitre-2');
vm.runInNewContext(script,{URL,location:{href:current.href,search:current.search,hash:current.hash,replace(value){destination=String(value);}},document:{querySelector(){return {};}}});
assert.equal(destination,'https://comtesse.me/unga-bunga-45001/?source=ancien&lang=fr#chapitre-2');
const post=fs.readFileSync(path.join(root,'projet-talas.html'),'utf8');
assert.ok(post.includes('href="unga-bunga-45001/"'));
assert.ok(post.includes('UNGA BUNGA 45001'));
assert.ok(fs.existsSync(path.join(root,'assets/projets/unga-bunga-45001.webp')));
console.log(`UNGA publication: valid WebAssembly, Gzip payloads, cache hashes, JavaScript, illustration and legacy redirect. ${(bytes/1048576).toFixed(1)} MiB.`);
