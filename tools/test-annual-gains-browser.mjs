import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_PACKAGE?pathToFileURL(process.env.PLAYWRIGHT_PACKAGE).href:'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),output=path.resolve(root,process.env.SCENE_TEST_OUTPUT||'test-results');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE,args:['--enable-webgl',process.platform==='win32'?'--use-angle=d3d11':'--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});
page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE_ERROR',m.text());}});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**',async route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));try{await route.fulfill({body:await readFile(f),contentType:types[path.extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:u.pathname});}});


if(!process.env.PIGGY_REQUIRE_REFERENCE)await context.route('https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js',r=>r.fulfill({contentType:'text/javascript',body:'window.Sketchfab=class{init(id,options){options.error();}}'}));
try{
 await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/');
 const pig=page.locator('.annual-gains');await pig.waitFor();await pig.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.annual-pig-wrap')?.dataset.piggy==='ready',null,{timeout:90000});
 assert.ok(await pig.locator('.annual-pig-wrap svg').evaluateAll(elements=>elements.every(e=>getComputedStyle(e).display==='none')));
 if(process.env.PIGGY_REQUIRE_REFERENCE)assert.equal(await page.locator('.annual-pig-wrap').getAttribute('data-model'),'6d190692d90a4a9db58131855d8c9f33');
 assert.equal(await page.locator('.annual-pig-wrap').getAttribute('data-coin-asset'),'one-euro-coin-user.glb');assert.equal(await pig.locator('.piggy-credit').count(),0);assert.match(await page.locator('footer .credits').textContent(),/Cerdo hucha.*Legado 3D/);
 assert.match(await page.locator('.automation-cascade').innerText(),/Une production automatisée libère plusieurs équipes/);
 const expectedYear=new Date().getFullYear();assert.equal(await pig.getAttribute('data-calendar-year'),String(expectedYear));
 assert.match(await pig.locator('[data-annual-money]').innerText(),/650/);
 assert.match(await pig.locator('[data-annual-hours]').innerText(),/6.?210/);
 assert.match(await pig.locator('[data-calendar-label]').innerText(),new RegExp(String(expectedYear)));
 await pig.locator('.annual-breakdown summary').click();assert.equal(await pig.locator('tbody tr').count(),7);
 await pig.locator('.annual-breakdown summary').click();
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:1000});await pig.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflows at '+width);
  const b=await pig.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);
  await page.screenshot({path:path.join(output,'tirelire-'+width+'.png'),timeout:120000});
 }
 const model=page.locator('.annual-pig-wrap');const canvas=page.locator('.piggy-3d');await canvas.focus();
 await canvas.press('ArrowRight');const rotation=Number(await model.getAttribute('data-rotation'));assert.ok(rotation>-.45);
 const hit=await canvas.boundingBox();await page.mouse.move(hit.x+hit.width*.3,hit.y+hit.height*.6);await page.mouse.down();await page.mouse.move(hit.x+hit.width*.8,hit.y+hit.height*.6,{steps:8});await page.mouse.up();
 await page.screenshot({path:path.join(output,'rotation-check.png'),timeout:120000});await page.waitForFunction(r=>Math.abs(Number(document.querySelector('.annual-pig-wrap').dataset.rotation)-r)>.4,rotation,{timeout:15000});
 assert.ok(Math.abs(Number(await model.getAttribute('data-coin-interval'))-7.536)<.02);
 await pig.locator('.annual-breakdown summary').click();await pig.locator('[data-working-days]').fill('180');await pig.locator('[data-working-days]').press('Tab');
 assert.ok(Number(await model.getAttribute('data-coin-interval'))<7.536);
 await pig.locator('[data-working-days]').fill('225');await pig.locator('[data-working-days]').press('Tab');await pig.locator('.annual-breakdown summary').click();
 await page.waitForFunction(()=>Number(document.querySelector('.annual-pig-wrap').dataset.coins)>0,null,{timeout:45000});
 if(process.env.PIGGY_REQUIRE_REFERENCE)await page.waitForFunction(()=>{const p=Number(document.querySelector('.annual-pig-wrap').dataset.coinPhase);return p>.05&&p<.18;},null,{timeout:20000});await page.screenshot({path:path.join(output,'tirelire-3d-pieces.png'),timeout:120000});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('cv-annual-gain-history-v1')));
 await page.evaluate(state=>localStorage.setItem('cv-annual-gain-history-v1',JSON.stringify(state)),{...saved,year:expectedYear-1});
 await page.reload();await page.locator('.annual-gains').waitFor();
 const rollover=await page.evaluate(()=>JSON.parse(localStorage.getItem('cv-annual-gain-history-v1')));
 assert.equal(rollover.year,expectedYear);assert.equal(rollover.history.length,1);assert.equal(rollover.history[0].year,expectedYear-1);
 await page.reload();await page.locator('.annual-gains').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cv-annual-gain-history-v1')).history.length),1);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.pig-coin').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);
 await writeFile(path.join(output,'tirelire-validation.json'),JSON.stringify({year:expectedYear,rollover,errors},null,2));
 console.log('PIG_CALENDAR_RESPONSIVE_OK');
}finally{await browser.close();}
