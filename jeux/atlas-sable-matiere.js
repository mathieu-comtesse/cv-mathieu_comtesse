import * as THREE from './three.module.js';
import {GLSL_CAUSTIQUES} from './atlas-eau-matiere.js?v=20261014-mediterranee';
// Ground.Run 0x44ff60 converts the serialized Refs sand palette to linear RGB.
// Palette and maps are original; lighting and moisture coupling are Atlas's.
export function creerSableSource(carte){
 const source=carte.sandcastle,p=source.sandParameters.sands.find(s=>s.type===0).defaultParameters;
 const color=v=>new THREE.Color().setRGB(v.r,v.g,v.b,THREE.SRGBColorSpace);
 const U={uSandSource:{value:source.textures.Sand},uSandDry:{value:color(p.color)},uSandDry2:{value:color(p.color2)},uSandWet:{value:color(p.wetColor)},uSandRain:{value:0},uTemps:{value:0},uOriginalCaustics:{value:source.textures.CausticsAtlas}};
 const mat=new THREE.MeshStandardMaterial({roughness:.94,envMapIntensity:.18});mat.name='Sable Sandcastle : palette Refs originale';mat.userData.sableUniformes=U;
 mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.vertexShader='varying vec3 vSandWorld;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSandWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
 sh.fragmentShader=`uniform sampler2D uSandSource;uniform vec3 uSandDry,uSandDry2,uSandWet;uniform float uSandRain,uTemps;varying vec3 vSandWorld;${GLSL_CAUSTIQUES}\n`+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float sourceGrain=texture2D(uSandSource,vSandWorld.xz*.7).r;
 vec3 drySand=mix(uSandDry2,uSandDry,sourceGrain);
 float sandMoisture=max(1.-smoothstep(-.05,.35,vSandWorld.y),uSandRain*.7);
 diffuseColor.rgb=mix(drySand,uSandWet,sandMoisture);`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.94,.53,sandMoisture);').replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 totalEmissiveRadiance+=vec3(.8,.9,.75)*caustiqueAtlas(vSandWorld.xz,uTemps)*.025*clamp(-vSandWorld.y*2.,0.,1.);`);};
 return mat;
}
