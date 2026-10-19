import * as THREE from './three.module.js';

// Source: Strata #212, BordersGroundFront #7 / shader #584 subprogram 6,
// BordersWaterFront #8 / shader #577 subprogram 6. Scene lighting is Atlas's.
export async function creerCoupe(M){
 const response=await fetch(new URL('./assets/atlas/sandcastle/cutaway-parameters.json',import.meta.url));
 if(!response.ok)throw Error('Matériaux de coupe absents');const source=await response.json();
 const bounds={x0:-39,x1:21,z0:-27,z1:33},bottom=-2.65,U=M.dio.surface.material.uniforms;
 const group=new THREE.Group();group.name='Coupe Sandcastle : strates originales';M.scene.add(group);
 M.dio.decouper(bounds);
 const bed=M.fondReel.groupe.children.find(o=>o.isMesh&&!o.isInstancedMesh),oldBed=bed.geometry;
 bed.geometry=new THREE.PlaneGeometry(60,60,240,240).rotateX(-Math.PI/2);
 const p=bed.geometry.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i)-9,z=p.getZ(i)+3;p.setXYZ(i,x,-M.fondReel.depth(x,z),z);}
 bed.geometry.computeVertexNormals();bed.geometry.computeBoundingSphere();oldBed.dispose();
 const material=name=>source.materials.find(r=>r.material.name===name);
 const colors=Object.fromEntries(material('BordersGroundFront').colors);
 const color=key=>{const c=colors[key];return new THREE.Color().setRGB(c.r,c.g,c.b,THREE.SRGBColorSpace);};
 const strata=M.carte.sandcastle.textures.Strata;
 // DXT1 is decoded without repainting. The shader samples its scalar red channel.
 const ground=new THREE.MeshStandardMaterial({roughness:1,envMapIntensity:.12});
 ground.name='BordersGroundFront : Strata #212';
 ground.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{uStrata:{value:strata},uRockA:{value:color('rockColor')},uRockB:{value:color('rockColor2')}});
  shader.vertexShader='varying vec3 vCut;varying float vCutGround;attribute float cutGround;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCut=position;vCutGround=cutGround;');
  shader.fragmentShader='uniform sampler2D uStrata;uniform vec3 uRockA,uRockB;varying vec3 vCut;varying float vCutGround;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=texture2D(uStrata,vec2(dot(vCut.xz,vec2(.02)),(vCut.y-vCutGround)*.5)).r;
   diffuseColor.rgb=clamp(mix(uRockA,uRockB,grain),0.,1.);`);
 };
 // All four sides have outward normals. Water tops sample the exact same GPU
 // field as the horizontal surface: no separate sine animation at the seam.
 const sides=[[[bounds.x0,bounds.z0],[bounds.x1,bounds.z0]],[[bounds.x1,bounds.z0],[bounds.x1,bounds.z1]],[[bounds.x1,bounds.z1],[bounds.x0,bounds.z1]],[[bounds.x0,bounds.z1],[bounds.x0,bounds.z0]]];
 function walls(water){
  const vertices=[],heights=[],fractions=[],indices=[],segments=240;
  for(const [a,b] of sides)for(let i=0;i<=segments;i++){
   const f=i/segments,x=THREE.MathUtils.lerp(a[0],b[0],f),z=THREE.MathUtils.lerp(a[1],b[1],f),h=-M.fondReel.depth(x,z),k=vertices.length/3;
   vertices.push(x,water?h:bottom,z,x,water?0:h,z);heights.push(h,h);fractions.push(0,1);
   if(i<segments)indices.push(k,k+1,k+2,k+2,k+1,k+3);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('cutGround',new THREE.Float32BufferAttribute(heights,1));g.setAttribute('waterTop',new THREE.Float32BufferAttribute(fractions,1));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const soil=new THREE.Mesh(walls(false),ground);soil.receiveShadow=true;soil.name='Tranche de terrain';group.add(soil);
 const underside=new THREE.Mesh(new THREE.PlaneGeometry(60,60).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:color('rockColor2'),roughness:1}));underside.position.set(-9,bottom,3);group.add(underside);
 const waterGeometry=walls(true),waterVertex=`uniform sampler2D uHoule;uniform vec4 uHouleZone;attribute float waterTop;varying vec3 vCutWorld;
 void main(){vec3 p=position;float wave=texture2D(uHoule,(p.xz-uHouleZone.xy)/uHouleZone.zw).r;p.y=mix(p.y,wave,waterTop);vCutWorld=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
 const water=new THREE.ShaderMaterial({uniforms:{uHoule:U.uHoule,uHouleZone:U.uHouleZone,uScene:U.uScene,uDepth:U.uDepth,uResolution:U.uResolution,uInvVP:U.uInvVP,uCutColor:{value:color('waterColor')},uCutScattering:{value:color('waterScatteringColor')}},vertexShader:waterVertex,fragmentShader:`uniform sampler2D uScene,uDepth;uniform vec2 uResolution;uniform mat4 uInvVP;uniform vec3 uCutColor,uCutScattering;varying vec3 vCutWorld;
 void main(){vec2 uv=gl_FragCoord.xy/uResolution;float depth=texture2D(uDepth,uv).r;vec4 p=uInvVP*vec4(uv*2.-1.,depth*2.-1.,1.);float d=length(p.xyz/p.w-vCutWorld);
 gl_FragColor=vec4(texture2D(uScene,uv).rgb*exp2(-d*uCutScattering*8.656169891357422)*uCutColor,1.);}`,side:THREE.FrontSide});
 water.name='BordersWaterFront : absorption source';
 const waterSides=new THREE.Mesh(waterGeometry,water);waterSides.name='Eau en coupe : houle partagée';waterSides.frustumCulled=false;waterSides.renderOrder=-2;M.dio.groupe.add(waterSides);
 const backColor=Object.fromEntries(material('BordersBack').colors).backgroundColor;
 const back=new THREE.Mesh(waterGeometry,new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(backColor.r,backColor.g,backColor.b,THREE.SRGBColorSpace),side:THREE.BackSide}));back.name='Fond de coupe';group.add(back);
 // Cull legacy underwater decorations outside the finite board.
 let outside=0;
 const contains=(x,z,margin=0)=>x>=bounds.x0+margin&&x<=bounds.x1-margin&&z>=bounds.z0+margin&&z<=bounds.z1-margin;
 M.sourceSandcastle.group.traverse(o=>{if(o.isMesh&&!contains(o.position.x,o.position.z,.25)){o.visible=false;outside++;}});
 M.fondReel.groupe.traverse(o=>{if(o.isInstancedMesh){o.visible=false;outside+=o.count;}});
 const navigable=M.navigable;M.navigable=(x,z)=>contains(x,z,1.5)&&navigable(x,z);
 return {bounds,groupe:group,waterSides,contains,diagnostic:()=>({format:[60,60],epaisseur:2.65,texture:'Strata',sourcePathId:212,textureSHA256:source.texture.pngSHA256,sourcePreserve:source.sourceUnchanged,horizonMasque:!M.dio.horizon.visible,houlePartagee:water.uniforms.uHoule===U.uHoule,decorationsHorsCadreMasquees:outside,pariteComplete:false})};
}
