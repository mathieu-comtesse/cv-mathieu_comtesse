"""Bake a sand relief for the Sandboard: wind ripples, fine grains and soft dunes.
Run: Blender --background --python tools/blender-sand.py -- sand-height.png sand-normal.png
Writes an 8-bit height map and a tangent-space normal map (1024 x 724, matching the 34 x 24 board)."""
import bpy, sys, math
from mathutils import noise, Vector
height_path, normal_path = sys.argv[sys.argv.index('--')+1:][:2]
W, H = 1024, 724
def field(u, v):
    # u, v in board units (34 x 24). Ripples run diagonally like wind marks; grains are fine noise.
    p = Vector((u, v, 0.0))
    ripple = math.sin((u*0.55 + v*1.35) * 3.1 + noise.noise(p*0.35)*2.4) * 0.5 + 0.5
    ripple = ripple ** 1.7                                   # sharp crests, wide troughs
    dune = noise.noise(p*0.09) * 0.5 + 0.5
    grain = noise.turbulence(p*2.6, 3, True) * 0.5 + 0.5
    fine = noise.noise(p*9.0) * 0.5 + 0.5
    return 0.42*ripple + 0.30*dune + 0.18*grain + 0.10*fine
hm = [0.0]*(W*H)
for j in range(H):
    for i in range(W):
        hm[j*W+i] = field(i/W*34.0, j/H*24.0)
lo, hi = min(hm), max(hm)
hm = [(h-lo)/(hi-lo) for h in hm]
def save(path, pixels):
    img = bpy.data.images.new('bake', W, H, alpha=False)
    img.pixels = pixels
    img.filepath_raw = path; img.file_format = 'PNG'; img.save()
px = []
for j in range(H):
    for i in range(W):
        h = hm[j*W+i]; px += [h, h, h, 1.0]
save(height_path, px)
# Normals: finite differences, board is 34 units wide and the relief spans about 0.12 units.
amp = 0.12; du = 34.0/W; dv = 24.0/H
nx_px = []
for j in range(H):
    for i in range(W):
        hl = hm[j*W+max(i-1,0)]; hr = hm[j*W+min(i+1,W-1)]
        hd = hm[max(j-1,0)*W+i]; hu = hm[min(j+1,H-1)*W+i]
        n = Vector((-(hr-hl)*amp/(2*du), -(hu-hd)*amp/(2*dv), 1.0)).normalized()
        nx_px += [n.x*0.5+0.5, n.y*0.5+0.5, n.z*0.5+0.5, 1.0]
save(normal_path, nx_px)
print('written', height_path, normal_path)
