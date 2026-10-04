"""Exécuté par Blender : construit les bâtiments (batiments_def.py) et les exporte en un seul GLB.

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python tools/atlas-ile/blender_build.py -- assets/atlas/batiments.glb [nom ...]
Chaque bâtiment devient un objet « bat_<nom> » (matériaux « type|#couleur ») avec ses points d'ancrage « ancre_<nom> » en enfants."""
import sys, os, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import blender_kit, batiments_def, batiments_def2, batiments_def3, props_def
importlib.reload(blender_kit); importlib.reload(batiments_def); importlib.reload(batiments_def2); importlib.reload(batiments_def3); importlib.reload(props_def)
from blender_kit import Kit

args = sys.argv[sys.argv.index('--') + 1:]
sortie = args[0]; voulus = args[1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
for nom, f in batiments_def.BATIMENTS.items():
    if voulus and nom not in voulus: continue
    K = Kit(nom); f(K); ob = K.fin()
    print('bâtiment', nom, len(ob.data.polygons), 'faces,', len(ob.data.materials), 'matériaux')
os.makedirs(os.path.dirname(os.path.abspath(sortie)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=sortie, export_format='GLB', export_apply=True, export_yup=True, export_cameras=False, export_lights=False,
                          export_materials='EXPORT', export_extras=False, export_texcoords=False, export_normals=True, export_image_format='NONE')
print('écrit', sortie, os.path.getsize(sortie), 'octets')
