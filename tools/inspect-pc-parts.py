import bpy,json
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1];proof=root.parents[1]/'outputs'/'room-props'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=r'C:/Users/pihan/Downloads/computer_props_camera_base.glb')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render];deps=bpy.context.evaluated_depsgraph_get()
for o in meshes:
 matrix=o.matrix_world.copy();data=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps);o.modifiers.clear();o.data=data;o.parent=None;o.matrix_world=matrix
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.resolution_x=300;scene.render.resolution_y=240;scene.render.resolution_percentage=100
world=bpy.data.worlds.new('Preview');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.65,.65,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(1,-2,3));bpy.context.object.data.energy=150;bpy.context.object.data.size=3
for obj in meshes:
 for o in meshes:o.hide_render=o!=obj
 p=[obj.matrix_world@v.co for v in obj.data.vertices];lo=Vector([min(v[i] for v in p) for i in range(3)]);hi=Vector([max(v[i] for v in p) for i in range(3)]);center=(lo+hi)/2;extent=max(hi-lo)
 cam.location=center+Vector((1,-1.8,1.2))*max(extent,1);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=max(extent*1.65,.05)
 scene.render.filepath=str(proof/('pc-part-'+obj.name+'.png'));bpy.ops.render.render(write_still=True)
print('PC_PARTS_RENDERED')
