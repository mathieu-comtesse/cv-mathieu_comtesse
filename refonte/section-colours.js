import {fonduChapitre} from './moteur.js?v=m36';
export function transitionsPapier(source,height,top){
  if(!source)return [];
  const target='[data-cv-floor],[data-f26-page-section][data-html-in-canvas-colour]';
  const distance=height*.4;
  return [...source.querySelectorAll(target)].map(el=>({
    row:top(el),colour:el.dataset.cvFloor||el.dataset.htmlInCanvasColour
  })).sort((a,b)=>a.row-b.row).map(({row,colour},i,ordered)=>{
    const centre=row+height*.15;
    const debut=Math.max(i?(ordered[i-1].row+row)/2+height*.15:0,centre-distance/2);
    const fin=Math.min(ordered[i+1]?(ordered[i+1].row+row)/2+height*.15:Infinity,centre+distance/2);
    return {debut,fin,colour};
  });
}
export function couleurPapier(transitions,y,reduced){
  let colour='#051DAA';
  for(const next of transitions){
    if(y<next.debut)break;
    if(y>=next.fin){colour=next.colour;continue;}
    const w=reduced?Number(y>=(next.debut+next.fin)/2):fonduChapitre(y,next.debut,next.fin-next.debut);
    return 'color-mix(in oklab, '+colour+' '+((1-w)*100)+'%, '+next.colour+')';
  }
  return colour;
}
