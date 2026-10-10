import bpy,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name in ['magnavox-tv-user-v43','dream-pc-user-v43']:
 bpy.ops.wm.read_factory_settings(use_empty=True);p=root/'assets'/(name+'.glb');bpy.ops.import_scene.gltf(filepath=str(p))
 for im in bpy.data.images:
  w,h=im.size
  if max(w,h)>512:im.scale(round(w*512/max(w,h)),round(h*512/max(w,h)));im.pack()
 for mat in bpy.data.materials:
  if mat.use_nodes:
   bs=mat.node_tree.nodes.get('Principled BSDF')
   if bs and bs.inputs['Transmission Weight'].default_value>0:
    bs.inputs['Transmission Weight'].default_value=0;bs.inputs['Alpha'].default_value=.10
 bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',export_extras=True);r=json.loads(p.with_suffix('.provenance.json').read_text());r['textureLimit']=512;r['bytes']=p.stat().st_size;r['outputSHA256']=hashlib.sha256(p.read_bytes()).hexdigest()
 if name.startswith('dream'):r['changes']['oldGpuBounds']=[[-3.97541475,3.07541609,-5.19437838],[4.33828163,4.36609602,-1.23167491]]
 p.with_suffix('.provenance.json').write_text(json.dumps(r,indent=2));print('COMPACT',name,r['bytes'])
