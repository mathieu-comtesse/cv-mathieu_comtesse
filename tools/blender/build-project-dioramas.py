import bpy, math, os, json
from mathutils import Vector
ROOT=os.getcwd(); DEST=ROOT+'/assets/dioramas';os.makedirs(DEST,exist_ok=True)
PROJECTS=[('pa','#328b81','flow'),('finance','#cd9355','finance'),('vmvre','#587cb3','vm'),('cerfa','#df725b','scan'),('vre','#668dab','scan'),('studio','#bc819e','robot'),('powerbi','#c5a647','chart'),('suivi','#628d85','warehouse'),('gares','#88a85a','station'),('terrain','#c4835c','meeting'),('charte','#847eae','robot')]
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*tuple((int(color[i:i+2],16)/255)**2.2 for i in (1,3,5)),1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.82;return m
def cube(name,at,size,mat,parent=None,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 if parent:o.parent=parent
 return o
def cyl(name,at,radius,depth,mat,axis=None,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=depth,location=at);o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 if axis:o.rotation_euler=axis
 if parent:o.parent=parent
 return o
def bar(name,a,b,width,mat,parent=None):
 mid=(Vector(a)+Vector(b))/2;o=cube(name,mid,(width,width,(Vector(b)-Vector(a)).length),mat,parent);o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
def empty(name):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o
def boxStack(at,parent=None):
 for i in range(3):cube('Packed output', (at[0]+(i%2)*.24,at[1],at[2]+(i//2)*.23),(.22,.26,.21),cardboard,parent)
def tree(x,y):
 cyl('Tree trunk',(x,y,.46),.045,.6,wood);bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.28,location=(x,y,.85));bpy.context.object.data.materials.append(green)
reports=[]
for key,color,kind in PROJECTS:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 accent=material('Process accent',color);white=material('Porcelain','#edf0ed');floor=material('Concrete','#d9dcd7');dark=material('Belt and tyres','#414950');metal=material('Steel','#a6b4ba');glass=material('Glazing','#b1d6db');cardboard=material('Shipping cartons','#c6a17a');wood=material('Timber','#948677');green=material('Tree foliage','#8aaf79');red=material('Attention','#d76d58');yellow=material('Safety markings','#e2c37a')
 cube('Island plinth',(0,0,.04),(7.3,4.6,.18),white,bevel=.07);cube('Workshop floor',(0,0,.145),(6.94,4.26,.06),floor)
 # Loading lane and striped pedestrian crossing.
 cube('Loading lane',(0,-1.65,.182),(6.8,.58,.012),metal,bevel=0)
 for x in range(-3,4):cube('Lane dash',(x,-1.65,.192),(.45,.03,.01),white,bevel=0)
 for j in range(6):cube('Pedestrian crossing',(-2.7,-1.62+j*.09,.198),(.25,.035,.009),white,bevel=0)
 # Roofless warehouse with glazed loading doors and stock racks.
 cube('Warehouse back',(0,1.72,.74),(6.1,.12,1.13),white);cube('Accent roof fascia',(0,1.68,1.33),(6.3,.24,.12),accent)
 for x in [-2.6,-1.55,1.8,2.55]:
  cube('Warehouse mullion',(x,1.62,.68),(.05,.08,.95),metal);cube('Warehouse window',(x+.34,1.63,.83),(.6,.055,.55),glass)
 for x in [1.5,2.15,2.8]:
  for z in [.38,.78]:cube('Stock shelf',(x,1.05,z),(.56,.48,.035),metal);boxStack((x-.14,1.05,z+.13))
  for y in [.8,1.3]:cube('Rack upright',(x-.28,y,.69),(.035,.035,1.05),metal)
 # Conveyor is the visual path shared by all explanation steps.
 cube('Conveyor belt',(0,-.35,.61),(5.95,.55,.095),dark)
 for x in [-2.95,2.95]:cyl('Drive roller',(x,-.35,.61),.09,.59,metal,(math.pi/2,0,0))
 for x in [-2.6,-1.3,0,1.3,2.6]:
  for y in [-.57,-.13]:cube('Belt foot',(x,y,.38),(.05,.05,.48),metal)
 for x in [-2.4,-.8,.8,2.4]:
  for y in [-.73,.03]:cube('Yellow edge marker',(x,y,.2),(.55,.045,.012),yellow)
 # Distinct stations: incoming files, a scanner, processing, outbound data.
 for i,x in enumerate([-2.4,-.8,.8,2.4]):
  station=empty('Station_'+str(i));cube('Work bench',(x,.45,.48),(.85,.57,.6),white,station);cube('Accent bench trim',(x,.45,.80),(.87,.59,.055),accent,station)
  if i==0:
   for j in range(5):cube('Incoming PDF page',(x,.43,.84+j*.027),(.49,.34,.019),white,station,bevel=.005)
   cube('PDF coloured tab',(x+.18,.4,.985),(.1,.2,.012),accent,station,bevel=0)
  elif i==1:
   for dx in [-.31,.31]:cube('Scanner column',(x+dx,-.35,.99),(.095,.15,.69),accent,station)
   cube('Scanner bridge',(x,-.35,1.3),(.73,.18,.14),white,station);cube('Scanner light',(x,-.38,1.215),(.49,.06,.02),glass,station)
  elif i==2:
   cyl('Robot base',(x,.4,.9),.17,.15,metal,parent=station);bar('Robot lower arm',(x,.4,.97),(x+.1,.35,1.3),.1,accent,station);bar('Robot upper arm',(x+.1,.35,1.3),(x,-.2,1.08),.075,white,station);cube('Robot gripper',(x,-.24,1.03),(.23,.12,.07),dark,station)
  else:
   cube('Output terminal',(x,.48,1.06),(.6,.13,.42),dark,station);cube('Output display',(x,.4,1.07),(.52,.02,.32),glass,station)
   for j,h in enumerate([.12,.19,.24]):cube('Result chart bar',(x-.15+j*.15,.385,.94+h/2),(.09,.018,h),accent,station,bevel=.005)
 # A truck and forklift make the logistics metaphor concrete.
 cube('Delivery trailer',(-2.55,-1.66,.47),(.68,.38,.45),white);cube('Truck cab',(-2.0,-1.66,.40),(.35,.38,.32),accent);cube('Cab windscreen',(-1.88,-1.66,.5),(.06,.30,.12),glass)
 for x in [-2.73,-2.24,-1.97]:
  for y in [-1.89,-1.43]:cyl('Truck wheel',(x,y,.27),.105,.06,dark,(math.pi/2,0,0))
 cube('Forklift body',(2.8,-1.6,.36),(.4,.38,.35),accent);cube('Forklift seat',(2.8,-1.6,.6),(.17,.23,.08),dark)
 for y in [-1.76,-1.44]:bar('Forklift cage',(2.7,y,.56),(2.7,y,.98),.035,metal);bar('Forklift forks',(2.58,y,.25),(2.12,y,.25),.04,metal)
 cube('Forklift roof',(2.8,-1.6,1.0),(.38,.39,.05),metal)
 for x in [2.65,2.96]:
  for y in [-1.84,-1.36]:cyl('Forklift wheel',(x,y,.24),.08,.05,dark,(math.pi/2,0,0))
 for x,y in [(-3.22,1.45),(3.2,1.45),(-3.22,-.9)]:tree(x,y)
 # Project-specific landmarks.
 if kind=='vm':
  for j,x in enumerate([-.85,.85]):
   o=empty('VM_'+str(j));cube('Server cabinet',(x,1.02,.88),(.56,.5,1.32),dark,o)
   for z in [.43,.65,.87,1.09,1.31]:cube('Server drawer',(x,.755,z),(.47,.035,.15),metal,o);cube('Server status LED',(x+.16,.728,z),(.035,.015,.035),green,o)
  bar('Shared ownership line',(-.85,.68,1.45),(.85,.68,1.45),.035,accent);cube('Single writer lock',(0,.68,1.45),(.24,.14,.20),yellow)
 elif kind=='finance':
  cube('Budget threshold gate',(.8,-.35,1.38),(.6,.10,.17),accent)
  cube('Exception lane',(.8,-1.02,.61),(1.1,.4,.09),red);boxStack((.48,-1.02,.76))
 elif kind=='chart':
  for j,h in enumerate([.35,.62,.92,.7]):cube('Dashboard metric',(-.5+j*.33,1.2,.21+h/2),(.23,.23,h),accent)
 elif kind=='station':
  cube('Station canopy',(-1,1.08,1.15),(1.6,.6,.09),accent)
  for x in [-1.65,-.35]:cube('Station pillar',(x,1.08,.68),(.07,.07,.91),metal)
 elif kind=='meeting':
  cube('Gemba improvement board',(0,1.18,1.12),(1.15,.06,.6),white)
  for i in range(5):cube('Improvement note',(-.4+i*.19,1.135,1.13),(.14,.012,.15),accent)
 for i in range(3):
  o=empty('Packet_'+str(i));cube('Document parcel',(-2.65+i*1.6,-.35,.74),(.35,.30,.15),white,o);cube('Document strip',(-2.65+i*1.6,-.35,.821),(.25,.04,.015),accent,o)
 # A coloured facade, raised sign and street furniture echo the miniature architecture reference.
 cube('Factory roof',(0,1.6,1.39),(6.34,.72,.13),accent)
 cube('Roof parapet',(0,1.98,1.55),(6.4,.09,.23),white)
 for x in [-3.12,3.12]:cube('Side parapet',(x,1.6,1.55),(.08,.77,.23),white)
 cube('Factory central shutter',(0,1.6,.8),(1.65,.075,.95),accent)
 for x in [-.75,-.5,-.25,0,.25,.5,.75]:cube('Shutter rib',(x,1.53,.8),(.015,.025,.94),metal)
 cube('Factory canopy',(0,1.22,1.24),(1.96,.83,.11),accent)
 for j,x in enumerate([-.82,-.48,-.14,.2,.54,.88]):cube('Canopy stripe',(x,1.22,1.305),(.15,.78,.012),white,bevel=0)
 badge=empty('Process sign');cyl('Round sign',(0,1.65,2.18),.43,.065,accent,(math.pi/2,0,0),badge)
 for x in [-.25,.25]:bar('Sign bracket',(x,1.64,1.45),(x,1.64,2.08),.035,dark,badge)
 bpy.ops.object.text_add(location=(0,1.606,2.16));text=bpy.context.object;text.name='Project monogram';text.data.body={'pa':'PA','finance':'€','vmvre':'VM','cerfa':'PDF','vre':'VRE','studio':'ST','powerbi':'BI','suivi':'OT','gares':'G','terrain':'GE','charte':'UI'}[key];text.data.align_x='CENTER';text.data.align_y='CENTER';text.data.size=.34;text.data.extrude=.006;text.rotation_euler=(math.pi/2,0,0);text.data.materials.append(white);bpy.ops.object.convert(target='MESH');text.parent=badge
 for x in [-3.18,3.18]:
  bar('Street light pole',(x,-1.1,.2),(x,-1.1,1.36),.032,dark);bar('Street light boom',(x,-1.1,1.36),(x+.22,-1.1,1.36),.032,dark);cube('Street light',(x+.18,-1.1,1.32),(.19,.10,.065),white)
 for x in [-2.7,-2.25,-1.8,-1.35,-.9,-.45,0,.45,.9,1.35,1.8,2.25,2.7]:cube('Conveyor slat',(x,-.35,.666),(.035,.52,.009),metal,bevel=.002)
 for x in [1.48,2.15,2.82]:cube('Pallet slat',(x,1.05,.225),(.6,.055,.045),wood)
 # Export only model objects. Lights and camera stay in the authoring file.
 bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=DEST+'/'+key+'.glb',export_format='GLB',use_selection=True,export_animations=False)
 camAt=Vector((8,-11,9));target=Vector((0,0,.45));bpy.ops.object.camera_add(location=camAt);cam=bpy.context.object;cam.rotation_euler=(target-camAt).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=9.4;bpy.context.scene.camera=cam
 bpy.ops.object.light_add(type='AREA',location=(-4,-6,9));bpy.context.object.data.energy=1300;bpy.context.object.data.size=7
 bpy.ops.object.light_add(type='AREA',location=(5,2,7));bpy.context.object.data.energy=800;bpy.context.object.data.size=6
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.world.color=(.65,.65,.65);scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.render.film_transparent=True;scene.render.resolution_x=720;scene.render.resolution_y=560;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=DEST+'/'+key+'.png';bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/project-'+key+'.blend')
 reports.append({'id':key,'bytes':os.path.getsize(DEST+'/'+key+'.glb'),'meshes':sum(o.type=='MESH' for o in scene.objects)})
json.dump(reports,open(ROOT+'/outputs/dioramas-blender-report.json','w'),indent=2);print('DIORAMAS_OK')
