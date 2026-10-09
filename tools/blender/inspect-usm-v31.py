import bpy,sys,os,json,importlib.util
from mathutils import Vector
root=os.getcwd();bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
spec=importlib.util.spec_from_file_location('import_3ds',root+'/tools/vendor/io_scene_3ds/import_3ds.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
mod.load_3ds('C:/Users/pihan/Downloads/USM Haller sideboard 1536x536 740 mm.3ds',bpy.context,CONSTRAIN=0,IMAGE_SEARCH=False,FILTER={'MESH'},KEYFRAME=False)
bpy.context.view_layer.update();meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];pts=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
report={'bounds':[list(lo),list(hi)],'objects':[{'name':o.name,'dims':list(o.dimensions),'center':list(o.matrix_world.translation),'materials':[m.name for m in o.data.materials]} for o in meshes],'materials':[{'name':m.name,'color':list(m.diffuse_color)} for m in bpy.data.materials]}
with open(root+'/../../outputs/usm-source-inspection.json','w') as f:json.dump(report,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=root+'/../../outputs/usm-source-v31.blend')
