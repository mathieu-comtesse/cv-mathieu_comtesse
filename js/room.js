import { THREE, group, mat, inkify, ink, contactShadow, tube, box, mergeStatic } from './kit.js?v=cv-scene-v29';
import * as F from './furniture.js?v=cv-scene-v31';
import { createCharacter } from './character.js?v=cv-scene-v29';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { loadBuffer } from './kit.js?v=cv-scene-v29';
import { teaSet, shoePair, updateSteam } from './tea.js?v=cv-scene-v29';
import { createRitual } from './ritual.js?v=cv-scene-v29';
import { createChashitsu } from './chashitsu.js?v=cv-scene-v29';
import { createRetroSet } from './retro.js?v=cv-scene-v41';
import { createNav } from './nav.js?v=cv-scene-v29';
import { createDirector } from './director.js?v=cv-scene-v33';
import { createThought } from './thought.js?v=cv-scene-v29';
import { createWeather } from './weather.js?v=cv-scene-v29';
import { createJukebox } from './jukebox.js?v=cv-scene-v33';
import { TRACKS, COVER } from './music.js?v=bf01a16';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import {createBicyclePump} from './bicycle-pump.js?v=cv-scene-v31';

const DEG = Math.PI / 180;
const easeOutBounce = (x) => {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

export async function createRoom(container, bubbleEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;                       // carte d'ombres recalculée seulement 1 image sur 3 (la pièce est quasi statique)
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y pinch-zoom;image-rendering:pixelated';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;

  const hemi = new THREE.HemisphereLight('#fff7e8', '#c9b99c', 0.85);
  const sun = new THREE.DirectionalLight('#fff0dc', 2.0);
  sun.position.set(3.5, 7.5, -2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 20 });
  sun.shadow.radius = 5; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.3, color: '#3b4a73', depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  /* ─── textures ─── */
  const loader = new THREE.TextureLoader();
  const load = (url) => new Promise((res) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
  const [rugTex, paintTex, coverTex, ekGltf, setuGltf, sofaGltf, falkGltf, borneGltf, akariGltf, bikeGltf] = await Promise.all([load('assets/tapis.webp?v=cv-scene-v17'), load('assets/tableau.jpg?v=cv-scene-v17'), load(COVER.file), loadBuffer('assets/ekstrem-v25.glb?v=cv-scene-v17').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/setu-v25.glb?v=cv-scene-v17').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/ds450-v25.glb?v=cv-scene-v17').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/falkland.glb?v=cv-scene-v17').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/borne-beton.glb?v=cv-scene-v17').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/akari.glb?v=cv-scene-v17').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/road-bike-finish-v25.glb?v=cv-scene-v17').then(b=>new Promise((res,rej)=>new GLTFLoader().parse(b,'',res,rej))).catch(()=>null)]);

  const seatCalibration=await fetch('assets/seat-calibration-v26.json').then(r=>{if(!r.ok)throw Error('Seat calibration missing');return r.json();});

  // MODE STABLE : la scène locale démarre sans attendre Native.
  // Le pont exact est chargé plus tard en import dynamique : aucune panne du runtime
  // de référence ne peut empêcher le décor Three.js de s'afficher.
  let nativeBridge = null;
  let sceneMuted = false;
  const setSceneMuted = value => { sceneMuted = !!value; nativeBridge?.sceneApi.sound?.setMuted?.(sceneMuted); container.dataset.muted=String(sceneMuted); };

  /* ─── mobilier ─── */
  const world = group(); scene.add(world);
  const model = file => loadBuffer('assets/'+file+'?v=cv-scene-v17').then(b=>new Promise((resolve,reject)=>new GLTFLoader().parse(b,'',resolve,reject)));
  const [workstationModel,consoleModel,controllerModel,olivettiModel,mamiyaModel,chryslerModel]=await Promise.all(['workstation-user-v41.glb','ps1-console-user-v41.glb','ps1-controller-user-v41.glb','olivetti-user-v41.glb','mamiya-user-v41.glb','chrysler-miniature-user-v41.glb'].map(model));
  const [usmModel,pumpModel,jblModel]=await Promise.all(['usm-haller-green-v31.glb','bicycle-pump-v31.glb','jbl.glb'].map(model));
  const items = [];                     // { holder, obj, delay, id }
  const add = (id, obj, x, z, yaw = 0, y = 0, delay = 0, parent = world, contact = 1) => {
    const holder = group(obj);
    holder.position.set(x, y, z); holder.rotation.y = yaw;
    holder.userData.id = id;
    parent.add(holder);
    if (parent === world) {
      items.push({ holder, obj, delay, id, base: obj.position.clone() });
      if (contact) {
        holder.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(holder), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
        const sh = contactShadow(Math.min(sz.x, 2.4) * 1.35 * contact, Math.min(sz.z, 2.4) * 1.35 * contact, 0.34);
        sh.position.set(c.x, 0.003, c.z); world.add(sh); items[items.length - 1].shadow = sh;
      }
    }
    return holder;
  };

  const lamps = {};
  const mkLamp = (key, glowMat, light, onColor, offColor) => { lamps[key] = { glow: glowMat, light, on: false, onColor, offColor, k: 0 }; glowMat.color.set(offColor); if (glowMat.userData) glowMat.userData.unique = true; };

  if (rugTex) add('rug', F.rug(rugTex, 3.1, 4.3), 0.0, 1.1, 0, 0, 0.0, world, 0);

  // Bureau Native exact : les objets viennent directement du runtime local Native.
  // Fallback procédural uniquement si le mini-runtime n'a pas pu se charger.
  const deskSet = group();
  deskSet.userData.dynamic = false;

  let uw;
  const brontes = F.brontes();

  if (nativeBridge?.deskSet) {
    deskSet.add(nativeBridge.deskSet);
    uw = nativeBridge.deskDisplay || nativeBridge.deskSet.getObjectByName('Apple Studio Display');
    if (uw) {
      uw.userData.id = 'pc';
      uw.traverse?.((o) => { if (o.isMesh) o.userData.id = 'pc'; });
    }

    // Le lampadaire déjà présent dans le CV est conservé, sans modifier le set Native.
    

    if (nativeBridge.book) {
      nativeBridge.book.userData.dynamic = true;
      world.add(nativeBridge.book);
    }
    if (nativeBridge.wateringCan) {
      nativeBridge.wateringCan.userData.dynamic = true;
      world.add(nativeBridge.wateringCan);
    }
  } else {
    deskSet.add(F.desk());
    const workstation=workstationModel.scene;workstation.name='UserWorkstation';workstation.position.y=.74;deskSet.add(workstation);
    // Keep each named part stable through static geometry batching and ray casting.
    for(const part of [...workstation.children])if(part.isMesh){const name=part.name,holder=group();holder.name=name;holder.userData.batchRoot=true;part.name=name+':TexturedMesh';part.removeFromParent();holder.add(part);workstation.add(holder);part.castShadow=part.receiveShadow=true;}
    uw=workstation.getObjectByName('UserWorkstationMonitor');uw.userData.id='pc';
    const desktopLamp=workstation.getObjectByName('UserDeskLamp');desktopLamp.userData.id='deskLamp';
    const bulb=workstation.getObjectByName('UserDeskLampBulb'),lampGlow= new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),new THREE.MeshStandardMaterial({color:'#78736a',emissive:'#ffdda0',emissiveIntensity:.3}));lampGlow.userData.dynamic=true;lampGlow.userData.noInk=true;bulb.add(lampGlow);
    mkLamp('deskLamp',lampGlow.material,new THREE.PointLight('#ffe2a5',0,2,2),'#fff1cc','#78736a');

    const titanium = new THREE.MeshStandardMaterial({ color: '#7598d0', roughness: 0.58, metalness: 0 });
    const mug = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.049, 0.095, 28, 1, true), titanium); body.position.y = 0.056; mug.add(body);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.004, 28), titanium); bottom.position.y = 0.009; mug.add(bottom);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.0022, 6, 28), titanium); lip.rotation.x = Math.PI / 2; lip.position.y = 0.104; mug.add(lip);
    mug.name = 'DeskMug'; mug.userData.id='coffee'; mug.userData.dynamic=true; mug.position.set(-0.78, 0.742, 0.29); deskSet.add(mug);

    inkify(deskSet, { skip: (o) => {
      for (let p = o; p; p = p.parent) if (p.userData && p.userData.id === 'brontes') return true;
      return false;
    } });
  }

  add('desk', deskSet, -3.1, 0.25, Math.PI / 2, 0, 0.12);
  deskSet.updateWorldMatrix(true,true);lamps.deskLamp?.light.position.copy(deskSet.getObjectByName('UserDeskLampBulb').getWorldPosition(new THREE.Vector3()));
  mkLamp('brontes', brontes.userData.glow, new THREE.PointLight('#ffd9a0', 0, 3, 2), '#fff0d0', '#9a948a');

  // chargement Native asynchrone : bureau/PC/tasse + animations/sons exacts,
  // mais seulement APRÈS que la pièce locale ait été construite.
  const fallbackDeskChildren = [...deskSet.children];
  let bridgeStarted = false;
  container.dataset.native = 'pending';
  const loadNativeBridge = () => {
    bridgeStarted = true;
    container.dataset.native = 'loading';
    import('./native-room.js?v=cv-scene-v41')
      .then((m) => m.getNativeRoomBridge())
      .then((bridge) => {
        if (!bridge) return;
        nativeBridge = bridge;
        for(const name of ['Nommo left speaker','Nommo right speaker']){const o=bridge.sceneApi.shupi.scene.getObjectByName(name);if(o)o.visible=false;bridge.deskSet.getObjectByName(name)?.removeFromParent();}
        bridge.sceneApi.sound?.setMuted?.(sceneMuted);
        deskSet.getObjectByName('DeskMug')?.removeFromParent();
        world.add(bridge.coffeeMug);bridge.parkCoffeeMug(deskSet);
        stations.coffee.think.obj=bridge.coffeeMug;

        // Le bureau personnalisé reste en place ; le pont fournit les gestes et les sons.
        if (bridge.book && !bridge.book.parent) {
          bridge.book.userData.dynamic = true;
          world.add(bridge.book);
        }
        if (bridge.wateringCan && !bridge.wateringCan.parent) {
          bridge.wateringCan.userData.dynamic = true;
          world.add(bridge.wateringCan);
        }
        if (bridge.effects) world.add(bridge.effects);
        thought.useSource(bridge.sceneApi, bridge.bookPreview);
        if (thoughtFor) thought.show(thoughtFor.think?.obj, thoughtFor.label, thoughtFor.think);

        console.info('[Native] pont exact chargé après affichage de la scène');
        container.dataset.native = 'ready';
      })
      .catch((e) => {
        if (nativeBridge) restoreLocalDesk(e);
        container.dataset.native = 'fallback';
        console.warn('[Native] pont asynchrone indisponible, fallback conservé', e);
      });
  };

  const restoreLocalDesk = (error) => {
    const bridge = nativeBridge;
    nativeBridge = null;
    bridge?.stop();
    bridge?.book?.removeFromParent();
    bridge?.wateringCan?.removeFromParent();
    bridge?.effects?.removeFromParent();
    thought.useSource(null);
    for (const child of [...deskSet.children]) deskSet.remove(child);
    for (const child of fallbackDeskChildren) deskSet.add(child);
    uw = deskSet.children.find((o) => o.userData.id === 'pc');
    container.dataset.native = 'fallback';
    console.warn('[Native] rendu incompatible, bureau local restauré', error);
  };

  const chair = F.officeChairFrom(setuGltf);
  add('chair', chair, -2.15, 0.3, -Math.PI / 2 + 0.15, 0, 0.2);

  let bicycle=null,bicyclePump=null;
  if (bikeGltf) {
    const bike = F.roadBikeFrom(bikeGltf);bicycle=bike;
    add('bike', bike, 1.0, -3.35, 0.12, 0, 0.8);
    bicyclePump=createBicyclePump(pumpModel,bike);
    add('pump',bicyclePump.root,2.65,-4.15,-Math.PI/2,0,.85);
  }

  const STOOL_X = 2.0, STOOL_Z = 4.55;           // tabouret à droite du canapé, portant le bonsaï
  const bonsai = F.bonsai(); inkify(bonsai, { skip: (o) => !['9b9a92'].includes(o.material.color.getHexString()) }); add('bonsai', bonsai, STOOL_X, STOOL_Z, 0.5, 0.372, 0.42);
  const alo = F.alocasia(); inkify(alo, { skip: (o) => !(o.material.map && o.material.map.image && o.material.map.image.width === 128 && o.material.side === THREE.DoubleSide) });
  add('alocasia', alo, -3.1, 3.25, 0.6, 0, 0.9).scale.setScalar(0.9);
  const sofaObj = F.sofaFrom(sofaGltf, 2.2, { recline: 0, slide: 0, lateral: 0 });
  add('sofa', sofaObj, 0.35, 4.55, Math.PI, 0, 0.95);
  // suspension Falkland, à gauche du canapé, accrochée au plafond
  const FK = { x: -1.35, z: 4.55, top: 3.15 };
  const falk = F.falkland(falkGltf, 1.0, 0.45);
  add('falk', falk, FK.x, FK.z, 0.4, FK.top, 1.0, world, 0);
  mkLamp('falk', falk.userData.glow, new THREE.PointLight('#ffd9a0', 0, 4.5, 2), '#fff0d0', '#ffffff');
  lamps.falk.light.position.set(FK.x, FK.top - falk.userData.height / 2, FK.z);
  

  const EKS = 1.3;                           // l'Ekstrem est un grand fauteuil
  const ek = F.ekstremFrom(ekGltf); add('ekstrem', ek, 2.3, -0.95, -0.45, 0, 0.35).scale.setScalar(EKS);
  // pièce du thé excentrée (plate-forme de tatamis, shoji coulissants, balcon en bois, mer) ; origine du thé = zabuton de l'invité
  const CS = { x: -5.5, z: 7.3 };
  const cs = createChashitsu();
  add('chashitsu', cs.group, CS.x, CS.z, 0, 0, 0.5, world, 0);
  const TEA = { x: CS.x, z: CS.z - 0.45, y: cs.spec.RH - 0.055 };
  const tea = teaSet({ mat: false });
  add('cha', tea, TEA.x, TEA.z, 0, TEA.y, 0.6, world, 0);
  const shoes = shoePair(); inkify(shoes); add('shoes', shoes, CS.x - 0.95, CS.z + cs.spec.RD / 2 + 0.4, 0, cs.spec.DK.y + 0.02, 0.7, world, 0);
  const stool = F.stool(); add('stool', stool, STOOL_X, STOOL_Z, 0.2, 0, 0.55);

  // lanterne du balcon : l'andon d'origine est remplacé par la lampe Akari de Noguchi (modèle réel)
  while (cs.lantern.children.length) cs.lantern.remove(cs.lantern.children[0]);
  const akari = F.akariFromGltf(akariGltf); akari.rotation.y = -0.5; cs.lantern.add(akari);
  mkLamp('andon', akari.userData.glow, new THREE.PointLight('#ffd9a0', 0, 2.5, 2), '#ffe2a0', '#cfc8b4');
  lamps.andon.light.position.set(CS.x + cs.spec.RW / 2 - 0.5, 0.4, CS.z + cs.spec.DK.z0 + 0.55);
  world.add(lamps.andon.light);
  // télé cathodique + PS1 + manette sur le tapis, câbles au sol
  const retro = createRetroSet({consoleModel,controllerModel});
  add('tv', retro.group, -0.35, 2.2, 0, 0.018, 0.55, world, 0).scale.setScalar(1.3);
  world.updateMatrixWorld(true);
  // cordon de la multiprise : serpente sur le tapis, sort par le bord droit, passe du côté gauche (vu de l'écran) de l'étagère blanche et rejoint la prise au sol
  const cs0 = retro.group.localToWorld(retro.cordStart.clone());
  const cordPts = [[cs0.x, 0.03, cs0.z], [cs0.x + 0.22, 0.03, cs0.z - 0.16], [cs0.x + 0.5, 0.03, cs0.z + 0.04], [cs0.x + 0.78, 0.03, cs0.z + 0.35], [1.25, 0.03, 2.4], [1.52, 0.026, 2.75], [1.75, 0.01, 3.0], [2.05, 0.008, 3.12], [2.4, 0.008, 2.98], [2.75, 0.008, 3.12], [3.1, 0.008, 2.98], [3.45, 0.008, 3.1], [3.7, 0.008, 3.08]];
  const cord = tube(cordPts, 0.0105, new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.6 }), { segs: 160, radial: 6 });
  const wallPlug = group(box(0.05, 0.03, 0.04, mat('#17181a'), 3.69, 0.012, 3.08));
  const outlet = group(box(0.14, 0.012, 0.14, mat('#ecebe6', { roughness: 0.5 }), 3.82, 0.006, 3.08), box(0.02, 0.014, 0.012, mat('#222'), 3.82, 0.007, 3.05), box(0.02, 0.014, 0.012, mat('#222'), 3.82, 0.007, 3.11));
  add('strip', group(cord, wallPlug, outlet), 0, 0, 0, 0, 0.6, world, 0);
  const usmSet = group();
  const usmBody=usmModel.scene;usmBody.name='USM Haller imported sideboard';usmBody.userData.batchRoot=true;
  const importedFront=usmBody.getObjectByName('USMDrawerFront');importedFront.removeFromParent();importedFront.userData.dynamic=true;
  usmSet.add(usmBody);
  const crate = F.usmDrawer({x:-.375,y:.556,z:.253,w:.733,h:.333}, coverTex, TRACKS, COVER); usmSet.add(crate.root);
  const slidingDrawer=crate.root.children[0];slidingDrawer.remove(slidingDrawer.children[0]);importedFront.position.x=.375;slidingDrawer.add(importedFront);
  const amp = F.amplifier(); amp.position.set(-0.37, 0.7415, 0); usmSet.add(amp);
  const AMPH = 0.085;
  const tt = F.turntable(); inkify(tt, { skip: (o) => o.material.color.getHexString() !== '3f2d22' }); tt.position.set(-0.37, 0.7415 + AMPH, 0); usmSet.add(tt);
  const rca = F.rcaCables(-0.37, -0.158, 0.7415, 0.7415 + 0.05); usmSet.add(rca);
  const cl = F.borneFromGltf(borneGltf); add('beton', cl, 0.44, 0.0, 0, 0.7415, 0, usmSet);
  add('usm', usmSet, -0.7, -2.4, 0, 0, 0.45);
  const miniatureCar=chryslerModel.scene;miniatureCar.name='MiniatureChrysler1971';miniatureCar.userData.batchRoot=true;miniatureCar.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  add('miniature-car',miniatureCar,-2.80,-1.90,-.70,0,.66);

  const ampTerminals=F.ampPosts(amp);
  const speakers=[];
  for(const [side,x,z,yaw] of [['L',-1.85,-2.55,.18],['R',.4,-2.65,-.18]]){
    const obj=F.speakerFromGltf(jblModel,1.1);obj.name=`JBL ${side}`;
    const posts=F.speakerPosts(obj);
    add(`jbl${side}`,obj,x,z,yaw,0,.7);
    speakers.push({obj,side,posts,baseScale:obj.scale.clone(),cables:[]});
  }
  world.updateMatrixWorld(true);
  for(const s of speakers)for(const polarity of ['black','red']){
    const a=amp.localToWorld(ampTerminals[s.side+polarity].clone());
    const b=s.obj.localToWorld(s.posts[polarity].clone()), offset=polarity==='red'?.014:0;
    const cable=tube([a.toArray(),[a.x,a.y+.018,-2.78],[a.x,.45,-2.81],[a.x,.013,-2.81],[s.obj.parent.position.x,.013,-2.95-offset],[b.x,.013,b.z-.08],b.toArray()],.004,mat(polarity==='red'?'#563c31':'#202124'),{segs:64,radial:5});
    cable.name=`JBL ${s.side} ${polarity} cable`;
    cable.userData.dynamic=true;
    const positions=cable.children[0].geometry.attributes.position,rest=positions.array.slice(),weights=new Float32Array(positions.count);
    for(let i=0;i<positions.count;i++)weights[i]=Math.max(0,1-Math.hypot(rest[i*3]-b.x,rest[i*3+1]-b.y,rest[i*3+2]-b.z)/.15);
    s.cables.push({cable,positions,rest,weights,post:s.posts[polarity],endCap:cable.children.at(-1),capY:b.y});
    cable.userData.connection={from:a.toArray(),to:b.toArray(),side:s.side,polarity};
    add(`jblCable${s.side}${polarity}`,cable,0,0,0,0,.8,world,0);
  }
  mkLamp('beton', cl.userData.glow, new THREE.PointLight('#ffe9c4', 0, 2.5, 2), '#fff3d6', '#8a8780');

  const ARC_YAW = -2.36;                      // le bras du lampadaire s'incline vers le tapis
  const arc = F.arcLamp();
  add('arc', arc, 0.85, -2.15, ARC_YAW, 0, 0.6, world, 0);
  mkLamp('arc', arc.userData.glow, new THREE.PointLight('#ffe0a8', 0, 6, 2), '#ffe6b0', '#8a8272');

  if (paintTex) { const pt = add('painting', F.painting(paintTex), -0.7, -2.95, 0, 1.35, 0.7, world, 0); pt.scale.setScalar(1.3); }
  const dra = F.dracaena(); inkify(dra, { skip: (o) => o.material.color.getHexString() !== 'b3a893' }); add('dracaena', dra, 2.85, -2.45, 0.3, 0, 0.65);
  
  const ekBox = new THREE.Box3().setFromObject(ek.parent); // ligne de l'étagère = pied le plus extérieur de l'Ekstrem
  ek.parent.updateMatrixWorld(true);
  const whiteShelf=F.shelf();
  add('shelf1', whiteShelf, ekBox.max.x - 0.04, 1.8, Math.PI / 2, 0, 0.8);
  add('brontes', brontes, -0.40, 0, 0, 1.303, 0, whiteShelf, 0);
  const typewriter=olivettiModel.scene;typewriter.name='OlivettiUnderwood280';typewriter.userData.batchRoot=true;typewriter.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  add('olivetti',typewriter,.22,0,0,1.303,0,whiteShelf,0);
  const filmCamera=mamiyaModel.scene;filmCamera.name='Mamiya6451000S';filmCamera.userData.batchRoot=true;filmCamera.userData.photoGalleryTarget=true;filmCamera.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
  add('mamiya',filmCamera,.62,0,0,1.303,0,whiteShelf,0);


  // positions des sources lumineuses (repère monde)
  const yawed = (v, yaw, ox, oz) => { v = v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); return [ox + v.x, v.y, oz + v.z]; };
  lamps.arc.light.position.set(...yawed(new THREE.Vector3(1.38, 2.05, 0), ARC_YAW, 0.85, -2.15));
  lamps.beton.light.position.set(-0.3, 1.0, -2.3);
  whiteShelf.updateWorldMatrix(true,true);
  lamps.brontes.light.position.copy(whiteShelf.localToWorld(new THREE.Vector3(-0.40,1.70,0)));
  for (const L of Object.values(lamps)) world.add(L.light);

  /* ─── personnage ─── */
  /* ─── performances : fusion des maillages statiques (≈ 1 500 maillages → quelques centaines d'appels de rendu) ─── */
  tt.userData.dynamic = true; crate.root.userData.dynamic = true; cs.group.userData.dynamic = true; tea.userData.dynamic = true; retro.pad.userData.dynamic = true;
  { for(const name of ['Moonlander','ErgonomicVerticalMouse','UltrawidePanel','PortraitPanel','UltrawideMonitorArm','PortraitMonitorArm','UltrawideWebcam','GamingDesktopPC','RoadBikeFinish']){const object=world.getObjectByName(name);if(object)object.userData.batchRoot=true;}
    world.updateMatrixWorld(true); let made = 0; for (const it of items) made += mergeStatic(it.obj);
    const swivel=chair.userData.swivel;swivel.userData.dynamic=false;made+=mergeStatic(swivel);swivel.userData.dynamic=true;fallbackDeskChildren.splice(0,fallbackDeskChildren.length,...deskSet.children); if (location.search.includes('perf')) console.log('fusion :', made, 'maillages'); }

  const hero = await createCharacter();
  hero.group.visible = false; world.add(hero.group);
  if (/[?&]squelette/.test(location.search)) scene.add(new THREE.SkeletonHelper(hero.group));
  const ritual = createRitual({ hero, tea });

  /* ─── caméra orthographique ─── */
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const view = { az: 36 * DEG, el: 26 * DEG, zoom: 1, tAz: 36 * DEG, tEl: 26 * DEG, tZoom: 1 };
  const target = new THREE.Vector3(0.1, 0.8, -0.2), tgt = target.clone(), home = target.clone();
  const DEF = { az: 36 * DEG, el: 26 * DEG, zoom: 1 };
  let fit = 1, W = 1, H = 1, halfW = 1, panU = 0, panV = 0, panUser = 0, followTea = false;

  let cameraMode='follow',fitReady=false;
  const cameraButton=document.createElement('button');cameraButton.type='button';cameraButton.className='room-camera';container.append(cameraButton);
  const setCameraMode=mode=>{cameraMode=mode;container.dataset.cameraMode=mode;cameraButton.textContent=mode==='follow'?'Caméra libre':'Suivre le personnage';cameraButton.setAttribute('aria-pressed',String(mode==='follow'));renderer.domElement.style.touchAction=mode==='follow'?'pan-y pinch-zoom':'none';};
  setCameraMode('follow');
  let navigationMode='pan';
  const navigationControls=document.createElement('div');navigationControls.className='room-navigation';navigationControls.setAttribute('role','group');navigationControls.setAttribute('aria-label','Manipulation du décor');
  navigationControls.innerHTML='<button type="button" data-navigation="pan" aria-label="Déplacer le décor" aria-pressed="true" title="Clic maintenu pour déplacer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/></svg>Déplacer</button><button type="button" data-navigation="rotate" aria-label="Tourner le décor" aria-pressed="false" title="Clic maintenu pour tourner à 360°"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 9a8 8 0 0 0-14-3L3 9m0-6v6h6m-5 6a8 8 0 0 0 14 3l3-3m0 6v-6h-6"/></svg>Tourner</button>';
  container.append(navigationControls);
  const selectNavigation=mode=>{navigationMode=mode;container.dataset.navigationMode=mode;navigationControls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.navigation===mode)));};
  navigationControls.querySelectorAll('button').forEach(b=>b.onclick=()=>{selectNavigation(b.dataset.navigation);setCameraMode('free');});
  navigationControls.addEventListener('pointerdown',e=>e.stopPropagation());navigationControls.addEventListener('click',e=>e.stopPropagation());selectNavigation('pan');
  cameraButton.onclick=e=>{e.stopPropagation();const mode=cameraMode==='follow'?'free':'follow';if(mode==='follow')selectNavigation('pan');setCameraMode(mode);};
  const zoomControls=document.createElement('div');zoomControls.className='room-zoom';zoomControls.setAttribute('role','group');zoomControls.setAttribute('aria-label','Zoom du décor');
  zoomControls.innerHTML='<button type="button" class="room-zoom-in" aria-label="Agrandir le décor">+</button><label class="room-zoom-label" for="room-zoom-range">Zoom</label><input id="room-zoom-range" type="range" min="-3" max="4" step="0.02" value="0" aria-label="Zoom du décor"><output for="room-zoom-range">100 %</output><button type="button" class="room-zoom-out" aria-label="Réduire le décor">−</button><button type="button" class="room-zoom-reset" aria-label="Réinitialiser le zoom">1:1</button>';
  container.append(zoomControls);const zoomRange=zoomControls.querySelector('input'),zoomOutput=zoomControls.querySelector('output');
  const syncZoom=()=>{const z=view.tZoom;zoomRange.min=String(Math.min(-3,Math.log2(z)));zoomRange.max=String(Math.max(4,Math.log2(z)));zoomRange.value=String(Math.log2(z));zoomRange.setAttribute('aria-valuetext',Math.round(z*100)+' %');zoomOutput.value=Math.round(z*100)+' %';};
  const changeZoom=z=>{setCameraMode('free');view.tZoom=Math.max(.0001,z);syncZoom();};
  zoomRange.addEventListener('input',()=>changeZoom(2**Number(zoomRange.value)));
  zoomControls.querySelector('.room-zoom-in').onclick=()=>changeZoom(view.tZoom*1.25);
  zoomControls.querySelector('.room-zoom-out').onclick=()=>changeZoom(view.tZoom/1.25);
  zoomControls.querySelector('.room-zoom-reset').onclick=()=>changeZoom(1);
  // Les boutons et le curseur ne déclenchent aucune action du personnage.
  zoomControls.addEventListener('pointerdown',e=>e.stopPropagation());zoomControls.addEventListener('click',e=>e.stopPropagation());
  const panCamera=(dx,dy)=>{setCameraMode('free');const scale=2*fit/view.zoom/H;const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);tgt.addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);};
  const rotateCamera=(dx,dy)=>{setCameraMode('free');view.tAz-=dx*.006;view.tEl+=dy*.004;};
  let scrollOff = 0, scrollT = 0;                                  // la caméra baisse quand l'en-tête défile (comme la scène de référence)
  function orient() {
    const r = 40, ev = view.el - (cameraMode==='follow'?scrollOff * 12 * DEG:0);
    camera.position.set(
      target.x + Math.sin(view.az) * Math.cos(ev) * r,
      target.y + Math.sin(ev) * r,
      target.z + Math.cos(view.az) * Math.cos(ev) * r);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
  }
  /* cadrage : mêmes proportions que la scène de référence (pièce principale sur ~75 % de la hauteur, ~78 % de la largeur au plus).
   * La pièce du thé et son jardin sont à gauche, hors cadre sur écran moyen : la caméra glisse vers eux quand le personnage y va. Sur téléphone la scène dépasse de l'écran. */
  const TEAGROUP = new Set(['chashitsu', 'cha', 'shoes']);
  let csX = 0, csHalf = 1, tableX0 = 0, tableX1 = 0, roomCx = 0, roomCy = 0;
  function computeFit() {
    const save = { az:view.az,el:view.el,target:target.clone(),tgt:tgt.clone(),positions:items.map(i=>i.obj.position.clone()) };
    const gp = cs.garden.parent; gp.remove(cs.garden);                  // le jardin n'a pas de bord : il ne compte pas dans le cadrage
    view.az = DEF.az; view.el = DEF.el; orient();
    items.forEach((i) => { i.obj.position.copy(i.base); });
    world.updateMatrixWorld(true);
    const room = new THREE.Box3(), bb = new THREE.Box3();
    for (const it of items) if (!TEAGROUP.has(it.id)) room.union(bb.setFromObject(it.holder));
    room.getCenter(target); home.copy(target);if(!fitReady)tgt.copy(target);
    orient();
    const inv = camera.matrixWorldInverse, v = new THREE.Vector3();
    const ext = (filter) => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const it of items) {
        if (!filter(it)) continue;
        bb.setFromObject(it.holder);
        for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, y, z).applyMatrix4(inv); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      }
      return [x0, x1, y0, y1];
    };
    const [rx0, rx1, ry0, ry1] = ext((it) => !TEAGROUP.has(it.id));
    const [tx0, tx1] = ext((it) => TEAGROUP.has(it.id));
    gp.add(cs.garden);
    const mx = (rx1 - rx0) / 2, my = (ry1 - ry0) / 2, aspect = W / H;
    roomCx = (rx0 + rx1) / 2; roomCy = (ry0 + ry1) / 2;
    fit = aspect >= 1.1 ? Math.max(my / 0.75, mx / 0.78 / aspect) : mx / (1.35 * aspect);
    halfW = mx; tableX0 = rx0 - roomCx; tableX1 = rx1 - roomCx;
    csX = (tx0 + tx1) / 2 - roomCx; csHalf = (tx1 - tx0) / 2;
    view.az = save.az; view.el = save.el;
    if(fitReady){target.copy(save.target);tgt.copy(save.tgt);}fitReady=true;items.forEach((i,n)=>i.obj.position.copy(save.positions[n]));
  }
  let resScale = .85;                                           // résolution adaptative : baisse si l'image met trop de temps, remonte si tout va bien
  function resize() {
    W = container.clientWidth || 1; H = container.clientHeight || 1;
    // rendu en basse définition (≈720 px de haut), agrandi sans lissage : même grain que la scène de référence
    const ih = Math.min(H * (window.devicePixelRatio || 1), 720) * resScale, k = ih / H;
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(W * k), Math.round(ih), false);
    ink.res.value.set(Math.round(W * k), Math.round(ih));
    ink.px = Math.max(2, 3 * ih / 720); if (ink.mat) ink.mat.uniforms.uPx.value = ink.px;
    computeFit(); applyFrustum();
  }
  function applyFrustum() {
    const aspect = W / H, h = fit / view.zoom, wv = h * aspect;
    camera.left=-wv;camera.right=wv;camera.top=h;camera.bottom=-h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);

  /* ─── interaction ─── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickIdAt = (cx, cy) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(world, true);
    for (const h of hits) {
      let vis = true; for (let q = h.object; q; q = q.parent) if (!q.visible) { vis = false; break; }
      if (!vis) continue;
      let o = h.object;
      while (o && o !== world) { if (o.userData.id) return o.userData.id; o = o.parent; }
    }
    return null;
  };

  const pointers = new Map();
  let drag = null, pinch = 0, hovered = null, hdrag = null, lastHover = 0;
  let autonomousPauseUntil = 0;
  const pauseAutonomy = (ms = 18000) => { autonomousPauseUntil = performance.now() + ms; };
  const el = renderer.domElement;el.tabIndex=0;el.setAttribute('aria-label','Décor : choisir Déplacer ou Tourner, puis maintenir et glisser ; flèches du clavier pour la même action ; barre latérale pour zoomer');el.addEventListener('contextmenu',e=>e.preventDefault());
  // Portrait Shupi : suivi du pointeur normalisé (-1..1), comme /info/?portrait.
  const updatePortraitLook = (e) => {
    if (e.pointerType === 'touch' || !hero.group.visible || !hero.lookAtPointer) return;
    const r = el.getBoundingClientRect();
    hero.lookAtPointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };
  el.addEventListener('pointerleave', () => hero.resetLook?.());
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), gp = new THREE.Vector3();
  const ndcOf = (cx, cy) => { const r = el.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const groundAt = (cx, cy) => { ndcOf(cx, cy); return ray.ray.intersectPlane(groundPlane, gp) ? gp.clone() : null; };
  // le personnage est saisi quand le pointeur est près de son corps (capsule pieds-tête projetée à l'écran)
  const _h = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3();
  const heroNear = (cx, cy) => {
    if (!hero.group.visible) return false;
    const r = el.getBoundingClientRect();
    const scr = (v) => { const q = v.clone().project(camera); return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; };
    hero.head.getWorldPosition(_h); _f.copy(hero.group.position); _f.y += 0.05;
    _r.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(0.3).add(_h);
    const A = scr(_h), B = scr(_f), R = Math.abs(scr(_r)[0] - A[0]) * 1.1;
    const abx = B[0] - A[0], aby = B[1] - A[1], t = Math.max(0, Math.min(1, ((cx - A[0]) * abx + (cy - A[1]) * aby) / (abx * abx + aby * aby || 1)));
    return Math.hypot(cx - (A[0] + abx * t), cy - (A[1] + aby * t)) < R;
  };
  el.addEventListener('pointerdown', (e) => {
    nativeBridge?.resumeSound?.();
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      if (!appOpen && navigationMode==='pan' && e.button===0 && !e.shiftKey && !e.altKey && heroNear(e.clientX, e.clientY)) { pauseAutonomy(6000); hdrag = { x: e.clientX, y: e.clientY, moved: 0, lifted: false }; }
      else {el.focus({preventScroll:true});drag={x:e.clientX,y:e.clientY,moved:0,t:performance.now(),pan:navigationMode==='pan'&&!e.altKey&&e.button!==2};}
    }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; hdrag = null; }
  });
  el.addEventListener('pointermove', (e) => {
    updatePortraitLook(e);
    const p = pointers.get(e.pointerId);
    if (p) {
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if(pinch){setCameraMode('free');view.tZoom=Math.max(.0001,view.tZoom*(d/pinch));panCamera(dx/2,dy/2);}
        pinch = d;
      } else if (hdrag) {
        hdrag.moved += Math.abs(dx) + Math.abs(dy);
        if (!hdrag.lifted && hdrag.moved > 8) { hdrag.lifted = true; director.lift(); showZones(true); el.style.cursor = 'grabbing'; }
        if (hdrag.lifted) { const g = groundAt(e.clientX, e.clientY); if (g) director.carry(g.x, g.z); zoneHover(e.clientX, e.clientY); }
      } else if (drag) {
        drag.moved += Math.abs(dx) + Math.abs(dy);
        if(drag.moved>6){if(drag.pan)panCamera(dx,dy);else rotateCamera(dx,dy);el.style.cursor='grabbing';}
      }
    } else {
      if (crate.isOpen) { ndcOf(e.clientX, e.clientY); crateHover = crate.indexAt(ray.ray); crate.setSel(crateHover); }
      const now = performance.now();
      if (now - lastHover > 80) {                                    // le survol interroge toute la scène : au plus 12 fois par seconde
        lastHover = now;
        const near = heroNear(e.clientX, e.clientY);
        const id = crateHover >= 0 ? 'sleeve' : near ? 'hero' : pickIdAt(e.clientX, e.clientY);
        if (id !== hovered) { hovered = id; el.style.cursor = near ? 'grab' : id ? 'pointer' : 'grab'; }
      }
    }
  });
  const up = (e) => {
    pointers.delete(e.pointerId); pinch = 0;
    if (hdrag) {
      pauseAutonomy(6000);
      if (hdrag.lifted) {
        const g = groundAt(e.clientX, e.clientY), z = zoneAt(e.clientX, e.clientY);
        showZones(false);
        if (z) director.placeInto(z); else if (g) director.drop(g.x, g.z);
      } else { hero.flash('happy', 0.9); if (director.mode === 'activity') director.stand(); }
      hdrag = null; el.style.cursor = 'grab'; return;
    }
    if (drag && drag.moved <= 6 && performance.now() - drag.t < 500) {
      if (crate.isOpen) { ndcOf(e.clientX, e.clientY); const i = crate.indexAt(ray.ray); if (i >= 0) { crate.setSel(i); playTrack(i); drag = null; return; } }
      const id = pickIdAt(e.clientX, e.clientY);
      if (id) { pauseAutonomy(6000); activate(id); } else if (crate.isOpen && !jukebox.isOn) openCrate(false);      // tiroir laissé ouvert tant que la musique joue
    }
    drag = null; el.style.cursor = hovered ? 'pointer' : 'grab';
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  // La molette garde le défilement natif de la page, même en caméra libre.
  el.addEventListener('dblclick',()=>{view.tAz=DEF.az;view.tEl=DEF.el;view.tZoom=1;selectNavigation('pan');setCameraMode('follow');});
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){selectNavigation('pan');setCameraMode('follow');return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const move=navigationMode==='rotate'?rotateCamera:panCamera;move(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0,e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0);}else if(['+','=','-'].includes(e.key)){e.preventDefault();changeZoom(view.tZoom*(e.key==='-'?.8:1.25));}});
  el.style.cursor = 'grab';

  /* ─── navigation ─── */
  world.updateMatrixWorld(true);
  const nav = createNav({ x0: -8.4, x1: 5.4, z0: -4.8, z1: 12.8, radius: 0.34 });
  const footprint = (id, shrink = 0) => {
    const it = items.find((i) => i.id === id); if (!it) return;
    const bb = new THREE.Box3().setFromObject(it.holder);
    nav.block({ x0: bb.min.x + shrink, x1: bb.max.x - shrink, z0: bb.min.z + shrink, z1: bb.max.z - shrink });
  };
  ['desk', 'chair', 'usm', 'ekstrem', 'shelf1', 'sofa', 'stool', 'tv', 'bike', 'pump', 'jblL', 'jblR', 'miniature-car'].forEach((id) => footprint(id));
  // Block pots and lower stems; overhead leaves must not close walkable aisles.
  for(const id of ['alocasia','dracaena','bonsai']){
    const plant=items.find(i=>i.id===id)?.holder;if(!plant)continue;
    const bb=new THREE.Box3(),p=new THREE.Vector3();plant.updateMatrixWorld(true);
    plant.traverse(o=>{if(!o.isMesh||o.userData.isInk)return;const a=o.geometry.attributes.position;if(!a)return;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(p.y<0.55)bb.expandByPoint(p);}});
    if(!bb.isEmpty())nav.block({x0:bb.min.x,x1:bb.max.x,z0:bb.min.z,z1:bb.max.z});
  }
  nav.block({ x0: FK.x - 0.2, x1: FK.x + 0.2, z0: FK.z - 0.2, z1: FK.z + 0.2 });   // suspension : le fourreau descend à hauteur de tête
  nav.block({ x0: 0.55, x1: 1.15, z0: -2.45, z1: -1.85 });                      // pied du lampadaire (le bras passe au-dessus)
  nav.block({ x0: CS.x - 1.35, x1: CS.x + 1.35, z0: CS.z - 1.8, z1: CS.z + 1.8 });   // plate-forme du thé : on n'y entre que par la porte
  nav.block({ x0: CS.x - 2.05, x1: CS.x + 2.05, z0: CS.z + cs.spec.DK.z0, z1: CS.z + cs.spec.DK.z0 + 1.1 });   // balcon
  nav.block({ x0: CS.x - 3.5, x1: CS.x + 3.5, z0: CS.z + cs.spec.SEA.z0 - 0.3, z1: 14 });                              // étang
  nav.block({ x0: CS.x + 3.5, x1: CS.x + 12, z0: CS.z - 2.1, z1: 14 });                                                // jardin à droite (la rive est aussi interdite)
  nav.block({ x0: CS.x - 12, x1: CS.x - 1.35, z0: CS.z - 2.1, z1: 14 });                                               // jardin à gauche
  // seul le sentier de pas japonais à droite de la pièce du thé mène au balcon
  const floorY = (x, z) => {
    if (Math.abs(x - CS.x) < 1.35 && Math.abs(z - CS.z) < 1.8) return cs.spec.RH;
    if (Math.abs(x - CS.x) < 2.05 && z > CS.z + cs.spec.DK.z0 - 0.02 && z < CS.z + cs.spec.DK.z0 + 1.1) return cs.spec.DK.y;
    return 0;
  };

  /* ─── stations du personnage ─── */
  const seat = (x, z, yaw, back) => { const v = new THREE.Vector3(0, 0, back).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); return [x + v.x, 0, z + v.z]; };
  const deskYaw = -Math.PI / 2 + 0.15, ekYaw = -0.45;
  const can = { lean: 0.08, armR: -1.3, foreR: -0.4, head: 0.2 };
  const psThought = new THREE.Group(); psThought.name='PlayStation1Thought';
  const thoughtConsole=retro.console.clone(true);thoughtConsole.position.set(0,0,0);psThought.add(thoughtConsole);
  const thoughtPad=retro.pad.clone(true);thoughtPad.position.set(0,-.02,.34);psThought.add(thoughtPad);
  const TVBOX = { obj: psThought };
  let afterEnter = null, actSince = 0, actMode = '';
  const S = (o) => Object.assign({ face: 'neutral', y: 0 }, o);
  const stations = {
    desk:     S({ label: 'Travailler au bureau', clip: 'Sitting_Idle_Loop', nativeMode: 'work', sourceTarget: 'Standing desk', pose: 'bureau', seatId: 'chair', seatBack: 0.10, hipClearance: 0.09, y: 0, face: 'neutral', pos: seat(-2.15, 0.3, deskYaw, -0.03), yaw: deskYaw, approach: [-2.05, 1.05], noFace: true, think: { obj: deskSet, tiltDeg: 24, scale: 1.05, yaw: -52 } }),
    coffee: S({label:'Boire dans la tasse bleue',clip:'Idle_Loop',nativeMode:'coffee',sourceTarget:'Ceramic coffee mug',maxMs:8500,pos:[-2.16,0,.87],yaw:-Math.PI/2,face:'happy',think:{obj:deskSet.getObjectByName('DeskMug'),scale:1.1}}),
    bike: S({label:'Regonfler les pneus du vélo',clip:'Idle_Loop',maxMs:14500,pos:[3.18,0,-4.15],yaw:-Math.PI/2,face:'happy',think:{obj:bicyclePump?.root,scale:1.2}}),
    ekstrem:  S({ label: 'Lire dans le fauteuil', clip: 'Sitting_Idle_Loop', nativeMode: 'read', sourceTarget: 'DYVLINGE lounge chair', pose: 'fauteuil', seatId: 'ekstrem', seatBack: -0.10, seatSupport: seat(2.3, -0.95, ekYaw, -0.02), hipClearance: 0.09, y: 0, face: 'happy', pos: seat(2.3, -0.95, ekYaw, 0), yaw: ekYaw, approach: [1.85, -0.05], noFace: true, think: { obj: ek, tiltDeg: 30 } }),
    usm:      S({ label: 'Écouter un vinyle', clip: 'Idle_Loop', face: 'happy', ov: { lean: 0.3, armR: -0.95, foreR: -0.35, armL: -0.2, head: 0.25 }, pos: [-1.0, 0, -1.7], yaw: Math.PI, music: true, think: { obj: tt, tiltDeg: 28, scale: 1.1 } }),
    alocasia: S({ label: 'Arroser l\u2019alocasia', clip: 'Idle_Loop', nativeMode: 'water', sourceTarget: 'Chinese money plant', pose: 'arrose', maxMs: 12000, can: true, ov: can, pos: [-2.48, 0, 3.25], yaw: -1.57, think: { obj: alo, tiltDeg: 8, scale: 1.2 } }),
    bonsai:   S({ label: 'Arroser le bonsa\u00ef', clip: 'Idle_Loop', nativeMode: 'water', sourceTarget: null, pose: 'arrose', maxMs: 12000, can: true, ov: can, pos: [2.85, 0, 4.55], yaw: -1.57, think: { obj: bonsai, tiltDeg: 20, scale: 1.0 } }),
    dracaena: S({ label: 'Arroser le dragonnier', clip: 'Idle_Loop', nativeMode: 'water', sourceTarget: 'Snake plant', pose: 'arrose', maxMs: 12000, can: true, ov: can, pos: [3.65, 0, -2.45], yaw: -Math.PI / 2, think: { obj: dra, tiltDeg: 8, scale: 1.2 } }),
    sofa:     S({ label: 'Jouer \u00e0 la console', clip: 'Sitting_Idle_Loop', pose: 'console', nativeMode:'game', seatId: 'sofa', seatBack: -0.21, hipClearance: 0.09, y: 0, face: 'happy', pos: [0.90, 0, 4.43], yaw: Math.PI, approach: [0.90, 3.75], noFace: true, tv: true, think: TVBOX }),
    cha:      S({ label: 'C\u00e9r\u00e9monie du th\u00e9', ritual: true, maxMs: 34000, y: TEA.y + 0.125, pos: [TEA.x, 0, TEA.z], yaw: 0, approach: [CS.x, TEA.z], think: { obj: tea, tiltDeg: 32, scale: 1.0 } }),
  };
  for (const st of Object.values(stations)) if (!st.ritual) { st.approach = nav.nearest(...(st.approach || [st.pos[0], st.pos[2]])); if(st.can){st.pos[0]=st.approach[0];st.pos[2]=st.approach[1];} }
  for(const [id,plant] of [['alocasia',alo],['bonsai',bonsai],['dracaena',dra]]){
    stations[id].exit=()=>{
      const p=hero.group.position,center=plant.getWorldPosition(new THREE.Vector3());
      const dx=p.x-center.x,dz=p.z-center.z,len=Math.hypot(dx,dz)||1;
      const from=[p.x,p.z];let to=from;
      for(const d of [.6,.45,.3,.15]){
        const q=[p.x+dx/len*d,p.z+dz/len*d];
        if(nav.free(...q)&&nav.line(from,q)){to=q;break;}
      }
      return {from:to,steps:[{k:'face',yaw:Math.atan2(dx,dz)},...(to!==from?[{k:'walk',pts:[to]}]:[])]};
    };
  }
  stations.chair = stations.desk; stations.stool = stations.bonsai; stations.shoes = stations.cha; stations.chashitsu = stations.cha;
  stations.pump=stations.bike;
  // Approach stays on the walking grid; the final stance steadies the pump base.
  stations.bike.pos[0]=2.95;stations.bike.pos[2]=-4.15;

  // Measure the actual support beneath the pelvis. The Ekstrem has an open
  // center; both side rails count as support. Back and armrests are excluded.
  const seatRay = new THREE.Raycaster();
  const seatSurfaceY = st => {
    const it=items.find(q=>q.id===st.seatId); if(!it) return null;
    const lift=it.obj.position.y-it.base.y;
    const bounds=new THREE.Box3().setFromObject(it.holder),height=bounds.max.y-bounds.min.y;
    const yaw=hero.group.rotation.y;
    if(st.seatContact && Math.abs(st.seatContact.yaw-yaw)<0.25) return st.seatContact.y;
    // Keep the Ekstrem support height at its established anchor; advance only the actor.
    const support = st.seatSupport || [st.pos[0]-Math.sin(yaw)*(st.seatBack||0),0,st.pos[2]-Math.cos(yaw)*(st.seatBack||0)];
    const pelvis=new THREE.Vector3().fromArray(support),samples=[];
    const meshes=[];it.holder.traverse(o=>{if(o.isMesh&&!o.userData.isInk)meshes.push(o);});
    for(const dx of [-0.20,-0.10,0,0.10,0.20]) for(const dz of [-0.10,0,0.10]) {
      seatRay.set(new THREE.Vector3(pelvis.x+dx,bounds.max.y+0.1,pelvis.z+dz),new THREE.Vector3(0,-1,0));
      const hit=seatRay.intersectObjects(meshes,false).find(h=>h.point.y>bounds.min.y+height*0.28&&h.point.y<bounds.min.y+height*0.70&&h.face?.normal.clone().transformDirection(h.object.matrixWorld).y>0.55);
      if(hit)samples.push(hit.point.y-lift);
    }
    samples.sort((a,b)=>a-b);
    const y=samples.length?samples[Math.floor(samples.length*0.80)]:bounds.min.y-lift+height*({sofa:0.415,chair:0.52,ekstrem:0.62}[st.seatId]);
    st.seatContact={yaw,y};return y;
  };

  // Déplacements autonomes, comme sur le site de référence : le personnage se lève et va d'une activité à l'autre.
  // La musique reste manuelle ; un tiroir ouvert ne fige pas la vie de la pièce.
  const autonomousStations = [stations.desk, stations.ekstrem, stations.alocasia, stations.bonsai, stations.dracaena, stations.sofa, stations.cha,...(bicyclePump?[stations.bike]:[])];
  const autonomousReadyAt = performance.now() + 8000;
  let autonomousNext = performance.now() + 4500 + Math.random() * 3500;
  let autonomousActivitySince = 0, autonomousLast = null, autonomousPrevMode = '';
  const autonomousTick = () => {
    const now = performance.now();
    if(greetingRemaining>0)return;
    if (!greeted && container.dataset.native !== 'fallback' && now < autonomousReadyAt) return;
    if (now < autonomousPauseUntil || appOpen || !hero.group.visible) return;
    const mode = director.mode;
    if (mode !== autonomousPrevMode) { if (mode === 'activity') autonomousActivitySince = now; autonomousPrevMode = mode; }
    const cur = director.current;
    if (mode === 'activity' && autonomousActivitySince && now - autonomousActivitySince > (cur?.maxMs || 11000)) {
      director.stand(); autonomousNext = now + 1800 + Math.random() * 2600; autonomousActivitySince = 0; return;
    }
    if (mode === 'idle' && now >= autonomousNext) {
      const pool = autonomousStations.filter((s) => s !== autonomousLast);
      const st = pool[Math.floor(Math.random() * pool.length)] || autonomousStations[0];
      autonomousLast = st; const accepted = director.go(st); autonomousNext = now + (accepted === false ? 1500 : 12500 + Math.random() * 7500);
    }
  };

  /* thé : entrée par le balcon, chaussures ôtées devant le shoji, porte ouverte, puis zabuton de l'invité */
  { const st = stations.cha, DKz = CS.z + cs.spec.DK.z0, rowZ = DKz + 0.22;
    let closeTok = 0;
    st.route = (from, drop) => {
      const open = [() => { cs.setPanels(1); hero.setShoes(false); }];
      const inside = [{ k: 'walk', allowBlocked: true, pts: [[CS.x, DKz + 0.1], [CS.x, CS.z + cs.spec.RD / 2 - 0.6], [CS.x, TEA.z]] }];
      if (drop) return [{ k: 'fn', fn: open[0] }, ...inside.slice(1)];
      return [
        { k: 'fn', fn: () => { closeTok++; cs.setPanels(1); } },                              // les paravents s'ouvrent dès qu'il part : jardin et balcon apparaissent
        { k: 'walk', pts: nav.path(from, [CS.x + 2.5, rowZ]) },
        { k: 'walk', allowBlocked: true, pts: [[CS.x - 0.55, rowZ]] },
        { k: 'face', yaw: Math.PI / 2 }, { k: 'fn', fn: () => { hero.setShoes(false); hero.flash('neutral', 0.1); } }, { k: 'wait', wait: 0.5 },
        { k: 'fn', fn: () => cs.setPanels(1) }, { k: 'wait', wait: 0.9 },
        ...inside,
      ];
    };
    st.exit = () => ({
      from: [CS.x + 2.5, rowZ],
      steps: [
        { k: 'glide', x: CS.x, z: TEA.z + 0.4, y: cs.spec.RH, yaw: 0, dur: 0.5, clip: 'Idle_Loop' },
        { k: 'walk', allowBlocked: true, pts: [[CS.x, CS.z + cs.spec.RD / 2 - 0.6], [CS.x, DKz + 0.1], [CS.x - 0.55, rowZ]] },
        { k: 'fn', fn: () => { hero.setShoes(true); } }, { k: 'wait', wait: 0.4 },
        { k: 'walk', allowBlocked: true, pts: [[CS.x + 1.4, rowZ], [CS.x + 2.5, rowZ]] },
        { k: 'fn', fn: () => { const tk = ++closeTok; if (tk === closeTok) cs.setPanels(0); } },     // refermés une fois qu'il s'est éloigné sur le sentier
      ],
    });
  }

  const thoughtEl = bubbleEl;
  const thought = createThought(thoughtEl);
  let chosen = -1;
  const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + '\u2026' : t);
  const IC = {
    play: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 5.5v13l9-6.5zM16.5 5.5H19v13h-2.5z" fill="currentColor"/></svg>',
    crate: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 8h16v3H4zM5 11h14v8H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 14.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };
  // lecteur de musique : un seul clic lance un titre au hasard, puis ça défile tout seul
  const pill = document.createElement('div'); pill.className = 'mpill';
  const face = (icon, label = '') => `<span class="dbtn__fill" aria-hidden="true"></span><span class="dbtn__icon" aria-hidden="true">${icon}</span>${label ? `<span class="dbtn__text">${label}</span>` : ''}`;
  pill.innerHTML = `<button class="dbtn dbtn--sm mp-play" type="button" aria-label="Lancer la musique">${face(IC.play, 'Lancer la musique')}</button><button class="dbtn dbtn--icon dbtn--sm mp-next" type="button" aria-label="Titre suivant" hidden>${face(IC.next)}</button><button class="dbtn dbtn--icon dbtn--sm mp-crate" type="button" aria-label="Choisir un disque dans le tiroir">${face(IC.crate)}</button>`;
  container.appendChild(pill);
  // météo : la pastille montre le temps qu'il fait et le fait changer au clic
  const wxBtn = document.createElement('button'); wxBtn.className = 'dbtn dbtn--sm wx-btn'; wxBtn.type = 'button';
  wxBtn.innerHTML = face('', 'Ciel dégagé'); container.appendChild(wxBtn);
  const wx = createWeather({ button: wxBtn });
  const mpPlay = pill.querySelector('.mp-play'), mpNext = pill.querySelector('.mp-next'), mpCrate = pill.querySelector('.mp-crate');
  const mpLabel = (i) => { const t = TRACKS[i]; mpPlay.querySelector('.dbtn__text').textContent = clip(t.t, 26) + ' \u00b7 ' + clip(t.a, 16); };
  const jukebox = createJukebox({
    onTrack: (i) => { crate.setPlaying(i); mpLabel(i); },
    onState: ({ on, paused, playing }) => {
      music=playing;
      pill.classList.toggle('on', on);
      mpPlay.querySelector('.dbtn__icon').innerHTML = on && !paused ? IC.pause : IC.play;
      mpPlay.classList.toggle('dbtn--on', on);
      mpPlay.setAttribute('aria-label', on ? (paused ? 'Reprendre' : 'Mettre en pause') : 'Lancer la musique');
      mpNext.hidden = !on;
      if (!on) mpPlay.querySelector('.dbtn__text').textContent = 'Lancer la musique';
    },
  });
  mpPlay.addEventListener('click', (e) => { e.stopPropagation(); jukebox.toggle(); });
  mpNext.addEventListener('click', (e) => { e.stopPropagation(); jukebox.next(); });
  mpCrate.addEventListener('click', (e) => { e.stopPropagation(); openCrate(!crate.isOpen); });
  pill.addEventListener('pointerdown', (e) => e.stopPropagation());
  let modelBaseY = null, thoughtFor = null, music = false, bubbleT = 0, spawned = false;
  const record = tt.userData.record, arm = tt.userData.arm;
  let armAng = 0.5;

  /* fumée d'apparition */
  const puffs = [];
  const puffMat = new THREE.MeshBasicMaterial({ color: '#f4f6fb', transparent: true, depthWrite: false });
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), puffMat.clone()); m.visible = false; world.add(m); puffs.push({ m, t: 1, v: new THREE.Vector3() }); }
  function poof(pos) {
    puffs.forEach((p, i) => {
      p.t = -i * 0.03;
      const a = Math.random() * 6.28, r = 0.15 + Math.random() * 0.35;
      p.m.position.set(pos.x + Math.cos(a) * r, pos.y + 0.12 + Math.random() * 0.9, pos.z + Math.sin(a) * r);
      p.s = 0.14 + Math.random() * 0.14;
    });
  }

  /* zones de dépôt : anneaux au sol visibles quand on porte le personnage */
  const zones = [];
  { const mk = (id, x, y, z) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 40), new THREE.MeshBasicMaterial({ color: '#ffb23d', transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.02, z); ring.renderOrder = 20; ring.visible = false; ring.userData.id = id; world.add(ring);
      zones.push({ id, ring, x, z });
    };
    mk('desk', -2.15, 0, 0.3); mk('ekstrem', 2.3, 0, -0.95); mk('usm', -0.8, 0, -1.9); mk('alocasia', -3.1, 0, 3.25);
    mk('bonsai', STOOL_X, 0, STOOL_Z); mk('dracaena', 2.85, 0, -2.45); mk('sofa', 0.35, 0, 4.4); mk('cha', TEA.x, TEA.y + 0.0, TEA.z);
  }
  let zoneOn = false, zoneNear = null;
  function showZones(on) { zoneOn = on; for (const z of zones) z.ring.visible = on; zoneNear = null; }
  const zoneAt = (cx, cy) => {
    const id = pickIdAt(cx, cy), byId = id && stations[id];
    if (byId) return byId;
    const g = groundAt(cx, cy); if (!g) return null;
    let best = null, bd = 0.95;
    for (const z of zones) { const d = Math.hypot(z.x - g.x, z.z - g.z); if (d < bd) { bd = d; best = z; } }
    return best ? stations[best.id] : null;
  };
  const zoneHover = (cx, cy) => { const z = zoneAt(cx, cy); zoneNear = z ? zones.find((q) => stations[q.id] === z) : null; };

  /* ─── metteur en scène du personnage ─── */
  const director = createDirector({
    hero, ritual, nav, floorY,
    ui: {
      poof: (p) => poof(p),
      activityEnd: (st, reason) => { if (st.ritual && reason !== 'leave') cs.setPanels(0); },
      music: () => {},
      say: (st) => {
        if (!st) { thoughtFor = null; thoughtEl.classList.remove('show'); return; }
        if (thoughtFor === st) return;
        thoughtFor = st; bubbleT = 0;
        thought.show(st.think && st.think.obj, st.label, st.think);
      },
    },
  });
  window.addEventListener('keydown', e => { if (e.key === 'Shift') director.setRun(true); });
  window.addEventListener('keyup', e => { if (e.key === 'Shift') director.setRun(false); });
  window.addEventListener('blur', () => director.setRun(false));
  for (const st of Object.values(stations)) {
    st.enter = () => {
      hero.setBase(st.face); hero.talk(false); hero.can.visible = !!st.can; hero.setOverride(st.ov || null); hero.setNativePose?.(st.pose || null);
      hero.flash('happy', 0.5);
      if (st.music) setMusic(true);
      if (st.ritual) { cs.setPanels(1); ritual.start(); }
      if (st.tv) { if (retro.stripOn) retro.powerOn(); else { thoughtFor = null; thought.show(null, 'La multiprise est \u00e9teinte'); thoughtFor = st; } }
      if (afterEnter) { const f = afterEnter; afterEnter = null; setTimeout(f, 450); }
    };
  }
  function setMusic(on) {
    if (!on) { jukebox.stop(); return; }
    if (chosen >= 0) { const c = chosen; chosen = -1; jukebox.play(c); } else if (!jukebox.isOn) jukebox.random();
  }
  /* bac à pochettes : le tiroir s'ouvre, la caméra s'approche, on feuillette en survolant, un clic joue le titre */
  let crateHover = -1;
  const crateFocus = new THREE.Vector3(-1.08, 0.62, -2.05);
  function openCrate(v) {
    if (v === crate.isOpen) return;
    crate.setOpen(v); crateHover = -1;
    if (appOpen) return;
    if(v){setCameraMode('free');tgt.copy(crateFocus);view.tZoom=6;}
  }
  function playTrack(i) {
    jukebox.play(i);                                           // le tiroir reste ouvert pendant la diffusion ; seul un clic sur le tiroir, le bouton ou Échap le referme
    if (!(director.current === stations.usm && director.mode === 'activity')) goTo('usm');
  }
  const card = document.createElement('div'); card.className = 'sleeve-card'; container.appendChild(card);
  let cardFor = -2;
  window.addEventListener('keydown', (e) => {
    if (!crate.isOpen || appOpen) return;
    const cur = crate.sel >= 0 ? crate.sel : jukebox.playing >= 0 ? jukebox.playing : 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); crate.setSel(Math.max(0, Math.min(crate.count - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)))); crateHover = crate.sel; }
    else if (e.key === 'Enter' && crate.sel >= 0) { e.preventDefault(); playTrack(crate.sel); }
    else if (e.key === 'Escape') openCrate(false);
  });
  const goTo = (id, cb) => { afterEnter = cb || null; director.go(stations[id]); };

  let appOpen = false;
  function openApp(kind, pos, zoom) {
    if (appOpen) return; appOpen = true;
    setCameraMode('free');tgt.copy(pos); view.tZoom = zoom;
    thoughtEl.classList.remove('show');
    setTimeout(() => window.dispatchEvent(new CustomEvent('room-open', { detail: { kind } })), 750);
  }
  window.addEventListener('room-close', (e) => {
    appOpen = false;
    if (e.detail && e.detail.kind === 'retro') retro.powerOff();
  });
  const atSofa = () => director.current === stations.sofa && director.mode === 'activity';
  const atDesk = () => director.current === stations.desk && director.mode === 'activity';
  const poseGamepadHands = () => {
    const b = hero.bones;
    if (![b.upperarm_l,b.lowerarm_l,b.hand_l,b.upperarm_r,b.lowerarm_r,b.hand_r,b.pelvis].every(Boolean)) return;

    hero.group.updateMatrixWorld(true);
    const qg = hero.group.getWorldQuaternion(new THREE.Quaternion());
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(qg); forward.y = 0; forward.normalize();
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(qg); side.y = 0; side.normalize();

    const center = b.pelvis.getWorldPosition(new THREE.Vector3())
      .addScaledVector(forward, 0.31);
    center.y += 0.19;

    const pelvis = b.pelvis.getWorldPosition(new THREE.Vector3());
    const leftSign = Math.sign(b.upperarm_l.getWorldPosition(new THREE.Vector3()).sub(pelvis).dot(side)) || 1;
    const lTarget = center.clone().addScaledVector(side, leftSign * 0.105);
    const rTarget = center.clone().addScaledVector(side, -leftSign * 0.085);
    // Fixed elbow poles avoid feeding the previous IK solution back into itself.
    const lPole = pelvis.clone().addScaledVector(side,leftSign * 0.35).addScaledVector(forward,0.12); lPole.y += 0.30;
    const rPole = pelvis.clone().addScaledVector(side,-leftSign * 0.35).addScaledVector(forward,0.12); rPole.y += 0.30;

    hero.ik2(b.upperarm_l, b.lowerarm_l, b.hand_l, lTarget, lPole);
    hero.ik2(b.upperarm_r, b.lowerarm_r, b.hand_r, rTarget, rPole);
    hero.group.updateMatrixWorld(true);
  };
  function activate(id) {
    if (id === 'drawer') { openCrate(!crate.isOpen); return; }
    if (id === 'strip') { retro.setStrip(!retro.stripOn); if (retro.stripOn && atSofa()) retro.powerOn(); return; }
    if (id === 'tv') {
      if (!atSofa()) { goTo('sofa'); return; }
      if (retro.state === 'off') retro.powerOn();
      else if (retro.state === 'ready') openApp('retro', retro.group.localToWorld(retro.tvCenter.clone()), 5.2);
      return;
    }
    const openPc = () => openApp('xp', new THREE.Box3().setFromObject(uw).getCenter(new THREE.Vector3()), 5.2);
    if (id === 'pc') { if (atDesk()) openPc(); else goTo('desk', openPc); return; }
    if (/^shoji\d$/.test(id)) { cs.togglePanel(+id.slice(5)); return; }
    if (lamps[id]) { lamps[id].on = !lamps[id].on; lamps[id].manual = true; return; }
    if (stations[id]) goTo(id);
  }
  const leave = () => director.stand();

  /* gouttes d'arrosage */

  /* ─── jour / nuit ─── */
  let night = false, sunBase = 2.0, hemiBase = 0.85;
  function applyTheme() {
    const th = document.documentElement.dataset.theme;
    night = th ? th === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    hemi.intensity = night ? 0.5 : 0.85; hemi.color.set(night ? '#9db4e0' : '#fff7e8'); hemi.groundColor.set(night ? '#2a3350' : '#cdbfa5');
    sunBase = night ? 0.55 : 2.0; hemiBase = night ? 0.5 : 0.85; sun.intensity = sunBase; sun.color.set(night ? '#a9bde8' : '#fff0dc');
    scene.environmentIntensity = night ? 0.12 : 0.22;
    ground.material.opacity = night ? 0.35 : 0.22;
    for (const k in lamps) if (!lamps[k].manual) lamps[k].on = night;
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  applyTheme();

  /* ─── boucle ─── */
  const opts = { dtCap: 0.05 };
  let nativeMotionMode = 'idle', greetingUntil=0, greetingRemaining=0, greeted=false;
  const syncNativeMotionMode = () => {
    if (!nativeBridge || !hero.group.visible) return 'idle';
    let next = 'idle';
    const cur = director.current;
    if(director.mode==='idle'&&performance.now()<greetingUntil)next='greeting';
    else if(director.mode==='thinking')next='think';
    else if (director.mode === 'carried') next = 'jump';
    else if (director.locomoting) next = director.running ? 'run' : 'walk';
    else if (director.mode === 'activity' && cur?.nativeMode) next = cur.nativeMode;

    if (next !== nativeMotionMode) {
      nativeMotionMode = next;
      nativeBridge.setMode(next, cur?.sourceTarget || null);
    }
    return next;
  };

  const clock = new THREE.Clock();
  let running = true, roomVisible=true, workshopOpen=false;
  document.addEventListener('project-workshop',e=>{workshopOpen=e.detail.open;if(workshopOpen)running=false;else if(roomVisible&&!document.hidden&&!running){running=true;clock.getDelta();requestAnimationFrame(frame);}});
  const startAt = performance.now();
  const v3 = new THREE.Vector3(), lookRight = new THREE.Vector3(), lookTo = new THREE.Vector3();
  let fpsEma = 0.016, frameNo = 0, lastUp = 0;
  function frame() {
    if (!running) return;
    const rawDt = clock.getDelta(), dt = Math.min(rawDt, opts.dtCap);
    fpsEma += (Math.min(rawDt, 0.1) - fpsEma) * 0.06; frameNo++;
    if (!opts.noAdapt && frameNo % 45 === 0 && frameNo > 90) {
      if (fpsEma > 0.026 && resScale > 0.56) { resScale = Math.max(0.56, resScale - 0.09); resize(); }
      else if (fpsEma < 0.0185 && resScale < 1 && frameNo - lastUp > 240) { resScale = Math.min(1, resScale + 0.06); lastUp = frameNo; resize(); }
    }
    const t = clock.elapsedTime;
    // entrée en cascade
    const since = (performance.now() - startAt) / 1000;
    for (const it of items) {
      const p = Math.min(1, Math.max(0, (since - it.delay) / 0.85));
      it.holder.visible = since >= it.delay;
      const k = easeOutBounce(p);
      it.obj.position.y = it.base.y + (1 - k) * 2.2;
      const sq = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.0 : 1;
      it.obj.scale.setScalar(sq);
    }
    // vue
    const kv = 1 - Math.exp(-dt * 10);
    if(cameraMode==='follow'&&hero.group.visible&&!appOpen&&!crate.isOpen)tgt.set(hero.group.position.x,hero.wp('spine_02').y*.55,hero.group.position.z);
    target.lerp(tgt, kv);
    view.az += (view.tAz - view.az) * kv; view.el += (view.tEl - view.el) * kv; view.zoom += (view.tZoom - view.zoom) * kv;
    if(Math.abs(Number(zoomRange.value)-Math.log2(view.tZoom))>.005)syncZoom();
    scrollOff += (scrollT - scrollOff) * kv; orient(); applyFrustum();
    // personnage
    if (ritual.state.active) ritual.update(dt);
    wx.update(dt); sun.intensity = sunBase * (1 - 0.55 * wx.k.cloud); hemi.intensity = hemiBase * (1 + 0.15 * wx.k.cloud);
    cs.update(dt, t, night, wx.k); retro.update(dt);
    // vapeur du bol et de la kama
    { const ud = tea.userData; ud.sBowl.position.copy(ritual.object.position).y += 0.075; ud.sKama.position.copy(ud.fk.position).add(ud.fk.userData.steamAnchor);
      const drunk = ud.bowl.userData.tea.visible ? 1 : 0; updateSteam(ud.sBowl, t, 0.3, 0.1, drunk); updateSteam(ud.sKama, t + 1.3, 0.34, 0.13, 0.8); }
    if (!spawned && since > 1.6) { spawned = true; director.spawn(...nav.nearest(0.9, 0.7), 0.7); hero.group.visible = true; hero.group.scale.setScalar(0.01); poof(hero.group.position); }
    if (hero.group.visible) {
      // minuteur : aucune activité ne dure indéfiniment (arrosage 12 s, assis 25 s, thé 34 s), même déclenchée par l'utilisateur
      if (director.mode !== actMode) { if (director.mode === 'activity') actSince = 0; actMode = director.mode; }
      if (director.mode === 'activity') actSince += dt * 1000;
      if (director.mode === 'activity' && !appOpen && director.current && actSince > (director.current.maxMs || 25000)) { director.stand(); actSince = 0; }
      autonomousTick();
      director.update(dt);
      if (nativeBridge && director.current !== stations.desk) {
        chair.userData.swivel.rotation.y += ((-Math.PI * 0.75) - chair.userData.swivel.rotation.y) * (1 - Math.exp(-dt * 6));
      }
      if(nativeBridge&&spawned&&!greeted&&director.mode==='idle'){greeted=true;greetingRemaining=2.75;greetingUntil=performance.now()+2750;autonomousNext=greetingUntil+3000;container.dataset.greeting='true';}
      if(greetingRemaining>0){greetingRemaining=Math.max(0,greetingRemaining-dt);greetingUntil=performance.now()+greetingRemaining*1000;autonomousNext=Math.max(autonomousNext,greetingUntil+3000);}
      if(greeted&&greetingRemaining===0)container.dataset.greeting='false';
      let exactMotion = syncNativeMotionMode();
      if (exactMotion !== 'idle') {
        if (exactMotion === 'water' && nativeBridge?.wateringCan) hero.can.visible = false;
      }
      { const e = camera.matrixWorld.elements; lookRight.set(e[0], 0, e[2]).normalize(); lookTo.set(camera.position.x - target.x, 0, camera.position.z - target.z).normalize(); hero.setLookView(lookRight, lookTo); }
      hero.update(dt, t);
      if (nativeBridge) {
        try {
          if (exactMotion === 'water') {
            const plant = director.current === stations.alocasia ? alo : director.current === stations.bonsai ? bonsai : dra;
            const waterAt = plant.localToWorld((plant.userData.waterTarget || new THREE.Vector3(0, director.current === stations.bonsai ? 0.15 : 0.37, 0)).clone());
            director.current.waterTarget = waterAt;
            nativeBridge.setWaterTarget(hero, waterAt, (plant.userData.waterRadius || 0.12) * plant.getWorldScale(new THREE.Vector3()).x);
          }
          nativeBridge.update(dt);
          // The source simulator may start another activity after watering.
          // Hand control back before importing that new pose at the plant.
          if(director.mode==='activity'&&director.current?.nativeMode&&nativeBridge.activityFinished){
            director.stand();director.update(0);exactMotion=syncNativeMotionMode();
            hero.poseStanding();actSince=0;
          }
          // Les jambes des sièges locaux suivent leur propre assise, plus haute que celle de référence.
          if (exactMotion !== 'idle'&&!director.current?.ritual) nativeBridge.applyPose(hero, 1, director.current?.seatId && director.current!==stations.ekstrem ? { upperOnly:true } : {});
        } catch (error) { restoreLocalDesk(error); }
      }
      if(hero.referenceAppearance && exactMotion==='idle' && (!director.current||['idle','turn'].includes(director.mode)))hero.poseStanding();
      { const hp = hero.group.position, inRoom = Math.abs(hp.x - CS.x) < 1.7 && hp.z > CS.z - 2.0 && hp.z < CS.z + 4.2;      // le toit s'efface quand le personnage est dessous
        followTea = ritual.state.active || (director.current && director.current.ritual) || cs.panels.some((q) => q.target > 0.5) || inRoom || hp.x < CS.x + 2.6 && hp.z > CS.z - 3.5;
        cs.setRoofFade(ritual.state.active || (inRoom && director.mode !== 'carried') ? 0.2 : 1); }
      // pieds au sol quand il est debout ou marche (le rig importé a sa propre hauteur de bassin)
      hero.setLean(director.current && director.mode === 'activity' && (director.current.clip === 'Driving_Loop' || director.current.clip === 'Sitting_Idle_Loop' || director.current.ritual) ? 0 : 0);
      { const cur = director.current;
        const seated = cur && cur.seatId && director.mode === 'activity';
        if (hero.model && director.mode !== 'carried') {
          if (modelBaseY === null) modelBaseY = hero.model.position.y;
          if (seated) {
            hero.model.position.y = modelBaseY;
            if (cur === stations.ekstrem) hero.group.rotation.y = cur.yaw;
            if (cur === stations.desk && nativeBridge) {
              hero.group.rotation.y = cur.yaw + nativeBridge.seatYawOffset;
              chair.userData.swivel.rotation.y = nativeBridge.seatYawOffset;
            }

            // Bassin au fond du siège : recul contrôlé vers le dossier.
            const seatForward = new THREE.Vector3(
              Math.sin(hero.group.rotation.y || 0),
              0,
              Math.cos(hero.group.rotation.y || 0)
            );
            const back = cur.seatBack || 0;
            const calibration=seatCalibration[cur===stations.desk?'desk':cur===stations.ekstrem?'ekstrem':'sofa'];
            const anchor=cur===stations.desk?new THREE.Vector3(-2.15,0,.3):new THREE.Vector3(2.3,0,-.95);
            const fitted=calibration?new THREE.Vector3().fromArray(calibration.pelvisLocal).applyAxisAngle(new THREE.Vector3(0,1,0),hero.group.rotation.y).add(anchor):null;
            const targetX = fitted?fitted.x:cur.pos[0]-seatForward.x*back;
            const targetZ = fitted?fitted.z:cur.pos[2]-seatForward.z*back;
            const kp = 1 - Math.exp(-dt * 16);
            hero.group.updateMatrixWorld(true);
            const currentPelvis = hero.wp('pelvis');
            hero.group.position.x += (targetX - currentPelvis.x) * kp;
            hero.group.position.z += (targetZ - currentPelvis.z) * kp;

            hero.group.updateMatrixWorld(true);
            // Place the legs before measuring the deformed trouser seat.
            if(cur!==stations.ekstrem)hero.poseSeatedL?.(floorY(hero.group.position.x, hero.group.position.z) + 0.01,cur===stations.desk?'bureau':'console');
            hero.group.updateMatrixWorld(true);
            const sy = calibration?calibration.supportHeight:seatSurfaceY(cur);
            if (sy != null) {
              cur.seatContact={yaw:hero.group.rotation.y,y:sy};
              const dy = sy + 0.008 - hero.hipContactY();
              // Never blend through the cushion when a new pose changes the
              // trouser volume. Lift immediately, then settle down smoothly.
              hero.group.position.y += hero.referenceAppearance ? dy : (dy > 0 ? dy : dy * (1 - Math.exp(-dt * 16)));
              hero.group.updateMatrixWorld(true);
              // The pelvis lift changes ankle height: solve floor clearance again
              // in this frame, rather than using the previous frame's root height.
              if(cur!==stations.ekstrem)hero.poseSeatedL?.(floorY(hero.group.position.x,hero.group.position.z)+0.01,cur===stations.desk?'bureau':'console');
              hero.group.updateMatrixWorld(true);
            }

          } else if (!(cur && cur.ritual && director.mode === 'activity')) {
            hero.model.position.y = modelBaseY;
            hero.group.updateMatrixWorld(true);
            const lo = Math.min(hero.wp('ball_l').y, hero.wp('ball_r').y) - hero.group.position.y;
            hero.model.position.y = modelBaseY - (lo - 0.04);
          }
        } }
      if (nativeBridge) {
        try {
        if (exactMotion === 'read') nativeBridge.syncBook(hero);
        else if (nativeBridge.book) nativeBridge.book.visible = false;

        if (exactMotion === 'water'&&director.current?.waterTarget) { nativeBridge.syncWateringCan(hero); nativeBridge.aimWateringCan(hero, director.current.waterTarget); }
        else if (nativeBridge.wateringCan) nativeBridge.wateringCan.visible = false;
        nativeBridge.syncCoffeeMug(hero,deskSet);
        nativeBridge.syncEffects(hero);
        } catch (error) { restoreLocalDesk(error); }
      }

      const playingConsole = director.current === stations.sofa && director.mode === 'activity';
      bicyclePump?.frame(dt,director.current===stations.bike&&director.mode==='activity',hero);
      retro.setPadHeld?.(playingConsole);
      if (playingConsole) poseGamepadHands();
      retro.updatePad?.(dt, hero.bones.hand_l, hero.bones.hand_r);

      const s = hero.group.scale.x; hero.group.scale.setScalar(s + (1 - s) * (1 - Math.exp(-dt * 10)));
      bubbleT += dt;
      const showB = !!thoughtFor && ['thinking','walk','turn'].includes(director.mode) && !appOpen && bubbleT > 0.35;
      thoughtEl.classList.toggle('show', showB);
      if (showB) { if (frameNo % 3 === 0) thought.update(dt * 3); v3.set(0, 0, 0); hero.head.getWorldPosition(v3); v3.y += 0.42; v3.project(camera); thoughtEl.style.transform = `translate(${((v3.x + 1) / 2) * W}px, ${Math.max(((1 - v3.y) / 2) * H - 30, 215)}px) translate(-50%, -100%)`; }
    }
    for (const z of zones) if (z.ring.visible) { const near = z === zoneNear; z.ring.material.opacity = near ? 1 : 0.55 + Math.sin(t * 5) * 0.2; z.ring.scale.setScalar(near ? 1.25 : 1 + Math.sin(t * 5) * 0.05); z.ring.material.color.set(near ? '#fff3b0' : '#ffb23d'); }
    for (const p of puffs) {
      p.t += dt * 1.6;
      const on = p.t > 0 && p.t < 1;
      p.m.visible = on;
      if (on) { const k = Math.sin(Math.min(1, p.t) * Math.PI); p.m.scale.setScalar(p.s * (0.4 + p.t * 2.2)); p.m.material.opacity = 0.92 * (1 - p.t * p.t); p.m.position.y += dt * 0.25 * k; }
    }
    // tiroir à pochettes
    crate.update(dt, view.az);
    if (crate.isOpen && crate.sel >= 0 && !appOpen) {
      if (cardFor !== crate.sel) {
        cardFor = crate.sel; const t = TRACKS[cardFor], c = 52, col = cardFor % COVER.cols, row = (cardFor / COVER.cols) | 0;
        card.innerHTML = `<i style="background-image:url('${COVER.file}');background-size:${COVER.cols * c}px ${COVER.rows * c}px;background-position:${-col * c}px ${-row * c}px"></i><b></b><span></span><em>Cliquer pour jouer</em>`;
        card.querySelector('b').textContent = t.t; card.querySelector('span').textContent = t.a;
      }
      crate.topWorld(cardFor, v3); v3.project(camera);
      card.style.transform = `translate(${((v3.x + 1) / 2) * W}px, ${Math.max(((1 - v3.y) / 2) * H - 8, 130)}px) translate(-50%, -100%)`; card.classList.add('show');
    } else { card.classList.remove('show'); cardFor = -2; }
    // musique
    for(const s of speakers){
      // Restore the original 3% cabinet pulse; the floor anchor stays fixed.
      const pulse=music?1+Math.max(0,Math.sin(t*9))*.03:1;
      s.obj.scale.copy(s.baseScale);s.obj.scale.y*=pulse;
      for(const link of s.cables){const dy=link.post.y*s.baseScale.y*(pulse-1);for(let i=0;i<link.positions.count;i++)link.positions.array[i*3+1]=link.rest[i*3+1]+dy*link.weights[i];link.positions.needsUpdate=true;link.endCap.position.y=link.capY+dy;}
    }
    record.rotation.y += dt * (music ? 3.4 : 0);
    armAng += ((music ? 0.0 : 0.5) - armAng) * (1 - Math.exp(-dt * 3));
    arm.rotation.y = armAng;
    // lampes
    for (const k in lamps) {
      const L = lamps[k];
      L.k += ((L.on ? 1 : 0) - L.k) * (1 - Math.exp(-dt * 8));
      L.glow.color.set(L.offColor).lerp(new THREE.Color(L.onColor), L.k);
      if (L.glow.update) L.glow.update(L.k);
      L.light.intensity = L.k * (k === 'arc' ? 14 : k === 'beton' ? 0.9 : k === 'falk' ? 2.4 : 1.1);
    }
    renderer.shadowMap.needsUpdate = since < 3.2 || frameNo % 8 === 0;
    try {
      renderer.render(scene, camera);
    } catch (error) {
      if (!nativeBridge) throw error;
      restoreLocalDesk(error);
      renderer.render(scene, camera);
    }
    container.dataset.sceneFrames = String(frameNo);
    container.dataset.sceneReady = String(spawned);
    // Load the optional iframe only after the local room and hero have appeared.
    if (!bridgeStarted && since > 2.5) loadNativeBridge();
    requestAnimationFrame(frame);
  }
  resize();
  requestAnimationFrame(frame);

  // économie : on arrête quand l'onglet est caché ou le composant hors écran
  const io = new IntersectionObserver(([e]) => { roomVisible=e.isIntersecting;const vis=roomVisible&&!document.hidden&&!workshopOpen; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } else if (!vis) running = false; });
  io.observe(container);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (roomVisible&&!workshopOpen&&!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } });

  const bbox = (id) => { const it = items.find((i) => i.id === id); const b = new THREE.Box3().setFromObject(it.holder); return [b.min.toArray(), b.max.toArray()].map((a) => a.map((v) => +v.toFixed(2))); };
  const toScreen = (x, y, z) => { const q = new THREE.Vector3(x, y, z).project(camera), r = el.getBoundingClientRect(); return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; };
  return { setCameraMode, get cameraMode(){return cameraMode;}, setSceneMuted, wx, setScroll: (p) => { scrollT = p; }, pauseAutonomy, crate, toScreen, bbox, activate, leave, director, nav, stations, floorY, goTo, lamps, view, target: tgt, opts, hero, ritual, tea, retro, cs, scene, camera, renderer };
}
