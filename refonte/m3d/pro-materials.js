// Matériaux industriels communs : métal usiné, brossé, fonte grenée, émail, laiton satiné, caoutchouc.
// Aucune texture à charger : le grain est calculé dans le shader à partir de la position locale (les pièces fusionnées n'ont pas d'UV).
// Le grain s'estompe de lui-même quand il devient plus fin qu'un pixel (pas de scintillement à distance).
// Un environnement de studio procédural (boîtes à lumière) donne aux métaux de vrais reflets, sans fichier HDR.
import * as THREE from 'three';

let env = null;
/** environnement de studio : ciel froid, deux boîtes à lumière, liseré de contre-jour, sol sombre (équirectangulaire, converti par three) */
export function studioEnv() {
  if (env) return env;
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cfd9ee'); g.addColorStop(.46, '#8f9bb6'); g.addColorStop(.5, '#59607a'); g.addColorStop(1, '#23262f');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const box = (cx, cy, w, h, a, blur) => { x.save(); x.filter = 'blur(' + blur + 'px)'; x.fillStyle = 'rgba(255,255,255,' + a + ')'; x.fillRect(cx - w / 2, cy - h / 2, w, h); x.restore(); };
  box(W * .30, H * .22, 190, 100, 1, 6);      // grande boîte à lumière principale, haut gauche
  box(W * .72, H * .34, 70, 190, .75, 5);     // bandeau vertical de remplissage
  box(W * .93, H * .30, 120, 22, .9, 3);      // liseré de contre-jour
  box(W * .52, H * .12, 300, 26, .55, 8);     // plafonnier
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return (env = t);
}

const GLSL_NOISE = `
varying vec3 vOP;
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float grain(vec3 p,vec3 st,float fw){float n=vn(p*st)*.65+vn(p*st*2.3)*.35;return mix(.5,n,1./(1.+fw*fw*4.));}
`;
/** ajoute à un matériau standard : grain de rugosité, variation de teinte et microrelief (bump par dérivées d'écran) */
export function micro(mat, { scale = 1, dir = null, rough = .2, tint = .05, bump = .01, ext = 1 } = {}) {
  const st = dir === 'x' ? [.04, 1, 1] : dir === 'y' ? [1, .04, 1] : dir === 'z' ? [1, 1, .04] : [1, 1, 1];
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uMs = { value: scale }; sh.uniforms.uMr = { value: rough }; sh.uniforms.uMt = { value: tint }; sh.uniforms.uMb = { value: bump };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP=position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uMs,uMr,uMt,uMb;\n' + GLSL_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
 vec3 mst=vec3(${st.map((v) => (v * ext * 3).toFixed(3)).join(',')})*uMs; float mfw=length(fwidth(vOP*mst));
 diffuseColor.rgb*=1.+(grain(vOP+7.3,mst*.35,mfw*.35)-.5)*uMt*2.;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
 float mg=grain(vOP,mst,mfw); roughnessFactor=clamp(roughnessFactor+(mg-.5)*uMr*2.,.04,1.);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
 { float hh=mg*uMb; vec3 dpx=dFdx(-vViewPosition),dpy=dFdy(-vViewPosition); float dhx=dFdx(hh),dhy=dFdy(hh);
   vec3 r1=cross(dpy,normal),r2=cross(normal,dpx); float det=dot(dpx,r1); vec3 gr=sign(det)*(dhx*r1+dhy*r2); normal=normalize(abs(det)*normal-gr); }`);
  };
  mat.customProgramCacheKey = () => 'micro' + st.join() + ext;
  return mat;
}

/** la bibliothèque : remplace en place les matériaux de makeMats() et ajoute émail, fonte noire, bakélite, ivoire, rouge émaillé */
export function industrial(M) {
  const e = studioEnv();
  const P = (color, roughness, metalness, envI, o = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, envMap: e, envMapIntensity: envI, ...o });
  Object.assign(M, {
    steel: micro(P('#c6cbd2', .34, .9, 1.1), { dir: 'x', rough: .16, tint: .04, bump: .004 }),             // acier rectifié, brossé dans le sens de l'axe
    steelDk: micro(P('#8c929c', .44, .85, .9), { rough: .14, tint: .05, bump: .004, scale: 1.4 }),         // acier phosphaté, usiné
    alu: micro(P('#d5d9df', .3, .92, 1.15), { dir: 'x', rough: .12, tint: .03, bump: .003 }),              // aluminium anodisé naturel, brossé
    brass: micro(P('#d2a94e', .27, 1, 1.2), { rough: .1, tint: .06, bump: .003, scale: 1.2 }),             // laiton satiné
    bronze: micro(P('#a9753d', .4, .88, .9), { rough: .14, tint: .08, bump: .004 }),
    cast: micro(P('#2a2c33', .58, .4, .55), { scale: 2.2, rough: .22, tint: .09, bump: .02 }),             // fonte grenée peinte noir
    iron: micro(P('#3b3f48', .52, .55, .6), { scale: 2, rough: .2, tint: .08, bump: .018 }),
    graphite: micro(P('#50555f', .62, .45, .5), { scale: 1.8, rough: .18, tint: .06, bump: .012 }),
    rubber: micro(P('#17181b', .88, 0, .08), { scale: 3, rough: .1, tint: .1, bump: .03 }),
    enamel: micro(P('#b4b6ae', .36, .08, .45), { scale: 2.6, rough: .06, tint: .02, bump: .006 }),          // émail au four, légère peau d'orange
    enamelDk: micro(P('#5d6a6e', .38, .1, .45), { scale: 2.6, rough: .06, tint: .02, bump: .006 }),
    castDk: micro(P('#202228', .6, .3, .45), { scale: 2.4, rough: .2, tint: .08, bump: .02 }),
    bakelite: P('#2a211c', .24, .02, .6), ivory: P('#efe6cf', .32, 0, .35), red: P('#c8372d', .3, .05, .5),
    glass: new THREE.MeshStandardMaterial({ color: '#b6d4e6', roughness: .04, metalness: .1, transparent: true, opacity: .24, depthWrite: false, envMap: e, envMapIntensity: 1.4 })
  });
  return M;
}
