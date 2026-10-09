import * as THREE from 'three';

// Spin each cylinder around its own shaft. The frame and its position stay fixed;
// physical treads advance along the line of rollers, rather than orbiting it.
export function createConveyorMotion(model) {
  model.updateWorldMatrix(true,true);
  const banks=new Map(),rotors=[],up=new THREE.Vector3(0,1,0);
  model.traverse(o=>{
    if(!o.isMesh||!/^LiveRoller_|^LivePaperRoller|^MachineRoller_/.test(o.name))return;
    o.geometry.computeBoundingBox();
    const bounds=o.geometry.boundingBox,size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const dim=[size.x,size.y,size.z],axisIndex=dim.indexOf(Math.max(...dim));
    const axis=new THREE.Vector3().setComponent(axisIndex,1),position=model.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
    const key=o.name.replace(/[._]?\d+$/,'');
    if(!banks.has(key))banks.set(key,[]);
    banks.get(key).push({mesh:o,axis,position,center,radius:Math.min(...dim)/2});
  });
  // Blender may give two separated beds the same base name. Split them by
  // spacing so a moving tread never crosses the gap between machines.
  const rows=[];
  for(const [name,rollers] of banks){
    const near=rollers.map(a=>Math.min(...rollers.filter(b=>b!==a).map(b=>a.position.distanceTo(b.position)))).filter(Number.isFinite).sort((a,b)=>a-b);
    const limit=Math.max(.12,(near[Math.floor(near.length/2)]||.1)*2.2),remaining=new Set(rollers);
    while(remaining.size){
      const seed=remaining.values().next().value,part=[seed];remaining.delete(seed);
      for(let i=0;i<part.length;i++)for(const r of [...remaining])if(part[i].position.distanceTo(r.position)<limit){part.push(r);remaining.delete(r);}
      rows.push([name+'#'+rows.length,part]);
    }
  }
  const belts=[],matrix=new THREE.Matrix4(),unit=new THREE.Vector3(1,1,1);
  for(const [name,rollers] of rows){
    if(rollers.length<2)continue;
    const box=new THREE.Box3();rollers.forEach(r=>box.union(new THREE.Box3().setFromObject(r.mesh)));
    // Workshop models have no root scale/rotation; turn the measured points into
    // model coordinates explicitly so nested exported objects remain supported.
    let start=rollers[0].position.clone(),end=start.clone(),distance=0;
    for(const a of rollers)for(const b of rollers){const d=a.position.distanceTo(b.position);if(d>distance){distance=d;start.copy(a.position);end.copy(b.position);}}
    const direction=end.clone().sub(start).normalize(),dominant=Math.abs(direction.x)>Math.abs(direction.z)?'x':'z';
    if(direction[dominant]<0){direction.negate();[start,end]=[end,start];}
    const worldSize=box.getSize(new THREE.Vector3()),width=Math.abs(direction.x)*worldSize.z+Math.abs(direction.z)*worldSize.x;
    const top=model.worldToLocal(new THREE.Vector3(box.getCenter(new THREE.Vector3()).x,box.max.y,box.getCenter(new THREE.Vector3()).z)).y+.005;
    const length=distance+.10;start.addScaledVector(direction,-.05);start.y=top;
    const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),direction);
    const tread=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.008,width*.85),new THREE.MeshStandardMaterial({color:'#d5bd70',roughness:.88}),6);
    tread.name='ConveyorTread:'+name;tread.frustumCulled=false;model.add(tread);
    const bank={name,start,direction,length,rotation,tread,clock:0,speed:.26};belts.push(bank);
    for(const r of rollers){
      const worldAxis=r.axis.clone().applyQuaternion(r.mesh.getWorldQuaternion(new THREE.Quaternion()));
      const worldDirection=direction.clone().transformDirection(model.matrixWorld);
      r.sign=worldAxis.clone().cross(up).dot(worldDirection)>=0?1:-1;
      rotors.push(r);
    }
  }
  function update(dt,playing){
    if(playing)for(const r of rotors){
      const angle=r.sign*.26/Math.max(.01,r.radius)*dt;
      // Source cylinders are centered at their origins. Preserve a nonzero
      // authored center too, rather than letting it travel around the shaft.
      const before=r.center.clone().multiply(r.mesh.scale).applyQuaternion(r.mesh.quaternion);
      r.mesh.rotateOnAxis(r.axis,angle);
      const after=r.center.clone().multiply(r.mesh.scale).applyQuaternion(r.mesh.quaternion);
      r.mesh.position.add(before.sub(after));
    }
    for(const b of belts){
      if(playing)b.clock+=dt;
      for(let i=0;i<6;i++){
        const offset=(b.clock*b.speed+i*b.length/6)%b.length;
        matrix.compose(b.start.clone().addScaledVector(b.direction,offset),b.rotation,unit);b.tread.setMatrixAt(i,matrix);
      }
      b.tread.instanceMatrix.needsUpdate=true;
    }
    model.userData.conveyors=belts.map(b=>({name:b.name,direction:b.direction.toArray(),distance:b.clock*b.speed}));
  }
  update(0,false);
  return {update,dispose(){for(const b of belts){b.tread.geometry.dispose();b.tread.material.dispose();b.tread.removeFromParent();}}};
}
