import bpy,json,math,hashlib,importlib.util
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1];assets=root/'assets';proof=root.parents[1]/'outputs'/'desk-v43';receipts=[]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def bounds(objects):
 p=[o.matrix_world@v.co for o in objects if o.type=='MESH' for v in o.data.vertices];return Vector([min(v[i] for v in p) for i in range(3)]),Vector([max(v[i] for v in p) for i in range(3)])
def bake(o,m=Matrix.Identity(4)):
 o.data.transform(m@o.matrix_world);o.parent=None;o.matrix_world=Matrix.Identity(4);o.data.update()
def fresh():bpy.ops.wm.read_factory_settings(use_empty=True)
def load(name):
 fresh();source=Path('C:/Users/pihan/Downloads')/(name+'.glb');bpy.ops.import_scene.gltf(filepath=str(source));deps=bpy.context.evaluated_depsgraph_get();meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in meshes:
  lineage=[];p=o
  while p:lineage.append(p.name);p=p.parent
  o['sourceLineage']='|'.join(lineage);matrix=o.matrix_world.copy();o.data=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps);o.modifiers.clear();o.parent=None;o.matrix_world=matrix;bake(o)
 return source,meshes
def simplify(objects,budget):
 total=sum(len(o.data.polygons) for o in objects)
 ratio=min(1,budget/max(1,total))
 for o in objects:
  if len(o.data.polygons)>100:
   bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Web mesh budget','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name)
def empty(name,pos,extras=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos
 for k,v in (extras or {}).items():o[k]=v
 return o
def normalize(meshes,size,axis='x',rotation=None):
 if rotation:
  for o in meshes:bake(o,rotation)
 lo,hi=bounds(meshes);scale=size/(hi['xyz'.index(axis)]-lo['xyz'.index(axis)]);m=Matrix.Scale(scale,4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
 for o in meshes:bake(o,m)
 return scale
def finish(source,objects,name,changes,texture=512):
 selected=set(objects)
 for o in list(bpy.context.scene.objects):
  if o not in selected:bpy.data.objects.remove(o,do_unlink=True)
 used={m for o in objects if o.type=='MESH' for m in o.data.materials if m};images={n.image for m in used if m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image}
 for im in images:
  w,h=im.size
  if max(w,h)>texture:im.scale(max(1,round(w*texture/max(w,h))),max(1,round(h*texture/max(w,h))))
  im.pack()
 bpy.ops.object.select_all(action='SELECT');out=assets/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_extras=True,use_selection=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(proof/(name+'.blend')))
 meshes=[o for o in objects if o.type=='MESH'];lo,hi=bounds(meshes)
 for o in meshes:o.data.calc_loop_triangles()
 r={'source':source.name,'sourceSHA256':digest(source),'output':out.name,'outputSHA256':digest(out),'dimensionsBlender':list(hi-lo),'boundsBlender':[list(lo),list(hi)],'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':out.stat().st_size,'changes':changes};receipts.append(r);(assets/(name+'.provenance.json')).write_text(json.dumps(r,indent=2));print('READY',name,r['triangles'],r['bytes'],flush=True)
 # Review the actual exported geometry; each background session has its own file.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=800;scene.render.resolution_y=650;scene.render.resolution_percentage=100;scene.render.film_transparent=True
 center=(lo+hi)/2;s=max(hi-lo);bpy.ops.object.camera_add(location=center+Vector((s*1.7,-s*2.5,s*1.6)));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=s*1.55;scene.camera=cam
 scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
 for delta,power in [((2,-3,4),350),((-3,2,3),220)]:
  bpy.ops.object.light_add(type='AREA',location=center+Vector(delta)*s);lamp=bpy.context.object;lamp.data.energy=power*s*s;lamp.data.size=s*3;lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(proof/(name+'.png'));bpy.ops.render.render(write_still=True)

# Source table units are centimetres. The original material assignments are kept.
fresh();table=Path('C:/Users/pihan/Downloads/USM Haller table 1500x750 740 mm.3ds');spec=importlib.util.spec_from_file_location('import_3ds',root/'tools/vendor/io_scene_3ds/import_3ds.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);mod.load_3ds(str(table),bpy.context,CONSTRAIN=0,IMAGE_SEARCH=False,FILTER={'MESH'},KEYFRAME=False)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];lo,hi=bounds(meshes);m=Matrix.Scale(.01,4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
for o in meshes:
 bake(o,m)
 for mat in o.data.materials:
  if not mat:continue
  mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=mat.diffuse_color;bs.inputs['Metallic'].default_value=1 if mat.name=='chrom' else 0;bs.inputs['Roughness'].default_value=.22 if mat.name=='chrom' else .55
finish(table,meshes,'usm-table-user-v43',{'scale':.01,'units':'source centimetres to metres','originalGeometry':True})

# The supplied DWG is a 2D drawing, not a 3D solid. Build its three-drawer volume.
fresh();dwg=Path('C:/Users/pihan/Downloads/USM Haller Haller mobile pedestral 418x523 605 mm 3T_2D.dwg')
def material(name,col,metal=0,rough=.4):
 m=bpy.data.materials.new(name);m.diffuse_color=(*col,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*col,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough;return m
chrome=material('USM chrome',(.63,.65,.67),1,.18);white=material('USM white powdercoat',(.86,.88,.87),.2,.42);black=material('Castor rubber',(.02,.024,.028),0,.65)
parts=[]
def cube(name,dims,pos,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);parts.append(o);return o
def cylinder(name,r,depth,pos,mat,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=depth,location=pos,rotation=rotation);o=bpy.context.object;o.name=name;o.data.materials.append(mat);parts.append(o);return o
for x in [-.1965,.1965]:
 for y in [-.249,.249]:
  cylinder('Chrome upright',.0065,.525,(x,y,.33),chrome)
  for z in [.0675,.2425,.4175,.5925]:
   bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.0125,location=(x,y,z));o=bpy.context.object;o.name='USM ball joint';o.data.materials.append(chrome);parts.append(o)
  cylinder('Castor',.0275,.020,(x*.9,y*.9,.0275),black,(0,math.pi/2,0));cube('Castor fork',(.012,.017,.030),(x*.9,y*.9,.05),chrome)
for z in [.0675,.2425,.4175,.5925]:
 for y in [-.249,.249]:cylinder('Horizontal chrome tube',.0065,.393,(0,y,z),chrome,(0,math.pi/2,0))
 for x in [-.1965,.1965]:cylinder('Depth chrome tube',.0065,.498,(x,0,z),chrome,(math.pi/2,0,0))
cube('Top',(.38,.482,.003),(0,0,.589),white);cube('Back',(.38,.003,.515),(0,.246,.33),white)
for x in [-.193,.193]:cube('Side panel',(.003,.483,.514),(x,0,.33),white)
for z in [.155,.33,.505]:
 cube('Drawer front',(.378,.003,.161),(0,-.247,z),white);cylinder('Circular drawer pull',.018,.005,(0,-.252,z+.01),chrome,(math.pi/2,0,0));cylinder('Lock',.005,.006,(0,-.255,z+.01),black,(math.pi/2,0,0))
finish(dwg,parts,'usm-mobile-user-v43',{'method':'3D reconstruction from supplied three-drawer 2D DWG and 418 x 523 x 605 mm specification','drawerPitch':.175,'outerSize':[.418,.523,.605]})

source,meshes=load('logitech_mx_master_2s_danish_blends');normalize(meshes,.126,'y',Matrix.Rotation(-math.pi/2,4,'Z'));simplify(meshes,7500)
finish(source,meshes,'mx-master-user-v43',{'length':.126,'groundAligned':True,'rotationZ':-math.pi/2},1024)

source,meshes=load('bloc_multiprise_-_multipower_block');meshes=[o for o in meshes if o.name not in ['Object_18','Object_20','Object_24']];normalize(meshes,.38,'x');simplify(meshes,7000);lo,hi=bounds(meshes)
finish(source,meshes+[empty('StripCordOutlet',(hi.x,0,.012))],'powerstrip-user-v43',{'exclude':'Presentation ground, banner and source loose cord; new scene cable routes connect devices','groundAligned':True})

source,meshes=load('dream_computer_setup');old=[o for o in meshes if 'RTX2080ti' in o['sourceLineage'].split('|')];lo,hi=bounds(old);oldCenter=(lo+hi)/2;targetLength=(hi.x-lo.x)*.96
meshes=[o for o in meshes if o not in old and not any(x.startswith('imagePlane') for x in o['sourceLineage'].split('|'))]
for o in old:bpy.data.objects.remove(o,do_unlink=True)
before=set(bpy.context.scene.objects);gpu=Path('C:/Users/pihan/Downloads/asus_rog_geforce_rtx_4090_v2.0.glb');bpy.ops.import_scene.gltf(filepath=str(gpu));new=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH'];deps=bpy.context.evaluated_depsgraph_get()
for o in new:
 matrix=o.matrix_world.copy();o.data=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps);o.modifiers.clear();o.parent=None;o.matrix_world=matrix;bake(o,Matrix.Rotation(-math.pi/2,4,'X'))
nlo,nhi=bounds(new);s=targetLength/(nhi.x-nlo.x);m=Matrix.Translation(oldCenter)@Matrix.Scale(s,4)@Matrix.Translation(-(nlo+nhi)/2)
for o in new:bake(o,m)
meshes+=new;towerScale=normalize(meshes,.475,'z');simplify(meshes,22000)
holder=empty('AsusROGRTX4090',(0,0,0),{'sourceSHA256':digest(gpu),'replacement':'RTX2080ti','rotationBlenderX':-math.pi/2,'lengthFitRatio':.96,'fanNormal':[0,-1,0]})
for o in new:o.parent=holder
lo,hi=bounds(meshes);ports=[empty('PCPowerPort',(.10,hi.y,.05)),empty('PCVideoPort',(.04,hi.y,.14)),empty('PCUSBPort',(.02,hi.y,.22))]
finish(source,meshes+[holder]+ports,'dream-pc-user-v43',{'GPU':gpu.name,'GPUsha256':digest(gpu),'originalGPU':'RTX2080ti','height':.475,'orientation':'Original long axis X and fan-facing negative Y preserved','oldGpuBounds':[list(lo),list(hi)]},512)

source,meshes=load('magnavox_19_crt_tv_-_rr1938_w122');meshes=[o for o in meshes if o.name not in ['Object_13','Object_14']];screen=next(o for o in meshes if o.name=='Object_6');screen.name='MagnavoxScreen';normalize(meshes,.66,'x',Matrix.Rotation(-math.pi/2,4,'Z'));simplify([o for o in meshes if o!=screen],18000)
# Front faces -Y in Blender, +Z in glTF. Keep the curved original screen geometry.
lo,hi=bounds(meshes);ports=[empty('TVAVPort',(.08,hi.y,.15)),empty('TVPowerPort',(-.12,hi.y,.12))]
finish(source,meshes+ports,'magnavox-tv-user-v43',{'width':.66,'screen':'Original curved geometry, live PS1 image applied by runtime','rotationZ':-math.pi/2,'exclude':'Loose original cord and plug replaced with connected scene power cable'},1024)
(proof/'prepared-v43.json').write_text(json.dumps(receipts,indent=2));print('ALL_ASSETS_READY',flush=True)
