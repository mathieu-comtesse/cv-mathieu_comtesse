import bpy,os,json,hashlib
from mathutils import Vector
root=os.getcwd();assets=root+'/assets';report=[]
files=['monitor-ultrawide-curved-panel','monitor-portrait-panel','humanscale-m2-arm','desk-webcam','gaming-pc','road-bike-finish','ekstrem','ds450','setu']
def bounds():
    p=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in o.bound_box]
    return [[min(v[i] for v in p) for i in range(3)],[max(v[i] for v in p) for i in range(3)]]
def triangles():
    return sum(len(o.data.loop_triangles) for o in bpy.context.scene.objects if o.type=='MESH')
for name in files:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    source=assets+'/'+name+'.glb';bpy.ops.import_scene.gltf(filepath=source)
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.data.calc_loop_triangles()
    before=triangles();bb=bounds()
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH' or len(o.data.loop_triangles)<1200 or 'Screen' in o.name:continue
        bpy.context.view_layer.objects.active=o
        if o.data.users>1:o.data=o.data.copy()
        mod=o.modifiers.new('Display-scale simplification','DECIMATE');mod.ratio=.40 if name not in ['setu','ekstrem'] else .65
        mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name);o.data.calc_loop_triangles()
    after=triangles();ab=bounds();err=max(abs(ab[j][i]-bb[j][i]) for j in range(2) for i in range(3))
    assert err<.025,(name,err)
    dest=assets+'/'+name+'-v25.glb';bpy.ops.export_scene.gltf(filepath=dest,export_format='GLB',export_animations=False)
    report.append({'asset':name,'sourceTriangles':before,'triangles':after,'boundsMaxDelta':err,'bytes':os.path.getsize(dest),'sha256':hashlib.sha256(open(dest,'rb').read()).hexdigest()})
json.dump(report,open(root+'/outputs/room-optimization-v25.json','w'),indent=2)
print('ROOM_LOD_V25_OK')
