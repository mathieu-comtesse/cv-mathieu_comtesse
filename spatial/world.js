// SceneManager V2 : un monde profond. Plan blueprint sans bord de couloir, dalles d'exposition, murs de plan, tours filaires proches et lointaines,
// portiques et anneaux traversés par la caméra, constellations de domaine, titres couchés sur le plan, machines d'origine à leur échelle réelle.
// La caméra est celle d'un film : position, regard, champ de vision et roulis viennent de CameraTimeline ; le mode inspection s'y superpose.
import * as THREE from 'three';
import { drawMat } from '../refonte/blueprint-hero.js';
import { MachineController } from './machine.js';
import { buildSetPieces } from './setpieces.js';
import { inspectPose } from './camera-path.js';

const DEG = Math.PI / 180;
const TILE = 78;
const ease = (t) => t * t * (3 - 2 * t);

/* Plan blueprint : mêmes couleurs, grille et tracés que le plan d'origine, prolongés à l'infini. Les zones de domaine ne le teintent que très faiblement. */
function groundMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uTile: { value: TILE }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `
      varying vec3 vW;uniform sampler2D uTex;uniform float uTile;uniform vec2 uRes;uniform float uTime;
      float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float lines(vec2 p,float s){vec2 q=p/s;vec2 d=fwidth(q);vec2 l=abs(fract(q-.5)-.5)/max(d,vec2(1e-5));return 1.-min(min(l.x,l.y),1.);}
      vec3 tint(float z){
        vec3 t=vec3(0.);
        t+=vec3(.00,.05,-.03)*smoothstep(-250.,-330.,z)*(1.-smoothstep(-520.,-600.,z));    // qualité, sécurité
        t+=vec3(.03,-.015,.0)*smoothstep(-480.,-560.,z)*(1.-smoothstep(-690.,-730.,z));   // pilotage
        t+=vec3(-.01,.04,.01)*smoothstep(-690.,-740.,z)*(1.-smoothstep(-880.,-920.,z));   // automatisation
        t+=vec3(-.02,-.05,-.06)*smoothstep(-880.,-930.,z)*(1.-smoothstep(-1040.,-1080.,z));// données et IA
        t+=vec3(.05,-.03,.0)*smoothstep(-1040.,-1090.,z)*(1.-smoothstep(-1260.,-1300.,z)); // expérimentations
        return t;
      }
      void main(){
        const float K=3.6667;
        vec2 p=vW.xz*K;
        float dist=length(vW-cameraPosition)*K;
        vec3 base=vec3(.04,.255,.93)+tint(vW.z);
        vec3 col=mix(base,base+vec3(.03,.075,.05),smoothstep(150.,40.,dist));
        float fade=exp(-dist*.004);
        col+=vec3(.5,.66,1.)*lines(p,2.)*.07*fade+vec3(.78,.88,1.)*lines(p,10.)*.17*fade;
        // repères métriques : un trait plus marqué tous les 50 u, comme les graduations du plan d'origine
        col+=vec3(.9,.95,1.)*(lines(vW.xz,50.)*.20+lines(vW.xz,250.)*.32)*exp(-dist*.0011);
        vec2 g=vW.xz/uTile; vec2 id=floor(g); vec2 f=fract(g);
        float h=hash(id+3.7);
        vec2 u=f; if(h>.5)u.x=1.-u.x; if(fract(h*7.)>.5)u=u.yx;
        vec2 dx=dFdx(g),dy=dFdy(g);
        float inView=smoothstep(520.,260.,dist*.27);
        vec4 t=textureGrad(uTex,vec2(u.x,1.-u.y),dx,dy)*step(h,.62);
        col=mix(col,t.rgb,t.a*inView);
        vec4 tb=textureGrad(uTex,vec2(u.x,1.-u.y),dx*8.,dy*8.)*step(h,.62);col+=tb.rgb*tb.a*.55*inView;
        float horizon=smoothstep(900.,2600.,length(vW.xz-cameraPosition.xz));
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
  constructor(canvas, registry, timeline, perf) {
    this.canvas = canvas; this.registry = registry; this.timeline = timeline; this.perf = perf;
    this.camera = new THREE.PerspectiveCamera(46, 1, .8, 2400);
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(0x03060f, 240, 1900);
    this.machines = new Map(); this.plates = new Map(); this.links = [];
    this.t = 0; this.pose = {}; this.baseFov = 46;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.tmp = new THREE.Vector3(); this.cam = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
    this.loadQueue = []; this.busy = false; this.stats = { webglInitMs: 0, modelMs: {}, optimize: {} };
    this.fovBias = 1;
  }

  init() {
    const t0 = performance.now();
    const gl = this.canvas.getContext('webgl2', { antialias: this.perf.level < 2, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL 2 indisponible');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, context: gl });
    this.renderer.setClearColor(0x03060f, 1); this.renderer.localClippingEnabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.setPixelRatio(this.perf.pixelRatio); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b8e6, 1.9));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.3); this.sun.castShadow = true; this.sun.shadow.bias = -.0005; this.sun.shadow.radius = 5;
    Object.assign(this.sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 110 });
    this.scene.add(this.sun, this.sun.target); this.applyShadowSize();
    const tex = new THREE.CanvasTexture(drawMat(1024)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex = tex;
    this.groundMat = groundMaterial(tex);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), this.groundMat); this.ground.rotation.x = -Math.PI / 2; this.ground.frustumCulled = false;
    this.shadowGround = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: .38, color: 0x000a50 })); this.shadowGround.rotation.x = -Math.PI / 2; this.shadowGround.position.y = .004; this.shadowGround.receiveShadow = true; this.shadowGround.frustumCulled = false;
    this.scene.add(this.ground, this.shadowGround);
    const fontsReady = (document.fonts?.load ? document.fonts.load('400 120px "Instrument Serif"') : Promise.resolve()).then(() => document.fonts?.ready).catch(() => {}).then(() => { this.tex.image = drawMat(1024); this.tex.needsUpdate = true; });
    this.pieces = buildSetPieces({ scene: this.scene, registry: this.registry, timeline: this.timeline, fontsReady });
    this.buildObjects(); this.buildLinks(); this.resize();
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
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    this.groundMat.uniforms.uRes.value.set(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
    this.applyFov(this.baseFov);
  }
  /** Champ vertical : les valeurs du storyboard sont données pour 16:9, le champ horizontal reste constant sur écran plus étroit. */
  applyFov(fov) {
    // la pièce impose sa propre projection (déjà adaptée à l'écran) : on s'y accorde exactement au repos, puis le champ s'élargit sur écran étroit
    const a = this.camera.aspect, wide = a >= 1.6 ? fov : Math.min(84, 2 * Math.atan(Math.tan(fov * DEG / 2) * 1.6 / a) / DEG), fv = wide + (fov - wide) * (this.roomW || 0);
    if (Math.abs(this.camera.fov - fv) > 1e-4) { this.camera.fov = fv; this.camera.updateProjectionMatrix(); }
  }

  buildObjects() {
    for (const e of this.registry.items) {
      if (e.kind === 'machine') { const m = new MachineController(e); this.machines.set(e.id, m); this.scene.add(m.root); this.decorate(e, 8 * (e.scale || 1)); }
      else if (e.kind === 'plate') this.addPlate(e);
    }
    for (const p of this.registry.plates) this.addPlate(p);
  }
  decorate(e, r) {
    const g = new THREE.Group(); g.position.set(e.pos[0], 0, e.pos[2]); g.add(ring(r * 1.1), ring(r * 1.38, 48));
    if (e.pos[1] > .5) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, e.pos[1], 0)]), lineMat({ opacity: .7 })));
    this.scene.add(g);
  }
  addPlate(e) {
    const w = 11 * (e.scale || 1), grp = new THREE.Group(); grp.position.set(e.pos[0], 0, e.pos[2]);
    const face = new THREE.Group(); face.position.y = e.pos[1] + w / (e.ratio || 1.6) / 2 + 1.4; face.rotation.y = (e.yaw || 0) * DEG; grp.add(face);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a2a66 }), mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.scale.set(w, w / (e.ratio || 1.6), 1); face.add(mesh);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), lineMat({ opacity: .9 })); frame.scale.copy(mesh.scale); frame.position.z = .01; face.add(frame);
    const stand = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, face.position.y - mesh.scale.y / 2, 0)]), lineMat({ opacity: .6 })); grp.add(stand);
    grp.add(ring(w * .35, 40)); grp.visible = false; this.scene.add(grp);
    this.plates.set(e.id, { entry: e, group: grp, face, mesh, frame, mat, stand, loaded: false, loading: false });
  }
  loadPlateTexture(p) {
    if (p.loaded || p.loading) return; p.loading = true;
    new THREE.TextureLoader().load(p.entry.image, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; p.mat.map = t; p.mat.color.set(0xffffff); p.mat.needsUpdate = true;
      const ratio = t.image.width / t.image.height, w = p.mesh.scale.x; p.mesh.scale.y = w / ratio; p.frame.scale.copy(p.mesh.scale); p.face.position.y = p.entry.pos[1] + p.mesh.scale.y / 2 + 1.4;
      p.stand.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, p.face.position.y - p.mesh.scale.y / 2, 0)]); p.loaded = true;
    }, undefined, () => { p.loading = false; });
  }
  buildLinks() {
    const pts = (id) => { const e = this.registry.byId[id]; return new THREE.Vector3(e.pos[0], e.pos[1] + 3, e.pos[2]); };
    this.packets = new THREE.Group(); this.scene.add(this.packets);
    for (const l of this.registry.links) {
      const a = pts(l.from), b = pts(l.to), mid = a.clone().lerp(b, .5); mid.y += 16 + a.distanceTo(b) * .1;
      const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, .5).add(new THREE.Vector3(0, 3, 0)), mid, b.clone().lerp(mid, .5).add(new THREE.Vector3(0, 3, 0)), b]);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)), new THREE.LineDashedMaterial({ color: 0xdbe6ff, transparent: true, opacity: .6, dashSize: 1.8, gapSize: 1.3 })); line.computeLineDistances(); line.frustumCulled = false;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
      this.scene.add(line); this.packets.add(dot); this.links.push({ spec: l, curve, line, dot, mid: curve.getPoint(.5) });
    }
  }

  /* ---------------------------------------------------------------- chargement à l'approche */
  want(id) { const m = this.machines.get(id); if (m && !m.ready && !m.loading && !m.failed) { this.loadQueue.push(m); this.pump(); } return m; }
  pump() {
    if (this.busy || !this.loadQueue.length) return;
    this.busy = true; const m = this.loadQueue.shift(), t0 = performance.now();
    m.load(!new URLSearchParams(location.search).has('noopt')).catch((e) => { console.warn('machine indisponible', m.id, e); m.failed = true; }).finally(() => {
      this.stats.modelMs[m.id] = Math.round(performance.now() - t0); if (m.optimizeStats) this.stats.optimize[m.id] = m.optimizeStats;
      this.busy = false; setTimeout(() => this.pump(), 50);
    });
  }

  /* ---------------------------------------------------------------- image */
  /** u : position de défilement. inspectE : mélange avec la pose d'inspection du projet sélectionné (0 à 1). */
  frame(u, dt, nowMs, selectedId, inspectE = 0, blendId = selectedId) {
    this.t += dt;
    const pose = this.timeline.at(u, this.pose); let { fov } = pose, roll = pose.roll;
    const cam = this.camera;
    if (inspectE > 0 && blendId) {
      const ip = inspectPose(this.registry.byId[blendId]), e = ease(Math.min(1, inspectE));
      this.tmp.copy(pose.pos).lerp(ip.pos, e); this.tmp2.copy(pose.look).lerp(ip.look, e); fov += (ip.fov - fov) * e; roll += (0 - roll) * e;
      cam.position.copy(this.tmp); cam.up.set(0, 1, 0); cam.lookAt(this.tmp2);
    } else { cam.position.copy(pose.pos); cam.up.set(0, 1, 0); cam.lookAt(pose.look); }
    if (roll) cam.rotateZ(roll);
    this.baseFov = fov; this.applyFov(fov); cam.updateMatrixWorld(true);
    const cp = cam.position;
    this.ground.position.set(cp.x, 0, cp.z); this.shadowGround.position.set(cp.x, .004, cp.z); this.groundMat.uniforms.uTime.value = nowMs / 1000;
    // machines : le modèle réel apparaît à l'approche de la caméra, à son échelle de scène. Au loin, sa silhouette filaire le remplace.
    const list = [...this.machines.values()];
    for (const m of list) { m.dist = Math.hypot(cp.x - m.entry.pos[0], cp.y - m.entry.pos[1] - 4, cp.z - m.entry.pos[2]); }
    list.sort((a, b) => a.dist - b.dist);
    const budget = this.perf.profile.nearMachines;
    list.forEach((m, rank) => {
      const sel = m.id === selectedId, limit = m.entry.priority ? 230 : 175, was = m.root.visible, lim = was ? limit + 28 : limit;
      if (m.dist < limit + 70 && (rank <= budget || sel)) this.want(m.id);
      const show = m.ready && (sel || (m.dist < lim && rank < budget));
      m.root.visible = show; m.root.scale.y = 1;
      const sil = this.pieces.silhouettes.get(m.id); if (sil) sil.visible = !show;
      if (!show) return;
      const period = sel || m.dist < 90 ? 0 : 1 / this.perf.profile.farRate;
      if (nowMs / 1000 - m.lastUpdate >= period) { m.update(this.t); m.lastUpdate = nowMs / 1000; if (m.glowStep && (sel || m.dist < 90)) { m.root.updateMatrixWorld(true); m.glowStep(nowMs); } }
    });
    const lead = this.machines.get(selectedId) || list[0];
    if (lead && lead.ready) { const c = lead.worldCenter(this.cam); this.sun.target.position.set(c.x, c.y - 4, c.z); this.sun.position.set(c.x - 14, c.y + 28, c.z + 12); this.sun.target.updateMatrixWorld(); }
    for (const p2 of this.plates.values()) { const d = Math.hypot(cp.x - p2.entry.pos[0], cp.z - p2.entry.pos[2]); p2.group.visible = d < 330; if (d < 260) this.loadPlateTexture(p2); }
    for (const l of this.links) { const d = Math.hypot(cp.x - l.mid.x, cp.z - l.mid.z), on = d < 260; l.line.visible = on; l.dot.visible = on; if (!on) continue; l.line.material.dashOffset = -this.t * 1.6; l.curve.getPoint((this.t * .12 + l.spec.from.length * .13) % 1, l.dot.position); }
    try { this.renderer.render(this.scene, cam); } catch (e) { if (this.onRenderError) this.onRenderError(e); else throw e; }
  }

  /* ---------------------------------------------------------------- sélection et projection */
  pick(cx, cy) {
    this.ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); this.ray.setFromCamera(this.ndc, this.camera);
    let best = null, bestD = Infinity;
    for (const m of this.machines.values()) { if (!m.root.visible) continue; if (m.pick(this.ray) && m.dist < bestD) { best = m.id; bestD = m.dist; } }
    for (const p of this.plates.values()) { if (!p.group.visible) continue; const hit = this.ray.intersectObject(p.mesh, false); if (hit.length && hit[0].distance < bestD) { best = p.entry.id; bestD = hit[0].distance; } }
    return best;
  }
  project(v, out = { x: 0, y: 0, z: 0, on: false }) { this.cam.copy(v).project(this.camera); out.x = (this.cam.x * .5 + .5) * innerWidth; out.y = (-this.cam.y * .5 + .5) * innerHeight; out.z = this.cam.z; out.on = this.cam.z > -1 && this.cam.z < 1; return out; }
  dispose() { this.renderer.dispose(); }
}
