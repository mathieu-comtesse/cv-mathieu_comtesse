import bpy,bmesh,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1]
exec((root/'tools/prepare-desk-v43.py').read_text().split('# Source table units')[0])
proof=root.parents[1]/'outputs'/'v51';proof.mkdir(parents=True,exist_ok=True)
source,meshes=load('backpack')
for o in meshes:
 bm=bmesh.new();bm.from_mesh(o.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000015)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 bm.to_mesh(o.data);bm.free()
simplify(meshes,32000);normalize(meshes,.55,'z')
for o in meshes:o.name='Backpack-'+o.name
finish(source,meshes,'backpack-user-v51',{'height':.55,'sourcePreserved':True,'meshBudget':32000,'weldBeforeSimplification':True,'textureSize':512},512)
fresh();parts=[]
def material(name,col,rough=.55,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1)
 b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*col,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
green=material('Olive polymer grip',(.19,.22,.13),.8)
lime=material('Lime painted aluminium',(.39,.49,.12),.37,.45)
dark=material('Dark locking collars',(.10,.12,.11),.65)
steel=material('Tungsten tips',(.26,.29,.28),.32,.65)
strap=material('Black woven wrist loops',(.032,.036,.034),.96)
def cyl(name,r,d,pos,m,r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=r if r2 is None else r2,radius2=r,depth=d,location=pos);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o);return o
def sphere(name,pos,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);parts.append(o);return o
def cord(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):b.co=p;b.handle_left_type=b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);parts.append(o);return o
for side in [-1,1]:
 x=side*.07;y=side*.025
 cyl('Carbide trekking tip',.0023,.03,(x,y,.015),steel,.0028)
 cyl('Lower telescopic shaft',.0035,.32,(x,y,.185),green)
 cyl('Middle telescopic shaft',.005,.30,(x,y,.49),green)
 cyl('Upper lime shaft',.007,.30,(x,y,.79),lime)
 for z in [.34,.64,.94]:
  cyl('Twist lock collar',.0085,.022,(x,y,z),dark,.009)
 for z in [.405,.46,.515,.57]:
  cyl('Lower green bands',.0051,.010,(x,y,z),lime)
 cyl('Lower foam grip',.012,.11,(x,y,.997),green,.0125)
 for z in [0.955+i*.008 for i in range(10)]:
  cyl('Grip ridge',.0135,.003,(x,y,z),dark)
 cyl('Ergonomic handle',.014,.105,(x,y,1.085),green,.011)
 sphere('Rounded handle crown',(x,y,1.141),(.016,.020,.009),dark)
 cord('Wrist strap',[(x,y,1.139),(x+side*.048,y+.010,1.093),(x+side*.064,y+.015,1.018),(x+side*.037,y,1.014),(x,y,1.129)],.003,strap)
 cyl('Trail basket',.019,.006,(x,y,.051),dark)
 for a in range(6):
  ang=a*math.tau/6;cord('Basket spoke',[(x+.007*math.cos(ang),y+.007*math.sin(ang),.05),(x+.023*math.cos(ang),y+.023*math.sin(ang),.049)],.0025,dark)
finish(root/'tools/create-hiking-props-v51.py',parts,'hiking-poles-recreation-v51',{'method':'Blender recreation from visible reference; not extracted source mesh','reference':'https://sketchfab.com/3d-models/hiking-poles-a3d3cfd1c26e4dbd8f168991f4a7e604','height':1.15},512)
fresh();parts=[]
stone=material('Slate-grey river stone',(.17,.18,.19),.64)
wood=material('Dark mahogany carved dai',(.095,.027,.020),.42)
# Asymmetric eroded hill on a five-lobed river-stone footprint.
N=64;R=18;verts=[];faces=[]
def footprint(a):return 1+.10*math.sin(3*a+.5)+.075*math.cos(5*a-.7)
for j in range(R+1):
 r=j/R
 for i in range(N):
  a=i*math.tau/N;f=footprint(a);x=.205*r*math.cos(a)*f;y=.122*r*math.sin(a)*f
  h=.045+.165*math.exp(-((x+.035)/.074)**2-((y-.010)/.072)**2)+.085*math.exp(-((x-.111)/.056)**2-((y+.012)/.095)**2)+.074*math.exp(-((x+.125)/.053)**2-((y+.035)/.066)**2)
  h=.043+(h-.043)*max(0,1-r**8)
  h+=.008*math.sin(x*100+y*73)*math.sin(y*83-x*41)*(1-r*r)
  verts.append((x,y,h))
for j in range(R):
 for i in range(N):
  a=j*N+i;b=j*N+(i+1)%N;c=(j+1)*N+(i+1)%N;d=(j+1)*N+i;faces.append((a,b,c,d))
# Lower walls meet the carved base without a flat display slab.
lo=len(verts)
for i in range(N):
 a=i*math.tau/N;f=footprint(a);verts.append((.205*math.cos(a)*f,.122*math.sin(a)*f,.036))
for i in range(N):faces.append((R*N+i,R*N+(i+1)%N,lo+(i+1)%N,lo+i))
faces.append(tuple(range(lo,lo+N))[::-1])
me=bpy.data.meshes.new('Eroded river stone');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Kamogawaishi-Recreation',me);bpy.context.collection.objects.link(o);o.data.materials.append(stone);parts.append(o)
for p in me.polygons:p.use_smooth=True
# Bake the mineral veining, avoiding expensive procedural shaders in the browser.
bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.015);bpy.ops.object.mode_set(mode='OBJECT')
nodes=stone.node_tree.nodes;links=stone.node_tree.links
texcoord=nodes.new('ShaderNodeTexCoord');noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=8;noise.inputs['Detail'].default_value=7;noise.inputs['Roughness'].default_value=.78;links.new(texcoord.outputs['Generated'],noise.inputs['Vector'])
ramp=nodes.new('ShaderNodeValToRGB');cr=ramp.color_ramp
cr.elements.remove(cr.elements[1]);cr.elements[0].position=.32;cr.elements[0].color=(.085,.093,.10,1)
for pos,col in [(.48,(.18,.19,.205,1)),(.56,(.30,.29,.255,1)),(.605,(.66,.62,.50,1)),(.65,(.81,.79,.69,1))]:e=cr.elements.new(pos);e.color=col
links.new(noise.outputs['Fac'],ramp.inputs[0])
em=nodes.new('ShaderNodeEmission');links.new(ramp.outputs['Color'],em.inputs['Color']);output=nodes.get('Material Output');links.new(em.outputs[0],output.inputs['Surface'])
im=bpy.data.images.new('MineralVeiningBaked',width=512,height=512);target=nodes.new('ShaderNodeTexImage');target.image=im;nodes.active=target
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.use_clear=True;bpy.ops.object.bake(type='EMIT')
links.new(nodes.get('Principled BSDF').outputs['BSDF'],output.inputs['Surface']);links.new(target.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color']);im.pack()
# Close-fitting mahogany support with a rounded lip and carved feet.
bv=[];bf=[]
for z,s in [(.009,1.01),(.023,1.052),(.031,1.055),(.037,1.025)]:
 for i in range(N):
  a=i*math.tau/N;f=footprint(a);bv.append((.205*math.cos(a)*f*s,.122*math.sin(a)*f*s,z))
for j in range(3):
 for i in range(N):bf.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
bf.extend([tuple(range(N))[::-1],tuple(range(3*N,4*N))])
me=bpy.data.meshes.new('Scalloped mahogany support');me.from_pydata(bv,[],bf);me.update();o=bpy.data.objects.new('MahoganyDai',me);bpy.context.collection.objects.link(o);o.data.materials.append(wood);parts.append(o)
for p in me.polygons:p.use_smooth=True
for x,y in [(-.13,-.06),(.13,-.04),(-.06,.065),(.11,.065)]:
 sphere('Carved mahogany foot',(x,y,.009),(.023,.016,.009),wood)
finish(root/'tools/create-hiking-props-v51.py',parts,'suiseki-recreation-v51',{'method':'Blender recreation from visible reference; not exact scanned mesh','reference':'https://sketchfab.com/3d-models/suiseki-kamogawaishi-type-stone-82d3b58d8fdb48d09193fcd5a27ca84f','width':.46,'base':'carved mahogany'},512)
# Keep the existing binding and invert only the spine print UVs.
bpy.ops.wm.open_mainfile(filepath=str(proof.parent/'v50-book'/'film-book-v50.blend'))
spine=bpy.data.objects['SpineTitle']
for uv in spine.data.uv_layers.active.data:uv.uv=(1-uv.uv.x,1-uv.uv.y)
bpy.ops.wm.save_as_mainfile(filepath=str(proof/'film-book-v51.blend'))
bpy.ops.export_scene.gltf(filepath=str(assets/'film-book-v51.glb'),export_format='GLB',export_extras=True,export_apply=True)
print('V51_PROPS_COMPLETE',flush=True)
