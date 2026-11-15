/*
 * Fall26 chapter handover: one scroll-driven clock for stars and colour.
 * No timers, observer thresholds or chapter-by-chapter CSS animation resets.
 * Section tops are document coordinates and colours are their actual values.
 */
export const clamp01=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
export const smooth=x=>{const p=clamp01(x);return p*p*(3-2*p);};
export function mixHex(a,b,t){
  const parse=value=>{
    const s=String(value||'#051DAA').replace('#','');
    const hex=s.length===3?s.split('').map(v=>v+v).join(''):s;
    return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)||0);
  };
  const x=parse(a),y=parse(b),p=clamp01(t);
  return '#'+x.map((c,i)=>Math.round(c+(y[i]-c)*p).toString(16).padStart(2,'0')).join('').toUpperCase();
}
export function chapterHandover(scrollY,sections,viewportHeight){
  const list=(sections||[]).filter(x=>Number.isFinite(x.top));
  if(!list.length)return {from:-1,to:-1,progress:0,colour:'#051DAA',active:-1};
  const H=Math.max(1,viewportHeight||1);
  // The outgoing star folds while the incoming one grows around the
  // chapter's arrival at approximately the middle of the viewport.
  for(let i=1;i<list.length;i++){
    const centre=list[i].top-H*.55,half=H*.38;
    if(scrollY<centre-half)return {from:i-1,to:i-1,progress:0,colour:list[i-1].colour,active:i-1};
    if(scrollY<=centre+half){
      const progress=smooth((scrollY-centre+half)/(2*half));
      return {from:i-1,to:i,progress,colour:mixHex(list[i-1].colour,list[i].colour,progress),active:progress>=.5?i:i-1};
    }
  }
  const last=list.length-1;
  return {from:last,to:last,progress:1,colour:list[last].colour,active:last};
}
export function chapterColourAtRow(row,sections,viewportHeight){
  // For the 3D floor, the same chromatic transition is sampled in
  // document coordinates, not at viewport row offsets.
  return chapterHandover(row-viewportHeight*.55,sections,viewportHeight).colour;
}
