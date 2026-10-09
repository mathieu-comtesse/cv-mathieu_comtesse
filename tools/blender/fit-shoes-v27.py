import bpy,json,os,math,bmesh
from mathutils import Vector,Matrix
out=os.path.abspath('outputs/v27-shoe-fit');repo=os.path.abspath('work/cv-runtime');pose=json.load(open(out+'/original-red-shoes.json'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='C:/Users/pihan/Downloads/new_balance_992_made_in_usa_greymetallic.glb')
src=next(o for o in bpy.context.scene.objects if o.type=='MESH');src.data.transform(src.matrix_world);src.matrix_world=Matrix.Identity(4)
for image in bpy.data.images:
 if image.size[0]>1024 or image.size[1]>1024:
  image.scale(1024,1024);image.pack()
for mat in src.data.materials:
 mat.name='NB992 grey suede';bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if bs:bs.inputs['Roughness'].default_value=.84;bs.inputs['Metallic'].default_value=0
mat=bpy.data.materials.new('Chaussettes ivoire');mat.diffuse_color=(.79,.77,.72,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.79,.77,.72,1);mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.96
# Convert Three column-major matrices and its Y-up vectors to Blender Z-up.
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def matrix(a):return Matrix(tuple(tuple(a[col*4+row] for col in range(4)) for row in range(4)))
assets=[];report={'source':'new_balance_992_made_in_usa_greymetallic.glb','method':'Blender per-foot exact envelope of visible original triangles, fitted in foot basis, baked into each original ankle bone space','feet':{}}
for side,sgn in [('left',-1),('right',1)]:
 shoe=bpy.data.objects.new('nb_'+side,src.data.copy());bpy.context.collection.objects.link(shoe)
 bm=bmesh.new();bm.from_mesh(shoe.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.x*sgn<0],context='VERTS');bm.to_mesh(shoe.data);bm.free()
 bpy.ops.object.select_all(action='DESELECT');shoe.select_set(True);bpy.context.view_layer.objects.active=shoe
 dec=shoe.modifiers.new('Simplification WebGL','DECIMATE');dec.ratio=.24;bpy.ops.object.modifier_apply(modifier=dec.name)
 # Original source toe points toward -Y; its heel points toward +Y.
 raw=[Vector((v.co.x,v.co.z,-v.co.y)) for v in shoe.data.vertices];lo=Vector(tuple(min(v[i] for v in raw) for i in range(3)));hi=Vector(tuple(max(v[i] for v in raw) for i in range(3)));ref=pose[side];low=Vector(ref['min']);size=Vector(ref['size']);basis=matrix(ref['basis']);bone=matrix(ref['boneMatrix']);inv=bone.inverted()
 fitted=[Vector(tuple(low[i]+(v[i]-lo[i])/(hi[i]-lo[i])*size[i] for i in range(3))) for v in raw]
 for vertex,v in zip(shoe.data.vertices,fitted):vertex.co=(C@inv@basis)@v
 shoe.data.update();shoe['referenceDimensions']=list(size);assets.append(shoe)
 # Ribbed ankle sleeve plus a foot volume, fully connected when shoes are removed.
 socks=[];centerz=low.z+size.z*.28;bottom=low.y+size.y*.45;top=max(low.y+size.y+.048,.17)
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.047,depth=top-bottom,location=(0,-centerz,(bottom+top)/2));s=bpy.context.object;s.name='sock_'+side;s.data.materials.append(mat);socks.append(s)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(0,-(low.z+size.z*.40),low.y+size.y*.28));f=bpy.context.object;f.scale=(size.x*.33,size.z*.40,size.y*.25);f.data.materials.append(mat);socks.append(f)
 bpy.context.view_layer.update()
 for part in socks:
  # Mesh was constructed in canonical Blender sole axes. Bake its world transform,
  # then map to the measured original foot bone (no runtime resizing).
  part.data.transform(part.matrix_world);part.matrix_world=Matrix.Identity(4)
  for v in part.data.vertices:v.co=(C@inv@basis@C.inverted())@v.co
 bpy.ops.object.select_all(action='DESELECT')
 for part in socks:part.select_set(True)
 bpy.context.view_layer.objects.active=s;bpy.ops.object.join();assets.append(s)
 report['feet'][side]={'dimensions':list(size),'min':ref['min'],'max':ref['max'],'triangles':len(shoe.data.polygons),'boneMatrix':ref['boneMatrix'],'basis':ref['basis'],'sockHeight':top-bottom}
bpy.data.objects.remove(src,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in assets:o.select_set(True)
# Export identity nodes: vertices are already in the corresponding ankle bone space.
path=repo+'/assets/nb992-fitted-v27.glb';bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=85)
json.dump(report,open(repo+'/assets/shoe-calibration-v27.json','w'),indent=2)
# Inspection copy with actual measured ankle transforms; does not touch the open Blender session.
for side in ['left','right']:
 world=C@matrix(pose[side]['boneMatrix'])@C.inverted()
 for o in assets:
  if o.name in ['nb_'+side,'sock_'+side]:o.matrix_world=world
sc=bpy.context.scene;sc.name='NB992 raccord debout';sc.world.color=(.6,.6,.6);sc.render.engine='BLENDER_EEVEE';sc.render.resolution_x=1100;sc.render.resolution_y=850
camd=bpy.data.cameras.new('Controle');cam=bpy.data.objects.new('Controle',camd);sc.collection.objects.link(cam);camd.type='ORTHO';camd.ortho_scale=1.05;center=Vector((0,0,.12));cam.location=center+Vector((1.3,-2,1));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();sc.camera=cam
for pos,energy in [((2,-3,4),450),((-3,1,2),200)]:
 d=bpy.data.lights.new('Key','AREA');d.energy=energy;d.size=3;o=bpy.data.objects.new('Key',d);sc.collection.objects.link(o);o.location=Vector(pos);o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
sc.render.filepath=out+'/blender-nb992-raccord.png';bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=out+'/NB992-chaussettes-ajustees-v27.blend');print('SHOE_FIT',json.dumps(report))
