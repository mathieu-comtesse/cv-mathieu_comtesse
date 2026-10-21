/* Symbole infini en particules (page blog).
 *
 * Reprise de la scène d'accueil du blog de Maxime Heckel (core/features/IndexSection : Scene.tsx, SceneMaterials.ts,
 * gpgpu/*.glsl, postprocessing/ascii.glsl), avec ses réglages : 256 × 256 particules, lemniscate d'échelle 2,5 et d'amplitude z 0,5,
 * jitter fixe, bruit de curl, point de 3,5 (rayon doux, fusion additive), caméra perspective de 75° placée en (0, 0, 4),
 * groupe décalé de 0,75 en hauteur et incliné de −0,065 π, fond bleu #0F53B7 éclairé par un projecteur, grille 50 × 120,
 * pixellisation de 4 px, 32 niveaux, décalage des canaux et bascule en demi-teinte vers le bas et la droite.
 * Source : https://github.com/MaximeHeckel/blog.maximeheckel.com — code sous licence MIT, © 2024 Maxime Heckel
 *   (texte complet : refonte/LICENSE-heckel-MIT.txt).
 * Bruit simplex 3D : « webgl-noise », © 2011 Ashima Arts, Ian McEwan, licence MIT (https://github.com/ashima/webgl-noise).
 * La scène est réécrite en three.js (sans React) pour ce site.
 */
import * as THREE from 'three';

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 snoiseVec3(vec3 x){
  float s=snoise(vec3(x));float s1=snoise(vec3(x.y-19.1,x.z+33.4,x.x+47.2));float s2=snoise(vec3(x.z+74.2,x.x-124.5,x.y+99.4));
  return vec3(s,s1,s2);
}
vec3 curlNoise(vec3 p){
  const float e=.1;vec3 dx=vec3(e,0.0,0.0);vec3 dy=vec3(0.0,e,0.0);vec3 dz=vec3(0.0,0.0,e);
  vec3 p_x0=snoiseVec3(p-dx);vec3 p_x1=snoiseVec3(p+dx);vec3 p_y0=snoiseVec3(p-dy);vec3 p_y1=snoiseVec3(p+dy);vec3 p_z0=snoiseVec3(p-dz);vec3 p_z1=snoiseVec3(p+dz);
  float x=p_y1.z-p_y0.z-p_z1.y+p_z0.y;float y=p_z1.x-p_z0.x-p_x1.z+p_x0.z;float z=p_x1.y-p_x0.y-p_y1.x+p_y0.x;
  const float divisor=1.0/(2.0*e);
  return normalize(vec3(x,y,z)*divisor);
}
float random(vec2 co){return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453123);}
`;

const POINTS_VS = /* glsl */ `
precision highp float;
uniform float uTime,uSize,pointSize;
varying float vDistance;
const float PI=3.141592653589793;
${NOISE}
void main(){
  vec2 vUv=position.xy;
  float particleIndex=floor(vUv.x*uSize)+floor(vUv.y*uSize)*uSize;
  float totalParticles=uSize*uSize;
  float t_base=particleIndex/totalParticles*2.0*PI;
  float t=t_base+uTime*2.5;
  float sinT=sin(t),cosT=cos(t);
  float scale=2.5;
  float x=(cosT/(1.0+sinT*sinT))*scale;
  float y=(sinT*cosT/(1.0+sinT*sinT))*scale;
  float z=(0.5*sinT)*scale;
  vec3 pos=vec3(x,y,z);
  float randomness=0.5;
  pos.x+=(random(vUv)-0.5)*randomness;
  pos.y+=(random(vUv+1.0)-0.5)*randomness;
  pos.z+=(random(vUv+2.0)-0.5)*randomness;
  pos+=curlNoise(pos*0.05+uTime*0.1)*0.25;
  vec4 mvPosition=modelViewMatrix*vec4(pos,1.0);
  gl_Position=projectionMatrix*mvPosition;
  vDistance=length(mvPosition.xyz);
  gl_PointSize=pointSize*3.0/length(mvPosition.xyz);
}`;
const POINTS_FS = /* glsl */ `
precision highp float;
varying float vDistance;
void main(){
  vec2 cxy=2.0*gl_PointCoord-1.0;
  float dist=length(cxy);
  if(dist>0.8)discard;
  float intensity=dist*1.8;
  gl_FragColor=vec4(vec3(1.0),(1.0-clamp(vDistance,0.0,0.75)*intensity));
}`;

/* post-traitement : pixellisation, 32 niveaux, décalage des canaux, demi-teinte vers le bas et la droite */
const POST_VS = 'varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}';
const POST_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;uniform sampler2D tScene;uniform vec2 uRes;uniform float uPixel;
vec3 saturateColor(vec3 rgb,float adjustment){const vec3 W=vec3(0.2125,0.7154,0.0721);vec3 intensity=vec3(dot(rgb,W));return mix(intensity,rgb,adjustment);}
const float COLOR_NUM=32.0;
const float distortionScale=0.025;
void main(){
  vec2 uv=vUv;
  vec2 normalizedPixelSize=uPixel/uRes;
  vec2 uvPixel=normalizedPixelSize*floor(uv/normalizedPixelSize);
  vec4 color=texture2D(tScene,uvPixel);
  color.r=floor(color.r*(COLOR_NUM-1.0)+0.5)/(COLOR_NUM-1.0);
  color.g=floor(color.g*(COLOR_NUM-1.0)+0.5)/(COLOR_NUM-1.0);
  color.b=floor(color.b*(COLOR_NUM-1.0)+0.5)/(COLOR_NUM-1.0);
  float ogColorR=texture2D(tScene,uv+vec2(0.01*distortionScale,0.0)).r;
  float ogColorG=texture2D(tScene,uv+vec2(0.0)).g;
  float ogColorB=texture2D(tScene,uv-vec2(0.02*distortionScale,0.0)).b;
  vec4 ogColor=vec4(ogColorR,ogColorG,ogColorB,1.0);
  float luma=dot(vec3(0.2126,0.7152,0.0722),color.rgb);
  vec2 cellUV=fract(uv/normalizedPixelSize);
  float radius=luma;
  float distanceFromCenter=distance(cellUV,vec2(0.5,0.5));
  float circleMask=smoothstep(radius,radius-0.001,distanceFromCenter);
  vec4 asciiColor=vec4(circleMask,circleMask,circleMask,1.0)*luma;
  ogColor*=1.5;
  ogColor.rgb=saturateColor(ogColor.rgb,1.35);
  float transition=smoothstep(0.0,0.35,uv.y-pow(uv.x,2.0));
  vec3 outc=mix(asciiColor,vec4(ogColor.rgb,1.0),transition).rgb;
  gl_FragColor=vec4(mix(pow(outc,vec3(0.41666))*1.055-vec3(0.055),outc*12.92,vec3(lessThanEqual(outc,vec3(0.0031308)))),1.0);
}`;

export function initInfinity(canvas) {
  const host = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);                       // DPR 1 comme l'original : la pixellisation vaut 4 px d'écran
  renderer.toneMapping = THREE.NoToneMapping;

  const SIZE = 256;
  const pos = new Float32Array(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) { const k = (y * SIZE + x) * 3; pos[k] = (x + .5) / SIZE; pos[k + 1] = (y + .5) / SIZE; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: POINTS_VS, fragmentShader: POINTS_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSize: { value: SIZE }, pointSize: { value: 3.5 } }
  });
  const points = new THREE.Points(geo, pointsMat);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.position.set(0, .75, 0); group.rotation.set(0, 0, -Math.PI * .065);
  group.add(points);

  const camera = new THREE.PerspectiveCamera(75, 1, .1, 1000);
  camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');          // le noir disparaît sur le plan : le bloc est fondu en « screen » (rf.css)
  const spot = new THREE.SpotLight('#FFFFFF', 15, 0, .25, 1, .25);
  spot.position.set(35, 30, 20);
  const target = new THREE.Object3D(); target.position.set(-5, 5, -10); spot.target = target;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: '#0F53B7' }));
  plane.position.set(0, 0, -10);
  const grid = new THREE.GridHelper(50, 120); grid.material = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .02 });   // comme <meshBasicMaterial> enfant du gridHelper dans l'original
  grid.rotation.x = -Math.PI / 2; grid.position.set(0, 0, -4.5);
  scene.add(spot, target, group);
  target.updateMatrixWorld();

  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const postMat = new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false, uniforms: { tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uPixel: { value: 4 } } });
  const post = new THREE.Mesh(quadGeo, postMat); post.frustumCulled = false;
  const postScene = new THREE.Scene(); postScene.add(post);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let visible = false;
  function resize() {
    const r = host.getBoundingClientRect(); const w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
    renderer.setSize(w, h, false);
    rt.setSize(w, h);
    postMat.uniforms.uRes.value.set(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const clock = new THREE.Clock();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = clock.getDelta();
    if (!visible || document.hidden) return;
    if (!still) t += Math.min(dt, .1);                // le temps de simulation cumule les secondes, comme l'original
    pointsMat.uniforms.uTime.value = t;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  // fixe sur le plan : il tourne avec la vue du plan quand les règles agissent
  const turn = (v) => { group.rotation.y = -v.dYaw; group.rotation.x = v.dPitch; };
  if (window.__rfTabView) turn(window.__rfTabView);
  window.addEventListener('rf-tabview', (ev) => turn(ev.detail));
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(host);
  new ResizeObserver(resize).observe(host);
  resize(); frame();
}
