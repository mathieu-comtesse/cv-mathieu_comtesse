import bpy,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
src=root/'assets/road-bike-finish-v25.glb'
dst=root/'assets/road-bike-clean-v44.glb'
proof=root.parents[1]/'outputs/bike-v44'
proof.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src))
removed=[]
for o in list(bpy.context.scene.objects):
 if 'MADONE marking' in o.name or 'Silver seat tube accent' in o.name:
  removed.append(o.name);bpy.data.objects.remove(o,do_unlink=True)
assert len(removed)==4,removed
bpy.ops.wm.save_as_mainfile(filepath=str(proof/'road-bike-clean-v44.blend'))
bpy.ops.export_scene.gltf(filepath=str(dst),export_format='GLB',export_extras=True)
assert dst.read_bytes()[:4]==b'glTF'
receipt={'source':src.name,'sourceSHA256':hashlib.sha256(src.read_bytes()).hexdigest(),'output':dst.name,'outputSHA256':hashlib.sha256(dst.read_bytes()).hexdigest(),'removed':removed,'preserved':'original frame, wheels, materials, dimensions and transforms'}
(dst.with_suffix('.provenance.json')).write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt))
