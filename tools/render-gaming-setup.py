import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];proof=root.parents[1]/'outputs'/'gaming-setup';cases=[('gaming-desk-user-v42',2.5,(2,-4,2.5))]
for name,extent,location in cases:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(root/'assets'/(name+'.glb')))
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=600;scene.render.resolution_percentage=100
 target=Vector((0,0,.28 if name.startswith('gaming') else .03));world=bpy.data.worlds.new('Preview');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);world.node_tree.nodes['Background'].inputs[1].default_value=.8
 if name.startswith('gaming'):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.018));bpy.context.object.scale=(1.9,.8,.028);m=bpy.data.materials.new('Desk top');m.diffuse_color=(.70,.55,.33,1);bpy.context.object.data.materials.append(m)
 bpy.ops.object.camera_add(location=location);camera=bpy.context.object;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=extent;scene.camera=camera
 bpy.ops.object.light_add(type='AREA',location=(2,-3,4));bpy.context.object.data.energy=250;bpy.context.object.data.size=3;bpy.context.object.rotation_euler=(target-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(proof/(name+'-prepared.png'));bpy.ops.render.render(write_still=True)
print('NORMALIZED_LAYOUT_RENDERED')
