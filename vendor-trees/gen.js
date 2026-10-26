(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,362503,e=>{"use strict";var t=e.i(545028),a=e.i(802171),o=e.i(714696);let l={blossom:0,maple:1,needles:2,fan:3,dab:4,leaf:5},r=[.35,.12,0,.1,1,.4],n=o.SPECIES.map(e=>e[0]),i=o.SEASONS.map(e=>e[0]),u={};for(let e of o.KNOBS)u[e.key]=e,"color"===e.type&&e.dark&&(u[e.key+"Dark"]={...e,key:e.key+"Dark"});function s(e){let t={};for(let a in e||{}){let o=u[a],l=e[a];if(o&&null!=l)if("float"===o.type){let e=Number(l);Number.isFinite(e)&&(t[a]=Math.min(o.max,Math.max(o.min,e)))}else"toggle"===o.type?!0===l||""===l||"true"===l?t[a]=!0:(!1===l||"false"===l)&&(t[a]=!1):"select"===o.type?o.options.some(e=>e[0]===String(l))&&(t[a]=String(l)):"text"===o.type?t[a]=String(l).replace(/[\r\n\t]+/g," ").slice(0,o.max||60):"color"===o.type&&/^#[0-9a-f]{6}$/i.test(String(l))&&(t[a]=String(l).toLowerCase())}return t}let d=new Set(["seed","size","spread","gnarl","lean","density","leafSize"]);function c(e){return function(){e|=0;let t=Math.imul((e=e+0x6d2b79f5|0)^e>>>15,1|e);return(((t=t+Math.imul(t^t>>>7,61|t)^t)^t>>>14)>>>0)/0x100000000}}function v(e){let a=parseInt(e.slice(1),16);return new t.Vector3((a>>16&255)/255,(a>>8&255)/255,(255&a)/255)}let f=(e=0,a=0,o=0)=>new t.Vector3(e,a,o);function h(e){return(.9>Math.abs(e.y)?f(0,1,0):f(1,0,0)).clone().cross(e).normalize()}function p(e,t,a){return e.clone().applyAxisAngle(t,a)}function m(e,t,a){let o=p(h(e),e,a);return p(e,o,t).normalize()}class w{constructor(e){this.rng=e,this.branches=[],this.leaves=[],this.clusters=[]}r(e=0,t=1){return e+(t-e)*this.rng()}gauss(){let e=0;for(let t=0;t<4;t++)e+=this.rng();return(e-2)/.577}sphere(){let e=f(this.gauss(),this.gauss(),this.gauss());return 1e-6>e.lengthSq()?f(0,1,0):e.normalize()}walk(e){let{origin:t,dir:a,length:o,r0:l,r1:r,parent:n=null,s0:i=0,depth:u=0,arr0:s=0}=e,d=Math.max(3,Math.round(e.steps||o/.16)),c=[t.clone()],v=[l],f=a.clone().normalize(),m=t.clone(),w=o/d,g=h(f);for(let t=1;t<=d;t++){let a=t/d;e.bend&&(f=e.bend(f,a,this).normalize()),e.wander&&(g=p(g,f,.9*this.r(-1,1)).normalize(),f.addScaledVector(g,e.wander*this.r(-.6,1)).normalize()),e.gravity&&(f.y-=e.gravity*a),e.up&&(f.y+=e.up*(1-a)),f.normalize(),m=m.clone().addScaledVector(f,w),c.push(m);let o=l+(r-l)*Math.pow(a,e.taper||1);v.push(o)}if(e.flare)for(let t=0;t<v.length;t++)v[t]*=1+e.flare*Math.exp(-(t/d*9));let x=[0];for(let e=1;e<c.length;e++)x.push(x[e-1]+c[e].distanceTo(c[e-1]));let y={pts:c,rad:v,lens:x,length:x[x.length-1],parent:n,depth:u,arr0:s,children:[]};return y.arr=x.map(e=>s+e),this.branches.push(y),n&&n.children.push(y),y}at(e,t){let a=t*e.length,o=1;for(;o<e.lens.length-1&&e.lens[o]<a;)o++;let l=(a-e.lens[o-1])/Math.max(1e-6,e.lens[o]-e.lens[o-1]),r=e.pts[o-1].clone().lerp(e.pts[o],l),n=e.pts[o].clone().sub(e.pts[o-1]).normalize();return{p:r,d:n,r:e.rad[o-1]+(e.rad[o]-e.rad[o-1])*l,arr:e.arr[o-1]+(e.arr[o]-e.arr[o-1])*l}}child(e,t,a){let o=this.at(e,t);return this.walk({...a,origin:o.p,parent:e,depth:e.depth+1,arr0:o.arr+.05,r0:Math.min(a.r0,.92*o.r)})}cluster(e,t,a,o,l,r,n={}){let i={center:e.clone(),rx:t,ry:a,rz:o,arr:r};this.clusters.push(i),l=Math.round(2.4*l*Math.max(.5,(t*a+a*o+t*o)/3/.3));for(let i=0;i<l;i++){let l=this.sphere(),i=Math.pow(this.rng(),n.core||.33),u=f(l.x*t*i,l.y*a*i,l.z*o*i);n.flatBottom&&u.y<-(.35*a)&&(u.y=-(.35*a)-(u.y+.35*a)*.15);let s=e.clone().add(u),d=f(l.x/t,l.y/a,l.z/o).normalize();this.leaves.push({p:s,n:d,size:this.r(.65,1.4),rot:this.r(0,2*Math.PI),rnd:this.rng(),arr:r+this.r(0,.35),ao:i,c:e})}}along(e,t,a,o,l){for(let l=t*e.length;l<e.length;l+=a*this.r(.6,1.4)){let t=this.at(e,l/e.length);for(let e=0;e<4;e++){let e=this.sphere(),a=t.p.clone().addScaledVector(e,o*this.r(.2,1)),l=e.clone().multiplyScalar(.6).add(f(0,.2,0)).normalize();this.leaves.push({p:a,n:l,size:this.r(.7,1.15),rot:this.r(0,2*Math.PI),rnd:this.rng(),arr:t.arr+this.r(0,.3),ao:.8,c:t.p.clone()})}}}}function g(e){return{p:e.pts[e.pts.length-1],arr:e.arr[e.arr.length-1],d:e.pts[e.pts.length-1].clone().sub(e.pts[e.pts.length-2]).normalize()}}let x={cherry(e,t){let a=t.size,o=t.spread,l=t.gnarl,r=e.walk({origin:f(0,0,0),dir:f(.18*t.lean+e.r(-.06,.06),1,e.r(-.06,.06)),length:1.45*a,r0:.17*a,r1:.12*a,wander:.05*l,flare:.5,steps:7}),n=4+ +(.5>e.rng()),i=e.r(0,2*Math.PI);for(let u=0;u<n;u++){let s=i+u/n*Math.PI*2+e.r(-.3,.3),d=m(g(r).d,e.r(.45,.9),s),c=e.r(2,2.6)*a*(.85+.15*o),v=e.child(r,e.r(.88,1),{dir:d,length:c,r0:.11*a,r1:.035*a,wander:.09*l,taper:.8,bend:(e,t)=>{let a=f(e.x,0,e.z).normalize();return e.addScaledVector(a,.06*o).add(f(0,t>.55?-.07:.02,0))}}),h=3+Math.floor(e.r(0,2));for(let o=0;o<h;o++){let r=.38+o/h*.6+e.r(-.05,.05),n=e.at(v,Math.min(r,.98)),i=e.child(v,Math.min(r,.98),{dir:m(n.d,e.r(.45,.9),e.r(0,6.28)),length:c*e.r(.38,.55),r0:.05*a,r1:.015*a,wander:.14*l,gravity:.04}),u=2+Math.floor(e.r(0,2));for(let o=0;o<u;o++){let o=g(e.child(i,e.r(.45,.95),{dir:m(i.pts[1].clone().sub(i.pts[0]).normalize(),e.r(.5,1),e.r(0,6.28)),length:c*e.r(.18,.28),r0:.025*a,r1:.009*a,wander:.2*l,steps:3})),r=e.r(.55,.78)*a*t.leafScale;e.cluster(o.p.clone().add(f(0,e.r(-.1,.35)*a,0)),1.05*r,.82*r,1.05*r,Math.round(54*t.density),o.arr)}let s=g(i),d=e.r(.62,.85)*a*t.leafScale;e.cluster(s.p,1.1*d,.85*d,1.1*d,Math.round(54*t.density),s.arr)}let p=g(v),w=.95*a*t.leafScale;e.cluster(p.p,1.1*w,.8*w,1.1*w,Math.round(54*t.density),p.arr);let x=e.at(v,.72);e.cluster(x.p.clone().add(f(0,.35*a,0)),.9*w,.7*w,.9*w,Math.round(40*t.density),x.arr)}},maple(e,t){let a=t.size,o=t.spread,l=t.gnarl,r=2+ +(.6>e.rng()),n=e.r(0,2*Math.PI);for(let i=0;i<r;i++){let u=n+i/r*Math.PI*2,s=f(.2*t.lean,0,0),d=m(f(0,1,0).add(s).normalize(),e.r(.12,.38)*(.7+.3*o),u),c=e.r(2.6,3)*a,v=e.walk({origin:f(e.r(-.06,.06),0,e.r(-.06,.06)),dir:d,length:c,r0:(.13-.015*i)*a,r1:.045*a,wander:.16*l,flare:.5,steps:12});for(let r=0;r<4;r++){let n=.35+r/3*.62;e.at(v,Math.min(n,.99));let i=2+ +(.5>e.rng());for(let r=0;r<i;r++){let i=e.r(1,1.35),s=m(f(0,1,0),i,u+e.r(-1.3,1.3)+2.1*r),d=e.r(.9,1.5)*a*o*(1.1-.45*n),c=e.child(v,Math.min(n,.99),{dir:s,length:d,r0:.05*a,r1:.012*a,wander:.12*l,up:.05,steps:6});for(let o=0;o<1;o++){let o=e.r(.45,.75),l=e.at(c,o),r=e.r(.42,.6)*a*t.leafScale;e.cluster(l.p.clone().add(f(0,.06,0)),1.3*r,.3*r,1.3*r,Math.round(46*t.density),l.arr,{core:.6,flatBottom:!0})}let h=g(c),p=e.r(.5,.68)*a*t.leafScale;e.cluster(h.p.clone().add(f(0,.06,0)),1.35*p,.32*p,1.35*p,Math.round(56*t.density),h.arr,{core:.6,flatBottom:!0})}}let h=g(v),p=.6*a*t.leafScale;e.cluster(h.p,1.2*p,.55*p,1.2*p,Math.round(60*t.density),h.arr,{core:.5})}},pine(e,t){let a=t.size,o=t.spread,l=t.gnarl,r=.5>e.rng()?-1:1,n=f(0,0,1),i=e.walk({origin:f(0,0,0),dir:p(f(0,1,0),n,r*(.42+.18*t.lean)*(.6+.4*l)),length:3.5*a,r0:.22*a,r1:.07*a,flare:.6,steps:16,wander:.04*l,bend:(e,t)=>p(e,n,-r*(t<.55?.085:-.05)*(.5+.5*l))}),u=e.r(0,6.28);for(let r=0;r<6;r++){let n=.36+r/5*.56+e.r(-.03,.03);u+=Math.PI*e.r(.62,.9);let s=(1.85-1.35*n)*a*o*e.r(.85,1.1),d=f(Math.cos(u),e.r(-.12,.05),Math.sin(u)).normalize(),c=e.child(i,n,{dir:d,length:s,r0:.065*a,r1:.03*a,steps:7,wander:.22*l,bend:(e,t)=>e.add(f(0,t>.6?.07:-.02,0))}),v=g(c),h=(.55+.35*s)*t.leafScale;if(e.cluster(v.p.clone().add(f(0,.12*a,0)),h,.27*a*t.leafScale,.82*h,Math.round((70+60*s)*t.density),v.arr,{core:.55,flatBottom:!0}),s>.9*a){let o=e.at(c,.55),l=g(e.child(c,.55,{dir:m(o.d,.7,e.r(0,6.28)).setY(.05).normalize(),length:.35*s,r0:.03*a,r1:.015*a,steps:3,wander:.2}));e.cluster(l.p.clone().add(f(0,.1*a,0)),.6*h,.2*a*t.leafScale,.5*h,Math.round(40*t.density),l.arr,{core:.55,flatBottom:!0})}}let s=g(i);e.cluster(s.p.clone().add(f(0,.08,0)),.72*a*t.leafScale,.42*a*t.leafScale,.66*a*t.leafScale,Math.round(110*t.density),s.arr,{core:.5,flatBottom:!0})},weeping(e,t){let a=t.size,o=t.spread,l=t.gnarl,r=e.walk({origin:f(0,0,0),dir:f(.15*t.lean+e.r(-.04,.04),1,e.r(-.04,.04)),length:2.2*a,r0:.22*a,r1:.15*a,flare:.5,wander:.05*l,steps:9}),n=e.r(0,6.28);for(let i=0;i<5;i++){let u=n+i/5*Math.PI*2+e.r(-.3,.3),s=e.r(1.4,1.9)*a*o,d=e.child(r,e.r(.8,1),{dir:m(f(0,1,0),e.r(.35,.65),u),length:s,r0:.11*a,r1:.035*a,wander:.1*l,bend:(e,t)=>{let a=f(e.x,0,e.z).normalize();return e.addScaledVector(a,.1).add(f(0,-.11*t,0))}}),c=Math.round(9*(.6+.4*t.density));for(let o=0;o<c;o++){let l=.25+o/c*.75,r=e.at(d,Math.min(.99,l)),n=f(r.d.x,0,r.d.z).normalize(),i=n.clone().multiplyScalar(e.r(.5,1)).add(f(e.r(-.4,.4),e.r(.2,.7),e.r(-.4,.4))).normalize(),u=Math.max(.8,r.p.y-e.r(.25,.9))*e.r(.9,1.15)+.4,s=e.child(d,Math.min(.99,l),{dir:i,length:u,r0:.022*a,r1:.005*a,steps:Math.round(u/.12),wander:.05,bend:(e,t)=>e.add(f(0,-.33,0)).addScaledVector(n,.015)});e.along(s,.12,.085/Math.sqrt(t.density),.11*t.leafScale,0)}let v=g(d);e.cluster(v.p,.45*a*t.leafScale,.35*a*t.leafScale,.45*a*t.leafScale,Math.round(40*t.density),v.arr)}let i=g(r);e.cluster(i.p.clone().add(f(0,.25,0)),.7*a*t.leafScale,.45*a*t.leafScale,.7*a*t.leafScale,Math.round(70*t.density),i.arr)},ginkgo(e,t){let a=t.size,o=t.spread,l=t.gnarl,r=e.walk({origin:f(0,0,0),dir:f(.12*t.lean+e.r(-.03,.03),1,e.r(-.03,.03)),length:4.6*a,r0:.21*a,r1:.04*a,flare:.45,wander:.03*l,steps:18}),n=e.r(0,6.28);for(let i=0;i<13;i++){let u=.2+i/13*.76;for(let i=0;i<2;i++){n+=2.39996;let i=(2.1*Math.pow(1-u,.7)+.4)*a*o*e.r(.8,1.1),s=e.child(r,u,{dir:m(f(0,1,0),e.r(.7,1),n),length:i,r0:.05*a,r1:.014*a,steps:6,wander:.08*l,up:.04}),d=Math.max(2,Math.round(3.2*i));for(let o=0;o<d;o++){let l=.3+o/d*.7,r=e.at(s,Math.min(.99,l)),n=e.r(.36,.5)*a*t.leafScale;e.cluster(r.p.clone().add(f(0,.08,0)),n,.85*n,n,Math.round(22*t.density),r.arr,{core:.4})}}}let i=g(r);e.cluster(i.p,.32*a*t.leafScale,.4*a*t.leafScale,.32*a*t.leafScale,Math.round(30*t.density),i.arr)}};function y(){let e=new t.InstancedBufferGeometry;return e.setAttribute("position",new t.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3)),e.setAttribute("uv",new t.Float32BufferAttribute([0,0,1,0,1,1,0,1],2)),e.setIndex([0,1,2,0,2,3]),e}function S(e){let a=y(),o=e.length,l=new Float32Array(3*o),r=new Float32Array(3*o),n=new Float32Array(4*o),i=new Float32Array(4*o);return e.forEach((e,t)=>{l.set([e.p.x,e.p.y,e.p.z],3*t),r.set([e.n.x,e.n.y,e.n.z],3*t),n.set([e.size,e.rot,e.rnd,e.arrN],4*t),i.set([e.ao,e.c.x,e.c.y,e.c.z],4*t)}),a.setAttribute("iPos",new t.InstancedBufferAttribute(l,3)),a.setAttribute("iNrm",new t.InstancedBufferAttribute(r,3)),a.setAttribute("iData",new t.InstancedBufferAttribute(n,4)),a.setAttribute("iMore",new t.InstancedBufferAttribute(i,4)),a.setAttribute("iGone",new t.InstancedBufferAttribute(new Float32Array(o).fill(-1e4),1).setUsage(t.DynamicDrawUsage)),a.instanceCount=o,a.boundingSphere=new t.Sphere(f(0,3,0),30),a}let M=`
uniform float uTime, uWind, uWindSpeed, uHeight, uGrow, uBlow;
uniform vec2 uWindDir;
uniform mat4 uShadowMatrix;
vec3 windDisp(vec3 p, float t) {
  float h = max(p.y - 0.25, 0.0) / max(uHeight, 0.5);
  float bend = h * h;
  float w = t * uWindSpeed;
  float sway = 0.55 + 0.45 * sin(w * 0.9 + p.x * 0.22 + p.z * 0.17);
  float gust = 0.5 + 0.5 * sin(w * 0.31 + 1.7) * sin(w * 0.53 + 0.4);
  vec3 dir = vec3(uWindDir.x, 0.0, uWindDir.y);
  vec3 side = vec3(-uWindDir.y, 0.0, uWindDir.x);
  float wnd = uWind;
  vec3 d = dir * (wnd * bend * (0.18 + 0.32 * sway * (0.6 + 0.8 * gust)));
  d += side * (wnd * bend * 0.08 * sin(w * 1.7 + p.y * 0.9 + p.x));
  d.y -= wnd * bend * 0.05 * (0.5 + 0.5 * sin(w * 1.1 + p.z));
  return d;
}
`,b=`
uniform sampler2D uShadowMap;
uniform vec2 uShadowTexel;
uniform float uShadowSoft;
uniform float uNativeMode;
float shadowAt(vec4 sc) {
  if (uNativeMode > 0.5) return 1.0;
  vec3 c = sc.xyz / sc.w * 0.5 + 0.5;
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  float bias = 0.0025;
  float lit = 0.0;
  vec2 o[12] = vec2[12](vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696,0.457), vec2(-0.203,0.621), vec2(0.962,-0.195), vec2(0.473,-0.480), vec2(0.519,0.767), vec2(0.185,-0.893), vec2(0.507,0.064), vec2(0.896,0.412), vec2(-0.322,-0.933), vec2(-0.792,-0.598));
  for (int i = 0; i < 12; i++) {
    float d = texture(uShadowMap, c.xy + o[i] * uShadowTexel * uShadowSoft * 2.2).r;
    lit += c.z - bias > d ? 0.0 : 1.0;
  }
  return lit / 12.0;
}
`,z=`
${M}
in vec3 iPos; in vec3 iNrm; in vec4 iData; in vec4 iMore; in float iGone;
uniform float uRegrow;
uniform float uLeafSize, uShape, uGrowWidth, uMix;
out float vShapeSel;
out vec2 vUv; out vec3 vN; out float vRnd; out float vAo; out vec4 vShadow; out vec3 vWorld; out float vAlpha;
float easeBack(float x) { float c1 = 1.9; float c3 = c1 + 1.0; float y = x - 1.0; return 1.0 + c3 * y * y * y + c1 * y * y; }
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  float size = iData.x * uLeafSize;
  float rot = iData.y;
  float rnd = iData.z;
  float arr = iData.w;
  float g = uBlow > 0.0 ? 1.0 : clamp((uGrow * (1.0 + uGrowWidth) - arr) / uGrowWidth, 0.0, 1.0);
  float pop = easeBack(g) * step(0.0001, g);
  vec3 p = iPos + windDisp(iPos, uTime);
  float w = uTime * uWindSpeed;
  rot += sin(w * (2.6 + rnd * 2.2) + rnd * 40.0) * 0.22 * uWind;
  p += vec3(uWindDir.x, 0.0, uWindDir.y) * sin(w * (3.1 + rnd * 1.7) + rnd * 17.0) * 0.025 * uWind;
  vec3 wd = vec3(uWindDir.x, 0.0, uWindDir.y);
  float lead = clamp(0.5 - dot(iPos, wd) * 0.12, 0.0, 1.0);
  float delay = rnd * 0.32 + lead * 0.22;
  float b = clamp((uBlow - delay) / 0.46, 0.0, 1.0);
  float b2 = b * b;
  vec3 scatter = vec3(hash(rnd * 91.0) - 0.5, hash(rnd * 37.0) - 0.35, hash(rnd * 53.0) - 0.5);
  vec3 away = wd * (7.0 + rnd * 7.0) * b2 + scatter * 5.0 * b + vec3(0.0, sin(b * 3.0 + rnd * 9.0) * 0.6, 0.0) * b;
  away += vec3(-wd.z, 0.0, wd.x) * sin(b * 5.0 + rnd * 20.0) * 0.8 * b;
  p += away;
  rot += b * (5.0 + rnd * 9.0);
  size *= pop * (1.0 - smoothstep(0.6, 1.0, b));
  float since = uTime - iGone;
  size *= since < 0.0 ? 1.0 : since < uRegrow ? 0.0 : easeBack(clamp((since - uRegrow) / 0.5, 0.0, 1.0));
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float c = cos(rot), s = sin(rot);
  vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * size;
  float msc = length(modelMatrix[0].xyz); p = (modelMatrix * vec4(p, 1.0)).xyz; vec3 wp = p + (right * q.x + up * q.y) * msc;
  vUv = uv;
  vShapeSel = fract(rnd * 7.31) < uMix ? 4.0 : uShape;
  vN = iNrm;
  vRnd = rnd;
  vAo = iMore.x;
  vWorld = wp;
  vAlpha = 1.0;
  vShadow = uShadowMatrix * (inverse(modelMatrix) * vec4(wp, 1.0));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,k=`
${b}
uniform sampler2D uAtlas;
uniform float uShape;
uniform vec3 uSunDir, uSun, uPal0, uPal1, uPal2, uPal3;
uniform float uNight, uVary;
in vec2 vUv; in vec3 vN; in float vRnd; in float vAo; in vec4 vShadow; in vec3 vWorld; in float vAlpha; in float vShapeSel;
out vec4 fragColor;
void main() {
  vec4 t = texture(uAtlas, vec2((vShapeSel + vUv.x) / 6.0, vUv.y));
  float a = (t.a - 0.5) / max(fwidth(t.a), 1e-4) + 0.5;
  if (a < 0.5) discard;
  float sh = shadowAt(vShadow);
  vec3 n = normalize(vN);
  float ndl = dot(n, uSunDir);
  float light = 0.06 + 0.94 * smoothstep(-0.35, 0.7, ndl);
  light = mix(light * 0.5, light, sh);
  light *= mix(0.45, 1.0, smoothstep(0.2, 0.98, vAo));
  light += max(n.y, 0.0) * 0.12;
  float k = clamp(light + (vRnd - 0.5) * uVary + (t.r - 0.9) * 0.6, 0.0, 1.0);
  vec3 col = k < 0.38 ? mix(uPal0, uPal1, smoothstep(0.0, 0.38, k)) : k < 0.74 ? mix(uPal1, uPal2, smoothstep(0.38, 0.74, k)) : mix(uPal2, uPal3, smoothstep(0.74, 1.0, k));
  col *= mix(vec3(1.0), uSun, 0.15 * k);
  fragColor = vec4(col, 1.0);
}
`,A=`
uniform sampler2D uAtlas;
in vec2 vUv; in float vShapeSel;
out vec4 fragColor;
void main() {
  vec4 t = texture(uAtlas, vec2((vShapeSel + vUv.x) / 6.0, vUv.y));
  if (t.a < 0.5) discard;
  fragColor = vec4(1.0);
}
`,C=`
${M}
in vec3 aCenter; in float aArr;
uniform float uGrowWidth;
out vec3 vN; out vec4 vShadow; out vec2 vUv; out vec3 vWorld; out float vY;
void main() {
  float f = clamp((uGrow * (1.0 + uGrowWidth) - aArr) / uGrowWidth, 0.0, 1.0);
  f = sqrt(f) * (0.45 + 0.55 * clamp(uGrow, 0.0, 1.0));
  vec3 p = aCenter + (position - aCenter) * f;
  p += windDisp(aCenter, uTime);
  p = (modelMatrix * vec4(p, 1.0)).xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vWorld = p;
  vY = aCenter.y;
  vShadow = uShadowMatrix * (inverse(modelMatrix) * vec4(p + normal * 0.03, 1.0));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`,T=`
${b}
uniform vec3 uSunDir, uSun, uBark, uBarkShade, uSnowCol;
uniform float uSnow, uLenticel;
in vec3 vN; in vec4 vShadow; in vec2 vUv; in vec3 vWorld; in float vY;
out vec4 fragColor;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN);
  float sh = shadowAt(vShadow);
  float ndl = dot(n, uSunDir);
  float light = smoothstep(-0.5, 0.45, ndl) * mix(0.35, 1.0, sh);
  vec3 col = mix(uBarkShade, uBark, smoothstep(0.25, 0.7, light));
  float lines = smoothstep(0.86, 0.95, fract(vUv.y * 9.0 + h2(floor(vec2(vUv.x * 9.0, vUv.y * 9.0))) * 0.6));
  col *= 1.0 - lines * 0.12 * uLenticel;
  float streak = h2(vec2(floor(vUv.x * 14.0), floor(vUv.y * 3.0)));
  col *= 0.95 + streak * 0.07;
  float snow = uSnow * smoothstep(0.25, 0.6, n.y);
  col = mix(col, uSnowCol * mix(0.82, 1.0, sh), snow);
  fragColor = vec4(col, 1.0);
}
`,P=`
out vec4 fragColor;
void main() { fragColor = vec4(1.0); }
`,R=`
uniform mat4 uShadowMatrix;
out vec3 vWorld; out vec4 vShadow;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vShadow = uShadowMatrix * (inverse(modelMatrix) * wp);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,W=`
${b}
uniform vec3 uGround, uGravel, uRakeCol, uShadowCol;
uniform float uShadowAmt, uRake, uGarden, uMoundR;
uniform vec4 uRocks[6];
uniform int uRockCount;
in vec3 vWorld; in vec4 vShadow;
out vec4 fragColor;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
void main() {
  vec2 p = vWorld.xz;
  float r = length(p);
  float d = r - uMoundR;
  for (int i = 0; i < 6; i++) {
    if (i >= uRockCount) break;
    d = smin(d, length((p - uRocks[i].xy) / vec2(1.0, uRocks[i].w)) - uRocks[i].z, 0.6);
  }
  float spacing = 0.2;
  float k = d / spacing;
  float groove = 1.0 - abs(fract(k) - 0.5) * 2.0;
  groove = smoothstep(0.55, 0.95, groove);
  float near = smoothstep(5.5, 2.2, r) * smoothstep(0.0, 0.08, d);
  float fade = smoothstep(11.5, 6.5, r) * uGarden;
  vec3 col = mix(uGround, uGravel, fade);
  col = mix(col, uRakeCol, groove * near * uRake * 0.5 * uGarden);
  float grain = h2(floor(p * 55.0)) - 0.5;
  col *= 1.0 + grain * 0.035 * fade;
  float sh = shadowAt(vShadow);
  float sfade = smoothstep(15.0, 9.0, r);
  col = mix(col, uShadowCol, (1.0 - sh) * uShadowAmt * sfade);
  fragColor = vec4(col, 1.0);
}
`,D=`
uniform mat4 uShadowMatrix;
out vec3 vN; out vec4 vShadow; out vec3 vWorld; out vec3 vLocal;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vWorld = wp.xyz;
  vLocal = position;
  vShadow = uShadowMatrix * (inverse(modelMatrix) * vec4(wp.xyz + vN * 0.05, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,F=`
${b}
uniform vec3 uSunDir, uLit, uDark, uSnowCol, uGround;
uniform float uSnow, uFadeR, uGrain;
in vec3 vN; in vec4 vShadow; in vec3 vWorld; in vec3 vLocal;
out vec4 fragColor;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN);
  float sh = shadowAt(vShadow);
  float ndl = dot(n, uSunDir);
  float light = smoothstep(-0.2, 0.55, ndl) * mix(0.3, 1.0, sh);
  vec3 col = mix(uDark, uLit, smoothstep(0.15, 0.75, light));
  col *= 1.0 + (h2(floor(vWorld.xz * 30.0 + vWorld.y * 17.0)) - 0.5) * uGrain;
  float snow = uSnow * smoothstep(0.35, 0.7, n.y);
  col = mix(col, uSnowCol * mix(0.8, 1.0, sh), snow);
  fragColor = vec4(col, 1.0);
}
`,B=`
${M}
in vec3 iStart; in vec4 iSeed; in vec3 iSky;
uniform float uFallSpeed, uLeafSize, uSnowMode, uMoundR, uMoundH, uTreeAlpha;
out vec2 vUv; out float vRnd; out float vA; out float vShade;
float moundY(vec2 p) { float r = length(p) / uMoundR; return r < 1.0 ? uMoundH * pow(1.0 - r * r, 1.3) : 0.0; }
void main() {
  float seed = iSeed.x, P = iSeed.y, size = iSeed.z, spin = iSeed.w;
  float t = mod(uTime + seed * P, P);
  vec3 s0 = mix(iStart, iSky, uSnowMode);
  float speed = mix(0.55, 0.35, uSnowMode) * uFallSpeed * (0.7 + 0.6 * fract(seed * 7.13));
  vec3 dir = vec3(uWindDir.x, 0.0, uWindDir.y);
  float drift = (0.55 + 0.6 * fract(seed * 3.7)) * (0.4 + uWind);
  float ground = 0.0;
  float tf = t;
  vec3 p = s0;
  float T = 0.0;
  for (int i = 0; i < 2; i++) {
    vec3 q = s0 + dir * drift * T;
    ground = moundY(q.xz) + 0.02;
    T = max(0.0, (s0.y - ground) / speed);
  }
  tf = min(t, T);
  float sw = sin(tf * (1.6 + fract(seed * 5.1)) + seed * 30.0);
  p = s0 + dir * drift * tf + vec3(-dir.z, 0.0, dir.x) * sw * 0.35 * (1.0 - uSnowMode * 0.6);
  p.y = s0.y - speed * tf + 0.05 * sin(tf * 3.0 + seed * 9.0);
  float landed = step(T, t);
  p.y = mix(p.y, ground, landed);
  float a = smoothstep(0.0, 0.4, t) * (1.0 - smoothstep(P - 1.2, P, t));
  a *= mix(1.0, 0.75, landed);
  a *= uTreeAlpha;
  float rot = spin * tf * mix(1.0, 0.0, landed) + seed * 6.28;
  float flip = mix(cos(tf * (2.0 + spin)), 1.0, landed);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec2 q2 = position.xy * vec2(1.0, mix(1.0, 0.42, landed));
  q2.x *= mix(abs(flip) * 0.85 + 0.15, 1.0, landed);
  float c = cos(rot), s = sin(rot);
  q2 = vec2(c * q2.x - s * q2.y, s * q2.x + c * q2.y) * size * uLeafSize * mix(1.0, 0.55, uSnowMode);
  float msc = length(modelMatrix[0].xyz); p = (modelMatrix * vec4(p, 1.0)).xyz; vec3 wp = p + (right * q2.x + up * q2.y) * msc;
  vUv = uv;
  vRnd = fract(seed * 13.7);
  vA = a;
  vShade = mix(0.82 + 0.18 * abs(flip), 0.9, landed);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,U=`
${M}
in vec3 aStart; in vec3 aVel; in vec4 aSeed; in float aRnd;
uniform float uFallSpeed, uLeafSize, uSnowMode, uMoundR, uMoundH, uGroundTime, uMix, uShape;
out vec2 vUv; out float vRnd; out float vA; out float vLand; out float vShapeSel; out vec4 vShadow; out float vFlip;
float moundY(vec2 p) { float r = length(p) / uMoundR; return r < 1.0 ? uMoundH * pow(1.0 - r * r, 1.3) : 0.0; }
vec3 pathAt(float t, vec3 vt, float k) { float e = (1.0 - exp(-k * t)) / k; return aStart + aVel * e + vt * (t - e); }
void main() {
  float t0 = aSeed.x, seed = aSeed.y, size = aSeed.z, spin = aSeed.w;
  float t = uTime - t0;
  float k = 2.4;
  vec3 wd = vec3(uWindDir.x, 0.0, uWindDir.y);
  float s = mix(0.62, 0.4, uSnowMode) * uFallSpeed * (0.75 + 0.5 * fract(seed * 7.13));
  vec3 vt = wd * (0.45 + 0.6 * fract(seed * 3.7)) * (0.4 + uWind) + vec3(0.0, -s, 0.0);
  float T = max(0.1, (aStart.y - moundY(aStart.xz)) / s + 0.4);
  for (int i = 0; i < 6; i++) {
    vec3 q = pathAt(T, vt, k);
    float y = q.y - moundY(q.xz) - 0.02;
    float dy = aVel.y * exp(-k * T) - s * (1.0 - exp(-k * T));
    T = max(0.0, T - y / min(dy, -0.05));
  }
  float tf = clamp(t, 0.0, T);
  float land = smoothstep(T, T + 0.18, t);
  vec3 p = pathAt(tf, vt, k);
  p += vec3(-wd.z, 0.0, wd.x) * sin(tf * (1.8 + fract(seed * 5.1)) + seed * 30.0) * 0.3 * smoothstep(0.0, 0.8, tf) * (1.0 - step(T, t));
  float gy = moundY(p.xz);
  float lift = length(p.xz) < uMoundR ? 0.07 : 0.012;
  p.y = mix(p.y, gy + lift + fract(seed * 91.0) * 0.008 + size * uLeafSize * 0.22, step(T, t));
  float end = T + uGroundTime;
  float a = step(0.0, t) * (1.0 - smoothstep(end - 2.5, end, t));
  float rot = spin * tf + seed * 6.28;
  float flip = cos(tf * (2.0 + spin));
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 gx = vec3(cos(rot), 0.0, sin(rot));
  vec3 gz = normalize(vec3(-sin(rot), 0.0, cos(rot)) + vec3(0.0, 0.5, 0.0));
  vec2 q2 = position.xy;
  q2.x *= mix(abs(flip) * 0.85 + 0.15, 1.0, land);
  float c = cos(rot), sn = sin(rot);
  vec2 qa = vec2(c * q2.x - sn * q2.y, sn * q2.x + c * q2.y);
  float sz = size * uLeafSize * step(0.001, a);
  vec3 air = right * qa.x + up * qa.y;
  vec3 flat_ = gx * q2.x + gz * q2.y;
  float msc = length(modelMatrix[0].xyz); p = (modelMatrix * vec4(p, 1.0)).xyz; vec3 wp = p + mix(air, flat_, land) * sz * msc;
  vUv = uv;
  vRnd = aRnd;
  vA = a;
  vLand = land;
  vFlip = abs(flip);
  vShapeSel = fract(aRnd * 7.31) < uMix ? 4.0 : uShape;
  vShadow = uShadowMatrix * (inverse(modelMatrix) * vec4(wp, 1.0));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,G=`
${b}
uniform sampler2D uAtlas;
uniform vec3 uPal0, uPal1, uPal2, uPal3;
in vec2 vUv; in float vRnd; in float vA; in float vLand; in float vShapeSel; in vec4 vShadow; in float vFlip;
out vec4 fragColor;
void main() {
  vec4 t = texture(uAtlas, vec2((vShapeSel + vUv.x) / 6.0, vUv.y));
  float a = (t.a - 0.5) / max(fwidth(t.a), 1e-4) + 0.5;
  a = clamp(a, 0.0, 1.0) * vA;
  if (a < 0.02) discard;
  float sh = shadowAt(vShadow);
  float k = clamp(0.5 + (vRnd - 0.5) * 0.7 + (t.r - 0.9) * 0.6 + (vFlip - 0.5) * 0.25 * (1.0 - vLand), 0.0, 1.0);
  k *= mix(0.55, 1.0, sh * mix(1.0, 0.9, vLand));
  vec3 col = k < 0.38 ? mix(uPal0, uPal1, smoothstep(0.0, 0.38, k)) : k < 0.74 ? mix(uPal1, uPal2, smoothstep(0.38, 0.74, k)) : mix(uPal2, uPal3, smoothstep(0.74, 1.0, k));
  fragColor = vec4(col, a);
}
`,L=`
uniform sampler2D uAtlas;
uniform float uShape;
uniform vec3 uPal0, uPal1, uPal2, uPal3;
in vec2 vUv; in float vRnd; in float vA; in float vShade;
out vec4 fragColor;
void main() {
  vec4 t = texture(uAtlas, vec2((uShape + vUv.x) / 6.0, vUv.y));
  float a = (t.a - 0.5) / max(fwidth(t.a), 1e-4) + 0.5;
  a = clamp(a, 0.0, 1.0) * vA;
  if (a < 0.02) discard;
  vec3 base = vRnd < 0.34 ? uPal0 : vRnd < 0.62 ? uPal1 : vRnd < 0.84 ? uPal2 : uPal3;
  fragColor = vec4(base * vShade * mix(0.88, 1.0, t.r), a);
}
`,N=`
uniform float uTime, uNight, uFlyCount;
uniform vec3 uFlyCenter, uFlySpan;
in vec4 iSeed;
out vec2 vUv; out float vA;
void main() {
  float s = iSeed.x;
  float t = uTime * (0.25 + iSeed.y * 0.3);
  vec3 p = uFlyCenter + uFlySpan * vec3(sin(t + s * 11.0) * 0.8 + sin(t * 1.7 + s * 3.0) * 0.2, sin(t * 0.8 + s * 7.0) * 0.6 + sin(t * 2.3 + s) * 0.15, cos(t * 0.9 + s * 5.0) * 0.8);
  float blink = pow(0.5 + 0.5 * sin(uTime * (1.2 + iSeed.z * 1.5) + s * 20.0), 3.0);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float size = 0.34 + 0.18 * iSeed.w;
  vec3 wp = p + (right * position.x + up * position.y) * size;
  vUv = uv;
  vA = blink * uNight;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`,I=`
uniform vec3 uFlyCol;
in vec2 vUv; in float vA;
out vec4 fragColor;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float g = exp(-d * d * 9.0) * 0.9 + (1.0 - smoothstep(0.0, 0.16, d)) * 1.2;
  fragColor = vec4(uFlyCol * g * vA, 1.0);
}
`,q=`
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`,E=`
uniform sampler2D tA, tB;
uniform float uWipe, uWiping, uAspect, uTime, uRimW;
uniform vec2 uCenter;
uniform vec3 uRim;
in vec2 vUv;
out vec4 fragColor;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec4 sampleA = texture(tA, vUv);
  vec3 a = sampleA.rgb;
  vec3 col = a;
  float outAlpha = sampleA.a;
  if (uWiping > 0.5) {
    vec4 sampleB = texture(tB, vUv);
    vec3 b = sampleB.rgb;
    vec2 q = (vUv - uCenter) * vec2(uAspect, 1.0);
    float r = length(q);
    float th = atan(q.y, q.x);
    float ph = uWipe * 4.0;
    float wave = r * (1.0 + 0.045 * sin(th * 5.0 + ph) + 0.025 * sin(th * 9.0 - ph * 1.7 + 1.1) + 0.012 * sin(th * 17.0 + ph * 2.3));
    float R = uWipe * (length(vec2(uAspect, 1.0)) * 1.15 + uRimW * 2.0);
    float aa = 1.5 / 900.0;
    float inside = 1.0 - smoothstep(R - uRimW - aa, R - uRimW + aa, wave);
    float rim = smoothstep(R - uRimW - aa, R - uRimW + aa, wave) * (1.0 - smoothstep(R - aa, R + aa, wave));
    float lift = (1.0 - smoothstep(R, R + 0.03, wave)) * (1.0 - rim) * (1.0 - inside);
    col = mix(a * (1.0 - 0.12 * lift), b, inside);
    col = mix(col, uRim, rim);
    outAlpha = max(mix(outAlpha, sampleB.a, inside), rim);
  }
  col += (h2(vUv * 1024.0 + fract(uTime) * 61.0) - 0.5) / 255.0;
  fragColor = vec4(col, outAlpha);
}
`;function V(e){return e<.5?4*e*e*e:1-Math.pow(-2*e+2,3)/2}function Y(e,p={},m={}){let g,M,b,O,j,X,H=Object.assign({},o.DEFAULTS,s(p));try{g=new a.WebGLRenderer({antialias:!1,alpha:!0,premultipliedAlpha:!1,powerPreference:"high-performance"})}catch(e){return null}g.setPixelRatio(Math.min(window.devicePixelRatio||1,m.maxDpr||2)),g.autoClear=!0,e.appendChild(g.domElement),g.domElement.style.display="block",g.domElement.style.width="100%",g.domElement.style.height="100%",g.domElement.style.touchAction=H.drag?"pan-y":"manipulation";let $=new t.Scene,_=new t.Scene,K=new t.PerspectiveCamera(30,1,.1,200),Z=new t.OrthographicCamera(-9,9,9,-9,.1,60),J=new t.WebGLRenderTarget(2048,2048,{depthBuffer:!0});J.depthTexture=new t.DepthTexture(2048,2048),J.depthTexture.type=t.UnsignedIntType,J.depthTexture.minFilter=t.NearestFilter,J.depthTexture.magFilter=t.NearestFilter;let Q=()=>new t.WebGLRenderTarget(4,4,{samples:4,type:t.HalfFloatType,depthBuffer:!0}),ee=Q(),et=Q(),ea=((M=document.createElement("canvas")).width=768,M.height=128,b=M.getContext("2d"),O=c(99),(j=(e,t)=>{b.save(),b.translate(128*e+64,64),t(),b.restore()})(l.blossom,()=>{for(let e=0;e<5;e++)b.save(),b.rotate(e/5*Math.PI*2-Math.PI/2),b.beginPath(),b.moveTo(0,0),b.bezierCurveTo(-30,-12,-30,-42,-8,-52),b.lineTo(0,-44),b.lineTo(8,-52),b.bezierCurveTo(30,-42,30,-12,0,0),b.fillStyle="#ffffff",b.fill(),b.restore();let e=b.createRadialGradient(0,0,0,0,0,20);e.addColorStop(0,"rgba(200,200,200,1)"),e.addColorStop(1,"rgba(255,255,255,0)"),b.fillStyle=e,b.beginPath(),b.arc(0,0,20,0,7),b.fill()}),j(l.maple,()=>{b.beginPath();let e=[];for(let t=0;t<7;t++){let a=-Math.PI/2+(t-3)*.5,o=3===t?56:2===t||4===t?52:1===t||5===t?44:32;e.push([Math.cos(a)*o,Math.sin(a)*o+10,a])}b.moveTo(0,14);for(let t=0;t<7;t++){let[a,o,l]=e[t],r=l-.25,n=l+.25;b.lineTo(14*Math.cos(r),14*Math.sin(r)+10),b.lineTo(.55*a+5*Math.cos(r),.55*o+5*Math.sin(r)+4),b.lineTo(a,o),b.lineTo(.55*a+5*Math.cos(n),.55*o+5*Math.sin(n)+4),b.lineTo(14*Math.cos(n),14*Math.sin(n)+10)}for(let[t,a]of(b.closePath(),b.fillStyle="#ffffff",b.fill(),b.strokeStyle="rgba(210,210,210,1)",b.lineWidth=2,e))b.beginPath(),b.moveTo(0,12),b.lineTo(.85*t,.85*a+2),b.stroke();b.fillRect(-2,12,4,40)}),j(l.needles,()=>{b.strokeStyle="#ffffff",b.lineCap="round";for(let e=0;e<46;e++){let e=-Math.PI/2+(O()-.5)*2.6,t=30+30*O();b.lineWidth=2.6+1.6*O(),b.beginPath(),b.moveTo(0,22),b.lineTo(Math.cos(e)*t,Math.sin(e)*t+22),b.stroke()}for(let e=0;e<26;e++){let e=O()*Math.PI*2,t=20+28*O();b.lineWidth=2.4,b.strokeStyle="rgba(225,225,225,1)",b.beginPath(),b.moveTo(0,0),b.lineTo(Math.cos(e)*t,Math.sin(e)*t*.8),b.stroke()}}),j(l.fan,()=>{b.beginPath(),b.moveTo(0,30),b.lineTo(-44,-18),b.quadraticCurveTo(-34,-46,-6,-46),b.lineTo(0,-32),b.lineTo(6,-46),b.quadraticCurveTo(34,-46,44,-18),b.closePath(),b.fillStyle="#ffffff",b.fill(),b.strokeStyle="rgba(220,220,220,1)",b.lineWidth=1.5;for(let e=-5;e<=5;e++)b.beginPath(),b.moveTo(0,28),b.lineTo(8*e,-40),b.stroke();b.fillStyle="#ffffff",b.fillRect(-2,28,4,30)}),j(l.dab,()=>{b.rotate(-.5),b.scale(1,.62),b.fillStyle="#ffffff",((e=64)=>{b.beginPath();for(let t=0;t<=e;t++){let a=t/e*Math.PI*2,o=54*(1+.14*(.5*Math.sin(2*a+1.3)+(O()-.5)*.6)),l=Math.cos(a)*o,r=Math.sin(a)*o*.86;t?b.lineTo(l,r):b.moveTo(l,r)}b.closePath()})(56),b.fill(),b.strokeStyle="rgba(226,226,226,1)",b.lineCap="round";for(let e=0;e<9;e++){let t=-34+8.5*e+(O()-.5)*4;b.lineWidth=2+2.5*O(),b.beginPath(),b.moveTo(-40+14*O(),t),b.lineTo(34-14*O(),t+(O()-.5)*6),b.stroke()}}),j(l.leaf,()=>{b.beginPath(),b.moveTo(0,54),b.bezierCurveTo(-36,20,-30,-30,0,-58),b.bezierCurveTo(30,-30,36,20,0,54),b.fillStyle="#ffffff",b.fill(),b.strokeStyle="rgba(215,215,215,1)",b.lineWidth=2,b.beginPath(),b.moveTo(0,50),b.lineTo(0,-52),b.stroke();for(let e=-3;e<=3;e++)b.beginPath(),b.moveTo(0,12*e),b.lineTo(-18,12*e-12),b.moveTo(0,12*e),b.lineTo(18,12*e-12),b.stroke()}),(X=new t.CanvasTexture(M)).generateMipmaps=!0,X.minFilter=t.LinearMipmapLinearFilter,X.magFilter=t.LinearFilter,X.anisotropy=4,X.colorSpace=t.NoColorSpace,X),eo=new t.Matrix4,el={uTime:{value:0},uWind:{value:H.wind},uWindSpeed:{value:H.windSpeed},uWindDir:{value:new t.Vector2(-.94,-.34).normalize()},uHeight:{value:5},uGrow:{value:0},uBlow:{value:0},uGrowWidth:{value:.12},uShadowMatrix:{value:eo},uShadowMap:{value:J.depthTexture},uShadowTexel:{value:new t.Vector2(48828125e-11,48828125e-11)},uShadowSoft:{value:H.shadowSoft},uNativeMode:{value:m.nativeScene?1:0},uSunDir:{value:f(1,.4,.3).normalize()},uSun:{value:f(1,1,1)},uNight:{value:0},uAtlas:{value:ea},uLeafSize:{value:.32},uRegrow:{value:H.regrow}},er={...el,uShape:{value:0},uPal0:{value:f()},uPal1:{value:f()},uPal2:{value:f()},uPal3:{value:f()},uVary:{value:.22},uMix:{value:0}},en={...el,uShape:{value:l.dab},uPal0:{value:f()},uPal1:{value:f()},uPal2:{value:f()},uPal3:{value:f()},uVary:{value:.3},uMix:{value:1},uWind:{value:0},uGrow:{value:1},uBlow:{value:0},uLeafSize:{value:.15}},ei={...el,uBark:{value:f()},uBarkShade:{value:f()},uSnowCol:{value:f(1,1,1)},uSnow:{value:0},uLenticel:{value:1}},eu={...el,uGround:{value:f()},uGravel:{value:f()},uRakeCol:{value:f()},uShadowCol:{value:f()},uShadowAmt:{value:1},uRake:{value:1},uGarden:{value:1},uMoundR:{value:1.6},uRocks:{value:Array.from({length:6},()=>new t.Vector4)},uRockCount:{value:0}},es={...el,uLit:{value:f()},uDark:{value:f()},uSnowCol:{value:f(1,1,1)},uSnow:{value:0},uFadeR:{value:2},uGrain:{value:.08},uGround:{value:f()}},ed={...el,uLit:{value:f()},uDark:{value:f()},uSnowCol:{value:f(1,1,1)},uSnow:{value:0},uFadeR:{value:0},uGrain:{value:.05},uGround:{value:f()}},ec={...el,uShape:{value:0},uPal0:{value:f()},uPal1:{value:f()},uPal2:{value:f()},uPal3:{value:f()},uFallSpeed:{value:H.fallSpeed},uSnowMode:{value:0},uMoundR:{value:1.6},uMoundH:{value:.3},uTreeAlpha:{value:1}},ev={uTime:el.uTime,uNight:{value:0},uFlyCount:{value:0},uFlyCenter:{value:f(0,2.5,0)},uFlySpan:{value:f(3,1.5,3)},uFlyCol:{value:v("#eef7a0")}},ef=(e,a,o,l={})=>new t.ShaderMaterial({vertexShader:e,fragmentShader:a,uniforms:o,glslVersion:t.GLSL3,...l}),eh=ef(z,k,er,{alphaToCoverage:!0,side:t.DoubleSide}),ep=ef(z,A,er,{side:t.DoubleSide}),em=ef(z,k,en,{alphaToCoverage:!0,side:t.DoubleSide}),ew=ef(C,T,ei),eg=ef(C,P,ei),ex=ef(R,W,eu),ey=ef(D,F,es),eS=ef(D,F,ed),eM=ef(D.replace("out vec3 vN;","out vec3 vN;"),P,{uShadowMatrix:el.uShadowMatrix}),eb=ef(B,L,ec,{transparent:!0,depthWrite:!1,side:t.DoubleSide}),ez={...ec,uMix:er.uMix,uShape:er.uShape,uGroundTime:{value:H.groundTime}},ek=ef(U,G,ez,{transparent:!0,depthWrite:!1,side:t.DoubleSide}),eA=ef(N,I,ev,{transparent:!0,depthWrite:!1,blending:t.AdditiveBlending}),eC=new t.ShaderMaterial({vertexShader:q,fragmentShader:E,glslVersion:t.GLSL3,depthTest:!1,depthWrite:!1,uniforms:{tA:{value:ee.texture},tB:{value:et.texture},uWipe:{value:0},uWiping:{value:0},uAspect:{value:1},uTime:el.uTime,uRimW:{value:.012},uCenter:{value:new t.Vector2(.5,.2)},uRim:{value:f(1,1,1)}}}),eT=new t.Scene,eP=new t.OrthographicCamera(-1,1,1,-1,0,1),eR=new t.BufferGeometry;eR.setAttribute("position",new t.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));let eW=new t.Mesh(eR,eC);eW.frustumCulled=!1,eT.add(eW);let eD=new t.Mesh(new t.CircleGeometry(40,96).rotateX(-Math.PI/2),ex);eD.renderOrder=0,$.add(eD),eD.visible=!1;let eF=new t.Group;$.add(eF);let eB=new t.Group;_.add(eB);let eU=null,eG=null,eL=null,eN=null,eI=null,eq=new Float32Array(0),eE=null,eV=null,eY=null,eO=[],ej=[],eX=null,eH=null,e$=1.6,e_=.3;function eK(){for(let e of[eG,eL])e&&(eF.remove(e),e.geometry.dispose());for(let e of[eN,eI])e&&eB.remove(e);eG=eL=eN=eI=null;let e=function(e){let a=[],o=[],l=[],r=[],n=[],i=[],u=0;for(let t of e.branches){let e=0===t.depth?9:1===t.depth?7:5,s=t.pts.length,d=null,c=[];for(let e=0;e<s;e++){let a=(e<s-1?t.pts[e+1].clone().sub(t.pts[e]):t.pts[e].clone().sub(t.pts[e-1])).normalize(),o=d?d.clone().addScaledVector(a,-d.dot(a)).normalize():h(a);1e-6>o.lengthSq()&&(o=h(a)),d=o,c.push({t:a,s:o,b2:a.clone().cross(o).normalize()})}for(let i=0;i<s;i++){let{s:u,b2:s}=c[i],d=t.pts[i],v=t.rad[i];for(let c=0;c<=e;c++){let f=c/e*Math.PI*2,h=u.clone().multiplyScalar(Math.cos(f)).addScaledVector(s,Math.sin(f));a.push(d.x+h.x*v,d.y+h.y*v,d.z+h.z*v),o.push(h.x,h.y,h.z),l.push(d.x,d.y,d.z),r.push(t.arrN[i]),n.push(c/e,t.lens[i]+0*t.arr0)}}for(let t=0;t<s-1;t++)for(let a=0;a<e;a++){let o=u+t*(e+1)+a,l=o+e+1;i.push(o,l,o+1,o+1,l,l+1)}u+=s*(e+1)}let s=new t.BufferGeometry;return s.setAttribute("position",new t.Float32BufferAttribute(a,3)),s.setAttribute("normal",new t.Float32BufferAttribute(o,3)),s.setAttribute("aCenter",new t.Float32BufferAttribute(l,3)),s.setAttribute("aArr",new t.Float32BufferAttribute(r,1)),s.setAttribute("uv",new t.Float32BufferAttribute(n,2)),s.setIndex(i),s.computeBoundingSphere(),s}(eU=function(e,a,o){let l=new w(c(0x9e3779b1*a^97531*n.indexOf(e)));x[e](l,o);let r=0;for(let e of l.branches)r=Math.max(r,e.arr[e.arr.length-1]);for(let e of l.leaves)r=Math.max(r,e.arr);let i=1/Math.max(1e-6,r);for(let e of l.branches)e.arrN=e.arr.map(e=>e*i);for(let e of l.leaves)e.arrN=e.arr*i;let u=new t.Box3;for(let e of l.leaves)u.expandByPoint(e.p);for(let e of l.branches)for(let t of e.pts)u.expandByPoint(t);l.box=u;let s=f();for(let e of l.leaves)s.add(e.p);s.multiplyScalar(1/Math.max(1,l.leaves.length)),l.crown=s;let d=u.getSize(f()).multiplyScalar(.5);for(let e of l.leaves){let t=e.p.clone().sub(s);t.x/=Math.max(.3,d.x),t.y/=Math.max(.3,d.y),t.z/=Math.max(.3,d.z),e.n=e.n.clone().multiplyScalar(.78).add(t.normalize().multiplyScalar(.22)).normalize()}return l}(H.species,H.seed,{size:H.size,spread:H.spread,gnarl:H.gnarl,lean:H.lean,density:H.density,leafScale:1}));(eG=new t.Mesh(e,ew)).frustumCulled=!1,(eN=new t.Mesh(e,eg)).frustumCulled=!1;let a=S(eU.leaves);(eL=new t.Mesh(a,eh)).frustumCulled=!1,eI=new t.Mesh(a,ep),eq=a.attributes.iGone.array,eI.frustumCulled=!1,eF.add(eG,eL),eB.add(eN,eI),el.uHeight.value=Math.max(2,eU.box.max.y),el.uLeafSize.value=.16*H.leafSize*("pine"===H.species?.9:"ginkgo"===H.species?.95:"weeping"===H.species?.8:1),ev.uFlyCenter.value.copy(eU.crown).setY(.7*eU.crown.y);let o=eU.box.getSize(f());ev.uFlySpan.value.set(.6*o.x+.8,.45*o.y,.6*o.z+.8),function(){eX&&($.remove(eX),eX.geometry.dispose());let e=y(),a=c(31*H.seed+5),o=new Float32Array(1800),l=new Float32Array(2400),r=new Float32Array(1800),n=eU.leaves;for(let e=0;e<600;e++){let t=n[Math.floor(a()*n.length)]||{p:f(0,3,0)};o.set([t.p.x,t.p.y,t.p.z],3*e),l.set([a(),6+6*a(),.85+.5*a(),1.2+2.8*a()],4*e),r.set([(a()-.3)*14,6+3*a(),(a()-.5)*10],3*e)}e.setAttribute("iStart",new t.InstancedBufferAttribute(o,3)),e.setAttribute("iSeed",new t.InstancedBufferAttribute(l,4)),e.setAttribute("iSky",new t.InstancedBufferAttribute(r,3)),e.instanceCount=Math.round(H.fall),(eX=new t.Mesh(e,eb)).frustumCulled=!1,eX.renderOrder=5,$.add(eX)}()}function eZ(e,t){let a=Math.hypot(e,t)/e$;return a<1?e_*Math.pow(1-a*a,1.3):0}function eJ(){for(let e of(eE&&($.remove(eE),_.remove(eV),eE.geometry.dispose()),eY&&($.remove(eY),eY.geometry.dispose()),eO))$.remove(e),e.geometry.dispose();for(let e of ej)_.remove(e);eO=[],ej=[];let e=c(7919*H.seed+13);e$=1.55+.25*H.spread,e_=.32;let a=[],o=[];for(let e=0;e<=22;e++){let t=e/22;for(let e=0;e<=72;e++){let o=e/72*Math.PI*2,l=1+.06*Math.sin(3*o+1)+.04*Math.sin(7*o+2),r=t*e$*l,n=Math.cos(o)*r,i=Math.sin(o)*r;a.push(n,e_*Math.pow(1-t*t,1.3)-.02*(t>.97),i)}}for(let e=0;e<22;e++)for(let t=0;t<72;t++){let a=73*e+t,l=a+72+1;o.push(a,a+1,l,a+1,l+1,l)}let l=new t.BufferGeometry;l.setAttribute("position",new t.Float32BufferAttribute(a,3)),l.setIndex(o),l.computeVertexNormals(),eE=new t.Mesh(l,ey),eV=new t.Mesh(l,eM),$.add(eE),_.add(eV),eE.visible=!1,eV.visible=!1;let r=[],n=Math.round(2400*H.moss);for(let t=0;t<n;t++){let t=e()*Math.PI*2,a=.98*Math.sqrt(e()),o=Math.cos(t)*a*e$,l=Math.sin(t)*a*e$,n=eZ(o,l)+.02,i=f(1.3*o/e$,1,1.3*l/e$).normalize();r.push({p:f(o,n,l),n:i,size:.7+.6*e(),rot:6.28*e(),rnd:e(),arrN:0,ao:.6+.4*e(),c:f(0,0,0)})}r.length&&((eY=new t.Mesh(S(r),em)).frustumCulled=!1,$.add(eY),eY.visible=!1);let i=H.garden?H.rocks:0,u=[],s=Math.PI/2,d=.5>e()?1:-1;for(let a=0;a<i;a++){let o=0===a,l=o?.55+.15*e():.28+.18*e(),r=s+d*(1.15+(a+.5)/Math.max(1,i)*(2*Math.PI-2.3)+(e()-.5)*.35),n=e$+(o?.2:.6+1.6*e()),c=Math.cos(r)*n,v=Math.sin(r)*n,h=new t.IcosahedronGeometry(1,4),p=h.attributes.position,m=100*e();for(let e=0;e<p.count;e++){let t=f(p.getX(e),p.getY(e),p.getZ(e)),a=Math.sin(2.1*t.x+m)*Math.sin(2.7*t.y+1.3*m)*Math.sin(1.9*t.z+.7*m),o=Math.sin(5.3*t.x+2*m)*Math.sin(4.7*t.z+m);t.multiplyScalar(1+.12*a+.025*o),p.setXYZ(e,t.x,t.y,t.z)}h.computeVertexNormals();let w=new t.Mesh(h,eS),g=l*(.55+.3*e());w.scale.set(l*(1.1+.4*e()),g,l*(.9+.3*e())),w.rotation.y=6.28*e(),w.position.set(c,.35*g,v),$.add(w);let x=new t.Mesh(h,eM);x.scale.copy(w.scale),x.rotation.copy(w.rotation),x.position.copy(w.position),_.add(x),eO.push(w),ej.push(x),u.push(new t.Vector4(c,v,.95*Math.max(w.scale.x,w.scale.z),w.scale.z/w.scale.x))}for(let e=0;e<6;e++)eu.uRocks.value[e].copy(u[e]||new t.Vector4);eu.uRockCount.value=u.length,eu.uMoundR.value=1.02*e$,ec.uMoundR.value=e$,ec.uMoundH.value=e_}let eQ=null,e0=0,e1=new Float32Array(6e3),e2=new Float32Array(6e3),e5=new Float32Array(6e3).fill(-1e4),e3=e=>e-Math.floor(e),e4=c(777);function e6(e,t,a,o){let l=eQ.geometry,r=e0;e0=(e0+1)%6e3;let n=e4();l.attributes.aStart.setXYZ(r,e.x,e.y,e.z),l.attributes.aVel.setXYZ(r,t.x,t.y,t.z),l.attributes.aSeed.setXYZW(r,tI,n,o,1.2+2.8*e4()),l.attributes.aRnd.setX(r,a);let i=function(e,t,a){let o=(.62+(.4-.62)*("winter"===tr.season))*H.fallSpeed*(.75+.5*e3(7.13*a)),l=(.45+.6*e3(3.7*a))*(.4+H.wind),r=el.uWindDir.value.x*l,n=el.uWindDir.value.y*l,i=a=>{let l=(1-Math.exp(-2.4*a))/2.4;return[e.x+t.x*l+r*(a-l),e.y+t.y*l-o*(a-l),e.z+t.z*l+n*(a-l)]},u=Math.max(.1,(e.y-eZ(e.x,e.z))/o+.4);for(let e=0;e<6;e++){let e=i(u),a=e[1]-eZ(e[0],e[2])-.02,l=t.y*Math.exp(-2.4*u)-o*(1-Math.exp(-2.4*u));u=Math.max(0,u-a/Math.min(l,-.05))}let s=i(u);return{x:s[0],z:s[2],T:u}}(e,t,n);return e1[r]=i.x,e2[r]=i.z,e5[r]=tI+i.T,r}function e8(){let e=eQ.geometry.attributes;e.aStart.needsUpdate=e.aVel.needsUpdate=e.aSeed.needsUpdate=e.aRnd.needsUpdate=!0}function e7(e){let t=eq[e];return tI-t>=0&&tI-t<H.regrow}function e9(e,t,a,o){if(!eU||a<=0||!eQ)return 0;let l=eU.leaves,r=t*t,n=[];for(let t=0;t<l.length;t++)!e7(t)&&l[t].p.distanceToSquared(e)<r&&n.push(t);let i=0;for(;i<a&&n.length;){let e=Math.floor(e4()*n.length),t=n[e];n[e]=n[n.length-1],n.pop();let a=l[t];e6(a.p.clone().add(function(e,t){let a=Math.max(e.y-.25,0)/Math.max(el.uHeight.value,.5),o=a*a,l=t*H.windSpeed,r=.55+.45*Math.sin(.9*l+.22*e.x+.17*e.z),n=.5+.5*Math.sin(.31*l+1.7)*Math.sin(.53*l+.4),i=H.wind,u=el.uWindDir.value.x,s=el.uWindDir.value.y,d=i*o*(.18+.32*r*(.6+.8*n)),c=i*o*.08*Math.sin(1.7*l+.9*e.y+e.x);return f(u*d-s*c,-i*o*.05*(.5+.5*Math.sin(1.1*l+e.z)),s*d+u*c)}(a.p,tI)),o.clone().multiplyScalar(.5+.8*e4()).add(f((e4()-.5)*.9,.7*e4(),(e4()-.5)*.9)),a.rnd,a.size),eq[t]=tI,i++}return i&&(eL.geometry.attributes.iGone.needsUpdate=!0,e8()),tb+=i,i}function te(e,t,a,o){if(!eQ)return 0;let l=eQ.geometry,r=t*t,n=H.groundTime-2.5,i=0;for(let u=0;u<6e3&&i<o;u++){let o=e5[u];if(tI<o+.15||tI>o+n)continue;let s=e1[u]-e.x,d=e2[u]-e.z,c=s*s+d*d;if(c>r)continue;let v=1-Math.sqrt(c)/t,h=f(s,0,d).normalize().multiplyScalar(.6*v),p=a.clone().multiplyScalar(.6+v).add(h).add(f(0,.9+1.4*v+.6*e4(),0)),m=f(e1[u],eZ(e1[u],e2[u])+.05,e2[u]),w=l.attributes.aRnd.getX(u),g=l.attributes.aSeed.getZ(u);l.attributes.aSeed.setX(u,-1e4),e5[u]=-1e4,e6(m,p,w,g),i++}return i&&e8(),i}let tt=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;function ta(){if("dark"===H.appearance)return!0;if("light"===H.appearance)return!1;let e=getComputedStyle(document.documentElement).colorScheme||"";return!!/^\s*dark\s*$/.test(e)||!/^\s*light\s*$/.test(e)&&!!(tt&&tt.matches)}function to(e,a){let r=e=>v(H[a?e+"Dark":e]),n={};for(let t of o.SCENE_KEYS)n[t]=r((0,o.sceneKey)(e,t));let i=o.LEAF_SHAPE[H.species][e],u=(0,o.leafKeys)(H.species,e).map(r),s=n.moss,d=n.moss2,c=n.mossShade,h=["moss","moss2","mossShade"].every(t=>{let l=(0,o.sceneKey)(e,t)+(a?"Dark":"");return H[l]===o.DEFAULTS[l]}),p="autumn"===e&&h;return{season:e,dark:a,species:H.species,sc:n,pal:u,shape:l[i],snow:r("snow"),fly:v(H.firefly),moss:p?[u[0],u[1],u[2],u[3]]:[c,s,d,d.clone().lerp(f(1,1,1),a?.08:.3)],litter:"autumn"===e?l[i]:l.dab,clear:new t.Color().setRGB(n.ground.x,n.ground.y,n.ground.z,t.LinearSRGBColorSpace)}}function tl(e){let t=e.sc,a=e.pal;er.uPal0.value=a[0],er.uPal1.value=a[1],er.uPal2.value=a[2],er.uPal3.value=a[3],er.uShape.value=e.shape,er.uMix.value=r[e.shape],ec.uPal0.value=a[0],ec.uPal1.value=a[1],ec.uPal2.value=a[2],ec.uPal3.value=a[3],ec.uShape.value=e.shape,ec.uSnowMode.value=+("winter"===e.season),en.uPal0.value=e.moss[0],en.uPal1.value=e.moss[1],en.uPal2.value=e.moss[2],en.uPal3.value=e.moss[3],en.uShape.value=e.litter,en.uMix.value="autumn"===e.season?.45:1,es.uLit.value=e.moss[1],es.uDark.value=e.moss[0],ei.uBark.value=t.bark,ei.uBarkShade.value=t.barkShade,ei.uSnow.value=+("winter"===e.season),ei.uSnowCol.value=e.snow,ei.uLenticel.value="cherry"===e.species||"weeping"===e.species?.8:.3,ed.uLit.value=t.rock,ed.uDark.value=t.rockShade,ed.uSnow.value=+("winter"===e.season),ed.uSnowCol.value=e.snow,eu.uGround.value=t.ground,eu.uGravel.value=t.gravel,eu.uRakeCol.value=t.rake,eu.uShadowCol.value=t.shadow,el.uSun.value=t.sun;let o=+!!e.dark;el.uNight.value=o,ev.uNight.value=o*("winter"!==e.season),ev.uFlyCol.value=e.fly,eC.uniforms.uRim.value=t.rim,g.setClearColor(e.clear,0)}let tr=to(H.season,ta()),tn=null,ti=0,tu=0,ts=!0,td=!1,tc=0;function tv(){let t=Math.max(1,e.clientWidth),a=Math.max(1,e.clientHeight);g.setSize(t,a,!1);let o=g.getPixelRatio();ee.setSize(Math.round(t*o),Math.round(a*o)),et.setSize(Math.round(t*o),Math.round(a*o)),K.aspect=t/a,K.updateProjectionMatrix(),eC.uniforms.uAspect.value=t/a}let tf=0,th=0,tp=0,tm=0,tw=!1,tg=0,tx=0,ty=null,tS=!1,tM=0,tb=0,tz=0,tk=-1,tA=f(0,-99,0),tC=g.domElement,tT=new t.Raycaster,tP=new t.Vector2;function tR(e,t){let a=tC.getBoundingClientRect();tP.set((e-a.left)/a.width*2-1,-(2*((t-a.top)/a.height))+1),K.updateMatrixWorld(),tT.setFromCamera(tP,K);let o=tT.ray.origin,l=tT.ray.direction,r=.24*H.leafSize*Math.max(.6,H.touchSize),n=r*r,i=1/0,u=null,s=eU.leaves;for(let e=0;e<s.length;e++){if(e7(e))continue;let t=s[e].p,a=t.x-o.x,r=t.y-o.y,d=t.z-o.z,c=a*l.x+r*l.y+d*l.z;c<=0||c>=i||a*a+r*r+d*d-c*c<n&&(i=c,u=t)}return u?{p:u.clone(),d:l.clone()}:null}function tW(){let e=tT.ray.origin,t=tT.ray.direction;if(t.y>-.01)return null;let a=0,o=null;for(let l=0;l<3;l++){let l=(a-e.y)/t.y;a=eZ((o=e.clone().addScaledVector(t,l)).x,o.z)}return o}function tD(e,t,a){let o=f().setFromMatrixColumn(K.matrixWorld,0),l=f().setFromMatrixColumn(K.matrixWorld,1),r=o.multiplyScalar(e).addScaledVector(l,-t);return 1e-6>r.lengthSq()&&r.copy(a),r.normalize().addScaledVector(a,.35),r.normalize()}let tF=()=>"pine"===H.species?.6:1,tB=-1;function tU(e,t,a,o,l){if(td||ts||!eU)return;let r=tR(e,t),n=Math.hypot(a,o)/Math.max(l,1/240),i=r?null:tW();if(tC.style.cursor=r?"pointer":"",!r){if(i&&n>40&&tI-tB>.03){let e=tD(a,o,tT.ray.direction.clone().setY(0).normalize());e.y=0,e.normalize(),te(i,.42*H.touchSize,e.multiplyScalar(Math.min(2.6,n/600)),14)&&(tB=tI)}return}if(tI-tk<.05&&.35>r.p.distanceTo(tA))return;tk=tI,tA.copy(r.p),tM++;let u=tD(a,o,r.d);if(H.knock>0){let e=6*Math.min(3,Math.max(.7,n/500))*H.knock*tF();e9(r.p,.75*H.touchSize,Math.floor(e+e4()),u.clone().multiplyScalar(Math.min(3,.4+n/700)))}}function tG(e,t){if(td||ts||!eU||H.gust<=0)return;let a=tR(e,t),o=f(el.uWindDir.value.x,.25,el.uWindDir.value.y).normalize();if(!a){let e=tW();e&&te(e,1.1*H.touchSize,o.clone().setY(0).normalize().multiplyScalar(1.6*H.gust),120)}let l=a?a.p:eU.crown.clone(),r=a?a.d:f().subVectors(eU.crown,K.position).normalize(),n=o.clone().multiplyScalar(.6).add(r).normalize();tM++,e9(l,1.7*H.touchSize,Math.round(90*H.knock*H.gust*tF()),n.clone().multiplyScalar(2.4))}tC.addEventListener("pointerdown",e=>{ty={x:e.clientX,y:e.clientY,moved:!1,id:e.pointerId},tg=e.clientX,tx=e.clientY,tz=performance.now(),tS="mouse"!==e.pointerType&&!(td||ts||!eU)&&!!tR(e.clientX,e.clientY);try{tC.setPointerCapture(e.pointerId)}catch(e){}}),tC.addEventListener("pointermove",e=>{let t=performance.now(),a=e.clientX-tg,o=e.clientY-tx,l=(t-tz)/1e3;if(tg=e.clientX,tx=e.clientY,tz=t,ty&&(!ty.moved&&Math.hypot(e.clientX-ty.x,e.clientY-ty.y)>6&&(ty.moved=!0,tw=!tS&&H.drag),tw)){th-=.3*a,tm=-(.3*a),tp=Math.max(-H.tilt+1,Math.min(40-H.tilt,tp+.15*o));return}tU(e.clientX,e.clientY,a,o,l)});let tL=e=>{ty&&!ty.moved&&"pointerup"===e.type&&tG(e.clientX,e.clientY),ty=null,tw=!1,tS=!1};function tN(e){g.setRenderTarget(e),g.render($,K)}tC.addEventListener("pointerup",tL),tC.addEventListener("pointercancel",tL),tC.addEventListener("pointerleave",()=>{tC.style.cursor=""}),tC.addEventListener("wheel",e=>{H.wheel&&(e.preventDefault(),H.zoom=Math.max(.6,Math.min(1.8,H.zoom*Math.exp(-(.0012*e.deltaY)))),m.onChange&&m.onChange({zoom:Math.round(100*H.zoom)/100}))},{passive:!1});let tI=0,tq=performance.now(),tE=!1,tV=0,tY=!0;function tO(e){(tI+=e,el.uTime.value=tI,!tw&&(th+=tm,.001>Math.abs(tm*=.9)&&(tm=0)),tf+=H.autoTurn*e,td)?(tc+=e/Math.max(.05,H.blowTime),el.uBlow.value=Math.min(1,tc),el.uGrow.value=Math.max(0,1-V(Math.min(1,Math.max(0,tc-.3)/.62))),ec.uTreeAlpha.value=Math.max(0,1-2*tc),tc>=1&&(td=!1,eK(),tr=to(tr.season,tr.dark),tn&&(tn=to(tn.season,tn.dark)),el.uBlow.value=0,tu=0,ts=!0)):ts&&((tu+=e/Math.max(.05,H.growTime))>=1&&(tu=1,ts=!1),el.uGrow.value=1-Math.pow(1-tu,1.8),ec.uTreeAlpha.value=Math.max(0,(tu-.7)/.3)),tn&&(ti+=e/Math.max(.05,H.wipeTime))>=1&&(tr=tn,tn=null,ti=0)}function tj(){let e,a,o,l,r,n,i,u,s,d,c,v,h;e=t.MathUtils.degToRad(H.turn+tf+th),a=t.MathUtils.degToRad(H.tilt+tp),o=eU?Math.max(3.5,eU.box.max.y):5,l=eU?Math.max(eU.box.max.x-eU.box.min.x,eU.box.max.z-eU.box.min.z):5,r=K.aspect,i=Math.max((1.75*o+1.4)/2/Math.tan((n=t.MathUtils.degToRad(K.fov))/2),(1.65*l+2.4)/2/Math.tan(n/2)/r,11)/H.zoom,u=f(0,.46*o,0),K.position.set(Math.sin(e)*Math.cos(a)*i,u.y+Math.sin(a)*i,Math.cos(e)*Math.cos(a)*i),K.lookAt(u),K.updateMatrixWorld(),s=f(0,0,0).project(K),eC.uniforms.uCenter.value.set(.5*s.x+.5,.5*s.y+.5),d=t.MathUtils.degToRad(H.sunTurn),v=f(Math.sin(d)*Math.cos(c=t.MathUtils.degToRad(H.sunHeight)),Math.sin(c),Math.cos(d)*Math.cos(c)).normalize(),el.uSunDir.value.copy(v),h=f(0,2.5,0),Z.position.copy(h).addScaledVector(v,25),Z.up.set(0,1,0),Z.lookAt(h),Z.left=-8.5,Z.right=8.5,Z.top=8.5,Z.bottom=-8.5,Z.near=1,Z.far=60,Z.updateProjectionMatrix(),Z.updateMatrixWorld(),eo.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),el.uShadowSoft.value=H.shadowSoft,eu.uShadowAmt.value=H.shadow,tl(tr),g.setRenderTarget(J),g.setClearColor(0,1),g.clear(),g.render(_,Z),tl(tr),tN(ee),tn?(tl(tn),tN(et),eC.uniforms.uWiping.value=1,eC.uniforms.uWipe.value=V(Math.min(1,ti))):eC.uniforms.uWiping.value=0,g.setRenderTarget(null),g.render(eT,eP)}function tX(e){if(H.seed=null!=e?e:1+Math.floor(999*Math.random()),!td){if(!eU)return void eK();td=!0,tc=0,eQ&&te(f(0,0,0),60,f(el.uWindDir.value.x,0,el.uWindDir.value.y).multiplyScalar(4.5),6e3),m.onChange&&m.onChange({seed:H.seed})}}function tH(e,t){let a=to(e,t);if(tn&&(tr=tn,tn=null),a.season===tr.season&&a.dark===tr.dark&&a.pal.join()===tr.pal.join()){tr=a;return}tn=a,ti=0}let t$="mfgt-style";if(!document.getElementById(t$)){let e=document.createElement("style");e.id=t$,e.textContent=".mfgt-ui{position:absolute;left:0;right:0;bottom:14px;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;z-index:2;padding:0 12px;font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.mfgt-hint{font-weight:400;font-size:11px;line-height:1.4;padding:5px 10px;border-radius:999px;text-align:center;max-width:100%}.mfgt-row{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;pointer-events:auto}.mfgt-key{all:unset;box-sizing:border-box;cursor:pointer;padding:9px 13px;border-radius:8px;border:1.5px solid var(--gt-ink);background:var(--gt-face);color:var(--gt-ink);box-shadow:0 2.5px 0 var(--gt-ink);transition:transform .12s,box-shadow .12s,background .3s,color .3s;user-select:none;-webkit-user-select:none;white-space:nowrap}.mfgt-key:hover{transform:translateY(-1px);box-shadow:0 3.5px 0 var(--gt-ink)}.mfgt-key:active{transform:translateY(2px);box-shadow:0 .5px 0 var(--gt-ink)}.mfgt-key.on{background:var(--gt-on);color:var(--gt-face);border-color:var(--gt-on)}.mfgt-gap{width:10px}",document.head.appendChild(e)}let t_=document.createElement("div");t_.className="mfgt-ui";let tK=document.createElement("div");tK.className="mfgt-hint";let tZ=document.createElement("div");tZ.className="mfgt-row";let tJ=i.map(e=>{let t=document.createElement("button");return t.type="button",t.className="mfgt-key",t.addEventListener("click",()=>{H.season!==e&&(H.season=e,tH(e,ta()),t1(),m.onChange&&m.onChange({season:e}))}),tZ.appendChild(t),t}),tQ=document.createElement("span");tQ.className="mfgt-gap",tZ.appendChild(tQ);let t0=document.createElement("button");function t1(){let e=ta(),t=t=>H[e?t+"Dark":t];t_.style.display=H.controls?"flex":"none",t_.style.setProperty("--gt-face",t("keyFace")),t_.style.setProperty("--gt-ink",t("keyInk")),t_.style.setProperty("--gt-on",t("keyOn"));let a={spring:H.labelSpring,summer:H.labelSummer,autumn:H.labelAutumn,winter:H.labelWinter};tJ.forEach((e,t)=>{let o=i[t];e.textContent=a[o]||o,e.classList.toggle("on",H.season===o)}),t0.textContent=H.labelNew||"New tree",tK.textContent=H.hint||"",tK.style.display=H.hint?"block":"none",tK.style.color=t("keyInk"),tK.style.background=t("keyFace")+"cc"}t0.type="button",t0.className="mfgt-key",t0.addEventListener("click",()=>tX()),tZ.appendChild(t0),t_.append(tK,tZ),e.appendChild(t_),tv(),eJ(),eK();let t2=y(),t5=c(4242),t3=new Float32Array(320);for(let e=0;e<80;e++)t3.set([100*t5(),t5(),t5(),t5()],4*e);t2.setAttribute("iSeed",new t.InstancedBufferAttribute(t3,4)),t2.instanceCount=Math.round(H.fireflies),(eH=new t.Mesh(t2,eA)).frustumCulled=!1,eH.renderOrder=6,$.add(eH);let t4=y(),t6=new Float32Array(24e3);for(let e=0;e<6e3;e++)t6[4*e]=-1e4;t4.setAttribute("aStart",new t.InstancedBufferAttribute(new Float32Array(18e3),3).setUsage(t.DynamicDrawUsage)),t4.setAttribute("aVel",new t.InstancedBufferAttribute(new Float32Array(18e3),3).setUsage(t.DynamicDrawUsage)),t4.setAttribute("aSeed",new t.InstancedBufferAttribute(t6,4).setUsage(t.DynamicDrawUsage)),t4.setAttribute("aRnd",new t.InstancedBufferAttribute(new Float32Array(6e3),1).setUsage(t.DynamicDrawUsage)),t4.instanceCount=6e3,(eQ=new t.Mesh(t4,ek)).frustumCulled=!1,eQ.renderOrder=5,$.add(eQ),el.uGrow.value=0,tl(tr),t1();let t8=new ResizeObserver(tv);t8.observe(e);let t7=new IntersectionObserver(e=>{tY=e[0].isIntersecting&&!document.hidden});t7.observe(e);let t9=()=>{tY=!document.hidden,tq=performance.now()};document.addEventListener("visibilitychange",t9);let ae=()=>{"auto"===H.appearance&&tH(H.season,ta()),t1()};tt&&tt.addEventListener("change",ae);let at=new MutationObserver(ae);at.observe(document.documentElement,{attributes:!0,attributeFilter:["style","class"]}),tV=m.nativeScene?0:requestAnimationFrame(function e(t){tV=requestAnimationFrame(e);let a=Math.min(.05,(t-tq)/1e3);tq=t,tY&&!tE&&(tO(a),tj())});let aa=!1;return{native:m.nativeScene?{get group(){return eF},get branchMesh(){return eG},get leafMesh(){return eL},snapshot(species,season,seed){if(species&&!n.includes(species))throw new TypeError("Espèce invalide");if(season&&!i.includes(season))throw new TypeError("Saison invalide");H.species=species||H.species;H.season=season||H.season;H.seed=Number(seed)||H.seed;eK();el.uGrow.value=1;el.uBlow.value=0;ec.uTreeAlpha.value=1;tr=to(H.season,false);tn=null;tl(tr);const group=new t.Group;const branches=new t.Mesh(eG.geometry.clone(),eG.material.clone()),leaves=new t.Mesh(eL.geometry.clone(),eL.material.clone());branches.frustumCulled=false;leaves.frustumCulled=false;branches.name="tree-trunk-branches";leaves.name="tree-instanced-leaves";group.add(branches,leaves);return {group,branches,leaves,species:H.species,season:H.season,seed:H.seed,stats:{branches:eU.branches.length,leaves:eU.leaves.length},originalSource:true}},get version(){return "public-browser-procedural-generator"},get uniforms(){return {shared:el,leaves:er,bark:ei}},update(delta,lighting={}){tO(Math.max(0,Math.min(.05,Number(delta)||0)));el.uGrow.value=1;ec.uTreeAlpha.value=1;if(tn){tl(tn)}else{tl(tr)}const dir=lighting.direction;if(dir&&dir.length>=3)el.uSunDir.value.set(Number(dir[0]),Number(dir[1]),Number(dir[2])).normalize();const color=lighting.sunColor;if(color&&color.length>=3)el.uSun.value.set(Number(color[0]),Number(color[1]),Number(color[2]));const tint=lighting.tint;if(tint&&tint.length>=3){for(const key of ["uPal0","uPal1","uPal2","uPal3"])er[key].value.multiply(new t.Vector3(tint[0],tint[1],tint[2]));ei.uBark.value.multiply(new t.Vector3(tint[0],tint[1],tint[2]));ei.uBarkShade.value.multiply(new t.Vector3(tint[0],tint[1],tint[2]));}return eF},get stats(){return {branches:eU?.branches.length||0,leaves:eU?.leaves.length||0,geometry:eG?.geometry?.attributes?.position?.count||0}},}:null,values:()=>Object.assign({},H),get dark(){return ta()},set(e){if(aa)return;let t=s(e),a=!1,o=!1,l=!1,r=!1,n=!1;for(let e in t)H[e]!==t[e]&&(H[e]=t[e],"species"===e?r=!0:("rocks"===e||"moss"===e||"garden"===e||"spread"===e)&&(o=!0),d.has(e)&&(a=!0),("season"===e||"appearance"===e)&&(l=!0),"color"===u[e].type&&(n=!0));el.uWind.value=H.wind,el.uRegrow.value=H.regrow,ez.uGroundTime.value=H.groundTime,el.uWindSpeed.value=H.windSpeed,ec.uFallSpeed.value=H.fallSpeed,eu.uRake.value=H.rake,eu.uGarden.value=+!!H.garden,g.domElement.style.touchAction=H.drag?"pan-y":"manipulation",eX&&(eX.geometry.instanceCount=Math.round(H.fall)),eH&&(eH.geometry.instanceCount=Math.round(H.fireflies)),o&&eJ(),r?tX(H.seed):a&&!td&&(eK(),el.uGrow.value=1,tu=1,ts=!1),l&&tH(H.season,ta()),(n||r)&&(tr=to(tr.season,tr.dark),tn&&(tn=to(tn.season,tn.dark))),t1()},newTree:tX,debug:{freeze(e=!0){tE=e},step(e){tO(e),tj()},reset(){if(tI=0,el.uTime.value=0,e4=c(777),tk=-1,tA.set(0,-99,0),tB=-1,e0=0,td&&(td=!1,eK()),tu=1,ts=!1,el.uGrow.value=1,el.uBlow.value=0,ec.uTreeAlpha.value=1,tn&&(tr=tn,tn=null,ti=0),tr=to(H.season,ta()),tf=0,th=0,tp=0,tm=0,eq.fill(-1e4),eL&&(eL.geometry.attributes.iGone.needsUpdate=!0),eQ){let e=eQ.geometry.attributes.aSeed;for(let t=0;t<6e3;t++)e.array[4*t]=-1e4;e.needsUpdate=!0,e5.fill(-1e4)}tj()},touch(e,t,a,o,l=1/60){let r=tC.getBoundingClientRect();tU(r.left+e*r.width,r.top+t*r.height,a,o,l)},click(e,t){let a=tC.getBoundingClientRect();tG(a.left+e*a.width,a.top+t*a.height)},state:()=>({grow:tu,blowing:td,wiping:!!tn,hits:tM,dropped:tb,leaves:eU?eU.leaves.length:0,branches:eU?eU.branches.length:0,time:tI,season:tr.season,dark:tr.dark}),render:()=>tj()},dispose(){aa||(aa=!0,cancelAnimationFrame(tV),t8.disconnect(),t7.disconnect(),at.disconnect(),document.removeEventListener("visibilitychange",t9),tt&&tt.removeEventListener("change",ae),g.dispose(),g.forceContextLoss(),tC.remove(),t_.remove())}}}e.s(["coerce",0,s,"createTree",0,Y],382677),e.i(382677),e.s(["DEFAULTS",()=>o.DEFAULTS,"KNOBS",()=>o.KNOBS,"coerce",0,s,"createTree",0,Y],362503)}]);