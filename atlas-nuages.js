/* ATLAS · NUAGES VOLUMÉTRIQUES. Même technique que le chien-fantôme de Talas (talas-chien.js) : chaque nuage est un VOLUME, pas un
 * maillage. Un nuage est un champ de distance signée (sphères fondues au « smooth-min », base aplatie), que le fragment parcourt au
 * rayon dans une boîte proxy ; pas de rayon adaptatifs (grands pas loin de la surface, petits pas dedans), densité érodée par un bruit
 * 3D qui dérive comme un cumulus qui bourgeonne, lumière marchée vers le soleil (ombre propre, bord argenté), ambiance du ciel
 * (dessous gris-bleu). Nouveauté par rapport au chien : le rayon s'arrête à la profondeur de la scène déjà dessinée (la texture de
 * profondeur du rendu opaque), avec un fondu doux, donc un nuage peut passer devant ou derrière l'île, et la lécher.
 *
 *   const nuages = creerNuages({ qualite: 1 })                    ->  nuages.groupe (à ajouter à la scène des nuages)
 *   nuages.tick(dt, t, camera, ciel, texProfondeur, taille)       chaque image, avant le rendu de la passe des nuages */
import * as THREE from './three.module.js';
import { GLSL_BRUIT } from './atlas-ciel.js';

const NP = 14;                                                  // sphères par nuage au plus

const VERT = 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const FRAG = `
precision highp float;
${GLSL_BRUIT}
uniform float uT, uSeed, uBase, uH, uNuit, uAlpha, uSteps, uEchelle;
uniform int uN;
uniform vec4 uP[${NP}];
uniform vec3 uCamL, uLightL, uSunCol, uAmbTop, uAmbBot, uBoxMin, uBoxMax, uCentre;
uniform vec2 uRes; uniform mat4 uPInv;
uniform sampler2D uProf;
varying vec3 vP;

float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }

float forme(vec3 p){
  float d = 1e5;
  for (int i = 0; i < ${NP}; i++){
    if (i >= uN) break;
    vec4 q = uP[i];
    float r = q.w * (1. + .035 * sin(uT * .45 + float(i) * 1.9 + uSeed));     // le nuage respire
    d = smin(d, length(p - q.xyz) - r, .42);
  }
  return smax(d, uBase - p.y, .3);                                          // base plate, bord arrondi
}
float dens(vec3 p, float d){
  float n = fbm3(p * 2.6 + vec3(uT * .045, -uT * .03, uSeed * 3.1));        // bourgeonnement
  float e = d + (n - .5) * .62 + (fbm3(p * 7.3 + uSeed) - .5) * .14;
  return clamp(-e * 3.4, 0., 1.);
}

void main(){
  vec3 ro = uCamL, rd = normalize(vP - uCamL);
  vec3 inv = 1. / rd, t0 = (uBoxMin - ro) * inv, t1 = (uBoxMax - ro) * inv, tmn = min(t0, t1), tmx = max(t0, t1);
  float tN = max(max(max(tmn.x, tmn.y), tmn.z), 0.), tF = min(min(tmx.x, tmx.y), tmx.z);
  if (tF <= tN) discard;
  /* profondeur de la scène déjà dessinée, ramenée en unités locales du nuage */
  vec2 uv = gl_FragCoord.xy / uRes;
  float zs = texture2D(uProf, uv).r;
  vec4 vp = uPInv * vec4(uv * 2. - 1., zs * 2. - 1., 1.); vp /= vp.w;
  float tScene = length(vp.xyz) / uEchelle;
  float t = tN + h21(gl_FragCoord.xy + uT * 7.) * .09;
  vec4 acc = vec4(0.);
  int N = int(uSteps);
  for (int i = 0; i < 72; i++){
    if (i >= N || t > tF || acc.a > .985) break;
    vec3 p = ro + rd * t;
    float d = forme(p);
    if (d > .32){ t += max(d * .55, .09); continue; }
    float fade = smoothstep(0., .5, tScene - t);                           // le nuage s'efface avant la surface qu'il touche
    float dn = dens(p, d) * fade;
    float st = max(.075, abs(d) * .42);
    if (dn > .01){
      vec3 pl = p + uLightL * .22; float s1 = dens(pl, forme(pl));
      vec3 pl2 = p + uLightL * .55; float s2 = dens(pl2, forme(pl2));
      vec3 pl3 = p + uLightL * 1.1; float s3 = dens(pl3, forme(pl3));
      float sh = exp(-(s1 * 1.5 + s2 * 1.2 + s3 * .9));
      float hh = clamp((p.y - uBase) / uH, 0., 1.);
      vec3 amb = mix(uAmbBot, uAmbTop, smoothstep(0., .9, hh));
      float phase = pow(max(dot(rd, uLightL), 0.), 7.) * .55 + .45;
      float poudre = 1. - exp(-dn * 2.2);                                  // les bords minces restent clairs
      vec3 col = amb * (.72 + .28 * sh) * (1. + (1. - dn) * .12) + uSunCol * sh * phase * (.95 - .25 * uNuit);
      col *= .88 + .12 * poudre;
      float a = 1. - exp(-dn * st * 17.);
      acc.rgb += (1. - acc.a) * col * a; acc.a += (1. - acc.a) * a;
    }
    t += st;
  }
  if (acc.a < .004) discard;
  gl_FragColor = vec4(acc.rgb * uAlpha, acc.a * uAlpha);
}`;

function aleatoire(graine) { let s = graine >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/* un cumulus : trois rangées de sphères, la plus basse la plus large, avec un peu de profondeur ; boîte englobante déduite */
function formeCumulus(rng, largeur) {
  const P = [], L = largeur;
  const rangee = (n, y, ecart, rmin, rmax, zs) => { for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * ecart + (rng() - .5) * ecart * .5, r = rmin + rng() * (rmax - rmin) * (1 - Math.abs(x) / (L * .8)); P.push([x, y + (rng() - .5) * .25, (rng() - .5) * zs, Math.max(.55, r)]); } };
  rangee(Math.round(3 + rng() * 2.4), .45, L / 4.6, .9, 1.4, 1.5);
  rangee(Math.round(2 + rng() * 2), 1.05 + rng() * .3, L / 5.2, .85, 1.25, 1.1);
  if (rng() < .8) rangee(1 + (rng() * 2 | 0), 1.7 + rng() * .35, L / 6, .7, 1.05, .7);
  const box = { min: [1e9, 0, 1e9], max: [-1e9, -1e9, -1e9] };
  for (const [x, y, z, r] of P.slice(0, NP)) { box.min[0] = Math.min(box.min[0], x - r); box.min[2] = Math.min(box.min[2], z - r); box.max[0] = Math.max(box.max[0], x + r); box.max[1] = Math.max(box.max[1], y + r); box.max[2] = Math.max(box.max[2], z + r); }
  box.min[0] -= .6; box.min[2] -= .6; box.max[0] += .6; box.max[1] += .6; box.max[2] += .6; box.min[1] = -.35;
  return { puffs: P.slice(0, NP), box };
}

export function creerNuages(opts = {}) {
  const qual = opts.qualite ?? 1;
  const groupe = new THREE.Group(), liste = [];
  const commun = {
    uT: { value: 0 }, uLightL: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#ffefd0') },
    uAmbTop: { value: new THREE.Color('#f3f8ff') }, uAmbBot: { value: new THREE.Color('#9db4d6') }, uNuit: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uPInv: { value: new THREE.Matrix4() }, uProf: { value: null }, uSteps: { value: qual >= 1 ? 44 : 28 },
  };
  /* les nuages : anneau autour de l'île, à des altitudes variées (dessus, niveau de l'île, dessous) */
  const plan = opts.plan || [];
  plan.forEach((c, i) => {
    const rng = aleatoire(1000 + i * 77), forme = formeCumulus(rng, 5.6 + rng() * 2.4);
    const uni = {
      ...Object.fromEntries(Object.keys(commun).map((k) => [k, commun[k]])),
      uSeed: { value: i * 3.7 + 1 }, uBase: { value: 0 }, uH: { value: forme.box.max[1] }, uAlpha: { value: 1 }, uEchelle: { value: c.echelle },
      uN: { value: forme.puffs.length }, uP: { value: Array.from({ length: NP }, (_, k) => new THREE.Vector4(...(forme.puffs[k] || [0, -9, 0, .01]))) },
      uCamL: { value: new THREE.Vector3() }, uBoxMin: { value: new THREE.Vector3(...forme.box.min) }, uBoxMax: { value: new THREE.Vector3(...forme.box.max) }, uCentre: { value: new THREE.Vector3() },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false, side: THREE.BackSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const b = forme.box, geo = new THREE.BoxGeometry(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
    geo.translate((b.max[0] + b.min[0]) / 2, (b.max[1] + b.min[1]) / 2, (b.max[2] + b.min[2]) / 2);
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.scale.setScalar(c.echelle);
    m.position.set(c.x, c.y, c.z); m.userData = { vx: c.vx ?? .22, rayon: c.rayon ?? 9.4 * c.echelle, uni, nom: c.nom || ('n' + i) };
    groupe.add(m); liste.push(m);
  });
  const inv = new THREE.Matrix4(), cam = new THREE.Vector3();
  const api = {
    groupe, liste, uniformes: commun,
    /* centre : l'île ; borne : rayon de recyclage (un nuage sorti par un côté revient par l'autre) */
    tick(dt, t, camera, ciel, texProf, taille, borne = 46) {
      commun.uT.value = t; commun.uRes.value.set(taille.x, taille.y); commun.uProf.value = texProf;
      commun.uPInv.value.copy(camera.projectionMatrixInverse);
      commun.uLightL.value.copy(ciel.soleil);
      commun.uNuit.value = ciel.uniformes.uNuit.value;
      commun.uSunCol.value.copy(ciel.uniformes.uSunCol.value).multiplyScalar(1.0);
      const k = ciel.uniformes.uNuit.value;
      commun.uAmbTop.value.set('#f3f8ff').lerp(new THREE.Color('#3a4f7a'), k); commun.uAmbBot.value.set('#9fb6d8').lerp(new THREE.Color('#141f3a'), k);
      for (const m of liste) {
        const u = m.userData;
        m.position.x += u.vx * dt; if (m.position.x > borne) m.position.x -= 2 * borne;
        m.updateMatrixWorld(true); inv.copy(m.matrixWorld).invert();
        cam.copy(camera.position).applyMatrix4(inv); u.uni.uCamL.value.copy(cam);
      }
      /* boules d'ombre pour l'océan, l'île et la végétation */
      const nu = ciel.uniformes.uNu.value;
      for (let i = 0; i < 16; i++) { const m = liste[i]; if (m) nu[i].set(m.position.x, m.position.y + m.scale.x * 0.9, m.position.z, m.userData.rayon * 0.5); else nu[i].set(0, 0, 0, 0); }
    },
  };
  return api;
}
