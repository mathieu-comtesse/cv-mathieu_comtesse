import bpy, json, math, hashlib
from mathutils import Vector, Matrix
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=Path(r"C:/Users/pihan/Downloads/1_euro_coin.glb")
output=root/"assets"/"one-euro-coin-user.glb"
proof=root.parents[1]/"outputs"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=Vector([min(p[i] for p in points) for i in range(3)])
hi=Vector([max(p[i] for p in points) for i in range(3)])
extent=hi-lo
axis=min(range(3),key=lambda i:extent[i])
normal=Vector([1 if i==axis else 0 for i in range(3)])
rotation=normal.rotation_difference(Vector((0,0,1))).to_matrix().to_4x4()
center=(lo+hi)/2
transform=Matrix.Scale(.17/max(extent),4)@rotation@Matrix.Translation(-center)
transform=Matrix.Rotation(math.pi,4,"X")@transform
for o in meshes:
 world=transform@o.matrix_world
 o.parent=None
 o.matrix_world=world
 o.select_set(True)
 bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 o.name="User_1Euro_Textured"
 for mat in o.data.materials:
  if mat and mat.use_nodes:
   bsdf=next((n for n in mat.node_tree.nodes if n.type=="BSDF_PRINCIPLED"),None)
   if bsdf:
    bsdf.inputs["Base Color"].default_value=(1,1,1,1)
    bsdf.inputs["Metallic"].default_value=.55
    bsdf.inputs["Roughness"].default_value=.38
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=str(proof/"one-euro-user.blend"))
scene=bpy.context.scene
scene.render.engine="CYCLES"
scene.cycles.samples=24
scene.render.resolution_x=420;scene.render.resolution_y=420;scene.render.resolution_percentage=100
world=bpy.data.worlds.new("Preview World");scene.world=world;world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(.7,.7,.7,1)
world.node_tree.nodes["Background"].inputs[1].default_value=.8
bpy.ops.object.camera_add(location=(.02,-.045,.26))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat("-Z","Y").to_euler()
camera.data.type="ORTHO";camera.data.ortho_scale=.22;scene.camera=camera
bpy.ops.object.light_add(type="AREA",location=(-.1,-.1,.3));bpy.context.object.data.energy=12;bpy.context.object.data.shape="DISK";bpy.context.object.data.size=.3
scene.view_settings.view_transform="AgX"
scene.render.filepath=str(proof/"one-euro-user-blender.png")
bpy.ops.render.render(write_still=True)
p=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
dim=[max(v[i] for v in p)-min(v[i] for v in p) for i in range(3)]
receipt={"source":str(source),"sourceSHA256":hashlib.sha256(source.read_bytes()).hexdigest(),"output":str(output),"outputSHA256":hashlib.sha256(output.read_bytes()).hexdigest(),"bytes":output.stat().st_size,"dimensionsBlender":dim,"triangles":sum(len(o.data.loop_triangles) for o in meshes),"materials":len(bpy.data.materials),"images":len(bpy.data.images),"normalAxisGLTF":"Y","sourcePreserved":True}
(proof/"one-euro-user-validation.json").write_text(json.dumps(receipt,indent=2))
print("COIN_VALIDATED",json.dumps(receipt))
