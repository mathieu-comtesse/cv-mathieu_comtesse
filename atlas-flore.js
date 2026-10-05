/* ATLAS · FLORE. Palmiers, bananiers, cerisiers du Japon, feuillus, pins, buissons, herbes : géométrie et textures générées par code
 * (aucune image). Les cimes sont faites de « cartes de feuillage » (quads à texture de feuilles découpée par l'alpha) dont les
 * normales rayonnent depuis le centre de la touffe : l'éclairage est doux et volumique, comme dans les arbres de la vidéo de référence,
 * et non plat. Le vent plie les extrémités (attribut `vent` : 0 à la base, 1 à la pointe).
 *
 *   const F = creerFlore(THREE, ciel, carte)         ->  F.arbre('palmier', graine) -> { geo, materiaux }
 *   F.herbes(n, ...)   F.materiauFeuille(texture, opts)  F.textures */
import * as THREE from './three.module.js';
import { GLSL_BRUIT, GLSL_OMBRES } from './atlas-ciel.js';

export function aleatoire(graine) { let s = (graine * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function toile(w, h, dessiner) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); dessiner(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
const rnd = Math.random;
function feuille(x, cx, cy, L, W, ang, c1, c2) {
  x.save(); x.translate(cx, cy); x.rotate(ang);
  const g = x.createLinearGradient(0, -L / 2, 0, L / 2); g.addColorStop(0, c1); g.addColorStop(1, c2);
  x.fillStyle = g; x.beginPath(); x.moveTo(0, -L / 2); x.quadraticCurveTo(W, -L * .1, 0, L / 2); x.quadraticCurveTo(-W, -L * .1, 0, -L / 2); x.fill();
  x.strokeStyle = 'rgba(20,50,20,.35)'; x.lineWidth = Math.max(.6, W * .09); x.beginPath(); x.moveTo(0, -L / 2); x.lineTo(0, L / 2); x.stroke();
  x.restore();
}

export function creerTextures() {
  const T = {};
  /* touffe de feuillage : disque de feuilles, clair en haut, sombre en bas */
  const touffe = (nom, vert, taille, n) => { T[nom] = toile(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * w * .44, cx = w / 2 + Math.cos(a) * r, cy = h / 2 + Math.sin(a) * r * .94;
      const k = 1 - cy / h, c1 = vert[(rnd() * vert.length) | 0];
      feuille(x, cx, cy, taille * (.8 + rnd() * .5), taille * .3, rnd() * Math.PI * 2, c1, vert[((rnd() * vert.length) | 0)]);
    }
    // l'éclat de la couronne : liseré clair en haut
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,210,.16)'); g.addColorStop(.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,10,0,.34)');
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 0, w, h);
  }); };
  touffe('feuillu', ['#2f6a2a', '#3d8230', '#4f9a35', '#6bb040', '#27562a'], 30, 210);
  touffe('pin', ['#1d4a2c', '#2a5f35', '#34703a', '#1a3d27'], 24, 260);
  touffe('buisson', ['#3a8a30', '#55a43a', '#78bd45', '#2f7229'], 26, 170);
  T.sakura = toile(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * w * .45, cx = w / 2 + Math.cos(a) * r, cy = h / 2 + Math.sin(a) * r * .94;
      const p = ['#f6b5cf', '#f09ac0', '#fbd0e1', '#ee86b2', '#fde4ee'][(rnd() * 5) | 0];
      x.fillStyle = p; x.beginPath(); const s = 6 + rnd() * 9; for (let k = 0; k < 5; k++) { const th = k / 5 * Math.PI * 2 + rnd(); x.ellipse(cx + Math.cos(th) * s * .55, cy + Math.sin(th) * s * .55, s * .5, s * .42, th, 0, Math.PI * 2); } x.fill();
    }
    for (let i = 0; i < 40; i++) feuille(x, w / 2 + (rnd() - .5) * w * .8, h / 2 + (rnd() - .5) * h * .8, 22, 6, rnd() * 6.3, '#5a9a3a', '#3d7a2c');
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(120,40,70,.28)');
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  /* fronde de palmier : rachis courbe et folioles pennées */
  T.fronde = toile(128, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const t = i / 46, y = h * (.97 - t * .94), L = w * (.34 + .3 * Math.sin(Math.min(1, t * 1.3 + .05) * Math.PI)) * (1 - t * .45);
      for (const s of [-1, 1]) {
        const a = s * (1.0 - t * .55 + (rnd() - .5) * .1); x.save(); x.translate(w / 2, y); x.rotate(a);
        const g = x.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, '#5aa22b'); g.addColorStop(1, '#a6d24a');
        x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * .12, -L * .5, 0, -L); x.quadraticCurveTo(-L * .12, -L * .5, 0, 0); x.fill(); x.restore();
      }
    }
    x.strokeStyle = '#437a24'; x.lineWidth = 3; x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w / 2, 6); x.stroke();
  });
  /* feuille de bananier : large, nervurée, déchirée par le vent */
  T.banane = toile(256, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, '#3f8a2c'); g.addColorStop(.6, '#74b83a'); g.addColorStop(1, '#a2d04a');
    x.fillStyle = g; x.beginPath(); x.moveTo(w / 2, h); x.bezierCurveTo(w * -.15, h * .75, w * -.05, h * .2, w / 2, 0); x.bezierCurveTo(w * 1.05, h * .2, w * 1.15, h * .75, w / 2, h); x.fill();
    x.strokeStyle = 'rgba(45,100,30,.55)'; x.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) { const y = h * (.97 - i / 27 * .94); for (const s of [-1, 1]) { x.beginPath(); x.moveTo(w / 2, y); x.quadraticCurveTo(w / 2 + s * w * .2, y - h * .02, w / 2 + s * w * .46, y - h * .1); x.stroke(); } }
    x.strokeStyle = '#d6e29a'; x.lineWidth = 4; x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w / 2, 6); x.stroke();
    x.globalCompositeOperation = 'destination-out';                       // déchirures
    for (let i = 0; i < 9; i++) { const y = h * (.15 + rnd() * .75), s = rnd() < .5 ? -1 : 1; x.lineWidth = 2.5; x.strokeStyle = '#000'; x.beginPath(); x.moveTo(w / 2 + s * w * .1, y); x.lineTo(w / 2 + s * w * .6, y - h * .08 * rnd()); x.stroke(); }
  });
  T.herbe = toile(128, 128, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const bx = w * (.1 + rnd() * .8), tx = bx + (rnd() - .5) * 26, th = h * (.5 + rnd() * .5);
      const g = x.createLinearGradient(0, h, 0, h - th); g.addColorStop(0, '#2f6a28'); g.addColorStop(1, ['#9bcf4a', '#7ab640', '#b8d860'][(rnd() * 3) | 0]);
      x.fillStyle = g; x.beginPath(); x.moveTo(bx - 3, h); x.quadraticCurveTo(bx, h - th * .6, tx, h - th); x.quadraticCurveTo(bx + 1, h - th * .6, bx + 3, h); x.fill();
    }
  });
  T.herbe.wrapS = T.herbe.wrapT = THREE.ClampToEdgeWrapping;
  return T;
}

/* ---------------------------------------------------------------------------------------------------------- constructeur de géométrie */
class Geo {
  constructor() { this.P = []; this.N = []; this.U = []; this.C = []; this.V = []; this.I = []; this.groupes = []; }
  get n() { return this.P.length / 3; }
  sommet(p, n, u, c = [1, 1, 1], vent = 0) { this.P.push(p[0], p[1], p[2]); this.N.push(n[0], n[1], n[2]); this.U.push(u[0], u[1]); this.C.push(c[0], c[1], c[2]); this.V.push(vent); return this.n - 1; }
  tri(a, b, c) { this.I.push(a, b, c); }
  /* carte de feuillage : centre c, repère (droite r, haut u), taille (w, h), normale n */
  carte(c, r, u, w, h, n, col, vent) {
    const a = this.sommet([c[0] - r[0] * w / 2 - u[0] * h / 2, c[1] - r[1] * w / 2 - u[1] * h / 2, c[2] - r[2] * w / 2 - u[2] * h / 2], n, [0, 0], col, vent),
      b = this.sommet([c[0] + r[0] * w / 2 - u[0] * h / 2, c[1] + r[1] * w / 2 - u[1] * h / 2, c[2] + r[2] * w / 2 - u[2] * h / 2], n, [1, 0], col, vent),
      d = this.sommet([c[0] + r[0] * w / 2 + u[0] * h / 2, c[1] + r[1] * w / 2 + u[1] * h / 2, c[2] + r[2] * w / 2 + u[2] * h / 2], n, [1, 1], col, vent),
      e = this.sommet([c[0] - r[0] * w / 2 + u[0] * h / 2, c[1] - r[1] * w / 2 + u[1] * h / 2, c[2] - r[2] * w / 2 + u[2] * h / 2], n, [0, 1], col, vent);
    this.tri(a, b, d); this.tri(a, d, e);
  }
  /* tube le long d'une courbe (tableau de points), rayons r0 -> r1, anneaux de couleur alternée si bague */
  tube(pts, r0, r1, seg = 6, col = [.35, .25, .17], bague = 0, vent0 = 0, vent1 = 0, flare = 0, striure = 0) {
    const m = pts.length, base = this.n, up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), s = new THREE.Vector3(), b = new THREE.Vector3();
    const mousse = [.27, .36, .16], hash = (a, c) => { const x = Math.sin(a * 12.9898 + c * 78.233) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < m; i++) {
      const k = i / (m - 1), r = (r0 + (r1 - r0) * k) * (1 + flare * Math.exp(-k * 7.5));      // évasement du pied : le tronc s'élargit vers le sol et ses racines
      t.subVectors(pts[Math.min(m - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) s.crossVectors(Math.abs(t.y) > .95 ? new THREE.Vector3(1, 0, 0) : up, t); else s.addScaledVector(t, -s.dot(t));      // transport parallèle : pas de vrille entre anneaux
      s.normalize(); b.crossVectors(t, s).normalize();
      const f = bague && (i % bague === 0) ? .78 : 1, vert = Math.max(0, 1 - k * 9) * .42;       // base mousseuse, plus sombre
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * Math.PI * 2, nx = Math.cos(a) * s.x + Math.sin(a) * b.x, ny = Math.cos(a) * s.y + Math.sin(a) * b.y, nz = Math.cos(a) * s.z + Math.sin(a) * b.z;
        const v = f * (1 + striure * (hash(j % seg, 3) - .5) * 2) * (1 - vert * .3);                // stries d'écorce : une teinte par côte verticale
        this.sommet([pts[i].x + nx * r, pts[i].y + ny * r, pts[i].z + nz * r], [nx, ny, nz], [j / seg, k], [(col[0] * (1 - vert) + mousse[0] * vert) * v, (col[1] * (1 - vert) + mousse[1] * vert) * v, (col[2] * (1 - vert) + mousse[2] * vert) * v], vent0 + (vent1 - vent0) * k);
      }
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < seg; j++) { const a = base + i * (seg + 1) + j, b2 = a + 1, c = a + seg + 1, d = c + 1; this.tri(a, c, b2); this.tri(b2, c, d); }
  }
  /* contreforts : racines apparentes qui partent du tronc, s'étalent à la surface et plongent dans le sol */
  racines(rng, n, r, col, hauteur = .34, portee = 3.2) {
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + (rng() - .5) * .7, L = r * portee * (.75 + rng() * .5), cx = Math.cos(a), cz = Math.sin(a), lat = (rng() - .5) * r * .9;
      const prof = [[.4 * r, hauteur * r, 0], [1.2 * r, .13 * r, .2], [L * .5, .04 * r, .6], [L * .78, -.03 * r, .85], [L, -.14 * r, 1]];
      const pts = prof.map(([d, y, w]) => new THREE.Vector3(cx * d - cz * lat * w, y, cz * d + cx * lat * w));
      this.tube(pts, r * .38, r * .07, 5, col, 0, 0, 0, 0, .12);
    }
  }
  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3)); g.setAttribute('vent', new THREE.Float32BufferAttribute(this.V, 1));
    g.setIndex(this.I); return g;
  }
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const hexc = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

export function creerFlore(ciel, textures) {
  const T = textures || creerTextures();
  const vent = { uTemps: { value: 0 }, uForce: { value: 1 } };

  /* ---------------------------------------------------------------- matériaux
     feuillage : carte alpha, normale non retournée sur la face arrière (la normale sphérique reste cohérente), vent, ombres de nuages,
     et un peu de translucidité (le contre-jour éclaire les feuilles). */
  function matFeuille(carte, o = {}) {
    const m = new THREE.MeshStandardMaterial({ map: carte, vertexColors: true, alphaTest: o.alpha ?? .46, side: THREE.DoubleSide, roughness: o.rugosite ?? .62, metalness: 0, envMapIntensity: o.env ?? .5, alphaToCoverage: true });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTemps = vent.uTemps; sh.uniforms.uForce = vent.uForce; sh.uniforms.uNu = ciel.uniformes.uNu; sh.uniforms.uSunDir = ciel.uniformes.uSunDir; sh.uniforms.uNuit = ciel.uniformes.uNuit;
      sh.vertexShader = `attribute float vent; uniform float uTemps, uForce; varying vec3 vWp;\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          mat4 mi = mat4(1.);
          #ifdef USE_INSTANCING
            mi = instanceMatrix;
          #endif
          vec4 w0 = modelMatrix * mi * vec4(transformed, 1.);
          float ph = w0.x * .7 + w0.z * .9;
          vec3 sw = vec3(sin(uTemps * 1.5 + ph) * .9 + sin(uTemps * 3.1 + ph * 2.3) * .35, sin(uTemps * 2.2 + ph * 1.7) * .2, cos(uTemps * 1.3 + ph * 1.1) * .8) * vent * vent * .1 * uForce * ${o.souplesse ?? '1.'};
          transformed += (inverse(mat3(modelMatrix * mi)) * sw);
          vWp = (modelMatrix * mi * vec4(transformed, 1.)).xyz;
        }`);
      sh.fragmentShader = `uniform vec3 uSunDir; uniform float uNuit; varying vec3 vWp; ${GLSL_OMBRES}\n` + sh.fragmentShader
        .replace('#include <normal_fragment_begin>', `vec3 normal = normalize(vNormal); vec3 nonPerturbedNormal = normal;`)
        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
          float sd_ = ombreNuages(vWp);
          reflectedLight.directDiffuse *= (1. - sd_ * .62);
          { vec3 vd = normalize(vViewPosition); vec3 Ls = normalize((viewMatrix * vec4(uSunDir, 0.)).xyz);
            float tr = pow(max(dot(vd, Ls), 0.), 2.5) * max(dot(-normal, Ls) * .5 + .5, 0.);
            reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1., .95, .55) * tr * ${o.trans ?? '.55'} * (1. - sd_ * .6) * (1. - uNuit); }`);
    };
    m.customProgramCacheKey = () => 'feuille' + (o.souplesse || '') + (o.trans || '');
    return m;
  }
  const matEcorce = () => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0, envMapIntensity: .35 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uNu = ciel.uniformes.uNu; sh.uniforms.uSunDir = ciel.uniformes.uSunDir;
      sh.vertexShader = `varying vec3 vWp;\n` + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        mat4 mi = mat4(1.);
        #ifdef USE_INSTANCING
          mi = instanceMatrix;
        #endif
        vWp = (modelMatrix * mi * vec4(transformed, 1.)).xyz;`);
      sh.fragmentShader = `uniform vec3 uSunDir; varying vec3 vWp; ${GLSL_OMBRES}\n` + sh.fragmentShader.replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.directDiffuse *= (1. - ombreNuages(vWp) * .62);`);
    }; m.customProgramCacheKey = () => 'ecorce'; return m; };

  const mats = {
    feuillu: matFeuille(T.feuillu, { trans: '.5' }), pin: matFeuille(T.pin, { trans: '.3' }), buisson: matFeuille(T.buisson, { trans: '.55' }),
    sakura: matFeuille(T.sakura, { trans: '.7', alpha: .4 }), fronde: matFeuille(T.fronde, { rugosite: .38, env: .9, trans: '.45', alpha: .5, souplesse: '1.8' }),
    banane: matFeuille(T.banane, { rugosite: .42, env: .8, trans: '.6', alpha: .5, souplesse: '1.4' }), herbe: matFeuille(T.herbe, { rugosite: .85, trans: '.35', alpha: .5, souplesse: '2.2' }),
    ecorce: matEcorce(),
  };

  /* ---------------------------------------------------------------- arbres : deux sous-géométries (écorce, feuillage) */
  const cimeBlob = (g, rng, centre, rayon, nCartes, tailleCarte, col1, col2) => {
    for (let i = 0; i < nCartes; i++) {
      let d; do { d = V3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1); } while (d.lengthSq() > 1 || d.lengthSq() < .05);
      d.y *= .8; const dist = Math.cbrt(d.length()) * rayon, dir = d.clone().normalize();
      const c = centre.clone().addScaledVector(dir, dist);
      const k = Math.min(1, Math.max(0, (dir.y + 1) / 2));
      const tilt = V3(rng() - .5, rng() - .5, rng() - .5);
      const nrm = dir.clone().addScaledVector(V3(0, .35, 0), 1).add(tilt.multiplyScalar(.25)).normalize();
      const r = V3().crossVectors(V3(0, 1, 0), nrm); if (r.lengthSq() < 1e-4) r.set(1, 0, 0); r.normalize();
      const u = V3().crossVectors(nrm, r).normalize();
      const rot = rng() * Math.PI * 2, cr = Math.cos(rot), sr = Math.sin(rot);
      const rr = r.clone().multiplyScalar(cr).addScaledVector(u, sr), uu = u.clone().multiplyScalar(cr).addScaledVector(r, -sr);
      const s = tailleCarte * (.75 + rng() * .5), col = mixc(col1, col2, k * .8 + rng() * .25);
      g.carte([c.x, c.y, c.z], [rr.x, rr.y, rr.z], [uu.x, uu.y, uu.z], s, s, [nrm.x, nrm.y, nrm.z], col, .35 + dist / rayon * .65);
    }
  };
  const courbeTronc = (rng, h, courbe, base = V3(0, 0, 0), n = 9, dirFixe = null) => {
    const dir = dirFixe ?? rng() * Math.PI * 2, pts = [V3(base.x, base.y - .16, base.z)];                       // le pied s'enfonce dans le sol
    for (let i = 0; i < n; i++) { const t = Math.pow(i / (n - 1), 1.25); pts.push(V3(base.x + Math.cos(dir) * courbe * t * t * h, base.y + h * t, base.z + Math.sin(dir) * courbe * t * t * h)); }
    return { pts, dir };
  };
  const batir = {
    feuillu(seed) {
      const rng = aleatoire(seed), gb = new Geo(), gf = new Geo(), h = 2.3 + rng() * 1.1, { pts } = courbeTronc(rng, h, .25);
      gb.tube(pts, .17, .06, 8, hexc('#5c4332'), 0, 0, .1, .85, .14); gb.racines(rng, 4 + (rng() * 2 | 0), .17, hexc('#52392b'));
      const top = pts[pts.length - 1], nb = 3 + (rng() * 3 | 0);
      for (let b = 0; b < nb; b++) { const a = rng() * 6.3, d = b ? .55 + rng() * .5 : 0; cimeBlob(gf, rng, V3(top.x + Math.cos(a) * d, top.y - .1 + rng() * .7 + (b ? -.15 : .25), top.z + Math.sin(a) * d), .95 + rng() * .45, 34, 1.15, hexc('#2f6a2a'), hexc('#8cc646')); }
      return [gb, gf, 'feuillu'];
    },
    pin(seed) {
      const rng = aleatoire(seed), gb = new Geo(), gf = new Geo(), h = 3.0 + rng() * 1.3, pts = [V3(0, -.16, 0), ...Array.from({ length: 7 }, (_, i) => V3(0, h * Math.pow(i / 6, 1.2), 0))];
      gb.tube(pts, .13, .03, 8, hexc('#4a3626'), 0, 0, 0, .8, .16); gb.racines(rng, 5, .13, hexc('#43301f'));
      const etages = 6;
      for (let e = 0; e < etages; e++) { const t = e / (etages - 1), y = h * (.28 + t * .68), r = (1 - t) * .95 + .18; cimeBlob(gf, rng, V3(0, y, 0), r, 20 - e * 2, .9 - t * .25, hexc('#1c4a2b'), hexc('#4a8a3c')); }
      return [gb, gf, 'pin'];
    },
    sakura(seed) {
      const rng = aleatoire(seed), gb = new Geo(), gf = new Geo(), h = 1.9 + rng() * .8, { pts } = courbeTronc(rng, h, .5);
      gb.tube(pts, .14, .05, 8, hexc('#4b382c'), 0, 0, .1, .8, .12); gb.racines(rng, 4, .14, hexc('#47342a'));
      const top = pts[pts.length - 1];
      for (let b = 0; b < 4; b++) { const a = rng() * 6.3, d = b ? .5 + rng() * .5 : 0; cimeBlob(gf, rng, V3(top.x + Math.cos(a) * d, top.y + (rng() - .3) * .4, top.z + Math.sin(a) * d), .85 + rng() * .35, 36, 1.0, hexc('#d9709f'), hexc('#fbd2e2')); }
      return [gb, gf, 'sakura'];
    },
    buisson(seed) {
      const rng = aleatoire(seed), gf = new Geo();
      for (let b = 0; b < 3; b++) cimeBlob(gf, rng, V3((rng() - .5) * .5, .28 + rng() * .1, (rng() - .5) * .5), .42 + rng() * .15, 16, .62, hexc('#2f7a2c'), hexc('#7cc046'));
      return [null, gf, 'buisson'];
    },
    palmier(seed) {
      const rng = aleatoire(seed), gb = new Geo(), gf = new Geo(), h = 2.6 + rng() * 1.5, { pts, dir } = courbeTronc(rng, h, .5 + rng() * .7, V3(0, 0, 0), 12, 0);
      gb.tube(pts, .12, .075, 9, hexc('#8d7a62'), 1, 0, .25, 1.0, .06); gb.racines(rng, 7, .1, hexc('#7d6b55'), .22, 1.9);
      const top = pts[pts.length - 1], nf = 11 + (rng() * 3 | 0);
      for (let f = 0; f < nf; f++) {
        const a = f / nf * Math.PI * 2 + rng() * .35, hautf = .7 + rng() * .5, L = 1.55 + rng() * .5, relev = .85 - (f % 3) * .22 + rng() * .1;
        const cx = Math.cos(a), cz = Math.sin(a), seg = 8, W = .52 + rng() * .12;
        const col = mixc(hexc('#79b83a'), hexc('#a9d24d'), rng());
        const base = gf.n;
        for (let i = 0; i <= seg; i++) {
          const t = i / seg, out = L * t, y = top.y + Math.sin(t * Math.PI * .9) * relev * L * .55 - t * t * L * .55 * (1 - relev * .3);
          const p = V3(top.x + cx * out, y, top.z + cz * out);
          const w = W * (.25 + Math.sin(Math.min(1, t * 1.15) * Math.PI) * .75);
          const nrm = [-cx * .15 * t, 1, -cz * .15 * t];
          for (const s of [-1, 1]) gf.sommet([p.x - cz * w * s * .5, p.y - .0, p.z + cx * w * s * .5], nrm, [s > 0 ? 1 : 0, t], col, t);
        }
        for (let i = 0; i < seg; i++) { const a0 = base + i * 2; gf.tri(a0, a0 + 1, a0 + 2); gf.tri(a0 + 1, a0 + 3, a0 + 2); }
      }
      return [gb, gf, 'fronde'];
    },
    bananier(seed) {
      const rng = aleatoire(seed), gb = new Geo(), gf = new Geo(), nf = 6 + (rng() * 3 | 0);
      gb.tube([V3(0, -.1, 0), V3(0, 0, 0), V3(0, .5, 0), V3(0, 1.0, 0)], .08, .05, 8, hexc('#8cb256'), 0, 0, 0, .5, .05);
      for (let f = 0; f < nf; f++) {
        const a = f / nf * Math.PI * 2 + rng() * .5, L = 1.5 + rng() * .8, cx = Math.cos(a), cz = Math.sin(a), seg = 7, relev = .5 + rng() * .5, W = .5 + rng() * .15;
        const base = gf.n, col = mixc(hexc('#6fb338'), hexc('#a4d44c'), rng());
        for (let i = 0; i <= seg; i++) {
          const t = i / seg, out = L * t * .85, y = .9 + Math.sin(t * 1.6) * relev * L * .7 - t * t * L * .55;
          const nrm = [-cx * .2, 1, -cz * .2];
          for (const s of [-1, 1]) gf.sommet([cx * out - cz * W * s * .5, y, cz * out + cx * W * s * .5], nrm, [s > 0 ? 1 : 0, t], col, t);
        }
        for (let i = 0; i < seg; i++) { const a0 = base + i * 2; gf.tri(a0, a0 + 1, a0 + 2); gf.tri(a0 + 1, a0 + 3, a0 + 2); }
      }
      return [gb, gf, 'banane'];
    },
  };
  const cache = new Map();
  /* arbre(type, graine) -> { ecorce: BufferGeometry|null, feuillage: BufferGeometry, mats: {ecorce, feuillage} } */
  const arbre = (type, graine) => {
    const k = type + ':' + graine; if (cache.has(k)) return cache.get(k);
    const [gb, gf, mf] = batir[type](graine);
    const r = { ecorce: gb && gb.n ? gb.geometrie() : null, feuillage: gf.geometrie(), matEcorce: mats.ecorce, matFeuille: mats[mf], type };
    cache.set(k, r); return r;
  };
  /* touffes d'herbe : deux quads croisés ; on instancie ce motif */
  const herbes = () => {
    const g = new Geo(); const n = [0, 1, 0];
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI, c = Math.cos(a), s = Math.sin(a); g.carte([0, .17, 0], [c, 0, s], [0, 1, 0], .42, .34, n, [1, 1, 1], 1); }
    // le vent agit sur le haut seulement : on corrige la pondération (base 0)
    for (let i = 0; i < g.V.length; i++) g.V[i] = (i % 4 >= 2) ? 1 : 0;
    return g.geometrie();
  };
  return { arbre, herbes, mats, textures: T, vent, matFeuille, Geo };
}
