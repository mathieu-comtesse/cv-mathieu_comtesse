import * as THREE from 'three';
import {PALETTES} from './palettes.js';

// Chaîne de rendu : scène 3D en basse résolution, puis un seul passage qui quantifie la luminance sur une rampe de
// 6 teintes avec un tramage Bayer 8x8, ajoute la pluie en espace écran et fait tourner la palette (color cycling).
export const BAYER_GLSL=/* glsl */`
float bayer8(vec2 fc){ivec2 p=ivec2(floor(fc));int x=p.x&7,y=p.y&7,xy=x^y;
  int v=((y&1)<<5)|((xy&1)<<4)|((y&2)<<2)|((xy&2)<<1)|((y&4)>>1)|((xy&4)>>2);return (float(v)+.5)/64.;}`;

const POST_VS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const POST_FS=/* glsl */`
precision highp float;precision highp int;
uniform sampler2D tScene;uniform float uTime,uGamma,uSpread,uRain,uFlash,uShelter,uAspect,uCycle;
uniform vec3 uRamp[24];uniform vec3 uRainCfg,uTint;uniform vec2 uShelterPos;
varying vec2 vUv;
${BAYER_GLSL}
float hash(float n){return fract(sin(n*127.1+.37)*43758.5453);}
float rainLayer(vec2 p,float slope,float speed,float dens,float len){
  float u=p.x+p.y*slope,c=floor(u),h=hash(c+slope*13.);
  if(h>dens)return 0.;
  float per=46.+hash(c*1.7)*72.,v=p.y+uTime*speed*(.8+h*.6)+h*400.,f=fract(v/per);
  return step(f,len/per);}
void main(){
  vec4 s=texture2D(tScene,vUv);
  float lum=dot(s.rgb,vec3(.299,.587,.114));
  lum+=uFlash*.55;
  vec3 c=s.rgb;float n=lum+.03;
  int ramp=0;
  if((c.b-max(c.r,c.g))/n>.2)ramp=2;
  else if((c.g-c.r)/n>.12&&(c.g-c.b)/n>.12)ramp=3;
  else if((c.r-c.b)/n>.16)ramp=1;
  float l=pow(clamp(lum,0.,1.),uGamma)*5.;
  float b=bayer8(gl_FragCoord.xy);
  int lvl=int(clamp(floor(l+(b-.5)*uSpread+.5),0.,5.));
  if(s.a<.75)lvl=int(mod(float(lvl)+floor(uTime*uCycle),6.));
  vec3 col=uRamp[ramp*6+lvl];
  if(uRain>0.){
    vec2 px=floor(gl_FragCoord.xy);
    float shel=uShelter*(1.-smoothstep(.16,.34,length((vUv-uShelterPos)*vec2(uAspect,1.))));
    float r=rainLayer(px,.34,uRainCfg.z*60.,uRainCfg.x*uRain,uRainCfg.y*30.)*.99
           +rainLayer(px+17.,.30,uRainCfg.z*95.,uRainCfg.x*.5*uRain,uRainCfg.y*46.)*1.5;
    r*=(1.-shel);
    if(r>0.)col=uRamp[r>1.?5:4]*(.8+.2*uFlash);
  }
  col*=uTint;
  gl_FragColor=vec4(col,1.);
}`;

export class Renderer{
  constructor(canvas){
    this.canvas=canvas;
    const gl=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
    gl.outputColorSpace=THREE.LinearSRGBColorSpace;gl.toneMapping=THREE.NoToneMapping;
    gl.shadowMap.enabled=true;gl.shadowMap.type=THREE.PCFShadowMap;gl.info.autoReset=false;
    this.gl=gl;this.targetH=300;this.rt=null;
    this.uniforms={tScene:{value:null},uTime:{value:0},uGamma:{value:.9},uSpread:{value:1},
      uRain:{value:0},uFlash:{value:0},uShelter:{value:0},uShelterPos:{value:new THREE.Vector2(.5,.5)},uAspect:{value:1.7},
      uCycle:{value:1.4},uRamp:{value:Array.from({length:24},()=>new THREE.Vector3())},
      uRainCfg:{value:new THREE.Vector3(1,.36,.9)},uTint:{value:new THREE.Vector3(1,1,1)}};
    const mat=new THREE.ShaderMaterial({vertexShader:POST_VS,fragmentShader:POST_FS,uniforms:this.uniforms,depthTest:false,depthWrite:false});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
    this.post=new THREE.Mesh(g,mat);this.post.frustumCulled=false;this.postScene=new THREE.Scene();this.postScene.add(this.post);
    this.postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.resize();
  }
  setTargetHeight(h){this.targetH=h;this.resize()}
  resize(){
    const W=innerWidth,H=innerHeight,ps=Math.max(1,Math.round(H/this.targetH)),w=Math.ceil(W/ps),h=Math.ceil(H/ps);
    this.w=w;this.h=h;this.ps=ps;
    this.gl.setPixelRatio(1);this.gl.setSize(w,h,false);
    this.canvas.style.width=w*ps+'px';this.canvas.style.height=h*ps+'px';
    this.rt?.dispose();
    this.rt=new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true,generateMipmaps:false,type:THREE.HalfFloatType});
    this.uniforms.tScene.value=this.rt.texture;this.uniforms.uAspect.value=w/h;
    this.aspect=w/h;
  }
  setPalette(id){
    const P=PALETTES[id];this.palette=P;
    P.ramps.flat().forEach((c,i)=>this.uniforms.uRamp.value[i].set(c[0],c[1],c[2]));
    this.uniforms.uGamma.value=P.gamma;this.uniforms.uSpread.value=P.spread;
    if(P.rain)this.uniforms.uRainCfg.value.set(...P.rain);
  }
  render(scene,camera,time){
    this.uniforms.uTime.value=time;
    const gl=this.gl;gl.info.reset();gl.setRenderTarget(this.rt);gl.render(scene,camera);
    gl.setRenderTarget(null);gl.render(this.postScene,this.postCam);
  }
}

// Matériau « tramé » : transparence par motif Bayer, sans alpha (le canal alpha sert de drapeau de cycle).
export function stipple({color=[1,1,1],density=.5,fadeY=0,cycle=false,side=THREE.DoubleSide,pulse=0}={}){
  return new THREE.ShaderMaterial({side,uniforms:{uColor:{value:new THREE.Vector3(...color)},uDensity:{value:density},uFadeY:{value:fadeY},uTime:{value:0},uPulse:{value:pulse}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;precision highp int;uniform vec3 uColor;uniform float uDensity,uFadeY,uTime,uPulse;varying vec2 vUv;${BAYER_GLSL}
      void main(){float d=uDensity*(1.-uFadeY*vUv.y)*(1.+uPulse*sin(uTime*3.));if(bayer8(gl_FragCoord.xy)>d)discard;gl_FragColor=vec4(uColor,${cycle?'.5':'1.'});}`});
}
