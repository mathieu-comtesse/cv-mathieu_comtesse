// Semantic port of Sandcastle Lit/Water ps_5_0 (shader #587, subprogram 4).
// Source normals, flow phases, absorption, Fresnel and specular exponent.
// Camera reconstruction, island shadows and sky are supplied by Atlas.
export const GLSL_EAU_SOURCE = `
uniform float uNativeWater,uNativeTime,uNativeRefraction;
uniform sampler2D uNativeFlow;
uniform vec3 uNativeColor,uNativeScattering;
uniform mat4 uInvVP;
vec3 positionOpaque(vec2 uv,float depth){
 vec4 p=uInvVP*vec4(uv*2.-1.,depth*2.-1.,1.);return p.xyz/p.w;
}
vec3 normalSource(vec2 p,vec2 velocity,vec3 base){
 float phase=texture2D(uOriginalNormal,p*.05).b+uNativeTime*.8;
 vec2 speed=clamp(velocity,vec2(-.5),vec2(.5));
 float f=fract(phase),a=fract(phase+.5)*2.-1.;
 vec2 nA=texture2D(uOriginalNormal,(p-speed*a)*.2+.25).rg;
 vec2 nB=texture2D(uOriginalNormal,(p-speed*(f*2.-1.))*.2-.25).rg;
 vec2 n=mix(nB,nA,abs(f-.5)*2.)*2.-1.;
 return normalize(base+vec3(n.x,sqrt(max(0.,1.-dot(n,n))),n.y));
}
vec4 couleurEauSource(vec3 world,vec4 field){
 vec2 simulationUV=(world.xz-uHouleZone.xy)/uHouleZone.zw;
 vec4 flow=texture2D(uNativeFlow,simulationUV);
 float film=max(flow.z-.05,0.);
 if(film<.00001)discard;
 vec3 base=normalize(vec3(-field.g,1.,-field.b));
 vec3 N=normalSource(world.xz,flow.xy,base),V=normalize(uCam-world);
 vec2 screen=gl_FragCoord.xy/uResolution;
 vec2 refracted=clamp(screen+N.xz*uNativeRefraction*vec2(1.,uResolution.x/uResolution.y),vec2(.001),vec2(.999));
 float opaqueDepth=texture2D(uDepth,refracted).r;
 if(linearDepth(opaqueDepth)<linearDepth(gl_FragCoord.z)){refracted=screen;opaqueDepth=texture2D(uDepth,refracted).r;}
 float facing=clamp(dot(V,N),0.,1.);
 float distanceInWater=length(positionOpaque(refracted,opaqueDepth)-world);
 vec3 transmission=exp2(-distanceInWater*uNativeScattering*8.656169891357422);
 vec3 color=texture2D(uScene,refracted).rgb*transmission*uNativeColor;
 color*=.9+.2*pow(facing,6.);
 float shadow=1.;vec3 L=normalize(uSunDir);
 for(int i=1;i<=20;i++){vec3 q=world+L*(float(i)*.85);float h=haut(q.xz);if(h>q.y+.05&&h>-20.)shadow=0.;}
 vec3 background=couleurCiel(vec3(0.,.2,0.));
 color=mix(color,background,pow(1.-facing,5.)*min(shadow+.25,1.)*.75);
 float specular=pow(clamp(dot(N,normalize(V+L)),0.,1.),1500.);
 color+=specular*uSunCol*shadow;
 return vec4(color,clamp(film*100.,0.,1.));
}`;
