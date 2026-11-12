/* Rendu « bande dessinée » : aplats de couleur, trait d'encre, hachures dans l'ombre.
 * Une seule passe de scène : chaque matériau écrit sa couleur pure (rvb) et la lumière reçue (alpha) ;
 * la passe d'encrage lit ensuite la couleur et la profondeur.
 * Le trait vient du laplacien de la profondeur brute, nul sur une face plane : il ne reste que les arêtes et les silhouettes. */
import * as THREE from 'three';

export function encre(o = {}) {
  const m = new THREE.MeshLambertMaterial({ flatShading: true, ...o });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>', `
      float lum_ = dot(outgoingLight, vec3(0.3333)) / max(dot(diffuseColor.rgb, vec3(0.3333)), 0.004);
      gl_FragColor = vec4(pow(max(diffuseColor.rgb, 0.0), vec3(0.4545)), clamp(lum_ * 0.5, 0.0, 1.0));`);
  };
  return m;
}

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform sampler2D tC; uniform highp sampler2D tD;
uniform vec2 res; uniform float near; uniform float far; uniform float pixAngle; uniform float fondu; uniform float plancher;
uniform mat4 projInv; uniform mat4 camMonde; uniform vec3 astre; uniform vec3 astre2;
uniform vec3 cZenith; uniform vec3 cHorizon; uniform vec3 cEncre; uniform vec3 cOmbre;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y); }
float prof(vec2 uv){ return texture2D(tD, uv).x; }
float zLin(float d){ float z = d*2.0-1.0; return 2.0*near*far / (far+near - z*(far-near)); }
void main(){
  float k = max(1.0, res.y / 820.0);
  vec2 fc = vUv * res / k;
  vec2 trembl = (vec2(bruit(fc/11.0), bruit(fc/11.0 + 37.0)) - 0.5) * 1.5 * k / res;
  vec2 uv = vUv + trembl;
  vec2 px = vec2(k) / res;
  float d = prof(uv);
  float dl = prof(uv - vec2(px.x, 0.)), dr = prof(uv + vec2(px.x, 0.)), dh = prof(uv + vec2(0., px.y)), db = prof(uv - vec2(0., px.y));
  float d1 = prof(uv + px), d2 = prof(uv - px), d3 = prof(uv + vec2(px.x, -px.y)), d4 = prof(uv + vec2(-px.x, px.y));
  float dmin = min(d, min(min(dl, dr), min(dh, db)));
  /* arête : écart entre les moyennes des paires opposées et le centre. Sur une face plane les cinq valeurs sont égales.
     On écarte la plus petite et la plus grande : un texel de profondeur isolé (jointure de triangles) ne fait plus de point d'encre. */
  float a0 = d, a1 = 0.5 * (dl + dr), a2 = 0.5 * (dh + db), a3 = 0.5 * (d1 + d2), a4 = 0.5 * (d3 + d4), t_;
  #define TRI(x, y) t_ = min(x, y); y = max(x, y); x = t_;
  TRI(a0, a1) TRI(a3, a4) TRI(a2, a4) TRI(a2, a3) TRI(a0, a3) TRI(a0, a2) TRI(a1, a4) TRI(a1, a3) TRI(a1, a2)
  float lap = max(0.0, 2.0 * (a3 - a1) - plancher);
  float arete = lap / max(1.0 - dmin, 1e-7) / (pixAngle * k);
  float z = zLin(dmin);
  vec4 c = texture2D(tC, uv);
  vec3 cl = texture2D(tC, uv - vec2(px.x, 0.)).rgb, cr = texture2D(tC, uv + vec2(px.x, 0.)).rgb;
  vec3 ch = texture2D(tC, uv + vec2(0., px.y)).rgb, cb = texture2D(tC, uv - vec2(0., px.y)).rgb;
  float teinte = max(max(distance(c.rgb, cl), distance(c.rgb, cr)), max(distance(c.rgb, ch), distance(c.rgb, cb)));
  float trait = max(smoothstep(0.42, 0.9, arete), smoothstep(0.07, 0.16, teinte) * (1.0 - 0.85 * smoothstep(12.0, 38.0, z)));   // au loin, les limites de couleur ne sont plus encrées (textes, motifs)
  trait *= 1.0 - 0.8 * smoothstep(140.0, 520.0, z);

  vec3 col;
  if (d >= 0.99999) {
    vec4 v = projInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 dir = normalize((camMonde * vec4(v.xyz / v.w, 0.0)).xyz);
    col = mix(cHorizon, cZenith, smoothstep(-0.02, 0.55, dir.y));
    float a = dot(dir, astre), b = dot(dir, astre2);
    if (a > 0.9935) col = vec3(0.98, 0.93, 0.80);
    if (abs(a - 0.9935) < 0.00045) col = cEncre;
    if (b > 0.9988) col = vec3(0.93, 0.62, 0.50);
    if (abs(b - 0.9988) < 0.00022) col = cEncre;
    float anneau = abs(dot(dir, normalize(vec3(astre.x, astre.y + 0.35, astre.z))) - 0.972);
    if (anneau < 0.0006 && a < 0.9935) col = mix(col, cEncre, 0.7);
  } else {
    col = c.rgb;
    float lum = c.a * 2.0;
    float n = bruit(fc / 23.0);
    float h1 = 1.0 - smoothstep(0.07, 0.17, abs(fract((fc.x + fc.y) / 6.5 + n * 0.35) - 0.5));
    float h2 = 1.0 - smoothstep(0.07, 0.17, abs(fract((fc.x - fc.y) / 6.5 + n * 0.35) - 0.5));
    float loin = 1.0 - smoothstep(60.0, 260.0, z);
    if (lum < 0.80) col *= mix(vec3(1.0), vec3(0.90, 0.87, 0.90), smoothstep(0.80, 0.70, lum));
    if (lum < 0.46) { col = mix(col, col * cOmbre, 0.9); col = mix(col, cEncre, h1 * 0.62 * loin); }
    if (lum < 0.255) col = mix(col, cEncre, h2 * 0.55 * loin);
    col = mix(col, cHorizon, 0.82 * smoothstep(70.0, 1100.0, z));
  }
  col = mix(col, cEncre, trait);
  col *= 0.965 + 0.05 * bruit(fc * 0.9);
  vec2 q = vUv - 0.5; col *= 1.0 - 0.22 * dot(q, q);
  col = mix(col, vec3(0.93, 0.89, 0.80), fondu);
  gl_FragColor = vec4(col, 1.0);
}`;

export function creerRendu(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const cible = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  cible.depthTexture = new THREE.DepthTexture(4, 4);
  cible.depthTexture.type = THREE.FloatType;
  cible.depthTexture.minFilter = cible.depthTexture.magFilter = THREE.NearestFilter;
  const u = {
    tC: { value: cible.texture }, tD: { value: cible.depthTexture }, res: { value: new THREE.Vector2(4, 4) },
    near: { value: 0.3 }, far: { value: 2000 }, pixAngle: { value: 0.001 }, plancher: { value: 6e-7 }, fondu: { value: 1 },
    projInv: { value: new THREE.Matrix4() }, camMonde: { value: new THREE.Matrix4() },
    astre: { value: new THREE.Vector3(-0.45, 0.42, -0.79).normalize() }, astre2: { value: new THREE.Vector3(0.62, 0.3, -0.72).normalize() },
    cZenith: { value: new THREE.Vector3(0.40, 0.66, 0.60) }, cHorizon: { value: new THREE.Vector3(0.87, 0.86, 0.72) },
    cEncre: { value: new THREE.Vector3(0.14, 0.11, 0.16) }, cOmbre: { value: new THREE.Vector3(0.74, 0.70, 0.84) },
  };
  const passe = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false }));
  passe.frustumCulled = false;
  const scenePasse = new THREE.Scene(); scenePasse.add(passe);
  const camPasse = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let qualite = Math.min(window.devicePixelRatio || 1, 2);

  function taille(camera) {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(qualite); renderer.setSize(w, h, false);
    const W = Math.round(w * qualite), H = Math.round(h * qualite);
    cible.setSize(W, H); u.res.value.set(W, H);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    u.pixAngle.value = 2 * Math.tan(camera.fov * Math.PI / 360) / H;
    u.near.value = camera.near; u.far.value = camera.far;
  }
  function rendre(scene, camera) {
    renderer.setRenderTarget(cible); renderer.clear(); renderer.render(scene, camera);
    u.projInv.value.copy(camera.projectionMatrixInverse); u.camMonde.value.copy(camera.matrixWorld);
    renderer.setRenderTarget(null); renderer.render(scenePasse, camPasse);
  }
  /* si la machine peine, on réduit la définition par paliers (jamais en dessous de 0,75) */
  function allege(camera) { if (qualite <= 0.75) return false; qualite = Math.max(0.75, qualite - 0.25); taille(camera); return true; }
  return { renderer, rendre, taille, allege, fondu: u.fondu, u };
}
