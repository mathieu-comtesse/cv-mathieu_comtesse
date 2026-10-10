import bpy,bmesh
from pathlib import Path
root=Path(__file__).resolve().parents[1]
exec((root/'tools/prepare-desk-v43.py').read_text().split('# Source table units')[0])
proof=root.parents[1]/'outputs'/'v51'
source,meshes=load('backpack')
for o in meshes:
 bm=bmesh.new();bm.from_mesh(o.data)
 before=len(bm.verts)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000015)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 bm.to_mesh(o.data);bm.free()
 print('WELD',o.name,before,len(o.data.vertices),flush=True)
simplify(meshes,32000)
normalize(meshes,.55,'z')
for o in meshes:o.name='Backpack-'+o.name
finish(source,meshes,'backpack-user-v51',{'height':.55,'sourcePreserved':True,'meshBudget':32000,'weldBeforeSimplification':True,'textureSize':512},512)
