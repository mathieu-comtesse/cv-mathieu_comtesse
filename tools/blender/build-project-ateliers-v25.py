import bpy,math,os,json
from mathutils import Vector
ROOT=os.getcwd()
exec(open(ROOT+'/tools/blender/build-project-dioramas.py',encoding='utf-8').read().split('reports=[]')[0])
STEP_TYPES=json.load(open(ROOT+'/tools/blender/project-steps-v21.json',encoding='utf-8'))
COUNTS={'finance':7,'vmvre':9,'pa':7,'cerfa':7,'vre':6,'studio':7,'powerbi':7,'suivi':6,'gares':6,'terrain':5,'charte':5}
def text(body,at,size=.23,mat=None):
 bpy.ops.object.text_add(location=at);o=bpy.context.object;o.name='Sign '+body;o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.003;o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(mat or dark);bpy.ops.object.convert(target='MESH');return o
def desk(x,y):
 cube('Office desk',(x,y,.70),(.92,.55,.08),wood)
 for dx in [-.36,.36]:bar('Desk legs',(x+dx,y,.22),(x+dx,y,.70),.045,dark)
 cube('Work monitor',(x,y+.13,.91),(.42,.045,.31),dark);cube('Data display',(x,y+.10,.92),(.36,.015,.25),glass)
def building(name,x,y,w,d,h,color=None):
 cube(name+' back',(x,y+d/2,h/2+.2),(w,.09,h),color or white)
 for dx in [-w/2,w/2]:cube(name+' side',(x+dx,y,h/2+.2),(.09,d,h),color or white)
 cube(name+' fascia',(x,y+d/2,h+.23),(w+.14,.18,.12),accent)
 text(name,(x,y+d/2-.06,h+.30),.23,accent)
def wheels(x,y,z=.35,length=1):
 for dx in [-length*.32,length*.32]:
  for dy in [-.23,.23]:cyl('Vehicle tyre',(x+dx,y+dy,z),.12,.07,dark,(math.pi/2,0,0))
# Work happens at actual equipment rather than at a row of identical presses.
STOPS={
'finance':[(-2.1,.85,1.02),(-.7,.85,1.02),(.7,.85,1.02),(.7,.4,.78),(.8,-1.1,1.0),(2.6,-.5,.75),(-2.1,.85,1.02)],
'vmvre':[(-.4,-.05,1.02),(-1.7,1,1.5),(1.15,1,1.5),(-1.7,1,.9),(1.15,1,.9),(-.22,.95,1.15),(-.4,-.05,.75),(-1.7,1,.9),(-.4,-.05,1.02)],
'pa':[(-2.2,1.1,1.1),(-2,-.1,.78),(-.7,.45,1.14),(.2,.45,1.14),(1.1,.45,1.14),(2,.45,1.14),(-2.2,1.1,1.1)],
'cerfa':[(-1.8,.3,1.02),(0,1,1.82),(1.65,.2,1.14),(1.65,.2,1.14),(-2.2,.3,1.02),(-2.2,.3,.75),(0,1,1.82)],
'vre':[(-1.8,.2,.7),(-.2,1,1.2),(1.15,1,1.2),(2.5,1,1.2),(-1.8,.2,.7),(-2.6,-.8,.5)],
'studio':[(-2.55,.6,1.02),(-1.8,.85,.78),(0,.9,1.24),(0,.9,1.24),(1.8,.85,.78),(1.8,.85,.78),(-1.8,.85,.78)],
'powerbi':[(.9,-.1,1.02),(-1.5,1,1.6),(.9,-.1,1.02),(.9,-.1,.78),(1.7,.8,1.2),(.9,-.1,1.02),(2.9,-.5,.7)],
'suivi':[(-3,.4,.8),(1.1,.05,.8),(-2.2,1.25,1.6),(1,1.25,1.6),(1.1,.05,.8),(-3,.4,.8)],
'gares':[(-2.5,.2,.55),(-1.7,1.2,1.03),(0,.2,.55),(2.8,1.56,1.19),(1.8,1.2,1.03),(2.5,.2,.55)],
'terrain':[(-2.4,-.9,.55),(-1.55,.60,.65),(-.4,.28,.92),(1.5,.9,1.50),(1.6,-1.1,.50)],
'charte':[(-1.5,1.87,1.2),(.3,.9,1.02),(1.8,.9,1.02),(.3,.9,1.02),(1.8,.9,1.02)]
}
exec(open(ROOT+'/tools/blender/enrich-workshops-v24.py',encoding='utf-8').read())
exec(open(ROOT+'/tools/blender/enrich-workshops-v25.py',encoding='utf-8').read())
reports=[]
for key,color,kind in PROJECTS:
 if os.environ.get('PROJECT_FILTER') and key not in os.environ['PROJECT_FILTER'].split(','):continue
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 accent=material('Project accent',color);white=material('Porcelain','#edf0ed');floor=material('Paving','#d6ddd9');dark=material('Carbon','#263e48');metal=material('Steel','#a6b4ba');glass=material('Glass','#80b8c9');wood=material('Wood','#c3a480');green=material('Foliage','#72a184');red=material('Warning','#d36a56');yellow=material('Safety','#e8bc43');cardboard=wood
 cube('Project island',(0,0,.04),(7.3,4.8,.18),white,bevel=.09);cube('Activity ground',(0,0,.155),(7.05,4.55,.06),floor)
 if key=='finance':
  building('FINANCE',0,.95,5.6,1.7,1.35)
  for x in [-2.1,-.7,.7]:desk(x,.85)
  cube('Budget board',(2.05,1.5,1.0),(1.05,.05,.7),dark)
  for i,h in enumerate([.25,.46,.33,.6]):cube('Budget bars',(1.67+i*.24,1.46,.68+h/2),(.15,.02,h),accent)
  for x in [-2.65,2.65]:cyl('Entrance column',(x,.03,.85),.11,1.25,white)
  cyl('Meeting table',(1.7,.2,.7),.42,.07,wood)
  cube('Budget threshold gate',(.8,-1.1,1.0),(.6,.09,.15),accent);cube('Exception lane',(.8,-1.48,.25),(1.05,.25,.04),red)
 elif key=='vmvre':
  building('VM WINDOWS',0,.95,5.7,1.65,1.8,dark)
  for j,x in enumerate([-1.7,1.15]):
   parent=empty('VM_'+str(j));cube('Server rack',(x,1,1.0),(1.15,.65,1.6),dark,parent)
   for z in [.43,.70,.97,1.24,1.51]:cube('Rack drawer',(x,.665,z),(1.04,.025,.19),metal,parent);cube('Server status LED',(x+.38,.64,z),(.06,.025,.06),green,parent)
  cube('Shared writer lock',(-.22,.95,.85),(.42,.4,.55),yellow);bar('Shared ownership line',(-1.7,.58,1.75),(1.15,.58,1.75),.035,accent)
  desk(-.4,-.05)
  for x in [-2.7,2.7]:cube('Cooling unit',(x,1.1,.75),(.35,.55,1.1),white)
 elif key=='pa':
  building('COURRIER & FLUX',.7,1.1,4.3,1.65,1.7)
  for i,x in enumerate([-.7,.2,1.1,2]):cube('Sorting bins',(x,.45,.65),(.60,.48,.85),accent if i%2 else glass)
  cube('Sorting belt',(-.4,-.1,.60),(5.5,.42,.12),dark)
  for x in [-2.5,-1,1,2.3]:bar('Belt leg',(x,-.1,.2),(x,-.1,.6),.06,metal)
  cube('Delivery van',(-2.2,1.1,.65),(1.5,.65,.65),white);cube('Van cab',(-1.35,1.1,.60),(.4,.65,.55),accent);cube('Van windscreen',(-1.12,1.1,.74),(.02,.5,.2),glass);wheels(-2,1.1,length=1.4)
 elif key=='cerfa':
  building('CONTROLE TECHNIQUE',0,1.1,5.5,1.55,1.6)
  for x in [-1.7,1.7]:cube('Inspection lift',(x,1,.85),(.10,.38,1.3),accent)
  cube('Inspection platform',(0,1,.85),(3.2,.65,.12),metal);cube('Inspected vehicle',(0,1,1.2),(1.65,.72,.50),red);cube('Vehicle cabin',(.1,1,1.60),(.9,.65,.38),glass);wheels(0,1,1.08,1.5)
  desk(-2.2,.3);cube('Scanner arch',(1.65,.2,1.14),(.75,.12,.12),accent)
 elif key=='vre':
  building('VERIFICATION ELECTRIQUE',-1.75,1.1,2.3,1.5,1.35)
  for x in [-.2,1.15,2.5]:
   cube('Electrical transformer',(x,1,.68),(.82,.7,.86),metal)
   for dx in [-.25,0,.25]:cyl('HV insulator',(x+dx,1,1.23),.055,.4,dark)
   for y in [.72,1.28]:cube('Transformer radiator',(x,y,.67),(.74,.06,.72),dark)
  for x in [-2.9,2.9]:bar('Power mast',(x,1,.2),(x,1,2.1),.07,accent);bar('Crossbar',(x-.4,1,1.9),(x+.4,1,1.9),.04,dark)
  bar('Power line',(-2.9,1,2.07),(2.9,1,2.07),.018,dark)
 elif key=='studio':
  building('STUDIO EXTRACTION',0,1.15,5.5,1.5,1.3)
  for x in [-1.8,0,1.8]:
   cube('Drawing desk',(x,.85,.66),(1.05,.70,.10),wood);cube('Template sheet',(x,.83,.725),(.83,.55,.025),white)
   for dx in [-.3,0,.3]:cube('Extraction region',(x+dx,.83,.744),(.18,.28,.009),accent)
  cube('Document press',(0,.9,1.0),(.9,.5,.45),dark);cyl('Paper roll',(-2.55,.6,.91),.25,.50,white,(math.pi/2,0,0))
 elif key=='powerbi':
  building('DATA & DECISION',-1.5,1,2.7,1.5,2.55,glass)
  for z in [.8,1.6,2.4]:cube('Office floor',(-1.5,1,z),(2.6,1.5,.08),white)
  for x in [-2.6,-1.8,-1,-.2]:bar('Facade mullion',(x,1.8,.2),(x,1.8,2.7),.04,dark)
  for i,h in enumerate([.5,1.05,1.7,1.25]):cube('Dashboard metric',(.4+i*.62,.8,.2+h/2),(.4,.65,h),accent if i%2 else yellow)
  desk(.9,-.1)
 elif key=='suivi':
  building('LOGISTIQUE',0,1.35,5.8,1.3,1.6)
  for x in [-2.2,-1,1,2.2]:
   for z in [.5,.95,1.4]:cube('Stock shelf',(x,1.25,z),(.82,.68,.04),metal);boxStack((x-.25,1.25,z+.13))
  cube('Forklift body',(1.1,.05,.4),(.7,.6,.35),accent);cube('Forklift cage',(1.1,.05,.95),(.65,.55,.07),dark)
  for y in [-.2,.3]:bar('Forklift upright',(.9,y,.5),(.9,y,.95),.04,dark);bar('Forklift fork',(.8,y,.25),(.15,y,.25),.045,metal)

 elif key=='gares':
  cube('Platform',(0,.2,.3),(6.2,.75,.2),white)
  for y in [.86,1.48]:bar('Rail',(-3,y,.23),(3,y,.23),.045,dark)
  for x in [-2.9+i*.25 for i in range(24)]:cube('Rail sleeper',(x,1.17,.20),(.09,.9,.025),wood)
  for x in [-1.8,0,1.8]:cube('Train carriage',(x,1.2,.68),(1.62,.55,.68),accent)
  for x in [-2.4,-1.8,-1.2,-.6,0,.6,1.2,1.8,2.4]:cube('Train window',(x,.91,.82),(.30,.015,.24),glass)
  for x in [-2.5,0,2.5]:bar('Canopy post',(x,.25,.4),(x,.25,1.65),.065,dark)
  cube('Station canopy',(0,.25,1.68),(6.0,1.1,.10),metal);text('GARES PRIORITAIRES',(0,-.33,1.79),.26,accent)
 elif key=='terrain':
  building('ATELIER MAINTENANCE',-1.6,1.1,2.7,1.5,1.1)
  for x in [-2.9,2.9]:bar('Gantry upright',(x,.9,.2),(x,.9,2.3),.12,accent)
  bar('Gantry beam',(-2.9,.9,2.3),(2.9,.9,2.3),.16,accent);bar('Crane hook',(1.5,.9,2.3),(1.5,.9,1.4),.04,dark)
  cube('Repair assembly',(1.5,.8,.6),(1.1,.9,.8),metal);cube('Gemba board',(0,.15,1.0),(1.3,.06,.75),white)
  for i in range(5):cube('Improvement note',(-.46+i*.23,.1,1.10),(.16,.018,.15),accent)
 elif key=='charte':
  building('DESIGN SYSTEM',0,1.1,5.4,1.6,1.5)
  for i in range(3):
   for j in range(3):cube('UI component',(-1.9+i*.55,1.87,.63+j*.38),(.42,.05,.24),[accent,glass,yellow][(i+j)%3])
  desk(.3,.9);desk(1.8,.9);cyl('Design meeting',(0,.15,.73),.48,.08,wood)
 enrich_activity(key)
 # Group moving vehicles; their root keeps the authored parking/lift position.
 vehicle={'pa':('mail_van',('Delivery van','Van cab','Van windscreen','Vehicle tyre')),'cerfa':('inspection_car',('Inspected vehicle','Vehicle cabin','Vehicle tyre')),'gares':('train',('Train carriage','Train window')),'suivi':('forklift',('Forklift',))}.get(key)
 if vehicle:
  name,prefixes=vehicle;parent=empty('Vehicle_'+name)
  for obj in list(bpy.context.scene.objects):
   if obj.type=='MESH' and obj.name.startswith(prefixes):obj.parent=parent
  if key=='suivi':cube('Forklift load',(.2,.05,.43),(.35,.4,.33),wood,parent)
 # A docked barge supplies the logistics machines. No human models are used.
 if key=='suivi':
  water=material('Canal water','#649ba8');cube('Canal',(-3.00,.35,.20),(.85,2.7,.025),water)
  for y in [-.85,1.55]:cube('Dock edge',(-2.58,y,.30),(.10,.36,.18),metal)
  boat=empty('Vehicle_barge');cube('Barge hull',(-3.0,.4,.35),(.64,1.48,.23),dark,boat,bevel=.09)
  cube('Barge deck',(-3.0,.4,.49),(.59,1.32,.065),white,boat);cube('Barge cabin',(-3.0,.90,.67),(.48,.38,.30),accent,boat)
  cube('Barge window',(-3.0,.69,.71),(.34,.025,.15),glass,boat)
  for y in [-.03,.28]:cube('Barge container',(-3.0,y,.65),(.45,.25,.25),yellow,boat)
 if key=='terrain':
  crane=empty('MachineCraneCarriage')
  for obj in list(bpy.context.scene.objects):
   if obj.type=='MESH' and obj.name.startswith(('Crane hook',)):obj.parent=crane
  cube('Gantry trolley',(1.5,.9,2.36),(.40,.30,.14),dark,crane)
  fire=material('Forge embers','#ef7629');fire.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(1,.20,.015,1);fire.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=3
  cube('Forge hearth',(-1.55,.60,.56),(.92,.75,.68),dark);cube('Forge opening',(-1.55,.21,.55),(.57,.035,.40),fire)
  for dx in [-.38,.38]:cube('Forge brick',(-1.55+dx,.23,.65),(.17,.18,.74),red)
  cube('Forge hood',(-1.55,.60,1.08),(1.08,.86,.14),dark);cyl('Forge chimney',(-1.55,.83,1.45),.13,.65,dark)
  cube('Forge anvil',(-.40,.28,.65),(.65,.52,.35),metal);cube('Forge workpiece',(-.40,.28,.86),(.27,.22,.055),fire)
  for x in [-.8,0]:bar('Forge press guide',(x,.28,.68),(x,.28,1.70),.075,dark)
  cube('Forge top beam',(-.40,.28,1.72),(.90,.35,.14),accent);cube('MachineForgeHammer',(-.40,.28,1.20),(.39,.28,.31),metal)
  for n in range(10):cyl('Forge coal',(-1.80+(n%5)*.12,.26,.40+(n//5)*.08),.045,.04,fire,(math.pi/2,0,0))

 if key=='gares':
  for x in [-2.8,2.8]:
   bar('Rail signal mast',(x,1.6,.2),(x,1.6,1.2),.04,dark);cube('MachineRailSignal',(x,1.56,1.19),(.12,.06,.12),green)

 # Real input and output objects participate in the activity.
 if key=='terrain':
  cube('Steel input pallet',(-2.4,-.9,.25),(.95,.65,.12),wood)
  for x in [-2.75,-2.05]:cube('Pallet foot',(x,-.9,.17),(.12,.65,.08),wood)
  billet=empty('ActivityRawBillet');cube('Raw steel billet',(0,0,0),(.66,.24,.16),metal,billet);billet.location=(-2.4,-.9,.45)
  final=empty('ActivityForgedPart')
  cube('Forged lower flange',(0,0,.022),(.78,.27,.045),metal,final)
  cube('Forged web',(0,0,.105),(.78,.055,.14),metal,final)
  cube('Forged upper flange',(0,0,.188),(.78,.27,.045),metal,final)
  for x in [-.29,.29]:cyl('Finished bolt',(x,0,.225),.038,.025,dark,parent=final)
  final.location=(-.4,.28,.86)
  cube('Finished steel pallet',(1.6,-1.1,.25),(1.02,.75,.12),wood)
  cube('Quality scanner',(2.22,-1.1,.78),(.12,.16,.85),accent)
 else:
  payload=empty('ActivityDocument');cube('Document bundle',(0,0,.015),(.40,.31,.035),white,payload)
  for row in range(4):cube('Document field',(-.04,-.10+row*.055,.038),(.24,.018,.008),accent,payload)
  payload.location=STOPS[key][0]
 # Tool checkpoints are separately named anchors, one for every described step.
 for i in range(COUNTS[key]):
  x,y,z=STOPS[key][i]
  anchor=empty('StepAnchor_'+str(i));anchor.location=(x,y,z)
  output=empty('MachineOutput_'+str(i));output.location=(x,y,z-.14)
  tool=STEP_TYPES[key][i][2];toolMat=material('Tool '+tool,{'excel':'#27804d','excel-script':'#27804d','powerbi':'#e8bd33','automate':'#4587c6','html':'#9d6fb3','vm':'#547ca5'}.get(tool,color))
  if tool in ['excel','excel-script']:
   for row in range(3):
    for col in range(3):cube('Excel data cell',(-.105+col*.105,-.095+row*.095,.04),(.09,.08,.06),toolMat,output,bevel=.005)
  elif tool in ['chart','powerbi']:
   for col,h in enumerate([.08,.19,.30]):cube('Materialized chart',(-.12+col*.12,0,h/2),(.09,.15,h),toolMat,output,bevel=.006)
  elif tool in ['html','design']:
   cube('Interface panel',(0,0,.13),(.31,.07,.25),toolMat,output);cube('Interface viewport',(0,-.045,.13),(.25,.02,.18),white,output)
  elif tool=='vm':
   cube('Data server',(0,0,.15),(.24,.21,.30),toolMat,output)
   for h in [.07,.15,.23]:cube('Server data slot',(0,-.115,h),(.17,.025,.03),metal,output)
  else:
   for col in range(3):cube('Processed data',(col*.07-.07,0,.025+col*.035),(.23,.19,.04),toolMat if col==2 else white,output,bevel=.008)


 finish_activity(key)
 for i in range(0 if key=='terrain' else 3):
  o=empty('Packet_'+str(i));cube('Moving data',(0,0,0),(.20,.18,.08),white,o);cube('Data stripe',(0,0,.046),(.12,.03,.013),accent,o)
 for x,y in [(-3.18,1.8),(3.18,1.8)]:
  if key!='suivi' or x>0:tree(x,y)
 enrich_v25(key)
 compact_static(key)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=DEST+'/'+key+'.glb',export_format='GLB',use_selection=True,export_animations=False)
 camAt=Vector((8,-11,9));target=Vector((0,0,.65));bpy.ops.object.camera_add(location=camAt);cam=bpy.context.object;cam.rotation_euler=(target-camAt).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=8.7 if key!='suivi' else 10.0;bpy.context.scene.camera=cam
 for at,energy,size in [((-4,-6,9),1300,7),((5,2,7),800,6)]:bpy.ops.object.light_add(type='AREA',location=at);bpy.context.object.data.energy=energy;bpy.context.object.data.size=size
 scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.world.color=(.65,.65,.65);scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.device='CPU';scene.render.film_transparent=True;scene.render.resolution_x=720;scene.render.resolution_y=560;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=DEST+'/'+key+'.png';bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/project-ateliers-v25-'+key+'.blend')
 reports.append({'id':key,'activity':kind,'steps':COUNTS[key],'people':0,'machines':0,'activityStops':COUNTS[key],'genericChain':False,'meshes':sum(o.type=='MESH' for o in scene.objects),'bytes':os.path.getsize(DEST+'/'+key+'.glb')})
json.dump(reports,open(ROOT+'/outputs/project-ateliers-v25-report.json','w'),indent=2);print('PROJECT_VARIETY_OK')
