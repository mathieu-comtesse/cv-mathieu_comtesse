// Les fourchettes combinent les volumes et durées fournis, sans arrondir les étapes.
export const ANNUAL_DAYS = 225;
export const ANNUAL_RATE = 104.74;
const hours=(minutes,volume)=>minutes*volume/60;
const row=(id,title,min,max,basis,estimated=false)=>({id,title,minHours:min,maxHours:max,basis,estimated,minMoney:min*ANNUAL_RATE,maxMoney:max*ANNUAL_RATE});
export const ANNUAL_GAINS=[
 row('finance','Point financier',hours(25,ANNUAL_DAYS),hours(25,ANNUAL_DAYS),'25 min/jour × 225 jours/an'),
 row('vmvre','VRE · VM',hours(30,4000),hours(30,5000),'30 min × 4 000–5 000 rapports/an'),
 row('moteur44','Reporteur Q18',hours(15,4000),hours(15,5000),'15 min × 4 000–5 000 rapports/an'),
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
// Coût par outil, en jours de 7 h : construction, puis une amélioration d'une demi-journée par mois (true),
// aucune maintenance (false) ou non précisé (null). Essais auprès des équipes inclus dans la construction.
export const BUILD={
 finance:{days:1.5,upkeep:true},vmvre:{days:4,upkeep:true},moteur44:{days:1,upkeep:true},pa:{days:5,upkeep:false},
 cerfa:{days:0.5,upkeep:null},vre:{days:0.5,upkeep:true},studio:{days:7,upkeep:null},powerbi:{days:4,upkeep:true},
 suivi:{days:0.5,upkeep:false},gares:{days:9,upkeep:false}
};
// Les outils qui produisent le total annuel (la chaîne des PP et Power BI MOSO portent la ligne PP & MOSO).
const COUNTED=['finance','vmvre','moteur44','vre','pa','powerbi','gares'];
export const ANNUAL_COST={tools:COUNTED.length,buildDays:COUNTED.reduce((t,id)=>t+BUILD[id].days,0),upkeepTools:COUNTED.filter(id=>BUILD[id].upkeep).length};
ANNUAL_COST.build=ANNUAL_COST.buildDays*7;ANNUAL_COST.upkeep=ANNUAL_COST.upkeepTools*12*3.5;
// Gain net de l'année 1 sur les volumes fournis.
export const ANNUAL_NET={minHours:ANNUAL_DECLARED.minHours-ANNUAL_COST.build-ANNUAL_COST.upkeep,maxHours:ANNUAL_DECLARED.maxHours-ANNUAL_COST.build-ANNUAL_COST.upkeep};
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
