import {THREE} from './kit.js?v=cv-scene-v29';
export function yamahaTurntable(model){
 const root=model.scene;root.name='YamahaTT300';root.userData.noInk=true;
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 const pivot=(partName,markerName,name)=>{const part=root.getObjectByName(partName),marker=root.getObjectByName(markerName),g=new THREE.Group();g.name=name;g.position.copy(marker.position);root.add(g);g.attach(part);g.userData.dynamic=true;return g;};
 root.updateMatrixWorld(true);
 root.userData.record=pivot('YamahaPlatter','YamahaPlatterPivot','YamahaRotatingPlatter');
 root.userData.arm=pivot('YamahaToneArm','YamahaArmPivot','YamahaMovingToneArm');
 root.userData.restAngle=0;root.userData.playAngle=-.30;
 return root;
}
