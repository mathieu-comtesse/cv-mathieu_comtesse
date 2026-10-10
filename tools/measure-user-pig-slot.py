import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1];proof=root.parents[1]/'outputs'
bpy.ops.wm.open_mainfile(filepath=str(proof/'user-pig-inspection.blend'))
body=bpy.data.objects['Object_4']
def ray(x,y):
 hit,p,n,i=body.ray_cast(Vector((x,y,4)),Vector((0,0,-1)))
 return round(p.z,5) if hit else None
profiles={'longitudinal':[(round(i*.025,3),ray(0,i*.025)) for i in range(-8,45)],'lateral':[(round(i*.01,3),ray(i*.01,.43)) for i in range(-14,15)]}
(proof/'user-pig-slot-profile.json').write_text(json.dumps(profiles,indent=2));print('SLOT_PROFILES',json.dumps(profiles))
