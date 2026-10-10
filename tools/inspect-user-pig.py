import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1]
proof=root.parents[1]/'outputs'
source=Path(r'C:/Users/pihan/Downloads/piggy_bank.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
p=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=Vector([min(v[i] for v in p) for i in range(3)]);hi=Vector([max(v[i] for v in p) for i in range(3)])
scale=2.65/max(hi-lo)
transform=Matrix.Scale(scale,4)@Matrix.Translation(Vector((-(hi.x+lo.x)/2,-(hi.y+lo.y)/2,-lo.z)))
for o in meshes:
 m=transform@o.matrix_world;o.parent=None;o.matrix_world=m
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 o.select_set(False)
bpy.ops.wm.save_as_mainfile(filepath=str(proof/'user-pig-inspection.blend'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20
scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.film_transparent=True
world=bpy.data.worlds.new('Preview');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.8,.8,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.camera_add(location=(4,-6,4.5));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=3.7;scene.camera=cam
cam.rotation_euler=(Vector((0,0,1.2))-cam.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in [((3,-4,5),550,5),((-3,2,4),350,3)]:
 bpy.ops.object.light_add(type='AREA',location=pos);bpy.context.object.data.energy=power;bpy.context.object.data.size=size
 bpy.context.object.rotation_euler=(Vector((0,0,1.2))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(proof/'user-pig-inspection.png');bpy.ops.render.render(write_still=True)
cam.location=(0,0,7);cam.rotation_euler=(0,0,0);scene.render.filepath=str(proof/'user-pig-top.png');bpy.ops.render.render(write_still=True)
print('USER_PIG_DIMENSIONS',json.dumps({'sourceLo':list(lo),'sourceHi':list(hi),'scale':scale,'normalizedDimensions':list((hi-lo)*scale),'objects':[(o.name,len(o.data.vertices)) for o in meshes]}))
