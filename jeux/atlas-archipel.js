import * as THREE from './three.module.js';

export function creerArchipel(M){
 const cx=-30,cz=15,rx=6.5,rz=4.8;
 function hauteur(x,z){const u=x-cx,v=z-cz,a=Math.atan2(v,u),r=Math.hypot(u/rx,v/rz)/(1+.13*Math.sin(a*3+.5)+.07*Math.sin(a*5-1));if(r>1.2)return -50;return .74-THREE.MathUtils.smoothstep(r,.69,1.08)*2.45+.025*Math.sin(u*2.1)*Math.sin(v*1.8);}
 const N=160,geo=new THREE.PlaneGeometry(rx*2.4,rz*2.4,N,N).rotateX(-Math.PI/2),p=geo.attributes.position,colors=new Float32Array(p.count*3),dry=new THREE.Color('#e6c99b'),wet=new THREE.Color('#aa9068');
 for(let i=0;i<p.count;i++){const x=p.getX(i)+cx,z=p.getZ(i)+cz,h=Math.max(-2.3,hauteur(x,z));p.setXYZ(i,x,h,z);const c=wet.clone().lerp(dry,THREE.MathUtils.smoothstep(h,-.06,.55));const g=.98+.02*Math.sin(x*71+z*27);colors.set([c.r*g,c.g*g,c.b*g],i*3);}
 geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.computeVertexNormals();geo.computeBoundingSphere();
 const mat=new THREE.MeshStandardMaterial({roughness:.94});
 mat.onBeforeCompile=s=>{s.uniforms.uSourceSand={value:M.carte.sandcastle.textures.Sand};s.vertexShader='varying vec3 vNacre;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNacre=transformed;');s.fragmentShader='uniform sampler2D uSourceSand;varying vec3 vNacre;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=texture2D(uSourceSand,vNacre.xz*.7).r;vec3 dry=mix(vec3(.9254902,.8862745,.7254902),vec3(.9294118,.8980392,.7529412),grain);diffuseColor.rgb=mix(vec3(.906,.8103758,.633294),dry,smoothstep(-.06,.55,vNacre.y));');};
 const groupe=new THREE.Group(),mesh=new THREE.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;groupe.add(mesh);M.scene.add(groupe);
 const bois=new THREE.MeshStandardMaterial({color:'#8c663e',roughness:.88});
 const tablier=new THREE.Mesh(new THREE.BoxGeometry(1.1,.12,2.8),bois);tablier.position.set(cx+1,.57,cz-4.9);tablier.castShadow=tablier.receiveShadow=true;groupe.add(tablier);
 for(const z of [cz-3.9,cz-4.9,cz-5.9])for(const x of [cx+.52,cx+1.48]){const fond=Math.max(-2,hauteur(x,z)),top=.8;const pieu=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,top-fond,10),bois);pieu.position.set(x,(top+fond)/2,z);pieu.castShadow=true;groupe.add(pieu);}
 const vieux=M.carte.hauteur.bind(M.carte);M.carte.hauteur=(x,z)=>Math.max(vieux(x,z),hauteur(x,z));M.dio.ajouterFond(hauteur);
 M.meta.refonte.atelier={c:[cx,cz],largeur:10.8,profondeur:7.8};
 Object.assign(M.soleil.shadow.camera,{left:-43,right:24,top:32,bottom:-28});M.soleil.shadow.camera.updateProjectionMatrix();
 const archipel={groupe,mesh,hauteur,c:[cx,cz],rayons:[rx,rz],separation:Math.hypot(cx-M.ilot.x,cz-M.ilot.z)-rx-M.ilot.r};M.archipel=archipel;return archipel;
}

export async function creerPassage(J){
 const {creerAtelierIle}=await import('./atlas-atelier-ile.js?v=20261019-nacre-tranche-2');
 const A=await creerAtelierIle(J);
 const options=document.createElement('details');options.className='atlas-options';options.innerHTML='<summary>Options</summary><div></div>';J.hote.append(options);
 for(const id of ['world-pause','world-log','world-photo','world-sound']){const b=document.getElementById(id);if(b)options.querySelector('div').append(b);}
 return A;
}
