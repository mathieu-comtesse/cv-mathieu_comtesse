import bpy, math, json, random
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[1]
proof=root.parents[1]/"outputs"
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,color,rough=.34):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=(*color,1);p.inputs["Roughness"].default_value=rough
 p.inputs["Coat Weight"].default_value=.18;p.inputs["Coat Roughness"].default_value=.3
 return m
pink=mat("Rose céramique",(0.78,.29,.41),.36)
nosemat=mat("Museau rose doux",(.9,.43,.52),.4)
inner=mat("Creux rose",(.42,.1,.17),.48)
white=mat("Émail ivoire",(.91,.91,.86),.28)
black=mat("Pupilles peintes",(.018,.009,.014),.25)
def sphere(name,loc,scale,material,seg=40,rings=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,radius=1,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if material:o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cut(obj,tool,name):
 bpy.context.view_layer.objects.active=obj
 mod=obj.modifiers.new(name,"BOOLEAN");mod.operation="DIFFERENCE";mod.solver="EXACT";mod.object=tool
 bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(tool,do_unlink=True)
body=sphere("CeramicShell",(-.16,0,1.06),(1,.76,.84),pink,64,40)
head=sphere("Head",(.63,0,1.1),(.57,.52,.57),pink)
bpy.ops.object.select_all(action="DESELECT");body.select_set(True);head.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
mod=body.modifiers.new("Sculpted continuity","REMESH");mod.mode="VOXEL";mod.voxel_size=.035
bpy.ops.object.modifier_apply(modifier=mod.name)
sm=body.modifiers.new("Ceramic smoothing","SMOOTH");sm.factor=.7;sm.iterations=4;bpy.ops.object.modifier_apply(modifier=sm.name)
for p in body.data.polygons:p.use_smooth=True
cavity=sphere("Inner cavity",(-.16,0,1.06),(.90,.66,.73),None,48,32);cut(body,cavity,"Hollow interior")
bpy.ops.mesh.primitive_cube_add(size=1,location=(-.22,0,1.92));slot=bpy.context.object;slot.name="Slot cutter";slot.scale=(.42,.045,.46);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bev=slot.modifiers.new("Rounded slot","BEVEL");bev.width=.012;bev.segments=3;bpy.ops.object.modifier_apply(modifier=bev.name);cut(body,slot,"Real coin opening")
body.data.materials.append(inner)
for poly in body.data.polygons:
 point=body.matrix_world@poly.center;normal=body.matrix_world.to_3x3()@poly.normal
 if normal.dot(point-Vector((-.16,0,1.06)))<-.2 or (abs(point.x+.22)<.23 and abs(point.y)<.03 and point.z>1.67 and abs(normal.y)>.6):poly.material_index=1
# Subtle original color variation gives the shell a handcrafted glaze.
color=body.data.color_attributes.new(name="CeramicTint",type="FLOAT_COLOR",domain="CORNER")
random.seed(23)
for poly in body.data.polygons:
 for li in poly.loop_indices:
  v=body.data.vertices[body.data.loops[li].vertex_index].co
  f=.94+.055*math.sin(v.x*22+v.y*7)*math.cos(v.z*14)+.025*math.sin(v.x*65+v.y*47+v.z*39)
  color.data[li].color=(.78*f,.29*f,.41*f,1)
p=pink.node_tree.nodes.get("Principled BSDF");vc=pink.node_tree.nodes.new("ShaderNodeVertexColor");vc.layer_name="CeramicTint";pink.node_tree.links.new(vc.outputs["Color"],p.inputs["Base Color"])
snout=sphere("Soft oval snout",(1.16,0,1.03),(.28,.34,.25),nosemat,48,28)
for y in [-.13,.13]:
 tool=sphere("Nostril cutter",(1.41,y,1.04),(.082,.05,.067),None,24,16);cut(snout,tool,"Nostril")
 sphere("Nostril depth",(1.344,y,1.04),(.013,.041,.055),inner,20,12)
for y in [-.43,.43]:
 side=1 if y>0 else -1
 eye=sphere("Ivory painted eye",(.92,y,1.4),(.14,.053,.18),white,36,24)
 eye.rotation_euler.z=-side*.35
 pupil=sphere("Dark iris",(.962,y+side*.047,1.397),(.062,.027,.105),black,28,18);pupil.rotation_euler.z=-side*.35
 sphere("Small eye glint",(.985,y+side*.070,1.44),(.020,.010,.025),white,16,12)
# Ears are thick rounded bowls, not cones.
for side in [-1,1]:
 outline=[(-.15,-.15),(.15,-.12),(.20,.21),(.065,.44),(-.11,.37),(-.2,.12)]
 verts=[]
 for depth,amount in [(-.045,1),(.055,1),(.075,.65)]:
  for u,v in outline:verts.append((.61+depth,side*(.43+u),1.63+v*amount))
 verts.append((.61+.028,side*.43,1.74))
 faces=[]
 for ring in [0,1]:
  for i in range(6):j=(i+1)%6;faces.append((ring*6+i,ring*6+j,(ring+1)*6+j,(ring+1)*6+i))
 for i in range(6):faces.append((12+i,12+(i+1)%6,18))
 faces.append(tuple(reversed(range(6))))
 mesh=bpy.data.meshes.new("CeramicEar");mesh.from_pydata(verts,[],faces);mesh.update()
 ear=bpy.data.objects.new("Rounded concave ear",mesh);bpy.context.collection.objects.link(ear);mesh.materials.append(nosemat);mesh.materials.append(inner)
 for poly in mesh.polygons:
  poly.use_smooth=True
  if poly.index>=12 and poly.index<18:poly.material_index=1
 bpy.context.view_layer.objects.active=ear
 sub=ear.modifiers.new("Rounded ear","SUBSURF");sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
for x in [-.67,.58]:
 for y in [-.44,.44]:
  foot=sphere("Rounded foot",(x,y,.3),(.22,.19,.31),nosemat,32,20)
  sphere("Hoof tip",(x+.045,y,.10),(.20,.18,.10),pink,28,16)
curve=bpy.data.curves.new("Curled tail","CURVE");curve.dimensions="3D";curve.bevel_depth=.040;curve.bevel_resolution=3
s=curve.splines.new("POLY");s.points.add(63)
for i,point in enumerate(s.points):
 t=i/63;a=t*math.pi*3;point.co=(-1.05-.27*t,.03+math.sin(a)*.11,1.16+math.cos(a)*.11,1)
tail=bpy.data.objects.new("Handmade curled tail",curve);bpy.context.collection.objects.link(tail);tail.data.materials.append(nosemat)
bpy.context.view_layer.objects.active=tail;tail.select_set(True);bpy.ops.object.convert(target="MESH")
bpy.ops.object.empty_add(type="PLAIN_AXES",location=(-.22,0,1.895));bpy.context.object.name="CoinSlotAnchor"
meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in meshes:
 if pink in list(o.data.materials) and not o.data.color_attributes.get("CeramicTint"):
  attr=o.data.color_attributes.new(name="CeramicTint",type="FLOAT_COLOR",domain="CORNER")
  for item in attr.data:item.color=(.78,.29,.41,1)
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:o.select_set(True)
bpy.data.objects["CoinSlotAnchor"].select_set(True)
output=root/"assets"/"ceramic-piggy-bank.glb"
bpy.ops.export_scene.gltf(filepath=str(output),export_format="GLB",use_selection=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(proof/"ceramic-piggy-bank.blend"))
# Preview with the supplied coin, correctly sized for the real slot.
bpy.ops.import_scene.gltf(filepath=str(root/"assets"/"one-euro-coin-user.glb"))
coins=[o for o in bpy.context.selected_objects if o.type=="MESH"]
for o in coins:
 world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
 bpy.context.view_layer.objects.active=o
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 o.rotation_euler.x=math.pi/2;o.scale=(.32/.17,)*3;o.location=(-.22,0,2.28)
bpy.ops.object.camera_add(location=(3.8,-5.8,3.4));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.35))-camera.location).to_track_quat("-Z","Y").to_euler();camera.data.type="ORTHO";camera.data.ortho_scale=3.6;bpy.context.scene.camera=camera
for pos,energy,size in [((2,-4,6),500,5),((-3,2,4),300,4)]:
 bpy.ops.object.light_add(type="AREA",location=pos);l=bpy.context.object;l.data.energy=energy;l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat("-Z","Y").to_euler()
scene=bpy.context.scene;scene.world=bpy.data.worlds.new("Soft ambient");scene.world.color=(.35,.35,.35);scene.render.engine="CYCLES";scene.cycles.samples=24;scene.render.film_transparent=True
scene.render.resolution_x=760;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.filepath=str(proof/"ceramic-piggy-blender.png")
bpy.ops.render.render(write_still=True)
for o in meshes:o.data.calc_loop_triangles()
report={"file":str(output),"bytes":output.stat().st_size,"triangles":sum(len(o.data.loop_triangles) for o in meshes),"slot":{"length":.42,"width":.045,"anchorBlender":[-.22,0,1.895]},"coin":{"diameter":.32,"thickness":.009254978*.32/.17},"creation":"Original Blender geometry and vertex glaze, no Sketchfab extraction","transparent":True}
(proof/"ceramic-piggy-validation.json").write_text(json.dumps(report,indent=2))
print("CERAMIC_PIG_OK",json.dumps(report))
