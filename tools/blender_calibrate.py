# Blender calibration run — character / NB992 reference
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

# More reliable Shujaat shoe split: use armature vertex groups instead of spatial median.
clear()
import_glb('assets/mathieu-character.glb')
shoe_objs=[o for o in bpy.context.scene.objects if o.type=='MESH' and 'shoe' in o.name.lower()]
left_pts=[]; right_pts=[]; groups_seen=set()
for obj in shoe_objs:
    M=obj.matrix_world
    group_names={i:g.name for i,g in enumerate(obj.vertex_groups)}
    groups_seen.update(group_names.values())
    for v in obj.data.vertices:
        lw=rw=0.0
        for ge in v.groups:
            name=group_names.get(ge.group,'').lower()
            if any(k in name for k in ('foot_l','ball_l','calf_l','lleg','left')):
                lw += ge.weight
            if any(k in name for k in ('foot_r','ball_r','calf_r','rleg','right')):
                rw += ge.weight
        p=M @ v.co
        if lw>rw and lw>0:
            left_pts.append(p)
        elif rw>lw and rw>0:
            right_pts.append(p)

out['shoe_vertex_groups']=sorted(groups_seen)
out['shujaat_shoe_left_weighted']=dims(left_pts)
out['shujaat_shoe_right_weighted']=dims(right_pts)
target_character_height=1.72
char_h=out['character']['max_dim']
char_scale=target_character_height/char_h
out['target_character_height']=target_character_height
out['character_normalization_scale']=char_scale
weighted=[x for x in (out.get('shujaat_shoe_left_weighted'),out.get('shujaat_shoe_right_weighted')) if x]
if weighted:
    shoe_native=sum(x['max_dim'] for x in weighted)/len(weighted)
    shoe_target=shoe_native*char_scale
    out['shujaat_target_shoe_max_dim']=shoe_target
    nb=out.get('nb992_nb_left',{}).get('max_dim') or out.get('nb992_all',{}).get('max_dim')
    if nb:
        out['recommended_runtime_nb_scale']=shoe_target/nb

with open('blender-calibration.json','w',encoding='utf8') as f:
    json.dump(out,f,indent=2)
print(json.dumps(out,indent=2))
