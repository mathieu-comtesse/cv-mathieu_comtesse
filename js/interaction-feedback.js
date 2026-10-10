import {THREE} from './kit.js?v=cv-scene-v29';
// Material feedback adds no render passes; movement uses the same timing and 3% pulse as the JBL speakers.
export function createInteractionFeedback(world,ids){
 const entries=[],seen=new WeakSet(),warm=new THREE.Color('#ffe6a0'),lift=new THREE.Color(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function register(){
  const roots=[];world.traverse(o=>{if(ids.has(o.userData.id)&&!seen.has(o)){let p=o.parent;while(p&&p!==world){if(p.userData.id===o.userData.id)return;p=p.parent;}roots.push(o);}});
  for(const root of roots){
   seen.add(root);const mats=[],copies=new Map();let childAction=false;
   root.traverse(o=>{if(o!==root&&ids.has(o.userData.id))childAction=true;if(!o.isMesh||o.userData.ink||o.userData.isInk||o.userData.noInteractionFeedback)return;
    const copy=m=>{if(!m||m.userData.unique||m.transparent||m.isShaderMaterial)return m;if(!copies.has(m)){const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;c.userData.unique=true;copies.set(m,c);mats.push({m:c,color:c.color?.clone(),emissive:c.emissive?.clone(),intensity:c.emissiveIntensity});}return copies.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
   });
   let outline=null;
   if(!mats.length&&root.isMesh&&['ps1power','deskstrip'].includes(root.userData.id)&&!root.material.transparent){
    const m=new THREE.MeshBasicMaterial({color:'#ffe6a0',side:THREE.BackSide,transparent:true,opacity:.2,depthWrite:false});
    m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>'+String.fromCharCode(10)+'transformed+=normal*.003;');};m.customProgramCacheKey=()=> 'interactive-switch-outline-v52';
    outline=new THREE.Mesh(root.geometry,m);outline.userData.noInteractionFeedback=true;outline.userData.isInk=true;outline.raycast=()=>{};root.add(outline);
   }
   entries.push({outline,root,id:root.userData.id,scale:root.scale.clone(),mats,moves:!childAction&&!/^shoji/.test(root.userData.id),pulse:1});
  }
 }
 function update(t,hovered,active,locked){
  for(const e of entries){
   const hot=!locked&&hovered===e.id;if(e.outline)e.outline.material.opacity=hot?.75:.2;
   for(const x of e.mats){
    if(x.emissive){lift.copy(warm).multiplyScalar(hot?.18:.055);x.m.emissive.copy(x.emissive).add(lift);x.m.emissiveIntensity=Math.max(x.intensity??1,1);}
    else if(x.color)x.m.color.copy(x.color).lerp(warm,hot?.14:.035);
   }
   // Do not move furniture supporting the character, equipment in use, or JBLs already driven by audio.
   const paused=locked||reduced.matches||e.id===active||(active==='desk'&&['pc','chair'].includes(e.id))||['jbl','speaker'].includes(e.id);
   const pulse=e.moves&&!paused?1+Math.max(0,Math.sin(t*9))*.03:1;
   if(pulse!==e.pulse){e.root.scale.copy(e.scale);e.root.scale.y*=pulse;e.pulse=pulse;}
   e.root.userData.interactionHighlighted=true;
  }
 }
 return{register,update,entries};
}
