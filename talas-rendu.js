/* Pipeline de rendu « peint » du Village Talas. Script classique chargé juste après three.js r128 et avant le jeu.
 *
 * Il fait trois choses :
 *  1. LUMIÈRE (patch des chunks de shaders de three.js, sans toucher aux matériaux) : la première lumière directionnelle
 *     est la « lune » (ou le soleil) ; son intensité décroît de façon exponentielle douce autour d'un point d'intérêt
 *     (le fantôme : 100 % sur lui, ~20 % à 6 m) et elle est modulée par une carte de nuages en bruit Perlin-Worley
 *     qui défile. Les ombres portées sont durcies (bord net, façon aplat d'illustration) et les surfaces reçoivent un
 *     grain peint en coordonnées monde et un liseré de lumière (rim).
 *  2. POST-TRAITEMENT (worlds `hd`) : rendu HDR + profondeur, SSAO, ombres de contact en espace écran, contours à
 *     l'encre tirés de la profondeur (silhouettes et plis, légèrement tremblés comme un dessin animé), profondeur de
 *     champ, bloom maison (chaîne descendante/montante) et étalonnage (contraste, saturation, teintes d'ombres et de
 *     hautes lumières), vignettage, grain de papier.
 *  3. PROFILS par monde : `world.rendu = 'nuit' | {…}` pour choisir l'ambiance sans réécrire le monde.
 *
 *   ?monde=classique  ou  ?rendu=classique  -> désactive tout (comparaison avec l'ancien rendu)
 *   ?fx=0|1|2         -> 0 aucun post-traitement, 1 léger (contours, bloom, étalonnage), 2 complet (par défaut)
 *
 * Interface :  TALAS_RENDU.actif(world)  ·  TALAS_RENDU.rendre(renderer, scene, camera, world, T)
 *              TALAS_RENDU.preparer(world)  (appelé par setWorld)  ·  TALAS_RENDU.lune  ·  TALAS_RENDU.profils */
(function () {
  const THREE = window.THREE
  if (!THREE) return
  const P = new URLSearchParams(location.search)
  const R = window.TALAS_RENDU = { on: P.get('monde') !== 'classique' && P.get('rendu') !== 'classique', niveau: 2, actifCourant: 0 }
  const fxq = P.get('fx'); if (fxq !== null) R.niveau = Math.max(0, Math.min(2, +fxq || 0))
  else if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) R.niveau = 1
  R.mobileEconome = fxq === null && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
  if (!R.on) { R.actif = () => false; R.preparer = () => {}; R.rendre = () => {}; R.neutre = () => {}; R.lune = { on() {}, poser() {}, reglages() {} }; R.profils = {}; return } // rendu classique : l'interface reste appelable, elle ne fait rien

  /* ------------------------------------------------------------------------------------------------------------
     1. UNIFORMES PARTAGÉS ET PATCH DES CHUNKS
     ------------------------------------------------------------------------------------------------------------ */
  const V4 = (a, b, c, d) => new THREE.Vector4(a, b, c, d)
  const U = R.U = {
    rInfo: { value: V4(0, 0, 0, 0) },      // x actif, y ombres dures, z grain peint, w liseré (rim)
    rLune: { value: V4(0, 3, 0, 1 / 2.4) }, // xyz point d'intérêt (fantôme), w 1/rayon d'atténuation
    rLuneP: { value: V4(0, .2, .7, 0) },    // x actif, y plancher (20 %), z force des nuages, w temps
    rRim: { value: new THREE.Color('#8ea6ff') },
    rTeinte: { value: V4(1, 1, 1, 0) }      // teinte des ombres portées (xyz) — réservé
  }
  R.lune = {
    on(v) { R.luneManuelle = !!v; U.rLuneP.value.x = v ? 1 : 0 },
    poser(p, rayon) { U.rLune.value.set(p.x, p.y, p.z, 1 / (rayon || 2.4)) },
    reglages(o) { if (o.plancher !== undefined) U.rLuneP.value.y = o.plancher; if (o.nuages !== undefined) U.rLuneP.value.z = o.nuages }
  }

  const NOISE_GLSL = `
float rH21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 rH22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float rPerlin(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*f*(f*(f*6.-15.)+10.);
  float a = dot(rH22(i) * 2. - 1., f), b = dot(rH22(i + vec2(1.,0.)) * 2. - 1., f - vec2(1.,0.));
  float c = dot(rH22(i + vec2(0.,1.)) * 2. - 1., f - vec2(0.,1.)), d = dot(rH22(i + vec2(1.,1.)) * 2. - 1., f - vec2(1.,1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * .5 + .5; }
float rWorley(vec2 p){ vec2 i = floor(p), f = fract(p); float m = 1.;
  for(int y = -1; y <= 1; y++) for(int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)); vec2 o = rH22(i + g); float d = length(g + o - f); m = min(m, d); }
  return 1. - clamp(m, 0., 1.); }
/* Perlin-Worley (Schneider) : le bruit de Perlin creusé par le Worley donne des nuages en boules qui se touchent */
float rPW(vec2 p){ float pr = rPerlin(p), w = rWorley(p * 1.7); return clamp((pr - (1. - w) * .6) / (1. - (1. - w) * .6 + 1e-3), 0., 1.); }`

  const PARS_FRAG = `
#define RENDU_PARS
varying vec3 vRW;
uniform vec4 rInfo; uniform vec4 rLune; uniform vec4 rLuneP; uniform vec3 rRim;
${NOISE_GLSL}
/* lune : décroissance exponentielle douce autour du point d'intérêt, modulée par les nuages qui défilent */
float rMoon(vec3 wp){
  if(rLuneP.x < .5) return 1.;
  float d = distance(wp, rLune.xyz);
  float f = rLuneP.y + (1. - rLuneP.y) * exp(-d * rLune.w);
  vec2 cp = wp.xz * .085 + vec2(.028, .017) * rLuneP.w;
  float nuage = smoothstep(.22, .72, rPW(cp)) * .65 + smoothstep(.3, .8, rPerlin(cp * 3.1 + 7.)) * .35;
  return f * mix(1. - rLuneP.z * .55, 1., nuage);
}
float rDur(float s){ return mix(s, smoothstep(.40, .60, s), rInfo.y); }`

  const FIN_FRAG = `
if(rInfo.x > .5){
  vec3 c = gl_FragColor.rgb;
  float g = rPerlin(vRW.xz * 2.3 + vRW.y * 1.7) * .6 + rPerlin(vRW.xz * 7.1 - vRW.y * 3.3) * .4;
  c *= 1. + (g - .5) * .22 * rInfo.z;                                    /* grain peint, en coordonnées monde */
  c *= mix(1., mix(.74, 1., smoothstep(-.1, 1.1, vRW.y)), rInfo.z);       /* pied des objets un peu plus sombre */
  #if defined(TOON) || defined(LAMBERT) || defined(PHONG)
    vec3 rv = normalize(vViewPosition); float fr = 1. - clamp(dot(normalize(normal), rv), 0., 1.);
    c += rRim * pow(fr, 3.2) * .34 * rInfo.w;                             /* liseré de lumière froide sur les contours */
  #endif
  gl_FragColor.rgb = c;
}`

  function installerChunks() {
    const C = THREE.ShaderChunk
    if (C.__rendu) return; C.__rendu = 1
    let l = C.lights_fragment_begin
    const a = 'getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );'
    const b = 'getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] )'
    if (l.indexOf(a) < 0 || l.indexOf(b) < 0) { console.warn('[rendu] chunk lights_fragment_begin inattendu : ombres et lune inchangées'); return }
    l = l.replace(a, a + '\n#ifdef RENDU_PARS\n if( UNROLLED_LOOP_INDEX == 0 ) directLight.color *= rMoon( vRW );\n#endif')
    l = l.replace(b, '\n#ifdef RENDU_PARS\n rDur( ' + b + ' )\n#else\n ' + b + '\n#endif\n')
    C.lights_fragment_begin = l
  }
  installerChunks()

  /* patch de tous les matériaux éclairés : varying monde, uniformes, corps de fin de shader */
  const PROTO = THREE.Material.prototype
  const orig = PROTO.onBeforeCompile
  PROTO.onBeforeCompile = function (sh, renderer) {
    if (orig) orig.call(this, sh, renderer)
    if (this.isShaderMaterial || this.isRawShaderMaterial) return
    if (sh.fragmentShader.indexOf('lights_fragment_begin') < 0 || sh.fragmentShader.indexOf('RENDU_PARS') >= 0) return
    if (sh.vertexShader.indexOf('#include <project_vertex>') < 0 || sh.fragmentShader.indexOf('#include <fog_fragment>') < 0) return
    sh.uniforms.rInfo = U.rInfo; sh.uniforms.rLune = U.rLune; sh.uniforms.rLuneP = U.rLuneP; sh.uniforms.rRim = U.rRim
    sh.vertexShader = 'varying vec3 vRW;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n{ vec4 rw = vec4( transformed, 1.0 );\n#ifdef USE_INSTANCING\n rw = instanceMatrix * rw;\n#endif\n vRW = ( modelMatrix * rw ).xyz; }')
    sh.fragmentShader = PARS_FRAG + '\n' + sh.fragmentShader.replace('#include <fog_fragment>', FIN_FRAG + '\n#include <fog_fragment>')
  }

  /* ------------------------------------------------------------------------------------------------------------
     2. PROFILS D'AMBIANCE
     ------------------------------------------------------------------------------------------------------------ */
  const PROFILS = R.profils = {
    defaut: { exp: 1, contraste: 1.08, sat: 1.14, ombre: [.90, .95, 1.16], lumiere: [1.07, 1.0, .90], split: .55, ao: .55, ct: .32, encre: .85, encreCouleur: [.09, .04, .12], bloom: .38, seuil: .78, vignette: .28, grain: .028, dof: 0, dur: 1, peint: 1, rim: 1, rimCouleur: '#9db4ff' },
    jour: { dof: .55, bloom: .32, vignette: .22, rimCouleur: '#ffe2b0' },
    nuit: { exp: .96, contraste: 1.16, sat: 1.18, ombre: [.78, .92, 1.28], lumiere: [1.12, 1.02, .86], split: .7, ao: .75, ct: .4, bloom: .62, seuil: .62, vignette: .42, dof: .35, rimCouleur: '#7fe8c4' },
    interieur: { dof: .12, bloom: .12, seuil: .92, exp: .94, contraste: 1.12, sat: 1.06, vignette: .26, ao: .5 },
    studio: { contraste: 1.1, sat: 1.2, bloom: .5, seuil: .7, vignette: .35 }
  }
  function profilDe(w) {
    let p = w && w.rendu
    if (p === undefined) p = w && w.hub ? 'jour' : w && w.stage ? 'interieur' : 'defaut'
    if (typeof p === 'string') p = Object.assign({}, PROFILS.defaut, PROFILS[p] || {})
    else p = Object.assign({}, PROFILS.defaut, p || {})
    return p
  }

  /* ------------------------------------------------------------------------------------------------------------
     3. PASSES
     ------------------------------------------------------------------------------------------------------------ */
  let rdr = null, W = 0, H = 0
  const quadGeo = new THREE.PlaneGeometry(2, 2)
  const quad = new THREE.Mesh(quadGeo, null); quad.frustumCulled = false
  const quadScene = new THREE.Scene(); quadScene.userData.talasPostProcess = true; quadScene.add(quad)
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }'
  const mkMat = (fs, uniforms, extra) => new THREE.ShaderMaterial(Object.assign({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false }, extra || {}))
  const dessiner = (m, cible) => { quad.material = m; rdr.setRenderTarget(cible); rdr.render(quadScene, quadCam) }

  const DEPTH_GLSL = `
uniform sampler2D tDepth; uniform vec2 uNF; uniform vec2 uRes;
float linZ(float d){ float z = d * 2. - 1.; return (2. * uNF.x * uNF.y) / (uNF.y + uNF.x - z * (uNF.y - uNF.x)); }
float iz(vec2 uv){ return 1. / linZ(texture2D(tDepth, uv).x); }`

  /* ---- SSAO + ombres de contact (demi-résolution) ---- */
  const FS_AO = `
${DEPTH_GLSL}
uniform mat4 uProj; uniform mat4 uProjInv; uniform vec3 uKernel[12]; uniform float uRadius; uniform float uBias; uniform float uT;
uniform vec3 uLightV; uniform float uCSLen; uniform float uCSOn;
varying vec2 vUv;
float hh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 vp(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 c = vec4(uv * 2. - 1., d * 2. - 1., 1.); vec4 v = uProjInv * c; return v.xyz / v.w; }
void main(){
  float d0 = texture2D(tDepth, vUv).x;
  if(d0 >= .99995){ gl_FragColor = vec4(1., 0., 0., 1.); return; }
  vec3 P = vp(vUv); vec2 t = 1. / uRes;
  vec3 Pr = vp(vUv + vec2(t.x, 0.)), Pl = vp(vUv - vec2(t.x, 0.)), Pu = vp(vUv + vec2(0., t.y)), Pd = vp(vUv - vec2(0., t.y));
  vec3 dx = abs(Pr.z - P.z) < abs(Pl.z - P.z) ? Pr - P : P - Pl;
  vec3 dy = abs(Pu.z - P.z) < abs(Pd.z - P.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(dx, dy)); if(N.z < 0.) N = -N;
  float ang = hh(gl_FragCoord.xy + floor(uT * 12.)) * 6.2831853;
  vec3 rv = vec3(cos(ang), sin(ang), 0.);
  vec3 Tg = normalize(rv - N * dot(rv, N)); vec3 Bt = cross(N, Tg); mat3 TBN = mat3(Tg, Bt, N);
  float occ = 0.;
  for(int i = 0; i < 12; i++){
    vec3 sp = P + (TBN * uKernel[i]) * uRadius;
    vec4 pr = uProj * vec4(sp, 1.); vec2 suv = pr.xy / pr.w * .5 + .5;
    float sz = -linZ(texture2D(tDepth, suv).x);
    float rc = smoothstep(0., 1., uRadius / max(abs(P.z - sz), 1e-3));
    occ += (sz >= sp.z + uBias ? 1. : 0.) * rc;
  }
  float ao = 1. - occ / 12.;
  float sh = 0.;
  if(uCSOn > .5){
    vec3 L = normalize(uLightV); float st = uCSLen / 12.; float j = hh(gl_FragCoord.xy * 1.7 + uT);
    for(int i = 1; i <= 12; i++){
      vec3 rp = P + N * .03 + L * (float(i) - 1. + j) * st;
      vec4 pr = uProj * vec4(rp, 1.); vec2 suv = pr.xy / pr.w * .5 + .5;
      if(suv.x < 0. || suv.x > 1. || suv.y < 0. || suv.y > 1.) break;
      float sz = -linZ(texture2D(tDepth, suv).x);
      float df = sz - rp.z;
      if(df > .03 && df < .35){ sh = 1.; break; }
    }
  }
  gl_FragColor = vec4(ao, sh, 0., 1.);
}`

  /* flou bilatéral (séparable) de l'AO, guidé par la profondeur */
  const FS_AOBLUR = `
${DEPTH_GLSL}
uniform sampler2D tAO; uniform vec2 uDir;
varying vec2 vUv;
void main(){
  float z0 = linZ(texture2D(tDepth, vUv).x); vec2 acc = vec2(0.); float ws = 0.;
  for(int i = -3; i <= 3; i++){
    vec2 uv = vUv + uDir * float(i);
    float z = linZ(texture2D(tDepth, uv).x); float w = exp(-float(i * i) / 6.) * exp(-abs(z - z0) / (z0 * .05 + .02));
    acc += texture2D(tAO, uv).rg * w; ws += w;
  }
  gl_FragColor = vec4(acc / max(ws, 1e-4), 0., 1.);
}`

  /* ---- éclat de contour : le masque des objets choisis (couverture, profondeur) est flouté ; chaque prise n'éclaire un pixel que si la scène n'y est pas
     nettement plus proche que l'objet, pour que la lueur ne déborde pas sur ce qui passe devant ---- */
  const FS_GB = `
${DEPTH_GLSL}
uniform sampler2D tMask; uniform vec2 uDir; varying vec2 vUv;
void main(){
  float zs = linZ(texture2D(tDepth, vUv).x) / 100.; vec2 acc = vec2(0.); float ws = 0.;
  for(int i = -9; i <= 9; i++){
    vec2 m = texture2D(tMask, vUv + uDir * float(i)).rg; float zo = m.y / max(m.x, 1e-3);
    float vis = smoothstep(zo - .024, zo - .010, zs); float w = exp(-float(i * i) / 30.);
    acc += m * w * vis; ws += w;
  }
  gl_FragColor = vec4(acc / ws, 0., 1.);
}`

  /* ---- composition 1 : lumière fine (AO, ombres de contact) + contours à l'encre ---- */
  const FS_COMP = `
${DEPTH_GLSL}
uniform sampler2D tScene; uniform sampler2D tAO;
uniform float uAO; uniform float uCT; uniform vec3 uShadowTone; uniform float uInk; uniform vec3 uInkColor; uniform float uInkPx; uniform float uT; uniform float uWob;
uniform float uFocus; uniform float uDof; uniform float uUseAO; uniform sampler2D tGB; uniform sampler2D tGM; uniform float uGlow; uniform vec3 uGlowC;
varying vec2 vUv;
float rh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(rh(i), rh(i + vec2(1.,0.)), f.x), mix(rh(i + vec2(0.,1.)), rh(i + vec2(1.,1.)), f.x), f.y); }
void main(){
  vec4 sc = texture2D(tScene, vUv); vec3 c = sc.rgb;
  float d0 = texture2D(tDepth, vUv).x; float z0 = linZ(d0);
  if(uUseAO > .5){
    vec2 a = texture2D(tAO, vUv).rg;
    float ao = mix(1., pow(a.x, 1.35), uAO), cs = a.y * uCT;
    c *= ao; c = mix(c, c * uShadowTone, cs);
  }
  /* contours : secondes différences de 1/z (nulles sur un plan, fortes sur silhouettes et plis) ; tremblé de dessin animé */
  float tick = floor(uT * 8.);
  vec2 wob = (vec2(vn(gl_FragCoord.xy * .045 + tick * 7.1), vn(gl_FragCoord.xy * .045 + 31. + tick * 3.7)) - .5) * 2. * uWob;
  vec2 px = uInkPx / uRes; vec2 uv = vUv + wob / uRes;
  float ic = iz(uv);
  float el = iz(uv - vec2(px.x, 0.)), er = iz(uv + vec2(px.x, 0.)), eu = iz(uv + vec2(0., px.y)), ed = iz(uv - vec2(0., px.y));
  float e1 = max(abs(el + er - 2. * ic), abs(eu + ed - 2. * ic)) / (ic + 1e-4);
  float eul = iz(uv + vec2(-px.x, px.y)), edr = iz(uv + vec2(px.x, -px.y)), eur = iz(uv + vec2(px.x, px.y)), edl = iz(uv - vec2(px.x, px.y));
  float e2 = max(abs(eul + edr - 2. * ic), abs(eur + edl - 2. * ic)) / (ic + 1e-4);
  float e = max(e1, e2 * .8);
  float line = smoothstep(.10, .34, e) * uInk;
  line *= 1. - smoothstep(60., 220., z0) * .7;                /* les lignes s'effacent dans le lointain */
  c = mix(c, uInkColor, clamp(line, 0., 1.));
  if(uGlow > .001){ float gc = texture2D(tGB, vUv).r, m0 = texture2D(tGM, vUv).r; float halo = gc * (1. - m0 * .8); c += uGlowC * halo * uGlow * (1. + halo); }
  /* cercle de confusion (profondeur de champ) dans l'alpha */
  float coc = 0.;
  if(uDof > .001){
    float fz = uFocus; float dz = z0 - fz;
    coc = dz < 0. ? clamp(-dz / (fz * .35), 0., 1.) : clamp(dz / (fz * 3.2), 0., 1.) * .8;
    coc *= uDof;
    if(d0 >= .99995) coc = .5 * uDof;
  }
  gl_FragColor = vec4(c, coc);
}`

  /* ---- profondeur de champ : flou en disque (Vogel) en demi-résolution ---- */
  const FS_DOF = `
uniform sampler2D tSrc; uniform vec2 uRes; uniform float uMaxPx;
varying vec2 vUv;
void main(){
  vec4 c0 = texture2D(tSrc, vUv); float coc0 = c0.a;
  vec3 acc = c0.rgb; float ws = 1.;
  float rad = uMaxPx * coc0;
  for(int i = 1; i < 20; i++){
    float fi = float(i); float r = sqrt(fi / 20.); float a = fi * 2.399963;
    vec2 off = vec2(cos(a), sin(a)) * r * max(rad, uMaxPx * .25) / uRes;
    vec4 s = texture2D(tSrc, vUv + off);
    float w = smoothstep(0., .15, max(s.a, coc0) - r * .5);
    acc += s.rgb * w; ws += w;
  }
  gl_FragColor = vec4(acc / ws, coc0);
}`

  /* ---- bloom : préfiltre, descente (13 prises), montée (tente) ---- */
  const FS_PRE = `
uniform sampler2D tSrc; uniform vec2 uKnee; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uKnee.x + uKnee.y, 0., 2. * uKnee.y); soft = soft * soft / (4. * uKnee.y + 1e-4);
  float k = max(soft, br - uKnee.x) / max(br, 1e-4); gl_FragColor = vec4(c * k, 1.); }`
  const FS_DOWN = `
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main(){ vec2 t = uTexel;
  vec3 a = texture2D(tSrc, vUv + t * vec2(-2., -2.)).rgb, b = texture2D(tSrc, vUv + t * vec2(0., -2.)).rgb, c = texture2D(tSrc, vUv + t * vec2(2., -2.)).rgb;
  vec3 d = texture2D(tSrc, vUv + t * vec2(-2., 0.)).rgb, e = texture2D(tSrc, vUv).rgb, f = texture2D(tSrc, vUv + t * vec2(2., 0.)).rgb;
  vec3 g = texture2D(tSrc, vUv + t * vec2(-2., 2.)).rgb, h = texture2D(tSrc, vUv + t * vec2(0., 2.)).rgb, i = texture2D(tSrc, vUv + t * vec2(2., 2.)).rgb;
  vec3 j = texture2D(tSrc, vUv + t * vec2(-1., -1.)).rgb, k = texture2D(tSrc, vUv + t * vec2(1., -1.)).rgb, l = texture2D(tSrc, vUv + t * vec2(-1., 1.)).rgb, m = texture2D(tSrc, vUv + t * vec2(1., 1.)).rgb;
  gl_FragColor = vec4(e * .125 + (a + c + g + i) * .03125 + (b + d + f + h) * .0625 + (j + k + l + m) * .125, 1.); }`
  const FS_UP = `
uniform sampler2D tLow; uniform sampler2D tHigh; uniform vec2 uTexel; uniform float uMix; varying vec2 vUv;
void main(){ vec2 t = uTexel;
  vec3 s = texture2D(tLow, vUv + t * vec2(-1., -1.)).rgb + texture2D(tLow, vUv + t * vec2(0., -1.)).rgb * 2. + texture2D(tLow, vUv + t * vec2(1., -1.)).rgb
    + texture2D(tLow, vUv + t * vec2(-1., 0.)).rgb * 2. + texture2D(tLow, vUv).rgb * 4. + texture2D(tLow, vUv + t * vec2(1., 0.)).rgb * 2.
    + texture2D(tLow, vUv + t * vec2(-1., 1.)).rgb + texture2D(tLow, vUv + t * vec2(0., 1.)).rgb * 2. + texture2D(tLow, vUv + t * vec2(1., 1.)).rgb;
  gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + s / 16. * uMix, 1.); }`

  /* ---- passe finale : profondeur de champ, bloom, étalonnage, vignettage, grain de papier ---- */
  const FS_FIN = `
uniform sampler2D tComp; uniform sampler2D tDof; uniform sampler2D tBloom; uniform vec2 uRes; uniform float uT;
uniform float uBloom; uniform vec3 uBloomTint; uniform float uExp; uniform float uCon; uniform float uSat;
uniform vec3 uTShadow; uniform vec3 uTHigh; uniform float uSplit; uniform float uVig; uniform float uGrain; uniform float uUseDof;
varying vec2 vUv;
float gh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec4 sh = texture2D(tComp, vUv); vec3 c = sh.rgb;
  if(uUseDof > .5){ vec3 b = texture2D(tDof, vUv).rgb; c = mix(c, b, smoothstep(.12, .7, sh.a)); }
  c += texture2D(tBloom, vUv).rgb * uBloom * uBloomTint;
  c *= uExp;
  c = (c - .5) * uCon + .5;
  float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, uSat);
  float s = smoothstep(.55, .0, l), h = smoothstep(.45, 1., l);
  c = mix(c, c * uTShadow, s * uSplit); c = mix(c, c * uTHigh, h * uSplit);
  { float mx = max(c.r, max(c.g, c.b));                                   /* épaule douce des hautes lumières : surtout sans changer la teinte (le jaune reste jaune), un peu par canal (les cœurs de lampe blanchissent) */
    vec3 pc = mix(c, vec3(.8) + .2 * tanh((c - .8) / .2), step(.8, c)); vec3 hp = mx > .8 ? c * ((.8 + .2 * tanh((mx - .8) / .2)) / mx) : c; c = mix(pc, hp, .78); }
  vec2 q = vUv - .5; float vg = 1. - dot(q, q) * uVig * 2.2; c *= clamp(vg, 0., 1.);
  float g = gh(gl_FragCoord.xy + floor(uT * 12.)) - .5; c *= 1. + g * uGrain;
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`

  /* ------------------------------------------------------------------------------------------------------------
     4. CIBLES ET MATÉRIAUX (créés à la première utilisation)
     ------------------------------------------------------------------------------------------------------------ */
  let T0 = null // toutes les cibles et passes
  function creer() {
    const half = rdr.capabilities.isWebGL2 && rdr.extensions.has('EXT_color_buffer_float')
    const type = half ? THREE.HalfFloatType : THREE.UnsignedByteType
    const tg = (w, h, o) => new THREE.WebGLRenderTarget(Math.max(2, w | 0), Math.max(2, h | 0), Object.assign({ minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type, depthBuffer: false, stencilBuffer: false }, o || {}))
    const t = { half }, small = R.mobileEconome ? 2 : W >> 1, smallH = R.mobileEconome ? 2 : H >> 1
    t.scene = tg(W, H, { depthBuffer: true }); t.scene.depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedIntType)
    const hw = W >> 1, hh = H >> 1
    t.ao = tg(small, smallH, { type: THREE.UnsignedByteType }); t.ao2 = tg(small, smallH, { type: THREE.UnsignedByteType })
    t.comp = tg(W, H); t.dof = tg(small, smallH)
    t.down = []; t.up = []; let bw = hw, bh = hh
    for (let i = 0; i < (R.mobileEconome ? 0 : 5); i++) { t.down.push(tg(bw, bh)); t.up.push(tg(bw, bh)); bw >>= 1; bh >>= 1 }
    t.pre = tg(small, smallH)
    t.gm = tg(hw, hh, { depthBuffer: true }); t.gb1 = tg(hw, hh); t.gb2 = tg(hw, hh)
    // noyau hémisphérique déterministe
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647
    const K = []; for (let i = 0; i < 12; i++) { const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * .95 + .05).normalize().multiplyScalar(rnd() * .8 + .2); const s = (i + 1) / 12; v.multiplyScalar(.12 + .88 * s * s); K.push(v) }
    const dep = { value: t.scene.depthTexture }
    const nf = { value: new THREE.Vector2(.1, 400) }, res = { value: new THREE.Vector2(W, H) }, resH = { value: new THREE.Vector2(hw, hh) }
    t.nf = nf
    t.mAO = mkMat(FS_AO, { tDepth: dep, uNF: nf, uRes: res, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() }, uKernel: { value: K }, uRadius: { value: .7 }, uBias: { value: .03 }, uT: { value: 0 }, uLightV: { value: new THREE.Vector3(0, 1, 0) }, uCSLen: { value: .8 }, uCSOn: { value: 1 } })
    t.mAOB = mkMat(FS_AOBLUR, { tDepth: dep, uNF: nf, uRes: res, tAO: { value: null }, uDir: { value: new THREE.Vector2() } })
    t.mComp = mkMat(FS_COMP, { tDepth: dep, uNF: nf, uRes: res, tScene: { value: t.scene.texture }, tAO: { value: t.ao.texture }, uAO: { value: .55 }, uCT: { value: .3 }, uShadowTone: { value: new THREE.Vector3(.85, .9, 1.1) },
      uInk: { value: .85 }, uInkColor: { value: new THREE.Vector3(.09, .04, .12) }, uInkPx: { value: 1.4 }, uT: { value: 0 }, uWob: { value: .5 }, uFocus: { value: 12 }, uDof: { value: 0 }, uUseAO: { value: 1 }, tGB: { value: null }, tGM: { value: null }, uGlow: { value: 0 }, uGlowC: { value: new THREE.Vector3(1, .85, .4) } })
    t.mGB = mkMat(FS_GB, { tDepth: dep, uNF: nf, uRes: res, tMask: { value: null }, uDir: { value: new THREE.Vector2() } })
    t.mMask = new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: false, vertexShader: 'varying float vZ; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vZ = -mv.z; gl_Position = projectionMatrix * mv; }', fragmentShader: 'varying float vZ; void main(){ gl_FragColor = vec4(1., clamp(vZ / 100., 0., 1.), 0., 1.); }' })
    t.mDof = mkMat(FS_DOF, { tSrc: { value: t.comp.texture }, uRes: resH, uMaxPx: { value: 9 } })
    t.mPre = mkMat(FS_PRE, { tSrc: { value: t.comp.texture }, uKnee: { value: new THREE.Vector2(.78, .3) } })
    t.mCopy = mkMat('uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }', { tSrc: { value: null } })
    t.mDown = mkMat(FS_DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } })
    t.mUp = mkMat(FS_UP, { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 1 } })
    t.mFin = mkMat(FS_FIN, { tComp: { value: t.comp.texture }, tDof: { value: t.dof.texture }, tBloom: { value: null }, uRes: res, uT: { value: 0 }, uBloom: { value: .4 }, uBloomTint: { value: new THREE.Vector3(1, .97, .9) },
      uExp: { value: 1 }, uCon: { value: 1.08 }, uSat: { value: 1.1 }, uTShadow: { value: new THREE.Vector3(.9, .95, 1.15) }, uTHigh: { value: new THREE.Vector3(1.07, 1, .9) }, uSplit: { value: .5 }, uVig: { value: .3 }, uGrain: { value: .03 }, uUseDof: { value: 0 } })
    return t
  }
  function liberer() { if (!T0) return; [T0.scene, T0.ao, T0.ao2, T0.comp, T0.dof, T0.pre, T0.gm, T0.gb1, T0.gb2, ...T0.down, ...T0.up].forEach((r) => r.dispose()); T0.scene.depthTexture.dispose(); T0 = null }

  /* ------------------------------------------------------------------------------------------------------------
     5. INTERFACE AVEC LE JEU
     ------------------------------------------------------------------------------------------------------------ */
  R.actif = (w) => !!(R.on && R.niveau > 0 && w && w.hd && w.scene && !w.sansRendu && (!rdr || rdr.capabilities.isWebGL2))
  /* les salles de mini-jeu (monde sans `hd`) passent en rendu peint, sauf celles qui gardent leur style pixel (`retro`) */
  R.preparer = (w) => { if (R.on && R.niveau > 0 && w && w.scene && !w.hd && !w.retro && w.stage) { w.hd = 1; w.plainui = 1 } }

  const _cle = new THREE.Vector3(), _lv = new THREE.Vector3(), _size = new THREE.Vector2(), _cc = new THREE.Color()
  function cleLumiere(scene) {
    if (scene.userData.__cle && scene.userData.__cle.parent) return scene.userData.__cle
    let best = null; scene.traverse((o) => { if (o.isDirectionalLight && (!best || (o.castShadow && !best.castShadow))) best = o }); scene.userData.__cle = best; return best
  }

  R.rendre = function (renderer, scene, camera, world, T) {
    rdr = renderer
    renderer.getDrawingBufferSize(_size); const w = _size.x | 0, h = _size.y | 0
    if (w < 8 || h < 8) return renderer.render(scene, camera)
    if (!T0 || w !== W || h !== H) { liberer(); W = w; H = h; T0 = creer() }
    const t = T0, p = profilDe(world), niv = R.niveau
    T = T || 0
    // uniformes de matériaux
    U.rInfo.value.set(1, p.dur, p.peint, p.rim); U.rRim.value.set(p.rimCouleur); U.rLuneP.value.w = T
    { const ln = world.lune
      if (ln && typeof ln === 'object') { const q = typeof ln.pos === 'function' ? ln.pos() : ln.pos; U.rLuneP.value.x = 1; U.rLune.value.set(q.x, q.y, q.z, 1 / (ln.rayon || 6)); U.rLuneP.value.y = ln.plancher === undefined ? .2 : ln.plancher; U.rLuneP.value.z = ln.nuages === undefined ? .6 : ln.nuages }
      else if (!R.luneManuelle) U.rLuneP.value.x = 0 }
    // 1. scène
    renderer.setRenderTarget(t.scene); renderer.clear(); renderer.render(scene, camera)
    U.rInfo.value.x = 0
    camera.updateMatrixWorld()
    t.nf.value.set(camera.near, camera.far)
    const proj = camera.projectionMatrix, projInv = camera.projectionMatrixInverse
    // 2. AO et ombres de contact
    const ao = niv >= 2 && p.ao > 0
    if (ao) {
      const L = cleLumiere(scene)
      if (L) { _lv.copy(L.position); if (L.target) _lv.sub(L.target.position); _lv.normalize().transformDirection(camera.matrixWorldInverse) } else _lv.set(0, 1, 0)
      t.mAO.uniforms.uProj.value.copy(proj); t.mAO.uniforms.uProjInv.value.copy(projInv); t.mAO.uniforms.uT.value = T
      t.mAO.uniforms.uLightV.value.copy(_lv); t.mAO.uniforms.uCSOn.value = L && p.ct > 0 ? 1 : 0; t.mAO.uniforms.uRadius.value = p.aoRayon || .7
      dessiner(t.mAO, t.ao)
      t.mAOB.uniforms.tAO.value = t.ao.texture; t.mAOB.uniforms.uDir.value.set(1 / (W >> 1), 0); dessiner(t.mAOB, t.ao2)
      t.mAOB.uniforms.tAO.value = t.ao2.texture; t.mAOB.uniforms.uDir.value.set(0, 1 / (H >> 1)); dessiner(t.mAOB, t.ao)
    }
    // 2 bis. éclat de contour des objets choisis par le monde (world.contour = { objets, couleur, force })
    let lueur = 0; const ct = world.contour
    if (ct && ct.objets && ct.objets.length && niv >= 1) {
      ct.objets.forEach((o) => { if (o && !o.userData.__c5) { o.userData.__c5 = 1; o.traverse((x) => x.layers.enable(5)) } })
      const bg = scene.background, fog = scene.fog, lm = camera.layers.mask, au = renderer.shadowMap.autoUpdate, ca = renderer.getClearAlpha(); renderer.getClearColor(_cc)
      scene.background = null; scene.fog = null; scene.overrideMaterial = t.mMask; camera.layers.set(5); renderer.shadowMap.autoUpdate = false
      renderer.setRenderTarget(t.gm); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera)
      scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; camera.layers.mask = lm; renderer.shadowMap.autoUpdate = au; renderer.setClearColor(_cc, ca)
      t.mGB.uniforms.tMask.value = t.gm.texture; t.mGB.uniforms.uDir.value.set(1.7 / (W >> 1), 0); dessiner(t.mGB, t.gb1)
      t.mGB.uniforms.tMask.value = t.gb1.texture; t.mGB.uniforms.uDir.value.set(0, 1.7 / (H >> 1)); dessiner(t.mGB, t.gb2)
      lueur = ct.force === undefined ? 1 : ct.force; if (ct.couleur) { _cc.set(ct.couleur); t.mComp.uniforms.uGlowC.value.set(_cc.r, _cc.g, _cc.b) }
    }
    // 3. composition : AO, contact, encre
    const c = t.mComp.uniforms, dpr = renderer.getPixelRatio()
    c.tGB.value = t.gb2.texture; c.tGM.value = t.gm.texture; c.uGlow.value = lueur
    c.uUseAO.value = ao ? 1 : 0; c.uAO.value = p.ao; c.uCT.value = p.ct; c.uShadowTone.value.set(p.ombre[0] * .95, p.ombre[1] * .95, p.ombre[2] * .98)
    c.uInk.value = p.encre; c.uInkColor.value.set(p.encreCouleur[0], p.encreCouleur[1], p.encreCouleur[2]); c.uInkPx.value = 1.25 * dpr; c.uT.value = T; c.uWob.value = .45 * dpr
    const dofOn = niv >= 2 && p.dof > 0
    c.uDof.value = dofOn ? p.dof : 0; c.uFocus.value = typeof world.focus === 'function' ? world.focus() : (typeof world.focus === 'number' ? world.focus : (p.focus || camera.position.distanceTo(world.look || _cle.set(0, 0, 0))))
    dessiner(t.mComp, t.comp)
    // 4. profondeur de champ
    if (dofOn) { t.mDof.uniforms.uMaxPx.value = 7 * dpr; dessiner(t.mDof, t.dof) }
    // 5. bloom
    let bloomTex = null
    if (p.bloom > 0 && !R.mobileEconome) {
      t.mPre.uniforms.uKnee.value.set(p.seuil, .28); dessiner(t.mPre, t.down[0])
      for (let i = 1; i < 5; i++) { t.mDown.uniforms.tSrc.value = t.down[i - 1].texture; t.mDown.uniforms.uTexel.value.set(1 / t.down[i - 1].width, 1 / t.down[i - 1].height); dessiner(t.mDown, t.down[i]) }
      // la montée : up[4] = down[4] ; up[i] = down[i] + tente(up[i+1])
      t.mCopy.uniforms.tSrc.value = t.down[4].texture; dessiner(t.mCopy, t.up[4])
      for (let i = 3; i >= 0; i--) { const u = t.mUp.uniforms; u.tLow.value = t.up[i + 1].texture; u.tHigh.value = t.down[i].texture; u.uTexel.value.set(1 / t.up[i + 1].width, 1 / t.up[i + 1].height); u.uMix.value = 1; dessiner(t.mUp, t.up[i]) }
      bloomTex = t.up[0].texture
    }
    // 6. finale
    const f = t.mFin.uniforms
    f.tBloom.value = bloomTex || t.comp.texture; f.uBloom.value = bloomTex ? p.bloom : 0; f.uT.value = T; f.uUseDof.value = dofOn ? 1 : 0
    f.uExp.value = p.exp; f.uCon.value = p.contraste; f.uSat.value = p.sat; f.uTShadow.value.set(p.ombre[0], p.ombre[1], p.ombre[2]); f.uTHigh.value.set(p.lumiere[0], p.lumiere[1], p.lumiere[2])
    f.uSplit.value = p.split; f.uVig.value = p.vignette; f.uGrain.value = p.grain
    dessiner(t.mFin, null)
    R.actifCourant = 1
  }

  /* état neutre pour les rendus qui n'utilisent pas le pipeline (rétro, combat) */
  R.neutre = () => { U.rInfo.value.x = 0; R.actifCourant = 0 }
  R.liberer = liberer
})()

