/* Deterministic world model shared by the browser and regression tests.
   Distances are metres along the road; lateral values are road units (one lane ≈ 50). */
(function(root){
'use strict';
const center=d=>Math.sin(d*.004)*46+Math.sin(d*.009)*18;
const vehicles={
 sedan:{name:'Berline',article:'une berline',width:20,length:48},
 van:{name:'Utilitaire',article:'un utilitaire',width:22,length:56},
 truck:{name:'Camion',article:'un camion',width:24,length:70},
 city:{name:'Citadine',article:'une citadine',width:18,length:40}
};
const limits=[30,50,70,90];
// Kinds 0-2 are trees and 3 is a house: solid. 4 and 5 are a field and a hedge line, which a car ploughs through.
const solidScenery={0:'un arbre',1:'un arbre',2:'un arbre',3:'un bâtiment'};
class RoadRun{
 constructor(seed=1783,settings={}){this.seed=seed>>>0;this.initialSeed=this.seed;this.settings=settings;this.time=0;this.distance=0;this.speed=0;this.throttle=0;this.brakeForce=0;this.x=25;this.heading=0;this.collisions=0;this.violations=0;this.offroad=0;this.offroadNow=false;this.leftRoad=false;this.running=true;this.crashed=false;this.message='Accélérer progressivement avec Maj gauche. Anticiper les freinages.';this.flash=0;this.limit=50;this.speeding=0;this.objects=[];this.scenery=[];this.generated=-1;this.history=[];this.stopReason='';this.advice={action:'Maintenir',reason:'Couloir dégagé.',scores:{Maintenir:1,Freiner:0,'Changer de voie':0,'Arrêt d’urgence':0}};this.populate();}
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 populate(){
  while(this.generated<Math.floor(this.distance/55)+14){
   const n=++this.generated,d=n*55+120,r=this.random();
   if(n%5===2)this.objects.push({type:'junction',d,rule:['light','stop','yield'][Math.floor(n/5)%3],phase:this.random()*8,stopped:0,passed:false,cross:280});
   else if(n%7===4)this.objects.push({type:'sign',d,limit:limits[Math.floor(this.random()*limits.length)],passed:false});
   else if(r<.14)this.objects.push({type:'ped',d,phase:this.random()*12,passed:false});
   else if(r<.30)this.objects.push({type:'barrier',d,lane:[-25,25,75][Math.floor(this.random()*3)],kind:this.random()<.5?'barrier':'bin',passed:false});
   else{const kind=['sedan','van','truck','city'][Math.floor(this.random()*4)],oncoming=this.random()<.55,lane=oncoming?(this.random()<.5?-25:-75):(this.random()<.5?25:75);
    this.objects.push({type:'car',kind,...vehicles[kind],d,lane,velocity:oncoming?-(11+this.random()*9):8+this.random()*7,passed:false,color:['#ea7953','#558cf0','#22ba98','#ec4e83','#f2c744'][n%5]});}
   for(let side of [-1,1])for(let k=0;k<9;k++)this.scenery.push({d:d+k*6.1,x:side*(142+this.random()*120),kind:Math.floor(this.random()*6),scale:.7+this.random()*.8,tone:Math.floor(this.random()*3)});
  }
  this.objects=this.objects.filter(o=>o.d>this.distance-60);this.scenery=this.scenery.filter(o=>o.d>this.distance-70);
 }
 infraction(message){this.violations++;this.flash=1.2;this.message=message;}
 crash(message){if(!this.running)return;this.collisions++;this.crashed=true;this.running=false;this.impactSpeed=this.speed;this.speed=0;this.flash=1.2;this.stopReason='accident';this.message=message+' — trajet interrompu.';}
 // Lateral position of an object relative to the road centre at the player's distance.
 lateral(o){return(o.type==='ped'?Math.sin(this.time*.65+o.phase)*95:o.lane)+center(o.d)-center(this.distance);}
 assess(){
  const scores={Maintenir:1,Freiner:0,'Changer de voie':0,'Arrêt d’urgence':0};let reason='Couloir dégagé.';let action='Maintenir';
  const brakingDistance=8+this.speed*this.speed/130;
  for(const o of this.objects){const gap=o.d-this.distance;if(gap<-4||gap>brakingDistance+40)continue;const lateral=o.type==='junction'?0:this.lateral(o);
   if(o.type==='ped'){const onRoad=Math.abs(lateral)<110;if(onRoad&&gap<brakingDistance+15){scores.Freiner+=1.4;reason='Piéton engagé sur le passage à '+Math.round(gap)+' m : freiner avant la traversée.';if(gap<brakingDistance*.6)scores['Arrêt d’urgence']+=.9;}}
   else if(o.type==='car'&&Math.abs(lateral-this.x)<26){const closing=this.speed/3.6-o.velocity;if(closing>0&&gap<brakingDistance+10){const ttc=gap/closing;scores.Freiner+=1;scores['Changer de voie']+=.6;reason=`${o.name} devant à ${Math.round(gap)} m, ${Math.round(Math.abs(o.velocity)*3.6)} km/h (TTC ${ttc.toFixed(1)} s).`;if(ttc<1.2)scores['Arrêt d’urgence']+=1.2;}}
   else if(o.type==='barrier'&&Math.abs(lateral-this.x)<26&&gap<brakingDistance+20){scores['Changer de voie']+=1.3;scores.Freiner+=.4;reason=(o.kind==='bin'?'Conteneur immobile':'Barrière de chantier')+' dans la voie à '+Math.round(gap)+' m : changer de voie.';}
   else if(o.type==='junction'&&gap<brakingDistance+25){if(o.rule==='light'&&o.red){scores.Freiner+=1.5;reason='Feu rouge à '+Math.round(gap)+' m : s’arrêter à la ligne.';}else if(o.rule==='stop'){scores.Freiner+=1.2;reason='Stop à '+Math.round(gap)+' m : marquer l’arrêt.';}else if(o.rule==='yield'&&o.cross>0&&o.cross<200){scores.Freiner+=1;reason='Véhicule prioritaire à droite : céder le passage.';}}
  }
  if(this.speed>this.limit+8){scores.Freiner+=.5;if(reason==='Couloir dégagé.')reason=`Vitesse ${Math.round(this.speed)} km/h au-dessus de la limite ${this.limit}.`;}
  const total=Object.values(scores).reduce((a,b)=>a+b,0);for(const k in scores)scores[k]=scores[k]/total;
  action=Object.keys(scores).reduce((a,b)=>scores[b]>scores[a]?b:a);this.advice={action,reason,scores};
 }
 step(dt,raw={}){
  if(!this.running)return;dt=Math.min(.04,dt);this.time+=dt;this.flash=Math.max(0,this.flash-dt);
  const alcohol=Number(this.settings.alcohol)||0,drug=this.settings.drug==='none'?0:Number(this.settings.level)||0;
  this.history.push({time:this.time,...raw});const delay=alcohol*.16+drug*(this.settings.drug==='sedating'?.5:.2);
  while(this.history.length>1&&this.history[1].time<=this.time-delay)this.history.shift();const input=this.history[0];
  // Pedals build up progressively; thrust fades with speed (drag) and braking peaks near 0.85 g.
  this.throttle=Math.max(0,Math.min(1,this.throttle+(input.gas?dt/.7:-dt/.35)));this.brakeForce=Math.max(0,Math.min(1,this.brakeForce+(input.brake?dt/.45:-dt/.25)));
  const thrust=this.throttle*Math.max(0,15-this.speed*.085),coast=2.5+this.speed*.022+this.speed*this.speed*.00012,braking=this.brakeForce*30;
  this.speed=Math.max(0,Math.min(160,this.speed+(thrust-coast-braking)*dt));
  const oldD=this.distance;this.distance+=this.speed/3.6*dt;
  const steering=(input.right?1:0)-(input.left?1:0);this.heading+=(steering*.44-this.heading*5)*dt;
  this.x+=this.heading*this.speed*1.6*dt-(center(this.distance)-center(oldD));
  this.x+=Math.sin(this.time*2.5)*Math.min(1,alcohol*.4+drug*.5)*this.speed*.025*dt;
  this.x=Math.max(-300,Math.min(300,this.x));
  const wasOff=this.offroadNow;this.offroadNow=Math.abs(this.x)>110;
  if(this.offroadNow){this.offroad+=dt;this.speed=Math.max(0,this.speed-16*dt);
   // Loose ground: the car drags, wanders and no longer holds the line.
   this.heading+=Math.sin(this.time*8.7+this.x*.03)*.55*dt*Math.min(1,this.speed/45);
   if(!wasOff&&this.speed>15&&!this.leftRoad){this.leftRoad=true;this.infraction('Sortie de route : bas-côté');}
   if(Math.abs(this.x)>256&&this.speed>10){this.crash('Sortie de route : fossé');return;}}
  else if(wasOff)this.leftRoad=false;
  // Sustained speeding past a posted limit counts once, then leaves a grace period.
  if(this.speed>this.limit+8){this.speeding+=dt;if(this.speeding>1.5){this.infraction(`Excès de vitesse : ${Math.round(this.speed)} km/h pour ${this.limit}`);this.speeding=-6;}}else if(this.speeding>0)this.speeding=0;else this.speeding=Math.min(0,this.speeding+dt);
  this.populate();
  for(const o of this.objects){
   const oldGap=o.d-oldD;if(o.type==='car')o.d+=o.velocity*dt;const gap=o.d-this.distance;
   if(o.type==='junction'){
    o.red=Math.floor((this.time+o.phase)/6)%2===0;
    o.cross=o.rule==='light'&&!o.red?280:260-((this.time*95+o.phase*50)%520);
    if(gap>=6&&gap<=22&&this.speed<1)o.stopped+=dt;
    if(!o.passed&&gap<=6){if(o.rule==='light'&&o.red)this.infraction('Feu rouge franchi');if(o.rule==='stop'&&o.stopped<.7)this.infraction('Arrêt au stop non respecté');if(o.rule==='yield'&&o.cross>0&&o.cross<150)this.infraction('Priorité à droite non respectée');o.passed=true;}
    if(Math.abs(gap)<4&&Math.abs(this.x-o.cross)<26){this.crash('Collision au croisement');break;}
   }else if(o.type==='sign'){if(!o.passed&&gap<=0){o.passed=true;this.limit=o.limit;this.speeding=Math.min(this.speeding,0);}}
   else{
    const lateral=this.lateral(o);
    const reach=o.type==='car'?o.length/20+2.4:o.type==='ped'?1.2:2;
    const near=Math.abs(gap)<reach||(oldGap>0&&gap<0);
    if(near&&Math.abs(this.x-lateral)<(o.type==='ped'?16:o.type==='car'?(o.width+20)/2:24)){
     this.crash(o.type==='car'?`Accident avec ${o.article}`:o.type==='ped'?'Accident avec un piéton':'Collision avec un obstacle');break;
    }
    if(o.type==='ped'&&!o.passed&&gap<=0){o.passed=true;if(this.speed>20&&Math.abs(lateral)<110)this.infraction('Priorité au piéton non respectée');}
   }
  }
  if(this.running)for(const o of this.scenery){
   const what=solidScenery[o.kind];if(!what)continue;
   const gap=o.d-this.distance,oldGap=o.d-oldD,reach=1.4+o.scale*1.6;
   if(!(Math.abs(gap)<reach||(oldGap>0&&gap<0)))continue;
   const lateral=o.x+center(o.d)-center(this.distance);
   if(Math.abs(this.x-lateral)<12+o.scale*14&&this.speed>10){this.crash('Sortie de route : '+what+' percuté');break;}
  }
  this.assess();
  if(this.running&&this.time>=90){this.running=false;this.stopReason='complete';this.message='Trajet terminé.';}
 }
}
const api={RoadRun,center,vehicles};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RoadModel=api;
})(typeof window!=='undefined'?window:globalThis);
