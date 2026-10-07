# Blender calibration run — character / JNCO jean / NB992
# Calibrates the NB992 from the original Shujaat shoe envelope instead of visual guessing.
import bpy, json
from mathutils import Vector

TARGET_HEIGHT = 1.72
RUNTIME_NB_SCALE = 1.39795

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=path)

def evaluated_world_vertices(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(deps)
    mesh = eo.to_mesh()
    M = eo.matrix_world
    pts = [M @ v.co for v in mesh.vertices]
    eo.to_mesh_clear()
    return pts

def world_vertices(objs):
    pts=[]
    for obj in objs:
        if obj.type == 'MESH':
            pts.extend(evaluated_world_vertices(obj))
    return pts

def dims(pts):
    if not pts: return None
    mn=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)))
    mx=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
    d=mx-mn
    return {'min':list(mn),'max':list(mx),'dims':list(d),'max_dim':max(d)}

def armature():
    return next((o for o in bpy.context.scene.objects if o.type=='ARMATURE'), None)

def bone_world(arm, name):
    pb = arm.pose.bones.get(name) if arm else None
    if not pb: return None
    return arm.matrix_world @ pb.head

def horizontal_forward(foot, ball):
    v = ball-foot
    v.z = 0
    if v.length < 1e-8:
        return Vector((0,1,0))
    return v.normalized()

def weighted_shoe_points():
    left=[]; right=[]; groups=set()
    for obj in [o for o in bpy.context.scene.objects if o.type=='MESH' and 'shoe' in o.name.lower()]:
        deps=bpy.context.evaluated_depsgraph_get()
        eo=obj.evaluated_get(deps)
        mesh=eo.to_mesh()
        M=eo.matrix_world
        names={i:g.name for i,g in enumerate(obj.vertex_groups)}
        groups.update(names.values())
        # Evaluated mesh vertex groups are not guaranteed to survive identically;
        # read weights from original vertices while positions come from evaluated mesh by index.
        src=obj.data.vertices
        for i,v in enumerate(mesh.vertices):
            sv=src[i] if i < len(src) else None
            lw=rw=0.0
            if sv:
                for ge in sv.groups:
                    name=names.get(ge.group,'').lower()
                    if any(k in name for k in ('foot_l','ball_l','calf_l','lleg','left')): lw += ge.weight
                    if any(k in name for k in ('foot_r','ball_r','calf_r','rleg','right')): rw += ge.weight
            p=M @ v.co
            if lw>rw and lw>0: left.append(p)
            elif rw>lw and rw>0: right.append(p)
        eo.to_mesh_clear()
    return left,right,sorted(groups)

def root_local_vertices(root):
    inv=root.matrix_world.inverted()
    pts=[]
    for obj in root.children_recursive:
        if obj.type!='MESH': continue
        for p in evaluated_world_vertices(obj):
            pts.append(inv @ p)
    if root.type=='MESH':
        for p in evaluated_world_vertices(root):
            pts.append(inv @ p)
    return pts

out={}

# Character + original Shujaat shoes.
clear()
import_glb('assets/mathieu-character.glb')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
all_pts=world_vertices(meshes)
out['character']=dims(all_pts)
raw_h=out['character']['max_dim']
char_scale=TARGET_HEIGHT/raw_h
out['target_character_height']=TARGET_HEIGHT
out['character_normalization_scale']=char_scale

arm=armature()
fl=bone_world(arm,'foot_l'); bl=bone_world(arm,'ball_l')
fr=bone_world(arm,'foot_r'); br=bone_world(arm,'ball_r')
left_pts,right_pts,groups=weighted_shoe_points()
out['shoe_vertex_groups']=groups
out['shujaat_shoe_left_weighted']=dims(left_pts)
out['shujaat_shoe_right_weighted']=dims(right_pts)

fit={}
for side,pts,foot,ball in [('left',left_pts,fl,bl),('right',right_pts,fr,br)]:
    if not pts or foot is None or ball is None: continue
    fwd=horizontal_forward(foot,ball)
    proj=[(p-foot).dot(fwd)*char_scale for p in pts]
    vertical=[(p.z-foot.z)*char_scale for p in pts]
    fit[side]={
        'foot_world_raw':list(foot),
        'ball_world_raw':list(ball),
        'forward_raw':list(fwd),
        'original_shoe_back_from_foot_m':min(proj),
        'original_shoe_front_from_foot_m':max(proj),
        'original_shoe_length_m':max(proj)-min(proj),
        'original_shoe_low_from_foot_m':min(vertical),
        'original_shoe_high_from_foot_m':max(vertical),
    }
out['original_shoe_fit']=fit

# JNCO hem, used as a second independent check.
clear()
import_glb('assets/jeans-jnco.glb')
jm=[o for o in bpy.context.scene.objects if o.type=='MESH']
jpts=world_vertices(jm)
out['jnco']=dims(jpts)
if jpts:
    zmin=min(p.z for p in jpts)
    hem=[p for p in jpts if p.z <= zmin + 0.85]  # lower ~8.5 cm after normalization
    out['jnco_hem']=dims(hem)

    jarm=armature()
    jfl=bone_world(jarm,'foot_l'); jbl=bone_world(jarm,'ball_l')
    jfr=bone_world(jarm,'foot_r'); jbr=bone_world(jarm,'ball_r')
    hem_fit={}
    if all(v is not None for v in (jfl,jbl,jfr,jbr)):
        for side,foot,ball,other in [('left',jfl,jbl,jfr),('right',jfr,jbr,jfl)]:
            fwd=horizontal_forward(foot,ball)
            # Side split by nearest ankle in the horizontal plane.
            sidepts=[]
            for p in hem:
                dl=(Vector((p.x,p.y,0))-Vector((foot.x,foot.y,0))).length
                dr=(Vector((p.x,p.y,0))-Vector((other.x,other.y,0))).length
                if dl <= dr:
                    sidepts.append(p)
            if sidepts:
                projs=sorted((p-foot).dot(fwd)*char_scale for p in sidepts)
                hem_fit[side]={
                    'back_from_foot_m':projs[0],
                    'front_from_foot_m':projs[-1],
                    'center_from_foot_m':(projs[0]+projs[-1])*0.5,
                    'median_from_foot_m':projs[len(projs)//2],
                    'count':len(projs),
                }
        out['jnco_hem_fit']=hem_fit

# NB992 local envelope, in the named root's local coordinates.
clear()
import_glb('assets/nb992.glb')
nb_all=[o for o in bpy.context.scene.objects if o.type=='MESH']
out['nb992_all']=dims(world_vertices(nb_all))
nb_local={}
for side in ('left','right'):
    root=bpy.context.scene.objects.get('nb_'+side)
    if not root: continue
    pts=root_local_vertices(root)
    if not pts: continue
    mn=Vector((min(p.x for p in pts),min(p.y for p in pts),min(p.z for p in pts)))
    mx=Vector((max(p.x for p in pts),max(p.y for p in pts),max(p.z for p in pts)))
    nb_local[side]={
        'min':list(mn),'max':list(mx),'dims':list(mx-mn),
        # Blender's glTF import maps the original Three.js shoe +Z forward axis to Blender local +Y.
        'heel_local_forward_m':mn.y,
        'toe_local_forward_m':mx.y,
        'forward_center_local_m':(mn.y+mx.y)*0.5,
        'sole_local_z_m':mn.z,
    }
out['nb992_root_local']=nb_local
out['runtime_nb_scale']=RUNTIME_NB_SCALE

# The visual defect is at the heel: align the back of the scaled NB992 with
# the rear edge of the JNCO hem opening. This keeps the shoe under the jean
# instead of centering it around the ankle bone.
recs={}
hem_fit=out.get('jnco_hem_fit',{})
for side in ('left','right'):
    if side not in hem_fit or side not in nb_local: continue
    hem_back=hem_fit[side]['back_from_foot_m']
    nb_heel=nb_local[side]['heel_local_forward_m']*RUNTIME_NB_SCALE
    rec=hem_back-nb_heel
    recs[side]={
        'jnco_hem_back_from_foot_m':hem_back,
        'nb_heel_from_root_scaled_m':nb_heel,
        'recommended_forward_root_offset_m':rec,
    }
if recs:
    vals=[v['recommended_forward_root_offset_m'] for v in recs.values()]
    out['recommended_forward_root_offset_m']=sum(vals)/len(vals)
    out['recommended_forward_root_offset_left_m']=recs.get('left',{}).get('recommended_forward_root_offset_m')
    out['recommended_forward_root_offset_right_m']=recs.get('right',{}).get('recommended_forward_root_offset_m')
out['shoe_alignment']=recs

with open('blender-calibration.json','w',encoding='utf8') as f:
    json.dump(out,f,indent=2)
print(json.dumps(out,indent=2))
