import { THREE } from './kit.js?v=shujaat-room-v2';

const SOURCE_TO_TARGET = {
  Base_HumanPelvis001: 'pelvis',
  Base_HumanSpine1: 'spine_01',
  Base_HumanSpine2: 'spine_02',
  Base_HumanShoulder001: 'spine_03',
  Base_HumanNeck: 'neck_01',
  Base_HumanHead: 'Head',
  Base_HumanLArmCollarbone: 'clavicle_l',
  Base_HumanLArm1: 'upperarm_l',
  Base_HumanLArm2: 'lowerarm_l',
  Base_HumanLArmPalm: 'hand_l',
  Base_HumanRArmCollarbone: 'clavicle_r',
  Base_HumanRArm1: 'upperarm_r',
  Base_HumanRArm2: 'lowerarm_r',
  Base_HumanRArmPalm: 'hand_r',
  Base_HumanLLeg1: 'thigh_l',
  Base_HumanLLeg2: 'calf_l',
  Base_HumanLLegAnkle: 'foot_l',
  Base_HumanLLegDigit11: 'ball_l',
  Base_HumanRLeg1: 'thigh_r',
  Base_HumanRLeg2: 'calf_r',
  Base_HumanRLegAnkle: 'foot_r',
  Base_HumanRLegDigit11: 'ball_r',
};

const DESK_OBJECTS = [
  'Standing desk',
  'Fractal North chalk white PC',
  'Ceramic coffee mug',
  'Apple Studio Display',
  'Logitech MX Keys keyboard',
  'Logitech MX Master 4 mouse',
  'Nommo left speaker',
  'Nommo right speaker',
];

let singleton = null;

function waitFor(fn, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      let v = null;
      try { v = fn(); } catch {}
      if (v) return resolve(v);
      if (performance.now() - started > timeout) return reject(new Error('Runtime Shujaat indisponible'));
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function poseOf(o) {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  o.matrixWorld.decompose(p, q, s);
  return { p, q, s };
}

function makeDeskSet(scene) {
  scene.updateMatrixWorld(true);
  const desk = scene.getObjectByName('Standing desk');
  if (!desk) throw new Error('Standing desk introuvable');

  const anchor = desk.matrixWorld.clone();
  const inv = anchor.clone().invert();
  const root = new THREE.Group();
  root.name = 'ShujaatExactDeskSet';

  let deskClone = null;
  for (const name of DESK_OBJECTS) {
    const src = scene.getObjectByName(name);
    if (!src) continue;
    src.updateMatrixWorld(true);

    const clone = src.clone(true);
    clone.matrixAutoUpdate = true;
    const rel = inv.clone().multiply(src.matrixWorld);
    rel.decompose(clone.position, clone.quaternion, clone.scale);
    clone.name = name;

    clone.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      if (name === 'Apple Studio Display' || name === 'Fractal North chalk white PC') o.userData.id = 'pc';
    });

    if (name === 'Apple Studio Display' || name === 'Fractal North chalk white PC') clone.userData.id = 'pc';
    root.add(clone);
    if (name === 'Standing desk') deskClone = clone;
  }

  if (!deskClone) throw new Error('Clone Standing desk introuvable');

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(deskClone);
  const size = box.getSize(new THREE.Vector3());
  const width = Math.max(size.x, size.z);
  if (width > 0.001) root.scale.setScalar(1.9 / width);
  root.updateMatrixWorld(true);

  const display =
    root.getObjectByName('Apple Studio Display') ||
    root.getObjectByName('Fractal North chalk white PC') ||
    deskClone;

  return { root, display };
}

async function build() {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.src = './shupi/index.html?embed&profile=mobile';
  iframe.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:480px;height:320px;opacity:0;pointer-events:none;border:0;z-index:-1';
  document.body.appendChild(iframe);

  const sceneApi = await waitFor(() => iframe.contentWindow?.shupiHeader?.scene);
  const shupi = sceneApi.shupi;
  const sourceScene = shupi.scene;
  const sourceCharacter = shupi.character || shupi.model;

  const sourceBones = {};
  sourceCharacter?.traverse?.((o) => {
    if (o.isBone && SOURCE_TO_TARGET[o.name]) sourceBones[o.name] = o;
  });

  const desk = makeDeskSet(sourceScene);
  let mode = 'idle';
  let lastMode = '';
  let walkSeed = 0;

  const setMode = (next, targetName = null) => {
    if (!next) next = 'idle';
    if (next === lastMode && next !== 'walk') return;
    lastMode = next;
    mode = next;

    try {
      if (next === 'walk') {
        const a = (++walkSeed % 2) ? 1 : -1;
        sceneApi.stopSim?.();
        sceneApi.previewWalk?.({ x: a * 105, z: 95 }, false);
        return;
      }

      sceneApi.previewWalk?.({ x: shupi.model?.position?.x || 0, z: shupi.model?.position?.z || 0 }, false);
      sceneApi.stopSim?.();

      if (next === 'read') sceneApi.setSimActivity?.('read', targetName || 'DYVLINGE lounge chair');
      else if (next === 'water') sceneApi.setSimActivity?.('water', targetName || null);
      else if (next === 'work') sceneApi.setSimActivity?.('work', targetName || 'Standing desk');
      else if (next === 'coffee') sceneApi.setSimActivity?.('coffee', targetName || 'Standing desk');
      else if (next === 'sit') sceneApi.setSimActivity?.('read', targetName || 'Setu task chair');
      else if (next === 'think') {
        // Shujaat's idle simulation owns the exact thinking pose + synthetic cue.
        sceneApi.setSimActivity?.(null);
      } else {
        sceneApi.setSimActivity?.(null);
      }
    } catch (e) {
      console.warn('[Shujaat bridge] activity', next, e);
    }
  };

  const applyPose = (hero, amount = 1) => {
    if (!sourceCharacter || !hero?.bones) return;
    const w = Math.max(0, Math.min(1, amount));

    for (const [srcName, targetName] of Object.entries(SOURCE_TO_TARGET)) {
      const src = sourceBones[srcName];
      const dst = hero.bones[targetName];
      if (!src || !dst) continue;

      // Same authoring FBX: local transforms are directly compatible.
      dst.quaternion.slerp(src.quaternion, w);
      if (targetName === 'pelvis') dst.position.lerp(src.position, w);
    }
    hero.group.updateMatrixWorld(true);
  };

  const resumeSound = () => {
    try {
      sceneApi.sound?.resume?.();
      sceneApi.sound?.setVisibility?.(1);
    } catch {}
  };

  const stop = () => {
    try {
      sceneApi.stopSim?.();
      sceneApi.setSimActivity?.(null);
    } catch {}
    lastMode = 'idle';
    mode = 'idle';
  };

  return {
    iframe,
    sceneApi,
    shupi,
    deskSet: desk.root,
    deskDisplay: desk.display,
    setMode,
    applyPose,
    resumeSound,
    stop,
    get mode() { return mode; },
  };
}

export function getShujaatRoomBridge() {
  if (!singleton) singleton = build();
  return singleton;
}
