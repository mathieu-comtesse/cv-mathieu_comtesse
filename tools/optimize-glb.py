# Compresse les modèles 3D du décor vers assets/opt/ (géométrie meshopt, textures WebP 1024 px) ; liste dans assets/opt/list.txt, index.json généré à la fin.
# Usage : GLTF_TRANSFORM=chemin/vers/gltf-transform python3 tools/optimize-glb.py
import subprocess, os, sys
from concurrent.futures import ThreadPoolExecutor
GT=os.environ.get('GLTF_TRANSFORM','gltf-transform')  # npm i -g @gltf-transform/cli sharp
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','assets')
# pas de compression de géométrie (meshopt) pour : arbres (three embarqué plus ancien), personnage, vêtements, animations
SAFE={'bald-cypress','lotus-flower','moss-rock-08','moss-rock-12','stone-lantern','temple-roof-half','anims','reference-character','mathieu-character','jeans-baggy','tshirt-fitted','nb992','nb992-fitted-v27'}
def run(f):
    n=f[:-4]; src=f'{ROOT}/{f}'; out=f'{ROOT}/opt/{f}'; t1=f'/tmp/{n}.1.glb'; t2=f'/tmp/{n}.2.glb'
    try:
        subprocess.run([GT,'resize',src,t1,'--width','1024','--height','1024'],check=True,capture_output=True,timeout=300)
        subprocess.run([GT,'webp',t1,t2,'--quality','82'],check=True,capture_output=True,timeout=300)
        if n in SAFE: os.replace(t2,out)
        else:
            subprocess.run([GT,'meshopt',t2,out,'--level','medium'],check=True,capture_output=True,timeout=300)
        for t in (t1,t2):
            if os.path.exists(t): os.remove(t)
        return f, os.path.getsize(src), os.path.getsize(out)
    except Exception as e:
        return f, os.path.getsize(src), -1
fs=[l.strip() for l in open(os.path.join(ROOT,'opt','list.txt')) if l.strip() and os.path.exists(f'{ROOT}/{l.strip()}')]
tot=[0,0]
with ThreadPoolExecutor(4) as ex:
    for f,a,b in ex.map(run,fs):
        print(f'{f:45s} {a/1048576:5.2f} -> {b/1048576 if b>0 else -1:5.2f} Mo',flush=True)
        if b>0: tot[0]+=a; tot[1]+=b
print(f'TOTAL {tot[0]/1048576:.1f} -> {tot[1]/1048576:.1f} Mo')
