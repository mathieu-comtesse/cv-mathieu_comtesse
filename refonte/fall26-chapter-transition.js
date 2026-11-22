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

/** Shared geometric handover for both the flat and Expo chapter stars.
 * Index refers to the editorial chapter order, not the hub topology.
 * The function is stateless, reversible and never makes an inactive star visible.
 */
export function chapterStarPose(index,handover){
  const {from=-1,to=-1,active=-1,progress=0}=handover||{};
  const cross=from!==to;
  const p=clamp01(progress);
  const weight=!cross?(index===active?1:0):index===from?1-p:index===to?p:0;
  const scale=.48+.52*weight;
  const angle=!cross?0:index===from?p*.18:index===to?-(1-p)*.18:0;
  return {weight,scale,angle,participating:cross&&(index===from||index===to)};
}

// The reference transition displays two distinct constellations, not two
// superimposed radial fans. These positions were estimated from the 4.5–13 s
// segment of Video Project 5.mp4 (portrait recording, 612 x 1080 crop).
// At the midpoint the incoming centre is near (0.54W, 0.42H) and the
// outgoing centre near (0.49W, 0.72H). At both ends the visible star returns
// to its natural focal point (0.60W, 0.56H).
export function chapterStarAnchor(index,handover,width,height){
  const W=Math.max(1,Number(width)||1),H=Math.max(1,Number(height)||1);
  const {from=-1,to=-1,active=-1,progress=0}=handover||{};
  const p=clamp01(progress),baseX=W<760?.50:.60;
  if(from===to||index===active&&!(index===from||index===to))
    return {x:W*baseX,y:H*.56};
  if(index===from){
    const travel=smooth(p);
    return {x:W*(baseX-.22*travel),y:H*(.56+.32*travel)};
  }
  if(index===to){
    const travel=smooth(1-p);
    return {x:W*(baseX-.12*travel),y:H*(.56-.28*travel)};
  }
  return {x:W*baseX,y:H*.56};
}

// The source video has a soft, vertically travelling colour band at a chapter
// boundary: at mid-crossfade the middle is already strongly tinted by the
// next chapter while the top/bottom still retain the previous chapter.
// The pulse vanishes at progress 0 and 1, leaving exact solid end colours.
export function chapterColourWave(from,to,progress){
  const p=clamp01(progress),pulse=4*p*(1-p);
  return {
    top:mixHex(from,to,clamp01(p-.18*pulse)),
    middle:mixHex(from,to,clamp01(p+.25*pulse)),
    bottom:mixHex(from,to,clamp01(p-.30*pulse))
  };
}
