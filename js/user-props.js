import {THREE} from './kit.js?v=cv-scene-v29';
export function yamahaTurntable(model){
 const root=model.scene;root.name='YamahaTT300';root.userData.noInk=true;
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 const pivot=(partName,markerName,name)=>{const part=root.getObjectByName(partName),marker=root.getObjectByName(markerName),g=new THREE.Group();g.name=name;g.position.copy(marker.position);root.add(g);g.attach(part);g.userData.dynamic=true;return g;};
 root.updateMatrixWorld(true);
 root.userData.record=pivot('YamahaPlatter','YamahaPlatterPivot','YamahaRotatingPlatter');
 // The supplied atlas also covers the transparent lid. The platter itself is
 // opaque: sort it in the opaque pass so the lid cannot make it vanish.
 const platter=root.getObjectByName('YamahaPlatter');platter.material=platter.material.clone();platter.material.transparent=false;platter.material.opacity=1;platter.material.depthWrite=true;platter.material.side=THREE.DoubleSide;
 root.userData.arm=pivot('YamahaToneArm','YamahaArmPivot','YamahaMovingToneArm');
 root.userData.restAngle=0;root.userData.playAngle=-.30;
 return root;
}
