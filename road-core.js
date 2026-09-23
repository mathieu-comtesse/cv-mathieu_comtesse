/* Deterministic world model shared by the browser and regression tests.
   Distances are metres along the road; lateral values are road units (nine units ≈ one metre, one lane = 50). */
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
const TOP=220,DITCH=262,WORLD=1000;
// Kinds 0-2 are trees and 3 is a house: solid. 4 and 5 are a field and a hedge line, which a car ploughs through.
const solidScenery={0:'un arbre',1:'un arbre',2:'un arbre',3:'un bâtiment'};
const lcg=seed=>{let s=seed>>>0;return ()=>(s=(s*1664525+1013904223)>>>0)/4294967296;};
class RoadRun{
 constructor(seed=1783,settings={}){this.seed=seed>>>0;this.initialSeed=this.seed;this.settings=settings;this.time=0;this.distance=0;this.speed=0;this.throttle=0;this.brakeForce=0;this.x=25;this.heading=0;
  this.collisions=0;this.victims=0;this.damage=0;this.stun=0;this.stillBrake=0;this.lastCrash=null;this.violations=0;this.offroad=0;this.offroadNow=false;this.leftRoad=false;this.running=true;this.crashed=false;
  this.message='Accélérer avec Maj gauche ou Z. Anticiper les freinages.';this.flash=0;this.limit=50;this.speeding=0;this.objects=[];this.scenery=[];this.generated=-1;this.history=[];this.stopReason='';
  this.advice={action:'Maintenir',reason:'Couloir dégagé.',scores:{Maintenir:1,Freiner:0,'Changer de voie':0,'Arrêt d’urgence':0}};
  // The countryside beyond the ditch has its own generator, so the course itself only depends on the seed.
  this.decor=lcg(this.seed^0x9e3779b9);for(let d=-70;d<120;d+=6.1)for(const side of [-1,1])this.scenery.push(this.tree(d,side*(142+this.decor()*120)));
  for(let d=-70;d<120;d+=55)this.countryside(d);this.populate();}
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 tree(d,x){const r=this.decor;return {d,x,kind:Math.floor(r()*6),scale:.7+r()*.8,tone:Math.floor(r()*3)};}
 countryside(d){const r=this.decor;for(const side of [-1,1])for(let k=0;k<7;k++){const item=this.tree(d+r()*55,side*(290+r()*(WORLD+300-290)));if(item.kind===3&&r()<.5)item.kind=0;this.scenery.push(item);}}
 populate(){
  while(this.generated<Math.floor(this.distance/55)+14){
   const n=++this.generated,d=n*55+120,r=this.random();
   if(n%5===2)this.objects.push({type:'junction',d,rule:['light','stop','yield'][Math.floor(n/5)%3],phase:this.random()*8,stopped:0,passed:false,cross:280});
   else if(n%7===4)this.objects.push({type:'sign',d,limit:limits[Math.floor(this.random()*limits.length)],passed:false});
   else if(r<.12)this.objects.push({type:'ped',d,phase:this.random()*12,passed:false});
   // Cyclists ride along the right-hand edge of their carriageway, a few metres per second.
   else if(r<.24){const oncoming=this.random()<.4;this.objects.push({type:'bike',d,lane:oncoming?-92:92,velocity:(oncoming?-1:1)*(4.5+this.random()*3),width:8,length:20,passed:false,tone:Math.floor(this.random()*3)});}
   else if(r<.36)this.objects.push({type:'barrier',d,lane:[-25,25,75][Math.floor(this.random()*3)],kind:this.random()<.5?'barrier':'bin',passed:false});
   else{const kind=['sedan','van','truck','city'][Math.floor(this.random()*4)],oncoming=this.random()<.55,lane=oncoming?(this.random()<.5?-25:-75):(this.random()<.5?25:75);
    this.objects.push({type:'car',kind,...vehicles[kind],d,lane,velocity:oncoming?-(11+this.random()*9):8+this.random()*7,passed:false,color:['#ea7953','#558cf0','#22ba98','#ec4e83','#f2c744'][n%5]});}
   // Junction corners stay clear so the crossing road is not planted over; the draws still happen, keeping the sequence.
   for(let side of [-1,1])for(let k=0;k<9;k++){const item={d:d+k*6.1,x:side*(142+this.random()*120),kind:Math.floor(this.random()*6),scale:.7+this.random()*.8,tone:Math.floor(this.random()*3)};if(!(n%5===2&&k<2))this.scenery.push(item);}
   this.countryside(d);
  }
  this.objects=this.objects.filter(o=>o.d>this.distance-90);this.scenery=this.scenery.filter(o=>o.d>this.distance-90);
 }
 infraction(message){this.violations++;this.flash=1.2;this.message=message;}
 // An accident no longer ends the run: the car is thrown back and stunned, damage adds up, and only a wreck stops it.
 crash(message,{wear=1,victim=false,push=2.5,target=null}={}){
  if(!this.running||this.stun>0)return;const impact=Math.abs(this.speed);
  this.collisions++;if(victim)this.victims++;this.damage=Math.min(100,this.damage+Math.max(8,impact*wear));
  this.lastCrash={time:this.time,speed:impact,what:message,victim};this.impactSpeed=impact;this.flash=1.2;
  this.distance-=Math.sign(this.speed||1)*push;this.speed=0;this.throttle=0;this.stun=1.1;this.heading+=(this.random()<.5?-1:1)*Math.min(.9,.15+impact/140);
  if(target){target.hit=true;if('velocity' in target)target.velocity=0;}
  if(this.damage>=100){this.crashed=true;this.running=false;this.stopReason='accident';this.message=`${message} à ${Math.round(impact)} km/h — véhicule hors d’usage, trajet interrompu.`;}
  else this.message=`${message} à ${Math.round(impact)} km/h. Dégâts ${Math.round(this.damage)} %.`;}
 // Lateral position of an object relative to the road centre at the player's distance.
 lateral(o){if(o.type==='ped'&&o.hit)return o.downX+center(o.d)-center(this.distance);return(o.type==='ped'?Math.sin(this.time*.65+o.phase)*95:o.lane)+center(o.d)-center(this.distance);}
 assess(){
  const scores={Maintenir:1,Freiner:0,'Changer de voie':0,'Arrêt d’urgence':0};let reason='Couloir dégagé.';let action='Maintenir';
  const speed=Math.max(0,this.speed),brakingDistance=8+speed*speed/130;
  for(const o of this.objects){const gap=o.d-this.distance;if(gap<-4||gap>brakingDistance+40)continue;const lateral=o.type==='junction'?0:this.lateral(o);
   if(o.type==='ped'){const onRoad=Math.abs(lateral)<110;if(onRoad&&!o.hit&&gap<brakingDistance+15){scores.Freiner+=1.4;reason='Piéton engagé sur le passage à '+Math.round(gap)+' m : freiner avant la traversée.';if(gap<brakingDistance*.6)scores['Arrêt d’urgence']+=.9;}}
   else if(o.type==='bike'&&!o.hit&&Math.abs(lateral-this.x)<34&&gap<brakingDistance+30){scores['Changer de voie']+=1.2;scores.Freiner+=.6;reason=`Cycliste à ${Math.round(gap)} m : ralentir, dépasser en laissant 1,5 m.`;}
   else if(o.type==='car'&&Math.abs(lateral-this.x)<26){const closing=speed/3.6-o.velocity;if(closing>0&&gap<brakingDistance+10){const ttc=gap/closing;scores.Freiner+=1;scores['Changer de voie']+=.6;reason=`${o.name} devant à ${Math.round(gap)} m, ${Math.round(Math.abs(o.velocity)*3.6)} km/h (TTC ${ttc.toFixed(1)} s).`;if(ttc<1.2)scores['Arrêt d’urgence']+=1.2;}}
   else if(o.type==='barrier'&&Math.abs(lateral-this.x)<26&&gap<brakingDistance+20){scores['Changer de voie']+=1.3;scores.Freiner+=.4;reason=(o.kind==='bin'?'Conteneur immobile':'Barrière de chantier')+' dans la voie à '+Math.round(gap)+' m : changer de voie.';}
   else if(o.type==='junction'&&gap<brakingDistance+25){if(o.rule==='light'&&o.red){scores.Freiner+=1.5;reason='Feu rouge à '+Math.round(gap)+' m : s’arrêter à la ligne.';}else if(o.rule==='stop'){scores.Freiner+=1.2;reason='Stop à '+Math.round(gap)+' m : marquer l’arrêt.';}else if(o.rule==='yield'&&o.cross>0&&o.cross<200){scores.Freiner+=1;reason='Véhicule prioritaire à droite : céder le passage.';}}
  }
  if(Math.abs(this.x)>110){scores.Freiner+=.6;if(reason==='Couloir dégagé.')reason='Hors chaussée : ralentir et regagner la route.';}
  if(speed>this.limit+8){scores.Freiner+=.5;if(reason==='Couloir dégagé.')reason=`Vitesse ${Math.round(speed)} km/h au-dessus de la limite ${this.limit}.`;}
  const total=Object.values(scores).reduce((a,b)=>a+b,0);for(const k in scores)scores[k]=scores[k]/total;
  action=Object.keys(scores).reduce((a,b)=>scores[b]>scores[a]?b:a);this.advice={action,reason,scores};
 }
 step(dt,raw={}){
  if(!this.running)return;dt=Math.min(.04,dt);this.time+=dt;this.flash=Math.max(0,this.flash-dt);this.stun=Math.max(0,this.stun-dt);
  const alcohol=Number(this.settings.alcohol)||0,drug=this.settings.drug==='none'?0:Number(this.settings.level)||0;
  this.history.push({time:this.time,...raw});const delay=alcohol*.16+drug*(this.settings.drug==='sedating'?.5:.2);
  while(this.history.length>1&&this.history[1].time<=this.time-delay)this.history.shift();const input=this.stun>0?{}:this.history[0];
  const surface=Math.abs(this.x)<=110?'road':Math.abs(this.x)<=146?'verge':'grass';
  // Pedals answer within a tenth of a second; thrust fades towards the 220 km/h top speed, braking peaks near 0.9 g.
  this.throttle=Math.max(0,Math.min(1,this.throttle+(input.gas?dt/.12:-dt/.08)));this.brakeForce=Math.max(0,Math.min(1,this.brakeForce+(input.brake?dt/.1:-dt/.08)));
  // Holding the brake at a standstill for half a second engages reverse; the throttle brings the car back to forward.
  if(input.brake&&!input.gas&&this.speed<=.5)this.stillBrake+=dt;else this.stillBrake=0;
  if(this.speed<0||this.stillBrake>.5){this.speed=input.gas?Math.min(0,this.speed+32*dt):input.brake?Math.max(-25,this.speed-16*dt):Math.min(0,this.speed+6*dt);}
  else{const thrust=this.throttle*Math.max(0,24-this.speed*.048),coast=2+this.speed*.02+this.speed*this.speed*.00011,braking=this.brakeForce*32;
   this.speed=Math.max(0,Math.min(TOP,this.speed+(thrust-coast-braking)*dt));}
  if(surface!=='road'){const drag=(surface==='verge'?5:9)+Math.abs(this.speed)*(surface==='verge'?.05:.11);this.speed=this.speed>0?Math.max(0,this.speed-drag*dt):Math.min(0,this.speed+drag*dt);}
  const oldD=this.distance,oldX=this.x;this.distance+=this.speed/3.6*dt;
  // Steering: the wheel sets a heading within a few hundredths of a second, gentler as speed builds so 220 km/h stays drivable.
  const steering=(input.right?1:0)-(input.left?1:0),grip=surface==='road'?1:surface==='verge'?.75:.55,target=steering*.5/(1+Math.abs(this.speed)/90)*Math.sign(this.speed||1);
  if(this.stun<=0)this.heading+=(target-this.heading)*Math.min(1,dt*14*grip);
  this.x+=Math.sin(this.heading)*this.speed*2.5*dt-(center(this.distance)-center(oldD));
  this.x+=Math.sin(this.time*2.5)*Math.min(1,alcohol*.4+drug*.5)*Math.abs(this.speed)*.03*dt;
  this.x=Math.max(-WORLD,Math.min(WORLD,this.x));
  const wasOff=this.offroadNow;this.offroadNow=surface!=='road';
  if(this.offroadNow){this.offroad+=dt;
   // Loose ground: the car drags, wanders and no longer holds the line.
   this.heading+=Math.sin(this.time*8.7+this.x*.03)*.5*dt*Math.min(1,Math.abs(this.speed)/45);
   if(!wasOff&&this.speed>15&&!this.leftRoad){this.leftRoad=true;this.infraction('Sortie de route : bas-côté');}}
  else if(wasOff)this.leftRoad=false;
  // The ditch: crossed slowly it only jolts the car, crossed fast it is an accident.
  if(Math.sign(Math.abs(oldX)-DITCH)!==Math.sign(Math.abs(this.x)-DITCH)){if(Math.abs(this.speed)>55){this.crash('Sortie de route : fossé',{wear:.7,push:0});this.x=oldX;}else{this.speed*=.6;this.message='Fossé franchi : la voiture tape et ralentit.';}}
  // Sustained speeding past a posted limit counts once, then leaves a grace period.
  if(this.speed>this.limit+8){this.speeding+=dt;if(this.speeding>1.5){this.infraction(`Excès de vitesse : ${Math.round(this.speed)} km/h pour ${this.limit}`);this.speeding=-6;}}else if(this.speeding>0)this.speeding=0;else this.speeding=Math.min(0,this.speeding+dt);
  this.populate();
  for(const o of this.objects){
   const oldGap=o.d-oldD;if((o.type==='car'||o.type==='bike')&&!o.hit)o.d+=o.velocity*dt;const gap=o.d-this.distance;
   if(o.type==='junction'){
    o.red=Math.floor((this.time+o.phase)/6)%2===0;
    o.cross=o.rule==='light'&&!o.red?280:260-((this.time*95+o.phase*50)%520);
    if(gap>=6&&gap<=22&&Math.abs(this.speed)<1)o.stopped+=dt;
    if(!o.passed&&gap<=6){if(Math.abs(this.x)<110){if(o.rule==='light'&&o.red)this.infraction('Feu rouge franchi');if(o.rule==='stop'&&o.stopped<.7)this.infraction('Arrêt au stop non respecté');if(o.rule==='yield'&&o.cross>0&&o.cross<150)this.infraction('Priorité à droite non respectée');}o.passed=true;}
    if(Math.abs(gap)<4&&Math.abs(this.x-o.cross)<26){this.crash('Collision au croisement',{wear:1.1});continue;}
   }else if(o.type==='sign'){if(!o.passed&&gap<=0){o.passed=true;this.limit=o.limit;this.speeding=Math.min(this.speeding,0);}}
   else{
    const lateral=this.lateral(o);
    const reach=o.type==='car'?o.length/20+2.4:o.type==='bike'?1.8:o.type==='ped'?1.2:2;
    const near=Math.abs(gap)<reach||(oldGap>0&&gap<0)||(oldGap<0&&gap>0);
    const hitWidth=o.type==='ped'?16:o.type==='bike'?15:o.type==='car'?(o.width+20)/2:24;
    if(near&&Math.abs(this.x-lateral)<hitWidth&&!(o.hit&&(o.type==='ped'||o.type==='bike'))){
     if(o.type==='ped'){o.downX=Math.sin(this.time*.65+o.phase)*95;this.crash('Accident avec un piéton',{wear:.2,victim:true,push:1.5,target:o});}
     else if(o.type==='bike')this.crash('Accident avec un cycliste',{wear:.25,victim:true,push:1.5,target:o});
     else if(o.type==='car'){const closing=Math.abs(this.speed/3.6-o.velocity)*3.6;this.speed=Math.sign(this.speed||1)*closing;this.crash(`Accident avec ${o.article}`,{wear:.8,target:o});}
     else this.crash(o.kind==='bin'?'Collision avec un conteneur':'Collision avec une barrière de chantier',{wear:.45,target:o});
     continue;
    }
    if(o.type==='ped'&&!o.passed&&gap<=0){o.passed=true;if(this.speed>20&&Math.abs(lateral)<110&&!o.hit)this.infraction('Priorité au piéton non respectée');}
    // Overtaking a cyclist outside built-up areas requires 1,5 m of clearance (about 32 road units between centres).
    if(o.type==='bike'&&!o.passed&&oldGap>0&&gap<=0){o.passed=true;if(!o.hit&&Math.abs(this.x-lateral)<32&&this.speed>o.velocity*3.6)this.infraction('Cycliste dépassé à moins de 1,5 m');}
   }
  }
  if(this.running&&this.stun<=0)for(const o of this.scenery){
   const what=solidScenery[o.kind];if(!what)continue;
   const gap=o.d-this.distance,oldGap=o.d-oldD,reach=1.4+o.scale*(o.kind===3?3.2:1.6);
   if(!(Math.abs(gap)<reach||(oldGap>0&&gap<0)||(oldGap<0&&gap>0)))continue;
   const lateral=o.x+center(o.d)-center(this.distance);
   if(Math.abs(this.x-lateral)<(o.kind===3?12+o.scale*22:12+o.scale*14)&&Math.abs(this.speed)>6){this.crash('Sortie de route : '+what+' percuté',{wear:1.15,push:3});break;}
  }
  this.assess();
  // The run lasts as long as chosen before departure (five minutes by default); 0 means no time limit.
  const limit=this.settings.duration??300;if(this.running&&limit>0&&this.time>=limit){this.running=false;this.stopReason='complete';this.message='Trajet terminé.';}
 }
}
const api={RoadRun,center,vehicles,TOP,DITCH};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RoadModel=api;
})(typeof window!=='undefined'?window:globalThis);
