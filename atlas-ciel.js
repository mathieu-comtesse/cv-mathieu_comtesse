/* ATLAS · CIEL, SOLEIL ET OCÉAN. Le ciel est un dôme dégradé (soleil, halo, étoiles la nuit) qui sert aussi de carte d'environnement
 * (PMREM) pour les reflets ; l'océan est un grand plan très loin sous l'île, bleu profond rayé d'écume, qui reçoit l'ombre des nuages
 * et celle de l'île. Tout est procédural (aucune image).
 *
 *   const ciel = creerCiel(renderer, scene)        ->  ciel.soleil (Vector3 vers le soleil), ciel.nuit(k 0..1), ciel.tick(dt, t, camera)
 *   ciel.ocean (Mesh), ciel.uniformes (partagés avec les matériaux de l'île : ombres de nuages, etc.) */
import * as THREE from './three.module.js';

/* bruit 3D / 2D partagé par tous les shaders de l'atlas (même fonction côté fragment) */
export const GLSL_BRUIT = `
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
float fbm3(vec3 p){ return n3(p) * .55 + n3(p * 2.13 + 7.1) * .3 + n3(p * 4.37 + 3.3) * .15; }
float fbm2(vec2 p){ return n2(p) * .5 + n2(p * 2.03 + 5.2) * .27 + n2(p * 4.1 + 1.7) * .15 + n2(p * 8.3 + 9.1) * .08; }
`;

/* dégradé du ciel : le même code pour le dôme, l'environnement et les reflets de l'océan */
export const GLSL_CIEL = `
uniform vec3 uZenith, uMilieu, uHorizon, uSunDir, uSunCol; uniform float uNuit;
vec3 couleurCiel(vec3 d){
  float h = clamp(d.y, -.3, 1.);
  vec3 c = mix(uHorizon, uMilieu, smoothstep(0., .35, h));
  c = mix(c, uZenith, smoothstep(.25, .95, h));
  c = mix(c, uHorizon * .85, smoothstep(0., -.3, d.y));
  float s = max(dot(d, uSunDir), 0.);
  c += uSunCol * (pow(s, 6.) * .28 + pow(s, 64.) * .55 + smoothstep(.9992, .9997, s) * 9.);
  return c;
}`;

/* ombres des nuages : chaque nuage est une boule (x, y, z, rayon) ; un point est dans l'ombre si le rayon vers le soleil la frôle */
export const GLSL_OMBRES = `
uniform vec4 uNu[16];
float ombreNuages(vec3 p){
  float s = 0.;
  for (int i = 0; i < 16; i++){
    vec4 c = uNu[i]; if (c.w <= 0.) continue;
    vec3 v = c.xyz - p; float al = dot(v, uSunDir); if (al < 0.) continue;
    vec3 q = v - uSunDir * al; s += exp(-dot(q, q) / (c.w * c.w));
  }
  return clamp(s, 0., .8);
}`;

const JOUR = { zenith: '#1f64c8', milieu: '#4f9be6', horizon: '#bfe0f5', sol: '#fffaf0', soleilCol: '#fff0d2', ocean: ['#143f5e', '#23648a', '#3d8aa9'] };
const NUIT = { zenith: '#02040f', milieu: '#0a1430', horizon: '#1d3050', sol: '#8aa4d0', soleilCol: '#9fb7e8', ocean: ['#010a1e', '#03204a', '#0b3a73'] };

export function creerCiel(renderer, scene, opts = {}) {
  const C = (h) => new THREE.Color(h);
  const U = {
    uZenith: { value: C(JOUR.zenith) }, uMilieu: { value: C(JOUR.milieu) }, uHorizon: { value: C(JOUR.horizon) },
    uSunDir: { value: new THREE.Vector3(-0.55, 0.78, 0.36).normalize() }, uSunCol: { value: C(JOUR.soleilCol) }, uNuit: { value: 0 },
    uT: { value: 0 }, uCam: { value: new THREE.Vector3() },
    uOcDeep: { value: C(JOUR.ocean[0]) }, uOcMid: { value: C(JOUR.ocean[1]) }, uOcLight: { value: C(JOUR.ocean[2]) },
    uIle: { value: new THREE.Vector3(0, 0, 0) },                   // centre de l'île (ombre portée sur l'océan)
    uNu: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, 0)) },        // boules d'ombre des nuages (x, y, z, rayon)
  };
  const ciel = { soleil: U.uSunDir.value, uniformes: U, etat: 0 };

  /* ------------------------------------------------------------------ dôme */
  const domeMat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }',
    fragmentShader: `${GLSL_BRUIT}${GLSL_CIEL}
      varying vec3 vD;
      void main(){
        vec3 d = normalize(vD);
        vec3 c = couleurCiel(d);
        float etoiles = step(.9965, h31(floor(d * 260.))) * smoothstep(.05, .5, d.y) * uNuit;
        c += vec3(.8, .9, 1.) * etoiles * (.4 + .6 * h31(floor(d * 260.) + 4.));
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), domeMat);
  dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);
  ciel.dome = dome;

  /* ------------------------------------------------------------------ environnement (reflets) */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), domeMat); envDome.frustumCulled = false; envScene.add(envDome);
  let envRT = null, envDernier = -1;
  ciel.rafraichirEnv = () => {
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.03);
    scene.environment = envRT.texture; envDernier = U.uNuit.value;
  };
  ciel.rafraichirEnv();

  /* ------------------------------------------------------------------ océan, très loin sous l'île */
  const NIVEAU = opts.niveauOcean ?? -36;
  const oceanMat = new THREE.ShaderMaterial({
    uniforms: U, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `${GLSL_BRUIT}${GLSL_CIEL}${GLSL_OMBRES}
      uniform float uT; uniform vec3 uCam, uOcDeep, uOcMid, uOcLight, uIle;
      varying vec3 vW;
      /* houle : somme d'ondes dirigées, gradient analytique + détail fin */
      vec2 houle(vec2 p, float t){
        vec2 g = vec2(0.);
        for (int i = 0; i < 5; i++){
          float fi = float(i), a = .9 + fi * 1.25, k = .11 * pow(1.7, fi), w = sqrt(k * 9.8) * .6;
          vec2 d = vec2(cos(a), sin(a));
          g += d * cos(dot(d, p) * k + t * w + fi * 2.1) * (.5 / (1. + fi * 1.3));
        }
        return g;
      }
      void main(){
        vec2 p = vW.xz;
        vec2 g = houle(p, uT) * .55;
        g += (vec2(n2(p * .9 + uT * .18), n2(p * .9 + 17. - uT * .15)) - .5) * .5;
        g += (vec2(n2(p * 3.1 - uT * .3), n2(p * 3.1 + 9. + uT * .26)) - .5) * .22;
        vec3 N = normalize(vec3(-g.x * .45, 1., -g.y * .45));
        vec3 V = normalize(uCam - vW);
        float cosv = max(dot(N, V), 0.);
        float fres = .03 + .97 * pow(1. - cosv, 5.);
        vec3 R = reflect(-V, N);
        vec3 ciel = couleurCiel(vec3(R.x, abs(R.y), R.z));
        /* teinte : plus claire et plus verte là où la houle se dresse vers le soleil, bleu nuit dans les creux */
        float crete = clamp(.5 + dot(g, vec2(.55, .3)) * .9, 0., 1.);
        vec3 eau = mix(uOcDeep, uOcMid, smoothstep(.15, .85, fbm2(p * .035 + uT * .01) * .9 + crete * .3));
        eau = mix(eau, uOcLight, smoothstep(.6, 1., crete) * .45);
        /* traînées d'écume qui s'étirent dans le sens de la houle */
        float e = fbm2(p * vec2(.55, 1.35) + vec2(uT * .06, 0.)) * fbm2(p * vec2(.13, .3) - uT * .02);
        float ecume = smoothstep(.2, .34, e + crete * .1) * (.2 + .8 * crete) * (1. - uNuit * .6) * (1. - smoothstep(0., 1., n2(p * .05) * 1.3 - .25) * .55);
        vec3 col = mix(eau, ciel * vec3(.8, .9, 1.), fres * .55);
        col += uSunCol * pow(max(dot(R, uSunDir), 0.), 500.) * 9. * (1. - uNuit * .5);
        col += uSunCol * pow(max(dot(R, uSunDir), 0.), 40.) * .22;
        col = mix(col, vec3(.88, .96, 1.), ecume * .34);
        /* ombres des nuages et de l'île (projetées le long du soleil sur l'océan) */
        float ombre = ombreNuages(vW) * 1.0;
        vec2 oi = uIle.xz - uSunDir.xz / uSunDir.y * (uIle.y - (${NIVEAU.toFixed(1)}));
        vec2 di = (p - oi) * vec2(1., 1.25);
        ombre += .62 * exp(-dot(di, di) / 140.);
        col *= 1. - clamp(ombre, 0., .72) * .55;
        /* brume de distance vers l'horizon */
        float dist = length(vW - uCam);
        float brume = 1. - exp(-pow(dist * .0045, 2.2));
        col = mix(col, couleurCiel(normalize(vec3(V.x * -1., .02, V.z * -1.))), clamp(brume, 0., .96));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1).rotateX(-Math.PI / 2), oceanMat);
  ocean.position.y = NIVEAU; ocean.frustumCulled = false; ocean.renderOrder = -5; scene.add(ocean);
  ciel.ocean = ocean; ciel.niveauOcean = NIVEAU;

  /* ------------------------------------------------------------------ jour / nuit (0 jour, 1 nuit) */
  const jz = C(JOUR.zenith), jm = C(JOUR.milieu), jh = C(JOUR.horizon), jc = C(JOUR.soleilCol);
  const nz = C(NUIT.zenith), nm = C(NUIT.milieu), nh = C(NUIT.horizon), nc = C(NUIT.soleilCol);
  ciel.nuit = (k) => {
    U.uNuit.value = k;
    U.uZenith.value.copy(jz).lerp(nz, k); U.uMilieu.value.copy(jm).lerp(nm, k); U.uHorizon.value.copy(jh).lerp(nh, k); U.uSunCol.value.copy(jc).lerp(nc, k);
    U.uOcDeep.value.set(JOUR.ocean[0]).lerp(C(NUIT.ocean[0]), k); U.uOcMid.value.set(JOUR.ocean[1]).lerp(C(NUIT.ocean[1]), k); U.uOcLight.value.set(JOUR.ocean[2]).lerp(C(NUIT.ocean[2]), k);
    if (Math.abs(k - envDernier) > 0.08) ciel.rafraichirEnv();
  };
  /* le soleil (ou la lune) : direction et couleur de la lumière directionnelle */
  ciel.tick = (dt, t, camera) => { U.uT.value = t; U.uCam.value.copy(camera.position); dome.position.copy(camera.position); };
  return ciel;
}
