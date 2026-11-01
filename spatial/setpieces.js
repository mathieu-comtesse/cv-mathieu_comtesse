// Décors du blueprint : tout ce qui fait la profondeur autour des machines. Aucun hasard non reproductible : suites pseudo-aléatoires à graine fixe.
// Les volumes proches (poutres, portiques, anneaux, tours) sont placés par rapport à la trajectoire de la caméra, donc ils passent réellement
// près d'elle (parallaxe), tandis que d'autres structures restent au loin. Un seul tampon de lignes par famille limite les appels de rendu.
import * as THREE from 'three';
import { drawMat } from '../refonte/blueprint-hero.js';

const DEG = Math.PI / 180;
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/** Accumulateur de segments : tout le filaire d'une famille part dans une seule géométrie. */
class Lines {
  constructor() { this.p = []; }
  seg(a, b) { this.p.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
  box(cx, cy, cz, w, h, d, yaw = 0, levels = 0) {                       // cy = base ; boîte filaire avec niveaux et croisillons optionnels
    const c = Math.cos(yaw), s = Math.sin(yaw), P = (x, y, z) => [cx + x * c - z * s, cy + y, cz + x * s + z * c];
    const hw = w / 2, hd = d / 2, ring = (y) => [P(-hw, y, -hd), P(hw, y, -hd), P(hw, y, hd), P(-hw, y, hd)];
    const lv = [0, ...Array.from({ length: levels }, (_, i) => h * (i + 1) / (levels + 1)), h];
    for (const y of lv) { const r = ring(y); for (let i = 0; i < 4; i++) this.seg(r[i], r[(i + 1) % 4]); }
    const b = ring(0), t = ring(h); for (let i = 0; i < 4; i++) this.seg(b[i], t[i]);
    if (levels > 0) for (let i = 0; i < lv.length - 1; i++) { const r0 = ring(lv[i]), r1 = ring(lv[i + 1]); this.seg(r0[0], r1[1]); this.seg(r0[2], r1[3]); }   // croisillons
  }
  circle(c, r, axis = 'y', seg = 72, a0 = 0, a1 = 360) {
    let prev = null;
    for (let i = 0; i <= seg; i++) {
      const a = (a0 + (a1 - a0) * i / seg) * DEG, u = Math.cos(a) * r, v = Math.sin(a) * r;
      const p = axis === 'y' ? [c[0] + u, c[1], c[2] + v] : axis === 'x' ? [c[0], c[1] + u, c[2] + v] : [c[0] + u, c[1] + v, c[2]];
      if (prev) this.seg(prev, p); prev = p;
    }
  }
  /** Ligne de cote : trait, deux butées et des graduations. */
  dim(a, b, up = [0, 1, 0], tick = 1.2) {
    this.seg(a, b); const n = 8;
    for (const p of [a, b]) this.seg([p[0] - up[0] * tick, p[1] - up[1] * tick, p[2] - up[2] * tick], [p[0] + up[0] * tick, p[1] + up[1] * tick, p[2] + up[2] * tick]);
    for (let i = 1; i < n; i++) { const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], k = i % 4 === 0 ? .8 : .4; this.seg([p[0] - up[0] * k, p[1] - up[1] * k, p[2] - up[2] * k], [p[0] + up[0] * k, p[1] + up[1] * k, p[2] + up[2] * k]); }
  }
  build(opacity, color = 0xa9c4ff) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })); l.frustumCulled = false; return l;
  }
}

/** Texture de titre : lettres en contour (trait de plan), très légèrement remplies. */
function titleTexture(lines, font) {
  const W = 2048, lh = 300, H = lh * lines.length + 60, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.font = `400 ${lh * .86}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  lines.forEach((t, i) => { const y = 30 + lh * (i + .52); g.fillStyle = 'rgba(214,228,255,.10)'; g.fillText(t, W / 2, y); g.lineWidth = 3.2; g.strokeStyle = 'rgba(238,244,255,.95)'; g.strokeText(t, W / 2, y); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, aspect: W / H };
}

/** Dalle technique (pont d'exposition d'une machine) : dessus quadrillé, tranche foncée, arêtes vives, pieds jusqu'au sol. */
function deckMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFog: { value: 1 } },
    vertexShader: 'varying vec3 vP;varying vec3 vN;void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vP;varying vec3 vN;
      float lines(vec2 p,float s){vec2 q=p/s;vec2 d=fwidth(q);vec2 l=abs(fract(q-.5)-.5)/max(d,vec2(1e-5));return 1.-min(min(l.x,l.y),1.);}
      void main(){
        vec3 top=vec3(.05,.30,.96);
        vec3 col=vN.y>.5?top+vec3(.5,.66,1.)*lines(vP.xz,2.)*.10+vec3(.78,.88,1.)*lines(vP.xz,10.)*.22:vec3(.02,.10,.42);
        gl_FragColor=vec4(col,1.);}`
  });
}

export function buildSetPieces({ scene, registry, timeline, fontsReady }) {
  const out = { update() {}, tags: [], titles: [], silhouettes: new Map(), hubs: [] };
  const L = { near: new Lines(), far: new Lines(), faint: new Lines() };
  const proj = registry.items.filter((s) => s.kind === 'machine' || s.kind === 'plate');
  const farFromProjects = (x, z, r) => proj.every((s) => Math.hypot(x - s.pos[0], z - s.pos[2]) > r);

  /* ---- 1. tours filaires de part et d'autre de la trajectoire : rangées proches (parallaxe) et rangées lointaines (échelle) ---- */
  const step = 13, total = timeline.length, P = new THREE.Vector3(), Q = new THREE.Vector3();
  let sampledLen = 0, prev = timeline.at(0, {}).pos.clone();
  for (let u = 0; u <= total; u += 40) {
    const cur = timeline.at(u, {}).pos; sampledLen += cur.distanceTo(prev);
    if (sampledLen < step) { prev.copy(cur); continue; } sampledLen = 0;
    const f = timeline.at(Math.min(total, u + 60), {}).pos.clone().sub(cur); f.y = 0; if (f.lengthSq() < 1e-6) { prev.copy(cur); continue; } f.normalize();
    const side = new THREE.Vector3(-f.z, 0, f.x);
    for (const sg of [-1, 1]) {
      const near = 22 + rnd() * 22, far = 80 + rnd() * 120;
      for (const [off, kind] of [[near, 'near'], [far, 'far']]) {
        if (kind === 'near' && rnd() < .15) continue;
        const x = cur.x + side.x * sg * off, z = cur.z + side.z * sg * off;
        if (!farFromProjects(x, z, kind === 'near' ? 27 : 22)) continue;
        const h = kind === 'near' ? 16 + Math.pow(rnd(), 1.3) * 72 : 40 + Math.pow(rnd(), 1.2) * 130, w = 4 + rnd() * 9, d = 4 + rnd() * 9;
        L[kind].box(x, 0, z, w, h, d, rnd() * Math.PI, Math.floor(h / 7));
        if (kind === 'near' && rnd() < .5) L.near.dim([x - w, 0, z + d], [x - w, h, z + d], [1, 0, 0]);   // ligne de cote verticale
      }
    }
    prev.copy(cur);
  }

  /* rangées régulières de tours, comme les files de volumes de la vidéo de référence : zones où la caméra longe une enfilade */
  for (const [u0, u1] of [[2000, 4500], [9400, 12000], [14400, 16200], [19000, 21600]]) {
    for (let u = u0, j = 0; u < u1; u += 120, j++) {
      const c = timeline.at(u, {}).pos, f = timeline.at(u + 60, {}).pos.clone().sub(c); f.y = 0; if (f.lengthSq() < 1e-6) continue; f.normalize();
      const side = new THREE.Vector3(-f.z, 0, f.x);
      for (const sg of [-1, 1]) { const x = c.x + side.x * sg * 44, z = c.z + side.z * sg * 44; if (!farFromProjects(x, z, 28)) continue; L.near.box(x, 0, z, 6, 30 + (j % 3) * 14, 6, Math.atan2(f.x, f.z), 5); L.near.dim([x + 5, 0, z], [x + 5, 30 + (j % 3) * 14, z], [1, 0, 0]); }
    }
  }

  /* ---- 2. poutres de premier plan : elles passent à quelques unités de la caméra ---- */
  for (let i = 0; i < 44; i++) {
    const u = 500 + i * (total - 900) / 44, c = timeline.at(u, {}).pos.clone(), f = timeline.at(u + 80, {}).pos.clone().sub(c); f.y = 0; f.normalize();
    const sg = i % 2 ? 1 : -1, side = new THREE.Vector3(-f.z, 0, f.x), off = 8 + (i % 3) * 3.5, x = c.x + side.x * sg * off, z = c.z + side.z * sg * off, yaw = Math.atan2(f.x, f.z);
    if (!farFromProjects(x, z, 20)) continue;
    L.near.box(x, c.y - 6 + (i % 4) * 2.5, z, .8, .8, 30 + (i % 3) * 10, yaw, 0);
    L.near.dim([x - f.z * 14, c.y - 8, z + f.x * 14], [x + f.z * 14 + f.x * 8, c.y - 8, z - f.x * 14 + f.z * 8], [0, 1, 0]);
  }

  /* cadres et cercles de référence flottants au premier plan : ils glissent sur les côtés de l'image à chaque déplacement */
  for (let i = 0; i < 46; i++) {
    const u = 300 + i * (total - 600) / 46 + (i % 5) * 37, c = timeline.at(u, {}).pos.clone(), f = timeline.at(u + 80, {}).pos.clone().sub(c); f.y = 0; if (f.lengthSq() < 1e-6) continue; f.normalize();
    const sg = i % 3 === 0 ? 1 : -1, side = new THREE.Vector3(-f.z, 0, f.x), off = 9 + (i % 4) * 2.2, x = c.x + side.x * sg * off + f.x * 6, z = c.z + side.z * sg * off + f.z * 6, y = c.y - 2 + ((i * 7) % 9) - 4;
    if (!farFromProjects(x, z, 18)) continue;
    const yaw = Math.atan2(f.x, f.z) + (i % 2 ? .5 : -.5), cs = Math.cos(yaw), sn = Math.sin(yaw), w = 9 + (i % 3) * 3, h = 6 + (i % 4) * 2;
    if (i % 3 === 2) L.near.circle([x, y, z], 4 + (i % 4) * 1.6, 'x', 48);
    else { const Pp = (a, b) => [x + a * cs, y + b, z - a * sn]; L.near.seg(Pp(-w / 2, -h / 2), Pp(w / 2, -h / 2)); L.near.seg(Pp(w / 2, -h / 2), Pp(w / 2, h / 2)); L.near.seg(Pp(w / 2, h / 2), Pp(-w / 2, h / 2)); L.near.seg(Pp(-w / 2, h / 2), Pp(-w / 2, -h / 2)); L.near.dim(Pp(-w / 2, -h / 2 - 1.4), Pp(w / 2, -h / 2 - 1.4), [0, 1, 0], .7); }
  }

  /* ---- 3. portiques traversables : cadres filaires gradués posés sur la trajectoire, la caméra passe au centre ---- */
  for (const gu of [1850, 4200, 7250, 9600, 12300, 14800, 17100]) {
    const c = timeline.at(gu, {}).pos, f = timeline.at(gu + 40, {}).pos.clone().sub(c).normalize(), yaw = Math.atan2(f.x, f.z);
    if (!farFromProjects(c.x, c.z, 24)) continue;
    const w = 34, h = 24, cs = Math.cos(yaw), sn = Math.sin(yaw), Pp = (x, y) => [c.x + x * cs, c.y + y - 8, c.z - x * sn];
    for (const [k, sc] of [[1, 1], [.78, .78]]) { const a = Pp(-w / 2 * sc, 0), b = Pp(w / 2 * sc, 0), cc = Pp(w / 2 * sc, h * sc), d = Pp(-w / 2 * sc, h * sc); L.near.seg(a, b); L.near.seg(b, cc); L.near.seg(cc, d); L.near.seg(d, a); }
    L.near.dim(Pp(-w / 2, -2.5), Pp(w / 2, -2.5), [0, 1, 0]);
  }

  /* ---- 4. anneaux : une traversée en série vers le Lecteur VRE, plus quelques anneaux de repère ---- */
  for (let i = 0; i < 6; i++) {
    const u = 16300 + i * 360, c = timeline.at(u, {}).pos, f = timeline.at(u + 40, {}).pos.clone().sub(c).normalize(), yaw = Math.atan2(f.x, f.z);
    const ring = (r) => { const pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r; pts.push([c.x + x * Math.cos(yaw), c.y + y - 4, c.z - x * Math.sin(yaw)]); } for (let k = 0; k < 64; k++) L.near.seg(pts[k], pts[k + 1]); };
    ring(16 - i * .5); if (i % 2 === 0) ring(12.5 - i * .5);
  }

  /* ---- 5. arcs de construction : courbes qui balayent le plan, certaines se prolongent hors du champ ---- */
  for (let i = 0; i < 14; i++) {
    const z = -80 - i * 95 - rnd() * 40, x = (i % 2 ? 1 : -1) * (60 + rnd() * 120), r0 = 40 + rnd() * 80;
    for (let k = 0; k < 3; k++) L.faint.circle([x, .05, z], r0 + k * 16, 'y', 90, rnd() * 360, 200 + rnd() * 120);
  }

  /* ---- 6. silhouettes lointaines : volume enveloppant de chaque machine, visible tant que le modèle n'est pas chargé ---- */
  for (const s of registry.items) {
    if (s.kind !== 'machine') continue;
    const l = new Lines(), k = s.scale || 1; l.box(0, 0, 0, 15 * k, 10.5 * k, 11 * k, 0, 1); l.circle([0, 0, 0], 11 * k, 'y', 48);
    const m = l.build(.75, 0xdbe6ff); m.position.set(s.pos[0], s.pos[1], s.pos[2]); m.rotation.y = (s.yaw || 0) * DEG; scene.add(m); out.silhouettes.set(s.id, m);
  }

  scene.add(L.near.build(.62), L.far.build(.34), L.faint.build(.22));

  /* ---- 7. dalles d'exposition des machines surélevées, avec pieds ---- */
  const deckMat = deckMaterial();
  const decks = [['vre', 46, 36, 0, 0], ['pa', 40, 30, 7, -5], ['powerbi', 34, 26, 0, 0], ['suivi', 28, 22, 0, 0], ['studio', 30, 24, 0, 0], ['vm', 30, 24, 0, 0], ['moteur44', 26, 22, 0, 0]];
  for (const [id, w, d, rx, rz] of decks) {
    const e = registry.byId[id]; if (!e || e.pos[1] < .5) continue;
    const g = new THREE.Group(); g.position.set(e.pos[0], e.pos[1] - .6, e.pos[2]); g.rotation.set(rx * DEG, (e.yaw || 0) * DEG * .35, rz * DEG);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), deckMat); g.add(m);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xeaf1ff })); g.add(edge);
    const legs = new Lines(); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) legs.seg([sx * (w / 2 - 1.5), -.6, sz * (d / 2 - 1.5)], [sx * (w / 2 - 1.5), -(e.pos[1] - .6), sz * (d / 2 - 1.5)]);
    g.add(legs.build(.8, 0xdbe6ff)); scene.add(g);
  }

  /* ---- 8. murs de plan : grands dessins verticaux derrière certaines scènes, pour l'occlusion et l'échelle ---- */
  const wallTex = new THREE.CanvasTexture(drawMat(1024)); wallTex.colorSpace = THREE.SRGBColorSpace; wallTex.anisotropy = 4;
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide });
  const walls = [[-6, 24, -300, 90, 48, 24], [-96, 20, -520, 80, 40, 80], [76, 20, -700, 84, 42, -60], [-60, 18, -940, 76, 38, 70], [60, 24, -1060, 90, 46, -30]];
  for (const [x, y, z, w, h, yaw] of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(x, y, z); m.rotation.y = yaw * DEG; m.frustumCulled = false; scene.add(m);
    const l = new Lines(); l.seg([-w / 2, -h / 2, 0], [w / 2, -h / 2, 0]); l.seg([w / 2, -h / 2, 0], [w / 2, h / 2, 0]); l.seg([w / 2, h / 2, 0], [-w / 2, h / 2, 0]); l.seg([-w / 2, h / 2, 0], [-w / 2, -h / 2, 0]);
    for (let i = 1; i < 6; i++) l.seg([-w / 2, -h / 2 + h * i / 6, 0], [w / 2, -h / 2 + h * i / 6, 0]);
    const e = l.build(.55); e.position.copy(m.position); e.rotation.copy(m.rotation); scene.add(e);
  }

  /* ---- 9. constellations : un point de repère par domaine, visible de très loin, avec son étiquette ---- */
  const HUBS = [['01 · Maintenance et exploitation', -4, 7, -112], ['02 · Qualité, sécurité, environnement', 22, 12, -306], ['03 · Pilotage par la donnée', -26, 10, -520], ['04 · Automatisation', 8, 9, -716], ['05 · Données et intelligence artificielle', 4, 9, -905], ['06 · Expérimentations', -2, 9, -1062], ['07 · Parcours et contact', -6, 9, -1262]];
  const pts = [], conn = new Lines();
  HUBS.forEach(([label, x, y, z], hi) => {
    const hub = [x, y, z]; for (let i = 0; i < 70; i++) { const a = rnd() * 6.283, b = (rnd() - .5) * 2.2, r = 5 + Math.pow(rnd(), .6) * 22, p = [x + Math.cos(a) * r, y + b * r * .45, z + Math.sin(a) * r]; pts.push(...p); if (i % 3 === 0) conn.seg(hub, p); }
    pts.push(x, y, z); out.tags.push({ text: label, pos: [x, y + 4, z], range: 520, kind: 'domain' });
    out.hubs.push({ id: label, pos: hub });
  });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32; { const g = dot.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 13, 0, 6.2832); g.fill(); }
  const pm = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false, map: new THREE.CanvasTexture(dot), alphaTest: .4, transparent: true, opacity: .9, depthWrite: false })); pm.frustumCulled = false; scene.add(pm, conn.build(.35, 0xdbe6ff));

  /* ---- 10. grands titres de domaine, couchés sur le plan comme dans le voyage de référence, lus depuis la caméra en approche ---- */
  const TITLES = [[['MAINTENANCE'], -6, -92, 118, 0], [['QUALITÉ', 'SÉCURITÉ'], 28, -270, 94, 8], [['PILOTAGE'], -34, -498, 112, -6], [['AUTOMATISATION'], 14, -690, 132, 4], [['DONNÉES', 'ET IA'], 8, -880, 86, -4], [['EXPÉRIMENTATIONS'], 0, -1042, 150, 0], [['PARCOURS'], -6, -1238, 106, 0]];
  fontsReady.then(() => {
    for (const [lines, x, z, w, yaw] of TITLES) {
      const { tex, aspect } = titleTexture(lines, '"Instrument Serif", Georgia, serif');
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / aspect), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .95 }));
      m.rotation.set(-Math.PI / 2, 0, yaw * DEG, 'YXZ'); m.position.set(x, .14, z); m.renderOrder = 2; m.frustumCulled = false; scene.add(m); out.titles.push(m);
    }
  });

  /* ---- 11. repères textuels discrets : cotes et coordonnées, apparaissent à bonne distance ---- */
  for (const [t, x, y, z] of [['x: 2.58993', 30, 3, -60], ['y: 0.33000', 30, 2, -60], ['échelle 1 u = 1 cm', -50, 2, -200], ['rév. 2026.10', -50, 1, -200], ['cote 18,40 m', 82, 4, -260], ['z: 0.99998', 64, 2, -640], ['commit : a3f9c1e', -90, 3, -880], ['iso 9001 · 45001 · 22301', 70, 3, -1000]]) out.tags.push({ text: t, pos: [x, y, z], range: 150, kind: 'mono' });
  return out;
}
