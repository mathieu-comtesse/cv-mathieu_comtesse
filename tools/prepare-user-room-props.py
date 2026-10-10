import bpy,bmesh,json,math,hashlib,sys
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];proof=root.parents[1]/'outputs'/'room-props';assets=root/'assets';receipts=[]
only=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--only=')),None)
if only:receipts=json.loads((proof/'prepared-props-validation.json').read_text())
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bounds(objects):
 p=[o.matrix_world@v.co for o in objects for v in o.data.vertices];return Vector([min(v[i] for v in p) for i in range(3)]),Vector([max(v[i] for v in p) for i in range(3)])
def apply(o,m):
 world=m@o.matrix_world;o.parent=None;o.matrix_world=world;o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.select_set(False)
def marker(name,location,extras=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=location
 if extras:
  for k,v in extras.items():o[k]=v
 return o
def import_source(name):
 bpy.ops.wm.read_factory_settings(use_empty=True);source=Path('C:/Users/pihan/Downloads')/(name+'.glb');bpy.ops.import_scene.gltf(filepath=str(source));deps=bpy.context.evaluated_depsgraph_get()
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name!='Icosphere']
 for o in objects:
  matrix=o.matrix_world.copy();data=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps);o.modifiers.clear();o.data=data;o.parent=None;o.matrix_world=matrix;apply(o,Matrix.Identity(4))
 return source,objects
def finish(source,objects,name,max_texture=512,extra=None):
 used={m for o in objects if o.type=='MESH' for m in o.data.materials if m}
 images=set()
 for m in used:
  if m.use_nodes:
   images.update(n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
 for im in images:
  w,h=im.size
  if max(w,h)>max_texture:im.scale(max(1,round(w*max_texture/max(w,h))),max(1,round(h*max_texture/max(w,h))))
  im.pack()
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 out=assets/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_extras=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(proof/(name+'.blend')))
 ms=[o for o in objects if o.type=='MESH'];lo,hi=bounds(ms)
 for o in ms:o.data.calc_loop_triangles()
 rec={'source':source.name,'sourceSHA256':digest(source),'output':out.name,'outputSHA256':digest(out),'sourceBytes':source.stat().st_size,'outputBytes':out.stat().st_size,'dimensionsBlender':list(hi-lo),'triangles':sum(len(o.data.loop_triangles) for o in ms),'textureLimit':max_texture,'meshNames':[o.name for o in ms],'changes':extra};receipts.append(rec);print('PROP_READY',json.dumps(rec))
for source_name,name,size,rotation,texture in [
 ('sony_playstation_one_controller','ps1-controller-user-v41',.18,0,512),
 ('playstation_1_-_assignment_-_gap','ps1-console-user-v41',.32,-math.pi/2,1024),
 ('olivetti_underwood_280','olivetti-user-v41',.30,0,512),
 ('mamiya_645_1000s','mamiya-user-v41',.24,math.pi,512),
 ('chrysler_-_new_yorker_1971','chrysler-miniature-user-v41',.68,math.pi/2,512)]:
 if only and name!=only:continue
 receipts[:]=[r for r in receipts if r['output']!=name+'.glb']
 source,meshes=import_source(source_name);source_hash=digest(source)
 for o in meshes:apply(o,Matrix.Rotation(rotation,4,'Z'))
 lo,hi=bounds(meshes);scale=size/(hi.x-lo.x if name.startswith('ps1') else max(hi.x-lo.x,hi.y-lo.y))
 transform=Matrix.Scale(scale,4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
 for o in meshes:
  apply(o,transform)
  if len(o.data.polygons)>25000:
   mod=o.modifiers.new('Small prop mesh budget','DECIMATE');mod.ratio=.55;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 objects=list(meshes);lo,hi=bounds(meshes)
 for i,o in enumerate(meshes):o.name=name+':'+str(i)
 if name.startswith('ps1-controller'):
  objects.append(marker('ControllerCableAnchor',(0,hi.y-.001,hi.z*.58)))
 if name.startswith('ps1-console'):
  objects += [marker('ConsoleControllerPort',(-.102,lo.y-.001,.024)),marker('ConsoleAVPort',(.065,hi.y+.001,.028)),marker('ConsolePowerPort',(-.128,hi.y+.001,.019))]
 finish(source,objects,name,texture,{'uniformScale':scale,'rotationBlenderZ':rotation,'groundAligned':True,'originalMaterialsPreserved':True});assert digest(source)==source_hash
if only:
 (proof/'prepared-props-validation.json').write_text(json.dumps(receipts,indent=2));print('SELECTED_PROP_UPDATED',only);raise SystemExit
# Extract only the selected workstation objects, retaining their materials and UVs.
source,objects=import_source('computer_props_camera_base');source_hash=digest(source);by_name={o.name:o for o in objects};monitor=by_name['Object_6'];mouse=monitor.copy();mouse.data=monitor.data.copy();bpy.context.collection.objects.link(mouse)
for o,keep_mouse in [(monitor,False),(mouse,True)]:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if ((v.co.y<-.3)!=keep_mouse)],context='VERTS');bm.to_mesh(o.data);bm.free();o.data.update()
selected=[]
# Centers use Blender Y; negative Y faces the person. Desktop surface is added in Three.js.
layout=[(monitor,'UserWorkstationMonitor',1.2,(-.27,.22,0)),(mouse,'UserWorkstationMouse',1.2,(.20,-.27,.002)),(by_name['Object_8'],'UserWorkstationKeyboard',1.2,(-.27,-.23,.002)),(by_name['Object_16'],'UserWorkstationTower',1.2,(.64,.12,0)),(by_name['Object_12'],'UserDeskLamp',1.2,(-.01,.13,0)),(by_name['Object_10'],'UserDeskTelephone',1.1,(.59,-.24,0)),(by_name['Object_45'],'UserDeskStapler',.75,(-.79,-.035,.002)),(by_name['Object_43'],'UserDeskPencils',.52,(.12,.02,.004))]
for o,name,scale,target in layout:
 lo,hi=bounds([o]);transform=Matrix.Translation(Vector(target))@Matrix.Scale(scale,4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)));apply(o,transform);o.name=name;selected.append(o)
selected.append(marker('UserDeskLampBulb',(-.356,.145,.658)))
finish(source,selected,'workstation-user-v41',512,{'selection':'Left monitor, keyboard, unit, lamp and mouse; telephone moved right; stapler and pencils from right workstation. All CDs, CD piles, second workstation and desktop speakers excluded.'});assert digest(source)==source_hash
(proof/'prepared-props-validation.json').write_text(json.dumps(receipts,indent=2))
print('SOURCES_PRESERVED',len(receipts))
