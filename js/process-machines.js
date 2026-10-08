import * as THREE from 'three';
import { processSymbol } from './process-symbols.js?v=cv-scene-v20';

// The authored machines transform incoming tool symbols into tangible data.
export function initProcessMachines(model, steps, accent, activity) {
  const loader = new THREE.TextureLoader();
  const textures = new Map();
  const texture = tool => {
    if (!textures.has(tool)) {
      const svg = processSymbol(tool).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" ').replaceAll('currentColor', accent);
      const map = loader.load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
      map.colorSpace = THREE.SRGBColorSpace;
      textures.set(tool, map);
    }
    return textures.get(tool);
  };
  const symbols = [0, 1].map(i => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: texture(steps[0][2]), transparent: true, depthWrite: false, toneMapped: false}));
    sprite.name = 'TransformingTool_' + i; sprite.scale.setScalar(.37); model.add(sprite); return sprite;
  });
  const heads = steps.map((_,i) => model.getObjectByName('MachineHead_' + i));
  const outputs = steps.map((_,i) => model.getObjectByName('MachineOutput_' + i));
  const rollers = steps.map((_,i) => model.getObjectByName('MachineRoller_' + i));
  const lamps = steps.map((_,i) => model.getObjectByName('MachineStatus_' + i));
  const special = [];
  model.traverse(o => {
    o.userData.machineRest = {p:o.position.clone(), q:o.quaternion.clone(), s:o.scale.clone()};
    if (/Document_press|Paper_roll|Dashboard_metric|UI_component|Server_status_LED|Forge_workpiece|MachineRailSignal/.test(o.name)) special.push(o);
  });
  const smoke = [], sparks = [];
  if (model.getObjectByName('MachineForgeHammer')) {
    for(let i=0;i<12;i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),new THREE.MeshBasicMaterial({color:'#606a70',transparent:true,opacity:0,depthWrite:false}));
      puff.name='ForgeSmoke_'+i;model.add(puff);smoke.push(puff);
    }
    for(let i=0;i<18;i++) {
      const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(.025,0),new THREE.MeshBasicMaterial({color:i%3?'#ff9f38':'#ffe5a3',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
      spark.name='ForgeSpark_'+i;model.add(spark);sparks.push(spark);
    }
    const glow=new THREE.PointLight('#ff7d29',1.7,2.5,2);glow.position.set(-1.4,.65,-.3);model.add(glow);
  }

  const billet=model.getObjectByName('ActivityRawBillet'),forged=model.getObjectByName('ActivityForgedPart'),document=model.getObjectByName('ActivityDocument');
  for(const root of [billet,forged,document])root?.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
  const at=(x,y,z)=>new THREE.Vector3(x,y,z);
  const input=at(-2.4,.45,.9),furnace=at(-1.55,.65,-.6),anvil=at(-.4,.94,-.28),delivery=at(1.6,.34,1.1);
  const forgeColor=(root,heat)=>root?.traverse(o=>{if(!o.isMesh)return;o.material.color.set('#a3adb2').lerp(new THREE.Color('#f98337'),heat);o.material.emissive.set('#ec5010');o.material.emissiveIntensity=heat*2.8;});
  const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  let clock=0, oldStep=-1;
  return {
    update({step,elapsed,dt,playing,exception}) {
      if(playing) clock+=dt;
      const progress=Math.min(1,elapsed/4.6),stroke=Math.sin(progress*Math.PI*2)**2;
      const current=model.getObjectByName('StepAnchor_'+step).position;
      const previous=step?model.getObjectByName('StepAnchor_'+(step-1)).position:current.clone().add(new THREE.Vector3(-.7,0,0));
      if(oldStep!==step){symbols[0].material.map=texture(steps[Math.max(0,step-1)][2]);symbols[1].material.map=texture(steps[step][2]);oldStep=step;}
      symbols[0].position.copy(previous).lerp(current,Math.min(1,progress*2));symbols[0].position.y+=.57+Math.sin(progress*Math.PI)*.13;
      symbols[0].scale.setScalar(.40*(1-Math.min(1,Math.max(0,(progress-.34)*5))));
      symbols[0].material.opacity=1-Math.min(1,Math.max(0,(progress-.40)*5));
      symbols[1].position.copy(current);symbols[1].position.y+=.56+Math.max(0,progress-.55)*.40;
      symbols[1].scale.setScalar(.43*Math.min(1,Math.max(0,(progress-.42)*5)));
      symbols[1].material.opacity=Math.min(1,Math.max(0,(progress-.45)*5));
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
      if(billet&&forged){
        model.getObjectByName('Forge_workpiece')?.traverse(o=>{o.visible=false;});
        billet.visible=step<2||(step===2&&progress<.80);forged.visible=step>2||(step===2&&progress>=.80);
        billet.scale.set(1,1,1);forged.scale.setScalar(1);
        if(step===0){billet.position.copy(input).add(new THREE.Vector3(-.75*(1-ease(progress*1.5)),0,0));forgeColor(billet,0);}
        else if(step===1){billet.position.copy(input).lerp(furnace,ease(progress*2));forgeColor(billet,ease((progress-.18)*1.7));}
        else if(step===2){billet.position.copy(furnace).lerp(anvil,ease(progress*4));const squeeze=ease((progress-.22)*1.7);billet.scale.set(1+squeeze*.15,1-squeeze*.66,1);billet.position.y-=squeeze*.045;forgeColor(billet,1);forged.position.set(-.4,.86,-.28);forgeColor(forged,.85);}
        else if(step===3){const t=ease(progress);forged.position.copy(at(-.4,.86,-.28)).lerp(delivery,t);forged.position.y+=Math.sin(Math.PI*t)*.72;forgeColor(forged,.75*(1-t));}
        else {forged.position.copy(delivery);forgeColor(forged,0);}
        if(crane){const lift=step===3?forged.position:at(1.5,1.4,-.9);crane.position.set(lift.x-1.5,0,lift.z+.9);
          const rope=crane.getObjectByName('Crane_hook');if(rope){rope.scale.y=rope.userData.machineRest.s.y*(2.3-lift.y)/.9;rope.position.y=(2.3+lift.y)/2;}}
        model.userData.forgeStage=['raw','heating','forging','handling','finished'][step];
      }
      const hammer=model.getObjectByName('MachineForgeHammer');if(hammer){const top=billet?billet.position.y+.08*billet.scale.y:.86;hammer.position.y=step===2&&progress>.24&&progress<.80?hammer.userData.machineRest.p.y-(hammer.userData.machineRest.p.y-top-.155)*stroke:hammer.userData.machineRest.p.y+.18;}
      const barge=model.getObjectByName('Vehicle_barge');if(barge){barge.position.z=step===0?1.9*(1-Math.min(1,elapsed/3)):step===steps.length-1?-Math.min(2,elapsed*.65):0;barge.position.y=.006*Math.sin(clock*2);}
      smoke.forEach((p,i)=>{const t=(clock*.23+i/12)%1;p.position.set(-1.55+Math.sin(i*2.4+t*3)*t*.18,1.76+t*.85,-.83+t*.10);p.scale.setScalar(.35+t*1.4);p.material.opacity=(step===1||step===2)?(1-t)*.28:0;});
      sparks.forEach((p,i)=>{const t=(clock*1.8+i/18)%1,active=step===2&&progress>.24&&progress<.80;p.position.set(-.4+Math.sin(i*2.4)*t*.42,.88+Math.sin(t*Math.PI)*.28,-.28+Math.cos(i*2.4)*t*.36);p.material.opacity=active?(1-t)*.95:0;});
    },
    dispose(){textures.forEach(t=>t.dispose());symbols.forEach(s=>s.material.dispose());[...smoke,...sparks].forEach(o=>{o.geometry.dispose();o.material.dispose();});}
  };
}
