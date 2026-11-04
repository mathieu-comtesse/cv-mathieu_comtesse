const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const n=process.argv[2];const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:800}});
await p.goto('http://localhost:8765/figures-livre/'+n+'.html',{waitUntil:'load'});await p.waitForTimeout(1500);
const data=await p.evaluate(()=>{
 const svg=document.querySelector('.iso-stage svg')||document.querySelector('svg.iso-svg');
 const parse=d=>{const subs=[];let cur=null;const re=/([MLZ])\s*([-\d.]*)\s*([-\d.]*)?/g;for(const m of d.matchAll(/([MLZmlz])([^MLZmlz]*)/g)){const c=m[1].toUpperCase();const nums=m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);if(c==='M'){cur=[[nums[0],nums[1]]];subs.push(cur);}else if(c==='L'){cur.push([nums[0],nums[1]]);}}return subs;};
 const cmds=new Set();const out=[];
 svg.querySelectorAll('.iso-solid').forEach((g,i)=>{const gp=(c)=>g.querySelector(c);const top=gp('.iso-top'),fill=gp('.iso-fill');
  for(const e of g.querySelectorAll('path'))for(const c of (e.getAttribute('d')||'').matchAll(/[A-Za-z]/g))cmds.add(c[0]);
  const col=(e)=>e?getComputedStyle(e).fill:null;
  out.push({i,cls:g.getAttribute('class'),lit:g.hasAttribute('data-lit'),top:top?parse(top.getAttribute('d')):[],fill:fill?parse(fill.getAttribute('d')):[],
   cTop:col(top),cFill:col(fill),shades:[0,1,2,3].map(s=>{const e=g.querySelector('.iso-shade[data-shade="'+s+'"]');return e?{c:col(e),d:parse(e.getAttribute('d'))}:null;}),
   edge:(g.querySelector('.iso-edge')?getComputedStyle(g.querySelector('.iso-edge')).stroke:null),parent:g.parentElement.getAttribute('class')||g.parentElement.tagName});});
 const tubes=[];svg.querySelectorAll('.tb').forEach((g,i)=>{const b=g.querySelector('.tb-body');if(!b)return;tubes.push({i,body:parse(b.getAttribute('d')),c:getComputedStyle(b).fill});});
 return {vb:svg.getAttribute('viewBox'),cmds:[...cmds].join(''),solids:out,tubes};});
fs.writeFileSync(process.argv[3],JSON.stringify(data));console.log('tubes',data.tubes.length);console.log(n,'solides',data.solids.length,'commandes',data.cmds,'vb',data.vb);
console.log(JSON.stringify(data.solids[0]).slice(0,500));
await b.close();})();
