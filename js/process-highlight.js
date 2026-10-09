import * as THREE from 'three';

// Accentuate the machine actually operating; never put tool icons over it.
export function createActionHighlight(model, steps, activity, accent) {
  const named={
    finance:['ActivityDocument','ActivityDocument|LiveRoller','ActivityDocument|LiveRoller','ActivityDocument|LiveRobot_Validation','ActivityDocument|LiveRobot_Validation','ActivityDocument','ActivityDocument'],
    pa:['Vehicle_mail_van|ActivityDocument','DeliveryForklift|ActivityDocument','ActivityDocument','ActivityDocument','ActivityDocument','DockDoor|ActivityDocument','Vehicle_mail_van|ActivityDocument'],
    cerfa:['Vehicle_inspection_car|ActivityDocument','LiveRobot_Scanner|ActivityDocument','LiveRobot_Scanner|ActivityDocument','ActivityDocument','ActivityDocument','ActivityDocument','ActivityDocument'],
    vre:['ActivityDocument','LiveRobot_Probe|ActivityDocument','LiveRobot_Probe|ActivityDocument','LiveRobot_Probe|ActivityDocument','ActivityDocument','ActivityDocument'],
    studio:['Paper roll|ActivityDocument','PaperRobot|ActivityDocument','MachineSheetCutter|ActivityDocument','MachineSheetCutter|ActivityDocument','ActivityDocument','LivePaperRoller|ActivityDocument','ActivityDocument'],
    powerbi:['ActivityDocument','LiveRoller_Data|ActivityDocument','LiveRobot_Aggregation|ActivityDocument','LiveRobot_Aggregation|ActivityDocument','Interface panel|ActivityDocument','Dashboard[ _]metric|ActivityDocument','ActivityDocument'],
    moteur44:['SharePointArchive|ActivityDocument','Moteur44Engine|Moteur44Scanner|ActivityDocument','Moteur44TargetRow|Moteur44ExcelRecord','Moteur44Q18Record','ExcelRegister|Moteur44Q18Record'],
    terrain:['ActivityRawBillet','Forge hearth|Crucible|Molten','MachineForgeHammer|Forge anvil|ActivityRawBillet','MachineCraneCarriage|ActivityForgedPart','Quality scanner|ActivityForgedPart'],
    suivi:['Vehicle_barge','PortCrane|PortTransferredContainer','Vehicle_forklift|PortTransferredContainer','Warehouse|DockDoor','ActivityDocument','ActivityDocument'],
    gares:['Vehicle_train|ActivityDocument','MachineRailSignal|ActivityDocument','Dashboard[ _]metric|ActivityDocument','ActivityDocument','ActivityDocument','MachineRailSignal|ActivityDocument'],
    vmvre:['ActivityDocument','ActivityDocument','ActivityDocument','VM_0|VM_1|Server','ActivityDocument','ActivityDocument','ActivityDocument','ActivityDocument','Vehicle_mail_van'],
  };
  const all=[];
  model.traverse(o=>{if(o.isMesh&&!/^ForgeSmoke|^ForgeSpark|^ForgeFlame/.test(o.name))all.push(o);});
  const marker=new THREE.Mesh(new THREE.RingGeometry(.27,.31,40),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
  marker.name='ActiveActionHalo';marker.rotation.x=-Math.PI/2;marker.renderOrder=2;model.add(marker);
  const bases=new Map();let selected=[],previous=-1;
  const restore=()=>{for(const [m,b] of bases){m.emissive?.copy(b.color);m.emissiveIntensity=b.intensity;}bases.clear();};
  const isVisible=o=>{for(let p=o;p&&p!==model;p=p.parent)if(!p.visible||Math.max(p.scale.x,p.scale.y,p.scale.z)<.001)return false;return o.visible;};
  return {
    update(step,elapsed,playing){
      if(step!==previous){
        restore();previous=step;
        const pattern=named[activity]?.[step],rx=pattern&&new RegExp(pattern);
        selected=rx?all.filter(o=>{for(let p=o;p&&p!==model;p=p.parent)if(rx.test(p.name))return true;return false;}):[];
        if(!selected.length)selected=all.filter(o=>{for(let p=o;p&&p!==model;p=p.parent)if(p.name==='ActivityDocument')return true;return false;});
        for(const o of selected)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.emissive&&!bases.has(m))bases.set(m,{color:m.emissive.clone(),intensity:m.emissiveIntensity});
        model.userData.activeAction={step,label:steps[step][0],objects:selected.map(o=>o.name)};
      }
      const pulse=playing?.5+.5*Math.sin(elapsed*3):.7;
      for(const [m,b] of bases){m.emissive.copy(b.color).lerp(new THREE.Color(accent),.35);m.emissiveIntensity=Math.max(b.intensity,.28+.32*pulse);}
      const subject=selected.find(o=>isVisible(o)&&/Activity|Hammer|Container|Vehicle/.test(o.name))||selected.find(isVisible);
      if(subject){marker.position.copy(subject.getWorldPosition(new THREE.Vector3()));model.worldToLocal(marker.position);marker.position.y=Math.max(.055,marker.position.y-.09);}
      else marker.position.copy(model.getObjectByName('StepAnchor_'+step)?.position||new THREE.Vector3());
      marker.scale.setScalar(1+.12*pulse);marker.material.opacity=.45+.3*pulse;
    },
    dispose(){restore();marker.geometry.dispose();marker.material.dispose();marker.removeFromParent();}
  };
}
