import { THREE, mat, mesh, box, cyl, sph, group, rbox, tube, canvasTexture, rng, inkify } from './kit.js?v=cv-scene-v29';

/* ───────────── Télé cathodique, PS1, manette et câbles ─────────────
 * Repère local : la télé est à l'origine, face vers +z ; la console est à sa droite (+x), la manette devant. y = 0 au sol (surface du tapis). */

export function createRetroSet({consoleModel,controllerModel,tvModel,sound}={}) {
  const g = group();
  const plastic = new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.55 });
  const plasticL = new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.5 });
  const W = 0.66, H = 0.54, D = 0.5, Y0 = 0.035;

  const tv = tvModel ? tvModel.scene : group(); tv.name='MagnavoxCRT'; tv.userData.batchRoot=true;
  const tex=new THREE.CanvasTexture(Object.assign(document.createElement('canvas'),{width:320,height:240}));tex.colorSpace=THREE.SRGBColorSpace;
  const screenMat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});screenMat.userData.unique=true;
  let screen=tv.getObjectByName('MagnavoxScreen');
  if(!screen){screen=new THREE.Mesh(new THREE.PlaneGeometry(.49,.36),screenMat);screen.position.set(0,.28,.30);tv.add(screen);}
  screen.material=screenMat;screen.userData.noInk=true;screen.userData.dynamic=true;screen.name='MagnavoxScreen';
  // Project the animated picture onto the original CRT glass, preserving its bulge.
  const positions=screen.geometry.attributes.position;screen.geometry.computeBoundingBox();const sb=screen.geometry.boundingBox,uv=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){uv[i*2]=(positions.getX(i)-sb.min.x)/(sb.max.x-sb.min.x);uv[i*2+1]=(positions.getY(i)-sb.min.y)/(sb.max.y-sb.min.y);}
  screen.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  const frontZ=new THREE.Box3().setFromObject(tv).max.z;
  tv.traverse(o=>{if(o.isMesh){if(o.material?.transmission>0){o.material.transmission=0;o.material.opacity=.08;o.material.depthWrite=false;}o.castShadow=o!==screen;o.receiveShadow=o!==screen;o.userData.noInk=true;}});g.add(tv);

  /* ── PlayStation (SCPH-1002) ── */
  const ps = group(); ps.name="PlayStation1"; ps.userData.dynamic=true;
  if(consoleModel){const visual=consoleModel.scene;visual.name='SuppliedPlayStation1';visual.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.noInk=true;}});ps.add(visual);}else{
  const grey = new THREE.MeshStandardMaterial({ color: '#b3b3ae', roughness: 0.6 });
  const greyD = new THREE.MeshStandardMaterial({ color: '#9b9b97', roughness: 0.65 });
  const PW = 0.32, PH = 0.065, PD = 0.22;
  ps.add(rbox(PW, PH, PD, 0.012, grey, 0, 0.005 + PH / 2, 0));
  ps.add(rbox(PW * 0.98, 0.012, PD * 0.98, 0.006, greyD, 0, 0.005 + PH - 0.004, 0));
  const lid = cyl(0.083, 0.088, 0.018, greyD, -0.01, 0.005 + PH + 0.005, -0.005, 40); ps.add(lid);
  ps.add(cyl(0.06, 0.06, 0.008, mat('#c7c7c2', { roughness: 0.5 }), -0.01, 0.005 + PH + 0.016, -0.005, 36));
  ps.add(cyl(0.012, 0.012, 0.008, mat('#8e8e8a'), -0.01, 0.005 + PH + 0.022, -0.005, 16));
  for (const x of [-0.125, 0.125]) { ps.add(cyl(0.022, 0.024, 0.014, greyD, x, 0.005 + PH + 0.005, 0.01, 24)); ps.add(cyl(0.015, 0.015, 0.006, mat('#d0d0cb'), x, 0.005 + PH + 0.013, 0.01, 18)); }
  ps.add(rbox(0.05, 0.012, 0.02, 0.004, mat('#9a9a96'), 0.1, 0.005 + PH + 0.002, -0.07));
  // façade : prises manettes et cartes mémoire
  const fz = PD / 2;
  for (const x of [-0.105, -0.055]) ps.add(rbox(0.04, 0.026, 0.006, 0.003, mat('#202124'), x, 0.005 + 0.024, fz + 0.001));
  for (const x of [0.03, 0.095]) ps.add(rbox(0.05, 0.024, 0.006, 0.003, mat('#7b7b78'), x, 0.005 + 0.024, fz + 0.001));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ps.add(cyl(0.011, 0.012, 0.01, mat('#3b3b3b'), x * 0.135, 0.005, z * 0.085, 12));
  }
  ps.position.set(0.58, 0, 0.0); ps.rotation.y = -0.08; g.add(ps);

  /* ── manette ── */
  const pad = group();
  pad.userData.dynamic = true;
  pad.name='PS1Controller';
  if(controllerModel){const visual=controllerModel.scene;visual.name='SuppliedPS1Controller';visual.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.noInk=true;}});pad.add(visual);}else{
  const padM = new THREE.MeshStandardMaterial({ color: '#b6b6b1', roughness: 0.55 });
  pad.add(rbox(0.14, 0.024, 0.07, 0.01, padM, 0, 0.012, 0));
  for (const s of [-1, 1]) { const grip = rbox(0.038, 0.03, 0.075, 0.014, padM, s * 0.068, 0.015, 0.05); grip.rotation.y = s * -0.28; pad.add(grip); }
  pad.add(box(0.038, 0.006, 0.011, mat('#3a3a3c'), -0.04, 0.026, -0.002)); pad.add(box(0.011, 0.006, 0.038, mat('#3a3a3c'), -0.04, 0.026, -0.002));
  for (const [dx, dz, c] of [[0, -0.014, '#3fae6a'], [0.014, 0, '#d04c4c'], [0, 0.014, '#4f78d0'], [-0.014, 0, '#d86fa3']]) pad.add(cyl(0.0075, 0.0075, 0.007, mat(c, { roughness: 0.4 }), 0.045 + dx, 0.026, -0.002 + dz, 14));
  for (const x of [-0.012, 0.012]) pad.add(rbox(0.014, 0.005, 0.008, 0.002, mat('#7c7c79'), x, 0.025, 0.012));
  for (const s of [-1, 1]) pad.add(rbox(0.03, 0.01, 0.014, 0.004, padM, s * 0.045, 0.026, -0.036));
  }
  pad.scale.setScalar(1.65); pad.position.set(0.28, 0, 0.78); pad.rotation.y = 0.55; g.add(pad);

  const padHome = {
    position: pad.position.clone(),
    quaternion: pad.quaternion.clone(),
    scale: pad.scale.clone(),
  };
  let padHeld = false;
  const padTargetPos = new THREE.Vector3();
  const padTargetQuat = new THREE.Quaternion();
  const padRight = new THREE.Vector3();
  const padUp = new THREE.Vector3(0, 1, 0);
  const padForward = new THREE.Vector3();
  const padWorld = new THREE.Matrix4();
  const padParentInv = new THREE.Matrix4();
  const padLocal = new THREE.Matrix4();
  const padTmpScale = new THREE.Vector3(1, 1, 1);

  /* ── câbles posés au sol ── */
  const FLOOR = 0.006;
  const cable = (pts, color, r = 0.0042) => { r *= 1.7; return mk(pts, color, r); };
  const staticCables=[];
  const mk = (pts, color, r) => { const t = tube(pts, r, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), { segs: 120, radial: 6 }); g.add(t);staticCables.push(t); return t; };
  const plug = (x, y, z, c = '#d9c24a') => g.add(box(0.016, 0.014, 0.022, mat(c, { roughness: 0.4, metalness: 0.4 }), x, y, z));
  const consolePoint=(name,fallback)=>{g.updateWorldMatrix(true,true);const marker=ps.getObjectByName(name);return marker?g.worldToLocal(marker.getWorldPosition(new THREE.Vector3())):new THREE.Vector3(...fallback);};
  const tvPoint=(name,fallback)=>{g.updateWorldMatrix(true,true);const marker=tv.getObjectByName(name);return marker?g.worldToLocal(marker.getWorldPosition(new THREE.Vector3())):new THREE.Vector3(...fallback);};
  const tvAV=tvPoint('TVAVPort',[0,.2,-.33]),tvPower=tvPoint('TVPowerPort',[-.1,.18,-.35]);
  const consolePort=consolePoint('ConsoleControllerPort',[.475,.03,.125]),consoleAV=consolePoint('ConsoleAVPort',[.60,.03,-.12]),consolePower=consolePoint('ConsolePowerPort',[.70,.03,-.12]);
  // vidéo (jaune) + audio (blanc, rouge) de la console vers l'arrière de la télé
  [['#e6c61e', 0], ['#f2f2ee', 0.012], ['#cc2b2b', 0.024]].forEach(([c, o]) => {
    cable([[consoleAV.x+o,consoleAV.y,consoleAV.z], [0.62 + o, FLOOR, -0.2], [0.55 + o, FLOOR, -0.42], [0.3 + o * 0.6, FLOOR, -0.5], [0.1 + o * 0.6, FLOOR + 0.02, -0.46], [0.02 + o * 0.5, 0.1, -0.4], [tvAV.x+o,tvAV.y,tvAV.z]], c, 0.0034);
  });
  // multiprise derrière le set : les deux alimentations y sont branchées, son cordon part vers la droite (raccordé au sol par room.js)
  const SX = 0.3, SZ = -0.8, SL = 0.34;
  const strip = group(); strip.userData.id = 'strip';
  strip.add(rbox(SL, 0.032, 0.062, 0.008, mat('#e9e7e1', { roughness: 0.45 }), SX, 0.016 + FLOOR, SZ));
  const rocker = rbox(0.03, 0.012, 0.04, 0.004, new THREE.MeshStandardMaterial({ color: '#ff5a2a', emissive: '#ff4a1a', emissiveIntensity: 1.6, roughness: 0.4 }), SX - SL / 2 + 0.03, 0.036 + FLOOR, SZ);
  strip.add(rocker);
  for (const x of [-0.07, -0.01, 0.05, 0.11]) { strip.add(box(0.03, 0.004, 0.022, mat('#2a2b2e'), SX + x, 0.033 + FLOOR, SZ)); strip.add(box(0.004, 0.0045, 0.004, mat('#0a0a0b'), SX + x - 0.007, 0.034 + FLOOR, SZ)); strip.add(box(0.004, 0.0045, 0.004, mat('#0a0a0b'), SX + x + 0.007, 0.034 + FLOOR, SZ)); }
  g.add(strip);
  const sockY = 0.036 + FLOOR;
  const pw = (pts, r = 0.0055) => { mk(pts, '#141416', r * 1.0); const e = pts[pts.length - 1]; plug(e[0], e[1], e[2], '#1a1a1c'); };
  // alimentation télé : sort par l'arrière de la caisse et rejoint la multiprise
  pw([tvPower.toArray(), [-0.13, 0.04, -0.46], [-0.12, FLOOR, -0.62], [-0.02, FLOOR, -0.7], [SX - 0.07, sockY + 0.02, SZ + 0.01], [SX - 0.07, sockY + 0.005, SZ]]);
  // alimentation console
  pw([consolePower.toArray(), [0.84, FLOOR, -0.26], [0.78, FLOOR, -0.58], [SX + 0.1, FLOOR + 0.01, SZ + 0.1], [SX + 0.05, sockY + 0.02, SZ + 0.02], [SX + 0.05, sockY + 0.005, SZ]]);
  // cordon de la multiprise : part du bout droit
  const cordStart = new THREE.Vector3(SX + SL / 2, 0.02 + FLOOR, SZ);
  // câble manette : de la prise de façade jusqu'à la manette, avec du mou
  g.updateWorldMatrix(true,true);const socketMarker=pad.getObjectByName('ControllerCableAnchor');
  const padSocket=socketMarker?pad.worldToLocal(socketMarker.getWorldPosition(new THREE.Vector3())):new THREE.Vector3(0,.015,-.041);
  const cordPoints=Array.from({length:6},()=>new THREE.Vector3());
  const cordCurve=new THREE.CatmullRomCurve3(cordPoints);cordCurve.arcLengthDivisions=72;
  cordPoints.forEach((p,i)=>p.set(.475, FLOOR+.015*i,.12+i*.1));
  const padCord=new THREE.Mesh(new THREE.TubeGeometry(cordCurve,36,.00765,6,false),new THREE.MeshStandardMaterial({color:'#8c8c88',roughness:.6}));
  padCord.name='PS1ControllerCable';padCord.userData.dynamic=true;padCord.userData.noInk=true;padCord.castShadow=true;g.add(padCord);
  const lastCordEnd=new THREE.Vector3(Infinity,0,0),cordEnd=new THREE.Vector3(),cordDirection=new THREE.Vector3(),cordCenter=new THREE.Vector3();
  function updateControllerCord(){
    g.updateMatrixWorld(true);cordEnd.copy(padSocket);pad.localToWorld(cordEnd);g.worldToLocal(cordEnd);
    if(cordEnd.distanceToSquared(lastCordEnd)<1e-10)return;lastCordEnd.copy(cordEnd);
    cordDirection.set(0,0,-1).applyQuaternion(pad.quaternion);
    cordPoints[0].copy(consolePort);cordPoints[1].set(.46,FLOOR,.30);
    cordPoints[2].set(.60,FLOOR,.55);cordPoints[3].set(cordEnd.x+cordDirection.x*.15,FLOOR,cordEnd.z+cordDirection.z*.15);
    cordPoints[4].copy(cordEnd).addScaledVector(cordDirection,.09);cordPoints[4].y=Math.max(FLOOR,cordEnd.y-.07);
    cordPoints[5].copy(cordEnd);
    cordCurve.updateArcLengths();
    const frames=cordCurve.computeFrenetFrames(36,false),a=padCord.geometry.attributes.position,n=padCord.geometry.attributes.normal;
    for(let i=0;i<=36;i++){cordCurve.getPointAt(i/36,cordCenter);for(let j=0;j<=6;j++){const theta=j/6*Math.PI*2,normal=frames.normals[i].clone().multiplyScalar(Math.cos(theta)).addScaledVector(frames.binormals[i],Math.sin(theta)),v=cordCenter.clone().addScaledVector(normal,.00765),k=i*7+j;a.setXYZ(k,v.x,v.y,v.z);n.setXYZ(k,normal.x,normal.y,normal.z);}}
    a.needsUpdate=true;n.needsUpdate=true;padCord.geometry.computeBoundingSphere();padCord.userData.endpoint=cordEnd.toArray();
  }
  updateControllerCord();
  plug(consolePort.x,consolePort.y,consolePort.z,'#8c8c88');

  inkify(g, { skip: (o) => o.userData.noInk || (o.material && o.material.isMeshBasicMaterial) || (o.geometry && o.geometry.type === 'TubeGeometry') });

  /* ── écran : état et animation d'allumage ── */
  const cv = tex.image, c = cv.getContext('2d');
  const rd = rng(99);
  const st = { state: 'off', t: 0, last: -1, strip: true, bootTicket:0, bootDuration:0 };
  const bootVideo=document.createElement('video');bootVideo.src=new URL('../assets/ps1-boot-video-v50.mp4',import.meta.url);bootVideo.muted=true;bootVideo.playsInline=true;bootVideo.preload='metadata';
  const bootTexture=new THREE.VideoTexture(bootVideo);bootTexture.colorSpace=THREE.SRGBColorSpace;
  const videoReady=new Promise(resolve=>{bootVideo.addEventListener('loadedmetadata',resolve,{once:true});bootVideo.addEventListener('error',resolve,{once:true});});
  async function startBoot(){
    const ticket=++st.bootTicket;await videoReady;if(ticket!==st.bootTicket)return;
    bootVideo.currentTime=0;const audio=await sound?.powerOn();if(ticket!==st.bootTicket)return;
    st.bootDuration=audio?.duration||14.916;bootVideo.playbackRate=Number.isFinite(bootVideo.duration)?bootVideo.duration/st.bootDuration:1;st.bootStart=performance.now();
    screenMat.map=bootTexture;screenMat.needsUpdate=true;bootVideo.play().catch(()=>{screenMat.map=tex;screenMat.needsUpdate=true;});
  }
  function finishBoot(){bootVideo.pause();screenMat.map=tex;screenMat.needsUpdate=true;st.state='ready';st.last=-1;}
  bootVideo.addEventListener('ended',()=>{if(st.state==='warm')finishBoot();});
  const scan = () => { c.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < 240; y += 3) c.fillRect(0, y, 320, 1); };
  const vignette = () => { const gr = c.createRadialGradient(160, 120, 60, 160, 120, 210); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = gr; c.fillRect(0, 0, 320, 240); };
  function noise(a = 1) { const id = c.createImageData(320, 240), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = (rd() * 255 * a) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } c.putImageData(id, 0, 0); }
  function drawOff() { const gr = c.createLinearGradient(0, 0, 320, 240); gr.addColorStop(0, '#16191b'); gr.addColorStop(0.5, '#0a0c0d'); gr.addColorStop(1, '#101315'); c.fillStyle = gr; c.fillRect(0, 0, 320, 240); c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.ellipse(90, 50, 80, 30, -0.4, 0, 6.3); c.fill(); }
  function drawReady(t) {
    const gr = c.createLinearGradient(0, 0, 0, 240); gr.addColorStop(0, '#1b2b9a'); gr.addColorStop(1, '#07104a'); c.fillStyle = gr; c.fillRect(0, 0, 320, 240);
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 18; i++) c.fillRect(0, (i * 14 + t * 40) % 240, 320, 4);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 56px "Courier New", monospace'; c.fillStyle = '#0a0f3a'; c.fillText('PLAY ?', 164, 108); 
    const blink = Math.sin(t * 5) > -0.4; c.fillStyle = blink ? '#ffffff' : '#9aa6ff'; c.fillText('PLAY ?', 160, 104);
    c.font = '15px "Courier New", monospace'; c.fillStyle = '#c9d2ff'; c.fillText('CLIQUEZ SUR LA TELE', 160, 168);
    c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(60, 98); c.lineTo(60, 122); c.lineTo(80, 110); c.closePath(); c.fill();
    scan(); vignette();
  }
  function frame(dt) {
    st.t += dt;
    const t = st.t;
    if (st.state === 'off') { if (st.last !== 0) { drawOff(); tex.needsUpdate = true; st.last = 0; } return; }
    if (t - st.last < 0.05 && st.state !== 'warm') return;
    st.last = t;
    if (st.state === 'warm') {
      if(st.bootStart&&performance.now()-st.bootStart>=st.bootDuration*1000+150)finishBoot();
      if(screenMat.map===tex){c.fillStyle='#000';c.fillRect(0,0,320,240);}
    } else if (st.state === 'ready') drawReady(t);
    else if (st.state === 'closing') {
      if (t < 0.25) { const k = t / 0.25; c.fillStyle = '#000'; c.fillRect(0, 0, 320, 240); const h = Math.max(3, 240 * (1 - k * k)); c.fillStyle = '#fff'; c.fillRect(0, 120 - h / 2, 320, h); }
      else if (t < 0.55) { c.fillStyle = '#000'; c.fillRect(0, 0, 320, 240); const w = 320 * (1 - (t - 0.25) / 0.3); c.fillStyle = '#fff'; c.fillRect(160 - w / 2, 118, Math.max(2, w), 4); }
      else { st.state = 'off'; st.last = -1; }
    }
    tex.needsUpdate = true;
  }
  const litMat = rocker.material; litMat.userData.unique = true;
  const api = {
    pad, padCord, padSocket, consolePort, consoleAV, consolePower, tv, tvAV, tvPower, screen, staticCables, console: ps,
    get padHeld() { return padHeld; },
    setPadHeld(v) { padHeld = !!v; },
    updatePad(dt, handL, handR) {
      const k = 1 - Math.exp(-dt * (padHeld ? 16 : 9));

      if (padHeld && handL && handR) {
        g.updateMatrixWorld(true);
        handL.updateWorldMatrix(true, false);
        handR.updateWorldMatrix(true, false);

        const L = handL.getWorldPosition(new THREE.Vector3());
        const R = handR.getWorldPosition(new THREE.Vector3());
        padTargetPos.copy(L).add(R).multiplyScalar(0.5);
        padTargetPos.y -= 0.012;

        padRight.copy(R).sub(L).normalize();
        padForward.crossVectors(padRight, padUp).normalize();
        if (padForward.lengthSq() < 1e-5) padForward.set(0, 0, 1);

        padWorld.makeBasis(padRight, padUp, padForward).setPosition(padTargetPos);
        padParentInv.copy(g.matrixWorld).invert();
        padLocal.copy(padParentInv).multiply(padWorld);
        padLocal.decompose(padTargetPos, padTargetQuat, padTmpScale);

        pad.position.lerp(padTargetPos, k);
        pad.quaternion.slerp(padTargetQuat, k);
        pad.scale.lerp(padHome.scale, k);
      } else {
        pad.position.lerp(padHome.position, k);
        pad.quaternion.slerp(padHome.quaternion, k);
        pad.scale.lerp(padHome.scale, k);
      }
      updateControllerCord();
    },
    strip, cordStart, get stripOn() { return st.strip; },
    setStrip(v) { st.strip = v; litMat.emissiveIntensity = v ? 1.6 : 0; litMat.color.set(v ? '#ff5a2a' : '#6b2a18'); if (!v) this.powerOff(); },
    group: g, tvCenter: new THREE.Vector3(-0.04, Y0 + H * 0.52, frontZ + 0.02),
    get state() { return st.state; }, bootVideo, get bootDuration(){return st.bootDuration;},
    powerOn() { if (st.strip && st.state === 'off') { st.state = 'warm'; st.t = 0; st.last = -1;st.bootStart=0;startBoot(); } },
    powerOff() { if (st.state !== 'off') { st.state = 'closing'; st.t = 0; st.last = -1;st.bootTicket++;bootVideo.pause();screenMat.map=tex;screenMat.needsUpdate=true;sound?.powerOff(); } },
    update(dt) { frame(dt); },
  };
  frame(0.01);
  return api;
}
