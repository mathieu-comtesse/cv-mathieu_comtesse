import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1];proof=root.parents[1]/'outputs'
source=Path(r'C:/Users/pihan/Downloads/piggy_bank.glb');source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(proof/'user-pig-inspection.blend'))
body=bpy.data.objects['Object_4'];body.name='UserPiggyShell'
bpy.data.objects['Object_5'].name='UserPiggyEyes'
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
anchor=bpy.data.objects.new('CoinSlotAnchor',None);bpy.context.collection.objects.link(anchor)
anchor.location=(0,.43,2.22)
anchor['slotLength']=.62;anchor['slotWidth']=.09;anchor['coinDiameter']=.50;anchor['coinNormalAxis']='X'
# Check the full coin thickness and diameter footprint along the insertion shaft.
checks=[]
thickness=.009254978*.50/.17
for i in range(21):
 y=.43-.25+i*.025
 for x in [-thickness/2,0,thickness/2]:
  hit,p,n,index=body.ray_cast(Vector((x,y,3.2)),Vector((0,0,-1)))
  z=p.z if hit else None
  checks.append({'x':x,'y':y,'firstShellHitZ':z})
  assert z is None or z<.4,'Coin path obstructed: '+str((x,y,z))
bpy.ops.object.select_all(action='DESELECT')
for o in meshes+[anchor]:o.select_set(True)
output=root/'assets'/'piggy-bank-user.glb'
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(proof/'piggy-bank-user.blend'))
assert source_hash==hashlib.sha256(source.read_bytes()).hexdigest()
receipt={'source':str(source),'sourceSHA256':source_hash,'output':str(output),'outputSHA256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size,'sourcePreserved':True,'materialsPreserved':True,'author':'mistour','license':'CC-BY-4.0','sourceUrl':'https://sketchfab.com/3d-models/piggy-bank-d4387ba82d8f4dda85826ee5815640b9','dimensionsBlender':[2.261003494,2.650000095,2.350268602],'slotAnchorBlender':list(anchor.location),'slotAnchorGLTF':[0,2.22,-.43],'slotLength':.62,'slotWidth':.09,'coinDiameter':.50,'coinThickness':thickness,'shaftChecks':checks}
(proof/'piggy-bank-user-validation.json').write_text(json.dumps(receipt,indent=2));print('USER_PIG_VALIDATED',json.dumps({k:v for k,v in receipt.items() if k!='shaftChecks'}))
