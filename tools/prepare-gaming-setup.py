import bpy,bmesh,json,math,hashlib,sys
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];proof=root.parents[1]/'outputs'/'gaming-setup';assets=root/'assets';receipts=[]
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
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('Icosphere')]
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

source,meshes=import_source('gaming_setup_v2_low-poly');before=digest(source);by_name={o.name:o for o in meshes}
selection={
 'GamingLandscapeMonitor':['Plane.006_Material.009_0','Plane.006_Material.010_0'],
 'GamingPortraitMonitor':['Cylinder_plastic.002_0','Cylinder_screen.002_0'],
 'GamingDeskMat':['pad_Material_0'],
 'GamingDeskSpeakerLeft':['Plane.001_Material.005_0'],
 'GamingDeskSpeakerRight':['Plane.003_Material.005_0'],
 'GamingMonitorArms':['Cube_Material.014_0','Cube.002_Material.015_0','Cube.003_Material.016_0','Cube.004_Material.015_0','Cube.005_Material.016_0']}
transform=Matrix.Scale(.27,4)@Matrix.Rotation(-math.pi/2,4,'Z')@Matrix.Translation(Vector((0,0,-2.5885467529296875)))
selected=[]
for group_name,names in selection.items():
 holder=marker(group_name,(0,0,0));selected.append(holder)
 for i,name in enumerate(names):
  o=by_name[name];apply(o,transform)
  if group_name=='GamingDeskMat':
   lo,hi=bounds([o]);apply(o,Matrix.Translation(Vector((0,0,.002-lo.z))))
  o.name=group_name+':'+str(i);o.parent=holder;selected.append(o)
finish(source,selected,'gaming-desk-user-v42',1024,{'uniformScale':.27,'rotationBlenderZ':-math.pi/2,'sourceDesktopHeight':2.5885467529296875,'selection':'Desk mat, both speakers, landscape and portrait monitors and their articulated dual support. Original desk, chair, tower, keyboard and mouse excluded. Existing Moonlander and vertical ergonomic mouse restored in the scene.'})
assert digest(source)==before
(proof/'prepared-props-validation.json').write_text(json.dumps(receipts,indent=2));print('GAMING_SETUP_PREPARED')
