// Différentiel visuel de référence : Shopify Editions Fall 2026 vs comtesse.me.
// Exécution locale : node tools/shopify/hover-parity.mjs
// VARIABLES : REFERENCE, TARGET, OUT, HEADLESS=0
// Le script ne copie pas les ressources de Shopify et ne modifie aucun site.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = req("playwright")); }
catch { ({ chromium } = createRequire("/tmp/q18/")("playwright")); }

const REF = process.env.REFERENCE || "https://www.shopify.com/editions/fall2026";
const TARGET = process.env.TARGET || "https://comtesse.me/";
const OUT = path.resolve(process.env.OUT || "tmp/shopify-hover-parity");
const HEADLESS = process.env.HEADLESS !== "0";
fs.mkdirSync(OUT,{recursive:true});
const profiles = [
  { id:"navigation", ref:'.hero-nav-link', target:'.hero-nav-link' },
  { id:"cadre-projet", ref:'.product-card', target:'.product-card' },
  { id:"navigation-index", ref:'[data-component-name="menu-item-link"]', target:'[data-component-name="menu-item-link"]' },
  { id:"bouton-entete", ref:'a[href*="signup"]', target:'.cv-site-nav .cv-contact-button' }
];
const props = [
  "fontFamily","fontSize","fontWeight","lineHeight","letterSpacing",
  "color","backgroundColor","backgroundImage","border","borderRadius",
  "outline","boxShadow","filter","backdropFilter","transform","opacity",
  "textDecoration","transition","cursor"
];
async function state(el) {
  return el.evaluate((node,props) => {
    const css=getComputedStyle(node);
    const rect=node.getBoundingClientRect();
    const out={rect:{x:+rect.x.toFixed(1),y:+rect.y.toFixed(1),w:+rect.width.toFixed(1),h:+rect.height.toFixed(1)}};
    for(const p of props) out[p]=css[p]||"";
    return out;
  },props);
}
async function shot(el,file) {
  try { await el.screenshot({path:file,timeout:10000,animations:"disabled"});return file; }
  catch(e){return "ERROR: "+String(e.message).slice(0,120);}
}
const browser=await chromium.launch({headless:HEADLESS,args:["--use-gl=swiftshader","--enable-unsafe-swiftshader"]});
const report={reference:REF,target:TARGET,viewport:{width:1440,height:900},created:new Date().toISOString(),cases:[]};
try {
  const pages={};
  for(const [k,url] of [["ref",REF],["target",TARGET]]) {
    const p=pages[k]=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"no-preference"});
    await p.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
    await p.waitForTimeout(1000);
  }
  for(const p of profiles) {
    const entry={id:p.id,selectors:{reference:p.ref,target:p.target},sources:{}};
    for(const [side,selector] of [["ref",p.ref],["target",p.target]]) {
      const page=pages[side],el=page.locator(selector).first();
      const key=side==="ref"?"shopify":"comtesse";
      try {
        if(!(await el.count())){entry.sources[key]={status:"selector missing"};continue;}
        await el.scrollIntoViewIfNeeded({timeout:15000});
        await page.waitForTimeout(250);
        const before=await state(el),beforeShot=await shot(el,path.join(OUT,p.id+"-"+key+"-before.png"));
        await el.hover({timeout:15000});
        await page.waitForTimeout(420);
        const after=await state(el),afterShot=await shot(el,path.join(OUT,p.id+"-"+key+"-hover.png"));
        entry.sources[key]={status:"captured",before,after,images:[beforeShot,afterShot]};
      }catch(e){entry.sources[key]={status:"error",message:String(e.message).slice(0,200)};}
    }
    const a=entry.sources.shopify,b=entry.sources.comtesse;
    if(a?.status==="captured"&&b?.status==="captured"){
      const changes={};
      for(const k of props){
        changes[k]={shopify:{before:a.before[k],after:a.after[k]},comtesse:{before:b.before[k],after:b.after[k]},
          exact:a.before[k]===b.before[k]&&a.after[k]===b.after[k]};
      }
      entry.comparison=changes;
    }
    report.cases.push(entry);
    console.log(p.id,entry.sources.shopify?.status,entry.sources.comtesse?.status);
  }
  // Régressions : un curseur natif doit rester disponible en tactile et
  // lorsque l'utilisateur demande une réduction des animations.
  const target=pages.target;
  for(const type of ["touch","reduced-motion"]){
    const ctx=await browser.newContext(type==="touch"
      ? {viewport:{width:390,height:844},isMobile:true,hasTouch:true}
      : {viewport:{width:1440,height:900},reducedMotion:"reduce"});
    const page=await ctx.newPage();
    try{
      await page.goto(TARGET,{waitUntil:"domcontentloaded",timeout:45000});
      report[type]={cursorMode:await page.evaluate(()=>document.documentElement.classList.contains("cm-cursor")),
        bodyCursor:await page.evaluate(()=>getComputedStyle(document.body).cursor)};
    }catch(e){report[type]={error:String(e.message).slice(0,200)};}
    await ctx.close();
  }
}finally{await browser.close();}
const file=path.join(OUT,"report.json");
fs.writeFileSync(file,JSON.stringify(report,null,2));
console.log("Rapport comparatif :",file);
