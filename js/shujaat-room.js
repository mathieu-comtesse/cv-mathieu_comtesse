import { THREE } from './kit.js?v=shujaat-room-v2';
import { cloneShujaatObject } from './shujaat-geometry.js?v=render-recovery-v10';

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

function makeDeskSet(scene, pieces) {
  const find = (name) => pieces?.find((object) => object.name === name) || scene.getObjectByName(name);
  scene.updateMatrixWorld(true);
  const desk = find('Standing desk');
  if (!desk) throw new Error('Standing desk introuvable');

  const anchor = desk.matrixWorld.clone();
  const inv = anchor.clone().invert();
  const root = new THREE.Group();
  root.name = 'ShujaatExactDeskSet';

  let deskClone = null;
  for (const name of DESK_OBJECTS) {
    const src = find(name);
    if (!src) continue;
    src.updateMatrixWorld(true);

    const clone = cloneShujaatObject(src);
    // The reference desk owns its task chair as a child. The local room
    // already has the requested Herman Miller Setu, so do not duplicate it.
    clone.getObjectByName('Setu task chair')?.removeFromParent();
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

  const setSize = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  if (![setSize.x, setSize.y, setSize.z].every((value) => Number.isFinite(value) && value <= 4)) {
    throw new Error('Bureau Shujaat hors échelle : conservation du bureau local');
  }

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
  const sourceFeatures = await sceneApi.ready;
  sceneApi.setRoom(true);
  sceneApi.stopSim?.();
  // Offscreen iframe frames are throttled. Finish the source's entrance before
  // copying so early pieces at scale 0.001 do not magnify later desk objects.
  sceneApi.furniture?.group.userData.entrance?.dispose();
  const shupi = sceneApi.shupi;
  const sourceScene = shupi.scene;
  const pieces = sceneApi.furniture?.pieces;
  // The scene API exists before all GLTF placeholders contain their meshes.
  // Wait for the complete desk instead of permanently cloning empty groups.
  await waitFor(() => DESK_OBJECTS.every((name) => {
    let ready = false;
    (pieces?.find((object) => object.name === name) || sourceScene.getObjectByName(name))?.traverse((object) => {
      if (object.isMesh && object.geometry?.attributes.position?.count) ready = true;
    });
    return ready;
  }));
  // The source also animates its furniture entrance. Cloning during that
  // animation can normalize an almost-zero desk width into an enormous set.
  let deskSignature = '', stableSince = performance.now();
  await waitFor(() => {
    sourceScene.updateMatrixWorld(true);
    const objects = DESK_OBJECTS.map((name) => pieces?.find((object) => object.name === name) || sourceScene.getObjectByName(name));
    const bounds = new THREE.Box3().setFromObject(objects[0]);
    const signature = [...bounds.min.toArray(), ...bounds.max.toArray(),
      ...objects.flatMap((object) => [...object.matrixWorld.elements])]
      .map((v) => v.toFixed(4)).join(',');
    if (signature !== deskSignature) {
      deskSignature = signature;
      stableSince = performance.now();
      return false;
    }
    return performance.now() - stableSince > 500;
  });
  const sourceCharacter = shupi.character || shupi.model;

  const sourceBones = {};
  sourceCharacter?.traverse?.((o) => {
    // FBX loader keeps a transform bone and an identity skin child with the
    // same name. The first one is the animated transform used by the source.
    if (o.isBone && SOURCE_TO_TARGET[o.name] && !sourceBones[o.name]) sourceBones[o.name] = o;
  });

  const desk = makeDeskSet(sourceScene, pieces);

  const makeProp = (name) => {
    const src = sourceScene.getObjectByName(name);
    if (!src) return null;
    const clone = cloneShujaatObject(src);
    clone.name = 'ShujaatExact:' + name;
    clone.visible = false;
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    return clone;
  };

  const book = makeProp('iso:book');
  const wateringCan = makeProp('iso:can');
  const effects = new THREE.Group();
  effects.name = 'ShujaatMotionEffects';
  effects.userData.dynamic = true;
  const effectPairs = ['iso:dust', 'iso:star', 'iso:water', 'Room atmosphere particles']
    .map(name => sourceScene.getObjectByName(name)).filter(Boolean)
    .map(source => { const clone = cloneShujaatObject(source); effects.add(clone); return {source, clone}; });
  const syncChildren = (source, clone) => {
    while (clone.children.length < source.children.length) clone.add(cloneShujaatObject(source.children[clone.children.length]));
    clone.visible = source.visible;
    clone.position.copy(source.position); clone.quaternion.copy(source.quaternion); clone.scale.copy(source.scale);
    if (source.isInstancedMesh) {
      clone.instanceMatrix.array.set(source.instanceMatrix.array); clone.instanceMatrix.needsUpdate = true;
      clone.count = source.count;
    }
    for (let i=0;i<Math.min(source.children.length,clone.children.length);i++) syncChildren(source.children[i],clone.children[i]);
  };
  const syncEffects = (hero) => {
    hero.model.updateMatrixWorld(true);
    const map = hero.model.matrixWorld.clone().multiply(sourceCharacter.matrixWorld.clone().invert());
    effects.parent?.updateMatrixWorld(true);
    const parentInv = effects.parent?.matrixWorld.clone().invert() || new THREE.Matrix4();
    for (const {source,clone} of effectPairs) {
      syncChildren(source,clone);
      parentInv.clone().multiply(map).multiply(source.matrixWorld).decompose(clone.position,clone.quaternion,clone.scale);
    }
  };

  const syncProp = (clone, sourceName, targetRoot) => {
    if (!clone || !targetRoot) return false;
    const src = sourceScene.getObjectByName(sourceName);
    if (!src || !src.visible) {
      clone.visible = false;
      return false;
    }

    sourceScene.updateMatrixWorld(true);
    syncChildren(src, clone);
    sourceCharacter.updateMatrixWorld(true);
    targetRoot.updateMatrixWorld(true);

    const rel = sourceCharacter.matrixWorld.clone().invert().multiply(src.matrixWorld);
    const targetWorld = targetRoot.matrixWorld.clone().multiply(rel);
    const parentInv = clone.parent
      ? clone.parent.matrixWorld.clone().invert()
      : new THREE.Matrix4();

    const local = parentInv.multiply(targetWorld);
    local.decompose(clone.position, clone.quaternion, clone.scale);
    clone.visible = true;
    return true;
  };

  let mode = 'idle';
  let lastMode = '';
  let walkSeed = 0;
  let modeFacing = 0;

  const setMode = (next, targetName = null) => {
    if (!next) next = 'idle';
    if (next === lastMode && next !== 'walk') return;
    lastMode = next;
    mode = next;

    try {
      // L'API sonore exacte de Shujaat expose wake(), pas resume().
      sceneApi.sound?.wake?.();
      if (next === 'jump') {
        sceneApi.stopSim?.();
        sourceFeatures.ragdoll?.grab();
        sceneApi.sound?.play('sim-jump');
        sceneApi.sound?.loop('scratch');
        return;
      }
      if (sourceFeatures.ragdoll?.active) {
        sourceFeatures.ragdoll.release();
        sceneApi.sound?.release('scratch');
        sourceFeatures.flourish?.land(shupi.model.position, 0.8);
        sceneApi.sound?.play('sim-land');
      }
      if (next === 'walk' || next === 'run') {
        const a = (++walkSeed % 2) ? 1 : -1;
        sceneApi.stopSim?.();
        sceneApi.previewWalk?.({ x: a * 105, z: 95 }, next === 'run');
        return;
      }

      sceneApi.previewWalk?.({ x: shupi.model?.position?.x || 0, z: shupi.model?.position?.z || 0 }, false);
      sceneApi.stopSim?.();

      // Navigation is already performed by the apartment director. Start the
      // source at its station entry so it runs the real alignment/hop/sitting
      // transition, rather than walking across a second invisible room first.
      const activity = next === 'sit' ? 'read' : next;
      const station = sceneApi.simStations.find(s => s.kind === activity && (!targetName || s.piece?.name === targetName))
        || sceneApi.simStations.find(s => s.kind === activity);
      if (station && (station.entry || station.at)) {
        shupi.model.position.copy(station.entry || station.at);
        shupi.model.rotation.y = station.facing;
        modeFacing = station.facing;
      }

      if (next === 'read') sceneApi.setSimActivity?.('read', targetName || 'DYVLINGE lounge chair');
      else if (next === 'water') sceneApi.setSimActivity?.('water', targetName || null);
      else if (next === 'work') sceneApi.setSimActivity?.('work', targetName || 'Standing desk');
      else if (next === 'coffee') sceneApi.setSimActivity?.('coffee', targetName || 'Standing desk');
      else if (next === 'sit') sceneApi.setSimActivity?.('read', targetName || 'Setu task chair');
      else if (next === 'think') {
        // Shujaat's idle simulation owns the exact thinking pose + synthetic cue.
        sceneApi.stopSim?.();
      } else {
        sceneApi.stopSim?.();
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
    dst.position.lerp(src.position, w);
    }
    hero.group.updateMatrixWorld(true);
  };

  const resumeSound = () => {
    try {
      sceneApi.sound?.wake?.();
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

  // Run the source mixer and procedural frame callbacks on the room clock.
  // An offscreen iframe's own animation frames are otherwise throttled.
  shupi._running = false;
  const update = (dt) => {
    shupi.mixer?.update(dt);
    shupi._emit('frame', dt);
    sourceScene.updateMatrixWorld(true);
  };
  return {
    iframe,
    sceneApi,
    shupi,
    sourceFeatures,
    update,
    deskSet: desk.root,
    deskDisplay: desk.display,
    book,
    wateringCan,
    effects,
    syncEffects,
    syncBook: (targetRoot) => syncProp(book, 'iso:book', targetRoot.model || targetRoot),
    syncWateringCan: (targetRoot) => syncProp(wateringCan, 'iso:can', targetRoot.model || targetRoot),
    setMode,
    applyPose,
    resumeSound,
    stop,
    get mode() { return mode; },
    get seatYawOffset() { return mode === 'work' ? shupi.model.rotation.y - modeFacing : 0; },
  };
}

export function getShujaatRoomBridge() {
  if (!singleton) singleton = build();
  return singleton;
}
