import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Boucle commune aux dioramas en « pixel art 3D » : caméra orthographique isométrique verrouillée,
 * rendu dans une cible basse résolution (un pixel de rendu = PX pixels d'écran), contours tirés du tampon de profondeur,
 * puis chaque pixel prend la plus proche des 64 couleurs de la palette, mesurée en OKLab. Ombres franches d'un seul soleil.
 * Tout est une fonction pure de t ; ?t=12.4 fige une image ; window.__diorama.freeze(t) depuis la QA.
 *
 * def: { palette (rgb 0..1), fit (Vector3[]), loop, build(scene) -> update(t), light(L)?, px?, stillT? }
 */
const VERT = 'out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uRes; uniform vec3 uPal[64]; uniform vec3 uPalRGB[64]; uniform float uDither;
vec3 toLin(vec3 c){ return pow(max(c, 0.0), vec3(2.2)); }
vec3 oklab(vec3 l){
  float a = 0.4122214708*l.r + 0.5363325363*l.g + 0.0514459929*l.b;
  float b = 0.2119034982*l.r + 0.6806995451*l.g + 0.1073969566*l.b;
  float c = 0.0883024619*l.r + 0.2817188376*l.g + 0.6299787005*l.b;
  a = pow(max(a,0.0), 1.0/3.0); b = pow(max(b,0.0), 1.0/3.0); c = pow(max(c,0.0), 1.0/3.0);
  return vec3(0.2104542553*a + 0.7936177850*b - 0.0040720468*c, 1.9779984951*a - 2.4285922050*b + 0.4505937099*c, 0.0259040371*a + 0.7827717662*b - 0.8086757660*c);
}
float bayer4(vec2 p){ p = mod(floor(p), 4.0); int i = int(p.x) + int(p.y) * 4;
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return m[i] / 16.0 - 0.47; }
void main(){
  vec2 px = 1.0 / uRes;
  vec4 c = texture(tColor, vUv);
  float d = texture(tDepth, vUv).r;
  float dn = 0.0, cov = 0.0;
  for (int k = 0; k < 4; k++) {
    vec2 o = k == 0 ? vec2(px.x, 0.0) : k == 1 ? vec2(-px.x, 0.0) : k == 2 ? vec2(0.0, px.y) : vec2(0.0, -px.y);
    float dd = texture(tDepth, vUv + o).r; float aa = texture(tColor, vUv + o).a;
    dn = max(dn, dd - d); cov += aa;
  }
  if (c.a < 0.5) { fragColor = vec4(0.0); return; }
  vec3 col = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
  col = clamp((col - 0.5) * 1.04 + 0.5, 0.0, 1.0);
  col += bayer4(gl_FragCoord.xy) * 0.035 * uDither;
  // contour : un voisin nettement plus loin (bord d'un objet), ou le vide autour de l'île
  float edge = step(0.0016, dn) + step(cov, 3.5);
  vec3 q = oklab(toLin(col));
  vec3 best = uPalRGB[0]; float bd = 1e9; vec3 dark = uPalRGB[0]; float dl = 1e9;
  for (int i = 0; i < 64; i++) { vec3 e = q - uPal[i]; e.x *= 1.3; float dd = dot(e, e); if (dd < bd) { bd = dd; best = uPalRGB[i]; } }
  if (edge > 0.5) {
    vec3 qd = q; qd.x -= 0.22;
    for (int i = 0; i < 64; i++) { vec3 e = qd - uPal[i]; e.x *= 1.6; float dd = dot(e, e); if (dd < dl) { dl = dd; dark = uPalRGB[i]; } }
    best = dark;
  }
  fragColor = vec4(best, 1.0);
}`;

function oklabJS([r, g, b]) {
  const L = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  const l = [L(r), L(g), L(b)];
  let a = 0.4122214708 * l[0] + 0.5363325363 * l[1] + 0.0514459929 * l[2], bb = 0.2119034982 * l[0] + 0.6806995451 * l[1] + 0.1073969566 * l[2], c = 0.0883024619 * l[0] + 0.2817188376 * l[1] + 0.6299787005 * l[2];
  a = Math.cbrt(a); bb = Math.cbrt(bb); c = Math.cbrt(c);
  return [0.2104542553 * a + 0.793617785 * bb - 0.0040720468 * c, 1.9779984951 * a - 2.428592205 * bb + 0.4505937099 * c, 0.0259040371 * a + 0.7827717662 * bb - 0.808675766 * c];
}

export function run(def) {
  const canvas = document.getElementById('stage');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true }); }
  catch (e) { document.getElementById('fallback').hidden = false; return; }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xf2f0ff, 0x7a6f60, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e2, 2.6); sun.position.set(-12, 22, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xc9d8ff, 0.45); fill.position.set(14, 10, -8); scene.add(fill);
  const L = { sun, hemi, fill };
  if (def.light) def.light(L);

  const az = def.azimuth ?? Math.PI / 4, el = def.elevation ?? (30 * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const target = def.target ?? new THREE.Vector3(0, 0, 0);
  camera.position.copy(target).addScaledVector(dir, 120); camera.lookAt(target);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize(), up = new THREE.Vector3().crossVectors(dir, right).normalize();
  let ext = [1e9, -1e9, 1e9, -1e9];
  for (const p of def.fit) { const v = p.clone().sub(target); const x = v.dot(right), y = v.dot(up); ext = [Math.min(ext[0], x), Math.max(ext[1], x), Math.min(ext[2], y), Math.max(ext[3], y)]; }
  const cxs = (ext[0] + ext[1]) / 2, cys = (ext[2] + ext[3]) / 2, hw = (ext[1] - ext[0]) / 2 * (def.margin ?? 1.06), hh = (ext[3] - ext[2]) / 2 * (def.margin ?? 1.06);
  camera.position.addScaledVector(right, cxs).addScaledVector(up, cys);

  const post = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(2, 2) }, uDither: { value: 1 },
      uPal: { value: def.palette.map((c) => new THREE.Vector3(...oklabJS(c))) }, uPalRGB: { value: def.palette.map((c) => new THREE.Vector3(...c)) } },
  });
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  let rt = null;
  const PX = def.px ?? 3;
  function resize() {
    const r = canvas.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const w = Math.max(64, Math.round(r.width / PX)), h = Math.max(64, Math.round(r.height / PX));
    if (rt && rt.width === w && rt.height === h) return;
    rt?.dispose(); rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType });
    rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.FloatType;
    renderer.setSize(w, h, false);
    post.uniforms.tColor.value = rt.texture; post.uniforms.tDepth.value = rt.depthTexture; post.uniforms.uRes.value.set(w, h);
    const aspect = w / h; let vw = hw, vh = hh; if (vw / vh > aspect) vh = vw / aspect; else vw = vh * aspect;
    Object.assign(camera, { left: -vw, right: vw, top: vh, bottom: -vh }); camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const update = def.build(scene, { renderer, camera, L });
  const q = new URLSearchParams(location.search);
  let frozen = q.has('t') ? parseFloat(q.get('t')) : null;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t0 = performance.now();
  const draw = (t) => {
    const tt = ((t % def.loop) + def.loop) % def.loop; update(tt);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.setClearColor(0xffffff, 0); renderer.clear(); renderer.render(quadScene, quadCam);
  };
  window.__diorama = { freeze(t) { frozen = t; draw(t); return t; }, resume() { frozen = null; }, info() { return { loop: def.loop, calls: renderer.info.render.calls, size: [rt.width, rt.height] }; } };
  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);
  function frame(now) { requestAnimationFrame(frame); if (!visible) return; draw(frozen ?? (still ? def.stillT ?? 0 : (now - t0) / 1000)); }
  draw(frozen ?? 0); window.__dioramaReady = true; requestAnimationFrame(frame);
}

/** Matériaux : un par entrée de palette (Lambert, ombré à plat), rien d'autre ne colore la scène. */
export function materials() {
  const cache = new Map();
  return (hex, opts = {}) => {
    const key = hex + JSON.stringify(opts);
    if (!cache.has(key)) cache.set(key, new THREE.MeshLambertMaterial({ color: new THREE.Color(hex), emissive: opts.glow ? new THREE.Color(hex) : 0x000000, emissiveIntensity: opts.glow ?? 0, transparent: !!opts.opacity, opacity: opts.opacity ?? 1, side: opts.double ? THREE.DoubleSide : THREE.FrontSide, depthWrite: opts.opacity ? false : true }));
    return cache.get(key);
  };
}
export const toRGB = (hexes) => hexes.map((h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; });
void RoomEnvironment;
