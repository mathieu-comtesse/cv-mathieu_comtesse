import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];proof=root.parents[1]/'outputs'/'gaming-setup';proof.mkdir(exist_ok=True)
names=['gaming_setup_v2_low-poly']
receipts=[]
for name in names:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 source=Path('C:/Users/pihan/Downloads')/(name+'.glb');bpy.ops.import_scene.gltf(filepath=str(source))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];deps=bpy.context.evaluated_depsgraph_get()
 # Bake the provided static pose, including any skin, without altering the source.
 for o in meshes:
  matrix=o.matrix_world.copy();data=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps);o.modifiers.clear();o.data=data;o.parent=None;o.matrix_world=matrix
 objects=[]
 for o in meshes:
  p=[o.matrix_world@v.co for v in o.data.vertices];lo=[min(v[i] for v in p) for i in range(3)];hi=[max(v[i] for v in p) for i in range(3)]
  o.data.calc_loop_triangles();objects.append({'name':o.name,'lo':lo,'hi':hi,'triangles':len(o.data.loop_triangles),'materials':[m.name for m in o.data.materials]})
 allp=[o.matrix_world@v.co for o in meshes for v in o.data.vertices];lo=Vector([min(v[i] for v in allp) for i in range(3)]);hi=Vector([max(v[i] for v in allp) for i in range(3)]);center=(lo+hi)/2;scale=2.6/max(hi-lo)
 record={'name':name,'hash':hashlib.sha256(source.read_bytes()).hexdigest(),'bounds':{'lo':list(lo),'hi':list(hi)},'objects':objects,'images':[(i.name,list(i.size)) for i in bpy.data.images]};receipts.append(record)
 for o in meshes:o.matrix_world=Matrix.Scale(scale,4)@Matrix.Translation(-center)@o.matrix_world
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=900 if name=='computer_props_camera_base' else 900;scene.render.resolution_y=600 if name=='computer_props_camera_base' else 700;scene.render.resolution_percentage=100
 world=bpy.data.worlds.new('Preview');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.65,.65,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
 bpy.ops.object.camera_add(location=(4,-6,4));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.8;scene.camera=cam;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
 for pos,power,size in [((3,-4,5),500,4),((-3,2,4),350,3)]:
  bpy.ops.object.light_add(type='AREA',location=pos);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=size;lamp.rotation_euler=(-lamp.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(proof/(name+'.png'));bpy.ops.render.render(write_still=True)
 if name=='computer_props_camera_base':
  cam.location=(0,-7,3);cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(proof/(name+'-front.png'));bpy.ops.render.render(write_still=True)
(proof/'source-inspection.json').write_text(json.dumps(receipts,indent=2));print('PROPS_INSPECTED',json.dumps([{'name':r['name'],'bounds':r['bounds'],'triangles':sum(o['triangles'] for o in r['objects'])} for r in receipts]))
