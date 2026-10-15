/* Taille du bonsaï : à tour de rôle avec l'arrosage, le personnage taille le houppier avec de petits ciseaux japonais à bonsaï (bonsai-basami : lames fines et
 * croisées, poignée en boucle d'une seule pièce). La main droite va de touffe en touffe (cinématique inverse du bras), la gauche retient la branche, les lames
 * claquent et de minuscules feuilles tombent sur la vasque. Le bonsaï lui-même est le modèle « Bonsai_Tree » de Mermaid (CC BY 4.0). */
import * as THREE from 'three';

const STEEL = () => new THREE.MeshStandardMaterial({ color: '#c9ced4', metalness: 0.9, roughness: 0.28 });
const IRON = () => new THREE.MeshStandardMaterial({ color: '#2b2d31', metalness: 0.6, roughness: 0.5 });

/** Ciseaux de bonsaï ; l'origine est la poignée (la main), les lames pointent vers +x. Retourne le groupe et `setOpen(0..1)`. */
function makeShears() {
  const g = new THREE.Group(), steel = STEEL(), iron = IRON();
  const blades = [new THREE.Group(), new THREE.Group()];
  const pivot = new THREE.Group(); pivot.position.x = 0.052; g.add(pivot);
  blades.forEach((b, i) => {
    const s = i ? -1 : 1;
    // lame : fine, légèrement courbe, pointue ; elle croise l'autre au pivot
    const shape = new THREE.Shape(); shape.moveTo(-0.004, 0); shape.lineTo(0.082, s * 0.0025); shape.lineTo(0.092, s * 0.0008); shape.lineTo(0.082, -s * 0.0022); shape.lineTo(-0.004, -s * 0.006); shape.closePath();
    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.0035, bevelEnabled: false }), steel); blade.position.z = i ? -0.0035 : 0; b.add(blade);
    // branche de poignée : tige qui revient vers l'arrière, de l'autre côté du pivot
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.07, 6), iron); arm.rotation.z = Math.PI / 2; arm.position.set(-0.04, -s * 0.0, i ? -0.0035 : 0.0035); b.add(arm);
    pivot.add(b);
  });
  // poignée en U (ressort) : demi-anneau qui relie les deux branches à l'arrière
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0038, 6, 18, Math.PI * 1.25), iron); bow.rotation.z = Math.PI * 0.5 + Math.PI * 0.375; bow.position.set(-0.11 + 0.052 * 0, 0, 0); g.add(bow);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), steel)).position.copy(pivot.position);       // vis du pivot
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.noInk = true; } });
  const setOpen = (k) => { blades[0].rotation.z = 0.02 + k * 0.34; blades[1].rotation.z = -0.02 - k * 0.34; };
  setOpen(0.3);
  return { group: g, setOpen };
}

export function createBonsaiCare({ world, hero, bonsai }) {
  const sh = makeShears(); sh.group.scale.setScalar(2.1); sh.group.visible = false; sh.group.userData.dynamic = true; world.add(sh.group);
  // minuscules feuilles coupées : anneau de 28 particules
  const N = 28, leafGeo = new THREE.PlaneGeometry(0.014, 0.008), leafMat = new THREE.MeshStandardMaterial({ color: '#7fae5c', roughness: 0.9, side: THREE.DoubleSide });
  const bits = new THREE.InstancedMesh(leafGeo, leafMat, N); bits.frustumCulled = false; bits.userData.dynamic = true; bits.userData.noInk = true; world.add(bits);
  const life = new Float32Array(N).fill(-1), pos = Array.from({ length: N }, () => new THREE.Vector3()), vel = Array.from({ length: N }, () => new THREE.Vector3()), spin = new Float32Array(N);
  const d = new THREE.Object3D(); let next = 0;
  const spawn = (p, n = 3) => { for (let k = 0; k < n; k++) { const i = next++ % N; life[i] = 0; pos[i].copy(p); vel[i].set((Math.random() - 0.5) * 0.06, 0.02 + Math.random() * 0.03, (Math.random() - 0.5) * 0.06); spin[i] = (Math.random() - 0.5) * 12; } };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const stand = new THREE.Vector3();                                              // où le personnage se tient pour tailler (plus près que pour arroser)
  let active = false, clumps = [], hand = new THREE.Vector3(), off = new THREE.Vector3(), idx = 0, phase = 0, snips = 0, tt = 0, open = 0, started = false;

  /** centres des touffes de feuilles, en repère local du bonsaï (une fois) : les maillages à matériau transparent du modèle */
  function findClumps() {
    clumps = []; bonsai.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(bonsai.matrixWorld).invert(), box = new THREE.Box3(), bb = new THREE.Box3().setFromObject(bonsai, true);
    bonsai.traverse((o) => {
      if (!o.isMesh || o.userData.isInk || !o.material || !(o.material.alphaTest > 0 || o.material.transparent)) return;
      box.setFromObject(o, true); const c = box.getCenter(new THREE.Vector3()).applyMatrix4(inv);
      if (c.y > (bb.max.y - bb.min.y) * 0.4) clumps.push(c);
    });
    if (!clumps.length) clumps.push(new THREE.Vector3(0, (bb.max.y - bb.min.y) * 0.7, 0));
  }

  /** appelée par le personnage après l'animation de base, à chaque image : place les bras */
  const post = (dt, t) => {
    if (!active || !hero.bones.hand_r) return;
    const b = hero.bones, here = hero.group.getWorldPosition(_a);
    tt += dt; phase += dt;
    const CYCLE = 2.3;                                                              // une touffe : approche (0,6 s), quatre coups de ciseaux
    if (phase > CYCLE) { phase = 0; snips = 0; idx = (idx + 1 + ((Math.random() * 2) | 0)) % clumps.length; }
    const c = _b.copy(clumps[idx]); bonsai.localToWorld(c);
    _c.subVectors(here, c); _c.y = 0; if (_c.lengthSq() < 1e-4) _c.set(1, 0, 0); _c.normalize();
    const side = _d.set(-_c.z, 0, _c.x);                                          // vers la gauche du personnage
    const goal = c.clone().addScaledVector(_c, 0.035).addScaledVector(side, -0.02);
    hand.lerp(goal, 1 - Math.exp(-dt * (started ? 8 : 3))); if (!started) { hand.copy(goal).y += 0.15; started = true; }
    // coups de ciseaux : une salve de quatre à partir de 0,7 s
    const cutting = phase > 0.7 && phase < 1.9;
    open = cutting ? 0.5 + 0.5 * Math.sin((phase - 0.7) * 26) : 0.35;
    if (cutting) { const n = Math.floor((phase - 0.7) * 26 / Math.PI + 0.5); if (n > snips) { snips = n; spawn(c, 2 + ((Math.random() * 3) | 0)); } }
    sh.setOpen(open);
    const elbow = b.lowerarm_r.getWorldPosition(_c.clone()), pole = elbow.clone().addScaledVector(side, -0.12); pole.y += 0.05;
    hero.ik2(b.upperarm_r, b.lowerarm_r, b.hand_r, hand, pole);
    // main gauche : elle retient la branche, un peu en dessous et de l'autre côté
    if (b.hand_l && b.upperarm_l && b.lowerarm_l) {
      const lg = c.clone().addScaledVector(_c, 0.04).addScaledVector(side, 0.075); lg.y -= 0.05;
      const el = b.lowerarm_l.getWorldPosition(new THREE.Vector3()), pl = el.clone().addScaledVector(side, 0.12); pl.y += 0.04;
      hero.ik2(b.upperarm_l, b.lowerarm_l, b.hand_l, lg, pl);
    }
    hero.group.updateMatrixWorld(true);
    // ciseaux dans la main droite, lames vers la touffe
    b.hand_r.getWorldPosition(_a);
    _d.subVectors(c, _a).normalize();                                             // direction de la touffe
    _m.lookAt(_a, c, new THREE.Vector3(0, 1, 0)); _q.setFromRotationMatrix(_m);
    sh.group.quaternion.copy(_q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));   // lames vers l'avant
    sh.group.position.copy(_a).addScaledVector(_d, 0.035); void t;
  };

  return {
    start() {
      const bw = bonsai.getWorldPosition(new THREE.Vector3()), hp = hero.group.position;
      stand.set(hp.x - bw.x, 0, hp.z - bw.z); stand.setLength(0.4).add(bw); stand.y = hp.y;
      findClumps(); active = true; started = false; phase = 0.2; snips = 0; tt = 0; idx = Math.floor(Math.random() * clumps.length); sh.group.visible = true; hero.setPost(post); },
    stop() { active = false; sh.group.visible = false; hero.setPost(null); },
    get active() { return active; },
    update(dt) {
      if (active) { const hp = hero.group.position, k = 1 - Math.exp(-dt * 2.2); hp.x += (stand.x - hp.x) * k; hp.z += (stand.z - hp.z) * k; }
      let any = false; const floorY = bonsai.getWorldPosition(_a).y + 0.1;
      for (let i = 0; i < N; i++) {
        if (life[i] < 0) { d.scale.setScalar(0); d.updateMatrix(); bits.setMatrixAt(i, d.matrix); continue; }
        any = true; life[i] += dt; vel[i].y -= 0.45 * dt; pos[i].addScaledVector(vel[i], dt);
        if (pos[i].y < floorY || life[i] > 2.2) { life[i] = -1; continue; }
        d.position.copy(pos[i]); d.rotation.set(life[i] * spin[i], life[i] * spin[i] * 0.7, 0); d.scale.setScalar(1); d.updateMatrix(); bits.setMatrixAt(i, d.matrix);
      }
      bits.instanceMatrix.needsUpdate = true; bits.visible = any || active;
    },
  };
}
