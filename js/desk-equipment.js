import {THREE,group,tube,mat,box} from './kit.js?v=cv-scene-v29';
export function installDeskEquipment(desk,workstation,towerModel,stripModel,barModel,wallpaper){
 const tower=towerModel.scene;tower.name='DreamComputerRTX4090';tower.position.set(.535,.742,-.03);tower.scale.setScalar(.95);tower.userData.batchRoot=true;tower.userData.noInk=true;desk.add(tower);
 const gpu=tower.getObjectByName('AsusROGRTX4090');gpu.userData.batchRoot=true;
 const strip=stripModel.scene;strip.name='DeskPowerStrip';strip.position.set(-.24,.005,-.23);strip.userData.batchRoot=true;strip.userData.noInk=true;desk.add(strip);
 const findScreen=(name,material)=>{let found;workstation.getObjectByName(name).traverse(o=>{if(o.isMesh&&o.material.name===material)found=o;});if(!found)throw Error('Screen material missing: '+name);return found;};
 const screens=[findScreen('GamingLandscapeMonitor','Material.009'),findScreen('GamingPortraitMonitor','screen.002')];
 screens[0].name='LandscapeWindows11Screen';screens[1].name='PortraitWindows11Screen';
 const rect=new THREE.Box3();for(const screen of screens){screen.geometry.computeBoundingBox();rect.union(screen.geometry.boundingBox);}
 for(const screen of screens){
  const p=screen.geometry.attributes.position,uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){uv[2*i]=(p.getX(i)-rect.min.x)/(rect.max.x-rect.min.x);uv[2*i+1]=(p.getY(i)-rect.min.y)/(rect.max.y-rect.min.y);}
  screen.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));screen.material=new THREE.MeshBasicMaterial({map:wallpaper,toneMapped:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});screen.material.userData.unique=true;screen.userData.noInk=true;screen.userData.dynamic=true;screen.userData.desktop='Windows11-spanned';
 }
 desk.updateWorldMatrix(true,true);
 const localBounds=o=>new THREE.Box3().setFromObject(o).applyMatrix4(desk.matrixWorld.clone().invert());
 const landscape=workstation.getObjectByName('GamingLandscapeMonitor'),portrait=workstation.getObjectByName('GamingPortraitMonitor');
 const lb=localBounds(landscape),pb=localBounds(portrait),lc=lb.getCenter(new THREE.Vector3()),pc=pb.getCenter(new THREE.Vector3());
 const bar=barModel.scene;bar.name='LandscapeMonitorLightBar';bar.position.set(lc.x,lb.max.y,lc.z);bar.userData.batchRoot=true;bar.userData.dynamic=true;bar.userData.noInk=true;bar.userData.id='screenbar';desk.add(bar);
 // Downward warm light illuminates the desk, without another shadow map.
 const light=new THREE.SpotLight('#fff0cb',.7,1.0,.80,.6,1);light.position.set(lc.x,lb.max.y+.012,lb.max.z+.04);light.target.position.set(-.23,.74,.10);light.name='MonitorBarDeskLight';desk.add(light,light.target);
 const led=bar.getObjectByName('LED_diffuser');led.material=led.material.clone();led.material.userData.unique=true;const glow=led.material;glow.update=k=>{glow.emissiveIntensity=1.5*k;bar.userData.powered=k>.5;};
 const wires=group();wires.name='DeskConnectedCables';wires.userData.batchRoot=true;wires.userData.dynamic=true;wires.userData.noInk=true;desk.add(wires);
 const from=(root,name)=>{desk.updateWorldMatrix(true,true);return desk.worldToLocal(root.getObjectByName(name).getWorldPosition(new THREE.Vector3())).toArray();};
 const video=from(tower,'PCVideoPort'),usb=from(tower,'PCUSBPort'),power=from(tower,'PCPowerPort');
 const connect=(name,points)=>{const cable=tube(points,.003,mat('#161b20',{roughness:.65}),{segs:40,radial:6});cable.name=name;cable.userData.noInk=true;cable.userData.endpoints=[points[0],points.at(-1)];wires.add(cable);return cable;};
 const socket=x=>[strip.position.x+x,strip.position.y+.025,strip.position.z];
 for(const [name,c,b,index] of [['Landscape',lc,lb,0],['Portrait',pc,pb,1]]){
  const port=[c.x,c.y,b.min.z-.004];
  connect(name+'VideoCable',[port,[c.x,c.y,-.30],[c.x,.77,-.35],[.30,.77,-.35],video]);
  connect(name+'PowerCable',[[port[0]+.02,port[1],port[2]],[c.x,.77,-.35],[c.x,.69,-.38],[c.x,.03,-.38],socket(-.09+index*.07)]);
 }
 const keyboard=desk.getObjectByName('Moonlander');connect('MoonlanderUSB',[[keyboard.position.x-.09,.767,keyboard.position.z-.09],[-.33,.767,-.12],[-.28,.768,-.33],[.30,.767,-.35],usb]);
 connect('PCPowerCable',[power,[power[0],.70,-.37],[power[0],.04,-.38],[.08,.03,-.35],socket(.06)]);
 connect('LightBarUSB',[[lc.x,lb.max.y-.02,lb.min.z],[lc.x,lb.max.y-.09,lb.min.z-.03],[lc.x,.77,-.35],[.30,.77,-.35],usb.map((v,i)=>v+(i===0?.015:0))]);
 const outlet=from(strip,'StripCordOutlet');connect('DeskStripPowerCord',[outlet,[outlet[0]+.06,.02,-.31],[.9,.014,-.38],[1.30,.012,-.65],[2.13,.012,-1.10]]);
 const end=[2.13,.012,-1.10];wires.add(box(.07,.02,.07,mat('#ecebe6'),...end));
 return{tower,strip,bar,wires,screens,light,glow};
}
