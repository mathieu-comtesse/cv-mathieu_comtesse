/* ATLAS · CHAÎNE DE RENDU. Trois passes dans des cibles HDR (demi-flottants) puis composition :
 *   1. la scène opaque (MSAA ×4) avec sa texture de profondeur ;
 *   2. recopie de la couleur, puis passe des nuages volumétriques par-dessus, qui lisent la profondeur de la passe 1 ;
 *   3. éclat (« bloom ») par descente / montée de 13 prises, puis composition finale : exposition, courbe de ton ACES, saturation,
 *      vignette, grain léger, encodage sRGB.
 *
 *   const R = creerRendu(canvas, { qualite: 1 })
 *   R.taille(largeur, hauteur, densite)      R.rendre(scene, sceneNuages, camera)      R.profondeur (DepthTexture)      R.reglages */
import * as THREE from './three.module.js';

const VERT_PLEIN = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';

export function creerRendu(canvas, opts = {}) {
  const qualite = opts.qualite ?? 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;

  const R = { renderer, reglages: { exposition: 1.0, eclat: 0.38, vignette: 0.22, saturation: 1.06, contraste: 1.06, nuit: 0 }, taille: new THREE.Vector2(1, 1) };
  const type = THREE.HalfFloatType;
  const profondeur = new THREE.DepthTexture(2, 2); profondeur.type = THREE.UnsignedIntType; profondeur.format = THREE.DepthFormat;
  let rtScene = new THREE.WebGLRenderTarget(2, 2, { type, samples: qualite >= 1 ? 4 : 0, depthTexture: profondeur, colorSpace: THREE.LinearSRGBColorSpace });
  const rtComp = new THREE.WebGLRenderTarget(2, 2, { type, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false });
  const NIV = qualite >= 1 ? 6 : 5;
  const bas = [], haut = [];
  for (let i = 0; i < NIV; i++) {
    const o = { type, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    bas.push(new THREE.WebGLRenderTarget(2, 2, o)); haut.push(new THREE.WebGLRenderTarget(2, 2, o));
  }

  const ecran = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)).setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2)));
  ecran.frustumCulled = false;
  const sceneEcran = new THREE.Scene(); sceneEcran.add(ecran);
  const camEcran = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const passe = (mat, cible) => { ecran.material = mat; renderer.setRenderTarget(cible); renderer.render(sceneEcran, camEcran); };
  const mk = (frag, uni) => new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT_PLEIN, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false });

  const copie = mk('uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }', { t: { value: null } });
  const seuil = mk(`uniform sampler2D t; uniform vec2 px; uniform float seuil; varying vec2 vUv;
    vec3 s(vec2 o){ return texture2D(t, vUv + o * px).rgb; }
    void main(){
      vec3 c = s(vec2(-1,1)) + s(vec2(1,1)) + s(vec2(-1,-1)) + s(vec2(1,-1));
      c *= .25;
      c = min(max(c, vec3(0.)), vec3(48.));                              // un pixel aberrant (NaN, inf) ne doit pas noyer l'image : min/max écartent les NaN
      float l = max(c.r, max(c.g, c.b)), k = max(l - seuil, 0.); k = k * k / (k + .5);
      gl_FragColor = vec4(c * (k / max(l, 1e-4)), 1.);
    }`, { t: { value: null }, px: { value: new THREE.Vector2() }, seuil: { value: 0.9 } });
  const desc = mk(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
    vec3 s(vec2 o){ return texture2D(t, vUv + o * px).rgb; }
    void main(){
      vec3 a = s(vec2(-2,2)), b = s(vec2(0,2)), c = s(vec2(2,2)), d = s(vec2(-2,0)), e = s(vec2(0,0)), f = s(vec2(2,0)), g = s(vec2(-2,-2)), h = s(vec2(0,-2)), i = s(vec2(2,-2)), j = s(vec2(-1,1)), k = s(vec2(1,1)), l = s(vec2(-1,-1)), m = s(vec2(1,-1));
      gl_FragColor = vec4(e * .125 + (a + c + g + i) * .03125 + (b + d + f + h) * .0625 + (j + k + l + m) * .125, 1.);
    }`, { t: { value: null }, px: { value: new THREE.Vector2() } });
  const mont = mk(`uniform sampler2D t, ajout; uniform vec2 px; uniform float poids; varying vec2 vUv;
    vec3 s(vec2 o){ return texture2D(t, vUv + o * px).rgb; }
    void main(){
      vec3 c = s(vec2(-1,1)) + s(vec2(0,1)) * 2. + s(vec2(1,1)) + s(vec2(-1,0)) * 2. + s(vec2(0,0)) * 4. + s(vec2(1,0)) * 2. + s(vec2(-1,-1)) + s(vec2(0,-1)) * 2. + s(vec2(1,-1));
      gl_FragColor = vec4(c / 16. + texture2D(ajout, vUv).rgb * poids, 1.);
    }`, { t: { value: null }, ajout: { value: null }, px: { value: new THREE.Vector2() }, poids: { value: 1 } });
  const final = mk(`uniform sampler2D tScene, tEclat; uniform float expo, eclat, vig, sat, contraste, nuit, temps; uniform vec2 res; varying vec2 vUv;
    vec3 aces(vec3 x){ const float a = 2.51, b = .03, c = 2.43, d = .59, e = .14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0., 1.); }
    vec3 versSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, vec3(1e-6)), vec3(1. / 2.4)) - .055, step(.0031308, c)); }
    float bruit(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + temps) * 43758.5453); }
    void main(){
      vec3 c0 = texture2D(tScene, vUv).rgb; vec3 c1 = texture2D(tEclat, vUv).rgb;
      c0 = min(max(c0, vec3(0.)), vec3(64.)); c1 = min(max(c1, vec3(0.)), vec3(64.));
      vec3 c = c0 + c1 * eclat;
      c *= expo;
      c = aces(c);
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(vec3(l), c, sat);
      c = (c - .5) * contraste + .5;
      // étalonnage : ombres un peu froides (turquoise), hautes lumières chaudes ; la nuit tire vers le bleu
      c += (vec3(-.012, .006, .02) * (1. - l) + vec3(.014, .006, -.01) * l) * (1. - nuit);
      vec2 q = vUv - .5; float v = 1. - dot(q, q) * vig * 2.2; c *= clamp(v, 0., 1.);
      c = versSRGB(clamp(c, 0., 1.));
      c += (bruit(gl_FragCoord.xy) - .5) / 255.;
      gl_FragColor = vec4(c, 1.);
    }`, { tScene: { value: null }, tEclat: { value: null }, expo: { value: 1 }, eclat: { value: .4 }, vig: { value: .2 }, sat: { value: 1.1 }, contraste: { value: 1 }, nuit: { value: 0 }, temps: { value: 0 }, res: { value: new THREE.Vector2() } });

  R.profondeur = profondeur;
  R.taille.set(2, 2);
  R.dimensionner = (w, h, densite = 1) => {
    const W = Math.max(2, Math.round(w * densite)), H = Math.max(2, Math.round(h * densite));
    renderer.setPixelRatio(1); renderer.setSize(Math.round(w * densite), Math.round(h * densite), false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    rtScene.setSize(W, H); rtComp.setSize(W, H);
    bas.forEach((r, i) => r.setSize(Math.max(2, W >> (i + 1)), Math.max(2, H >> (i + 1)))); haut.forEach((r, i) => r.setSize(Math.max(2, W >> (i + 1)), Math.max(2, H >> (i + 1))));
    R.taille.set(W, H);
  };
  R.rendre = (scene, sceneNuages, camera, t = 0) => {
    const g = R.reglages;
    renderer.setRenderTarget(rtScene); renderer.clear(); renderer.render(scene, camera);
    copie.uniforms.t.value = rtScene.texture; passe(copie, rtComp);
    if (sceneNuages) { renderer.autoClear = false; renderer.setRenderTarget(rtComp); renderer.render(sceneNuages, camera); renderer.autoClear = true; }
    // éclat
    seuil.uniforms.t.value = rtComp.texture; seuil.uniforms.px.value.set(1 / R.taille.x, 1 / R.taille.y); passe(seuil, bas[0]);
    for (let i = 1; i < NIV; i++) { desc.uniforms.t.value = bas[i - 1].texture; desc.uniforms.px.value.set(1 / bas[i - 1].width, 1 / bas[i - 1].height); passe(desc, bas[i]); }
    mont.uniforms.t.value = bas[NIV - 1].texture; mont.uniforms.ajout.value = bas[NIV - 2].texture; mont.uniforms.px.value.set(1 / bas[NIV - 1].width, 1 / bas[NIV - 1].height); mont.uniforms.poids.value = 1; passe(mont, haut[NIV - 2]);
    for (let i = NIV - 3; i >= 0; i--) { mont.uniforms.t.value = haut[i + 1].texture; mont.uniforms.ajout.value = bas[i].texture; mont.uniforms.px.value.set(1 / haut[i + 1].width, 1 / haut[i + 1].height); passe(mont, haut[i]); }
    const u = final.uniforms; u.tScene.value = rtComp.texture; u.tEclat.value = haut[0].texture;
    u.expo.value = g.exposition; u.eclat.value = g.eclat; u.vig.value = g.vignette; u.sat.value = g.saturation; u.contraste.value = g.contraste; u.nuit.value = g.nuit; u.temps.value = t % 7;
    passe(final, null);
  };
  return R;
}
