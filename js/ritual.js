import { THREE } from './kit.js?v=18942b7';

/* Séquence de dégustation de l'invité (matcha, école Urasenke), en repère « invité »
 * (origine = surface du zabuton, +z vers l'hôte, y = 0 sur le zabuton ; le tatami est donc à y = −0,07).
 *  1. salut (rei) mains posées devant les genoux, 2. wagashi mangé avant le thé, 3. petit salut « osaki ni » et prise du chawan
 *  (main droite puis paume gauche dessous), 4. deux quarts de tour dans le sens horaire pour ne pas boire sur la face décorée,
 *  5. trois gorgées, la dernière avec le bruit d'aspiration, 6. essuyage du bord au pouce et à l'index, 7. deux quarts de tour
 *  inverses, 8. le bol reposé sur le tatami, face vers l'invité, 9. salut final. */

const MAT_Y = -0.07;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ss = (u) => u * u * (3 - 2 * u);

/** interpolation par segments : keys = [[t, valeur], …], valeur = nombre ou tableau */
function K(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i], u = ss((t - t0) / (t1 - t0));
      return Array.isArray(a) ? a.map((v, j) => v + (b[j] - v) * u) : a + (b - a) * u;
    }
  }
  return keys[keys.length - 1][1];
}

export function createRitual({ hero, tea, charOrigin }) {
  const { bones, group, aim, ik2, rotChar } = hero;
  const bowl = tea.userData.bowl, sweets = tea.userData.sweets;
  const sweet = sweets.userData.sweet;
  // pivot du bol : inclinaison dans le repère monde, rotation propre à l'intérieur
  const pivot = new THREE.Group(); tea.add(pivot); pivot.position.copy(bowl.position); pivot.add(bowl); bowl.position.set(0, 0, 0);
  const teaMesh = bowl.userData.tea;
  const sweetHome = sweet.position.clone(); const sweetParent = sweet.parent;

  const rest = { t: 0, active: false, done: false, mouthT: 0 };
  const T_END = 21.0;

  // buts (repère invité)
  const LAP_L = [0.15, 0.17, 0.12], LAP_R = [-0.15, 0.17, 0.12];
  const MAT_L = [0.1, MAT_Y + 0.05, 0.36], MAT_R = [-0.1, MAT_Y + 0.05, 0.36];
  const BOWL_REST = [0, MAT_Y + 0.0, 0.42];
  const CHEST = [0, 0.44, 0.3], MOUTH = [0, 0.64, 0.2];
  const SWEET = [-0.23, MAT_Y + 0.045, 0.34];

  // trajectoires
  const lean = (t) => K(t, [[0, 0], [0.9, 0], [1.9, 0.55], [2.7, 0.55], [3.6, 0], [7.8, 0], [8.4, 0.3], [9.0, 0.08], [16.4, 0.08], [17.2, 0.5], [18.0, 0.5], [18.8, 0.02], [T_END, 0]]);
  const head = (t) => K(t, [[0, 0], [5.0, 0], [5.6, -0.1], [7.0, -0.05], [11.2, 0], [11.8, 0.18], [13.6, 0.3], [14.6, 0.02], [T_END, 0]]);
  const bowlPos = (t) => K(t, [[0, BOWL_REST], [8.9, BOWL_REST], [9.7, CHEST], [10.7, CHEST], [11.6, MOUTH], [14.2, MOUTH], [14.8, CHEST], [16.1, CHEST], [16.9, BOWL_REST], [T_END, BOWL_REST]]);
  const bowlYaw = (t) => K(t, [[0, 0], [10.0, 0], [10.55, -Math.PI / 2], [11.1, -Math.PI], [14.9, -Math.PI], [15.5, -Math.PI * 1.5], [16.0, -Math.PI * 2], [T_END, -Math.PI * 2]]);
  const bowlTilt = (t) => K(t, [[0, 0], [11.7, 0], [12.2, 0.42], [12.55, 0.05], [12.9, 0.55], [13.25, 0.05], [13.65, 0.95], [14.1, 0.9], [14.4, 0], [T_END, 0]]);
  const holdW = (t) => K(t, [[0, 0], [8.6, 0], [9.4, 1], [16.5, 1], [17.1, 0], [T_END, 0]]);        // les deux mains sur le bol
  const lapW = (t) => K(t, [[0, 1], [1.0, 1], [1.7, 0], [3.0, 0], [3.8, 1], [4.2, 1], [4.6, 0], [7.6, 0], [8.2, 1], [8.4, 0.0], [16.9, 0], [17.3, 0], [18.9, 1], [T_END, 1]]);

  const arms = (t) => {
    // main gauche (char +x) et droite (char −x)
    let L = LAP_L, R = LAP_R;
    const bow = K(t, [[0, 0], [1.0, 0], [1.9, 1], [2.7, 1], [3.5, 0], [17.1, 0], [17.9, 1], [18.5, 1], [19.3, 0], [T_END, 0]]);
    const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
    L = lerp3(L, MAT_L, bow); R = lerp3(R, MAT_R, bow);
    // wagashi : la main droite va chercher la pique, monte à la bouche, redescend
    const reach = K(t, [[0, 0], [4.0, 0], [4.8, 1], [5.2, 1], [6.1, 2], [7.0, 2], [7.7, 0], [T_END, 0]]);
    if (reach > 0) {
      const mouthHand = [-0.02, 0.62, 0.2];
      const tgt = reach <= 1 ? lerp3(R, SWEET, reach) : lerp3(SWEET, mouthHand, reach - 1);
      if (reach <= 1) R = tgt; else R = reach < 2 ? tgt : mouthHand;
    }
    // le bol
    const hw = holdW(t);
    if (hw > 0) {
      const c = bowlPos(t), yaw = bowlYaw(t), tilt = bowlTilt(t);
      const rp = [c[0] - 0.078 * Math.cos(yaw * 0), c[1] + 0.02 + tilt * 0.01, c[2] - 0.0];
      const lp = [c[0] + 0.045, c[1] - 0.055, c[2] + 0.0];
      const wipe = K(t, [[0, 0], [14.9, 0], [15.1, 1], [15.5, 0], [T_END, 0]]);
      if (wipe > 0) { rp[1] += 0.045 * wipe; rp[2] -= 0.02 * wipe; }
      R = lerp3(R, rp, hw); L = lerp3(L, lp, hw);
    }
    return { L, R };
  };

  const _w = new THREE.Vector3(), _hip = new THREE.Vector3(), _k = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const toW = (a) => group.localToWorld(_w.set(a[0], a[1], a[2]).clone());
  const toL = (v) => group.worldToLocal(v.clone());

  function pose(t) {
    hero.skeleton.pose(); group.updateMatrixWorld(true);
    // bassin posé sur les talons
    const P = group.localToWorld(V(0, 0.12, -0.05));
    bones.pelvis.position.copy(bones.pelvis.parent.worldToLocal(P)); group.updateMatrixWorld(true);
    for (const s of ['l', 'r']) {
      const sg = s === 'l' ? 1 : -1;
      bones['thigh_' + s].getWorldPosition(_hip); const h = toL(_hip);
      const K0 = h.clone().add(V(-sg * 0.045, -0.1, 0.2).normalize().multiplyScalar(0.21));
      aim(bones['thigh_' + s], group.localToWorld(K0.clone())); group.updateMatrixWorld(true);
      const A = K0.clone().add(V(-sg * 0.015, -0.025, -0.215));
      aim(bones['calf_' + s], group.localToWorld(A.clone())); group.updateMatrixWorld(true);
      aim(bones['foot_' + s], group.localToWorld(A.clone().add(V(0, -0.035, -0.13)))); group.updateMatrixWorld(true);
    }
    // buste et tête
    const ln = lean(t);
    for (const n of ['spine_01', 'spine_02', 'spine_03']) rotChar(bones[n], ln / 3);
    rotChar(bones.Head, head(t) - ln * 0.0);
    // bras par IK
    const { L, R } = arms(t);
    for (const [s, tg] of [['l', L], ['r', R]]) {
      const sg = s === 'l' ? 1 : -1;
      const up = bones['upperarm_' + s], sh = up.getWorldPosition(new THREE.Vector3());
      const goal = group.localToWorld(V(tg[0], tg[1], tg[2]));
      const dir = goal.clone().sub(sh).normalize();
      goal.addScaledVector(dir, -0.065);                                     // le poing dépasse du poignet
      const pole = group.localToWorld(toL(sh).add(V(sg * 0.3, -0.3, -0.25)));
      ik2(up, bones['lowerarm_' + s], bones['hand_' + s], goal, pole);
    }
  }

  function applyObjects(t) {
    const c = bowlPos(t), yaw = bowlYaw(t), tilt = bowlTilt(t);
    pivot.position.set(c[0], c[1] + 0.125 + 0.0, c[2]);
    pivot.rotation.set(-tilt, 0, 0);
    bowl.rotation.y = yaw;
    // thé : le niveau baisse à chaque gorgée, disparaît au dernier
    const drunk = K(t, [[0, 0], [12.2, 0], [12.55, 0.28], [13.25, 0.6], [14.1, 1], [T_END, 1]]);
    teaMesh.visible = drunk < 0.98; teaMesh.position.y = 0.05 - 0.028 * drunk;
    // wagashi : suit la main puis disparaît (mangé)
    const reach = K(t, [[0, 0], [4.0, 0], [4.8, 1], [5.2, 1], [6.1, 2], [T_END, 2]]);
    if (reach >= 1 && reach < 2.0 && t < 6.6) { const { R } = arms(t); sweet.removeFromParent(); tea.add(sweet); sweet.position.set(R[0] + 0.0, R[1] + 0.125 + 0.015, R[2] + 0.06); }
    else if (t >= 6.6) sweet.visible = false;
    else { if (sweet.parent !== sweetParent) { sweet.removeFromParent(); sweetParent.add(sweet); sweet.position.copy(sweetHome); } sweet.visible = true; }
    // visage
    let f = 'neutral';
    if (t > 5.9 && t < 7.4) f = Math.sin(t * 13) > 0 ? 'talkA' : 'talkO';
    if (t > 11.7 && t < 14.3) f = 'sip';
    if (t > 14.3 && t < 15) f = 'happy';
    if (t > 19.5) f = 'happy';
    hero.setBase(f);
  }

  const api = {
    object: pivot, state: rest, duration: T_END,
    start() {
      rest.t = 0; rest.active = true; rest.done = false;
      teaMesh.visible = true; teaMesh.position.y = 0.05; sweet.visible = true;
      hero.stop(); hero.setShoes(false);
      hero.setPost((dt) => { pose(rest.t); });
      applyObjects(0);
    },
    seek(tt) { rest.t = tt; applyObjects(tt); },
    update(dt) {
      if (!rest.active) return;
      rest.t = Math.min(T_END, rest.t + dt);
      applyObjects(rest.t);
      if (rest.t >= T_END && !rest.done) { rest.done = true; }
    },
    stop() { rest.active = false; hero.setPost(null); hero.setShoes(true); pivot.position.set(BOWL_REST[0], BOWL_REST[1] + 0.125, BOWL_REST[2]); pivot.rotation.set(0, 0, 0); bowl.rotation.y = 0; teaMesh.visible = true; teaMesh.position.y = 0.05; sweet.visible = true; if (sweet.parent !== sweetParent) { sweet.removeFromParent(); sweetParent.add(sweet); sweet.position.copy(sweetHome); } },
    reset() { api.stop(); },
  };
  return api;
}
