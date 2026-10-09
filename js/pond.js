import { THREE, group, canvasTexture, rng } from './kit.js?v=cv-scene-v28';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

/* ───────────── Étang vivant ─────────────
 * Repère local : origine au centre du plan d'eau, surface en y = 0 ; +x droite, +z vers la caméra.
 *  - rive irrégulière (rayon variable en fonction de l'angle), qui passe sous le ponton ;
 *  - eau transparente (reflets, éclats, écume, ondes de pluie), fond de sable à ondulations et caustiques ;
 *  - plantes : herbe à rubans, cornifle, boules de mousse, tiges de nénuphars ; sur la rive : roseaux, massettes, iris ;
 *  - koï, petits poissons argentés, nénuphars et lotus ; brume en volutes, pluie, ronds d'eau autour des rochers et des pieux.
 * `update(t, night, k)` reçoit la météo k = { rain, mist, cloud }. */

export const TAU = Math.PI * 2;
const GLSL_HASH = `float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }`;

/* ─── contour aléatoire ─── */
function makeShape(seed, { rx = 2.6, rzBack = 1.0, rzFront = 2.3, floorZ = null } = {}) {
  const r = rng(seed), ph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU, r() * TAU];
  const radius = (th) => {
    const c = Math.cos(th), s = Math.sin(th), rz = (rzFront + rzBack) / 2 + (rzFront - rzBack) / 2 * s;
    const R0 = 1 / Math.sqrt((c / rx) ** 2 + (s / rz) ** 2);
    return R0 * (1 + 0.13 * Math.sin(2 * th + ph[0]) + 0.1 * Math.sin(3 * th + ph[1]) + 0.07 * Math.sin(5 * th + ph[2]) + 0.045 * Math.sin(8 * th + ph[3]) + 0.02 * Math.sin(13 * th + ph[4]));
  };
  const at = (th, f = 1) => { const R = radius(th) * f; let x = Math.cos(th) * R, z = Math.sin(th) * R; if (floorZ !== null && z < floorZ) z = floorZ; return [x, z]; };
  const frac = (x, z) => Math.hypot(x, z) / radius(Math.atan2(z, x));     // 1 = sur la rive
  return { radius, at, frac };
}
const depthAt = (f) => { const u = Math.min(1, Math.max(0, (1 - f) * 1.5)); return 0.12 + 0.52 * u * u * (3 - 2 * u); };     // profondeur du fond (m) selon la distance à la rive

/** maillage polaire : (anneaux × segments), position via cb(th, f) → [x, y, z] */
function polarGrid(rings, segs, cb) {
  const pos = [], aS = [], idx = [];
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) { const th = (j / segs) * TAU, f = i / rings; const p = cb(th, f); pos.push(p[0], p[1], p[2]); aS.push(f); }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + segs + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ─── eau ─── */
function waterMaterial(uni) {
  return new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `
      uniform float uTime, uRain; attribute float aS; varying float vH, vS; varying vec2 vP; varying vec3 vN;
      float wave(vec2 p){ float a = 0.5 + uRain * 0.5; return (sin(p.x*2.1+uTime*1.1)*0.5 + sin(p.y*3.3-uTime*1.4+p.x)*0.35 + sin((p.x+p.y)*5.2+uTime*2.1)*0.15 * (1.0 + uRain)) * a; }
      void main(){
        vec3 p = position; float h = wave(p.xz) * 0.026; p.y += h; vH = h; vP = p.xz; vS = aS;
        float e = 0.05; vN = normalize(vec3(-(wave(p.xz + vec2(e,0.0)) - wave(p.xz - vec2(e,0.0))) * 0.026 / (2.0*e), 1.0, -(wave(p.xz + vec2(0.0,e)) - wave(p.xz - vec2(0.0,e))) * 0.026 / (2.0*e)));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uNight, uRain, uMist, uCloud; varying float vH, vS; varying vec2 vP; varying vec3 vN;
      ${GLSL_HASH}
      float rings(vec2 p, float t){
        vec2 q = p * 5.0, g = floor(q); float acc = 0.0;
        for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
          vec2 id = g + vec2(float(i), float(j)); float h = h21(id);
          vec2 c = id + vec2(fract(h * 7.7), fract(h * 3.3));
          float ph = fract(t * 0.75 + h * 9.0), d = length(q - c);
          acc += exp(-pow((d - ph * 0.85) * 13.0, 2.0)) * (1.0 - ph);
        }
        return acc;
      }
      void main(){
        float deep = smoothstep(0.0, 0.55, 1.0 - vS);
        vec3 cDeep = mix(vec3(0.04, 0.33, 0.42), vec3(0.02, 0.07, 0.17), uNight);
        vec3 cShal = mix(vec3(0.20, 0.62, 0.64), vec3(0.06, 0.2, 0.32), uNight);
        vec3 col = mix(cShal, cDeep, deep);
        float fres = pow(1.0 - clamp(vN.y, 0.0, 1.0), 0.6) * 6.0 + 0.12;
        vec3 sky = mix(vec3(0.82, 0.92, 1.0), vec3(0.18, 0.26, 0.5), uNight);
        sky = mix(sky, vec3(0.66, 0.7, 0.75), uCloud * 0.7);
        col = mix(col, sky, clamp(fres, 0.0, 0.55));
        float sp = step(0.9925, h21(floor(vP * 46.0) + floor(uTime * 1.6))) * smoothstep(0.55, 1.0, vN.y + sin(vP.x * 11.0 + uTime * 2.0) * 0.1);
        col += vec3(1.0, 0.98, 0.9) * sp * (1.0 - uCloud) * (1.0 - uNight * 0.7);
        float stripe = sin(vP.y * 9.0 - uTime * 1.2 + sin(vP.x * 3.0) * 1.4);
        float foam = smoothstep(0.012, 0.026, vH) * 0.45 + smoothstep(0.95, 0.995, stripe) * 0.14 * (0.4 + uRain);
        float shore = smoothstep(0.9, 1.0, vS) * (0.55 + 0.45 * sin(uTime * 1.2 + vP.x * 3.0 + vP.y * 2.0)) * (0.6 + 0.4 * vnoise(vP * 7.0 + uTime * 0.2));
        float rg = uRain > 0.02 ? rings(vP, uTime) * uRain : 0.0;
        col = mix(col, mix(vec3(0.95, 0.98, 1.0), vec3(0.45, 0.6, 0.85), uNight), clamp(foam * 0.8 + shore * 0.75 + rg * 0.55, 0.0, 1.0));
        col = mix(col, vec3(dot(col, vec3(0.33))) * vec3(0.95, 1.0, 1.04), uCloud * 0.35 + uMist * 0.2);
        float a = mix(0.5, 0.78, deep) + fres * 0.12 + foam * 0.3 + shore * 0.35 + rg * 0.25 + uCloud * 0.06;
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.94));
      }`,
  });
}

/* ─── fond de sable ─── */
function sandMaterial(uni) {
  return new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `attribute float aS; varying vec2 vP; varying float vS, vY; void main(){ vP = position.xz; vS = aS; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime, uNight, uCloud; varying vec2 vP; varying float vS, vY; ${GLSL_HASH}
      void main(){
        float rip = sin(vP.x * 9.0 + sin(vP.y * 5.0 + vP.x * 2.0) * 1.7 + vnoise(vP * 3.0) * 3.0) * 0.5 + 0.5;
        float grain = h21(floor(vP * 90.0));
        vec3 sand = mix(vec3(0.83, 0.73, 0.52), vec3(0.74, 0.63, 0.43), rip * 0.55 + grain * 0.25);
        sand = mix(sand, vec3(0.5, 0.5, 0.36), smoothstep(-0.35, -0.7, vY) * 0.5);
        float c1 = sin(vP.x * 7.0 + uTime * 0.7 + sin(vP.y * 6.0 + uTime * 0.5) * 1.6) * sin(vP.y * 8.0 - uTime * 0.6 + sin(vP.x * 5.0 + uTime * 0.9) * 1.3);
        float caus = pow(clamp(1.0 - abs(c1) * 1.6, 0.0, 1.0), 4.0);
        sand += vec3(0.6, 0.85, 0.75) * caus * 0.2 * (1.0 - uCloud * 0.6) * (1.0 - uNight * 0.6);
        sand *= mix(1.0, 0.36, uNight);
        gl_FragColor = vec4(sand, 1.0);
      }`,
  });
}

/* ─── koï ─── */
const KOI_KINDS = [
  { base: '#f4efe6', patches: [['#e2491f', 5], ['#e2491f', 0]], black: 0 },
  { base: '#f2ede2', patches: [['#e2491f', 4]], black: 5 },
  { base: '#e9a21e', patches: [['#f6c23d', 3]], black: 0 },
  { base: '#ee6a28', patches: [['#f7f0e3', 4]], black: 0 },
  { base: '#f7f2e8', patches: [['#d63a1b', 2]], black: 0 },
];
function koiTexture(kind, seed) {
  const k = KOI_KINDS[kind % KOI_KINDS.length], r = rng(seed);
  return canvasTexture(128, 64, (c, w, h) => {
    c.fillStyle = k.base; c.fillRect(0, 0, w, h);
    const blob = (col, n, big) => { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rx = (big ? 14 : 8) + r() * 12, ry = 8 + r() * 14; for (const dx of [-w, 0, w]) { c.beginPath(); c.ellipse(x + dx, y, rx, ry, r() * 3, 0, 7); c.fill(); } } };
    for (const [col, n] of k.patches) if (n) blob(col, n, true);
    if (k.black) blob('#1a1a1d', k.black, false);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, w, 5);
  });
}
function koiBody(L, Wd, Hd, N = 16, R = 8) {
  const prof = (s) => Math.sin(Math.min(1, s * 1.25 + 0.05) * Math.PI * 0.62 + 0.15) * (1 - 0.88 * Math.pow(Math.max(0, s - 0.55) / 0.45, 1.4));
  const pos = [], uv = [], idx = [], aS = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, z = L * (0.5 - s), pw = Math.max(0.05, prof(s));
    for (let j = 0; j <= R; j++) { const a = (j / R) * TAU; pos.push(Math.cos(a) * Wd * pw, Math.sin(a) * Hd * pw * (Math.sin(a) > 0 ? 1.0 : 0.75), z); uv.push(j / R, 1 - s); aS.push(s); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function finGeo(pts) {
  const pos = [], aS = [], uv = [], idx = [];
  pts.forEach(([x, z]) => { pos.push(x, 0, z); aS.push(0); uv.push(0.5, 0.5); });
  for (let i = 1; i < pts.length - 1; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
const koiMaterial = (tex, uni, L) => new THREE.ShaderMaterial({
  uniforms: { uTime: uni.uTime, uNight: uni.uNight, uPhase: { value: 0 }, uMap: { value: tex }, uSpeed: { value: 1 }, uL: { value: L }, uSolid: { value: new THREE.Color(0xffffff) }, uUseMap: { value: 1 } },
  side: THREE.DoubleSide, transparent: true,
  vertexShader: `
    uniform float uTime, uPhase, uSpeed, uL; varying vec2 vUv; varying float vNy;
    void main(){
      vec3 p = position; float s = clamp((uL * 0.5 - p.z) / uL, 0.0, 1.0);
      p.x += sin(uTime * 5.5 * uSpeed + uPhase - s * 5.0) * (0.01 + 0.075 * s * s) * uL * 2.2;
      vUv = uv; vNy = normal.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D uMap; uniform vec3 uSolid; uniform float uNight, uUseMap; varying vec2 vUv; varying float vNy;
    void main(){
      vec3 c = uUseMap > 0.5 ? texture2D(uMap, vUv).rgb : uSolid;
      c *= 0.78 + 0.22 * clamp(vNy, -0.2, 1.0); c = mix(c, vec3(0.22, 0.52, 0.58), 0.2); c *= mix(1.0, 0.45, uNight);
      gl_FragColor = vec4(c, 1.0);
    }`,
});
function makeKoi(kind, seed, uni, L, { fins = true, solid = null } = {}) {
  const g = new THREE.Group(), tex = solid ? null : koiTexture(kind, seed);
  const bodyM = koiMaterial(tex, uni, L);
  if (solid) { bodyM.uniforms.uUseMap.value = 0; bodyM.uniforms.uSolid.value = new THREE.Color(solid); }
  g.add(new THREE.Mesh(koiBody(L, L * 0.13, L * 0.11), bodyM));
  const mats = [bodyM];
  if (fins) {
    const finM = koiMaterial(tex, uni, L); finM.uniforms.uUseMap.value = 0; finM.uniforms.uSolid.value = new THREE.Color(KOI_KINDS[kind % KOI_KINDS.length].base).lerp(new THREE.Color('#ffd9c8'), 0.45);
    g.add(new THREE.Mesh(finGeo([[0, -L * 0.46], [-L * 0.17, -L * 0.72], [-L * 0.06, -L * 0.62], [0, -L * 0.74], [L * 0.06, -L * 0.62], [L * 0.17, -L * 0.72]]), finM));
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(finGeo([[0, 0], [sx * L * 0.2, -L * 0.05], [sx * L * 0.15, -L * 0.17], [sx * L * 0.04, -L * 0.1]]), finM); f.position.set(sx * L * 0.1, -L * 0.02, L * 0.2); f.rotation.z = sx * -0.35; g.add(f); }
    const dorsal = new THREE.Mesh(finGeo([[0, 0], [L * 0.1, -L * 0.04], [L * 0.08, -L * 0.2], [0, -L * 0.26]]), finM); dorsal.rotation.z = Math.PI / 2; dorsal.position.set(0, L * 0.1, L * 0.1); g.add(dorsal);
    mats.push(finM);
  } else {
    g.add(new THREE.Mesh(finGeo([[0, -L * 0.42], [-L * 0.14, -L * 0.7], [0, -L * 0.6], [L * 0.14, -L * 0.7]]), bodyM));
  }
  g.traverse((o) => { if (o.isMesh) o.renderOrder = 3; });
  g.userData.mats = mats; return g;
}

/* ─── nénuphars et lotus ─── */
function padTexture(seed) {
  const r = rng(seed);
  return canvasTexture(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, '#6aa458'); gr.addColorStop(1, '#3e7a3c'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(30,70,30,.55)'; c.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + r() * 0.1; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(a) * w * 0.5, h / 2 + Math.sin(a) * h * 0.5); c.stroke(); }
  });
}
const padGeo = (R) => { const g = new THREE.CircleGeometry(R, 24, 0.25, TAU - 0.5); g.rotateX(-Math.PI / 2); return g; };
function lotus(r) {
  const parts = [];
  const petal = (len, wid, tilt, yaw, y) => { const p = new THREE.SphereGeometry(1, 8, 6); p.scale(wid, 0.18 * len, len); p.translate(0, 0, len * 0.9); p.rotateX(-tilt); p.rotateY(yaw); p.translate(0, y, 0); parts.push(p); };
  for (let i = 0; i < 7; i++) petal(0.052, 0.022, 0.55, (i / 7) * TAU, 0.004);
  for (let i = 0; i < 6; i++) petal(0.044, 0.02, 0.95, (i / 6) * TAU + 0.26, 0.012);
  for (let i = 0; i < 4; i++) petal(0.03, 0.016, 1.25, (i / 4) * TAU + 0.5, 0.02);
  const geo = mergeGeometries(parts); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#f6b8cf', roughness: 0.7, emissive: '#7a3350', emissiveIntensity: 0.12, side: THREE.DoubleSide }));
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: '#f2c63a', roughness: 0.6 })); heart.position.y = 0.022;
  const f = new THREE.Group(); f.add(m, heart); f.scale.setScalar(r); return f;
}

/* ─── plantes : lames qui ondulent (vertex shader), instanciées ─── */
export function bladeGeo(segs = 6, w0 = 0.014) {       // hauteur normalisée 0 → 1, légère courbure
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= segs; i++) { const h = i / segs, w = w0 * (1 - 0.85 * h * h) * 0.5, bend = h * h * 0.12; pos.push(-w, h, bend, w, h, bend); uv.push(0, h, 1, h); }
  for (let i = 0; i < segs; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
function tuftGeo() {                             // cornifle : touffe de brins fins qui s'évasent
  const parts = [], r = rng(5);
  for (let k = 0; k < 9; k++) { const g = bladeGeo(5, 0.012), a = r() * TAU, lean = 0.25 + r() * 0.5, sc = 0.7 + r() * 0.5, p = g.attributes.position; for (let i = 0; i < p.count; i++) { const h = p.getY(i); p.setX(i, p.getX(i) + Math.cos(a) * h * h * lean); p.setZ(i, p.getZ(i) + Math.sin(a) * h * h * lean); p.setY(i, h * sc); } parts.push(g); }
  return mergeGeometries(parts);
}
export function plantMaterial(uni, base, tip, sway) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: uni.uTime, uNight: uni.uNight, uBase: { value: new THREE.Color(base) }, uTip: { value: new THREE.Color(tip) }, uSway: { value: sway } },
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime, uSway; varying float vH, vK;
      void main(){
        vec3 p = position; float h = position.y; vec4 im = instanceMatrix[3];
        float ph = im.x * 3.1 + im.z * 2.3; vK = 0.85 + 0.3 * fract(sin(im.x * 91.7 + im.z * 37.3) * 437.5);
        p.x += sin(uTime * 1.25 + ph + h * 2.2) * uSway * h * h; p.z += cos(uTime * 0.9 + ph * 1.3 + h * 1.7) * uSway * 0.6 * h * h;
        vH = h; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform vec3 uBase, uTip; uniform float uNight; varying float vH, vK; void main(){ vec3 c = mix(uBase, uTip, vH) * vK; c *= mix(1.0, 0.45, uNight); gl_FragColor = vec4(c, 1.0); }`,
  });
}
export function scatter(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length), d = new THREE.Object3D();
  items.forEach((it, i) => { d.position.set(it.x, it.y ?? 0, it.z); d.rotation.set(it.tx || 0, it.ry ?? 0, it.tz || 0); d.scale.set(it.sx ?? 1, it.sy ?? 1, it.sx ?? 1); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
  m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; return m;
}

/* ─── brume : volutes qui montent de l'eau (bruit fbm, vertex shader) ─── */
function mistPuffs(points) {
  const N = points.length, aP = new Float32Array(N * 4), r = rng(21);
  points.forEach(([x, z], i) => aP.set([x, z, r(), r()], i * 4));
  const geo = new THREE.PlaneGeometry(1, 1), ig = new THREE.InstancedBufferGeometry();
  ig.index = geo.index; ig.attributes.position = geo.attributes.position; ig.attributes.uv = geo.attributes.uv;
  ig.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); ig.instanceCount = N;
  const uni = { uTime: { value: 0 }, uMist: { value: 0 }, uNight: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `
      uniform float uTime, uMist; attribute vec4 aP; varying vec2 vUv; varying float vA, vSeed;
      void main(){
        float life = fract(uTime * 0.04 + aP.z), sd = aP.w;
        vec3 c = vec3(aP.x + sin(uTime * 0.21 + sd * 6.0 + life * 3.2) * 0.3 * life + life * 0.25, 0.04 + life * 0.5 + life * life * 0.18, aP.y + cos(uTime * 0.17 + sd * 5.0 + life * 2.6) * 0.24 * life);
        float size = (0.38 + 0.9 * life) * (0.8 + 0.6 * sd);
        vec4 mv = modelViewMatrix * vec4(c, 1.0); mv.xy += position.xy * size;
        vUv = uv; vSeed = sd; vA = smoothstep(0.0, 0.2, life) * pow(1.0 - life, 1.3) * uMist;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime, uNight; varying vec2 vUv; varying float vA, vSeed; ${GLSL_HASH}
      void main(){
        float d = length(vUv - 0.5) * 2.0;
        float n = fbm(vUv * 3.2 + vSeed * 9.0 + vec2(uTime * 0.05, -uTime * 0.03));
        float a = smoothstep(1.0, 0.1, d) * (0.25 + 1.1 * n);
        a = clamp(a * 1.25, 0.0, 1.0) * vA * 1.0;
        gl_FragColor = vec4(mix(vec3(1.0), vec3(0.5, 0.6, 0.78), uNight), a);
      }`,
  });
  const mesh = new THREE.Mesh(ig, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.userData.uni = uni; return mesh;
}

/* ─── pluie : traits dans le volume au-dessus de l'eau ─── */
function rainLines(points, H) {
  const N = points.length, seed = new Float32Array(N * 6), end = new Float32Array(N * 2), rank = new Float32Array(N * 2), pos = new Float32Array(N * 6), r = rng(77);
  points.forEach(([x, z], i) => { const ph = r(), rk = r(); for (let k = 0; k < 2; k++) { const o = i * 2 + k; seed.set([x, z, ph], o * 3); end[o] = k; rank[o] = rk; } });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1)); g.setAttribute('aRank', new THREE.BufferAttribute(rank, 1));
  const uni = { uTime: { value: 0 }, uRain: { value: 0 }, uNight: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime, uRain; attribute vec3 aSeed; attribute float aEnd, aRank; varying float vA;
      void main(){
        float f = fract(aSeed.z + uTime * (1.5 + aSeed.z * 0.6));
        vec3 p = vec3(aSeed.x - f * 0.12 + aEnd * 0.025, ${H.toFixed(2)} * (1.0 - f) + aEnd * 0.1, aSeed.y);
        vA = step(aRank, uRain) * (0.25 + 0.5 * (1.0 - f * 0.3));
        gl_Position = vA > 0.0 ? projectionMatrix * modelViewMatrix * vec4(p, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: `uniform float uNight; varying float vA; void main(){ gl_FragColor = vec4(mix(vec3(0.36, 0.5, 0.68), vec3(0.72, 0.8, 0.95), uNight), vA); }`,
  });
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; l.renderOrder = 4; l.userData.uni = uni; return l;
}

export function rockGeo(seed, s) {
  const geo = new THREE.SphereGeometry(1, 18, 12), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.16 * Math.sin(x * 2.3 + seed) * Math.cos(z * 2.1 + seed * 1.7) + 0.1 * Math.sin(y * 3.1 + seed * 0.7) + 0.06 * Math.sin((x + z) * 5.3 + seed);
    p.setXYZ(i, x * n, y * n * (y > 0 ? 0.62 : 1.3), z * n);        // la moitié basse plonge dans le sable
  }
  geo.computeVertexNormals(); geo.scale(s * 1.25, s, s); return geo;
}

/** Étang. `cx, cz` : centre dans le repère du parent ; `posts` : pieux du ponton (repère du parent), entourés de ronds d'eau. */
export function makePond({ cx = 0, cz = 0, seed = 11, floorZ = null, rx = 2.6, rzBack = 1.0, rzFront = 2.3, posts = [], padMinZ = -9, rainRect = null, rainH = 1.5, mistOutside = null } = {}) {
  const g = group(), shape = makeShape(seed, { rx, rzBack, rzFront, floorZ: floorZ === null ? null : floorZ - cz });
  const uni = { uTime: { value: 0 }, uNight: { value: 0 }, uRain: { value: 0 }, uMist: { value: 0 }, uCloud: { value: 0 } };
  const inside = (x, z, m = 0.85) => shape.frac(x, z) < m;
  const rand = rng(seed * 7 + 3);
  const randIn = (fMax = 0.85, fMin = 0) => { for (let k = 0; k < 60; k++) { const th = rand() * TAU, f = fMin + Math.sqrt(rand()) * (fMax - fMin), [x, z] = shape.at(th, f); if (shape.frac(x, z) <= fMax + 0.01) return { x, z, th, f }; } return { x: 0, z: 0, th: 0, f: 0 }; };
  const floorAt = (x, z) => -depthAt(Math.min(1, shape.frac(x, z)));
  const SEG = 128;

  /* fond de sable */
  g.add(new THREE.Mesh(polarGrid(16, SEG, (th, f) => { const [x, z] = shape.at(th, f); return [x, -depthAt(f) + Math.sin(x * 4 + seed) * Math.cos(z * 3.3) * 0.012, z]; }), sandMaterial(uni)));
  /* eau */
  const water = new THREE.Mesh(polarGrid(14, SEG, (th, f) => { const [x, z] = shape.at(th, f); return [x, 0, z]; }), waterMaterial(uni)); water.renderOrder = 2; g.add(water);

  /* rive : plage de sable en bande irrégulière + flanc de terre (coupe du diorama) */
  const bw = rng(seed + 5), bph = [bw() * TAU, bw() * TAU];
  const bandW = (th) => 0.14 + 0.07 * Math.sin(3 * th + bph[0]) + 0.05 * Math.sin(7 * th + bph[1]);
  const clampZ = (z) => (floorZ !== null && z < floorZ - cz ? floorZ - cz : z);
  const shore = new THREE.Mesh(polarGrid(3, SEG, (th, f) => { const [x0, z0] = shape.at(th, 0.97), w = bandW(th); return [x0 + Math.cos(th) * w * f, -0.015 + 0.075 * Math.sin(f * 1.4), clampZ(z0 + Math.sin(th) * w * f)]; }), new THREE.MeshStandardMaterial({ color: '#c9b68a', roughness: 1 }));
  shore.receiveShadow = true; g.add(shore);
  const wallPos = [], wallIdx = [], wallUv = [];
  for (let j = 0; j <= SEG; j++) { const th = (j / SEG) * TAU, [x0, z0] = shape.at(th, 0.97), w = bandW(th) + 0.03, x = x0 + Math.cos(th) * w, z = clampZ(z0 + Math.sin(th) * w); wallPos.push(x, 0.06, z, x, -0.75, z); wallUv.push(j / SEG, 0, j / SEG, 1); }
  for (let j = 0; j < SEG; j++) { const a = j * 2; wallIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(wallUv, 2)); wg.setIndex(wallIdx);
  const earth = canvasTexture(4, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9b68a'); gr.addColorStop(0.25, '#9b7d52'); gr.addColorStop(1, '#4a3826'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  g.add(new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ map: earth, side: THREE.DoubleSide })));

  /* galets et petits cailloux au fond et sur la plage */
  const peb = [], pr = rng(seed + 9);
  for (let i = 0; i < 140; i++) { const q = randIn(0.97), sc = 0.012 + pr() * 0.022; peb.push({ x: q.x, y: floorAt(q.x, q.z) + sc * 0.3, z: q.z, ry: pr() * 6, sx: sc, sy: sc * (0.5 + pr() * 0.4) }); }
  for (let i = 0; i < 40; i++) { const th = pr() * TAU, [x0, z0] = shape.at(th, 1.0), w = bandW(th) * pr(), sc = 0.012 + pr() * 0.02; peb.push({ x: x0 + Math.cos(th) * w, y: 0.02 + sc * 0.3, z: clampZ(z0 + Math.sin(th) * w), ry: pr() * 6, sx: sc, sy: sc * 0.6 }); }
  const pebM = scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), peb);
  peb.forEach((_, i) => pebM.setColorAt(i, new THREE.Color().setHSL(0.09 + pr() * 0.04, 0.12 + pr() * 0.15, 0.45 + pr() * 0.3)));
  g.add(pebM);

  /* plantes aquatiques */
  const pl = rng(seed + 13), ribbons = [], tufts = [], balls = [];
  for (let c = 0; c < 30; c++) { const q = randIn(0.88, 0.1), n = 3 + ((pl() * 4) | 0); for (let k = 0; k < n; k++) { const x = q.x + (pl() - 0.5) * 0.16, z = q.z + (pl() - 0.5) * 0.16, d = -floorAt(x, z); ribbons.push({ x, y: -d, z, ry: pl() * 6, sy: Math.min(d * (0.55 + pl() * 0.35), 0.4), sx: 1 }); } }
  g.add(scatter(bladeGeo(7, 0.02), plantMaterial(uni, '#2f6e3a', '#8fcf6a', 0.07), ribbons));
  for (let i = 0; i < 22; i++) { const q = randIn(0.85, 0.05), d = -floorAt(q.x, q.z); tufts.push({ x: q.x, y: -d, z: q.z, ry: pl() * 6, sy: Math.min(d * 0.8, 0.45) * (0.7 + pl() * 0.3), sx: 0.8 + pl() * 0.4 }); }
  g.add(scatter(tuftGeo(), plantMaterial(uni, '#2c7a68', '#8fe0b0', 0.05), tufts));
  for (let i = 0; i < 9; i++) { const q = randIn(0.78, 0.2), s = 0.04 + pl() * 0.035; balls.push({ x: q.x, y: floorAt(q.x, q.z) + s * 0.6, z: q.z, ry: pl() * 6, sx: s, sy: s * 0.9 }); }
  g.add(scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#2f6b3a', roughness: 1, flatShading: true }), balls));

  /* plantes de rive : roseaux et massettes (fond et côtés), iris (partout) */
  const reedBlades = [], cattail = [], irisLeaves = [], irisFlowers = [];
  for (let c = 0; c < 14; c++) {
    const th = pl() * TAU, back = Math.sin(th) < 0.25;                                // pas de grands roseaux côté caméra
    const [x0, z0] = shape.at(th, 1.0), w = bandW(th) + 0.06 + pl() * 0.1, bx = x0 + Math.cos(th) * w, bz = clampZ(z0 + Math.sin(th) * w);
    if (back) { const n = 5 + ((pl() * 4) | 0); for (let k = 0; k < n; k++) { const x = bx + (pl() - 0.5) * 0.14, z = bz + (pl() - 0.5) * 0.14, h = 0.45 + pl() * 0.4; reedBlades.push({ x, y: 0.03, z, ry: pl() * 6, sy: h, sx: 1, tz: (pl() - 0.5) * 0.12 }); if (k < 2 && pl() > 0.5) cattail.push({ x: x + 0.004, y: 0.03 + h * 0.8, z, ry: 0, sx: 1, sy: 1 }); } }
    else if (pl() > 0.3) { for (let k = 0; k < 4; k++) { const x = bx + (pl() - 0.5) * 0.12, z = bz + (pl() - 0.5) * 0.1, h = 0.22 + pl() * 0.14; irisLeaves.push({ x, y: 0.03, z, ry: pl() * 6, sy: h, sx: 1.6, tz: (pl() - 0.5) * 0.3 }); if (k === 0 && pl() > 0.45) irisFlowers.push({ x, y: 0.03 + h * 0.95, z, ry: 0, sx: 1, sy: 1 }); } }
  }
  g.add(scatter(bladeGeo(6, 0.03), plantMaterial(uni, '#6e8a3c', '#b9c767', 0.045), reedBlades));
  g.add(scatter(bladeGeo(6, 0.04), plantMaterial(uni, '#3f7a3a', '#8fc561', 0.04), irisLeaves));
  if (cattail.length) g.add(scatter(new THREE.CylinderGeometry(0.013, 0.013, 0.1, 8).translate(0, 0.05, 0), new THREE.MeshStandardMaterial({ color: '#5b3a22', roughness: 0.9 }), cattail));
  if (irisFlowers.length) g.add(scatter(new THREE.IcosahedronGeometry(0.035, 1).translate(0, 0.02, 0), new THREE.MeshStandardMaterial({ color: '#7a55c4', roughness: 0.7, emissive: '#3a2370', emissiveIntensity: 0.2 }), irisFlowers));

  /* rochers ancrés sur la rive (moitié immergée, mousse dessus) + ronds d'eau */
  const rings = [], ringM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const addRing = (x, z, r) => { const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.82, r, 28), ringM.clone()); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); m.renderOrder = 2; m.userData = { r, x, z }; g.add(m); rings.push(m); };
  const rk = rng(seed + 31);
  for (const [th0, s, sd] of [[Math.PI * 0.95, 0.3, 3], [Math.PI * 1.15, 0.2, 4], [Math.PI * 1.55, 0.26, 5], [Math.PI * 0.05, 0.34, 6], [Math.PI * 1.9, 0.2, 8], [Math.PI * 0.55, 0.16, 9]]) {
    const th = th0 + (rk() - 0.5) * 0.2, [x, z0] = shape.at(th, 1.0 + (rk() - 0.5) * 0.04), z = clampZ(z0);
    const m = new THREE.Mesh(rockGeo(sd, s), new THREE.MeshStandardMaterial({ color: '#4a515c', roughness: 0.95 })); m.position.set(x, -0.015, z); m.rotation.y = sd; m.castShadow = m.receiveShadow = true; g.add(m);
    addRing(x, z, s * 1.55);
    const moss = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, TAU, 0, 1.0), new THREE.MeshStandardMaterial({ color: '#4f7a3c', roughness: 1 })); moss.scale.set(s * 0.9, s * 0.4, s * 0.8); moss.position.set(x + s * 0.05, s * 0.34, z - s * 0.05); g.add(moss);
  }
  for (const [px, pz] of posts) addRing(px - cx, pz - cz, 0.11);

  /* koï : trajectoires ovales ramenées dans l'eau si besoin */
  const kois = [];
  const KD = [[0, 0.40, -0.2, 1.0, 0.3, 0.34, 0], [1, 0.34, 0.9, 0.2, 0.22, 0.42, 2.1], [2, 0.36, 0.2, 1.4, 0.24, 0.28, 4.0], [3, 0.30, -0.9, 0.3, 0.2, 0.5, 1.2], [4, 0.28, 0.5, -0.1, 0.2, 0.38, 5.3]];
  const koiPath = (p, t, out) => { const a = t * p.sp + p.ph; out.set(p.cx + Math.cos(a) * p.rx, p.y + Math.sin(a * 1.7) * 0.02, p.cz + Math.sin(a * 1.3) * p.rz * 1.9); return out; };
  const fitPath = (p) => { const v = new THREE.Vector3(); for (let s = 1; s > 0.2; s -= 0.1) { let ok = true; const q = { ...p, rx: p.rx * s, rz: p.rz * s }; for (let i = 0; i < 40 && ok; i++) { koiPath(q, i * 0.5 / p.sp, v); if (!inside(v.x, v.z, 0.82)) ok = false; } if (ok) return q; } return { ...p, rx: 0.1, rz: 0.05 }; };
  KD.forEach(([kind, L, pcx, pcz, rz, sp, ph], i) => {
    const k = makeKoi(kind, 40 + i, uni, L); k.userData.p = fitPath({ cx: pcx, cz: pcz, rx: 0.5 + (i % 3) * 0.12, rz, sp, ph, y: -0.035 - (i % 3) * 0.02 }); k.scale.setScalar(1.35);
    k.userData.mats.forEach((m) => { m.uniforms.uPhase.value = ph; m.uniforms.uSpeed.value = 0.8 + sp; });
    g.add(k); kois.push(k);
  });
  /* petits poissons argentés en banc */
  const minnows = [], mrng = rng(seed + 50);
  for (let i = 0; i < 9; i++) { const f = makeKoi(0, 90 + i, uni, 0.085, { fins: false, solid: '#b9c6cc' }); f.userData.mats[0].uniforms.uPhase.value = i; f.userData.o = { dx: (mrng() - 0.5) * 0.35, dz: (mrng() - 0.5) * 0.3, dy: -0.04 - mrng() * 0.06, ph: mrng() * 6 }; g.add(f); minnows.push(f); }
  const school = fitPath({ cx: 0.2, cz: 0.2, rx: 0.9, rz: 0.3, sp: 0.19, ph: 0.5, y: 0 });

  /* nénuphars et tiges */
  const pads = [], padMats = [padTexture(3), padTexture(9)].map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, side: THREE.DoubleSide }));
  const stems = [], pp = rng(seed + 60), taken = [];
  for (let n = 0, tries = 0; n < 10 && tries < 200; tries++) {
    const q = randIn(0.78, 0.15); if (q.z + cz < padMinZ) continue;
    const R0 = 0.1 + pp() * 0.09; if (taken.some(([x, z, r]) => Math.hypot(x - q.x, z - q.z) < r + R0 + 0.05)) continue;
    taken.push([q.x, q.z, R0]);
    const pg = new THREE.Group(), pm = new THREE.Mesh(padGeo(R0), padMats[n % 2]); pm.receiveShadow = true; pg.add(pm);
    if (n % 3 === 0) { const fl = lotus(R0 * 3.6); fl.position.y = 0.004; pg.add(fl); }
    pg.position.set(q.x, 0.014, q.z); pg.userData = { seed: n + 1 }; g.add(pg); pads.push(pg);
    const fy = floorAt(q.x, q.z); stems.push({ x: q.x, y: fy, z: q.z, sx: 1, sy: -fy, ry: 0 }); n++;
  }
  g.add(scatter(new THREE.CylinderGeometry(0.006, 0.008, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#4a7a3a', roughness: 0.8 }), stems));

  /* brume, pluie */
  const mistPts = []; for (let i = 0; i < 150; i++) { const q = randIn(0.95); mistPts.push([q.x, q.z]); }
  if (mistOutside) { const mr = rng(seed + 90); for (let i = 0, t = 0; i < mistOutside.count && t < 4000; t++) { const th = mr() * TAU, f = 1.08 + mr() * 1.9, [x, z] = shape.at(th, f), px = x + cx, pz = z + cz; if (mistOutside.exclude(px, pz) || pz < -1.9) continue; mistPts.push([x, z]); i++; } }   // la brume se répand aussi dans le jardin
  const mist = mistPuffs(mistPts); g.add(mist);
  const rainPts = []; for (let i = 0; i < 340; i++) { const q = randIn(1.05); rainPts.push([q.x, q.z]); }
  if (rainRect) { const rr = rng(seed + 70); for (let i = 0; i < 150; i++) rainPts.push([rainRect.x0 - cx + rr() * (rainRect.x1 - rainRect.x0), rainRect.z0 - cz + rr() * (rainRect.z1 - rainRect.z0)]); }
  const rain = rainLines(rainPts, rainH); g.add(rain);

  const v = new THREE.Vector3(), v2 = new THREE.Vector3();
  g.userData.uni = uni; g.userData.shape = shape;
  g.userData.update = (t, night, k) => {
    uni.uNight.value += ((night ? 1 : 0) - uni.uNight.value) * 0.05; const nn = uni.uNight.value;
    uni.uTime.value = t; uni.uRain.value = k.rain; uni.uMist.value = k.mist; uni.uCloud.value = k.cloud;
    for (const kk of kois) { const p = kk.userData.p; koiPath(p, t, v); koiPath(p, t + 0.08, v2); kk.position.copy(v); kk.rotation.y = Math.atan2(v2.x - v.x, v2.z - v.z); kk.rotation.z = Math.sin(t * p.sp * 2 + p.ph) * 0.03; }
    koiPath(school, t, v); koiPath(school, t + 0.1, v2); const hd = Math.atan2(v2.x - v.x, v2.z - v.z);
    for (const f of minnows) { const o = f.userData.o; f.position.set(v.x + o.dx + Math.sin(t * 0.7 + o.ph) * 0.05, o.dy + Math.sin(t * 0.5 + o.ph) * 0.015, v.z + o.dz + Math.cos(t * 0.6 + o.ph) * 0.05); f.rotation.y = hd + Math.sin(t * 0.8 + o.ph) * 0.15; }
    for (const pd of pads) { const u = pd.userData; pd.position.y = 0.016 + Math.sin(t * 1.1 + u.seed) * 0.004 + k.rain * Math.sin(t * 9 + u.seed * 3) * 0.002; pd.rotation.y = u.seed * 1.7 + Math.sin(t * 0.12 + u.seed) * 0.12; }
    for (const r of rings) { const ph = (t * 0.45 + r.userData.x * 3) % 1; r.scale.setScalar(0.92 + ph * 0.28); r.material.opacity = (1 - ph) * 0.5 * (1 - nn * 0.5); }
    const mu = mist.userData.uni; mu.uTime.value = t; mu.uMist.value = k.mist; mu.uNight.value = nn; mist.visible = k.mist > 0.02;
    const ru = rain.userData.uni; ru.uTime.value = t; ru.uRain.value = k.rain; ru.uNight.value = nn; rain.visible = k.rain > 0.02;
  };
  return g;
}
