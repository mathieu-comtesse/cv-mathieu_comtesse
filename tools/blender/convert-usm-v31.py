import bpy,os,json,hashlib,math
from mathutils import Vector,Matrix
root=os.getcwd();source='C:/Users/pihan/Downloads/USM Haller sideboard 1536x536 740 mm.3ds';original_hash=hashlib.sha256(open(source,'rb').read()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=root+'/../../outputs/usm-source-v31.blend')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=Vector(((hi.x+lo.x)/2,(hi.y+lo.y)/2,lo.z))
for o in meshes:
 matrix=Matrix.Scale(.01,4)@Matrix.Translation(-center)@o.matrix_world;o.data.transform(matrix);o.matrix_world=Matrix.Identity(4)
for m in bpy.data.materials:
 m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 if m.name=='neutral':p.inputs['Base Color'].default_value=(.055,.32,.026,1);p.inputs['Metallic'].default_value=.18;p.inputs['Roughness'].default_value=.32
 elif m.name=='chrom':p.inputs['Base Color'].default_value=(.63,.68,.72,1);p.inputs['Metallic'].default_value=.92;p.inputs['Roughness'].default_value=.24
 else:p.inputs['Base Color'].default_value=(*m.diffuse_color[:3],1);p.inputs['Roughness'].default_value=.6
bpy.context.view_layer.update();record=[]
for o in meshes:
 b=[Vector(v) for v in o.bound_box];a=Vector(tuple(min(p[i] for p in b) for i in range(3)));c=Vector(tuple(max(p[i] for p in b) for i in range(3)));record.append({'name':o.name,'min':list(a),'max':list(c),'faces':len(o.data.polygons)})
with open(root+'/../../outputs/usm-normalized-nodes.json','w') as f:json.dump(record,f,indent=2)
# Source has denser round fittings: simplify curved hardware, preserve panels.
for o in meshes:
 if len(o.data.polygons)>300:
  mod=o.modifiers.new('Web fitting reduction','DECIMATE');mod.ratio=min(.4,300/len(o.data.polygons));bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
drawer=bpy.data.objects.new('USMDrawerFront',None);bpy.context.collection.objects.link(drawer)
body=bpy.data.objects.new('USMSourceBody',None);bpy.context.collection.objects.link(body)
for o in meshes:
 if o.name in ['griff_24','griff_25','griff_26'] or o.name.startswith('tuerel') and 39<=int(o.name[6:])<=46:o.parent=drawer
 else:o.parent=body
bpy.ops.wm.save_as_mainfile(filepath=root+'/../../outputs/usm-green-v31.blend')
bpy.ops.export_scene.gltf(filepath=root+'/assets/usm-haller-green-v31.glb',export_format='GLB',export_animations=False)
# Asset preview of supplied geometry.
bpy.ops.object.light_add(type='AREA',location=(2,-3,4));bpy.context.object.data.energy=550;bpy.context.object.data.size=4
bpy.ops.object.camera_add(location=(2,-3,1.8));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.38))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.15;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=900;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.world.color=(.28,.28,.28);scene.render.film_transparent=True;scene.render.filepath=root+'/../../outputs/usm-green-v31.png';bpy.ops.render.render(write_still=True)
receipt={'source_sha256':original_hash,'source_unchanged':original_hash==hashlib.sha256(open(source,'rb').read()).hexdigest(),'dimensions_m':list((hi-lo)*.01),'meshes':len(meshes),'triangles':sum(len(o.data.polygons) for o in meshes),'units':'cm converted to m','panel_finish':'green','surface_height_m':(hi.z-lo.z)*.01}
with open(root+'/assets/usm-haller-green-v31.json','w') as f:json.dump(receipt,f,indent=2)
