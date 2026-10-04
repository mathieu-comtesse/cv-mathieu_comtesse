// node tools/demo-gares/record.cjs <dossier-sortie>  : joue demo.html (curseur animé) et enregistre une vidéo webm 1280x790.
const {chromium}=require(process.env.PW||'/opt/node22/lib/node_modules/playwright');
const path=require('path'),fs=require('fs');
(async()=>{const out=path.resolve(process.argv[2]||'.');fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1280,height:790},recordVideo:{dir:out,size:{width:1280,height:790}}});
const p=await ctx.newPage();p.on('pageerror',e=>{console.error('ERR',e.message);process.exitCode=1});
await p.goto('file://'+path.join(__dirname,'demo.html'));
await p.evaluate(()=>window.demo());
await p.screenshot({path:path.join(out,'poster.png')});
const v=p.video();await ctx.close();console.log(await v.path());await b.close()})();
