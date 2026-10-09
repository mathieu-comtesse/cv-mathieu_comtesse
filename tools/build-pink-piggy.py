import bpy, math, json, os
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(root,"assets","pink-piggy-bank.glb")
preview=os.path.join(root,"..","..","outputs","pink-piggy-blender.png")
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.3):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
pink=mat("Rose porcelaine",(0.91,.34,.48),0,.28)
nose=mat("Museau rose tendre",(1,.48,.61),0,.3)
inner=mat("Intérieur oreilles",(.68,.16,.29),0,.45)
black=mat("Yeux et fente",(.045,.025,.045),0,.32)
hooves=mat("Sabots rosés",(.61,.17,.32),0,.4)
gold=mat("Pièces or",(1,.62,.13),.65,.26)
def ico(name,location,scale,material,sub=2):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=location);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cube(name,location,scale,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);return o
def cyl(name,location,radius,depth,material,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=depth,location=location,rotation=rotation);o=bpy.context.object;o.name=name;o.data.materials.append(material)
 bevel=o.modifiers.new("Bords doux","BEVEL");bevel.width=.025;bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 for p in o.data.polygons:p.use_smooth=True
 return o
ico("PigBody",(-.12,0,.83),(1,.61,.64),pink,3)
ico("PigHead",(.76,0,.94),(.49,.49,.48),pink)
snout=cyl("PigSnout",(1.18,0,.84),.28,.17,nose,(0,math.pi/2,0));snout.scale.y=1.25
for y in [-.105,.105]:
 ico("Nostril",(1.273,y,.85),(.018,.042,.060),inner,1)
for y in [-.41,.41]:
 ico("Eye",(.93,y,1.12),(.052,.043,.061),black,2)
 ico("EyeHighlight",(.951,y-.007,1.138),(.013,.013,.015),bpy.data.materials.get("Blanc") or mat("Blanc",(1,1,1)),1)
for x in [-.63,.55]:
 for y in [-.37,.37]:
  ico("Leg",(x,y,.29),(.17,.16,.25),pink,2)
  ico("Hoof",(x+.015,y,.105),(.18,.17,.10),hooves,2)
for y in [-.31,.31]:
 bpy.ops.mesh.primitive_cone_add(vertices=3,radius1=.26,radius2=.025,depth=.43,location=(.64,y,1.45));o=bpy.context.object;o.name="Ear";o.rotation_euler=(.2 if y<0 else -.2,-.3,0);o.scale=(.72,.8,1);o.data.materials.append(pink)
 ico("InnerEar",(.69,y-.035 if y<0 else y+.035,1.47),(.07,.07,.14),inner,1)
cube("CoinSlot",(-.11,0,1.472),(.36,.06,.018),black)
curve=bpy.data.curves.new("Queue bouclée","CURVE");curve.dimensions="3D";curve.bevel_depth=.038;curve.bevel_resolution=2
s=curve.splines.new('POLY');s.points.add(39)
for i,p in enumerate(s.points):
 a=i/39*math.pi*3;p.co=(-1.07-i/39*.16,.06+math.sin(a)*.105,1.0+math.cos(a)*.105,1)
o=bpy.data.objects.new("PigTail",curve);bpy.context.collection.objects.link(o);o.data.materials.append(pink)
bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target="MESH");o.select_set(False)
pig=[o for o in bpy.context.scene.objects if o.type=="MESH"]
for o in pig:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out,export_format="GLB",use_selection=True,export_yup=True)
bpy.ops.object.select_all(action='DESELECT')
coin=cyl("PreviewCoin",(-.11,0,1.99),.15,.04,gold,(math.pi/2,0,0))
bpy.ops.object.camera_add(location=(3.7,-5.8,3.1));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.03))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=3.15;bpy.context.scene.camera=camera
for loc,power,size in [((2,-4,6),700,5),((-3,2,3),400,4)]:
 bpy.ops.object.light_add(type="AREA",location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape="DISK";l.data.size=size;l.rotation_euler=(Vector((0,0,.8))-l.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.world.color=(.4,.4,.4);scene.render.engine="CYCLES";scene.cycles.samples=24
scene.render.resolution_x=700;scene.render.resolution_y=620;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.filepath=preview
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,"..","..","outputs","pink-piggy-bank.blend"));bpy.ops.render.render(write_still=True)
print("PIG_ASSET_OK",out)
