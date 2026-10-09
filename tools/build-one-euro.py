import bpy,math,os
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def material(name,color,metal):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.3;return m
gold=material('Couronne dorée',(1,.65,.2),.72);silver=material('Centre argenté',(.75,.8,.85),.75)
def disk(name,radius,depth,z,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=radius,depth=depth,location=(0,0,z));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 b=o.modifiers.new('Bord','BEVEL');b.width=.003;b.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
 return o
disk('Euro1_GoldRing',.15,.024,0,gold)
disk('Euro1_SilverCentre',.107,.028,0,silver)
for z in [-.016,.016]:
 bpy.ops.object.text_add(location=(0,0,z));o=bpy.context.object;o.name='Euro1_Embossed_1Euro';o.data.body='1 €';o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=.10;o.data.resolution_u=2;o.data.bevel_resolution=0;o.data.extrude=.0018;o.data.bevel_depth=0
 if z<0:o.rotation_euler=(math.pi,0,0)
 o.data.materials.append(silver);bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(root,'assets','one-euro-coin.glb'),export_format='GLB',use_selection=True,export_yup=True)
print('ONE_EURO_COIN_OK')
