import * as THREE from './three.module.js';

// Shipped Sandcastle GPU instructions, validated separately against its DXBC.
// Scene coupling is an adaptation: this does not assert whole-game parity.
export async function creerEauNative(renderer, carte, precedent, zone, qualite=1) {
 const response=await fetch(new URL('./assets/atlas/sandcastle/water-kernels.json',import.meta.url));
 if(!response.ok)throw Error('Programmes d’eau absents');const pack=await response.json();
 const parameterResponse=await fetch(new URL('./assets/atlas/sandcastle/water-parameters.json',import.meta.url));
 if(!parameterResponse.ok)throw Error('Paramètres d’eau absents');const parameters=await parameterResponse.json();
 const waterType=1; // Source Clear preset, matching the shipped Water material.
 const water=parameters.waters.find(p=>p.type===waterType).defaultParameters;
 let waveType=0,waves=parameters.waves.find(p=>p.type===waveType).defaultParameters;
 const N=qualite>=1?512:256,fw=161,fh=127,offset=1,level=offset;
 const cb=new Uint32Array(640),float=new Float32Array(cb.buffer);
 const floats=(i,...v)=>float.set(v,i*4),ints=(i,...v)=>cb.set(v,i*4);
 floats(114,0,0,0,0);floats(115,zone.z,10.1,zone.w,1);floats(116,zone.z,10.1,zone.w,0);
 floats(154,zone.z/N,zone.w/N,N/zone.z,N/zone.w);ints(153,N,N,0,0);ints(155,N,N,0,0);ints(157,N,N);
 floats(158,2,.1,water.advectionFactor,.01);floats(159,0,water.damping,level,water.kappa);
 const texture=(data,w,h,type,format)=>{const t=new THREE.DataTexture(data,w,h,format,type);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;};
 const groundData=new Uint32Array(N*N*4),airData=new Uint32Array(N*N*4);
 const ground=texture(groundData,N,N,THREE.UnsignedIntType,THREE.RGBAIntegerFormat),air=texture(airData,N,N,THREE.UnsignedIntType,THREE.RGBAIntegerFormat);
 const light=texture(new Float32Array(N*N*4),N,N,THREE.FloatType,THREE.RGBAFormat);
 const mask=texture(new Float32Array([1,1,1,1]),1,1,THREE.FloatType,THREE.RGBAFormat);
 const makeTarget=()=>new THREE.WebGLRenderTarget(N,N,{type:THREE.UnsignedIntType,format:THREE.RGBAIntegerFormat,internalFormat:'RGBA32UI',minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,stencilBuffer:false});
 let current=makeTarget(),next=makeTarget();
 const field=new THREE.WebGLRenderTarget(fw,fh,{type:THREE.FloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false});
 const flow=field.clone(),cpuFlow=new Float32Array(fw*fh*4);
 const cpu=new Float32Array(fw*fh*4),brush=new Uint32Array(9),brushFloat=new Float32Array(brush.buffer);
 const uniforms={uCells:{value:ground},uGroundCells:{value:ground},uLight:{value:light},uBrush:{value:brush},cb0:{value:cb}};
 const vertex='void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}';
 const scene=new THREE.Scene(),camera=new THREE.Camera(),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
 const screen=new THREE.Mesh(geometry);screen.frustumCulled=false;scene.add(screen);
 const materials=Object.fromEntries(Object.entries(pack.programs).map(([name,code])=>[name,new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms,vertexShader:vertex,fragmentShader:code.replace('#version 300 es',''),depthTest:false,depthWrite:false,blending:THREE.NoBlending})]));
 const decode=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{uCells:uniforms.uCells,uSize:{value:new THREE.Vector2(N,N)},uLevel:{value:level},uOutput:{value:new THREE.Vector2(fw,fh)}},vertexShader:vertex,depthTest:false,depthWrite:false,blending:THREE.NoBlending,fragmentShader:`
 precision highp float;precision highp int;uniform highp usampler2D uCells;uniform vec2 uSize,uOutput;uniform float uLevel;out vec4 value;
 void main(){ivec2 ij=ivec2(clamp(gl_FragCoord.xy/uOutput,vec2(0.),vec2(.999999))*uSize);uvec4 a=texelFetch(uCells,ij,0);
 float amount=float(a.z&0xffffffu)*(10.1/16777215.);uint floorBits=(a.z>>24u)|((a.w&0xffffu)<<8u);float floorHeight=float(floorBits)*(10.1/16777215.);
 vec2 tangent=vec2(float(a.x&255u),float((a.x>>8u)&255u))*(2./255.)-1.;float ny=sqrt(max(.01,1.-dot(tangent,tangent)));
 float height=amount>.052?floorHeight+amount-uLevel:0.;value=vec4(height,-tangent/ny,float((a.w>>16u)&255u)/255.);
 }`});
 const decodeFlow=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:decode.uniforms,vertexShader:vertex,depthTest:false,depthWrite:false,blending:THREE.NoBlending,fragmentShader:`
 precision highp float;precision highp int;uniform highp usampler2D uCells;uniform vec2 uSize,uOutput;out vec4 value;
 void main(){ivec2 ij=ivec2(clamp(gl_FragCoord.xy/uOutput,vec2(0.),vec2(.999999))*uSize);uvec4 a=texelFetch(uCells,ij,0);
 uint vx=((a.x>>16u)|(a.y<<16u))&0xffffffu;uint vz=a.y>>8u;
 float amount=float(a.z&0xffffffu)*(10.1/16777215.);uint floorBits=(a.z>>24u)|((a.w&0xffffu)<<8u);
 value=vec4(vec2(float(vx),float(vz))*(8./16777215.)-4.,amount,float(floorBits)*(10.1/16777215.));}`});
 function pass(name){uniforms.uCells.value=current.texture;uniforms.uGroundCells.value=name==='UpdateAmount'?air:ground;uniforms.uLight.value=name==='Paint'?mask:light;screen.material=materials[name];renderer.setRenderTarget(next);renderer.render(scene,camera);[current,next]=[next,current];}
 function protectedRun(fn){const target=renderer.getRenderTarget(),clear=renderer.autoClear;renderer.autoClear=false;try{return fn();}finally{renderer.setRenderTarget(target);renderer.autoClear=clear;}}
 function decodeField(readback){uniforms.uCells.value=current.texture;screen.material=decode;renderer.setRenderTarget(field);renderer.render(scene,camera);screen.material=decodeFlow;renderer.setRenderTarget(flow);renderer.render(scene,camera);if(readback){renderer.readRenderTargetPixels(field,0,0,fw,fh,cpu);renderer.readRenderTargetPixels(flow,0,0,fw,fh,cpuFlow);}}
 function rebuild(bounds){const i0=bounds?Math.max(0,Math.floor((bounds.x0-zone.x)/zone.z*N)):0,i1=bounds?Math.min(N,Math.ceil((bounds.x1-zone.x)/zone.z*N)):N,j0=bounds?Math.max(0,Math.floor((bounds.z0-zone.y)/zone.w*N)):0,j1=bounds?Math.min(N,Math.ceil((bounds.z1-zone.y)/zone.w*N)):N;
 for(let j=j0;j<j1;j++)for(let i=i0;i<i1;i++){
  const x=zone.x+(i+.5)/N*zone.z,z=zone.y+(j+.5)/N*zone.w,h=Math.max(0,Math.min(10.1,carte.hauteur(x,z)+offset)),q=Math.round(h/10.1*16777215),k=(j*N+i)*4;
  groundData[k+2]=((q&0xfffff)<<12)>>>0;groundData[k+3]=q>>>20;
 }ground.needsUpdate=true;}
 let steps=0,frames=0,clock=0,lag=0,sampleTime=0;
 // The source initialization and floor update precede an equilibrium prewarm.
 rebuild();
 const fill=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{uCells:uniforms.uCells,uLevel:{value:level},uGrid:{value:N}},vertexShader:vertex,depthTest:false,depthWrite:false,blending:THREE.NoBlending,fragmentShader:'precision highp float;precision highp int;uniform highp usampler2D uCells;uniform float uLevel,uGrid;out uvec4 value;void main(){uvec4 a=texelFetch(uCells,ivec2(gl_FragCoord.xy),0);uint q=(a.z>>24u)|((a.w&0xffffu)<<8u);float h=float(q)*(10.1/16777215.);uint amount=uint(clamp(max(.05,uLevel-h)/10.1,0.,1.)*16777215.+.5);a.z=(a.z&0xff000000u)|amount;vec2 c=gl_FragCoord.xy;if(min(min(c.x,c.y),min(uGrid-c.x,uGrid-c.y))<3.)a.w|=0xf0000000u;value=a;}'});
 protectedRun(()=>{pass('Initialization');pass('UpdateFloor');uniforms.uCells.value=current.texture;screen.material=fill;renderer.setRenderTarget(next);renderer.render(scene,camera);[current,next]=[next,current];pass('UpdateTangent');decodeField(true);});
 const dtMax=Math.min(zone.z/N,zone.w/N)*.5/4;
 const sample=(x,z)=>{const i=THREE.MathUtils.clamp(Math.floor((x-zone.x)/zone.z*fw),0,fw-1),j=THREE.MathUtils.clamp(Math.floor((z-zone.y)/zone.w*fh),0,fh-1);return (j*fw+i)*4;};
 return {tex:field.texture,texFlux:flow.texture,texFond:precedent.texFond,parameters,waterType,get temps(){return clock;},
  reglerHoule(type){const preset=parameters.waves.find(p=>p.type===type);if(preset){waveType=type;waves=preset.defaultParameters;}},
  actualiserFond(bounds){rebuild(bounds);protectedRun(()=>{pass('UpdateFloor');pass('UpdateTangent');decodeField(true);});},ajouterFond(){this.actualiserFond();},
  hauteur(x,z){return cpu[sample(x,z)];},vitesse(x,z){const k=sample(x,z);return Math.hypot(cpuFlow[k],cpuFlow[k+1]);},
  impulsion(x,z,force=.08,radius=1.6){if(!Number.isFinite(x+z+force))return;protectedRun(()=>{
   for(const row of [143,144,145,146])floats(row,0,0,0,0);floats(143,1/radius,0,0,0);floats(145,0,0,1/radius,0);floats(146,-(x-zone.x-zone.z/2)/radius,0,-(z-zone.y-zone.w/2)/radius,1);floats(147,x-zone.x-zone.z/2,0,z-zone.y-zone.w/2,0);floats(149,radius,1,radius,0);ints(138,0,0,0,0);ints(151,0,6,0,0);brushFloat.fill(0);brushFloat[4]=THREE.MathUtils.clamp(force,-.2,.2);pass('Paint');});},
  diagnostic(){let max=0,wetMax=0,energy=0,finite=true,maxAt=null;for(let k=0;k<cpu.length;k+=4){const i=k/4%fw,j=Math.floor(k/4/fw),h=carte.hauteur(zone.x+(i+.5)/fw*zone.z,zone.y+(j+.5)/fh*zone.w);max=Math.max(max,Math.abs(cpu[k]));if(h<-.1){if(Math.abs(cpu[k])>wetMax){wetMax=Math.abs(cpu[k]);maxAt=[zone.x+(i+.5)/fw*zone.z,zone.y+(j+.5)/fh*zone.w,h,cpu[k]];}energy+=cpu[k]*cpu[k];}finite&&=Number.isFinite(cpu[k]);}return {moteur:'Sandcastle DXBC vers WebGL2',kernels:11,steps,frames,cellules:N*N,waveType,maxHauteur:max,maxMer:wetMax,maxAt,energy,finite,pariteComplete:false};},
  tick(dt){lag+=Math.min(Math.max(dt,0),.1);sampleTime+=dt;protectedRun(()=>{let count=0;while(lag>=1/30&&count++<3){const step=1/30,n=Math.ceil(step/dtMax),sub=step/n;clock+=step;const startup=Math.min(1,clock*.05),power=p=>Math.pow(Math.sin(clock*p.x),p.y)*p.z;float[635]=Math.max(.01,power(waves.a),power(waves.b)*startup,power(waves.c)*startup,power(waves.d)*startup);floats(113,0,0,clock,0);pass('UpdateFloor');float[630]=sub;float[631]=16;for(let i=0;i<n;i++){pass('VelocityIntegration');pass('HeightIntegration');pass('Advection');steps++;}float[630]=step;pass('UpdateAmount');pass('UpdateTangent');lag-=step;frames++;}if(count>0){decodeField(sampleTime>.2);if(sampleTime>.2)sampleTime=0;}});}
 };
}
