/* ATLAS · BÂTIMENTS. Les formes viennent de Blender (tools/atlas-ile/batiments_def.py -> assets/atlas/batiments.glb) ; les matières sont
 * calculées ici : chaque matériau du GLB porte un nom « type|#couleur » et devient un matériau procédural en coordonnées d'objet
 * (appareil de pierre, briques, tuiles qui suivent la pente du pan, tôle à joints debout, planches, verre, vitres éclairées la nuit,
 * néons...). Aucune image : tout est motif de shader, avec relief par dérivées d'écran, ombres de nuages et assombrissement au pied.
 *
 *   const B = await chargerBatiments(ciel)   ->  B.creer('avignon') -> { groupe, ancres: { cloche: Object3D, ... } }                    */
import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { GLSL_BRUIT, GLSL_OMBRES } from './atlas-ciel.js';

const MOTIFS = `
float hB(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
/* assise de pierre / brique : rangées de hauteur H, longueur L décalée une rangée sur deux ; renvoie (joint 0..1, teinte du bloc 0..1, rangée) */
vec3 appareil(vec2 uv, float H, float L, float jh){
  float r = floor(uv.y / H), dec = mod(r, 2.) * .5 + hB(vec2(r, 3.)) * .12;
  float c = floor(uv.x / L + dec);
  vec2 f = vec2(fract(uv.x / L + dec), fract(uv.y / H));
  float jx = min(f.x, 1. - f.x) * L, jy = min(f.y, 1. - f.y) * H;
  float joint = 1. - smoothstep(jh * .4, jh, min(jx, jy));
  return vec3(joint, hB(vec2(c, r)), r);
}
/* repère propre à un pan incliné : (u le long des courbes de niveau, v dans le sens de la pente montante) */
vec2 repPente(vec3 p, vec3 n){
  vec3 t = cross(n, vec3(0., 1., 0.)); t = length(t) > 1e-3 ? normalize(t) : vec3(1., 0., 0.); vec3 up = cross(t, n);
  return vec2(dot(p, t), dot(p, up));
}
`;

const ENTETE = `
varying vec3 vOp; varying vec3 vOn; varying vec3 vWp;
uniform float uNuit, uTemps; uniform vec3 uSunDir; ${GLSL_BRUIT} ${GLSL_OMBRES} ${MOTIFS}`;

/* un morceau de shader par type de matière : lit p (position objet), n (normale objet), met à jour col (albedo), rug (rugosité), h (hauteur de bosse), em (émission) */
const TYPES = {
  pierre: `{
    vec3 an = abs(n); vec2 uv = an.y > .6 ? p.xz : (an.x > an.z ? p.zy : p.xy);
    vec3 a = appareil(uv * 1.0, .17, .36, .012);
    col *= (.9 + .2 * a.y) * (1. - a.x * .32);
    h = -a.x * .5 + n3(vec3(uv * 22., 1.)) * .08; rug = .86;
    col *= .96 + .08 * fbm3(vec3(uv * 5., 2.));
  }`,
  brique: `{
    vec3 an = abs(n); vec2 uv = an.y > .6 ? p.xz : (an.x > an.z ? p.zy : p.xy);
    vec3 a = appareil(uv, .052, .12, .008);
    col *= (.82 + .3 * a.y) * mix(1., .62, a.x);
    h = -a.x * .5 + n3(vec3(uv * 40., 1.)) * .05; rug = .9;
  }`,
  tuile: `{
    vec2 s = repPente(p, n); float H = .095, W = .125;
    float r = floor(s.y / H), c = floor(s.x / W + mod(r, 2.) * .5);
    vec2 f = vec2(fract(s.x / W + mod(r, 2.) * .5), fract(s.y / H));
    float bord = smoothstep(.0, .22, f.y) * (1. - smoothstep(.55, 1., f.y) * .0);
    float rondeur = 1. - smoothstep(.0, .12, abs(f.x - .5) - .38 + (1. - f.y) * .1);
    col *= (.82 + .3 * hB(vec2(c, r))) * (.55 + .45 * bord) * (.92 + .1 * fbm3(vec3(s * 3., 4.)));
    col *= mix(.78, 1., smoothstep(.0, .3, min(f.x, 1. - f.x) * 3.));
    h = (f.y * .4 + (1. - smoothstep(.0, .1, f.y)) * -.5) * .6; rug = .72;
  }`,
  ardoise: `{
    vec2 s = repPente(p, n); float H = .07, W = .09;
    float r = floor(s.y / H), c = floor(s.x / W + mod(r, 2.) * .5);
    vec2 f = vec2(fract(s.x / W + mod(r, 2.) * .5), fract(s.y / H));
    col *= (.75 + .4 * hB(vec2(c, r))) * (.6 + .4 * smoothstep(.0, .2, f.y)) * (.95 + .08 * n3(vec3(s * 30., 1.)));
    h = f.y * .3; rug = .55;
  }`,
  tole: `{
    vec2 s = repPente(p, n); float W = .28;
    float f = fract(s.x / W); float j = smoothstep(.0, .06, f) * (1. - smoothstep(.94, 1., f));
    col *= (.82 + .18 * j) * (.95 + .08 * fbm3(vec3(s * 2., 7.)));
    h = (1. - j) * .8; rug = .42;
  }`,
  bois: `{
    vec3 an = abs(n); vec2 uv = an.y > .6 ? p.xz : (an.x > an.z ? p.zy : p.xy);
    float w = .11, k = floor(uv.x / w), f = fract(uv.x / w);
    float grain = fbm3(vec3(uv.x * 3., uv.y * .7, k * 1.7));
    col *= (.78 + .38 * hB(vec2(k, 5.))) * (.88 + .24 * grain) * (1. - (1. - smoothstep(.0, .05, f)) * .35);
    h = (smoothstep(.0, .06, f) - .5) * .35 + grain * .1; rug = .78;
  }`,
  peinture: `{
    col *= .96 + .08 * fbm3(p * 8.); rug = .8; h = n3(p * 45.) * .03;
  }`,
  cuivre: `{
    vec3 an = abs(n); vec2 uv = an.y > .6 ? p.xz : (an.x > an.z ? p.zy : p.xy);
    float v = fbm3(vec3(uv.x * 9., uv.y * 2.2, 4.)); col = mix(col * .85, vec3(.24, .66, .56), smoothstep(.35, .75, v)); rug = .55; h = v * .1;
  }`,
  metal: `{ col *= .9 + .2 * fbm3(p * 14.); rug = .32; }`,
  beton: `{ col *= .9 + .2 * fbm3(p * 9.); rug = .93; h = n3(p * 30.) * .06; }`,
  verre: `{ rug = .07; col *= .85 + .3 * smoothstep(.2, .9, p.y * .3 + .4); }`,
  fenetre: `{ rug = .1; float j = hB(floor(p.xz * 40.) + floor(p.y * 30.)); em = col * uNuit * (j > .28 ? 1.9 : .05); col *= .25 + .15 * (1. - uNuit); }`,
  neon: `{ rug = .2; em = col * (1.4 + .2 * sin(uTemps * 3. + p.x * 4.)); col *= .2; }`,
  facade: `{
    vec3 an = abs(n); vec2 uv = an.y > .6 ? p.xz : (an.x > an.z ? p.zy : p.xy);
    vec2 g = vec2(uv.x / .13, uv.y / .15), f = fract(g), id = floor(g);
    float vitre = step(.1, f.x) * step(f.x, .9) * step(.14, f.y) * step(f.y, .82);
    float allume = step(.58, hB(id + 2.));
    col = mix(col, vec3(.045, .075, .12) * (.7 + .9 * hB(id + 7.)), vitre);
    em = vitre * allume * mix(vec3(1., .8, .45), vec3(.7, .9, 1.), hB(id + 11.)) * (.04 + uNuit * (.9 + .9 * hB(id + 3.)));
    rug = mix(.55, .09, vitre);
  }`,
  shoji: `{
    vec3 an = abs(n); vec2 uv = an.y > .6 ? p.xz : (an.x > an.z ? p.zy : p.xy);
    float lat = max(step(fract(uv.x / .085), .09), step(fract(uv.y / .11), .09));
    col = mix(vec3(.97, .93, .83), vec3(.33, .22, .13), lat); em = vec3(1., .78, .4) * uNuit * .6 * (1. - lat); rug = .85;
  }`,
  plastique: `{ rug = .35; }`,
  voile: `{ col *= .95 + .08 * fbm3(p * 6.); rug = .9; }`,
  asphalte: `{ col *= .92 + .14 * fbm3(p * 20.); rug = .95; h = n3(p * 60.) * .08; }`,
  herbe: `{ col *= .85 + .3 * fbm3(p * 12.); rug = .95; h = n3(p * 50.) * .05; }`,
};

const cache = new Map();
function fabriquer(nomMat, ciel) {
  if (cache.has(nomMat)) return cache.get(nomMat);
  const [type, hex] = nomMat.split('|'); const code = TYPES[type] || TYPES.peinture;
  const verre = type === 'verre', fen = type === 'fenetre';
  const m = new THREE.MeshStandardMaterial({ color: hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#cccccc', roughness: .8, metalness: type === 'metal' ? .9 : type === 'cuivre' ? .55 : 0, envMapIntensity: verre ? 2.0 : type === 'metal' ? 1.4 : .5, side: type === 'voile' ? THREE.DoubleSide : THREE.FrontSide });
  m.name = nomMat; if (verre || fen) m.polygonOffset = false;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNuit = ciel.uniformes.uNuit; sh.uniforms.uSunDir = ciel.uniformes.uSunDir; sh.uniforms.uNu = ciel.uniformes.uNu; sh.uniforms.uTemps = ciel.uniformes.uT;
    sh.vertexShader = `varying vec3 vOp; varying vec3 vOn; varying vec3 vWp;\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vOp = position; vOn = normal; vWp = (modelMatrix * vec4(transformed, 1.)).xyz;`);
    sh.fragmentShader = ENTETE + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 p = vOp, n = normalize(vOn); vec3 col = diffuseColor.rgb;
        float rug = roughness, h = 0.; vec3 em = vec3(0.);
        ${code}
        /* pied de mur plus sombre : assombrissement d'occlusion simple */
        col *= mix(.72, 1., smoothstep(.0, .35, p.y));
        diffuseColor.rgb = col; float rugosite_ = rug;
        #ifdef DEBUG_ALBEDO
          gl_FragColor = vec4(pow(col, vec3(1./2.2)), 1.); return;
        #endif`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = rugosite_;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 sx = normalize(dFdx(-vViewPosition)), sy = normalize(dFdy(-vViewPosition));
          vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
          float det = dot(sx, r1);
          vec3 grad = sign(det) * (clamp(dFdx(h), -.6, .6) * r1 + clamp(dFdy(h), -.6, .6) * r2);
          normal = normalize(abs(det) * normal - grad * .32);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += em;`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        float sd_ = ombreNuages(vWp);
        reflectedLight.directDiffuse *= (1. - sd_ * .62); reflectedLight.directSpecular *= (1. - sd_ * .7);`);
  };
  if (typeof location !== 'undefined' && /dbg=albedo/.test(location.search)) m.defines = { DEBUG_ALBEDO: '' };
  m.customProgramCacheKey = () => 'bat-' + type + (m.defines && m.defines.DEBUG_ALBEDO !== undefined ? 'd' : '');
  cache.set(nomMat, m); return m;
}

export async function chargerBatiments(ciel, url = new URL('assets/atlas/batiments.glb', import.meta.url).href) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const sources = {};
  gltf.scene.traverse((o) => { if (o.name && o.name.startsWith('bat_')) sources[o.name.slice(4)] = o; });
  return {
    noms: Object.keys(sources),
    creer(nom) {
      const src = sources[nom]; if (!src) throw new Error('bâtiment inconnu : ' + nom);
      const groupe = new THREE.Group(); const ancres = {};
      const copie = src.clone(true);
      copie.traverse((o) => {
        if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map((mm) => fabriquer(mm.name, ciel)) : fabriquer(o.material.name, ciel); o.castShadow = o.receiveShadow = true; }
        if (o.name && o.name.startsWith('ancre_' + nom + '_')) ancres[o.name.slice(7 + nom.length)] = o;
      });
      copie.position.set(0, 0, 0); copie.rotation.set(0, 0, 0); copie.scale.set(1, 1, 1);
      groupe.add(copie); groupe.userData.ancres = ancres;
      return { groupe, ancres };
    },
  };
}
