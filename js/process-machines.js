import { createActionHighlight } from './process-highlight.js?v=cv-scene-v26';
import * as THREE from 'three';
import { processSymbol } from './process-symbols.js?v=cv-scene-v20';

// The authored machines transform incoming tool symbols into tangible data.
export function initProcessMachines(model, steps, accent, activity) {
  const heads = steps.map((_,i) => model.getObjectByName('MachineHead_' + i));
  const outputs = steps.map((_,i) => model.getObjectByName('MachineOutput_' + i));
  const rollers = steps.map((_,i) => model.getObjectByName('MachineRoller_' + i));
  const lamps = steps.map((_,i) => model.getObjectByName('MachineStatus_' + i));
  const live=[];
  model.traverse(o=>{if(/^LiveRobot_|^LiveFan_|^LiveRailTrolley|^LiveRoller_/.test(o.name))live.push(o);});
  const special = [];
  model.traverse(o => {
    o.userData.machineRest = {p:o.position.clone(), q:o.quaternion.clone(), s:o.scale.clone()};
    if (/Document_press|Paper_roll|Dashboard_metric|UI_component|Server_status_LED|Forge_workpiece|MachineRailSignal/.test(o.name)) special.push(o);
  });
  const smoke = [], sparks = [], flames=[];
  if (model.getObjectByName('MachineForgeHammer')) {
    for(let i=0;i<12;i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),new THREE.MeshBasicMaterial({color:'#606a70',transparent:true,opacity:0,depthWrite:false}));
      puff.name='ForgeSmoke_'+i;model.add(puff);smoke.push(puff);
    }
    for(let i=0;i<18;i++) {
      const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(.025,0),new THREE.MeshBasicMaterial({color:i%3?'#ff9f38':'#ffe5a3',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
      spark.name='ForgeSpark_'+i;model.add(spark);sparks.push(spark);
    }
    for(let i=0;i<14;i++){const flame=new THREE.Mesh(new THREE.ConeGeometry(.055,.24,5),new THREE.MeshBasicMaterial({color:i%3?'#ff7620':'#ffe087',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));flame.name='ForgeFlame_'+i;model.add(flame);flames.push(flame);}
    const glow=new THREE.PointLight('#ff7d29',1.7,2.5,2);glow.position.set(-1.4,.65,-.3);model.add(glow);
  }

  const billet=model.getObjectByName('ActivityRawBillet'),forged=model.getObjectByName('ActivityForgedPart'),document=model.getObjectByName('ActivityDocument');
  for(const root of [billet,forged,document])root?.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
  const at=(x,y,z)=>new THREE.Vector3(x,y,z);
  const input=at(-2.4,.39,.9),furnace=at(-1.55,.65,-.6),anvil=at(-.4,.905,-.28),delivery=at(1.6,.312,1.1);
  const forgeColor=(root,heat)=>root?.traverse(o=>{if(!o.isMesh)return;o.material.color.set('#a3adb2').lerp(new THREE.Color('#f98337'),heat);o.material.emissive.set('#ec5010');o.material.emissiveIntensity=heat*2.8;});
  const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const highlight=createActionHighlight(model,steps,activity,accent);
  let clock=0, oldStep=-1, impact=-10, striking=false;
  return {
    update({step,elapsed,dt,playing,exception}) {
      if(playing) clock+=dt;
      const progress=Math.min(1,elapsed/4.6),stroke=Math.sin(progress*Math.PI*2)**2;
      const current=model.getObjectByName('StepAnchor_'+step).position;
      const previous=step?model.getObjectByName('StepAnchor_'+(step-1)).position:current.clone().add(new THREE.Vector3(-.7,0,0));
      for(const o of live){const rest=o.userData.machineRest;if(/^LiveRobot_/.test(o.name))o.rotation.y=.32*Math.sin(clock*1.8);else if(/^LiveRailTrolley/.test(o.name))o.position.x=Math.sin(clock*.4)*1.6;else if(playing)o.rotation.z+=dt*2.8;}
      heads.forEach((head,i)=>{if(head)head.position.y=head.userData.machineRest.p.y-(i===step?.16*stroke:0);});
      outputs.forEach((out,i)=>{if(out){const visible=i<step?1:i===step?Math.min(1,Math.max(0,(progress-.48)*3)):0;out.scale.setScalar(billet?0:i===step?visible:0);}});
      rollers.forEach((roller,i)=>{if(roller&&playing&&i===step)roller.rotateY(dt*5);});
      lamps.forEach((lamp,i)=>{if(lamp){lamp.material.emissive.set(i===step?(exception?'#8d210b':accent):'#000000');lamp.material.emissiveIntensity=i===step?.6+.35*stroke:0;}});
      for(const o of special){
        const rest=o.userData.machineRest;
        if(/Document_press/.test(o.name))o.position.y=rest.p.y-(['extract','script','html'].includes(steps[step][2])?.12*stroke:0);
        else if(/Paper_roll/.test(o.name)&&playing&&['pdf','extract'].includes(steps[step][2]))o.rotateY(dt*3);
        else if(/Dashboard_metric/.test(o.name)){const grow=steps[step][2]==='powerbi'||steps[step][2]==='chart'?.72+.28*Math.min(1,progress*2):1;o.scale.y=rest.s.y*grow;o.position.y=.2+(rest.p.y-.2)*grow;}
        else if(/UI_component/.test(o.name)){o.position.z=rest.p.z+(['html','design'].includes(steps[step][2])?.07*stroke:0);}
        else if(/Server_status_LED/.test(o.name)){o.material.emissive.set(exception?'#741708':'#278965');o.material.emissiveIntensity=.2+.65*(.5+.5*Math.sin(clock*5+rest.p.y*8));}
        else if(/Forge_workpiece/.test(o.name))o.material.emissiveIntensity=2+stroke*2;
        else if(/MachineRailSignal/.test(o.name)){o.material.color.set(step===0||step===steps.length-1?'#58ae79':'#d36a56');o.material.emissive.copy(o.material.color);o.material.emissiveIntensity=.45;}
      }
      
      if(document){document.position.copy(previous).lerp(current,ease(progress*1.7));document.position.y+=.10+Math.sin(Math.PI*Math.min(1,progress*1.7))*.15;
        document.rotation.z=progress<.6?Math.sin(progress*Math.PI)*.12:0;
        document.traverse(o=>{if(/Document_field/.test(o.name)){o.scale.x=.5+.5*ease(progress*2);o.material.color.set(steps[step][2]==='excel'?'#27804d':steps[step][2]==='html'?'#8c62ad':steps[step][2]==='powerbi'?'#e8bd33':accent);}});
      }
      const crane=model.getObjectByName('MachineCraneCarriage');
      const get=n=>model.getObjectByName(n),rest=n=>get(n)?.userData.machineRest.p;
      const pour=step===1&&progress>.38&&progress<.82;
      const crucible=get('CruciblePivot');if(crucible)crucible.rotation.z=-.46*Math.sin(Math.PI*ease((progress-.28)/.58))*(step===1?1:0);
      const stream=get('MoltenPourStream');if(stream)stream.visible=pour;
      const cast=get('MoltenCastFill');if(cast){cast.visible=step===1&&progress>.40;cast.scale.y=Math.max(.03,ease((progress-.40)/.4));cast.material.emissiveIntensity=2.8;}
      const pool=get('MoltenSteelPool');if(pool)pool.material.emissiveIntensity=2.1+Math.sin(clock*9)*.5;
      const cutter=get('MachineSheetCutter');if(cutter)cutter.position.y=cutter.userData.machineRest.p.y-(step>0&&step<4?.28*stroke:0);
      const robot=get('PaperRobot');if(robot)robot.rotation.y=step>1&&step<4?Math.sin(progress*Math.PI*2)*.4:0;
      model.traverse(o=>{if(o.name.startsWith('LivePaperRoller')&&playing&&step<4)o.rotateY(dt*3);});
      const lift=get('DeliveryForklift'),liftLoad=get('DeliveryForkLoad'),van=get('Vehicle_mail_van'),vanCargo=get('VanCargo');
      if(lift){const t=ease(progress);lift.position.copy(lift.userData.machineRest.p);
        if(step===1){lift.position.x+=1.35*t;lift.position.z-=.45*Math.sin(t*Math.PI);lift.rotation.y=.15*Math.sin(t*Math.PI);}
        else if(step===2){lift.position.x+=1.35*(1-t);lift.rotation.y=-.15*Math.sin(t*Math.PI);}
        if(liftLoad){liftLoad.visible=step<2||(step===2&&progress<.3);liftLoad.position.y=liftLoad.userData.machineRest.p.y+(step===1?.42*Math.sin(t*Math.PI):0);}
      }
      if(van){van.position.x=van.userData.machineRest.p.x+(step===0?-3*(1-ease(progress*1.5)):step===steps.length-1?3*ease(progress):0);if(vanCargo)vanCargo.visible=step===0||step>=2;}
      model.traverse(o=>{if(o.name.startsWith('DockDoor_'))o.position.y=o.userData.machineRest.p.y+(step===1||step===2?1.25*ease(Math.min(progress*3,(1-progress)*3)):0);});
      const train=get('Vehicle_train');if(train)train.position.x=train.userData.machineRest.p.x+(step===0?-4*(1-ease(progress*1.3)):step===steps.length-1?4*ease(progress):0);
      const car=get('Vehicle_inspection_car');if(car){car.position.x=car.userData.machineRest.p.x+(step===0?-1.6*(1-ease(progress*1.5)):step===steps.length-1?1.8*ease(progress):0);car.position.y=car.userData.machineRest.p.y+(step>0&&step<4?.16*ease(progress*2):0);}
      const forklift=get('Vehicle_forklift');if(forklift){forklift.position.x=forklift.userData.machineRest.p.x+(step<2?-1.2*ease(progress):step<4?-1.2+2*ease(progress):.8);}

      if(billet&&forged){
        model.getObjectByName('Forge_workpiece')?.traverse(o=>{o.visible=false;});
        billet.visible=step===0||(step===1&&progress<.4)||(step===2&&progress<.80);forged.visible=step>2||(step===2&&progress>=.80);
        billet.scale.set(1,1,1);forged.scale.setScalar(1);
        if(step===0){billet.position.copy(input).add(new THREE.Vector3(-.75*(1-ease(progress*1.5)),0,0));forgeColor(billet,0);}
        else if(step===1){billet.position.copy(input).lerp(furnace,ease(progress*2));forgeColor(billet,ease((progress-.18)*1.7));}
        else if(step===2){billet.position.copy(at(-.85,.88,-.23)).lerp(anvil,ease(progress*4));const squeeze=ease((progress-.22)*1.7);billet.scale.set(1+squeeze*.15,1-squeeze*.66,1);billet.position.y-=squeeze*.0528;forgeColor(billet,1);forged.position.set(-.4,.826,-.28);forgeColor(forged,.85);}
        else if(step===3){const t=ease(progress);forged.position.copy(at(-.4,.826,-.28)).lerp(delivery,t);forged.position.y+=Math.sin(Math.PI*t)*.72;forgeColor(forged,.75*(1-t));}
        else {forged.position.copy(delivery);forgeColor(forged,0);}
        if(crane){const lift=step===3?forged.position:at(1.5,1.4,-.9);crane.position.set(lift.x-1.5,0,lift.z+.9);
          const rope=crane.getObjectByName('Crane_hook');if(rope){rope.scale.y=rope.userData.machineRest.s.y*(2.3-lift.y)/.9;rope.position.y=(2.3+lift.y)/2;}}
        model.userData.forgeStage=['raw','heating','forging','handling','finished'][step];
      }
      const hammer=model.getObjectByName('MachineForgeHammer');if(hammer){const top=billet?billet.position.y+.08*billet.scale.y:.86;hammer.position.y=step===2&&progress>.24&&progress<.80?hammer.userData.machineRest.p.y+.28-(hammer.userData.machineRest.p.y+.28-top-.155)*stroke:hammer.userData.machineRest.p.y+.28;}
      const barge=get('Vehicle_barge');if(barge){barge.position.copy(barge.userData.machineRest.p);barge.position.x+=(step===0?-5*(1-ease(progress*1.6)):step===steps.length-1?5*ease(progress):0);barge.position.y+=.006*Math.sin(clock*2);}
      const cargo=get('PortTransferredContainer'),trolley=get('PortCraneTrolley'),cable=get('PortCraneCable');
      if(cargo){const ship=at(1.25,1.2,2.55),dock=at(.8,.55,.7),t=ease(progress);cargo.visible=step===1||step===2;cargo.position.copy(step===1?ship:dock);
        if(step===1){if(t<.3)cargo.position.y+=t/.3;else if(t<.7){cargo.position.copy(ship).lerp(dock,(t-.3)/.4);cargo.position.y=2.2;}else{cargo.position.copy(dock);cargo.position.y+=(1-(t-.7)/.3)*1.65;}}
        if(step===2)cargo.position.x-=1.2*t;
        if(trolley)trolley.position.set(cargo.position.x,2.85,cargo.position.z);
        if(cable){const length=Math.max(.05,2.85-cargo.position.y-.27);cable.position.set(cargo.position.x,2.85-length/2,cargo.position.z);cable.scale.y=length;}
        model.userData.portCargo=cargo.position.toArray();
        // The lifted container replaces one deck load; no duplicate is left behind.
        barge?.traverse(o=>{if(o.isMesh&&o.name.startsWith('Ship_container')){const p=o.userData.machineRest.p;o.visible=!(p.x>.65&&p.y>1&&p.z>2.2&&step>0);}});

      }
      const rod=get('MachineHammerRod');if(rod&&hammer)rod.position.y=rod.userData.machineRest.p.y+(hammer.position.y-hammer.userData.machineRest.p.y);
      flames.forEach((p,i)=>{const f=(clock*2.1+i*.17)%1;p.position.set(-1.55+(i%4-.5)*.085,.45+f*.25,-.65+Math.floor(i/4)*.06);p.scale.set(.7+Math.sin(clock*7+i)*.25,.35+Math.sin(clock*12+i)*.3+f*1.3,.8);p.material.opacity=(step===1||step===2)?(1-f)*.8:0;});
      model.userData.activityClock=clock;
      const hit=step===2&&progress>.24&&progress<.80&&stroke>.94;if(hit&&!striking)impact=clock;striking=hit;
      smoke.forEach((p,i)=>{const t=(clock*.23+i/12)%1;p.position.set(-1.55+Math.sin(i*2.4+t*3)*t*.18,1.76+t*.85,-.83+t*.10);p.scale.setScalar(.35+t*1.4);p.material.opacity=(step===1||step===2)?(1-t)*.28:0;});
      highlight.update(step,elapsed,playing);
      sparks.forEach((p,i)=>{const t=Math.min(1,(clock-impact)*2.4+i/90),active=step===2&&clock-impact<.42;p.position.set(-.4+Math.sin(i*2.4)*t*.42,.88+Math.sin(t*Math.PI)*.28,-.28+Math.cos(i*2.4)*t*.36);p.material.opacity=active?(1-t)*.95:0;});
    },
    dispose(){highlight.dispose();}
  };
}
