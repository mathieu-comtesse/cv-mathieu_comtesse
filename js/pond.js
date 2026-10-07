import { THREE, group, canvasTexture, rng } from './kit.js?v=3cff226';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

/* ───────────── Étang : eau transparente, fond à caustiques, carpes koï, nénuphars, brume ─────────────
 * Repère local : surface de l'eau en y = 0, centrée en (0, 0). `update(t, night, k)` reçoit la météo k = { rain, mist, cloud }. */

const GLSL_HASH = `float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`;

/* eau : surface semi-transparente, reflets du ciel, éclats, ondes de pluie, écume sur la rive */
function waterMaterial(W, D, uni) {
  return new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `
      uniform float uTime, uRain; varying float vH; varying vec2 vP; varying vec3 vN;
      float wave(vec2 p){ float a = 0.5 + uRain * 0.5; return (sin(p.x*2.1+uTime*1.1)*0.5 + sin(p.y*3.3-uTime*1.4+p.x)*0.35 + sin((p.x+p.y)*5.2+uTime*2.1)*0.15 * (1.0 + uRain)) * a; }
      void main(){
        vec3 p = position; float h = wave(p.xz) * 0.028; p.y += h; vH = h; vP = p.xz;
        float e = 0.05; vN = normalize(vec3(-(wave(p.xz + vec2(e,0.0)) - wave(p.xz - vec2(e,0.0))) * 0.028 / (2.0*e), 1.0, -(wave(p.xz + vec2(0.0,e)) - wave(p.xz - vec2(0.0,e))) * 0.028 / (2.0*e)));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uNight, uRain, uMist, uCloud; varying float vH; varying vec2 vP; varying vec3 vN;
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
        float t = clamp((vP.y + ${(D / 2).toFixed(2)}) / ${D.toFixed(2)}, 0.0, 1.0);
        float edge = min(min(vP.x + ${(W / 2).toFixed(2)}, ${(W / 2).toFixed(2)} - vP.x), min(vP.y + ${(D / 2).toFixed(2)}, ${(D / 2).toFixed(2)} - vP.y));
        vec3 deep = mix(vec3(0.05, 0.40, 0.50), vec3(0.02, 0.07, 0.17), uNight);
        vec3 shallow = mix(vec3(0.22, 0.68, 0.72), vec3(0.06, 0.18, 0.34), uNight);
        vec3 col = mix(shallow, deep, smoothstep(0.0, 0.9, 1.0 - t) * 0.7 + smoothstep(0.5, 0.0, edge) * 0.0);
        // reflet du ciel : plus marqué là où la surface s'incline
        float fres = pow(1.0 - clamp(vN.y, 0.0, 1.0), 0.6) * 6.0 + 0.12;
        vec3 sky = mix(vec3(0.82, 0.92, 1.0), vec3(0.18, 0.26, 0.5), uNight);
        sky = mix(sky, vec3(0.66, 0.7, 0.75), uCloud * 0.7);
        col = mix(col, sky, clamp(fres, 0.0, 0.55));
        // éclats de soleil (jamais sous la pluie ni la nuit)
        float sp = step(0.9925, h21(floor(vP * 46.0) + floor(uTime * 1.6))) * smoothstep(0.55, 1.0, vN.y + sin(vP.x * 11.0 + uTime * 2.0) * 0.1);
        col += vec3(1.0, 0.98, 0.9) * sp * (1.0 - uCloud) * (1.0 - uNight * 0.7);
        // crêtes et écume sur les bords
        float stripe = sin(vP.y * 9.0 - uTime * 1.2 + sin(vP.x * 3.0) * 1.4);
        float foam = smoothstep(0.012, 0.028, vH) * 0.5 + smoothstep(0.95, 0.995, stripe) * 0.18 * (0.4 + uRain);
        foam += smoothstep(0.1, 0.0, edge) * (0.5 + 0.35 * sin(uTime * 1.2 + vP.x * 2.0));
        // ondes de gouttes
        float rg = uRain > 0.02 ? rings(vP, uTime) * uRain : 0.0;
        col = mix(col, mix(vec3(0.95, 0.98, 1.0), vec3(0.45, 0.6, 0.85), uNight), clamp(foam * 0.8 + rg * 0.55, 0.0, 1.0));
        col = mix(col, vec3(dot(col, vec3(0.33))) * vec3(0.95, 1.0, 1.04), uCloud * 0.35 + uMist * 0.2);
        float a = 0.8 + fres * 0.12 + foam * 0.3 + rg * 0.25 + uCloud * 0.08;
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.94));
      }`,
  });
}

/* fond : galets, lumière qui danse (caustiques) */
function floorMaterial(uni) {
  return new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime, uNight, uCloud; varying vec2 vP; ${GLSL_HASH}
      void main(){
        vec2 q = vP * 13.0; vec2 id = floor(q); float h = h21(id); vec2 f = fract(q) - 0.5;
        float peb = smoothstep(0.5, 0.28, length(f + (vec2(h, fract(h * 5.0)) - 0.5) * 0.25));
        vec3 base = mix(vec3(0.20, 0.38, 0.40), vec3(0.34, 0.50, 0.48), h) * (0.7 + peb * 0.45);
        float c1 = sin(vP.x * 7.0 + uTime * 0.7 + sin(vP.y * 6.0 + uTime * 0.5) * 1.6) * sin(vP.y * 8.0 - uTime * 0.6 + sin(vP.x * 5.0 + uTime * 0.9) * 1.3);
        float caus = pow(clamp(1.0 - abs(c1) * 1.6, 0.0, 1.0), 4.0);
        base += vec3(0.55, 0.85, 0.8) * caus * 0.22 * (1.0 - uCloud * 0.6) * (1.0 - uNight * 0.6);
        base *= mix(1.0, 0.35, uNight);
        gl_FragColor = vec4(base, 1.0);
      }`,
  });
}

/* koï : corps lofté + nageoires, ondulation dans le vertex shader, motif peint (kohaku, sanke, ogon, shiro) */
const KOI_KINDS = [
  { base: '#f4efe6', patches: [['#e2491f', 5], ['#e2491f', 0]], black: 0 },       // kohaku
  { base: '#f2ede2', patches: [['#e2491f', 4]], black: 5 },                        // sanke
  { base: '#e9a21e', patches: [['#f6c23d', 3]], black: 0 },                        // ogon
  { base: '#ee6a28', patches: [['#f7f0e3', 4]], black: 0 },                        // orange tacheté
  { base: '#f7f2e8', patches: [['#d63a1b', 2]], black: 0 },                        // shiro à tache de tête
];
function koiTexture(kind, seed) {
  const k = KOI_KINDS[kind % KOI_KINDS.length], r = rng(seed);
  return canvasTexture(128, 64, (c, w, h) => {
    c.fillStyle = k.base; c.fillRect(0, 0, w, h);
    const blob = (col, n, big) => { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rx = (big ? 14 : 8) + r() * 12, ry = 8 + r() * 14; for (const dx of [-w, 0, w]) { c.beginPath(); c.ellipse(x + dx, y, rx, ry, r() * 3, 0, 7); c.fill(); } } };
    for (const [col, n] of k.patches) if (n) blob(col, n, true);
    if (k.black) blob('#1a1a1d', k.black, false);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, h * 0.0, w, 5);               // dos plus clair
  });
}
function koiBody(L, Wd, Hd, N = 16, R = 8) {
  // axe z : tête en +z, queue en -z ; profil de largeur (tête arrondie, corps renflé, pédoncule fin)
  const prof = (s) => Math.sin(Math.min(1, s * 1.25 + 0.05) * Math.PI * 0.62 + 0.15) * (1 - 0.88 * Math.pow(Math.max(0, s - 0.55) / 0.45, 1.4));
  const pos = [], uv = [], idx = [], aS = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, z = L * (0.5 - s), pw = Math.max(0.05, prof(s));
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI * 2;
      pos.push(Math.cos(a) * Wd * pw, Math.sin(a) * Hd * pw * (Math.sin(a) > 0 ? 1.0 : 0.75), z); uv.push(j / R, 1 - s); aS.push(s);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function finGeo(pts, s0) {      // éventail plat : liste de points [x, z] (y = 0), aS dérivé de z
  const pos = [], aS = [], uv = [], idx = [];
  pts.forEach(([x, z], i) => { pos.push(x, 0, z); aS.push(s0 + Math.max(0, -z) * 0.0); uv.push(0.5, 0.5); });
  for (let i = 1; i < pts.length - 1; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
const koiMaterial = (tex, uni, L) => new THREE.ShaderMaterial({
  uniforms: { uTime: uni.uTime, uNight: uni.uNight, uPhase: { value: 0 }, uMap: { value: tex }, uSpeed: { value: 1 }, uL: { value: L }, uSolid: { value: new THREE.Color(0xffffff) }, uUseMap: { value: 1 } },
  side: THREE.DoubleSide,
  vertexShader: `
    uniform float uTime, uPhase, uSpeed, uL; attribute float aS; varying vec2 vUv; varying float vNy;
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
      c *= 0.78 + 0.22 * clamp(vNy, -0.2, 1.0); c *= mix(1.0, 0.45, uNight);
      gl_FragColor = vec4(c, 1.0);
    }`,
});

function makeKoi(kind, seed, uni, L) {
  const g = new THREE.Group(), tex = koiTexture(kind, seed);
  const bodyM = koiMaterial(tex, uni, L);
  const body = new THREE.Mesh(koiBody(L, L * 0.13, L * 0.11), bodyM); g.add(body);
  const finM = koiMaterial(tex, uni, L); finM.uniforms.uUseMap.value = 0; finM.uniforms.uSolid.value = new THREE.Color(KOI_KINDS[kind % KOI_KINDS.length].base).lerp(new THREE.Color('#ffd9c8'), 0.45); finM.transparent = false;
  const tail = new THREE.Mesh(finGeo([[0, -L * 0.46], [-L * 0.17, -L * 0.72], [-L * 0.06, -L * 0.62], [0, -L * 0.74], [L * 0.06, -L * 0.62], [L * 0.17, -L * 0.72]], 1), finM); g.add(tail);
  for (const sx of [-1, 1]) { const f = new THREE.Mesh(finGeo([[0, 0], [sx * L * 0.2, -L * 0.05], [sx * L * 0.15, -L * 0.17], [sx * L * 0.04, -L * 0.1]], 0.3), finM); f.position.set(sx * L * 0.1, -L * 0.02, L * 0.2); f.rotation.z = sx * -0.35; g.add(f); }
  const dorsal = new THREE.Mesh(finGeo([[0, 0], [L * 0.1, -L * 0.04], [L * 0.08, -L * 0.2], [0, -L * 0.26]], 0.5), finM); dorsal.rotation.x = 0; dorsal.rotation.z = Math.PI / 2; dorsal.position.set(0, L * 0.1, L * 0.1); g.add(dorsal);
  g.userData.mats = [bodyM, finM];
  return g;
}

/* nénuphar : feuille ronde échancrée + fleur de lotus facultative */
function padTexture(seed) {
  const r = rng(seed);
  return canvasTexture(64, 64, (c, w, h) => {
    c.fillStyle = '#4d8a45'; c.fillRect(0, 0, w, h);
    const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, '#6aa458'); gr.addColorStop(1, '#3e7a3c'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(30,70,30,.55)'; c.lineWidth = 1;
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283 + r() * 0.1; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(a) * w * 0.5, h / 2 + Math.sin(a) * h * 0.5); c.stroke(); }
  });
}
function padGeo(R) {
  const g = new THREE.CircleGeometry(R, 24, 0.25, Math.PI * 2 - 0.5); g.rotateX(-Math.PI / 2); return g;
}
function lotus(r) {
  const parts = [];
  const petal = (len, wid, tilt, yaw, y) => {
    const p = new THREE.SphereGeometry(1, 8, 6); p.scale(wid, 0.18 * len, len); p.translate(0, 0, len * 0.9);
    p.rotateX(-tilt); p.rotateY(yaw); p.translate(0, y, 0); parts.push(p);
  };
  for (let i = 0; i < 7; i++) petal(0.052, 0.022, 0.55, (i / 7) * 6.283, 0.004);
  for (let i = 0; i < 6; i++) petal(0.044, 0.02, 0.95, (i / 6) * 6.283 + 0.26, 0.012);
  for (let i = 0; i < 4; i++) petal(0.03, 0.016, 1.25, (i / 4) * 6.283 + 0.5, 0.02);
  const geo = mergeGeometries(parts); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#f6b8cf', roughness: 0.7, emissive: '#7a3350', emissiveIntensity: 0.12, side: THREE.DoubleSide }));
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: '#f2c63a', roughness: 0.6 })); heart.position.y = 0.022;
  const f = new THREE.Group(); f.add(m, heart); f.scale.setScalar(r); return f;
}

/** Brume : nappes de bruit qui dérivent au-dessus du bassin seulement (bords fondus), opacité pilotée par la météo. */
function mistLayer(W, D, y, seed, drift) {
  const r = rng(seed);
  const tex = canvasTexture(256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = r() * w, yy = r() * h, rad = 20 + r() * 40; for (const dx of [-w, 0, w]) { const gr = c.createRadialGradient(x + dx, yy, 0, x + dx, yy, rad); gr.addColorStop(0, 'rgba(255,255,255,.62)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(x + dx - rad, yy - rad, rad * 2, rad * 2); } }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1.4, 1);
  const uni = { uMap: { value: tex }, uOff: { value: new THREE.Vector2() }, uOp: { value: 0 }, uCol: { value: new THREE.Color('#ffffff') } };
  const m = new THREE.ShaderMaterial({              // fondu sur les bords : la brume ne déborde pas du bassin
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uMap; uniform vec2 uOff; uniform float uOp; uniform vec3 uCol; varying vec2 vUv;
      void main(){ vec2 e = min(vUv, 1.0 - vUv) / vec2(0.2, 0.28); float f = smoothstep(0.0, 1.0, min(min(e.x, e.y), 1.0));
        float a = texture2D(uMap, vUv * vec2(1.4, 1.0) + uOff).a * f * uOp; gl_FragColor = vec4(uCol, a); }`,
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(W, D), m); p.rotation.x = -Math.PI / 2; p.position.y = y; p.renderOrder = 3;
  p.userData.update = (t, k, night) => { uni.uOff.value.set((t * drift) % 1, Math.sin(t * 0.07 + seed) * 0.05); uni.uOp.value = Math.min(1, k.mist * 1.15); uni.uCol.value.set(night ? '#7f93b8' : '#ffffff'); p.visible = uni.uOp.value > 0.01; };
  return p;
}

/** Pluie : traits qui tombent dans le volume au-dessus du bassin (tout se passe dans le vertex shader). */
function rainLines(W, D, H, N = 320) {
  const pos = new Float32Array(N * 6), seed = new Float32Array(N * 6), end = new Float32Array(N * 2), rank = new Float32Array(N * 2), r = rng(77);
  for (let i = 0; i < N; i++) {
    const x = (r() - 0.5) * W, z = (r() - 0.5) * D, ph = r(), rk = (i + 0.5) / N;
    for (let k = 0; k < 2; k++) { const o = (i * 2 + k); seed.set([x, z, ph], o * 3); end[o] = k; rank[o] = rk; }
  }
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
  const l = new THREE.LineSegments(g, m); l.frustumCulled = false; l.renderOrder = 4; l.userData.uni = uni;
  return l;
}

export function makePond(W, D, depth = 0.6) {
  const g = group();
  const uni = { uTime: { value: 0 }, uNight: { value: 0 }, uRain: { value: 0 }, uMist: { value: 0 }, uCloud: { value: 0 } };

  const floorY = -0.46;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D, 1, 1).rotateX(-Math.PI / 2), floorMaterial(uni)); floor.position.y = floorY; g.add(floor);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(W, D, 72, 48).rotateX(-Math.PI / 2), waterMaterial(W, D, uni)); surface.renderOrder = 2; g.add(surface);

  // flancs du bloc (dégradé vertical)
  const side = canvasTexture(8, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2c7f95'); gr.addColorStop(1, '#0d3a52'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const sm = new THREE.MeshBasicMaterial({ map: side, side: THREE.DoubleSide });
  for (const [x, z, ry, len] of [[0, D / 2, 0, W], [W / 2, 0, Math.PI / 2, D], [0, -D / 2, Math.PI, W], [-W / 2, 0, -Math.PI / 2, D]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, depth), sm); p.position.set(x, -depth / 2, z); p.rotation.y = ry; g.add(p);
  }

  /* carpes koï : trajectoires lissées qui évitent les rochers de la rive */
  const kois = [];
  const KD = [[0, 0.40, 0.95, 0.30, 0.2, 0.34, 0], [1, 0.34, -0.75, 0.30, 0.2, 0.42, 2.1], [2, 0.36, 0.2, -0.28, 0.24, 0.28, 4.0], [3, 0.30, -0.35, 0.18, 0.18, 0.5, 1.2], [4, 0.28, 0.65, -0.1, 0.2, 0.38, 5.3]];
  KD.forEach(([kind, L, cx, cz, rz, sp, ph], i) => {
    const k = makeKoi(kind, 40 + i, uni, L); k.userData.p = { cx, cz, rx: 0.5 + (i % 3) * 0.12, rz, sp, ph, y: -0.1 - (i % 3) * 0.06 };
    k.userData.mats.forEach((m) => { m.uniforms.uPhase.value = ph; m.uniforms.uSpeed.value = 0.8 + sp; });
    g.add(k); kois.push(k);
  });
  const koiAt = (p, t, out) => { const a = t * p.sp + p.ph; out.set(p.cx + Math.cos(a) * p.rx, p.y + Math.sin(a * 1.7) * 0.02, p.cz + Math.sin(a * 1.3) * p.rz * 1.9); return out; };

  /* nénuphars */
  const pads = [];
  const PD = [[-0.5, 0.15, 0.17, 1], [-0.3, 0.05, 0.12, 2], [0.45, -0.62, 0.16, 3], [0.8, -0.45, 0.11, 4], [-1.15, -0.5, 0.15, 5], [1.35, 0.2, 0.13, 6], [-0.05, -0.7, 0.1, 7], [0.2, 0.55, 0.14, 8]];
  const padMats = [padTexture(3), padTexture(9)].map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, side: THREE.DoubleSide }));
  PD.forEach(([x, z, R, seed], i) => {
    const pg = new THREE.Group(); const pm = new THREE.Mesh(padGeo(R), padMats[i % 2]); pm.receiveShadow = true; pg.add(pm);
    if (i === 0 || i === 2 || i === 4) { const fl = lotus(R * 3.6); fl.position.y = 0.004; pg.add(fl); }
    pg.position.set(x, 0.014, z); pg.rotation.y = seed * 1.7; pg.userData = { x, z, seed, R };
    g.add(pg); pads.push(pg);
  });

  /* brume sur l'eau */
  const mists = [mistLayer(W, D, 0.3, 2, 0.011), mistLayer(W - 0.2, D - 0.2, 0.38, 7, -0.007)];
  mists.forEach((m) => g.add(m));
  const rain = rainLines(W, D, 1.5); rain.position.y = 0; g.add(rain);

  const v = new THREE.Vector3(), v2 = new THREE.Vector3();
  g.userData.uni = uni;
  g.userData.update = (t, night, k) => {
    uni.uTime.value = t; uni.uNight.value += ((night ? 1 : 0) - uni.uNight.value) * 0.05;
    uni.uRain.value = k.rain; uni.uMist.value = k.mist; uni.uCloud.value = k.cloud;
    for (const kk of kois) {
      const p = kk.userData.p; koiAt(p, t, v); koiAt(p, t + 0.08, v2);
      kk.position.copy(v); kk.rotation.y = Math.atan2(v2.x - v.x, v2.z - v.z);
      kk.rotation.z = Math.sin(t * p.sp * 2 + p.ph) * 0.03;
    }
    for (const pd of pads) { const u = pd.userData; pd.position.y = 0.016 + Math.sin(t * 1.1 + u.seed) * 0.004 + k.rain * Math.sin(t * 9 + u.seed * 3) * 0.002; pd.rotation.y = u.seed * 1.7 + Math.sin(t * 0.12 + u.seed) * 0.12; }
    for (const m of mists) m.userData.update(t, k, night);
    const ru = rain.userData.uni; ru.uTime.value = t; ru.uRain.value = k.rain; ru.uNight.value = uni.uNight.value; rain.visible = k.rain > 0.02;
  };
  g.userData.bounds = { W, D };
  return g;
}
