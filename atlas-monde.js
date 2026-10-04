/* ATLAS · LE MONDE : assemble l'île flottante (terrain, lagon, flore, bâtiments, accessoires), le ciel, l'océan et les nuages, et fait vivre ce
 * qui bouge tout seul : petit train sur sa boucle, voiture sur la route de la plate-forme, voilier qui sort du ponton, mouettes, poissons,
 * chutes d'eau qui tombent dans les nuages. Le jeu (fiches, œufs de Pâques, marche, navigation, pêche) est dans atlas-jeu.js.
 *
 *   const M = await creerMonde(R, { qualite })   ->  M.scene, M.sceneNuages, M.camera, M.ciel, M.carte, M.bats, M.objets, M.tick(dt, t)             */
import * as THREE from './three.module.js';
import { creerCiel } from './atlas-ciel.js';
import { creerNuages } from './atlas-nuages.js';
import { chargerIle, creerEau } from './atlas-ile.js';
import { creerFlore, aleatoire } from './atlas-flore.js';
import { peupler } from './atlas-decor.js';
import { chargerBatiments } from './atlas-batiments.js';
import { ETAPES } from './atlas-etapes.js';
import { creerRoches } from './atlas-roches.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lisse = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

export async function creerMonde(R, opts = {}) {
  const qualite = opts.qualite ?? 1;
  const scene = new THREE.Scene(), sceneNuages = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 2000);
  const ciel = creerCiel(R.renderer, scene);
  scene.environmentIntensity = 0.42;
  /* soleil : lumière directionnelle à ombres portées sur toute l'île ; hémisphère : ciel en haut, rebond des nuages et de l'océan en bas */
  const soleil = new THREE.DirectionalLight('#fff0d6', 2.7);
  soleil.castShadow = true; soleil.shadow.mapSize.set(qualite >= 1 ? 4096 : 2048, qualite >= 1 ? 4096 : 2048); soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.05;
  Object.assign(soleil.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 5, far: 130 });
  scene.add(soleil, soleil.target);
  const hemi = new THREE.HemisphereLight('#c3d5e5', '#d9cfba', 0.55); scene.add(hemi);

  /* nuages : un anneau autour de l'île, de l'altitude des toits jusqu'au-dessous du socle */
  const PLAN = [
    { x: -14, y: -2.2, z: 10.5, echelle: 1.7 }, { x: 16.5, y: -3.2, z: 8.5, echelle: 1.9 }, { x: -16, y: 0.8, z: -12, echelle: 2.0 }, { x: 14, y: -5, z: -15, echelle: 2.1 },
    { x: -28, y: -14, z: 2, echelle: 2.4 }, { x: 26, y: -12.5, z: -6, echelle: 2.3 }, { x: 3, y: -19.5, z: 25, echelle: 2.4 }, { x: -8, y: -23.5, z: -12, echelle: 2.2 },
    { x: 32, y: -9.5, z: 15, echelle: 2.0 }, { x: -26, y: -11, z: 20, echelle: 2.1 }, { x: 8, y: -15, z: -26, echelle: 2.2 }, { x: -2, y: -9, z: 30, echelle: 1.8 },
  ];
  const nuages = creerNuages({ plan: qualite >= 1 ? PLAN : PLAN.slice(0, 8), qualite }); sceneNuages.add(nuages.groupe);

  const ile = await chargerIle(ciel); scene.add(ile.mesh);
  const carte = ile.carte, meta = carte.meta;
  ciel.uniformes.uIle.value.set(0, -3, 0);
  const eau = creerEau(ile, ciel); scene.add(eau);
  const flore = creerFlore(ciel); const decor = peupler({ carte, flore, ciel, densite: qualite >= 1 ? 1 : 0.6 }); scene.add(decor.groupe);
  const B = await chargerBatiments(ciel);
  const roches = await creerRoches({ M: { carte, ciel, scene }, decor, flore });

  /* ------------------------------------------------------------------------------------------------ bâtiments */
  const sol = (x, z, r = 0.8) => { let y = carte.hauteur(x, z); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; y = Math.max(y, carte.hauteur(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return y; };
  const bats = {};
  for (const e of ETAPES) {
    const b = meta.batiments[e.id], { groupe, ancres } = B.creer(e.glb);
    const [x, z] = b.pos; groupe.position.set(x, sol(x, z, b.r * 0.55) - 0.02, z);
    groupe.rotation.y = e.id === 'sncf' ? Math.PI : Math.atan2(e.vers[0] - x, e.vers[1] - z);
    groupe.userData.etape = e; groupe.traverse((o) => { if (o.isMesh) o.userData.batiment = groupe; });
    scene.add(groupe); groupe.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(groupe);
    bats[e.id] = { groupe, ancres, etape: e, box, rayon: b.r, x, z, haut: box.max.y };
  }

  /* ------------------------------------------------------------------------------------------------ accessoires fixes */
  const poser = (nom, x, y, z, yaw = 0) => { const { groupe } = B.creer(nom); groupe.position.set(x, y, z); groupe.rotation.y = yaw; scene.add(groupe); groupe.traverse((o) => { if (o.isMesh) o.userData.accessoire = nom; }); return groupe; };
  const [pa, pb] = [meta.pont.a, meta.pont.b];
  const pont = poser('pont', pa[0], 0, pa[1], Math.atan2(pb[0] - pa[0], pb[1] - pa[1]));
  const [qa, qb] = [meta.ponton.a, meta.ponton.b];
  const ponton = poser('ponton', qa[0], 0, qa[1], Math.atan2(qb[0] - qa[0], qb[1] - qa[1]));
  const yawPonton = Math.atan2(qb[0] - qa[0], qb[1] - qa[1]), dirPonton = V3(Math.sin(yawPonton), 0, Math.cos(yawPonton)), latPonton = V3(Math.cos(yawPonton), 0, -Math.sin(yawPonton));
  const bout = V3(qa[0], 0, qa[1]).addScaledVector(dirPonton, 2.75);
  /* bateaux amarrés : le yacht d'un côté du ponton, le bateau de pêche et le voilier de l'autre */
  const yacht = poser('yacht', 0, 0, 0); const bateau = poser('bateau', 0, 0, 0); const voilier = poser('voilier', 0, 0, 0);
  const voiles = B.creer('voiles').groupe; voilier.add(voiles); voiles.position.set(0.12, 0.17, 0);
  const cote = (s, t, lat) => V3(qa[0], 0, qa[1]).addScaledVector(dirPonton, t).addScaledVector(latPonton, lat * s);
  const amarrage = {
    yacht: { p: cote(1, 1.45, 0.78), yaw: yawPonton - Math.PI / 2 },
    bateau: { p: cote(-1, 2.6, 0.62), yaw: yawPonton - Math.PI / 2 + 0.15 },
    voilier: { p: cote(-1, 1.0, 0.62), yaw: yawPonton - Math.PI / 2 },
  };
  yacht.position.copy(amarrage.yacht.p); yacht.rotation.y = amarrage.yacht.yaw;
  bateau.position.copy(amarrage.bateau.p); bateau.rotation.y = amarrage.bateau.yaw;
  voilier.position.copy(amarrage.voilier.p); voilier.rotation.y = amarrage.voilier.yaw;

  /* phare : sur le bord avant-gauche de l'île */
  const bk = meta.bord[Math.round(2.62 / (Math.PI * 2) * 120) % 120], px = bk[0] - bk[3] * 1.15, pz = bk[2] - bk[4] * 1.15;
  const phare = poser('phare', px, carte.hauteur(px, pz) - 0.05, pz, 0);

  /* ------------------------------------------------------------------------------------------------ voie ferrée : boucle autour de la prairie de la gare */
  const voie = (() => {
    const c = meta.voie.c, rx = meta.voie.rx, rz = meta.voie.rz, N = 96, ys = [];
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; ys.push(carte.hauteur(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * rz)); }
    const lis = ys.map((_, i) => { let t = 0; for (let k = -4; k <= 4; k++) t += ys[(i + k + N * 2) % N]; return t / 9; });
    const pts = lis.map((y, i) => { const a = i / N * Math.PI * 2; return V3(c[0] + Math.cos(a) * rx, y + 0.045, c[1] + Math.sin(a) * rz); });
    const courbe = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const groupe = new THREE.Group(); scene.add(groupe);
    const matRail = new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.35, metalness: 0.85 }), matTraverse = new THREE.MeshStandardMaterial({ color: '#5a4026', roughness: 0.95 });
    const matBallast = new THREE.MeshStandardMaterial({ color: '#a79f90', roughness: 1 });
    const M = 360, up = V3(0, 1, 0), lat = V3(), t = V3();
    for (const s of [-1, 1]) {
      const pr = []; for (let i = 0; i < M; i++) { const u = i / M, p = courbe.getPointAt(u); t.copy(courbe.getTangentAt(u)); lat.crossVectors(up, t).normalize(); pr.push(p.clone().addScaledVector(lat, 0.11 * s).setY(p.y + 0.035)); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pr, true, 'centripetal'), M, 0.014, 6, true), matRail); m.castShadow = true; groupe.add(m);
    }
    const nt = 170, trav = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.028, 0.07), matTraverse, nt), m4 = new THREE.Matrix4(), bas = new THREE.Matrix4();
    const pos = [], idx = [];
    for (let i = 0; i < nt; i++) { const u = i / nt, p = courbe.getPointAt(u); t.copy(courbe.getTangentAt(u)); lat.crossVectors(up, t).normalize(); const yy = V3().crossVectors(t, lat).normalize(); bas.makeBasis(lat, yy, t).setPosition(p.x, p.y + 0.018, p.z); trav.setMatrixAt(i, bas); }
    trav.castShadow = true; trav.receiveShadow = true; groupe.add(trav);
    for (let i = 0; i <= M; i++) { const u = (i % M) / M, p = courbe.getPointAt(u); t.copy(courbe.getTangentAt(u)); lat.crossVectors(up, t).normalize(); for (const k of [-1, 0, 1]) { const q = p.clone().addScaledVector(lat, k * 0.24); pos.push(q.x, carte.hauteur(q.x, q.z) + 0.012 + (k === 0 ? 0.012 : 0), q.z); } }
    for (let i = 0; i < M; i++) for (let k = 0; k < 2; k++) { const a = i * 3 + k, b = a + 1, c2 = a + 3, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const ballast = new THREE.Mesh(g, matBallast); ballast.receiveShadow = true; groupe.add(ballast);
    return { courbe, longueur: courbe.getLength(), groupe };
  })();
  /* rames : mêmes bogies que dans l'ancien atlas, chaque caisse est posée entre deux points de la courbe */
  const rames = [];
  { let s = 0; for (const [nom, lon] of [['loco', 1.0], ['tender', 0.4], ['wagon_a', 0.54], ['wagon_b', 0.54], ['wagon_a', 0.54]]) {
      const { groupe, ancres } = B.creer(nom); groupe.userData.demi = lon * 0.36; groupe.userData.derriere = s + lon / 2; groupe.userData.ancres = ancres; scene.add(groupe); rames.push(groupe); s += lon + 0.07; groupe.traverse((o) => { if (o.isMesh) o.userData.train = true; }); } }
  const train = rames[0];
  const _a = V3(), _b = V3(), _f = V3(), _u = V3(), _s = V3(), _m = new THREE.Matrix4();
  const poseRame = (g, dist, courbe, longueur, lift = 0) => {
    const h = g.userData.demi, w = (t) => ((t % 1) + 1) % 1;
    _a.copy(courbe.getPointAt(w((dist - h) / longueur))); _b.copy(courbe.getPointAt(w((dist + h) / longueur)));
    g.position.addVectors(_a, _b).multiplyScalar(0.5); g.position.y += lift;
    _f.subVectors(_b, _a).normalize(); _s.set(0, 1, 0).cross(_f); if (_s.lengthSq() < 1e-8) _s.set(1, 0, 0); _s.normalize();
    _u.crossVectors(_f, _s).normalize(); g.quaternion.setFromRotationMatrix(_m.makeBasis(_f, _u, _s.crossVectors(_f, _u)));
  };
  /* fumée de la locomotive */
  const fumees = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c), liste = [];
    for (let i = 0; i < 26; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, color: '#eef2f6' })); sp.userData = { vie: 0, vx: 0, vy: 0, vz: 0 }; scene.add(sp); liste.push(sp); }
    return { liste, suivant: 0, cadence: 0 };
  })();

  /* ------------------------------------------------------------------------------------------------ voiture : route en anneau de la plate-forme de la tour */
  const voiture = B.creer('voiture').groupe; scene.add(voiture); voiture.userData.demi = 0.2; voiture.traverse((o) => { if (o.isMesh) o.userData.voiture = true; });
  const route = (() => {
    const tb = bats.bi.groupe, loc = []; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; loc.push(V3(1.74 * Math.cos(a) * 0.97, 0.362, 1.74 * Math.sin(a) * 0.97)); }
    tb.updateMatrixWorld(true); const pts = loc.map((p) => tb.localToWorld(p.clone()));
    const courbe = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5); return { courbe, longueur: courbe.getLength() };
  })();

  /* ------------------------------------------------------------------------------------------------ chutes d'eau : le lagon déborde et tombe dans les nuages */
  const chutes = [];
  const matChute = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uNuit: ciel.uniformes.uNuit, uSunCol: ciel.uniformes.uSunCol },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uT, uNuit; uniform vec3 uSunCol;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        float y = vUv.y;                                   /* 0 en haut (sur le seuil), 1 en bas */
        float fil = n(vec2(vUv.x * 14., y * 2. - uT * 2.2)) * .6 + n(vec2(vUv.x * 30., y * 5. - uT * 3.4)) * .4;
        float stries = smoothstep(.3, .72, fil);
        float bord = smoothstep(.0, .12, vUv.x) * smoothstep(1., .88, vUv.x);
        float a = bord * (.18 + .82 * stries) * (1. - smoothstep(.5, 1., y)) * smoothstep(0., .02, y);
        vec3 c = mix(vec3(.5, .82, .92), vec3(1.), stries * .9 + y * .2);
        c *= mix(1., .35, uNuit);
        gl_FragColor = vec4(c, a * .55);
      }`,
  });
  for (const c of meta.chutes) {
    const dir = V3(c.dx, 0, c.dz).normalize(), lat = V3(-dir.z, 0, dir.x), larg = Math.max(0.55, Math.min(1.1, c.largeur)), hauteur = 17, seg = 28;
    const g = new THREE.PlaneGeometry(1, 1, 6, seg), pos = g.attributes.position, uv = g.attributes.uv;
    // la nappe part du seuil, sort un peu vers le vide puis tombe : chute libre depuis une vitesse horizontale
    const base = V3(c.x, c.y, c.z).addScaledVector(dir, 0.55);
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), v = 1 - uv.getY(i), h = v * hauteur, t = Math.sqrt(h * 2 / 9.8 + 0.001), out = Math.min(t * 0.5, 1.1) + v * 0.15, w = (u - 0.5) * larg * (1 + v * 0.6);
      pos.setXYZ(i, base.x + dir.x * out + lat.x * w, base.y - h, base.z + dir.z * out + lat.z * w);
      uv.setXY(i, u, v);
    }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, matChute); m.frustumCulled = false; m.renderOrder = 5; scene.add(m); chutes.push({ mesh: m, base });
  }
  /* embruns : petits nuages de brume au pied de chaque chute */
  const brume = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 1, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c), liste = [];
    for (const ch of chutes) for (let i = 0; i < 9; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.3, color: '#ffffff' })); sp.userData = { c: ch, ph: Math.random(), s: 2.2 + Math.random() * 2.4 }; scene.add(sp); liste.push(sp); }
    return liste;
  })();

  /* ------------------------------------------------------------------------------------------------ mouettes et poissons */
  const mouettes = [];
  { const matB = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.8, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(), corps = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), matB); corps.scale.set(2.2, 0.8, 0.8); g.add(corps);
      const bec = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), new THREE.MeshStandardMaterial({ color: '#f2a13a' })); bec.rotation.z = -Math.PI / 2; bec.position.x = 0.24; g.add(bec);
      const aile = (s) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.12, 0.12 * s, 0.1, 0.38 * s); sh.quadraticCurveTo(-0.04, 0.2 * s, -0.12, 0); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), matB); m.rotation.x = -Math.PI / 2 * 0 + 0; const p = new THREE.Group(); m.rotation.x = Math.PI / 2; p.add(m); return p; };
      const aG = aile(1), aD = aile(-1); g.add(aG, aD); g.userData = { aG, aD, ph: i * 1.3, r: 11 + (i % 3) * 2.2, h: 1.5 + (i % 4) * 1.4, v: 0.18 + 0.03 * (i % 3) }; g.traverse((o) => { if (o.isMesh) o.userData.oiseau = true; }); g.castShadow = true; scene.add(g); mouettes.push(g);
    } }
  const poissons = [];
  { const mats = ['#ff8a3d', '#ffd23f', '#4cc9f0', '#ff6f91'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.1 }));
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group(), corps = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mats[i % 4]); corps.scale.set(2, 0.9, 0.55); g.add(corps);
      const queue = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), mats[i % 4]); queue.rotation.z = Math.PI / 2; queue.position.x = -0.15; queue.scale.set(1, 1, 0.3); g.add(queue);
      g.userData = { a: Math.random() * 6.3, t: Math.random() * 10, x: 0, z: 0, saut: 0, dx: 0, dz: 0 }; g.visible = false; scene.add(g); poissons.push(g); g.traverse((o) => { if (o.isMesh) o.userData.poisson = true; });
    } }
  /* le canard du lagon */
  const canard = (() => {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.6 });
    const corps = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), m); corps.scale.set(1.25, 0.85, 0.95); g.add(corps);
    const tete = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), m); tete.position.set(0.1, 0.1, 0); g.add(tete);
    const bec = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.045), new THREE.MeshStandardMaterial({ color: '#ff8a3d' })); bec.position.set(0.17, 0.1, 0); g.add(bec);
    const queue = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 6), m); queue.rotation.z = Math.PI / 2 + 0.5; queue.position.set(-0.13, 0.05, 0); g.add(queue);
    g.userData.home = V3(-3.4, 0, 5.2); g.position.copy(g.userData.home); g.traverse((o) => { if (o.isMesh) o.userData.canard = true; o.castShadow = true; }); scene.add(g); return g;
  })();

  /* ------------------------------------------------------------------------------------------------ animation d'ambiance */
  const M = { scene, sceneNuages, camera, ciel, soleil, hemi, nuages, ile, carte, meta, eau, flore, decor, roches, B, bats, ETAPES,
    objets: { pont, ponton, yacht, bateau, voilier, voiles, phare, train, rames, voiture, canard, mouettes, poissons, chutes },
    voie, route, amarrage, sol };
  const couleurLune = new THREE.Color('#8fa9f0'), ciHemi = new THREE.Color('#4a6cb0'), solHemi = new THREE.Color('#3a4a6c');
  let trainT = 0, voitureS = 0;
  M.vitesseTrain = 0.04; M.etatVoilier = { etat: 'quai', t: 8, mix: 0, go: 0, theta: 0 };
  const rayVoile = (th) => { const c = meta.ilot.c; return [c[0] + Math.cos(th) * 2.75, c[1] + Math.sin(th) * 2.1]; };
  const tmp = V3();
  M.tick = (dt, t, eclat = {}) => {
    ciel.tick(dt, t, camera);
    const k = ciel.uniformes.uNuit.value;
    soleil.position.copy(ciel.soleil).multiplyScalar(60); soleil.target.position.set(0, -2, 0); soleil.target.updateMatrixWorld();
    soleil.intensity = 2.7 * (1 - k) + 1.6 * k; soleil.color.set('#fff0d6').lerp(couleurLune, k);
    hemi.intensity = 0.55 * (1 - k) + 0.95 * k; hemi.color.set('#c3d5e5').lerp(ciHemi, k); hemi.groundColor.set('#d9cfba').lerp(solHemi, k); scene.environmentIntensity = 0.42 * (1 - k) + 0.3 * k;
    ile.partage.uTemps.value = t; eau.userData.uniformes.uTemps.value = t; matChute.uniforms.uT.value = t; decor.tick(dt, t); roches.tick(dt, t);
    R.reglages.exposition = 1 + 0.6 * k; R.reglages.eclat = 0.38 + 0.32 * k;
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    nuages.tick(dt, t, camera, ciel, R.profondeur, R.taille);
    // train
    trainT = (trainT + M.vitesseTrain * dt) % 1; const tete = trainT * voie.longueur;
    for (const g of rames) poseRame(g, tete - g.userData.derriere, voie.courbe, voie.longueur);
    fumees.cadence -= dt; const chem = train.userData.ancres.fumee;
    if (fumees.cadence < 0) { fumees.cadence = 0.22 / (0.5 + M.vitesseTrain * 14); const sp = fumees.liste[fumees.suivant++ % fumees.liste.length]; chem.getWorldPosition(sp.position); Object.assign(sp.userData, { vie: 1, vx: (Math.random() - 0.5) * 0.06 - 0.05, vy: 0.22 + Math.random() * 0.1, vz: (Math.random() - 0.5) * 0.06 }); }
    for (const sp of fumees.liste) { const u = sp.userData; if (u.vie <= 0) { sp.material.opacity = 0; continue; } u.vie -= dt * 0.38; sp.position.x += u.vx * dt; sp.position.y += u.vy * dt; sp.position.z += u.vz * dt; const s = 0.16 + (1 - u.vie) * 0.55; sp.scale.set(s, s, 1); sp.material.opacity = Math.max(0, u.vie) * 0.6 * (1 - k * 0.5); }
    // voiture
    voitureS += 0.5 * dt; poseRame(voiture, voitureS, route.courbe, route.longueur, 0.0);
    // chutes : brume
    for (const sp of brume) { const u = sp.userData; u.ph = (u.ph + dt * 0.05) % 1; const b = u.c.base; sp.position.set(b.x + Math.sin(u.ph * 6.3 + u.s) * 0.5, b.y - 15.5 + Math.sin(t * 0.7 + u.s * 3) * 0.3, b.z + Math.cos(u.ph * 6.3 + u.s) * 0.5 + 0.2); sp.scale.setScalar(u.s); sp.material.opacity = (0.22 + 0.12 * Math.sin(t + u.s * 4)) * (1 - 0.5 * k); }
    // mouettes
    mouettes.forEach((g, i) => { const u = g.userData, a = t * u.v + u.ph; g.position.set(Math.cos(a) * u.r, u.h - 1 + Math.sin(t * 0.6 + i) * 0.5, Math.sin(a) * u.r * 0.85); g.rotation.y = -a - Math.PI / 2; g.rotation.x = -0.18; const f = Math.sin(t * 7 + u.ph * 3) * 0.55; u.aG.rotation.x = f; u.aD.rotation.x = -f; u.aG.position.z = 0.07; u.aD.position.z = -0.07; });
    // bateaux amarrés qui tanguent
    const bob = (g, a, ph) => { g.position.y = Math.sin(t * 1.3 + ph) * 0.012; g.rotation.z = Math.sin(t * 1.1 + ph) * 0.02; };
    bob(yacht, amarrage.yacht, 0); if (!M.barreSail) bob(bateau, amarrage.bateau, 1.7);
    // voilier : sort du ponton, tourne autour de l'îlot, revient ranger ses voiles
    const e = M.etatVoilier; M.etatVoilier.t -= dt;
    if (e.etat === 'quai') { bob(voilier, amarrage.voilier, 3); e.mix = Math.max(0, e.mix - dt * 0.4); if (e.t < 0 || e.go) { e.go = 0; e.etat = 'hisse'; e.t = 2.6; } }
    else if (e.etat === 'hisse') { e.mix = Math.min(1, e.mix + dt * 0.45); if (e.t < 0) { e.etat = 'nav'; e.t = 26 + Math.random() * 10; e.theta = Math.atan2(amarrage.voilier.p.z - meta.ilot.c[1], amarrage.voilier.p.x - meta.ilot.c[0]); } }
    else if (e.etat === 'nav') {
      e.mix = 1; e.theta += dt * 0.2; const [x, z] = rayVoile(e.theta), [x2, z2] = rayVoile(e.theta + 0.05);
      tmp.set(x, Math.sin(t * 2) * 0.012, z); voilier.position.lerp(tmp, Math.min(1, dt * 3)); voilier.rotation.y += ((Math.atan2(-(z2 - z), x2 - x)) - voilier.rotation.y) * Math.min(1, dt * 4);
      voilier.rotation.z = Math.sin(t * 1.7) * 0.06;
      const ca = Math.atan2(amarrage.voilier.p.z - meta.ilot.c[1], amarrage.voilier.p.x - meta.ilot.c[0]);
      if (e.t < 0 && Math.abs(Math.atan2(Math.sin(e.theta - ca), Math.cos(e.theta - ca))) < 0.25) { e.etat = 'retour'; e.t = 5; }
    } else if (e.etat === 'retour') {
      voilier.position.lerp(amarrage.voilier.p, Math.min(1, dt * 0.9)); voilier.rotation.y += (amarrage.voilier.yaw - voilier.rotation.y) * Math.min(1, dt * 1.5); e.mix = Math.max(0.0, e.mix - dt * 0.2);
      if (e.t < 0) { e.etat = 'quai'; e.t = 30 + Math.random() * 20; }
    }
    const lissage = e.mix * e.mix * (3 - 2 * e.mix); voiles.scale.set(0.3 + 0.7 * lissage, 0.05 + 0.95 * lissage, 1);
    // le canard flotte
    if (canard.userData.fuit) { canard.userData.fuit += dt; canard.position.x -= dt * 0.9; canard.position.z += dt * 0.4; if (canard.userData.fuit > 4) { canard.userData.fuit = 0; canard.position.copy(canard.userData.home); } }
    canard.position.y = Math.sin(t * 3) * 0.012 - 0.02; canard.rotation.y = Math.sin(t * 0.4) * 0.8 + 0.6;
  };
  return M;
}
