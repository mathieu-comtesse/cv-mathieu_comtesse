import bpy, math, os, json
from mathutils import Vector
ROOT=os.getcwd(); OUT=ROOT+'/assets'; bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=m.diffuse_color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.48;return m
def cyl(name,at,r,depth,mat,rotation=None,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=depth,location=at);o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 if rotation:o.rotation_euler=rotation
 if parent:o.parent=parent
 return o
def box(name,at,size,mat,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 mod=o.modifiers.new('Rounded edge','BEVEL');mod.width=.008;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 if parent:o.parent=parent
 return o
black=material('Rubber',(0.018,.021,.025));silver=material('Brushed steel',(.42,.47,.5),.7);blue=material('Pump blue',(.035,.20,.33));white=material('Gauge ivory',(.83,.84,.77));red=material('Gauge indicator',(.70,.055,.03))
box('Foot plate',(0,0,.018),(.29,.16,.036),black)
cyl('Pump barrel',(0,0,.285),.039,.49,blue)
cyl('Barrel collar',(0,0,.54),.045,.025,black)
piston=bpy.data.objects.new('PumpPiston',None);bpy.context.collection.objects.link(piston)
cyl('Chrome piston',(0,0,.665),.014,.28,silver,parent=piston)
cyl('PumpHandle',(0,0,.81),.023,.29,black,(0,math.pi/2,0),piston)
for x in [-.115,.115]:cyl('Grip ribs',(x,0,.81),.025,.047,black,(0,math.pi/2,0),piston)
# The gauge faces the front, angled upward, and has a movable needle.
cyl('Gauge housing',(0,-.046,.10),.059,.027,black,(math.pi/2,0,0))
cyl('Gauge dial',(0,-.062,.10),.052,.004,white,(math.pi/2,0,0))
for i in range(9):
 a=-2.25+i*.56;x=math.sin(a)*.042;z=.10+math.cos(a)*.042
 o=box('Gauge tick',(x,-.066,z),(.003,.003,.009),black);o.rotation_euler.y=a
needle=bpy.data.objects.new('GaugeNeedle',None);bpy.context.collection.objects.link(needle);needle.location=(0,-.069,.10)
box('Red needle',(0,0,.018),(.004,.004,.04),red,needle)
cyl('Hose outlet',(.052,0,.065),.011,.035,black,(0,math.pi/2,0))
# Named valve targets and grips form the animation contract.
for name,at in [('LeftGrip',(-.10,0,.81)),('RightGrip',(.10,0,.81)),('HoseOutlet',(.07,0,.065))]:
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=at
 if 'Grip' in name:o.parent=piston
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/../../outputs/bicycle-pump-v31.blend')
bpy.ops.export_scene.gltf(filepath=OUT+'/bicycle-pump-v31.glb',export_format='GLB',export_animations=False)
receipt={'height_m':.835,'handle_stroke_m':.20,'grip_separation_m':.20,'required_nodes':['PumpPiston','GaugeNeedle','LeftGrip','RightGrip','HoseOutlet'],'original_assets_modified':False}
with open(OUT+'/bicycle-pump-v31.json','w') as f:json.dump(receipt,f,indent=2)
# Asset inspection render.
bpy.ops.object.light_add(type='AREA',location=(2,-3,4));bpy.context.object.data.energy=450;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=3
bpy.ops.object.camera_add(location=(1.3,-2.2,1.5));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.43))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.25;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.world.color=(.28,.28,.28);scene.render.film_transparent=True;scene.render.filepath=ROOT+'/../../outputs/bicycle-pump-v31.png';bpy.ops.render.render(write_still=True)
