/** Entry curves transcribed from Shopify build 5090151, controller Ys and pack v.
 * Seconds are presentation time. The original controller advances at 1.18x.
 * Positions use the calibrated portfolio graph, not Shopify's force simulation.
 */
const clamp = x => Math.max(0, Math.min(1, x));
export const INTRO_SPEED = 1.18;
export function introRanks(indices) {
  const gcd = (a,b) => b ? gcd(b,a%b) : a;
  let stride = Math.max(1, Math.floor(indices.length/2));
  while(stride>1 && gcd(stride,indices.length)!==1) stride--;
  const sorted=[...indices].sort((a,b)=>a-b);
  return indices.map(i=>sorted.indexOf(i)*stride%indices.length);
}
export function introSample(seconds, birth=0, leaf=false, reduced=false) {
  if(reduced) return {travel:1,reach:1,reveal:1,scale:1,spin:0};
  const t=Math.max(0,seconds)*INTRO_SPEED;
  const travel=clamp((t-birth)/(1.1*(leaf?.9:1)));
  const b=clamp((t-.25)/1.75), out=1-(1-b)**3;
  const inout=b<.5?4*b**3:1-(-2*b+2)**3/2;
  const breath=5.6**(1-(out+(inout-out)*.2));
  const reveal=Math.min(1,travel*6);
  return {travel,reach:1-(1-travel)**5,reveal,
    scale:reveal*(1+Math.sin(Math.PI*travel)*.7)*breath,
    spin:(leaf?-67:-180)*Math.PI/180*(1-clamp(t/3))**5 || 0};
}
export function applyHeroIntro(ciel, seconds, width, height, reduced=false) {
  const hubs=[...ciel.etoiles.values()].filter(e=>e.parent==='accueil');
  const sorted=hubs.map((e,index)=>({e,index})).sort((a,b)=>a.e.id.localeCompare(b.e.id));
  const ranks=introRanks(sorted.map(e=>e.index));
  let done=seconds*INTRO_SPEED>=3, labelAt=3;
  for(let i=0;i<sorted.length;i++){
    const e=sorted[i].e;
    if(!e.centre)continue;
    const birth=ranks[i]*.07, sample=introSample(seconds,birth,false,reduced);
    const dx=e.centre[0]-width/2,dy=e.centre[1]-height/2;
    const c=Math.cos(sample.spin),s=Math.sin(sample.spin);
    e.centre=[width/2+(dx*c-dy*s)*sample.reach,height/2+(dx*s+dy*c)*sample.reach,e.centre[2]];
    e.intro=sample;
    labelAt=Math.max(labelAt,birth+.45+Math.max(0,e.noeuds.length-1)*.025+.99);
    e.noeuds.forEach((n,j)=>{
      n.intro=introSample(seconds,birth+.45+j*.025,true,reduced);
      done &&= n.intro.travel===1;
    });
  }
  const labels=reduced?1:clamp((seconds*INTRO_SPEED-labelAt)/.35);
  for(const e of hubs)e.introLabel=labels*labels*(3-2*labels);
  return reduced||done;
}
