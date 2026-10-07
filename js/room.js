import { THREE, group, mat, inkify, ink, contactShadow, tube, box, mergeStatic } from './kit.js?v=bf01a16';
import * as F from './furniture.js?v=bf01a16';
import { createCharacter } from './character.js?v=shoe-forward-v6';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { loadBuffer } from './kit.js?v=bf01a16';
import { teaSet, shoePair, updateSteam } from './tea.js?v=bf01a16';
import { createRitual } from './ritual.js?v=bf01a16';
import { createChashitsu } from './chashitsu.js?v=bf01a16';
import { createRetroSet } from './retro.js?v=stable-3d-v5';
import { createNav } from './nav.js?v=bf01a16';
import { createDirector } from './director.js?v=bf01a16';
import { createThought } from './thought.js?v=bf01a16';
import { createWeather } from './weather.js?v=bf01a16';
import { createJukebox } from './jukebox.js?v=bf01a16';
import { TRACKS, COVER } from './music.js?v=bf01a16';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

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
  const [rugTex, paintTex, coverTex, ekGltf, setuGltf, sofaGltf, jblGltf, falkGltf, borneGltf, akariGltf] = await Promise.all([load('assets/tapis.webp?v=bf01a16'), load('assets/tableau.jpg?v=bf01a16'), load(COVER.file), loadBuffer('assets/ekstrem.glb?v=bf01a16').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/setu.glb?v=bf01a16').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/ds450.glb?v=bf01a16').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/jbl.glb?v=bf01a16').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/falkland.glb?v=bf01a16').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/borne-beton.glb?v=bf01a16').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej))), loadBuffer('assets/akari.glb?v=bf01a16').then((b) => new Promise((res, rej) => new GLTFLoader().parse(b, '', res, rej)))]);

  // MODE STABLE : la scène locale ne dépend plus du mini-runtime Shujaat au démarrage.
  // Cela garantit que le décor Three.js s'affiche immédiatement.
  const shujaatBridge = null;

  /* ─── mobilier ─── */
  const world = group(); scene.add(world);
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

  // Bureau Shujaat exact : les objets viennent directement du runtime local Shujaat.
  // Fallback procédural uniquement si le mini-runtime n'a pas pu se charger.
  const deskSet = group();
  deskSet.userData.dynamic = true;

  let uw;
  const brontes = F.brontes();

  if (shujaatBridge?.deskSet) {
    deskSet.add(shujaatBridge.deskSet);
    uw = shujaatBridge.deskDisplay || shujaatBridge.deskSet.getObjectByName('Apple Studio Display');
    if (uw) {
      uw.userData.id = 'pc';
      uw.traverse?.((o) => { if (o.isMesh) o.userData.id = 'pc'; });
    }

    // Le lampadaire déjà présent dans le CV est conservé, sans modifier le set Shujaat.
    add('brontes', brontes, -0.8, -0.22, 0.4, 0.74, 0, deskSet);

    if (shujaatBridge.book) {
      shujaatBridge.book.userData.dynamic = true;
      world.add(shujaatBridge.book);
    }
    if (shujaatBridge.wateringCan) {
      shujaatBridge.wateringCan.userData.dynamic = true;
      world.add(shujaatBridge.wateringCan);
    }
  } else {
    deskSet.add(F.desk());
    uw = F.ultrawide(); uw.position.set(-0.2, 0.74, -0.2); uw.userData.id = 'pc'; deskSet.add(uw);
    const pm = F.portraitMonitor(); pm.position.set(0.52, 0.74, -0.18); pm.rotation.y = -0.22; pm.userData.id = 'pc'; deskSet.add(pm);
    const kb = F.moonlander(); kb.position.set(-0.12, 0.74, 0.2); deskSet.add(kb);
    const mouse = F.verticalMouse(); mouse.position.set(0.3, 0.74, 0.24); mouse.rotation.y = 0.1; deskSet.add(mouse);
    add('brontes', brontes, -0.8, -0.22, 0.4, 0.74, 0, deskSet);
    const tw = F.tower(); tw.position.set(0.8, 0.74, -0.08); tw.rotation.y = -0.12; deskSet.add(tw);

    const titanium = new THREE.MeshStandardMaterial({ color: '#b8b4b0', roughness: 0.34, metalness: 0.82 });
    const mug = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.049, 0.095, 28, 1, true), titanium); body.position.y = 0.056; mug.add(body);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.004, 28), titanium); bottom.position.y = 0.009; mug.add(bottom);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.0022, 6, 28), titanium); lip.rotation.x = Math.PI / 2; lip.position.y = 0.104; mug.add(lip);
    mug.position.set(0.56, 0.742, 0.23); deskSet.add(mug);

    inkify(deskSet, { skip: (o) => {
      for (let p = o; p; p = p.parent) if (p.userData && p.userData.id === 'brontes') return true;
      return false;
    } });
  }

  add('desk', deskSet, -3.1, 0.25, Math.PI / 2, 0, 0.12);
  mkLamp('brontes', brontes.userData.glow, new THREE.PointLight('#ffd9a0', 0, 3, 2), '#fff0d0', '#9a948a');

  const chair = F.officeChairFrom(setuGltf);
  add('chair', chair, -2.15, 0.3, -Math.PI / 2 + 0.15, 0, 0.2);

  const STOOL_X = 2.0, STOOL_Z = 4.55;           // tabouret à droite du canapé, portant le bonsaï
  const bonsai = F.bonsai(); inkify(bonsai, { skip: (o) => !['9b9a92'].includes(o.material.color.getHexString()) }); add('bonsai', bonsai, STOOL_X, STOOL_Z, 0.5, 0.372, 0.42);
  const sp1 = F.speakerFromGltf(jblGltf, 1.15), sp2 = F.speakerFromGltf(jblGltf, 1.15);
  const spPosts = [F.speakerPosts(sp1), F.speakerPosts(sp2)];
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
  add('speaker1', sp1, -2.6, -2.5, 0.35, 0, 0.5);

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
  const retro = createRetroSet();
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
  const usmBody = F.usm(); usmSet.add(usmBody);
  const crate = F.usmDrawer(usmBody.userData.drawerSpec, coverTex, TRACKS, COVER); usmSet.add(crate.root);
  const amp = F.amplifier(); amp.position.set(-0.37, 0.734, 0); usmSet.add(amp);
  const AMPH = 0.085;
  const tt = F.turntable(); inkify(tt, { skip: (o) => o.material.color.getHexString() !== '3f2d22' }); tt.position.set(-0.37, 0.734 + AMPH, 0); usmSet.add(tt);
  const rca = F.rcaCables(-0.37, -0.158, 0.734, 0.734 + 0.05); usmSet.add(rca);
  const cl = F.borneFromGltf(borneGltf); add('beton', cl, 0.44, 0.0, 0, 0.734, 0, usmSet);
  add('usm', usmSet, -0.7, -2.4, 0, 0, 0.45);
  mkLamp('beton', cl.userData.glow, new THREE.PointLight('#ffe9c4', 0, 2.5, 2), '#fff3d6', '#8a8780');

  const ARC_YAW = -2.36;                      // le bras du lampadaire s'incline vers le tapis
  const arc = F.arcLamp();
  add('arc', arc, 0.85, -2.15, ARC_YAW, 0, 0.6, world, 0);
  mkLamp('arc', arc.userData.glow, new THREE.PointLight('#ffe0a8', 0, 6, 2), '#ffe6b0', '#8a8272');

  if (paintTex) { const pt = add('painting', F.painting(paintTex), -0.7, -2.95, 0, 1.35, 0.7, world, 0); pt.scale.setScalar(1.3); }
  const dra = F.dracaena(); inkify(dra, { skip: (o) => o.material.color.getHexString() !== 'b3a893' }); add('dracaena', dra, 2.85, -2.45, 0.3, 0, 0.65);
  add('speaker2', sp2, 1.25, -2.5, -0.35, 0, 0.75);
  const ekBox = new THREE.Box3().setFromObject(ek.parent); // ligne de l'étagère = pied le plus extérieur de l'Ekstrem
  ek.parent.updateMatrixWorld(true);
  add('shelf1', F.shelf(), ekBox.max.x - 0.04, 1.8, Math.PI / 2, 0, 0.8);

  // câbles d'enceintes : de l'arrière de l'ampli (derrière le meuble vert) jusqu'aux bornes de chaque enceinte
  { world.updateMatrixWorld(true);
    const ampPost = F.ampPosts(amp); usmSet.updateMatrixWorld(true);
    const run = (aKey, spId, spk, sp) => {
      const holder = items.find((i) => i.id === spId).holder;
      ['black', 'red'].forEach((c, ci) => {
        const A = amp.localToWorld(ampPost[aKey + c].clone());
        const S = holder.localToWorld(sp[c].clone());
        const o = ci * 0.014, zz = -2.7 - o;
        const mid = (A.x + S.x) / 2;
        const pts = [[A.x, A.y, A.z], [A.x, A.y - 0.02, A.z - 0.08], [A.x, 0.45, zz], [A.x + (S.x - A.x) * 0.15, 0.01, zz - 0.03], [mid, 0.006, zz + 0.16 + o], [S.x + (A.x - S.x) * 0.1, 0.007, zz - 0.02], [S.x, S.y * 0.3, S.z - 0.05], [S.x, S.y, S.z]];
        const t = tube(pts, 0.0045, new THREE.MeshStandardMaterial({ color: c === 'red' ? '#b32525' : '#18181a', roughness: 0.5 }), { segs: 90, radial: 5 });
        add('wire' + spId + c, t, 0, 0, 0, 0, 0.8, world, 0);
      });
    };
    run('L', 'speaker1', null, spPosts[0]); run('R', 'speaker2', null, spPosts[1]); }
  // positions des sources lumineuses (repère monde)
  const yawed = (v, yaw, ox, oz) => { v = v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); return [ox + v.x, v.y, oz + v.z]; };
  lamps.arc.light.position.set(...yawed(new THREE.Vector3(1.38, 2.05, 0), ARC_YAW, 0.85, -2.15));
  lamps.beton.light.position.set(-0.3, 1.0, -2.3);
  lamps.brontes.light.position.set(...yawed(new THREE.Vector3(-0.8, 1.15, -0.22), Math.PI / 2, -3.1, 0.25));
  for (const L of Object.values(lamps)) world.add(L.light);

  /* ─── personnage ─── */
  /* ─── performances : fusion des maillages statiques (≈ 1 500 maillages → quelques centaines d'appels de rendu) ─── */
  tt.userData.dynamic = true; crate.root.userData.dynamic = true; cs.group.userData.dynamic = true; tea.userData.dynamic = true;
  { world.updateMatrixWorld(true); let made = 0; for (const it of items) made += mergeStatic(it.obj); if (location.search.includes('perf')) console.log('fusion :', made, 'maillages'); }

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

  let scrollOff = 0, scrollT = 0;                                  // la caméra baisse quand l'en-tête défile (comme la scène de référence)
  function orient() {
    const r = 40, ev = view.el - scrollOff * 12 * DEG;
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
    const save = { az: view.az, el: view.el };
    const gp = cs.garden.parent; gp.remove(cs.garden);                  // le jardin n'a pas de bord : il ne compte pas dans le cadrage
    view.az = DEF.az; view.el = DEF.el; orient();
    items.forEach((i) => { i.obj.position.copy(i.base); });
    world.updateMatrixWorld(true);
    const room = new THREE.Box3(), bb = new THREE.Box3();
    for (const it of items) if (!TEAGROUP.has(it.id)) room.union(bb.setFromObject(it.holder));
    room.getCenter(target); tgt.copy(target); home.copy(target);
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
  }
  let resScale = 1;                                           // résolution adaptative : baisse si l'image met trop de temps, remonte si tout va bien
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
    // panoramique : la scène dépasse de l'écran sur téléphone (un doigt fait glisser) ; la caméra glisse seule vers la pièce du thé quand le personnage y est
    const lo = Math.min(0, csX - csHalf + wv * 0.35), hi = Math.max(0, tableX1 - wv * 0.35);
    panUser = Math.min(hi, Math.max(lo, panUser));
    const want = (view.zoom > 1.15 || view.tZoom > 1.15) ? 0 : followTea ? Math.min(0, csX) : panUser;
    panU += (want - panU) * 0.06;
    panV += ((followTea && view.zoom <= 1.15 ? -0.4 * h : 0) - panV) * 0.06;        // vers le jardin, la caméra descend aussi
    const cyShift = view.zoom > 1.15 ? 0 : roomCy, cxShift = view.zoom > 1.15 ? 0 : roomCx;
    const off = cyShift + h * 0.03 * Math.min(1, view.zoom);              // la pièce est centrée dans la section, très légèrement plus bas
    camera.left = -wv + panU + cxShift; camera.right = wv + panU + cxShift; camera.top = h + off + panV; camera.bottom = -h + off + panV;
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
  const el = renderer.domElement;
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
    pauseAutonomy();
    shujaatBridge?.resumeSound?.();
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      if (!appOpen && heroNear(e.clientX, e.clientY)) hdrag = { x: e.clientX, y: e.clientY, moved: 0, lifted: false };
      else drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
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
        if (pinch) view.tZoom = Math.min(2.6, Math.max(0.4, view.tZoom * (d / pinch)));
        pinch = d;
      } else if (hdrag) {
        hdrag.moved += Math.abs(dx) + Math.abs(dy);
        if (!hdrag.lifted && hdrag.moved > 8) { hdrag.lifted = true; director.lift(); showZones(true); el.style.cursor = 'grabbing'; }
        if (hdrag.lifted) { const g = groundAt(e.clientX, e.clientY); if (g) director.carry(g.x, g.z); zoneHover(e.clientX, e.clientY); }
      } else if (drag) {
        drag.moved += Math.abs(dx) + Math.abs(dy);
        if (drag.moved > 6 && W / H < 1.1) { panUser -= dx * (2 * (fit / view.zoom) * (W / H)) / W; }          // téléphone : un doigt fait défiler la scène
        else if (drag.moved > 6) {
          view.tAz -= dx * 0.006;
          view.tEl = Math.min(58 * DEG, Math.max(14 * DEG, view.tEl + dy * 0.004));
          el.style.cursor = 'grabbing';
        }
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
      if (id) activate(id); else if (crate.isOpen && !jukebox.isOn) openCrate(false);      // tiroir laissé ouvert tant que la musique joue
    }
    drag = null; el.style.cursor = hovered ? 'pointer' : 'grab';
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) { e.preventDefault(); panUser += e.deltaX * 0.01 * (fit / view.zoom); return; }   // geste horizontal du pavé tactile : panoramique
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return;     // la molette normale fait défiler la page
    e.preventDefault();
    view.tZoom = Math.min(2.6, Math.max(0.4, view.tZoom * Math.exp(-e.deltaY * 0.0015)));
  }, { passive: false });
  el.addEventListener('dblclick', () => { view.tAz = DEF.az; view.tEl = DEF.el; view.tZoom = 1; });
  el.style.cursor = 'grab';

  /* ─── navigation ─── */
  world.updateMatrixWorld(true);
  const nav = createNav({ x0: -8.4, x1: 5.4, z0: -3.8, z1: 12.8 });
  const footprint = (id, shrink = 0) => {
    const it = items.find((i) => i.id === id); if (!it) return;
    const bb = new THREE.Box3().setFromObject(it.holder);
    nav.block({ x0: bb.min.x + shrink, x1: bb.max.x - shrink, z0: bb.min.z + shrink, z1: bb.max.z - shrink });
  };
  ['desk', 'chair', 'usm', 'speaker1', 'speaker2', 'ekstrem', 'shelf1', 'sofa', 'stool', 'tv'].forEach((id) => footprint(id));
  nav.block({ x0: -3.85, x1: -2.35, z0: 2.5, z1: 4.0 });                        // pot et feuilles basses de l'alocasia
  nav.block({ x0: 2.45, x1: 3.25, z0: -2.85, z1: -2.05 });                      // pot du dragonnier
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
  const TVBOX = { obj: retro.group };
  let afterEnter = null, actSince = 0, actMode = '';
  const S = (o) => Object.assign({ face: 'neutral', y: 0 }, o);
  const stations = {
    desk:     S({ label: 'Travailler au bureau', clip: 'Sitting_Idle_Loop', shujaatMode: 'work', sourceTarget: 'Standing desk', pose: 'bureau', seatId: 'chair', hipClearance: 0.09, y: 0, face: 'neutral', pos: seat(-2.15, 0.3, deskYaw, -0.03), yaw: deskYaw, approach: [-2.05, 1.05], noFace: true, think: { obj: deskSet, tiltDeg: 24, scale: 1.05, yaw: -52 } }),
    ekstrem:  S({ label: 'Lire dans le fauteuil', clip: 'Sitting_Idle_Loop', shujaatMode: 'read', sourceTarget: 'DYVLINGE lounge chair', pose: 'fauteuil', seatId: 'ekstrem', hipClearance: 0.09, y: 0, face: 'happy', pos: seat(2.3, -0.95, ekYaw, -0.14), yaw: ekYaw, approach: [1.85, -0.05], noFace: true, think: { obj: ek, tiltDeg: 30 } }),
    usm:      S({ label: 'Écouter un vinyle', clip: 'Idle_Loop', face: 'happy', ov: { lean: 0.3, armR: -0.95, foreR: -0.35, armL: -0.2, head: 0.25 }, pos: [-1.0, 0, -1.7], yaw: Math.PI, music: true, think: { obj: tt, tiltDeg: 28, scale: 1.1 } }),
    alocasia: S({ label: 'Arroser l\u2019alocasia', clip: 'Idle_Loop', shujaatMode: 'water', sourceTarget: 'Chinese money plant', pose: 'arrose', maxMs: 12000, can: true, ov: can, pos: [-2.0, 0, 3.25], yaw: -1.57, think: { obj: alo, tiltDeg: 8, scale: 1.2 } }),
    bonsai:   S({ label: 'Arroser le bonsa\u00ef', clip: 'Idle_Loop', shujaatMode: 'water', sourceTarget: null, pose: 'arrose', maxMs: 12000, can: true, ov: can, pos: [2.85, 0, 4.55], yaw: -1.57, think: { obj: bonsai, tiltDeg: 20, scale: 1.0 } }),
    dracaena: S({ label: 'Arroser le dragonnier', clip: 'Idle_Loop', shujaatMode: 'water', sourceTarget: 'Snake plant', pose: 'arrose', maxMs: 12000, can: true, ov: can, pos: [2.2, 0, -1.95], yaw: 2.27, think: { obj: dra, tiltDeg: 8, scale: 1.2 } }),
    sofa:     S({ label: 'Jouer \u00e0 la console', clip: 'Sitting_Idle_Loop', pose: 'fauteuil', seatId: 'sofa', hipClearance: 0.09, y: 0, face: 'happy', pos: [0.35, 0, 4.42], yaw: Math.PI, approach: [0.35, 3.75], noFace: true, tv: true, think: TVBOX }),
    cha:      S({ label: 'C\u00e9r\u00e9monie du th\u00e9', ritual: true, maxMs: 34000, y: TEA.y + 0.125, pos: [TEA.x, 0, TEA.z], yaw: 0, approach: [CS.x, TEA.z], think: { obj: tea, tiltDeg: 32, scale: 1.0 } }),
  };
  for (const st of Object.values(stations)) if (!st.approach) st.approach = nav.nearest(st.pos[0], st.pos[2]);
  stations.chair = stations.desk; stations.stool = stations.bonsai; stations.shoes = stations.cha; stations.chashitsu = stations.cha;

  // Assise : hauteur du dessus de chaque siège = fraction de la hauteur du meuble, mesurée sous Blender (bpy) sur les modèles d'origine
  // (lancers de rayons verticaux sur une grille 14 × 14, médiane des surfaces d'assise) : canapé 0,405 · siège de bureau 0,53 · Ekstrem 0,50.
  // Le bassin se pose à 0,09 m au-dessus : c'est l'écart mesuré entre l'os du bassin et le point le plus bas des fesses dans la pose assise.
  const SEAT_FRAC = { sofa: 0.405, chair: 0.53, ekstrem: 0.5 };
  const SEAT_HIP = 0.09;
  const seatBox = new THREE.Box3();
  const seatSurfaceY = (st) => {
    if (!st?.seatId) return null;
    const it = items.find((q) => q.id === st.seatId);
    if (!it) return null;
    const lift = it.obj.position.y - it.base.y;                      // les meubles tombent en arrivant : on retire ce décalage
    seatBox.setFromObject(it.holder);
    return (seatBox.min.y - lift) + (seatBox.max.y - seatBox.min.y) * (SEAT_FRAC[st.seatId] ?? 0.45);
  };

  // Déplacements autonomes, comme sur le site de référence : le personnage se lève et va d'une activité à l'autre.
  // Ni vinyle (la musique ne démarre que sur un geste) ni tiroir ouvert : on laisse la main à l'utilisateur.
  const autonomousStations = [stations.desk, stations.ekstrem, stations.alocasia, stations.bonsai, stations.dracaena, stations.sofa, stations.cha];
  let autonomousNext = performance.now() + 4500 + Math.random() * 3500;
  let autonomousActivitySince = 0, autonomousLast = null, autonomousPrevMode = '';
  const autonomousTick = () => {
    const now = performance.now();
    if (now < autonomousPauseUntil || appOpen || crate.isOpen || !hero.group.visible) return;
    const mode = director.mode;
    if (mode !== autonomousPrevMode) { if (mode === 'activity') autonomousActivitySince = now; autonomousPrevMode = mode; }
    const cur = director.current;
    if (mode === 'activity' && cur !== stations.usm && autonomousActivitySince && now - autonomousActivitySince > (cur && cur.ritual ? 32000 : 11000)) {
      director.stand(); autonomousNext = now + 1800 + Math.random() * 2600; autonomousActivitySince = 0; return;
    }
    if (mode === 'idle' && now >= autonomousNext) {
      const pool = autonomousStations.filter((s) => s !== autonomousLast);
      const st = pool[Math.floor(Math.random() * pool.length)] || autonomousStations[0];
      autonomousLast = st; director.go(st); autonomousNext = now + 12500 + Math.random() * 7500;
    }
  };

  /* thé : entrée par le balcon, chaussures ôtées devant le shoji, porte ouverte, puis zabuton de l'invité */
  { const st = stations.cha, DKz = CS.z + cs.spec.DK.z0, rowZ = DKz + 0.22;
    let closeTok = 0;
    st.route = (from, drop) => {
      const open = [() => { cs.setPanels(1); hero.setShoes(false); }];
      const inside = [{ k: 'walk', pts: [[CS.x, DKz + 0.1], [CS.x, CS.z + cs.spec.RD / 2 - 0.6], [CS.x, TEA.z]] }];
      if (drop) return [{ k: 'fn', fn: open[0] }, ...inside.slice(1)];
      return [
        { k: 'fn', fn: () => { closeTok++; cs.setPanels(1); } },                              // les paravents s'ouvrent dès qu'il part : jardin et balcon apparaissent
        { k: 'walk', pts: nav.path(from, [CS.x + 2.5, rowZ]) },
        { k: 'walk', pts: [[CS.x - 0.55, rowZ]] },
        { k: 'face', yaw: Math.PI / 2 }, { k: 'fn', fn: () => { hero.setShoes(false); hero.flash('neutral', 0.1); } }, { k: 'wait', wait: 0.5 },
        { k: 'fn', fn: () => cs.setPanels(1) }, { k: 'wait', wait: 0.9 },
        ...inside,
      ];
    };
    st.exit = () => ({
      from: [CS.x + 2.5, rowZ],
      steps: [
        { k: 'glide', x: CS.x, z: TEA.z + 0.4, y: cs.spec.RH, yaw: 0, dur: 0.5, clip: 'Idle_Loop' },
        { k: 'walk', pts: [[CS.x, CS.z + cs.spec.RD / 2 - 0.6], [CS.x, DKz + 0.1], [CS.x - 0.55, rowZ]] },
        { k: 'fn', fn: () => { hero.setShoes(true); } }, { k: 'wait', wait: 0.4 },
        { k: 'walk', pts: [[CS.x + 1.4, rowZ], [CS.x + 2.5, rowZ]] },
        { k: 'fn', fn: () => { const tk = ++closeTok; setTimeout(() => { if (tk === closeTok) cs.setPanels(0); }, 5000); } },     // refermés une fois qu'il s'est éloigné sur le sentier
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
    onState: ({ on, paused }) => {
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
  const speakers = ['speaker1', 'speaker2'].map((id) => items.find((i) => i.id === id));
  const record = tt.userData.record, arm = tt.userData.arm;
  let armAng = 0.5;
  const rain = { active: false, origin: new THREE.Vector3(), drops: [] };

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
      rain: (on) => { rain.active = on; },
      music: () => {},
      say: (st) => {
        if (!st) { thoughtFor = null; thoughtEl.classList.remove('show'); return; }
        if (thoughtFor === st) return;
        thoughtFor = st; bubbleT = 0;
        thought.show(st.think && st.think.obj, st.label, st.think);
      },
    },
  });
  for (const st of Object.values(stations)) {
    st.enter = () => {
      hero.setBase(st.face); hero.talk(false); hero.can.visible = !!st.can; hero.setOverride(st.ov || null); hero.setShujaatPose?.(st.pose || null);
      hero.flash('amazed', 0.5); rain.active = !!st.can;
      if (st.music) setMusic(true);
      if (st.ritual) { cs.setPanels(1); ritual.start(); }
      if (st.tv) { if (retro.stripOn) retro.powerOn(); else { thoughtFor = null; thought.show(null, 'La multiprise est \u00e9teinte'); thoughtFor = st; } }
      if (afterEnter) { const f = afterEnter; afterEnter = null; setTimeout(f, 450); }
    };
  }
  function setMusic(on) {
    music = on;
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
    if (v) { tgt.copy(crateFocus); view.tZoom = 6; } else { tgt.copy(home); view.tZoom = 1; }
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
    tgt.copy(pos); view.tZoom = zoom;
    thoughtEl.classList.remove('show');
    setTimeout(() => window.dispatchEvent(new CustomEvent('room-open', { detail: { kind } })), 750);
  }
  window.addEventListener('room-close', (e) => {
    appOpen = false; tgt.copy(home); view.tZoom = 1;
    if (e.detail && e.detail.kind === 'retro') retro.powerOff();
  });
  const atSofa = () => director.current === stations.sofa && director.mode === 'activity';
  const atDesk = () => director.current === stations.desk && director.mode === 'activity';
  function activate(id) {
    if (id === 'drawer') { openCrate(!crate.isOpen); return; }
    if (id === 'strip') { retro.setStrip(!retro.stripOn); if (retro.stripOn && atSofa()) retro.powerOn(); return; }
    if (id === 'tv') {
      if (!atSofa()) { goTo('sofa'); return; }
      if (retro.state === 'off') retro.powerOn();
      else if (retro.state === 'ready') openApp('retro', retro.group.localToWorld(retro.tvCenter.clone()), 5.2);
      return;
    }
    const openPc = () => openApp('xp', uw.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.22, 0)), 5.2);
    if (id === 'pc') { if (atDesk()) openPc(); else goTo('desk', openPc); return; }
    if (/^shoji\d$/.test(id)) { cs.togglePanel(+id.slice(5)); return; }
    if (lamps[id]) { lamps[id].on = !lamps[id].on; lamps[id].manual = true; return; }
    if (id === 'speaker1' || id === 'speaker2') { setMusic(!music); return; }
    if (stations[id]) goTo(id);
  }
  const leave = () => director.stand();

  /* gouttes d'arrosage */
  const dropM = new THREE.MeshBasicMaterial({ color: '#6fb6e8' });
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), dropM); m.visible = false; world.add(m); rain.drops.push({ m, t: Math.random() }); }

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
  let shujaatMotionMode = 'idle';
  const syncShujaatMotionMode = () => {
    if (!shujaatBridge || !hero.group.visible) return 'idle';
    let next = 'idle';
    const cur = director.current;
    if (director.mode === 'walk') next = 'walk';
    else if (director.mode === 'activity' && cur?.shujaatMode) next = cur.shujaatMode;

    if (next !== shujaatMotionMode) {
      shujaatMotionMode = next;
      shujaatBridge.setMode(next, cur?.sourceTarget || null);
    }
    return next;
  };

  const clock = new THREE.Clock();
  let running = true;
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
    target.lerp(tgt, kv);
    view.az += (view.tAz - view.az) * kv; view.el += (view.tEl - view.el) * kv; view.zoom += (view.tZoom - view.zoom) * kv;
    scrollOff += (scrollT - scrollOff) * kv; orient(); applyFrustum();
    // personnage
    if (ritual.state.active) ritual.update(dt);
    wx.update(dt); sun.intensity = sunBase * (1 - 0.55 * wx.k.cloud); hemi.intensity = hemiBase * (1 + 0.15 * wx.k.cloud);
    cs.update(dt, t, night, wx.k); retro.update(dt);
    // vapeur du bol et de la kama
    { const ud = tea.userData; ud.sBowl.position.copy(ritual.object.position).y += 0.075; ud.sKama.position.copy(ud.fk.position).add(ud.fk.userData.steamAnchor);
      const drunk = ud.bowl.userData.tea.visible ? 1 : 0; updateSteam(ud.sBowl, t, 0.3, 0.1, drunk); updateSteam(ud.sKama, t + 1.3, 0.34, 0.13, 0.8); }
    if (!spawned && since > 1.6) { spawned = true; director.spawn(0.9, 0.7, 0.7); hero.group.visible = true; hero.group.scale.setScalar(0.01); poof(hero.group.position); }
    if (hero.group.visible) {
      // minuteur : aucune activité ne dure indéfiniment (arrosage 12 s, assis 25 s, thé 34 s), même déclenchée par l'utilisateur
      if (director.mode !== actMode) { if (director.mode === 'activity') actSince = performance.now(); actMode = director.mode; }
      if (director.mode === 'activity' && !appOpen && !crate.isOpen && director.current && performance.now() - actSince > (director.current.maxMs || 25000)) { director.stand(); actSince = performance.now(); }
      autonomousTick();
      director.update(dt);
      const exactMotion = syncShujaatMotionMode();
      if (exactMotion !== 'idle') {
        hero.setShujaatPose?.(null);
        if (exactMotion === 'water' && shujaatBridge?.wateringCan) hero.can.visible = false;
      }
      { const e = camera.matrixWorld.elements; lookRight.set(e[0], 0, e[2]).normalize(); lookTo.set(camera.position.x - target.x, 0, camera.position.z - target.z).normalize(); hero.setLookView(lookRight, lookTo); }
      hero.update(dt, t);
      if (exactMotion !== 'idle') shujaatBridge?.applyPose(hero, 1);
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
            hero.group.updateMatrixWorld(true);
            const sy = seatSurfaceY(cur);
            const pelvis = hero.wp('pelvis');
            if (sy != null && pelvis) {
              const targetPelvisY = sy + (cur.hipClearance || 0.19);
              const dy = targetPelvisY - pelvis.y;
              hero.group.position.y += dy * (1 - Math.exp(-dt * 14));
              hero.group.updateMatrixWorld(true);
            }
            if (hero.plantSeatedFeet && exactMotion === 'idle') hero.plantSeatedFeet(floorY(hero.group.position.x, hero.group.position.z) + 0.01);      // pieds posés au sol, genoux fléchis
          } else if (!(cur && cur.ritual && director.mode === 'activity')) {
            hero.model.position.y = modelBaseY;
            hero.group.updateMatrixWorld(true);
            const lo = Math.min(hero.wp('ball_l').y, hero.wp('ball_r').y) - hero.group.position.y;
            hero.model.position.y = modelBaseY - (lo - 0.04);
          }
        } }
      if (shujaatBridge) {
        if (exactMotion === 'read') shujaatBridge.syncBook(hero.group);
        else if (shujaatBridge.book) shujaatBridge.book.visible = false;

        if (exactMotion === 'water') shujaatBridge.syncWateringCan(hero.group);
        else if (shujaatBridge.wateringCan) shujaatBridge.wateringCan.visible = false;
      }
      const s = hero.group.scale.x; hero.group.scale.setScalar(s + (1 - s) * (1 - Math.exp(-dt * 10)));
      bubbleT += dt;
      const showB = !!thoughtFor && director.mode !== 'carried' && !appOpen && bubbleT > 0.35;
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
    // pluie
    for (const d of rain.drops) {
      d.m.visible = rain.active;
      if (!rain.active) continue;
      d.t = (d.t + dt * 1.3) % 1;
      if (d.t < dt * 1.3 + 1e-3 || !d.o) { hero.canTip.getWorldPosition(rain.origin); d.o = rain.origin.clone(); }
      d.m.position.set(d.o.x + Math.sin(d.t * 40) * 0.015, d.o.y - d.t * d.t * 0.85, d.o.z + Math.cos(d.t * 33) * 0.015 + d.t * 0.1);
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
    record.rotation.y += dt * (music ? 3.4 : 0);
    armAng += ((music ? 0.0 : 0.5) - armAng) * (1 - Math.exp(-dt * 3));
    arm.rotation.y = armAng;
    for (const s of speakers) { const b = music ? 1 + Math.max(0, Math.sin(t * 9)) * 0.03 : 1; s.obj.scale.set(1, b, 1); }
    // lampes
    for (const k in lamps) {
      const L = lamps[k];
      L.k += ((L.on ? 1 : 0) - L.k) * (1 - Math.exp(-dt * 8));
      L.glow.color.set(L.offColor).lerp(new THREE.Color(L.onColor), L.k);
      if (L.glow.update) L.glow.update(L.k);
      L.light.intensity = L.k * (k === 'arc' ? 14 : k === 'beton' ? 0.9 : k === 'falk' ? 2.4 : 1.1);
    }
    renderer.shadowMap.needsUpdate = since < 3.2 || frameNo % 3 === 0;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  resize();
  requestAnimationFrame(frame);

  // économie : on arrête quand l'onglet est caché ou le composant hors écran
  const io = new IntersectionObserver(([e]) => { const vis = e.isIntersecting && !document.hidden; if (vis && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } else if (!vis) running = false; });
  io.observe(container);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } });

  const bbox = (id) => { const it = items.find((i) => i.id === id); const b = new THREE.Box3().setFromObject(it.holder); return [b.min.toArray(), b.max.toArray()].map((a) => a.map((v) => +v.toFixed(2))); };
  const toScreen = (x, y, z) => { const q = new THREE.Vector3(x, y, z).project(camera), r = el.getBoundingClientRect(); return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; };
  return { wx, setScroll: (p) => { scrollT = p; }, pauseAutonomy, crate, toScreen, bbox, activate, leave, director, nav, stations, floorY, goTo, lamps, view, target: tgt, opts, hero, ritual, tea, cs, scene, camera, renderer };
}
