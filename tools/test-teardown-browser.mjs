// Vérification WebGL des 11 NOUVELLES machines, avec captures navigateur.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const {chromium}=await import(process.env.PLAYWRIGHT_PACKAGE
  ?pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href:'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'test-results/teardown-premium');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,
 executablePath:process.env.PLAYWRIGHT_EXECUTABLE||undefined,
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--disable-features=Vulkan']});
const context=await browser.newContext({viewport:{width:1600,height:980},deviceScaleFactor:1});
const page=await context.newPage();
page.setDefaultTimeout(90000);
const problems=[],results=[];
page.on('pageerror',e=>problems.push('PAGE: '+e.message));
page.on('console',m=>{
 if(m.type()==='error'&&!/WEBGL_debug_renderer_info|GPU stall/i.test(m.text()))
  problems.push('CONSOLE: '+m.text().slice(0,240));
});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
 '.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
await context.route('http://lab.test/**',async route=>{
 const u=new URL(route.request().url());
 const filename=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/teardown-lab.html':u.pathname));
 if(!filename.startsWith(root))return route.fulfill({status:403});
 try{await route.fulfill({body:await readFile(filename),
  contentType:types[path.extname(filename)]||'application/octet-stream'});}
 catch{return route.fulfill({status:404,body:u.pathname});}
});
const ids=['cerfa','vm','vre','moteur','gares','finance','pp','powerbi','suivi','studio','vrestudio-musicbox'];
const names=['CERFA','VM VRE','VRE BT','Q18','GARES','FINANCE','PP','POWERBI','SUIVI','STUDIO','LECTEUR VRE'];
await page.goto('http://lab.test/teardown-lab.html');
for(let i=0;i<ids.length;i++){
 if(i!==1)await page.locator('#projects button').nth(i).click();
 try {
  await page.waitForFunction((id)=>{
    const x=window.__teardownDebug?.();
    return x?.ready===true&&x.selected===id&&document.querySelector('#status')?.hidden===true;
  },ids[i],{timeout:25000});
 } catch(error) {
  const state=await page.evaluate(()=>({
   debug:window.__teardownDebug?.()??null,
   status:document.querySelector('#status')?.textContent,
   project:document.querySelector('#name')?.textContent,
   canvas:!!document.querySelector('#stage canvas'),
   pageUrl:location.href
  }));
  console.error('TEARDOWN_DIAGNOSTIC',JSON.stringify({id:ids[i],state,problems},null,2));
  await page.screenshot({path:path.join(output,'failure-'+ids[i]+'.png')});
  await writeFile(path.join(output,'error.json'),JSON.stringify({id:ids[i],state,problems},null,2));
  throw error;
 }
 await page.waitForTimeout(170);
 const state=await page.evaluate(()=>{
  const x=window.__teardownDebug();
  const canvas=document.querySelector('#stage canvas');
  return {...x,hasWebGL:!!canvas?.getContext('webgl2'),
   width:canvas?.width||0,height:canvas?.height||0};
 });
 assert.equal(state.modules,5,ids[i]+' doit avoir cinq assemblages modélisés');
 assert.ok(state.geometry>=80,ids[i]+' ne contient pas assez de pièces inédites');
 assert.ok(state.hasWebGL,ids[i]+' n’a pas de contexte WebGL');
 await page.screenshot({path:path.join(output,String(i+1).padStart(2,'0')+'-'+ids[i]+'.png')});
 results.push(state);
}
for(let i of [1,5,10]){
 await page.locator('#projects button').nth(i).click();
 await page.waitForFunction(id=>window.__teardownDebug?.().selected===id&&window.__teardownDebug?.().ready,ids[i]);
 await page.locator('.rf-td button[data-mode=exploded]').click();
 await page.waitForTimeout(450);
 assert.equal(await page.evaluate(()=>window.__teardownDebug().mode),'exploded');
 await page.screenshot({path:path.join(output,'exploded-'+ids[i]+'.png')});
 await page.locator('.rf-td button[data-mode=section]').click();
 await page.waitForTimeout(180);
 await page.screenshot({path:path.join(output,'section-'+ids[i]+'.png')});
}
await writeFile(path.join(output,'diagnostic.json'),JSON.stringify({results,problems},null,2));
console.log(JSON.stringify({count:results.length,machines:results.map(x=>({name:x.selected,parts:x.geometry}))},null,2));
await browser.close();
assert.deepEqual(problems,[],'Erreurs du navigateur');
console.log('PASS : les 11 nouvelles machines, les coupes et les démontages sont rendus par un navigateur WebGL.');
