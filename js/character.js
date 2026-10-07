import { THREE, mat, loadBuffer } from './kit.js?v=068a541';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';

// Character imported from 84b390d3dd44755f.fbx and converted to a compact skinned GLB.
// It keeps the original geometry/material styling and retargets the site's existing
// animation library (assets/anims.glb) onto the imported FBX rig at runtime.

const C = {
  skin: '#efdfd1', skinShade: '#d6b8a0',
  hair: '#6b3d1f', hairDark: '#472812',
  eye: '#30251f', mouth: '#9a4d3c'
};

function faceTexture(kind) {
  const W = 128, H = 128;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.clearRect(0, 0, W, H);
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const eyeY = 45, ex = [43, 85];
  // yeux ouverts : blanc de l'œil, iris bleu, pupille sombre, reflet ; seul « blink » ferme la paupière
  const eye = (x, h = 20, up = 0) => { r(x - 8, eyeY + up, 16, h, '#f7f9fc'); r(x - 5, eyeY + up + 2, 10, h - 4, '#2f7fe0'); r(x - 5, eyeY + up + 2, 10, 3, '#1f5fb8'); r(x - 2, eyeY + up + 6, 4, h - 11, '#10223d'); r(x + 1, eyeY + up + 3, 3, 3, '#ffffff'); r(x - 8, eyeY + up - 1, 16, 2, '#2a1a10'); };
  const eyes = {
    blink: () => ex.forEach((x) => { r(x - 9, eyeY + 9, 18, 3, '#2a1a10'); }),
    amazed: () => ex.forEach((x) => eye(x, 24, -2)),
    happy: () => ex.forEach((x) => eye(x, 17, 2)),
  };
  (eyes[kind] || (() => ex.forEach((x) => eye(x))))();
  r(61, 66, 6, 9, C.skinShade);
  const mouth = {
    neutral: () => r(48, 91, 32, 5, C.mouth),
    blink: () => r(48, 91, 32, 5, C.mouth),
    happy: () => { r(43, 86, 42, 14, '#9a382e'); r(47, 87, 34, 4, '#f7eee8'); },
    amazed: () => r(54, 83, 20, 20, '#78352c'),
    talkA: () => { r(43, 84, 42, 19, '#773027'); r(47, 85, 34, 4, '#f7eee8'); },
    talkO: () => r(54, 83, 20, 21, '#773027'),
    sip: () => r(58, 91, 13, 9, C.mouth),
  }[kind] || (() => r(48, 91, 32, 5, C.mouth));
  mouth();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function qFromArray(a) { return new THREE.Quaternion(a[0], a[1], a[2], a[3]).normalize(); }

function cloneRetargetedClip(clip, sourceRig, bones, positionScale, sourceRootQuat) {
  const tracks = [];
  for (const src of clip.tracks) {
    const dot = src.name.lastIndexOf('.');
    if (dot < 0) continue;
    const nodeName = src.name.slice(0, dot);
    const prop = src.name.slice(dot + 1);
    const bone = bones[nodeName];
    const rest = sourceRig[nodeName];
    if (!bone || !rest) continue;
    const tr = src.clone();
    if (prop === 'quaternion' && tr.values.length % 4 === 0) {
      const srcRest = qFromArray(rest.q), invSrc = srcRest.clone().invert();
      const tgtRest = bone.quaternion.clone();
      const q = new THREE.Quaternion(), delta = new THREE.Quaternion();
      for (let i = 0; i < tr.values.length; i += 4) {
        q.set(tr.values[i], tr.values[i + 1], tr.values[i + 2], tr.values[i + 3]).normalize();
        delta.copy(invSrc).multiply(q);
        q.copy(tgtRest).multiply(delta).normalize();
        tr.values[i] = q.x; tr.values[i + 1] = q.y; tr.values[i + 2] = q.z; tr.values[i + 3] = q.w;
      }
    } else if (prop === 'position' && tr.values.length % 3 === 0) {
      const sp = rest.pos, tp = bone.position, d = new THREE.Vector3();
      for (let i = 0; i < tr.values.length; i += 3) {
        d.set(tr.values[i] - sp[0], tr.values[i + 1] - sp[1], tr.values[i + 2] - sp[2]);
        // The source animation rig has a -90° X root. Convert pelvis motion from
        // that root-local frame into the imported FBX Y-up bind frame.
        d.applyQuaternion(sourceRootQuat).multiplyScalar(positionScale);
        tr.values[i] = tp.x + d.x; tr.values[i + 1] = tp.y + d.y; tr.values[i + 2] = tp.z + d.z;
      }
    }
    tracks.push(tr);
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
}

function makeWateringCan() {
  const can = new THREE.Group(), inner = new THREE.Group(), canTip = new THREE.Object3D();
  const green = mat('#3f8f6a');
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 0.15, 1, 1, 1), green);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.24, 8), green);
  spout.rotation.z = -1.05; spout.position.set(0.17, 0.07, 0);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.03, 10), green);
  rose.rotation.z = -1.05; rose.position.set(0.275, 0.124, 0);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 14, Math.PI), green);
  handle.position.set(-0.03, 0.09, 0);
  for (const o of [body, spout, handle]) o.castShadow = true;
  inner.add(body, spout, rose, handle); inner.rotation.y = -Math.PI / 2;
  canTip.position.set(0.3, 0.14, 0); inner.add(canTip); can.add(inner); can.visible = false;
  return { can, canTip };
}

export async function createCharacter({
  modelUrl = 'assets/mathieu-character.glb?v=068a541',
  rigUrl = 'assets/rig.json?v=068a541',
  animsUrl = 'assets/anims.glb?v=068a541',
  targetHeight = 1.58,
} = {}) {
  const [modelBuffer, rigBuffer, animBuffer] = await Promise.all([
    loadBuffer(modelUrl), loadBuffer(rigUrl), loadBuffer(animsUrl),
  ]);
  const loader = new GLTFLoader();
  const parse = (b) => new Promise((res, rej) => loader.parse(b, '', res, rej));
  const [characterGltf, animGltf] = await Promise.all([parse(modelBuffer), parse(animBuffer)]);

  // NB992_OPTIONAL : le modèle New Balance 992 (Sketchfab) se place dans assets/nb992.glb. Sans ce fichier, les chaussures d'origine restent.
  let nb992Gltf = null;
  try { nb992Gltf = await parse(await loadBuffer('assets/nb992.glb?v=068a541')); } catch (_) {}
  const rig = JSON.parse(new TextDecoder().decode(rigBuffer));
  const sourceRig = Object.fromEntries(rig.map((b) => [b.n, b]));
  const sourceRootQuat = qFromArray(sourceRig.root?.q || [0, 0, 0, 1]);

  const group = new THREE.Group();
  group.name = 'MathieuCharacterRuntime';
  const model = characterGltf.scene;
  model.name = 'MathieuCharacterModel';
  group.add(model);

  // Normalize the raw FBX authoring scale to the current apartment character scale.
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const rawHeight = Math.max(size.y, 1e-4), s = targetHeight / rawHeight;
  model.scale.setScalar(s);
  model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  model.updateMatrixWorld(true);

  const bones = {};
  const boneNames = ['root','pelvis','spine_01','spine_02','spine_03','neck_01','Head','clavicle_l','upperarm_l','lowerarm_l','hand_l','clavicle_r','upperarm_r','lowerarm_r','hand_r','thigh_l','calf_l','foot_l','ball_l','thigh_r','calf_r','foot_r','ball_r'];
  for (const n of boneNames) {
    const o = model.getObjectByName(n);
    if (o) bones[n] = o;
  }
  const skinned = [];
  const paleSkin = new THREE.Color('#f3e3d8');
  const paleSkinShade = new THREE.Color('#dbc2b0');
  const chestnut = new THREE.Color('#6a3d24');
  const chestnutDark = new THREE.Color('#482716');
  const frameBlack = new THREE.Color('#050505');
  const skinMaterials = new Set(['Material #79']);
  const skinShadeMaterials = new Set(['Material #382', 'Material #508']);
  const hairMaterials = new Set(['Material #417']);
  const hairDarkMaterials = new Set(['Material #680', 'Material #1064']);
  const frameMaterials = new Set(['Material #474','Material #462','Material #464','Material #465','Material #466','Material #467','Material #468']);
  const applyPalette = (m) => {
    if (!m) return;
    if (skinMaterials.has(m.name)) m.color.copy(paleSkin);
    else if (skinShadeMaterials.has(m.name)) m.color.copy(paleSkinShade);
    else if (hairMaterials.has(m.name)) { m.color.copy(chestnut); m.roughness = 0.52; m.metalness = 0; }
    else if (hairDarkMaterials.has(m.name)) { m.color.copy(chestnutDark); m.roughness = 0.58; m.metalness = 0; }
    else if (frameMaterials.has(m.name)) m.color.copy(frameBlack);
    if (m.name === 'Material #1168') { m.color.set('#eef7ff'); m.transparent = true; m.opacity = 0.1; m.depthWrite = false; m.roughness = 0.05; m.metalness = 0; }          // verres de vue : clairs, pas noirs
    if (m.name === 'Material #1167') { m.color.set('#f7fbff'); m.transparent = true; m.opacity = 0.13; m.depthWrite = false; m.roughness = 0.06; m.metalness = 0; }
    m.needsUpdate = true;
  };
  model.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(applyPalette);
    }
    if (o.isSkinnedMesh) skinned.push(o);
  });
  const skeleton = skinned[0]?.skeleton;
  if (!skeleton || !bones.pelvis || !bones.Head) throw new Error('Rig FBX converti incomplet');

  // Preserve black frames / transparent lenses and replace only the expression plate.
  const faces = {};
  for (const k of ['neutral','blink','happy','amazed','talkA','talkO','sip']) faces[k] = faceTexture(k);
  const plate = model.getObjectByName('expression_plate');
  let plateMat = null;
  if (plate?.isMesh || plate?.isSkinnedMesh) {
    plateMat = new THREE.MeshBasicMaterial({ map: faces.neutral, transparent: true, alphaTest: 0.02, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    plate.material = plateMat; plate.castShadow = false;
  }

  const shoes = model.getObjectByName('shoes');
  const originalLegs = model.getObjectByName('legs');
  const shoeVisuals = [], sockVisuals = [], shoeParts = [], trouserCuffs = [];
  let shoesOn = true;
  if (originalLegs) originalLegs.visible = true;
  if (shoes) shoes.traverse((o) => { if (o.isMesh && /^shoes_(?:9|10|11|12)$/.test(o.name)) { o.visible = true; trouserCuffs.push(o); } });
  if (shoes) shoes.traverse((o) => { if (o.isMesh && /^shoes_[1-8]$/.test(o.name)) shoeParts.push(o); });   // chaussures d'origine ; shoes_9-12 : chevilles d'origine, remplacées par le revers du pantalon
  // Monte la paire de New Balance 992 (assets/nb992.glb : deux nœuds nb_left / nb_right, orteils vers +Z, semelle à y = 0, ~29 cm) sur les os des pieds.
  // La pose de référence est l'Idle : dans cette pose le pied est à plat, on y place chaque chaussure puis on la fige dans le repère de l'os.
  const attachNB992 = () => {
    if (!nb992Gltf || !bones.foot_l || !bones.foot_r || !clips.Idle_Loop) return false;
    const tm = new THREE.AnimationMixer(group), act = tm.clipAction(clips.Idle_Loop); act.play(); tm.update(0); group.updateMatrixWorld(true);
    const ground = Math.min(bones.ball_l.getWorldPosition(new THREE.Vector3()).y, bones.ball_r.getWorldPosition(new THREE.Vector3()).y) - 0.04;
    for (const [side, bone, ball] of [['left', bones.foot_l, bones.ball_l], ['right', bones.foot_r, bones.ball_r]]) {
      const src = nb992Gltf.scene.getObjectByName('nb_' + side); if (!src) continue;
      const shoe = src.clone(true);
      shoe.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      const f0 = bone.getWorldPosition(new THREE.Vector3()), b0 = ball.getWorldPosition(new THREE.Vector3());
      const fwd = b0.clone().sub(f0); fwd.y = 0; fwd.normalize();
      const x = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();
      const world = new THREE.Matrix4().makeBasis(x, new THREE.Vector3(0, 1, 0), fwd).setPosition(f0.x + fwd.x * 0.07, ground, f0.z + fwd.z * 0.07);
      const local = bone.matrixWorld.clone().invert().multiply(world);
      shoe.matrixAutoUpdate = true; local.decompose(shoe.position, shoe.quaternion, shoe.scale);
      shoe.scale.multiplyScalar(1.14);                               // 992 chunky mais proportionnée au corps
      bone.add(shoe); shoeVisuals.push(shoe);
      // Chaussette opaque, visible uniquement lorsque les chaussures sont retirées.
      // Elle est calée sur le même repère que la basket, donc suit exactement le pied.
      const sock = new THREE.Group();
      const sockMat = new THREE.MeshStandardMaterial({ color: '#e8e6df', roughness: 0.96, metalness: 0 });
      const sockFoot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 10), sockMat);
      sockFoot.scale.set(0.88, 0.58, 2.05);
      sockFoot.position.set(0, 0.035, 0.080);
      const sockAnkle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.050, 0.105, 16, 3), sockMat);
      sockAnkle.position.set(0, 0.075, -0.005);
      for (const m of [sockFoot, sockAnkle]) { m.castShadow = true; m.receiveShadow = true; }
      sock.add(sockFoot, sockAnkle);
      const sockWorld = new THREE.Matrix4().makeBasis(x, new THREE.Vector3(0, 1, 0), fwd)
        .setPosition(f0.x + fwd.x * 0.045, ground + 0.012, f0.z + fwd.z * 0.045);
      const sockLocal = bone.matrixWorld.clone().invert().multiply(sockWorld);
      sockLocal.decompose(sock.position, sock.quaternion, sock.scale);
      sock.visible = false;
      bone.add(sock); sockVisuals.push(sock);
    }

    act.stop(); tm.stopAllAction(); tm.uncacheRoot(group);
    shoeParts.forEach((o) => { o.visible = false; });
    return shoeVisuals.length === 2;
  };
  const { can, canTip } = makeWateringCan(); group.add(can);

  // Retarget les 31 actions de la bibliothèque (rig Quaternius, axe d'os +Y) sur le rig FBX importé (axe d'os +X) : les deux squelettes n'ont pas les mêmes repères
  // locaux ; on transfère donc la rotation MONDE de chaque os par rapport à sa pose de repos, puis on la reconvertit dans le repère local de la cible.
  const clips = {};
  {
    const order = rig.map((b) => b.n), srcQ0 = {}, srcP0 = {}, par = {};
    for (const b of rig) { srcQ0[b.n] = qFromArray(b.q); srcP0[b.n] = new THREE.Vector3(...b.pos); par[b.n] = b.p; }
    const srcFK = (qOf, pOf) => {
      const Wq = {}, Wp = {};
      for (const n of order) {
        const q = qOf(n), pos = pOf(n);
        if (!par[n]) { Wq[n] = q.clone(); Wp[n] = pos.clone(); }
        else { Wq[n] = Wq[par[n]].clone().multiply(q); Wp[n] = Wp[par[n]].clone().add(pos.clone().applyQuaternion(Wq[par[n]])); }
      }
      return { Wq, Wp };
    };
    const S0 = srcFK((n) => srcQ0[n], (n) => srcP0[n]);
    group.updateMatrixWorld(true);
    const tb = order.filter((n) => bones[n]);                       // os cibles présents (sans 'root')
    const T0q = {}, T0p = {};
    for (const n of tb) { T0q[n] = bones[n].getWorldQuaternion(new THREE.Quaternion()); T0p[n] = bones[n].getWorldPosition(new THREE.Vector3()); }
    const parentOfPelvis = bones.pelvis.parent.getWorldQuaternion(new THREE.Quaternion());
    // alignement des repères (cap) : direction pied → orteil dans chaque rig
    const fwd = (a, b2) => { const v = b2.clone().sub(a); return Math.atan2(v.x, v.z); };
    const yawA = fwd(T0p.foot_l, T0p.ball_l) - fwd(S0.Wp.foot_l, S0.Wp.ball_l);
    const A = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawA), Ai = A.clone().invert();
    const srcH = S0.Wp.pelvis.y - Math.min(S0.Wp.ball_l.y, S0.Wp.ball_r.y);
    const tgtH = T0p.pelvis.y - Math.min(T0p.ball_l.y, T0p.ball_r.y);
    const kPos = tgtH / Math.max(srcH, 1e-4);
    const modelScale = model.scale.x || 1;
    const pelvisRestLocal = bones.pelvis.position.clone();
    const rootQ = srcQ0.root;
    const retarget = (clip) => {
      const qI = {}, pI = null; let pelvisPos = null;
      for (const t of clip.tracks) {
        const dot = t.name.lastIndexOf('.'), n = t.name.slice(0, dot), prop = t.name.slice(dot + 1);
        if (prop === 'quaternion') qI[n] = t.createInterpolant();
        else if (prop === 'position' && n === 'pelvis') pelvisPos = t.createInterpolant();
      }
      const fps = 30, N = Math.max(2, Math.ceil(clip.duration * fps) + 1), times = [], Q = {}, P = [];
      for (const n of tb) Q[n] = [];
      const qs = new THREE.Quaternion();
      for (let k = 0; k < N; k++) {
        const t = Math.min(clip.duration, k / fps); times.push(t);
        const loc = {};
        const S = srcFK((n) => { if (qI[n]) { const v = qI[n].evaluate(t); return qs.set(v[0], v[1], v[2], v[3]).normalize().clone(); } return srcQ0[n]; },
          (n) => { if (n === 'pelvis' && pelvisPos) { const v = pelvisPos.evaluate(t); return new THREE.Vector3(v[0], v[1], v[2]); } return srcP0[n]; });
        const Wt = {};
        for (const n of tb) {
          const D = S.Wq[n].clone().multiply(S0.Wq[n].clone().invert());          // delta monde de l'os
          Wt[n] = A.clone().multiply(D).multiply(Ai).multiply(T0q[n]);
          const pq = n === 'pelvis' ? parentOfPelvis : Wt[par[n]];
          Q[n].push(...pq.clone().invert().multiply(Wt[n]).normalize().toArray());
        }
        // translation du bassin : déplacement monde (repère source → cible), converti en unités locales du parent
        const pp = pelvisPos ? pelvisPos.evaluate(t) : null;
        const d = pp ? new THREE.Vector3(pp[0] - srcP0.pelvis.x, pp[1] - srcP0.pelvis.y, pp[2] - srcP0.pelvis.z) : new THREE.Vector3();
        d.applyQuaternion(rootQ).multiplyScalar(kPos).applyQuaternion(A).applyQuaternion(parentOfPelvis.clone().invert()).divideScalar(modelScale);
        P.push(pelvisRestLocal.x + d.x, pelvisRestLocal.y + d.y, pelvisRestLocal.z + d.z);
      }
      const tracks = tb.map((n) => new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, Q[n]));
      tracks.push(new THREE.VectorKeyframeTrack('pelvis.position', times, P));
      return new THREE.AnimationClip(clip.name, clip.duration, tracks);
    };
    for (const a of animGltf.animations) clips[a.name] = retarget(a);
  }
  for (const a of characterGltf.animations || []) clips[a.name] = a.clone();
  attachNB992();

  const mixer = new THREE.AnimationMixer(group);
  let action = null, activeClipName = 'Idle_Loop', base = 'neutral', blink = 0, nextBlink = 2, flash = 0, flashKind = null, talking = false;

  // GAIT_STABILIZER : pose neutre de référence pour que bassin et torse ne restent pas inclinés d'un côté après le retarget.
  const gaitRest = {};
  for (const n of ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01']) if (bones[n]) gaitRest[n] = bones[n].quaternion.clone();
  const gaitPelvisRest = bones.pelvis.position.clone();
  let ov = null, ovW = 0, post = null, lean = 0, leanW = 0, levelW = 0; const LEVEL_SIGN = -1;

  const _pq = new THREE.Quaternion(), _qg = new THREE.Quaternion(), _R = new THREE.Quaternion(), _M = new THREE.Quaternion(), _v = new THREE.Vector3();
  const _fw = new THREE.Vector3(), _tg = new THREE.Vector3(), _th = new THREE.Vector3(), _ax = new THREE.Vector3(), _UP = new THREE.Vector3(0, 1, 0), view = { right: new THREE.Vector3(1, 0, 0), toCam: new THREE.Vector3(0, 0, 1) };
  const _Z = new THREE.Vector3(0, 0, 1), _X = new THREE.Vector3(1, 0, 0), _AIM = new THREE.Vector3(1, 0, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  const applyWorldRot = (bone, qWorld) => {
    bone.parent.getWorldQuaternion(_pq);
    _M.copy(_pq).invert().multiply(qWorld).multiply(_pq);
    bone.quaternion.premultiply(_M); bone.updateMatrixWorld(true);       // seulement le sous-arbre de l'os
  };
  const rotChar = (bone, ang, axis = _X) => {
    group.getWorldQuaternion(_qg); _R.setFromAxisAngle(axis, ang);
    applyWorldRot(bone, _qg.clone().multiply(_R).multiply(_qg.clone().invert()));
  };
  const aim = (bone, targetWorld) => {
    bone.getWorldPosition(_a); bone.getWorldQuaternion(_q1);
    _b.copy(_AIM).applyQuaternion(_q1); _v.copy(targetWorld).sub(_a).normalize();
    _q2.setFromUnitVectors(_b, _v); applyWorldRot(bone, _q2.clone());
  };
  const ik2 = (upper, lower, end, target, pole) => {
    group.updateMatrixWorld(true);
    const S = upper.getWorldPosition(new THREE.Vector3()), E0 = lower.getWorldPosition(new THREE.Vector3()), H0 = end.getWorldPosition(new THREE.Vector3());
    const l1 = S.distanceTo(E0), l2 = E0.distanceTo(H0), dir = target.clone().sub(S);
    const dist = Math.min(Math.max(dir.length(), 1e-6), (l1 + l2) * 0.999); dir.normalize();
    const aa = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(l1 * l1 - aa * aa, 0));
    const pv = pole.clone().sub(S); pv.addScaledVector(dir, -pv.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, aa).addScaledVector(pv, h);
    aim(upper, E); aim(lower, S.clone().addScaledVector(dir, dist));
  };
  const wp = (n) => bones[n]?.getWorldPosition(new THREE.Vector3());
  const setFace = (kind) => { if (plateMat && faces[kind] && plateMat.map !== faces[kind]) { plateMat.map = faces[kind]; plateMat.needsUpdate = true; } };

  // Portrait interaction extracted from shujaat.info/info/: the outer page forwards
  // normalized pointer coordinates (-1..1) to shupiPortrait.lookAtPointer().
  // We reproduce that API directly on the imported FBX head/neck.
  const portrait = {
    targetX: 0, targetY: 0, x: 0, y: 0,
    enabled: true, deviceTilt: false, hover: false, amazed: false,
    yaw: THREE.MathUtils.degToRad(34), pitchUp: THREE.MathUtils.degToRad(22), pitchDown: THREE.MathUtils.degToRad(18),
    damping: 11,
  };
  const lookAtPointer = (x, y) => {
    if (portrait.deviceTilt) return;
    portrait.targetX = THREE.MathUtils.clamp(Number(x) || 0, -1, 1);
    portrait.targetY = THREE.MathUtils.clamp(Number(y) || 0, -1, 1);
  };
  const lookAtTilt = (x, y) => {
    if (!portrait.deviceTilt) return;
    portrait.targetX = THREE.MathUtils.clamp(Number(x) || 0, -1, 1);
    portrait.targetY = THREE.MathUtils.clamp(Number(y) || 0, -1, 1);
  };
  const resetLook = () => { portrait.targetX = 0; portrait.targetY = 0; };

  const plantSeatedFeet = (groundY) => {
    if (![bones.thigh_l,bones.calf_l,bones.foot_l,bones.ball_l,bones.thigh_r,bones.calf_r,bones.foot_r,bones.ball_r].every(Boolean)) return;
    group.updateMatrixWorld(true);
    const qg = group.getWorldQuaternion(new THREE.Quaternion());
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(qg); forward.y = 0; forward.normalize();
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(qg); side.y = 0; side.normalize();
    const pelvisW = bones.pelvis.getWorldPosition(new THREE.Vector3());
    const plant = (sgn, thigh, calf, foot) => {
      const target = foot.getWorldPosition(new THREE.Vector3());
      const rel = target.clone().sub(pelvisW);
      const fd = rel.dot(forward);
      if (fd < 0.22) target.addScaledVector(forward, 0.22 - fd);
      const lat = rel.dot(side), wanted = sgn * Math.max(0.105, Math.abs(lat));
      target.addScaledVector(side, wanted - lat);
      target.y = groundY + 0.055;
      const knee = calf.getWorldPosition(new THREE.Vector3());
      const pole = knee.clone().addScaledVector(forward, 0.30).addScaledVector(side, sgn * 0.12);
      ik2(thigh, calf, foot, target, pole);
      group.updateMatrixWorld(true);
      const toe = target.clone().addScaledVector(forward, 0.16); toe.y = groundY + 0.058;
      aim(foot, toe);
    };
    plant(-1, bones.thigh_l, bones.calf_l, bones.foot_l);
    plant( 1, bones.thigh_r, bones.calf_r, bones.foot_r);
    group.updateMatrixWorld(true);
  };

  return {
    group, model, bones, skeleton, can, canTip, head: bones.Head, clips: Object.keys(clips), rotChar, aim, ik2, wp, mixer, lookAtPointer, lookAtTilt, resetLook, plantSeatedFeet,
    play(name, { fade = 0.25, speed = 1 } = {}) {
      const clip = clips[name] || clips.Idle_Loop || Object.values(clips)[0]; if (!clip) return;
      activeClipName = clip.name || name;
      const next = mixer.clipAction(clip); next.setEffectiveTimeScale(speed); next.reset().fadeIn(fade).play();
      if (action && action !== next) action.fadeOut(fade); action = next;
    },
    stop() { if (action) { action.stop(); action = null; } mixer.stopAllAction(); },
    setBase(kind) { base = kind; setFace(base); },
    setOverride(o) { ov = o; if (o) ovW = 0; },
    setPost(fn) { post = fn; },
    setShoes(on) {
      shoesOn = !!on;
      if (shoeVisuals.length) shoeVisuals.forEach((o) => { o.visible = shoesOn; });
      else if (shoes) shoes.visible = shoesOn;
      sockVisuals.forEach((o) => { o.visible = !shoesOn; });
      if (originalLegs) originalLegs.visible = true;
      trouserCuffs.forEach((o) => { o.visible = true; });
    },
    flash(kind, secs = 0.7) { flashKind = kind; flash = secs; },
    talk(on) { talking = on; },
    setDeviceTilt(on) { portrait.deviceTilt = !!on; if (!on) resetLook(); },
    setHoverExpression(on) { portrait.hover = !!on; },
    setAmazed(on) { portrait.amazed = !!on; },
    setLean(v) { lean = v; },
    setLookView(right, toCam) { view.right.copy(right); view.toCam.copy(toCam); },       // repère de l'écran : droite de l'écran et direction vers la caméra (horizontales, unitaires)
    setHeadOnly(on = true) {
      model.traverse((o) => {
        if ((o.isMesh || o.isSkinnedMesh) && /^(jacket|arm|shirt|legs|shoes|id|clip|nb_)/.test(o.name)) o.visible = !on;
        else if (o.isMesh && !o.name && o.parent && (o.parent === bones.foot_l || o.parent === bones.foot_r)) o.visible = !on;
      });
      if (originalLegs) originalLegs.visible = !on;
      shoeVisuals.forEach((o) => { o.visible = !on && shoesOn; });
      sockVisuals.forEach((o) => { o.visible = !on && !shoesOn; });
    },
    setHeadScale() {},
    update(dt, t) {
      mixer.update(dt); group.updateMatrixWorld(true);

      // GAIT_STABILIZER : recentre le bassin et réduit le roulis du retarget sans supprimer le pas.
      const locomotion = /Walk|Jog|Sprint/i.test(activeClipName);
      if (locomotion) {
        bones.pelvis.position.x += (gaitPelvisRest.x - bones.pelvis.position.x) * 0.48;
        bones.pelvis.position.z += (gaitPelvisRest.z - bones.pelvis.position.z) * 0.16;
        const weights = { pelvis: 0.24, spine_01: 0.12, spine_02: 0.075, spine_03: 0.045, neck_01: 0.025 };
        for (const [n, w] of Object.entries(weights)) if (bones[n] && gaitRest[n]) bones[n].quaternion.slerp(gaitRest[n], w);
        group.updateMatrixWorld(true);
      }
      if (ov) {
        ovW += (1 - ovW) * (1 - Math.exp(-dt * 7));
        if (ov.lean) for (const n of ['spine_01','spine_02','spine_03']) if (bones[n]) rotChar(bones[n], ov.lean * ovW / 3);
        if (ov.armR && bones.upperarm_r) rotChar(bones.upperarm_r, ov.armR * ovW);
        if (ov.foreR && bones.lowerarm_r) rotChar(bones.lowerarm_r, ov.foreR * ovW);
        if (ov.armL && bones.upperarm_l) rotChar(bones.upperarm_l, ov.armL * ovW);
        if (ov.foreL && bones.lowerarm_l) rotChar(bones.lowerarm_l, ov.foreL * ovW);
        if (ov.head && bones.Head) rotChar(bones.Head, ov.head * ovW);
      }
      if (post) post(dt, t);
      // mise à niveau : la ligne des épaules reste horizontale (le retarget laissait ~7° de roulis debout et ~11° assis, d'où le côté « de travers »)
      if (bones.upperarm_l && bones.upperarm_r && bones.spine_01) {
        const a = group.worldToLocal(bones.upperarm_l.getWorldPosition(_v.clone())), b2 = group.worldToLocal(bones.upperarm_r.getWorldPosition(_v.clone()));
        const rawRoll = Math.atan2(a.y - b2.y, Math.hypot(a.x - b2.x, a.z - b2.z));
        const maxRoll = THREE.MathUtils.degToRad(locomotion ? 2.5 : 5);
        const roll = THREE.MathUtils.clamp(rawRoll, -maxRoll, maxRoll);
        levelW += (roll - levelW) * (1 - Math.exp(-dt * 10));
        const gain = locomotion ? 0.55 : 1;
        for (const n of ['spine_01', 'spine_02', 'spine_03']) rotChar(bones[n], levelW * LEVEL_SIGN * gain / 3, _Z);
      }
      leanW += (lean - leanW) * (1 - Math.exp(-dt * 6));
      if (Math.abs(leanW) > 1e-3) for (const n of ['spine_01', 'spine_02', 'spine_03']) if (bones[n]) rotChar(bones[n], leanW / 3, _Z);        // redresse le buste (le rig importé penche d'un côté en marchant)
      if (portrait.enabled && bones.Head) {
        const kLook = 1 - Math.exp(-dt * portrait.damping);
        portrait.x += (portrait.targetX - portrait.x) * kLook;
        portrait.y += (portrait.targetY - portrait.y) * kLook;
        // direction visée dans le MONDE : vers la caméra, déviée vers la droite/haut de l'écran selon le pointeur ; on en tire lacet et tangage par rapport à l'avant du personnage
        group.getWorldQuaternion(_qg);
        const f = _fw.set(0, 0, 1).applyQuaternion(_qg); f.y = 0; f.normalize();
        const t = _tg.copy(view.toCam).multiplyScalar(1).addScaledVector(view.right, portrait.x * Math.tan(portrait.yaw)).addScaledVector(_UP, -portrait.y * Math.tan(portrait.y < 0 ? portrait.pitchUp : portrait.pitchDown));
        const th = _th.set(t.x, 0, t.z).normalize();
        const cross = f.x * th.z - f.z * th.x;                               // composante Y de f × th : > 0 = th est du côté +x de f
        let yaw = Math.atan2(-cross, f.dot(th)); yaw = THREE.MathUtils.clamp(yaw, -portrait.yaw, portrait.yaw);
        const pitch = Math.atan2(t.y, Math.hypot(t.x, t.z));
        _ax.crossVectors(f, _UP).normalize();
        if (bones.neck_01) { rotChar(bones.neck_01, pitch * 0.30, _ax); rotChar(bones.neck_01, yaw * 0.25, _UP); }
        rotChar(bones.Head, pitch * 0.70, _ax); rotChar(bones.Head, yaw * 0.75, _UP);
      }
      if (can.visible && bones.hand_r) {
        bones.hand_r.getWorldPosition(_v); can.position.copy(group.worldToLocal(_v));
        can.position.y -= 0.02; can.position.z += 0.07; can.quaternion.identity(); can.rotation.z = -0.35 - Math.sin(t * 2.4) * 0.05;
      }
      nextBlink -= dt;
      if (nextBlink < 0) { blink = 0.13; nextBlink = 2 + Math.random() * 3.2; }
      blink = Math.max(0, blink - dt); flash = Math.max(0, flash - dt);
      let kd = base;
      if (portrait.amazed || portrait.hover) kd = 'amazed';
      else if (flash > 0) kd = flashKind;
      else if (talking) kd = Math.sin(t * 11) > 0.2 ? 'talkA' : Math.sin(t * 7) > 0 ? 'talkO' : base;
      else if (blink > 0 && base !== 'happy') kd = 'blink';
      setFace(kd);
    },
  };
}
