import bpy,json
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root.parents[1]/"outputs"/"ceramic-piggy-bank.blend"))
body=bpy.data.objects["CeramicShell"]
results=[]
for x,y in [(-.22,0),(-.22-.155,0),(-.22+.155,0),(-.22,.009),(-.22,-.009)]:
 inv=body.matrix_world.inverted();hit,p,n,i=body.ray_cast(inv@Vector((x,y,2.4)),inv.to_3x3()@Vector((0,0,-1)))
 z=(body.matrix_world@p).z if hit else None
 results.append({"x":x,"y":y,"firstShellHitZ":z})
 assert z is None or z<1.5, "Coin path blocked at "+str(z)
(root.parents[1]/"outputs"/"coin-slot-ray-validation.json").write_text(json.dumps(results,indent=2))
print("SLOT_SHAFT_CLEAR",json.dumps(results))
