import bpy, json, math
from mathutils import Vector

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=path)

def world_vertices(objs):
    deps = bpy.context.evaluated_depsgraph_get()
    pts=[]
    for obj in objs:
        if obj.type != 'MESH':
            continue
        eo=obj.evaluated_get(deps)
        mesh=eo.to_mesh()
        M=eo.matrix_world
        for v in mesh.vertices:
            pts.append(M @ v.co)
        eo.to_mesh_clear()
    return pts

def dims(pts):
    if not pts: return None
    mn=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)))
    mx=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
    d=mx-mn
    return {'min':list(mn),'max':list(mx),'dims':list(d),'max_dim':max(d)}

out={}

clear()
import_glb('assets/mathieu-character.glb')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
out['character']=dims(world_vertices(meshes))
shoe_objs=[o for o in meshes if 'shoe' in o.name.lower()]
pts=world_vertices(shoe_objs)
out['shujaat_shoes_pair']=dims(pts)
if pts:
    xs=sorted(p.x for p in pts)
    med=xs[len(xs)//2]
    left=[p for p in pts if p.x<=med]
    right=[p for p in pts if p.x>med]
    out['shujaat_shoe_left_cluster']=dims(left)
    out['shujaat_shoe_right_cluster']=dims(right)

clear()
import_glb('assets/nb992.glb')
nb_objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
out['nb992_all']=dims(world_vertices(nb_objs))
for o in nb_objs:
    if 'left' in o.name.lower() or 'right' in o.name.lower():
        out['nb992_'+o.name]=dims(world_vertices([o]))

# Compare the largest per-shoe Shujaat cluster with the largest NB shoe dimension.
sh_candidates=[out.get('shujaat_shoe_left_cluster'),out.get('shujaat_shoe_right_cluster')]
sh_candidates=[x for x in sh_candidates if x]
nb_candidates=[v for k,v in out.items() if k.startswith('nb992_') and k!='nb992_all' and isinstance(v,dict)]
if sh_candidates and nb_candidates:
    sh=max(x['max_dim'] for x in sh_candidates)
    nb=max(x['max_dim'] for x in nb_candidates)
    if nb>0:
        out['recommended_nb_scale']=sh/nb

with open('blender-calibration.json','w',encoding='utf8') as f:
    json.dump(out,f,indent=2)
print(json.dumps(out,indent=2))
