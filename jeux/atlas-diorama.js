/* ATLAS · DIORAMA. L'île repose sur une dalle de mer, comme une maquette : dessus une eau turquoise qui s'éclaircit vers la plage, des taches d'algues sombres,
 * des caustiques, une écume qui lèche le sable et l'ombre portée de l'île ; autour, la tranche de la dalle (strates de sable et de terre brune). Tout est
 * procédural. L'eau lit la carte de hauteurs de l'île pour ne pas se dessiner là où la terre dépasse, et un champ de distance à la terre (calculé ici) pour
 * ses couleurs.
 *
 *   const d = creerDiorama(ciel, carte)   ->  d.groupe (à ajouter à la scène), d.niveau, d.tick(t)                                                           */
import * as THREE from './three.module.js';
import { GLSL_BRUIT, GLSL_CIEL, GLSL_OMBRES } from './atlas-ciel.js';
import { GLSL_HOULE, GLSL_CAUSTIQUES } from './atlas-eau-matiere.js';
import { GLSL_FOND_MARIN } from './atlas-fond-marin.js';

export const DIO = { demiX: 64, demiZ: 50, cx: 0, cz: 0.6, niveau: 0, epaisseur: 2.6, ilot: { x: -21.5, z: 9, r: 3.0 } };

/* distance (en mètres) à la terre émergée, par transformée en distances en deux passes (chanfrein 3-4) */
function champDistance(carte) {
  const pas = 0.4, W = Math.round(2 * DIO.demiX / pas), H = Math.round(2 * DIO.demiZ / pas), x0 = DIO.cx - DIO.demiX, z0 = DIO.cz - DIO.demiZ;
  const d = new Float32Array(W * H), INF = 1e6;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + (i + 0.5) * pas, z = z0 + (j + 0.5) * pas, h = carte.hauteur(x, z);
    const sur = Math.hypot(x - DIO.ilot.x, z - DIO.ilot.z) < DIO.ilot.r * 0.74;                 // l'îlot du phare compte comme de la terre
    d[j * W + i] = (h > DIO.niveau + 0.03 || sur) ? 0 : INF;
  }
  const A = 1, B = 1.4142;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let v = d[j * W + i]; if (v === 0) continue;
    if (i > 0) v = Math.min(v, d[j * W + i - 1] + A); if (j > 0) { v = Math.min(v, d[(j - 1) * W + i] + A); if (i > 0) v = Math.min(v, d[(j - 1) * W + i - 1] + B); if (i < W - 1) v = Math.min(v, d[(j - 1) * W + i + 1] + B); } d[j * W + i] = v; }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { let v = d[j * W + i]; if (v === 0) continue;
    if (i < W - 1) v = Math.min(v, d[j * W + i + 1] + A); if (j < H - 1) { v = Math.min(v, d[(j + 1) * W + i] + A); if (i < W - 1) v = Math.min(v, d[(j + 1) * W + i + 1] + B); if (i > 0) v = Math.min(v, d[(j + 1) * W + i - 1] + B); } d[j * W + i] = v; }
  const demi = new Uint16Array(W * H); for (let k = 0; k < demi.length; k++) demi[k] = THREE.DataUtils.toHalfFloat(Math.min(60, d[k] * pas));
  const tex = new THREE.DataTexture(demi, W, H, THREE.RedFormat, THREE.HalfFloatType); tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  return { tex, zone: new THREE.Vector4(x0, z0, 2 * DIO.demiX, 2 * DIO.demiZ) };
}

function textureTranche() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  const bandes = [[0, .05, '#e6a574'], [.05, .45, '#bf7248'], [.45, .8, '#a45e40'], [.8, 1, '#6a3c46']];
  for (const [a, b, col] of bandes) { g.fillStyle = col; g.fillRect(0, a * 128, 512, (b - a) * 128 + 1); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,225,190' : '60,30,36'},${0.03 + Math.random() * 0.05})`; g.fillRect(Math.random() * 512, Math.random() * 128, 6 + Math.random() * 40, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function creerDiorama(ciel, carte) {
  const groupe = new THREE.Group(), niv = DIO.niveau, { tex, zone } = champDistance(carte), U = ciel.uniformes;
  const uni = {
    uScene:{value:null},uDepth:{value:null},uResolution:{value:new THREE.Vector2(1,1)},uNear:{value:.3},uFar:{value:2000},
    uTemps: { value: 0 }, uSea: { value: niv }, uSDF: { value: tex }, uSDFZone: { value: zone },
    uHTex: { value: carte.texH }, uEauTex: { value: carte.texEau }, uZone: { value: carte.zone },
    uZenith: U.uZenith, uMilieu: U.uMilieu, uHorizon: U.uHorizon, uSunDir: U.uSunDir, uSunCol: U.uSunCol, uNuit: U.uNuit, uCam: U.uCam, uNu: U.uNu,
    uShallow: { value: new THREE.Color('#b0dfc9') }, uMid: { value: new THREE.Color('#55c2b5') }, uDeep: { value: new THREE.Color('#237f9c') }, uAbyss: { value: new THREE.Color('#145971') }, uSable: { value: new THREE.Color('#e6d5a3') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `uniform float uTemps; uniform sampler2D uSDF; uniform vec4 uSDFZone;
      varying vec3 vW; ${GLSL_HOULE}
      void main(){ vec4 w = modelMatrix * vec4(position, 1.);
        float d = texture2D(uSDF, (w.xz - uSDFZone.xy) / uSDFZone.zw).r;
        w.y += houleAtlas(w.xz, uTemps).x * smoothstep(.2, 3., d);
        vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${GLSL_BRUIT}${GLSL_CIEL}${GLSL_OMBRES}${GLSL_HOULE}${GLSL_CAUSTIQUES}${GLSL_FOND_MARIN}
      uniform sampler2D uScene,uDepth; uniform vec2 uResolution; uniform float uNear,uFar;
      float linearDepth(float d){return uNear*uFar/(uFar-(uFar-uNear)*d);}
      uniform float uTemps, uSea; uniform vec3 uCam, uShallow, uMid, uDeep, uAbyss, uSable; uniform vec4 uZone, uSDFZone; uniform sampler2D uSDF, uHTex, uEauTex;
      varying vec3 vW;
      float causti(vec2 p, float t){ vec2 i = p; float c = 1.; for (int n = 0; n < 4; n++){ float tt = t * (1. - 3.5 / float(n + 1)); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x)); c += 1. / length(vec2(p.x / (sin(i.x + tt) / .005), p.y / (cos(i.y + tt) / .005))); } c /= 4.; return pow(clamp(1.17 - pow(c, 1.4), 0., 1.), 8.); }
      vec2 uvIle(vec2 p){ return vec2((p.y - uZone.y) / uZone.w, (p.x - uZone.x) / uZone.z); }
      float haut(vec2 p){ vec2 u = uvIle(p); if (u.x < 0. || u.y < 0. || u.x > 1. || u.y > 1.) return -50.; return texture2D(uHTex, u).r; }
      void main(){
        vec2 p = vW.xz; vec2 u = uvIle(p);
        if (u.x > 0. && u.y > 0. && u.x < 1. && u.y < 1.){ float h = texture2D(uHTex, u).r, lag = texture2D(uEauTex, u).r; if ((h > uSea + .02 && h > -20.) ) discard; }
        float distanceRive = texture2D(uSDF, (p - uSDFZone.xy) / uSDFZone.zw).r;
        float hFond=haut(p); float profondeur = hFond>-20. ? clamp(uSea-hFond,0.,1.5) : .3+distanceRive*.32;
        float d = distanceRive;
        float n1 = fbm2(p * .45 + 3.), n2v = fbm2(p * 1.6 - 7.);
        d += (n1 - .5) * 1.4;
        /* jusant et flux : la ligne d'eau avance et recule sur la plage */
        float swash = .5 + .5 * sin(uTemps * .85 + n1 * 6.);
        float ds = min(d,profondeur*2.) - (swash * .25 - .06);
        /* houle clapotante : deux trains d'ondes dirigés plus un clapot fin ; plus l'eau est profonde, plus elle est agitée */
        float agit = .55 + .45 * smoothstep(1., 10., d);
        vec2 g = (vec2(n2(p * 1.3 + vec2(uTemps * .32, 0.)), n2(p * 1.3 + 9. - vec2(0., uTemps * .27))) - .5) * .9
               + (vec2(n2(p * 3.4 - uTemps * .5), n2(p * 3.4 + 4. + uTemps * .44)) - .5) * .6
               + (vec2(n2(p * 8.1 + uTemps * .8), n2(p * 8.1 + 2. - uTemps * .7)) - .5) * .32 * agit;
        vec3 houle = houleAtlas(p, uTemps);
        vec3 N = normalize(vec3(-houle.y * agit + g.x * .22 * agit, 1., -houle.z * agit + g.y * .22 * agit)), V = normalize(uCam - vW);
        float fres = .02 + .98 * pow(1. - max(dot(N, V), 0.), 4.);
        vec3 R = reflect(-V, N);
        /* profondeur apparente : turquoise vert près de la plage, bleu-vert, puis violet au large */
        vec3 col = mix(uShallow, uMid, smoothstep(.12, .7, profondeur));
        col = mix(col, uDeep, smoothstep(.65, 2.4, profondeur));
        col = mix(col, uAbyss, smoothstep(2.2, 7., profondeur));
        /* sable visible sous l'eau claire, rides comprises */
        float fond = 1. - smoothstep(.2, 2.2, profondeur);
        // Réfraction du fond procédural : approximation, sans capture de scène.
        p += N.xz * (.08 + .24 * smoothstep(.3, 4., d));
        n1 = fbm2(p * .45 + 3.);
        float rides = .5 + .5 * sin(dot(p, vec2(.8, .6)) * 10. + n1 * 8.);
        vec3 sable = uSable * (.82 + .18 * rides);
        col = mix(col, mix(sable, col, .5), fond * .40);
        /* herbiers : touffes olive à contour sombre, semées en grille irrégulière, ombre portée sur le fond */
        float zH = smoothstep(1.3, 2.6, d) * (1. - smoothstep(16., 26., d));
        vec2 cH = floor(p / 3.3), fH = fract(p / 3.3) - .5;
        float pres = step(.74, h21(cH + 1.)) * zH, rayon = .17 + .12 * h21(cH + 5.);
        vec2 oH = (vec2(h21(cH + 3.), h21(cH + 9.)) - .5) * .6;
        float dH = length(fH - oH) / rayon, dO = length(fH - oH - vec2(.1, .09)) / rayon;
        float lob = .16 * sin(atan(fH.y - oH.y, fH.x - oH.x) * 5. + h21(cH) * 6.);
        float touffe = pres * (1. - smoothstep(.62, 1., dH + lob + (n2(p * 7.) - .5) * .45));
        float ombreT = pres * (1. - smoothstep(.85, 1.3, dO)) * (1. - touffe);
        vec3 herbe = mix(vec3(.05, .07, .03), vec3(.2, .22, .08), smoothstep(.15, 1., n2(p * 8.) * .75 + (1. - dH) * .4)) * (.7 + .5 * (.5 - fH.y + oH.y)) * (1. - .6 * smoothstep(.6, .95, dH));
        col *= 1. - ombreT * .35;
        col = mix(col, herbe, touffe * .18);
        /* taches sombres d'algues et galets noirs éparpillés sur le fond */
        float zone = smoothstep(1.4, 3.2, d) * (1. - smoothstep(13., 26., d));
        float tache = smoothstep(.52, .62, fbm2(p * .3 + 11.)) * zone;
        col = mix(col, col * vec3(.45, .6, .62), tache * .12);
        vec2 cG = floor(p / .55), fG = fract(p / .55) - .5;
        float galet = step(.62, h21(cG + 21.)) * smoothstep(.9, 2.2, d) * (1. - smoothstep(18., 28., d));
        float rg = .06 + .07 * h21(cG + 33.); vec2 oG = (vec2(h21(cG + 4.), h21(cG + 8.)) - .5) * .6;
        col = mix(col, vec3(.05, .08, .1), galet * (1. - smoothstep(rg * .8, rg, length(fG - oG))) * .22);
        /* Fond virtuel extérieur : profondeur visuelle issue de la distance à la rive. */
        col = fondMarinAtlas(col, p, profondeur, uTemps);
        // Capture de la scène opaque : le vrai terrain, les galets et la végétation sous l'eau restent visibles.
        vec2 screenUV=gl_FragCoord.xy/uResolution;
        vec2 refrUV=clamp(screenUV+N.xz*min(profondeur,2.)*.007,vec2(.001),vec2(.999));
        float surfaceDepth=linearDepth(gl_FragCoord.z);
        if(linearDepth(texture2D(uDepth,refrUV).r)<surfaceDepth)refrUV=screenUV;
        float epaisseur=clamp(linearDepth(texture2D(uDepth,refrUV).r)-surfaceDepth,0.,min(8.,profondeur*1.6+.1));
        vec3 transmission=exp(-vec3(.48,.16,.09)*epaisseur);
        vec3 vraiFond=texture2D(uScene,refrUV).rgb*transmission+col*(1.-transmission);
        col=mix(col,vraiFond,.90*(1.-smoothstep(3.,7.,profondeur)));
        /* caustiques */
        float ca = caustiqueAtlas(p * 4.5, uTemps) * (1. - smoothstep(1., 6., d)) * (1. - uNuit * .8);
        col += vec3(.72, .95, .84) * ca * .035;
        /* ombre portée de l'île : on remonte le rayon du soleil dans la carte de hauteurs */
        vec3 L = normalize(uSunDir); float om = 0.;
        for (int i = 1; i <= 20; i++){ vec3 s = vec3(p.x, uSea, p.y) + L * float(i) * .85; float hh = haut(s.xz); om = max(om, step(s.y, hh - .05) * step(-20., hh)); }
        col *= 1. - om * .22;
        float ombre = ombreNuages(vW);
        col *= 1. - ombre * .16;
        /* reflets du ciel prune (forts à grand angle) et éclats du soleil : mille petits points scintillants */
        vec3 ciel = couleurCiel(vec3(R.x, abs(R.y), R.z));
        col = mix(col, ciel * vec3(.95, .85, .95), fres * (.42 + .22 * smoothstep(4., 16., d)));
        float spec = pow(max(dot(R, uSunDir), 0.), 110.);
        col += uSunCol * spec * 3.2 * (1. - om);
        col += uSunCol * pow(max(dot(R, uSunDir), 0.), 16.) * .08;
        float scint = step(.965, n2(p * 11. + uTemps * 1.6)) * step(.55, n2(p * 1.2 + uTemps * .3)) * (1. - om) * (.4 + .6 * smoothstep(1., 8., d));
        col += vec3(1., .95, .85) * scint * .12;
        /* écume : bulles blanches dans la zone de balayage, vaguelettes qui avancent vers la rive, sillage autour du ponton */
        float bande = 1. - smoothstep(.02, .18, profondeur);
        float bulle = smoothstep(.5, .62, fbm2(p * 7.5 + uTemps * .25));
        float rive = bande * (.3 + .7 * bulle) + (1. - smoothstep(.01, .06, profondeur)) * .35;
        float train = smoothstep(.87, 1., sin(d * 5.2 + uTemps * 1.3 + n1 * 1.2)) * (1. - smoothstep(.08, .28, profondeur)) * (.5 + .5 * bulle) * .55;
        col = mix(col, vec3(1., .98, .93), clamp(max(rive, train) * .92, 0., 1.));
        col *= mix(1., .3, uNuit);
        /* voile prune sur les bords de la dalle : la mer se perd dans la brume */
        float bord = max(abs(p.x - ${DIO.cx.toFixed(1)}) / ${DIO.demiX.toFixed(1)}, abs(p.y - ${DIO.cz.toFixed(1)}) / ${DIO.demiZ.toFixed(1)});
        col = mix(col, ciel * .75, smoothstep(.86, 1.02, bord) * .22);
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(2 * DIO.demiX, 2 * DIO.demiZ, 180, 140).rotateX(-Math.PI / 2), mat);
  surface.position.set(DIO.cx, niv, DIO.cz); surface.frustumCulled = false; surface.renderOrder = -4; groupe.add(surface);

  const tr = textureTranche(); tr.repeat.set(6, 1);
  const matTranche = new THREE.MeshStandardMaterial({ map: tr, roughness: 0.9, metalness: 0, envMapIntensity: 0.25 });
  const dessous = new THREE.MeshStandardMaterial({ color: '#3a2630', roughness: 1 });
  const caisse = new THREE.Mesh(new THREE.BoxGeometry(2 * DIO.demiX, DIO.epaisseur, 2 * DIO.demiZ), [matTranche, matTranche, dessous, dessous, matTranche, matTranche]);
  /* Le couvercle reste sous le creux maximal de la houle (0.062 m). */
  caisse.position.set(DIO.cx, niv - DIO.epaisseur / 2 - 5.5, DIO.cz); caisse.receiveShadow = true; caisse.visible=false; groupe.add(caisse);

  return { groupe, niveau: niv, surface, ilotX:DIO.ilot.x, ilotZ:DIO.ilot.z, tick(t) { uni.uTemps.value = t; } };
}

/* L'îlot du phare : un monticule de sable qui sort de la mer, quelques rochers et des touffes, assez large pour porter la tour. */
export function creerIlot() {
  const { x, z, r } = DIO.ilot, groupe = new THREE.Group(), sommet = 0.62;
  const prof = [[1.12, -1.4], [1.0, -0.5], [0.8, -0.1], [0.62, 0.2], [0.42, 0.45], [0.2, 0.58], [0.0, sommet]].map(([k, y]) => new THREE.Vector2(r * k, y));
  const geo = new THREE.LatheGeometry(prof, 28), pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), claire = new THREE.Color('#f1bd88'), humide = new THREE.Color('#c99568');
  for (let i = 0; i < pos.count; i++) { const k = THREE.MathUtils.clamp((pos.getY(i) + 0.3) / 0.9, 0, 1), c = humide.clone().lerp(claire, k), j = 0.95 + Math.random() * 0.08; pos.setX(i, pos.getX(i) * (0.94 + Math.random() * 0.1)); cols.set([c.r * j, c.g * j, c.b * j], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const mont = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); mont.castShadow = mont.receiveShadow = true; groupe.add(mont);
  const rocGeo = new THREE.IcosahedronGeometry(1, 1), mR = new THREE.MeshStandardMaterial({ color: '#8c7a76', roughness: 1, flatShading: true });
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + Math.random() * 0.6, rr = r * (0.58 + Math.random() * 0.2), s = 0.16 + Math.random() * 0.22, m = new THREE.Mesh(rocGeo, mR); m.scale.set(s * 1.3, s * 0.7, s); m.position.set(Math.cos(a) * rr, 0.0 + s * 0.15, Math.sin(a) * rr); m.rotation.y = Math.random() * 6; m.castShadow = true; groupe.add(m); }
  const verts = ['#5f8f45', '#7aa655', '#46773c'].map((h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.9, flatShading: true }));
  for (let i = 0; i < 3; i++) { const a = 1.4 + i * 2.1, m = new THREE.Mesh(rocGeo, verts[i % 3]); m.scale.set(0.34, 0.2, 0.3); m.position.set(Math.cos(a) * r * 0.36, sommet - 0.18, Math.sin(a) * r * 0.36); m.castShadow = true; groupe.add(m); }
  groupe.position.set(x, 0, z);
  return { groupe, sommet, x, z, r };
}
