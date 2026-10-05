/* ATLAS · L'ÎLE FLOTTANTE : terrain (maillage issu du champ de distance, tools/atlas-ile/), carte de hauteurs, matériau de roche.
 *
 *   const ile = await chargerIle(ciel)   ->  { mesh, carte, materiau }
 *   carte.hauteur(x, z)   carte.eau(x, z)   carte.pente(x, z)   carte.normale(x, z)   carte.texH / carte.texEau (pour les shaders)
 *   eclairer(materiau, { ... })          injecte dans un MeshStandardMaterial : AO cuite, ombres des nuages, grain de matière */
import * as THREE from './three.module.js';
import { chargerMailles } from './atlas-maille.js';
import { GLSL_BRUIT, GLSL_OMBRES } from './atlas-ciel.js';

const demi = new Float32Array(1), ent = new Uint32Array(demi.buffer);
function half(h) {                                          // demi-flottant -> flottant
  const s = (h & 0x8000) << 16, e = (h >> 10) & 31, m = h & 1023;
  if (e === 0) return (s ? -1 : 1) * m * 5.960464477539063e-8;
  if (e === 31) return m ? NaN : (s ? -Infinity : Infinity);
  ent[0] = s | ((e + 112) << 23) | (m << 13); return demi[0];
}

const ICI = (p) => new URL(p, import.meta.url).href;

export async function chargerCarte(url = ICI('assets/atlas/ile-carte')) {
  const meta = await (await fetch(url + '.json')).json();
  const buf = await (await fetch(url + '.bin')).arrayBuffer();
  const { nx, nz, res, x0, z0 } = meta;
  const brut = new Uint16Array(buf, 0, nx * nz), eauU8 = new Uint8Array(buf, nx * nz * 2, nx * nz);
  const H = new Float32Array(nx * nz); for (let i = 0; i < H.length; i++) H[i] = half(brut[i]);
  const idx = (x, z) => [(x - x0) / res, (z - z0) / res];
  const carte = {
    meta, nx, nz, res, x0, z0, H, eauU8,
    /* hauteur de la surface en (x, z) ; -50 hors de l'île */
    hauteur(x, z) {
      let [u, v] = idx(x, z); if (u < 0 || v < 0 || u >= nx - 1 || v >= nz - 1) return -50;
      const i = u | 0, j = v | 0, fu = u - i, fv = v - j;
      const a = H[i * nz + j], b = H[(i + 1) * nz + j], c = H[i * nz + j + 1], d = H[(i + 1) * nz + j + 1];
      if (a < -20 || b < -20 || c < -20 || d < -20) return Math.max(a, b, c, d) < -20 ? -50 : Math.max(a, b, c, d);
      return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
    },
    eau(x, z) { const [u, v] = idx(x, z); const i = Math.round(u), j = Math.round(v); return i >= 0 && j >= 0 && i < nx && j < nz && eauU8[i * nz + j] > 0; },
    normale(x, z, out = new THREE.Vector3(), e = 0.12) {
      const hx = carte.hauteur(x + e, z) - carte.hauteur(x - e, z), hz = carte.hauteur(x, z + e) - carte.hauteur(x, z - e);
      return out.set(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
    },
    pente(x, z) { return Math.acos(Math.min(1, carte.normale(x, z).y)); },
    /* sur l'île (surface réelle sous les pieds) ? */
    surIle(x, z) { return carte.hauteur(x, z) > -20; },
  };
  // textures pour les shaders : largeur = nz, hauteur = nx ; u suit z, v suit x
  const th = new THREE.DataTexture(brut, nz, nx, THREE.RedFormat, THREE.HalfFloatType); th.minFilter = th.magFilter = THREE.LinearFilter; th.needsUpdate = true;
  const te = new THREE.DataTexture(eauU8, nz, nx, THREE.RedFormat, THREE.UnsignedByteType); te.minFilter = te.magFilter = THREE.LinearFilter; te.needsUpdate = true;
  carte.texH = th; carte.texEau = te; carte.zone = new THREE.Vector4(x0, z0, nx * res, nz * res);
  return carte;
}

/* ------------------------------------------------------------------------------------------------------------------------------
   Éclairage commun : on enrichit un MeshStandardMaterial par morceaux de shader.
   opts.roche : bosselage angulaire (triplanar procédural) pour la roche ; opts.caustiques : lueurs d'eau dans le lagon ;
   opts.ao : lit l'attribut `ao` cuit (sinon 1). Les ombres de nuages et la teinte sous l'eau sont toujours appliquées. */
export function eclairer(mat, ciel, carte, opts = {}) {
  const partage = { uT: { value: 0 }, uNu: ciel.uniformes.uNu, uSunDir: ciel.uniformes.uSunDir, uNuit: ciel.uniformes.uNuit, uBump: { value: opts.bump ?? 0.6 }, uZone: { value: carte ? carte.zone : new THREE.Vector4() }, uEauTex: { value: carte ? carte.texEau : null }, uHTex: { value: carte ? carte.texH : null }, uTemps: { value: 0 } };
  mat.userData.partage = partage;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, partage);
    sh.vertexShader = `attribute float ao, mat; varying float vAo, vMat; varying vec3 vWp; varying vec3 vNw;\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vAo = ao; vMat = mat;
      mat4 mi_ = mat4(1.);
      #ifdef USE_INSTANCING
        mi_ = instanceMatrix;
      #endif
      vec4 wp4 = modelMatrix * mi_ * vec4(transformed, 1.); vWp = wp4.xyz; vNw = normalize(mat3(modelMatrix * mi_) * normal);`);
    sh.fragmentShader = `uniform float uT, uBump, uNuit, uTemps; uniform vec3 uSunDir; uniform vec4 uZone; uniform sampler2D uEauTex, uHTex;
      varying float vAo, vMat; varying vec3 vWp; varying vec3 vNw;
      ${GLSL_BRUIT}${GLSL_OMBRES}
      float hroche(vec3 q){ float a = n3(q), b = n3(q * 2.7 + 3.1), c = n3(q * 7.9 + 11.); return (1. - abs(a * 2. - 1.)) * .55 + b * .3 + (1. - abs(c * 2. - 1.)) * .22; }
      float causti(vec2 p, float t){ vec2 i = p; float c = 1.; for (int n = 0; n < 4; n++){ float tt = t * (1. - 3.5 / float(n + 1)); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x)); c += 1. / length(vec2(p.x / (sin(i.x + tt) / .005), p.y / (cos(i.y + tt) / .005))); } c /= 4.; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.); }
    ` + sh.fragmentShader
      .replace('#include <normal_fragment_begin>', 'vec3 normal = normalize(vNormal); vec3 nonPerturbedNormal = normal;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float mid_ = floor(vMat + .5);
        float rocheW = (mid_ < .5 || mid_ > 5.5) ? 1. : 0.;
        float bumpM = rocheW + (mid_ > .5 && mid_ < 1.5 ? .28 : 0.) + (mid_ > 1.5 && mid_ < 2.5 ? .22 : 0.) + (mid_ > 2.5 && mid_ < 3.5 ? .1 : 0.) + (mid_ > 3.5 && mid_ < 4.5 ? .24 : 0.) + (mid_ > 4.5 && mid_ < 5.5 ? .12 : 0.);
        float fin = fbm3(vWp * 10.), gros = fbm3(vWp * 2.6 + 4.);
        diffuseColor.rgb *= mix(.9 + .2 * fin, .78 + .44 * fin, rocheW) * (.9 + .2 * gros);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        ${opts.roche === false ? '' : `{
          float dist = length(vViewPosition), fadeB = 1. - smoothstep(30., 70., dist);
          vec3 q = vWp * 4.8; float e = .06, h0 = hroche(q);
          vec3 gw = vec3(hroche(q + vec3(e,0,0)) - h0, hroche(q + vec3(0,e,0)) - h0, hroche(q + vec3(0,0,e)) - h0) / e;
          vec3 nw = normalize(vNw); gw -= dot(gw, nw) * nw;
          normal = normalize(normal - (viewMatrix * vec4(gw, 0.)).xyz * uBump * bumpM * fadeB * .5);
          /* facettes : la roche garde un peu de la normale de sa face (arêtes plus franches que la normale lissée) */
          vec3 fN = (viewMatrix * vec4(normalize(cross(dFdx(vWp), dFdy(vWp))), 0.)).xyz; if (dot(fN, normal) < 0.) fN = -fN;
          normal = normalize(mix(normal, fN, .5 * rocheW * fadeB));
        }`}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${opts.caustiques === false ? '' : `{
          vec2 uvw = vec2((vWp.z - uZone.y) / uZone.w, (vWp.x - uZone.x) / uZone.z);
          float inLag = texture2D(uEauTex, uvw).r * step(vWp.y, -.02) * step(-1.6, vWp.y);
          if (inLag > .01) {
            float c = min(causti(vWp.xz * .62, uTemps * .55), 1.5) * inLag * (1. - uNuit * .75);
            totalEmissiveRadiance += vec3(.9, 1., .95) * c * (1. - smoothstep(-1.5, -.25, vWp.y)) * .55;
          }
        }`}`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        float ao_ = mix(1., vAo, ${opts.ao === false ? '0.' : '1.'});
        reflectedLight.indirectDiffuse *= ao_; reflectedLight.indirectSpecular *= ao_;
        float ombre_ = ombreNuages(vWp) * smoothstep(-3., -.4, vWp.y);
        reflectedLight.directDiffuse *= mix(.4, 1., ao_) * (1. - ombre_ * .55); reflectedLight.directSpecular *= (1. - ombre_ * .7);`);
  };
  mat.customProgramCacheKey = () => 'ile' + (opts.roche === false ? 'r0' : 'r1') + (opts.caustiques === false ? 'c0' : 'c1') + (opts.ao === false ? 'a0' : 'a1');
  return partage;
}

export async function chargerIle(ciel) {
  const carte = await chargerCarte();
  const mailles = await chargerMailles(ICI('assets/atlas/ile.bin'));
  const materiau = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.3, side: THREE.DoubleSide });
  const partage = eclairer(materiau, ciel, carte, { bump: 0.5 });
  const mesh = new THREE.Mesh(mailles.ile.geo, materiau);
  mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  return { mesh, carte, materiau, partage };
}

/* ------------------------------------------------------------------------------------------------------------------------------
   Le lagon : un plan translucide au niveau 0, découpé par le masque d'eau de la carte. La couleur dépend de la profondeur réelle
   (hauteur du fond lue dans la carte) : blanc-turquoise sur le sable, turquoise, puis vert-bleu profond. Reflets du ciel (fresnel),
   éclats du soleil, écume qui lèche chaque rive, ombres de nuages. Les caustiques sont dessinées sur le fond par le matériau du terrain. */
export function creerEau(ile, ciel) {
  const { carte } = ile;
  const U = {
    uTemps: { value: 0 }, uHTex: { value: carte.texH }, uEauTex: { value: carte.texEau }, uZone: { value: carte.zone },
    uZenith: ciel.uniformes.uZenith, uMilieu: ciel.uniformes.uMilieu, uHorizon: ciel.uniformes.uHorizon, uSunDir: ciel.uniformes.uSunDir, uSunCol: ciel.uniformes.uSunCol, uNuit: ciel.uniformes.uNuit,
    uCam: ciel.uniformes.uCam, uNu: ciel.uniformes.uNu,
    uC0: { value: new THREE.Color('#bff0e0') }, uC1: { value: new THREE.Color('#3fd0c4') }, uC2: { value: new THREE.Color('#12a0a8') }, uC3: { value: new THREE.Color('#0b6a96') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `${GLSL_BRUIT}
      uniform vec3 uZenith, uMilieu, uHorizon, uSunDir, uSunCol, uCam, uC0, uC1, uC2, uC3; uniform float uNuit, uTemps; uniform vec4 uZone; uniform sampler2D uHTex, uEauTex;
      ${GLSL_OMBRES}
      varying vec3 vW;
      vec3 ciel(vec3 d){ float h = clamp(d.y, 0., 1.); vec3 c = mix(uHorizon, uMilieu, smoothstep(0., .35, h)); c = mix(c, uZenith, smoothstep(.25, .95, h)); float s = max(dot(d, uSunDir), 0.); return c + uSunCol * (pow(s, 6.) * .25 + pow(s, 64.) * .5); }
      void main(){
        vec2 uv = vec2((vW.z - uZone.y) / uZone.w, (vW.x - uZone.x) / uZone.z);
        float m = texture2D(uEauTex, uv).r;
        if (m < .05) discard;
        float h = texture2D(uHTex, uv).r;
        float depth = max(0., -h);
        vec2 p = vW.xz;
        /* petites rides qui avancent dans deux sens */
        vec2 g = (vec2(n2(p * 2.3 + uTemps * .35), n2(p * 2.3 + 8. - uTemps * .3)) - .5) * .8 + (vec2(n2(p * 5.1 - uTemps * .5), n2(p * 5.1 + 3. + uTemps * .45)) - .5) * .4;
        vec3 N = normalize(vec3(g.x * .25, 1., g.y * .25));
        vec3 V = normalize(uCam - vW);
        float fres = .02 + .98 * pow(1. - max(dot(N, V), 0.), 4.5);
        vec3 R = reflect(-V, N);
        vec3 col = mix(uC0, uC1, smoothstep(.0, .35, depth));
        col = mix(col, uC2, smoothstep(.3, .85, depth));
        col = mix(col, uC3, smoothstep(.8, 1.5, depth));
        float a = mix(.22, .93, smoothstep(.02, 1.0, depth));
        col *= vec3(1.) * (.85 + .15 * n2(p * .8 + uTemps * .1));
        col = mix(col, ciel(vec3(R.x, abs(R.y), R.z)), fres * .85);
        col += uSunCol * pow(max(dot(R, uSunDir), 0.), 220.) * 2.4 * (1. - uNuit * .6);
        /* écume : bande claire à la rive, ondulée, plus un liseré qui pulse */
        float nz = n2(p * 4.2 + uTemps * .35);
        float rive = (1. - smoothstep(.015, .09, depth + (nz - .5) * .05)) * .8;
        float pulse = smoothstep(.82, 1., sin(depth * 14. - uTemps * 1.3 + nz * 2.4)) * (1. - smoothstep(.06, .32, depth)) * .5;
        float ecume = max(rive, pulse * .75);
        col = mix(col, vec3(.97, 1., 1.), ecume);
        a = max(a, ecume * .95);
        float ombre = ombreNuages(vW + vec3(0., 0., 0.));
        col *= 1. - ombre * .35;
        col *= mix(1., .35, uNuit);
        gl_FragColor = vec4(col, a * smoothstep(.1, .6, m));
      }`,
  });
  const eau = new THREE.Mesh(new THREE.PlaneGeometry(15, 12, 1, 1).rotateX(-Math.PI / 2), mat);
  eau.position.set(carte.meta.lagon.c[0], 0, 5.0); eau.renderOrder = 4; eau.frustumCulled = false;
  eau.userData.uniformes = U;
  return eau;
}
