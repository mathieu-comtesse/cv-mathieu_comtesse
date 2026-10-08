import * as THREE from 'three';
import { processSymbol } from './process-symbols.js?v=cv-scene-v20';

// The authored machines transform incoming tool symbols into tangible data.
export function initProcessMachines(model, steps, accent) {
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
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),new THREE.MeshBasicMaterial({color:'#a4afb2',transparent:true,opacity:0,depthWrite:false}));
      puff.name='ForgeSmoke_'+i;model.add(puff);smoke.push(puff);
    }
    for(let i=0;i<18;i++) {
      const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(.025,0),new THREE.MeshBasicMaterial({color:i%3?'#ff9f38':'#ffe5a3',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
      spark.name='ForgeSpark_'+i;model.add(spark);sparks.push(spark);
    }
    const glow=new THREE.PointLight('#ff7d29',1.7,2.5,2);glow.position.set(-1.4,.65,-.3);model.add(glow);
  }
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
      outputs.forEach((out,i)=>{if(out){const visible=i<step?1:i===step?Math.min(1,Math.max(0,(progress-.48)*3)):0;out.scale.setScalar(visible);}});
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
      const crane=model.getObjectByName('MachineCraneCarriage');if(crane){crane.position.x=step===2?.65*Math.sin(progress*Math.PI):0;crane.position.y=step===2?.2*Math.sin(progress*Math.PI):0;}
      const hammer=model.getObjectByName('MachineForgeHammer');if(hammer)hammer.position.y=hammer.userData.machineRest.p.y-(step===2?.155*stroke:0);
      const barge=model.getObjectByName('Vehicle_barge');if(barge){barge.position.z=step===0?1.9*(1-Math.min(1,elapsed/3)):step===steps.length-1?-Math.min(2,elapsed*.65):0;barge.position.y=.006*Math.sin(clock*2);}
      smoke.forEach((p,i)=>{const t=(clock*.23+i/12)%1;p.position.set(-1.55+Math.sin(i*2.4+t*3)*t*.18,1.76+t*.85,-.83+t*.10);p.scale.setScalar(.35+t*1.4);p.material.opacity=(1-t)*.13;});
      sparks.forEach((p,i)=>{const t=(clock*1.8+i/18)%1,active=step===2;p.position.set(-.4+Math.sin(i*2.4)*t*.42,.88+Math.sin(t*Math.PI)*.28,-.28+Math.cos(i*2.4)*t*.36);p.material.opacity=active?(1-t)*.95:0;});
    },
    dispose(){textures.forEach(t=>t.dispose());symbols.forEach(s=>s.material.dispose());[...smoke,...sparks].forEach(o=>{o.geometry.dispose();o.material.dispose();});}
  };
}
