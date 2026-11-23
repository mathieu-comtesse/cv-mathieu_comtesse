const palette={
  '#051DAA':[.0444,.1135,.638],
  '#B2005B':[.638,.0444,.3511],
  '#00632E':[.02,.38,.2],
  '#B03400':[.6358,.2414,.0442],
  '#7000A9':[.4005,.0444,.638],
  '#0F0F0F':[.0573,.0573,.0573],
  '#262626':[.14902,.14902,.14902],
};
const tones={
  '#051DAA':[.0595,.1318,.6805],
  '#B2005B':[.6808,.0592,.3804],
  '#00632E':[.0299,.4301,.23],
  '#B03400':[.6992,.2736,.0608],
  '#7000A9':[.4322,.0592,.6808],
  '#0F0F0F':[.0901,.0901,.0901],
  '#262626':[.18,.18,.18]
};
export const tonePapier=colour=>tones[colour]||tones['#051DAA'];
const base='#051DAA', limit=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const p3=rgb=>'color(display-p3 '+rgb.join(' ')+')';
const triplet=key=>palette[key]||palette[base];
const mix=(a,b,k,space='oklab')=>'color-mix(in '+space+', '+a+' '+(100-100*k)+'%, '+b+')';
export function transitionsPapier(source,height,rect){
  if(!source)return [];
  const style=getComputedStyle(document.documentElement),raw=style.getPropertyValue('--f26-crossfade-distance');
  const distance=raw.endsWith('px')&&parseFloat(raw)>1?parseFloat(raw):height*.4;
  const line=parseFloat(style.getPropertyValue('--f26-crossfade-line'))||.5;
  const selectors='[data-cv-floor],[data-f26-page-section][data-html-in-canvas-colour]';
  let previous={colour:base,bottom:-Infinity};
  return [...source.querySelectorAll(selectors)].map(el=>{
    const bounds=rect(el),colour=el.dataset.cvFloor||el.dataset.htmlInCanvasColour;
    const rawLead=getComputedStyle(el).getPropertyValue('--f26-entry-lead').trim();
    const lead=el.dataset.cvFloor?0:(rawLead.endsWith('px')&&/^-?\d/.test(rawLead)?parseFloat(rawLead):0);
    return {colour,top:bounds.top,bottom:bounds.bottom,start:bounds.top-height*line-lead+1,distance};
  }).sort((a,b)=>a.top-b.top).map(next=>{
    const entry={...next,from:previous.colour,edge:(Math.min(previous.bottom,next.top)+next.top)/2};
    previous=next;return entry;
  });
}
export function etatCouleur(transitions,scroll,reduced=false){
  let stable=base;
  for(const next of transitions){
    if(next.from===next.colour)continue;
    const progress=(scroll-next.start)/next.distance;
    if(reduced){
      if(progress>=.5)stable=next.colour;
      continue;
    }
    if(progress<=-.82)break;
    if(progress>=1.4){stable=next.colour;continue;}
    const amount=1-(1-limit((progress+.82)/2.22))**3;
    return {stable,from:triplet(next.from),to:triplet(next.colour),colour:next.colour,amount,next};
  }
  return {stable};
}
export function radialCouleur(etat,x,y,W,H){
  const extent=Math.hypot(Math.max(Math.abs(x),Math.abs(W-x)),Math.max(Math.abs(y),Math.abs(H-y)));
  return {x,y,extent,radius:etat.amount*2*extent};
}
export function couleurAuPoint(etat,wave,x,y){
  if(!etat.next)return etat.stable;
  const t=limit((Math.hypot(x-wave.x,y-wave.y)-wave.radius+wave.extent)/wave.extent);
  const a=1-t*t*(3-2*t);
  const from=p3(etat.from),to=p3(etat.to);
  return mix(mix(from,to,a),mix(from,to,a,'hsl shorter hue'),.1);
}
export function couleurBande(band,flat,cover){
  return mix(flat,band.colour,cover,'srgb');
}
export function couchesExpo(transitions,end){
  const starts=[{edge:0,colour:base},...transitions.filter(b=>b.from!==b.colour).map(b=>({edge:Math.max(0,b.edge),colour:b.colour}))];
  return starts.map((band,i)=>({...band,end:starts[i+1]?.edge??end}));
}
