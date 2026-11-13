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
if(!process.env.SCENE_PUBLIC_URL)await context.route('http://scene.test/**',async route=>{const u=new URL(route.request().url()),f=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/gains.html':u.pathname));try{await route.fulfill({body:await readFile(f),contentType:types[path.extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:u.pathname});}});



try{
 /* Ancien contrat : la route « / » du banc servait accueil.html, qui contenait la tirelire. Contrat actuel : la tirelire et le bilan annuel (js/home.js) vivent sur gains.html (page « Gains »), la page d'accueil ne les contient plus. */
 await page.goto(process.env.SCENE_PUBLIC_URL||'http://scene.test/');
 const pig=page.locator('.annual-gains');await pig.waitFor();await pig.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.annual-pig-wrap')?.dataset.piggy==='ready',null,{timeout:90000});
 assert.equal(await pig.locator('.annual-pig-wrap svg').count(),0);
 assert.equal(await page.locator('.annual-pig-wrap').getAttribute('data-model'),'piggy-bank-user');assert.equal(await pig.locator('iframe').count(),0);
 assert.equal(await page.locator('.annual-pig-wrap').getAttribute('data-coin-asset'),'one-euro-coin-user.glb');assert.equal(await pig.locator('.piggy-credit').count(),0);/* Retiré : la cascade d'automatisation (texte « Un processus fiable… ») n'existe plus dans index.html (texte éditorial de l'ancienne accueil). L'attribution CC BY 4.0 de la tirelire est contrôlée en fin de test : elle avait disparu du site à la refonte du 20 octobre 2026 (cb94f8bd), défaut réel corrigé en la remettant dans le pied de page de gains.html. */
 const expectedYear=new Date().getFullYear();
 /* Retiré (fonctionnalité absente du site depuis la refonte du 20 octobre 2026) : année calendaire / bilan « depuis le 1er janvier » / reprise annuelle en localStorage (js/home.js, plus chargé par aucune page), détail en 7 lignes et pièces insérées sous trois angles (balises data-annual-fte, data-annual-hours, .annual-breakdown, data-coin-x absentes de gains.html).
    Contrat actuel contrôlé : chiffres du bilan affichés, intervalle d'une pièce égal à celui affiché, jours travaillés qui le modifient, rotation clavier et souris, absence de débordement à 320 / 768 / 1440 px. */
 const model=page.locator('.annual-pig-wrap'),canvas=page.locator('.piggy-3d');
 const text=await pig.innerText();
 assert.match(text,/postes équivalents/);assert.match(text,/\d[\d   ]*h\b/);assert.match(text,/€\/h/);assert.match(text,/par pièce de 1 €/);
 const shown=Number(((text.match(/(\d+[,.]\d+)\s*s\s+par pièce/)||[])[1]||'NaN').replace(',','.'));
 assert.ok(Math.abs(shown-Number(await model.getAttribute('data-coin-interval')))<.02,'L\'intervalle de la pièce doit être celui affiché ('+shown+' s)');
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:1000});await pig.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflows at '+width);
  const b=await pig.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width+1);
  await page.screenshot({path:path.join(output,'tirelire-'+width+'.png'),timeout:120000});
 }
 /* Ancien contrat : rotation au clavier et au glisser sur le canvas. Contrat actuel (body.rf-gx-page) : le canvas ne reçoit plus le pointeur, la vue se règle avec les règles « Tourner » / « Incliner » qui émettent l'événement rf-tabview (js/piggy-bank.js, turn()). */
 assert.equal(await canvas.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('rf-tabview',{detail:{dYaw:0,dPitch:0}})));
 const rotation=Number(await model.getAttribute('data-rotation'));assert.ok(Number.isFinite(rotation));
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('rf-tabview',{detail:{dYaw:.9,dPitch:.2}})));
 assert.ok(Math.abs(Number(await model.getAttribute('data-rotation'))-rotation)>.4,'La règle Tourner doit faire pivoter la tirelire');assert.equal(Number(await model.getAttribute('data-tilt')),.2);
 await page.screenshot({path:path.join(output,'rotation-check.png'),timeout:120000});
 const before=Number(await model.getAttribute('data-coin-interval'));
 await page.evaluate(()=>{const i=document.querySelector('[data-working-days]');i.value=String(Number(i.value)-45);i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForFunction(b=>Number(document.querySelector('.annual-pig-wrap').dataset.coinInterval)!==b,before,{timeout:15000});
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.pig-coin').count(),0);
 assert.deepEqual(errors,[]);
 await writeFile(path.join(output,'tirelire-validation.json'),JSON.stringify({year:expectedYear,errors},null,2));
 assert.match(await page.locator('footer .credits').textContent(),/Piggy Bank.*mistour.*CC BY 4\.0/s,'Attribution CC BY 4.0 de la tirelire absente du pied de page');
 console.log('PIG_CALENDAR_RESPONSIVE_OK');
}finally{await browser.close();}
