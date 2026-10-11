import {GLTFLoader} from 'three/addons/GLTFLoader.js';
export async function loadProjectModel(id,packed){
 const loader=new GLTFLoader();if(!packed)return loader.loadAsync('assets/dioramas/'+id+'.glb?v=cv-projects-v2b');
 const response=await fetch('assets/dioramas-v2/'+id+'.glb.gz?v=cv-projects-v2b');if(!response.ok)throw Error('Modèle indisponible : '+id);
 const input=new Uint8Array(await response.arrayBuffer());
 // Some hosts already decompress responses according to Content-Encoding.
 const bytes=input[0]===31&&input[1]===139?await new Response(new Blob([input]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():input.buffer;
 return loader.parseAsync(bytes,'assets/dioramas-v2/');
}
