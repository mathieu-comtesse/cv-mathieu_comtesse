import bpy,sys,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
exec((root/'tools/prepare-desk-v43.py').read_text().split('# Source table units')[0])
fresh();parts=[]
def m(name,col):
 mat=bpy.data.materials.new(name);mat.use_nodes=True;b=mat.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*col,1);b.inputs['Roughness'].default_value=.35;return mat
black=m('Matte charcoal',(.038,.043,.05));diffuser=m('Warm diffuser',(.97,.91,.73));bs=diffuser.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(1,.88,.58,1);bs.inputs['Emission Strength'].default_value=1.5
def cube(name,dims,pos,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);parts.append(o)
def cylinder(name,r,d,pos,rotation):
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=d,location=pos,rotation=rotation);o=bpy.context.object;o.name=name;o.data.materials.append(black);parts.append(o)
cylinder('Horizontal light bar',.014,.39,(0,-.018,.028),(0,math.pi/2,0));cube('LED diffuser',(.37,.011,.002),(0,-.024,.015),diffuser)
cube('Front clamp',(.057,.011,.040),(0,-.012,-.006),black);cube('Top hinge',(.061,.055,.014),(0,.012,.01),black);cube('Rear clamp',(.041,.012,.046),(0,.038,-.014),black);cylinder('Rear counterweight',.024,.06,(0,.046,-.041),(0,math.pi/2,0))
finish(root/'tools/build-screenbar-v43.py',parts,'screenbar-v43',{'reference':'User-provided monitor light bar image','width':.39,'support':'Clamp and rear counterweight','diffuser':'Warm downward LED'},512)
