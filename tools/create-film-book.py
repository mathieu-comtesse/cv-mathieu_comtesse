import bpy, math, json, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
proof=root.parents[1]/'outputs'/'v50-book'
out=root/'assets'/'film-book-v50.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
def xyz(p):return (p[0],-p[2],p[1])
def marker(name,parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
def material(name,color,roughness=.8):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=roughness
    return m
def printmat(name,file):
    m=material(name,(1,1,1),.86)
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(proof/file));tex.image.pack()
    m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);return m
cloth=material('CharcoalOliveLinen',(.055,.069,.055),.96)
paper=material('WarmIvoryPageEdges',(.72,.68,.56),.95)
edge=material('FinePaperEdge',(.48,.44,.36),.98)
thread=material('LinenBindingThread',(.46,.43,.34),.9)
frontmat=printmat('FirstCoverTypography','front-cover.png')
backmat=printmat('FourthCoverTypography','back-cover.png')
inside=printmat('IvoryEndpapers','endpaper.png')
spinemat=printmat('SpineFoilTitle','spine-print.png')
def box(name,position,size,mat,parent,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(position));o=bpy.context.object;o.name=name
    o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft board corners','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new('Weighted board normals','WEIGHTED_NORMAL')
    o.data.materials.append(mat);o.parent=parent;return o
def plane(name,points,mat,parent,uv=None):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([xyz(p) for p in points],[],[(0,1,2,3)]);mesh.update()
    layer=mesh.uv_layers.new()
    for i,v in enumerate(uv or [(0,0),(1,0),(1,1),(0,1)]):layer.data[i].uv=v
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o.parent=parent;return o
rig=marker('FilmBookRig');rig['createdIn']='Blender 5.2';rig['pageCount']=20
front=marker('FrontCoverHinge',rig);back=marker('BackCoverHinge',rig)
left=marker('LeftLeafBlock',rig);right=marker('RightLeafBlock',rig);binding=marker('BookBinding',rig)
for cover,outer in [(front,frontmat),(back,backmat)]:
    box(cover.name+'Board',(.52,0,0),(1.046,1.429,.023),cloth,cover,.009)
    z=.0116 if cover==front else -.0116
    pts=[(.013,-.703,z),(1.027,-.703,z),(1.027,.703,z),(.013,.703,z)]
    if cover==back:pts=[pts[1],pts[0],pts[3],pts[2]]
    plane(cover.name+'Print',pts,outer,cover)
    z=-z;pts=[(.013,-.703,z),(1.027,-.703,z),(1.027,.703,z),(.013,.703,z)]
    if cover==front:pts=[pts[1],pts[0],pts[3],pts[2]]
    plane(cover.name+'Endpaper',pts,inside,cover)
for block,side in [(left,-1),(right,1)]:
    box(block.name+'Ivory',(.502*side,0,-.024),(.98,1.375,.040),paper,block,.002)
    # Individual signatures give the page edges depth at grazing angles.
    for i in range(1,10):
        z=-.044+i*.004
        box(block.name+'TailEdge'+str(i),(.502*side,-.688,z),(.983,.0006,.0007),edge,block)
        box(block.name+'ForeEdge'+str(i),(.993*side,0,z),(.0007,1.374,.0007),edge,block)
# Curved cloth spine, with an actual rounded cross section and hinge joints.
pts=[];faces=[]
for y in [-.716,.716]:
    for i in range(21):
        a=math.pi/2+math.pi*i/20;pts.append(xyz((.008+.056*math.cos(a),y,.070*math.sin(a))))
for i in range(20):faces.append((i,i+1,22+i,21+i))
mesh=bpy.data.meshes.new('RoundedClothSpine');mesh.from_pydata(pts,[],faces);mesh.update()
o=bpy.data.objects.new('RoundedClothSpine',mesh);bpy.context.collection.objects.link(o);o.parent=binding;o.data.materials.append(cloth)
for p in mesh.polygons:p.use_smooth=True
for y in [-.67,.67]:
    box('BoundSignatureThread'+str(y),(-.01,y,0),(.037,.011,.073),thread,binding,.004)
plane('SpineTitle',[(-.049,-.62,.034),(-.049,.62,.034),(-.049,.62,-.034),(-.049,-.62,-.034)],spinemat,binding)
front.location=xyz((0,0,.074));back.location=xyz((0,0,-.072));left.rotation_euler.z=-math.pi
left.location=xyz((0,0,.025));right.location=xyz((0,0,0))
bpy.ops.wm.save_as_mainfile(filepath=str(proof/'film-book-v50.blend'))
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_extras=True,export_apply=True)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:o.data.calc_loop_triangles()
receipt={'tool':'Blender 5.2','output':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'triangles':sum(len(o.data.loop_triangles) for o in meshes),'nodes':[o.name for o in bpy.context.scene.objects],'originalPhotographsModified':False,'hinges':['FrontCoverHinge','BackCoverHinge','LeftLeafBlock','RightLeafBlock'],'materials':[m.name for m in bpy.data.materials]}
(proof/'model-validation.json').write_text(json.dumps(receipt,indent=2))
print('FILM_BOOK_READY',json.dumps(receipt))
