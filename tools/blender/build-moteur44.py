import bpy, math, os, json
from mathutils import Vector
ROOT=os.getcwd()
exec(open(ROOT+'/tools/blender/build-project-dioramas.py',encoding='utf-8').read().split('reports=[]')[0])
OUT=os.path.abspath(ROOT+'/../../outputs/v29-moteur44');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
accent=material('Moteur teal','#298b81');white=material('Porcelain','#edf2ef');dark=material('Carbon','#263e48');metal=material('Steel','#98b1b6');glass=material('Display blue','#8ec9d3');wood=material('Paper stack','#c3a480');green=material('Excel green','#258353');yellow=material('Selection amber','#e8bc43');floor=material('Workshop floor','#d0dcd9')
def sign(body,at,size=.19,color=None,parent=None):
 bpy.ops.object.text_add(location=at);o=bpy.context.object;o.name='Label '+body;o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.001;o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(color or white)
 bpy.ops.object.convert(target='MESH')
 if parent:o.parent=parent
 return o
def cabinet(name,x,y,h=1.35):
 p=empty(name);cube('Cabinet body',(x,y,.2+h/2),(1.2,.65,h),accent,p)
 for z in [.28,.55,.82,1.09]:cube('Archive drawer',(x,y-.34,z),(.98,.035,.2),white,p);cube('Drawer handle',(x,y-.375,z),(.23,.055,.025),metal,p)
 return p
cube('Project island',(0,0,.04),(7.3,4.8,.18),white,bevel=.09);cube('Workshop floor',(0,0,.155),(7.05,4.55,.06),floor)
source=cabinet('SharePointArchive',-2.4,.7)
cube('Archive label board',(-2.4,.34,1.68),(1.45,.045,.30),white)
sign('SharePoint',(-2.4,.31,1.62),.20,accent)
cube('Input loading tray',(-2.4,-.28,.55),(1.1,.85,.08),metal)
for j in range(5):cube('Waiting reports',(-2.55,-.32,.63+j*.04),(.44,.34,.035),white)
engine=empty('Moteur44Engine')
cube('Engine pedestal',(-.65,.65,.46),(1.6,1.2,.56),dark,engine)
cube('Engine housing',(-.65,.95,1.18),(1.7,.6,.85),accent,engine)
sign('MOTEUR V4.4',(-.65,.62,1.56),.23,white,engine)
rotor=empty('Moteur44Rotor');rotor.parent=engine;rotor.location=(-.65,.60,1.20)
cyl('Rotor housing',(0,0,0),.32,.07,metal,(math.pi/2,0,0),rotor)
cyl('Rotor axle',(0,-.055,0),.12,.09,dark,(math.pi/2,0,0),rotor)
for i in range(8):
 a=i*math.tau/8;cube('Rotor tooth',(.29*math.cos(a),-.01,.29*math.sin(a)),(.12,.10,.12),yellow,rotor)
cube('Scanner bed',(-.65,-.1,.73),(1.75,.83,.07),white)
for x in [-1.4,.1]:bar('Scanner guide',(x,-.4,.78),(x,-.4,1.22),.06,metal)
scanner=empty('Moteur44Scanner');scanner.location=(-.65,-.40,1.14)
cube('Scanning carriage',(0,0,0),(.47,.18,.20),accent,scanner)
cube('Scanner light',(0,-.01,-.11),(.36,.15,.02),glass,scanner)
excel=empty('ExcelRegister');cube('Excel display frame',(1.65,.55,1.12),(2.10,.16,1.65),dark,excel)
cube('Excel screen',(1.65,.445,1.12),(1.92,.025,1.46),white,excel)
cube('Excel title',(1.65,.42,1.69),(1.92,.02,.23),green,excel);sign('EXCEL',(1.65,.40,1.64),.15,white,excel)
for row in range(7):
 z=1.48-row*.16
 for col in range(4):cube('Excel cell',(1.00+col*.43,.41,z),(.40,.018,.13),floor,excel,bevel=.008)
sign('OT-042',(1.02,.386,1.03),.08,dark,excel)
target=empty('Moteur44TargetRow');target.parent=excel;target.location=(1.65,.389,1.0)
cube('Target row highlight',(0,0,0),(1.87,.018,.145),yellow,target,bevel=.006)
record=empty('Moteur44ExcelRecord');record.parent=target
for x in [-.65,-.22,.22,.65]:cube('Injected Excel value',(x,-.025,0),(.24,.02,.055),green,record,bevel=.008)
sign('LIGNE CIBLE',(1.65,.35,.30),.13,green)
q18=empty('Moteur44Q18Archive');cube('Q18 display frame',(2.40,-1.0,.76),(1.30,.17,1.10),dark,q18)
cube('Q18 display',(2.40,-1.11,.76),(1.16,.025,.96),glass,q18)
qdoc=empty('Moteur44Q18Record');qdoc.parent=q18
cube('Visible Q18 document',(2.40,-1.15,.76),(.72,.025,.73),white,qdoc)
sign('Q18',(2.40,-1.172,.84),.22,green,qdoc);sign('VISIBLE',(2.40,-1.172,.57),.095,green,qdoc)
shutter=empty('Moteur44Q18Shutter');shutter.parent=q18;shutter.location=(2.40,-1.19,.76)
cube('Closed archive cover',(0,0,0),(1.16,.025,.96),accent,shutter)
sign('Q18',(0,-.025,.05),.20,white,shutter)
for x,y in [(-3.05,1.7),(3.12,1.7)]:
 cube('Workshop cabinet',(x,y,.53),(.38,.50,.68),metal)
 for z in [.38,.54,.70]:cube('Cabinet vent',(x,y-.27,z),(.26,.025,.028),dark)
for x in [-2.8,-2.2,-1.6,-1,-.4,.2,.8,1.4,2,2.6]:cube('Safety floor marker',(x,-1.9,.195),(.23,.07,.009),yellow,bevel=0)
payload=empty('ActivityDocument');cube('Report document',(0,0,.01),(.42,.32,.035),white,payload)
for row in range(4):cube('Document_field',(-.02,-.1+row*.055,.035),(.28,.02,.007),accent,payload)
payload.location=(-2.4,-.28,.77)
stops=[(-2.4,-.28,.77),(-.65,-.1,.86),(1.65,.32,1.0),(2.40,-1.25,.86),(1.65,.32,1.0)]
for i,at in enumerate(stops):o=empty('StepAnchor_'+str(i));o.location=at
# Batch static surfaces; keep every operational assembly separately addressable.
dynamic=('Moteur44','ActivityDocument','StepAnchor_','SharePointArchive','ExcelRegister')
groups={}
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 chain=obj;protected=False
 while chain:
  if chain.name.startswith(dynamic):protected=True;break
  chain=chain.parent
 if not protected:groups.setdefault(tuple(m.name for m in obj.data.materials),[]).append(obj)
for i,objects in enumerate(groups.values()):
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='StaticWorkshop_'+str(i)
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=DEST+'/moteur44.glb',export_format='GLB',use_selection=True,export_animations=False)
target=Vector((0,0,.72));bpy.ops.object.camera_add(location=(8,-11,9));cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=8.5;bpy.context.scene.camera=cam
for at,energy,size in [((-4,-6,9),1300,7),((5,2,7),800,6)]:bpy.ops.object.light_add(type='AREA',location=at);bpy.context.object.data.energy=energy;bpy.context.object.data.size=size
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.film_transparent=True;scene.world.color=(.65,.65,.65);scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.resolution_x=720;scene.render.resolution_y=560;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=DEST+'/moteur44.png';bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/Moteur-V4.4.blend')
json.dump({'project':'moteur44','steps':len(stops),'people':0,'bytes':os.path.getsize(DEST+'/moteur44.glb'),'nodes':[o.name for o in scene.objects if o.name.startswith(dynamic)]},open(OUT+'/blender-report.json','w'),indent=2)
print('MOTEUR44_BLENDER_OK')
