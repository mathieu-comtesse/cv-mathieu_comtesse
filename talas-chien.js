/* LE CHIEN-FANTÔME DE TALAS : un volume, pas un maillage. Le corps est un champ de distance signée (SDF : ellipsoïdes et capsules fondus au « smooth-min »,
 * pattes articulées par une vraie démarche, queue en chaîne) que le fragment parcourt au rayon comme les nuages volumétriques d'Horizon Forbidden West :
 * pas de rayon adaptatifs, densité érodée par un bruit 3D qui remonte comme de la fumée, ombre propre vers la lune, lueur intérieure et yeux.
 *
 *   TALAS_CHIEN.creer({ pas: 34 })  -> Group ; userData.tick(dt, T, vitesse, camera, dirVersLaLune, couleurLune, ambiante) chaque image ; userData.aboie()
 * Dépend de : talas-rendu.js (activé). Repère local : +z devant, +y en haut, l'origine au sol sous le ventre ; le groupe peut être mis à l'échelle. */
(function () {
  'use strict'
  const THREE = window.THREE, RD = window.TALAS_RENDU
  if (!THREE || !RD || !RD.on) return
  const C = window.TALAS_CHIEN = {}
  const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

  const FRAG = `
precision highp float;
uniform float uT, uGait, uSp, uWag, uBreath, uHead, uAlpha, uBark, uSteps;
uniform vec3 uCamL, uLightL, uCol, uCol2, uAmb, uLightC;
varying vec3 vP;
const vec3 BMIN = vec3(-1.05, -.02, -1.75), BMAX = vec3(1.05, 2.25, 1.85);

float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ return n3(p) * .55 + n3(p * 2.13 + 7.1) * .3 + n3(p * 4.37 + 3.3) * .15; }

float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdEll(vec3 p, vec3 c, vec3 r){ vec3 q = p - c; float k0 = length(q / r), k1 = length(q / (r * r)); return k0 * (k0 - 1.) / max(k1, 1e-4); }

/* patte : épaule h, phase de foulée ph, sens du genou */
float leg(vec3 p, vec3 h, float ph, float upper, float lower, float kneeSign){
  float a1 = sin(ph) * .62 * uSp, a2 = (.5 + .5 * sin(ph - 1.5)) * 1.0 * uSp + .08;
  vec3 knee = h + vec3(0., -cos(a1), sin(a1)) * upper;
  float b = a1 * .3 - a2 * kneeSign;
  vec3 foot = knee + vec3(0., -cos(b), sin(b)) * lower;
  float d = sdCap(p, h, knee, .105);
  d = smin(d, sdCap(p, knee, foot, .062), .07);
  d = smin(d, sdEll(p, foot + vec3(0., .02, .05), vec3(.08, .05, .13)), .05);
  return d;
}
/* repère de la tête : pivot à la base du cou, tourné par uHead */
vec3 headSpace(vec3 p){ float ch = cos(uHead), sh = sin(uHead); vec3 q = p - vec3(0., 1.1, .72); q.xz = mat2(ch, -sh, sh, ch) * q.xz; return q + vec3(0., 1.1, .72); }

float dog(vec3 p){
  float br = uBreath;
  /* tronc, poitrail profond, croupe */
  float d = sdEll(p, vec3(0., .93 + br, -.04), vec3(.31, .33 + br, .62));
  d = smin(d, sdEll(p, vec3(0., .97 + br, .42), vec3(.30, .40 + br, .34)), .22);
  d = smin(d, sdEll(p, vec3(0., .92, -.55), vec3(.28, .31, .30)), .2);
  /* chaque groupe (tête, pattes, queue) n'est évalué que près de sa sphère englobante ; loin, la sphère donne une borne de distance sûre */
  float g = length(p - vec3(0., 1.3, 1.1)) - .78;
  if (g > .3) d = min(d, g);
  else {
    vec3 q = headSpace(p);
    float dh = smin(sdCap(q, vec3(0., 1.05, .62), vec3(0., 1.28, .95), .2), sdEll(q, vec3(0., 1.36, 1.1), vec3(.22, .21, .26)), .12);
    dh = smin(dh, sdCap(q, vec3(0., 1.3, 1.24), vec3(0., 1.24 - uBark * .05, 1.52), .125), .08);
    dh = smin(dh, sdCap(q, vec3(.13, 1.52, 1.02), vec3(.25, 1.3, .9), .065), .06);
    dh = smin(dh, sdCap(q, vec3(-.13, 1.52, 1.02), vec3(-.25, 1.3, .9), .065), .06);
    d = smin(d, dh, .16);
  }
  /* quatre pattes plus courtes : diagonales en opposition */
  g = length(p - vec3(.19, .42, .48)) - .8; if (g > .3) d = min(d, g); else d = smin(d, leg(p, vec3(.19, .8, .48), uGait, .43, .43, 1.), .09);
  g = length(p - vec3(-.19, .42, .48)) - .8; if (g > .3) d = min(d, g); else d = smin(d, leg(p, vec3(-.19, .8, .48), uGait + 3.14159, .43, .43, 1.), .09);
  g = length(p - vec3(.19, .4, -.55)) - .8; if (g > .3) d = min(d, g); else d = smin(d, leg(p, vec3(.19, .78, -.55), uGait + 3.14159, .43, .43, -1.), .09);
  g = length(p - vec3(-.19, .4, -.55)) - .8; if (g > .3) d = min(d, g); else d = smin(d, leg(p, vec3(-.19, .78, -.55), uGait, .43, .43, -1.), .09);
  /* queue épaisse qui se relève et balaie */
  g = length(p - vec3(0., 1.2, -1.15)) - .85;
  if (g > .3) d = min(d, g);
  else { vec3 a = vec3(0., 1.0, -.8); float ang = uWag;
    for (int i = 0; i < 4; i++){ vec3 b = a + vec3(sin(ang) * .17, .13 + float(i) * .05, -cos(ang) * .15); d = smin(d, sdCap(p, a, b, .095 - float(i) * .014), .07); a = b; ang += uWag * .35; } }
  return d;
}
float eyes(vec3 p){ vec3 q = headSpace(p); return smoothstep(.06, .022, min(length(q - vec3(.115, 1.42, 1.23)), length(q - vec3(-.115, 1.42, 1.23)))); }

float dens(vec3 p, float d){
  float n = fbm3(p * 3.3 + vec3(0., -uT * .7, uT * .25));
  float e = d + (n - .48) * .3;
  return clamp(-e * 6., 0., 1.);
}

void main(){
  vec3 ro = uCamL, rd = normalize(vP - uCamL);
  vec3 inv = 1. / rd, t0 = (BMIN - ro) * inv, t1 = (BMAX - ro) * inv, tmn = min(t0, t1), tmx = max(t0, t1);
  float tN = max(max(max(tmn.x, tmn.y), tmn.z), 0.), tF = min(min(tmx.x, tmx.y), tmx.z);
  if (tF <= tN) discard;
  float t = tN + h31(vec3(gl_FragCoord.xy, uT * 3.)) * .05;
  vec4 acc = vec4(0.);
  int N = int(uSteps);
  for (int i = 0; i < 64; i++){
    if (i >= N || t > tF || acc.a > .97) break;
    vec3 p = ro + rd * t;
    float d = dog(p);
    if (d > .3){ t += max(d * .6, .05); continue; }
    float dn = dens(p, d), eg = eyes(p);
    float st = max(.055, abs(d) * .5);
    if (dn > .01 || eg > .01){
      vec3 pl = p + uLightL * .16; float s1 = dens(pl, dog(pl));
      vec3 pl2 = p + uLightL * .38; float s2 = dens(pl2, dog(pl2));
      float sh = exp(-(s1 * 1.6 + s2 * 1.2));
      float core = smoothstep(-.02, -.3, d);
      vec3 col = mix(uCol2, uCol, sh) * (uAmb * .65 + uLightC * sh * .85) + uCol * core * 1.15;
      col = mix(col, uCol * (.55 + .7 * sh), .32);
      col += vec3(.7, 1., .95) * pow(clamp(1. - dn, 0., 1.), 3.) * .25;
      float a = 1. - exp(-dn * st * 24.);
      col = mix(col, vec3(1., .95, .5) * 1.6, eg); a = max(a, eg);
      acc.rgb += (1. - acc.a) * col * a; acc.a += (1. - acc.a) * a;
    }
    t += st;
  }
  if (acc.a < .01) discard;
  gl_FragColor = vec4(acc.rgb * uAlpha, acc.a * uAlpha);
}`

  C.creer = function (o) {
    o = o || {}
    const g = new THREE.Group(), U = g.userData
    const uni = {
      uT: { value: 0 }, uGait: { value: 0 }, uSp: { value: 0 }, uWag: { value: 0 }, uBreath: { value: 0 }, uHead: { value: 0 }, uAlpha: { value: 1 }, uBark: { value: 0 }, uSteps: { value: o.pas || (TOUCH ? 22 : 34) },
      uCamL: { value: new THREE.Vector3() }, uLightL: { value: new THREE.Vector3(0, 1, 0) }, uCol: { value: new THREE.Color(o.couleur || '#5dffd0') }, uCol2: { value: new THREE.Color(o.ombre || '#3a2a9a') },
      uAmb: { value: new THREE.Color('#8f86ff').multiplyScalar(.55) }, uLightC: { value: new THREE.Color('#ffffff') }
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, side: THREE.BackSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: FRAG
    })
    const geo = new THREE.BoxBufferGeometry(2.1, 2.27, 3.6); geo.translate(0, 1.115, .05)
    const boite = new THREE.Mesh(geo, mat); boite.frustumCulled = false; boite.renderOrder = 7; g.add(boite)
    const inv = new THREE.Matrix4(), cam = new THREE.Vector3(), L = new THREE.Vector3()
    let gait = 0, wag = 0, bark = 0
    /* vitesse en m/s ; dirLune : direction monde VERS la lune ; couleurLune ; ambiante */
    U.tick = function (dt, T, vitesse, camera, dirLune, couleurLune, ambiante) {
      const sp = Math.min(1, (vitesse || 0) / 3.4)
      gait += dt * (3 + sp * 9.5); wag += dt * (5 + sp * 5); bark = Math.max(0, bark - dt * 3)
      uni.uT.value = T; uni.uGait.value = gait; uni.uSp.value = sp
      uni.uWag.value = Math.sin(wag) * (.55 + (1 - sp) * .35); uni.uBreath.value = Math.sin(T * 2.1) * .012
      uni.uHead.value = Math.sin(T * .8) * .22 + Math.sin(T * 2.7) * .05 * sp; uni.uBark.value = bark
      g.updateMatrixWorld(true); inv.copy(boite.matrixWorld).invert()
      cam.copy(camera.position).applyMatrix4(inv); uni.uCamL.value.copy(cam)
      if (dirLune) { L.copy(dirLune).transformDirection(inv).normalize(); uni.uLightL.value.copy(L) }
      if (couleurLune) uni.uLightC.value.copy(couleurLune)
      if (ambiante) uni.uAmb.value.copy(ambiante)
    }
    U.aboie = () => { bark = 1 }
    U.materiau = mat
    return g
  }
})()
