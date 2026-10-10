import bpy,math,json
from pathlib import Path
from mathutils import Vector,Matrix
root=Path(__file__).resolve().parents[1]
exec((root/'tools/prepare-desk-v43.py').read_text().split('# Source table units')[0])
proof=root.parents[1]/'outputs'/'v52';fresh();parts=[]
def mat(name,col,metal=0,rough=.3):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1);b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*col,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
orange=mat('Orange ABS housing',(.92,.17,.018),0,.24);black=mat('Smoked black visor',(.009,.012,.017),0,.2);chrome=mat('Polished chrome',(.65,.67,.7),1,.19);rubber=mat('Black dial rubber',(.012,.014,.018),0,.55);white=mat('Ivory scale marks',(.87,.86,.77),0,.45);glass=mat('Convex CRT glass',(.021,.04,.06),.2,.13)
def cube(name,dims,pos,m,bevel=.004):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:
  mod=o.modifiers.new('Moulded edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 parts.append(o);return o
def sphere(name,r,pos,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,radius=r,location=pos);o=bpy.context.object;o.name=name;o.data.materials.append(m);parts.append(o)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cyl(name,r,d,pos,m,tilt=0):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=r,depth=d,location=pos,rotation=(tilt,0,0));o=bpy.context.object;o.name=name;o.data.materials.append(m);parts.append(o)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cord(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for b,p in zip(s.points,points):b.co=(*p,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);parts.append(o);return o
cube('Square orange pedestal',(.272,.247,.044),(0,.016,.022),orange,.012)
for side in [-1,1]:
 for i in range(16):
  cube('Pedestal ventilation slit',(.003,.003,.019),(side*.134,-.078+i*.011,.025),rubber,.0005)
for x in [-.085,.085]:
 for y in [-.063,.095]:cyl('Rubber foot',.014,.004,(x,y,.002),rubber)
cyl('Orange support neck',.059,.048,(0,.025,.062),orange)
sphere('Spherical moulded orange cabinet',.154,(0,0,.223),orange)
# Smoked visor follows the front of the spherical cabinet.
vs=[];faces=[]
for j in range(33):
 a=math.radians(30+120*j/32)
 for i in range(49):
  b=math.radians(-63+126*i/48);vs.append((.156*math.sin(a)*math.sin(b),-.156*math.sin(a)*math.cos(b),.223+.156*math.cos(a)))
for j in range(32):
 for i in range(48):k=j*49+i;faces.append((k,k+1,k+50,k+49))
mesh=bpy.data.meshes.new('Spherical visor mesh');mesh.from_pydata(vs,[],faces);mesh.update();o=bpy.data.objects.new('Black wraparound front visor',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(black);parts.append(o)
for p in mesh.polygons:p.use_smooth=True
# Rounded rectangular convex faceplate, projected on the sphere (front -Y).
def point(u,v,offset):
 x=.106*u;z=.223+.074*v
 return(x,-math.sqrt(max(.001,.156**2-x*x-(z-.223)**2))-offset,z)
sv=[];sf=[]
for j in range(25):
 v=-1+2*j/24
 for i in range(33):
  u=-1+2*i/32;xx=u*(1-.09*abs(v)**10);yy=v*(1-.10*abs(u)**10);sv.append(point(xx,yy,.003))
for j in range(24):
 for i in range(32):k=j*33+i;sf.append((k,k+1,k+34,k+33))
me=bpy.data.meshes.new('Convex CRT faceplate');me.from_pydata(sv,[],sf);me.update();o=bpy.data.objects.new('Videosphere curved CRT',me);bpy.context.collection.objects.link(o);o.data.materials.append(glass);parts.append(o)
for p in me.polygons:p.use_smooth=True
rim=[]
for edge in range(4):
 for i in range(33):
  t=-1+2*i/32;u,v=[(t,-1),(1,t),(-t,1),(-1,-t)][edge];rim.append(point(u*(1-.09*abs(v)**10),v*(1-.1*abs(u)**10),.005))
rim.append(rim[0]);cord('Silver CRT perimeter trim',rim,.0016,chrome)
# Twin top tuning controls tilt toward viewer.
for x,r in [(-.055,.018),(.039,.025)]:
 pos=Vector((x,-.061,.363));tilt=math.radians(31);axis=Vector((0,-math.sin(tilt),math.cos(tilt)));cyl('Black top tuning dial',r,.035,pos,rubber,tilt);cyl('Ivory tuning scale',r*.78,.0015,pos+axis*.019,white,tilt);cyl('Black dial centre',r*.24,.002,pos+axis*.020,rubber,tilt)
 for i in range(12):
  angle=i*math.tau/12;delta=Vector((r*.65*math.cos(angle),r*.65*math.sin(angle),0));delta=Matrix.Rotation(tilt,4,'X')@delta
  sphere('Tuning scale tick',.001,pos+axis*.021+delta,rubber)
cord('Chrome carrying loop',[(-.071,.025,.366),(-.071,.026,.405),(.075,.026,.405),(.075,.025,.366)],.0035,chrome)
# Orange rear ventilation strips and telescopic aerial.
for i in range(9):
 a=-.6+i*.13;x=.148*math.cos(a);y=.148*math.sin(a)
 vent=cube('Cabinet black ventilation slot',(.0025,.005,.035),(x,y,.259),rubber,.0005);vent.rotation_euler.z=a
cord('Cabinet seam',[(.154*math.sin(i*math.tau/128),.154*math.cos(i*math.tau/128),.223) for i in range(129)],.0006,rubber)
antenna=[(.075,.065,.354),(.13,.10,.50),(.164,.12,.584)]
cord('Telescopic antenna lower',antenna[:2],.0024,chrome);cord('Telescopic antenna upper',antenna[1:],.0013,chrome);sphere('Antenna tip',.003,antenna[-1],chrome);sphere('Antenna ball socket',.009,antenna[0],black)
# Small ivory brand decal as physical text, with no film still.
bpy.ops.object.text_add(location=(0,-.146,.125),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='JVC NIVICO badge';o.data.body='JVC NIVICO';o.data.size=.006;o.data.align_x='CENTER';o.data.extrude=.0001;o.data.materials.append(white);parts.append(o)
# Curves/text converted for a portable glTF and bounded browser geometry.
for o in parts:
 if o.type!='MESH':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 bpy.context.view_layer.update();bake(o)
normalize(parts,.46,'z')
# Editable high-detail source, generated locally, distinct from the inaccessible Sketchfab mesh.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(proof/'jvc-videosphere-source-v52.blend'))
simplify(parts,22000)
finish(root/'tools/create-jvc-v52.py',parts,'jvc-videosphere-recreation-v52',{'method':'Original visual reconstruction in Blender, not a copy of source topology','reference':'https://sketchfab.com/3d-models/jvc-nivico-videosphere-2e8339246f2941079dfa7e27353551c7','referenceAuthor':'Fede','referenceReportedTriangles':572500,'height':.46,'originalDownloadAvailable':False},512)
