import bpy, bmesh, json, math, sys
from mathutils import Vector
out = sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def new_object(name, mesh):
    obj = bpy.data.objects.new(name, mesh); scene.collection.objects.link(obj); return obj

# --- Handle: a hickory haft with a slight S curve, oval section, swell at the knob. Along +Y (Blender Z becomes three.js Y later).
def handle():
    bm = bmesh.new()
    n = 28; segs = 18; L = 1.20
    rings = []
    for i in range(n+1):
        t = i/n; y = t*L
        # side sway (toward +Z, forward) and knob swell at the grip end
        sway = 0.045*math.sin(t*math.pi)*(1-t) + 0.02*t*t
        rx = 0.028 + 0.010*(1-t)**2 + (0.014 if t < 0.10 else 0) * (1 - t/0.10)
        rz = rx*1.45
        ring = []
        for k in range(segs):
            a = k/segs*2*math.pi
            ring.append(bm.verts.new((rx*math.cos(a), y, sway + rz*math.sin(a))))
        rings.append(ring)
    for i in range(n):
        for k in range(segs):
            a,b = rings[i][k], rings[i][(k+1)%segs]; c,d = rings[i+1][(k+1)%segs], rings[i+1][k]
            bm.faces.new((a,b,c,d))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new('handle'); bm.to_mesh(me); bm.free(); me.shade_smooth() if hasattr(me,'shade_smooth') else None
    return new_object('handle', me)

# --- Head: felling-axe profile in the (Z forward, Y up) plane; thickness along X tapers to the bit.
def head():
    # profile points (z, y): back of poll -> top -> bit (front, z negative) -> bottom -> back
    prof = [(0.15,1.02),(0.16,1.10),(0.14,1.19),(0.06,1.22),(-0.06,1.23),(-0.20,1.27),(-0.34,1.34),(-0.44,1.36),
            (-0.47,1.30),(-0.475,1.17),(-0.47,1.04),(-0.44,0.98),(-0.33,1.00),(-0.20,1.05),(-0.06,1.07),(0.06,1.06),(0.14,1.03)]
    def thick(z):
        # full at the eye (z in [-0.06,0.15]), tapering to a fine edge at the bit
        if z >= -0.06: return 0.070
        u = (z + 0.06)/(-0.475+0.06)      # 0 at eye, 1 at edge
        return 0.070*(1-u)**1.35 + 0.004*u
    bm = bmesh.new()
    left, right = [], []
    for (z,y) in prof:
        t = thick(z)/2
        left.append(bm.verts.new((-t,y,z))); right.append(bm.verts.new((t,y,z)))
    fl = bm.faces.new(left); fr = bm.faces.new(right[::-1])
    n = len(prof)
    for i in range(n):
        a,b = left[i], left[(i+1)%n]; c,d = right[(i+1)%n], right[i]
        bm.faces.new((b,a,d,c))
    bmesh.ops.triangulate(bm, faces=[fl, fr])
    me = bpy.data.meshes.new('head'); bm.to_mesh(me); bm.free()
    obj = new_object('head', me)
    bev = obj.modifiers.new('bevel','BEVEL'); bev.width = 0.006; bev.segments = 2; bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(40)
    return obj

def wedge():
    # small steel wedge visible at the top of the eye
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x*0.03, v.co.y*0.03 + 1.235, v.co.z*0.12 + 0.045))
    me = bpy.data.meshes.new('wedge'); bm.to_mesh(me); bm.free(); return new_object('wedge', me)

parts = {'handle': handle(), 'head': head(), 'wedge': wedge()}
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
data = {}
for name, obj in parts.items():
    ev = obj.evaluated_get(dg); me = ev.to_mesh()
    me.calc_loop_triangles()
    try: me.calc_normals_split()
    except Exception: pass
    pos, nor = [], []
    smooth = name == 'handle'
    for tri in me.loop_triangles:
        for li in tri.loops:
            l = me.loops[li]; v = me.vertices[l.vertex_index].co
            n = me.vertices[l.vertex_index].normal if smooth else tri.normal
            pos += [round(v.x,5), round(v.y,5), round(v.z,5)]; nor += [round(n.x,4), round(n.y,4), round(n.z,4)]
    data[name] = {'position': pos, 'normal': nor}
    ev.to_mesh_clear()
# the bit: front edge line for the cutting point (mid-height of the edge)
data['edge'] = {'point': [0, 1.17, -0.475], 'top': 1.30, 'bottom': 1.04}
json.dump(data, open(out,'w'), separators=(',',':'))
print('written', out, {k: len(v.get('position',[]))//3 for k,v in data.items() if 'position' in v})
