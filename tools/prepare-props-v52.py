import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Matrix,Vector
root=Path(__file__).resolve().parents[1]
exec((root/'tools/prepare-desk-v43.py').read_text().split('# Source table units')[0])
proof=root.parents[1]/'outputs'/'v52';proof.mkdir(parents=True,exist_ok=True)
for name,out,size,axis,budget in [
 ('japanese_traditional_shoes_geta','geta-user-v52',.255,'y',10000),
 ('buddha_-_four_faces','buddha-user-v52',.44,'z',32000)]:
 source,meshes=load(name);lo,hi=bounds(meshes);print('SOURCE_BOUNDS',name,list(lo),list(hi),flush=True)
 for o in meshes:
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 normalize(meshes,size,axis);simplify(meshes,budget)
 finish(source,meshes,out,{'originalUnchanged':True,'groundAligned':True,'size':size,'axis':axis,'vertexWeldBeforeDecimation':True},1024)
(proof/'supplied-assets.json').write_text(json.dumps(receipts,indent=2))
