// Les fourchettes combinent les volumes et durées fournis, sans arrondir les étapes.
export const ANNUAL_DAYS = 225;
export const ANNUAL_RATE = 104.74;
const hours=(minutes,volume)=>minutes*volume/60;
const row=(id,title,min,max,basis,estimated=false)=>({id,title,minHours:min,maxHours:max,basis,estimated,minMoney:min*ANNUAL_RATE,maxMoney:max*ANNUAL_RATE});
export const ANNUAL_GAINS=[
 row('finance','Point financier',hours(25,ANNUAL_DAYS),hours(25,ANNUAL_DAYS),'25 min/jour × 225 jours/an'),
 row('vmvre','VRE / VLE · VM',hours(30,4000),hours(30,5000),'30 min × 4 000–5 000 rapports/an'),
 row('moteur44','Moteur V4.4',hours(15,4000),hours(15,5000),'15 min × 4 000–5 000 rapports/an'),
 row('vre','Extracteur VRE',hours(25,4000),hours(25,5000),'25 min × 4 000–5 000 rapports/an ; capacité théorique',true),
 row('powerbi','PP & MOSO · traitement',hours(15,400),hours(20,500),'15–20 min × 400–500 plans/an'),
 row('pp-consultation','PP & MOSO · consultation',hours(10,40*ANNUAL_DAYS),hours(10,40*ANNUAL_DAYS),'10 min × 40 consultations/jour × 225 jours/an',true),
 row('gares','Gares prioritaires',hours(10,20*ANNUAL_DAYS),hours(15,30*ANNUAL_DAYS),'10–15 min × 20–30 consultations/jour × 225 jours/an',true)
];
const sumOf=(rows)=>rows.reduce((a,r)=>({minHours:a.minHours+r.minHours,maxHours:a.maxHours+r.maxHours,minMoney:a.minMoney+r.minMoney,maxMoney:a.maxMoney+r.maxMoney}),{minHours:0,maxHours:0,minMoney:0,maxMoney:0});
export const ANNUAL_TOTAL=sumOf(ANNUAL_GAINS);
// Deux niveaux de fiabilité : volumes fournis, et estimations (capacité théorique, consultations supposées).
export const ANNUAL_DECLARED=sumOf(ANNUAL_GAINS.filter(r=>!r.estimated));
export const ANNUAL_ESTIMATED=sumOf(ANNUAL_GAINS.filter(r=>r.estimated));
// Un poste à temps plein = 225 jours de 7 h.
export const HOURS_PER_FTE=ANNUAL_DAYS*7;
// Coût : six outils, construits en 4 à 9 jours de 7 h, puis une demi-journée d'amélioration par mois.
const TOOLS=6;
export const ANNUAL_COST={tools:TOOLS,buildMin:TOOLS*4*7,buildMax:TOOLS*9*7,upkeep:TOOLS*12*3.5};
// Gain net de l'année 1 sur les volumes fournis : la fourchette basse retire le coût haut.
export const ANNUAL_NET={minHours:ANNUAL_DECLARED.minHours-ANNUAL_COST.buildMax-ANNUAL_COST.upkeep,maxHours:ANNUAL_DECLARED.maxHours-ANNUAL_COST.buildMin-ANNUAL_COST.upkeep};
ANNUAL_NET.minMoney=ANNUAL_NET.minHours*ANNUAL_RATE;ANNUAL_NET.maxMoney=ANNUAL_NET.maxHours*ANNUAL_RATE;

export function calendarGainState(date,total=ANNUAL_DECLARED){
 const year=date.getFullYear(),start=new Date(year,0,1),end=new Date(year+1,0,1);
 const fraction=Math.max(0,Math.min(1,(date-start)/(end-start)));
 return {year,fraction,minHours:total.minHours*fraction,maxHours:total.maxHours*fraction,minMoney:total.minMoney*fraction,maxMoney:total.maxMoney*fraction};
}
export function rollGainHistory(saved,year,total=ANNUAL_DECLARED){
 const state=saved&&Number.isInteger(saved.year)&&saved.year<=year?{...saved,history:[...(saved.history||[])]}:{year,total:{...total},history:[]};
 if(state.year<year){
  if(!state.history.some(x=>x.year===state.year))state.history.push({year:state.year,total:{...state.total}});
  state.year=year;
 }
 state.total={...total};return state;
}

export function euroCoinRhythm(total=ANNUAL_DECLARED,days=225,hoursPerDay=7){
 const workingSeconds=days*hoursPerDay*3600,meanMoney=(total.minMoney+total.maxMoney)/2;
 return {workingSeconds,meanMoney,euroPerSecond:meanMoney/workingSeconds,secondsPerEuro:workingSeconds/meanMoney};
}
