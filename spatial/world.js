// SceneManager : le monde. Un seul moteur de rendu, un seul plan blueprint continu, les machines d'origine posées dans l'espace,
// les plaques des projets personnels, la stèle, les liaisons entre projets. Les ressources lourdes se chargent à l'approche.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { drawMat } from '../refonte/blueprint-hero.js';
import { MachineController } from './machine.js';

const DEG = Math.PI / 180;
const TILE = 78;                                   // côté d'un tracé de table à dessin, comme sur le plan des pages projet (30 × 2,6)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Plan blueprint continu : mêmes couleurs et même grille que le plan d'origine (refonte/blueprint-hero.js), prolongés à l'infini.
   Les tracés de la table à dessin (cercles, axes, règle, annotations) sont posés par dalles choisies une fois pour toutes. */
function groundMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uTile: { value: TILE }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `
      varying vec3 vW;uniform sampler2D uTex;uniform float uTile;uniform vec2 uRes;uniform float uTime;
      float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float lines(vec2 p,float s){vec2 q=p/s;vec2 d=fwidth(q);vec2 l=abs(fract(q-.5)-.5)/max(d,vec2(1e-5));return 1.-min(min(l.x,l.y),1.);}
      void main(){
        const float K=3.6667;
        vec2 p=vW.xz*K;
        float dist=length(vW-cameraPosition)*K;
        vec3 col=mix(vec3(.04,.255,.93),vec3(.07,.33,.98),smoothstep(150.,40.,dist));
        float fade=exp(-dist*.004);
        col+=vec3(.5,.66,1.)*lines(p,2.)*.07*fade+vec3(.78,.88,1.)*lines(p,10.)*.17*fade;
        // dalles tracées : une sur deux environ, orientation variable, fixes d'une visite à l'autre
        vec2 g=vW.xz/uTile; vec2 id=floor(g); vec2 f=fract(g);
        float h=hash(id+3.7);
        vec2 u=f; if(h>.5)u.x=1.-u.x; if(fract(h*7.)>.5)u=u.yx;
        vec2 dx=dFdx(g),dy=dFdy(g);
        vec4 t=textureGrad(uTex,vec2(u.x,1.-u.y),dx,dy)*step(h,.58);
        col=mix(col,t.rgb,t.a*smoothstep(520.,260.,dist*.27));
        vec4 tb=textureGrad(uTex,vec2(u.x,1.-u.y),dx*8.,dy*8.)*step(h,.58);col+=tb.rgb*tb.a*.55*smoothstep(520.,260.,dist*.27);
        // horizon : le plan se perd dans le noir, comme au-delà du bord du plan d'origine
        float horizon=smoothstep(180.,520.,length(vW.xz-cameraPosition.xz));
        col=mix(col,vec3(.012,.02,.05),horizon);
        vec2 sp=gl_FragCoord.xy/uRes-.5;
        col*=1.-smoothstep(.25,.95,length(sp*vec2(1.25,1.)))*.42;
        col+=(hash(gl_FragCoord.xy+fract(uTime)*91.7)-.5)*.07;
        gl_FragColor=vec4(col,1.);
      }`
  });
}

const lineMat = (o = {}) => new THREE.LineBasicMaterial({ color: 0xdbe6ff, transparent: true, opacity: .5, ...o });
const ring = (r, seg = 64) => { const pts = []; for (let i = 0; i < seg; i++) pts.push(new THREE.Vector3(Math.cos(i / seg * 6.2832) * r, 0, Math.sin(i / seg * 6.2832) * r)); return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat({ opacity: .4 })); };

export class SceneManager {
  constructor(canvas, registry, perf, onStatus = () => {}) {
    this.canvas = canvas; this.registry = registry; this.perf = perf; this.onStatus = onStatus;
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 1200);
    this.scene = new THREE.Scene();
    this.machines = new Map(); this.plates = new Map(); this.links = []; this.dash = [];
    this.focusId = null; this.timeScale = 1; this.t = 0;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.tmp = new THREE.Vector3(); this.cam = new THREE.Vector3();
    this.loadQueue = []; this.busy = false; this.stats = { webglInitMs: 0, modelMs: {} };
  }

  init() {
    const t0 = performance.now();
    const gl = this.canvas.getContext('webgl2', { antialias: this.perf.level < 2, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL 2 indisponible');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, context: gl });
    this.renderer.setClearColor(0x03060f, 1); this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.enabled = this.perf.profile.shadows > 0; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(this.perf.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // lumières de la scène d'une machine d'origine (refonte/m3d/core.js makeStage)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b8e6, 1.9));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.3); this.sun.castShadow = true;
    this.sun.shadow.bias = -.0005; this.sun.shadow.radius = 5;
    Object.assign(this.sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
    this.scene.add(this.sun, this.sun.target);
    this.applyShadowSize();
    // plan
    const tex = new THREE.CanvasTexture(drawMat(1024)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex = tex;
    this.groundMat = groundMaterial(tex);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), this.groundMat); this.ground.rotation.x = -Math.PI / 2; this.ground.frustumCulled = false;
    const shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.ShadowMaterial({ opacity: .38, color: 0x000a50 }));
    shadowGround.rotation.x = -Math.PI / 2; shadowGround.position.y = .004; shadowGround.receiveShadow = true; shadowGround.frustumCulled = false;
    this.scene.add(this.ground, shadowGround); this.shadowGround = shadowGround;
    document.fonts?.ready.then(() => { this.tex.image = drawMat(1024); this.tex.needsUpdate = true; });
    this.buildAxes(); this.buildObjects(); this.buildLinks();
    this.resize();
    this.stats.webglInitMs = Math.round(performance.now() - t0);
  }

  applyShadowSize() {
    const s = this.perf.profile.shadows;
    this.renderer.shadowMap.enabled = s > 0; this.sun.castShadow = s > 0;
    if (s > 0) { this.sun.shadow.mapSize.set(s, s); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }
  setProfile() { this.renderer.setPixelRatio(this.perf.pixelRatio); this.applyShadowSize(); this.resize(); }

  resize() {
    const w = innerWidth, h = innerHeight, a = w / h;
    this.renderer.setSize(w, h, false);
    // champ horizontal constant : sur écran étroit le champ vertical s'élargit pour que la machine tienne en largeur
    const fovV = a >= 1.6 ? 30 : Math.min(62, 2 * Math.atan(Math.tan(15 * DEG) * 1.6 / a) / DEG);
    this.camera.fov = fovV; this.camera.aspect = a; this.camera.updateProjectionMatrix();
    this.groundMat.uniforms.uRes.value.set(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
  }

  /* axes de coordonnées, repères de profondeur et lignes de construction : tiret-point comme sur le plan d'origine */
  buildAxes() {
    const dash = (pts, o = {}) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
      const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xdbe6ff, transparent: true, opacity: .42, dashSize: 2.4, gapSize: 1.1, ...o })); l.computeLineDistances(); l.position.y = .03; l.frustumCulled = false; return l;
    };
    this.scene.add(dash([[0, 0, 70], [0, 0, -700]]), dash([[-52, 0, 70], [-52, 0, -700]], { opacity: .22 }), dash([[48, 0, 60], [48, 0, -700]], { opacity: .22 }));
    for (let z = 40; z > -660; z -= 40) {                                   // repères de profondeur : traits transversaux, un sur trois plus long
      const long = Math.round(z / 40) % 3 === 0;
      const l = dash([[long ? -6 : -3, 0, z], [long ? 6 : 3, 0, z]], { dashSize: 100, gapSize: 0, opacity: .6 }); this.scene.add(l);
    }
    // courbes techniques : deux arcs de construction qui traversent le plan, loin des machines
    const arc = (cx, cz, r, a0, a1) => { const pts = []; for (let i = 0; i <= 48; i++) { const a = (a0 + (a1 - a0) * i / 48) * DEG; pts.push([cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r]); } return dash(pts, { opacity: .3, dashSize: 100, gapSize: 0 }); };
    this.scene.add(arc(60, -150, 54, 100, 260), arc(-64, -330, 70, -80, 80), arc(40, -520, 46, 120, 300));
  }

  buildObjects() {
    for (const e of this.registry.items) {
      if (e.kind === 'machine') {
        const m = new MachineController(e); this.machines.set(e.id, m); this.scene.add(m.root); this.decorate(e, m.radius);
      } else if (e.kind === 'plate') {
        this.addPlate(e);
      }
    }
    for (const p of this.registry.plates) this.addPlate(p);
    this.loadStele();
  }

  /* empreinte au sol : cercle de cote et, pour un objet surélevé, ligne de rappel verticale */
  decorate(e, r) {
    const g = new THREE.Group(); g.position.set(e.pos[0], 0, e.pos[2]);
    const c = ring(r * 1.05); g.add(c, ring(r * 1.3, 48));
    if (e.pos[1] > .5) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, e.pos[1], 0)]), lineMat({ opacity: .7 })));
    this.scene.add(g);
  }

  addPlate(e) {
    const w = 11 * (e.scale || 1), grp = new THREE.Group(); grp.position.set(e.pos[0], 0, e.pos[2]);
    const face = new THREE.Group(); face.position.y = e.pos[1] + w * .3 + 3.2; face.rotation.y = (e.yaw || 0) * DEG; grp.add(face);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a2a66 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.scale.set(w, w / (e.ratio || 1.6), 1); face.add(mesh);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), lineMat({ opacity: .9 })); frame.scale.copy(mesh.scale); frame.position.z = .01; face.add(frame);
    face.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(1, 1, .03), new THREE.MeshBasicMaterial({ color: 0xdbe6ff, transparent: true, opacity: .0 })), { visible: false }));
    // pied : fine ligne jusqu'au sol et empreinte
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, face.position.y - mesh.scale.y / 2, 0)]), lineMat({ opacity: .6 })));
    grp.add(ring(w * .35, 40));
    grp.visible = false; this.scene.add(grp);
    this.plates.set(e.id, { entry: e, group: grp, face, mesh, frame, mat, loaded: false, loading: false });
  }
  loadPlateTexture(p) {
    if (p.loaded || p.loading) return; p.loading = true;
    new THREE.TextureLoader().load(p.entry.image, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; p.mat.map = t; p.mat.color.set(0xffffff); p.mat.needsUpdate = true;
      const ratio = t.image.width / t.image.height, w = p.mesh.scale.x; p.mesh.scale.y = w / ratio; p.frame.scale.copy(p.mesh.scale); p.loaded = true;
    }, undefined, () => { p.loading = false; });
  }

  loadStele() {
    new GLTFLoader().load('assets/stele-bordeaux.glb?v=stele1', (gltf) => {
      const o = gltf.scene, box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const k = 9 / size.y; o.scale.setScalar(k); o.position.set(-c.x * k, -box.min.y * k, -c.z * k);
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      const g = new THREE.Group(); g.add(o); const home = this.registry.byId.accueil; g.position.set(home.pos[0] + 16, 0, home.pos[2] - 6); g.rotation.y = -24 * DEG;
      this.scene.add(g); this.stele = g; this.decorate({ pos: [g.position.x, 0, g.position.z] }, 4);
    }, undefined, () => {});
  }

  /* liaisons : courbes au-dessus du plan qui relient des projets ayant le même périmètre ou le même flux. Un paquet y circule. */
  buildLinks() {
    const pts = (id) => { const e = this.registry.byId[id]; return new THREE.Vector3(e.pos[0], e.pos[1] + 2.2, e.pos[2]); };
    this.packets = new THREE.Group(); this.scene.add(this.packets);
    for (const l of this.registry.links) {
      const a = pts(l.from), b = pts(l.to), mid = a.clone().lerp(b, .5); mid.y += 9; mid.x += (b.x - a.x) * .08;
      const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, .5).add(new THREE.Vector3(0, 2, 0)), mid, b.clone().lerp(mid, .5).add(new THREE.Vector3(0, 2, 0)), b]);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60));
      const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xdbe6ff, transparent: true, opacity: .6, dashSize: 1.6, gapSize: 1.2 })); line.computeLineDistances(); line.frustumCulled = false;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.38, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      this.scene.add(line); this.packets.add(dot);
      this.links.push({ spec: l, curve, line, dot, mid: curve.getPoint(.5) });
    }
  }

  /* ---------------------------------------------------------------- chargement à l'approche */
  want(id) { const m = this.machines.get(id); if (m && !m.ready && !m.loading) { this.loadQueue.push(m); this.pump(); } return m; }
  pump() {
    if (this.busy || !this.loadQueue.length) return;
    this.busy = true; const m = this.loadQueue.shift(), t0 = performance.now();
    m.load().catch((e) => { console.warn('machine indisponible', m.id, e); m.failed = true; }).finally(() => {
      this.stats.modelMs[m.id] = Math.round(performance.now() - t0); this.busy = false;
      setTimeout(() => this.pump(), 60);                                    // une machine à la fois : pas de blocage prolongé du fil principal
    });
  }

  /* ---------------------------------------------------------------- image */
  frame(path, p, dt, nowMs, selectedId) {
    this.t += dt;
    path.at(p, this.camera.position, this.tmp); this.camera.lookAt(this.tmp); this.camera.updateMatrixWorld(true);
    const cam = this.camera.position;
    this.ground.position.set(cam.x, 0, cam.z);
    this.groundMat.uniforms.uTime.value = nowMs / 1000;
    this.shadowGround.position.set(cam.x, .004, cam.z);
    // activation, apparition progressive et fréquence de mise à jour selon la distance
    const near = [];
    for (const m of this.machines.values()) { const d = Math.hypot(cam.x - m.entry.pos[0], cam.z - m.entry.pos[2]); m.dist = d; near.push(m); }
    near.sort((a, b) => a.dist - b.dist);
    const budget = this.perf.profile.nearMachines;
    near.forEach((m, rank) => {
      const sel = m.id === selectedId, d = m.dist;
      if (d < 150 && (rank < budget || sel)) this.want(m.id);
      const a = m.ready ? (sel ? 1 : smooth(165, 85, d)) : 0;
      m.appear += (a - m.appear) * (1 - Math.exp(-dt * 6));
      const show = m.ready && m.appear > .015 && (rank < budget + 2 || sel);
      m.root.visible = show;
      if (!show) return;
      m.root.scale.y = .03 + .97 * m.appear;                               // elle s'extrude du plan en approchant
      const period = sel || d < 70 ? 0 : 1 / this.perf.profile.farRate;
      if (nowMs / 1000 - m.lastUpdate >= period) { m.update(this.t); m.lastUpdate = nowMs / 1000; if (m.glowStep && (sel || d < 70)) { m.root.updateMatrixWorld(true); m.glowStep(nowMs); } }
    });
    // le soleil suit l'objet le plus proche : l'ombre ne couvre que ce qui se voit
    const lead = this.machines.get(selectedId) || near[0];
    if (lead && lead.ready) { const c = lead.worldCenter(this.cam); this.sun.target.position.set(c.x, 0, c.z); this.sun.position.set(c.x - 9 * 1.4, 22, c.z + 8 * 1.4); this.sun.target.updateMatrixWorld(); }
    // plaques : visibles à l'approche, texture chargée à la demande, face tournée vers l'axe de la caméra de façon stable
    for (const p2 of this.plates.values()) {
      const d = Math.hypot(cam.x - p2.entry.pos[0], cam.z - p2.entry.pos[2]);
      p2.group.visible = d < 170;
      if (d < 150) this.loadPlateTexture(p2);
    }
    // liaisons : dashes animés et paquets, seulement près de la caméra
    for (const l of this.links) {
      const d = Math.hypot(cam.x - l.mid.x, cam.z - l.mid.z), on = d < 190;
      l.line.visible = on; l.dot.visible = on; if (!on) continue;
      l.line.material.dashOffset = -this.t * 1.6;
      l.curve.getPoint((this.t * .12 + l.spec.from.length * .13) % 1, l.dot.position);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------------------------------------------------------- sélection et projection */
  pick(cx, cy) {
    this.ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); this.ray.setFromCamera(this.ndc, this.camera);
    let best = null, bestD = Infinity;
    for (const m of this.machines.values()) {
      if (!m.root.visible || m.appear < .5) continue;
      if (m.pick(this.ray)) { const d = m.dist; if (d < bestD) { best = m.id; bestD = d; } }
    }
    for (const p of this.plates.values()) {
      if (!p.group.visible) continue; const hit = this.ray.intersectObject(p.mesh, false);
      if (hit.length && hit[0].distance < bestD) { best = p.entry.id; bestD = hit[0].distance; }
    }
    return best;
  }
  /** Projette un point du monde en pixels d'écran. */
  project(v, out = { x: 0, y: 0, z: 0, on: false }) {
    this.cam.copy(v).project(this.camera);
    out.x = (this.cam.x * .5 + .5) * innerWidth; out.y = (-this.cam.y * .5 + .5) * innerHeight; out.z = this.cam.z; out.on = this.cam.z > -1 && this.cam.z < 1; return out;
  }
  dispose() { this.renderer.dispose(); }
}
