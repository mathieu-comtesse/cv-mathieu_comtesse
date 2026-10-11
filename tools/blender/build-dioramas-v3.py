# Ateliers v3 : détails et mécanismes des décors professionnels.
# Depuis la racine du dépôt :
#   blender -b --python tools/blender/build-dioramas-v3.py -- finance pa
# Part des modèles v2 du commit SOURCE_REV, reconstruit les
# mécanismes demandés puis réécrit le .glb.gz. Les noms animés et StepAnchor_* restent.
import bpy, bmesh, gzip, math, os, subprocess, sys, tempfile
from mathutils import Vector, Matrix

ROOT = os.getcwd()
DEST = os.path.join(ROOT, 'assets', 'dioramas-v2')
# Modèles v2 publiés avant ce script : la reconstruction repart toujours de cette version.
SOURCE_REV = 'b686947'
TAU = math.pi * 2


# ---------------------------------------------------------------- matériaux
def srgb(hexa):
    return tuple(((int(hexa[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5)) + (1,)


def material(name, color, metal=0.0, rough=0.5, emission=None):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emission:
        b.inputs['Emission Color'].default_value = srgb(emission)
        b.inputs['Emission Strength'].default_value = 1.0
    m.diffuse_color = srgb(color)
    return m


def existing(prefix, fallback):
    for m in bpy.data.materials:
        if m.name.split('.')[0] == prefix:
            return m
    return fallback()


# ---------------------------------------------------------------- géométrie
def link(o, parent=None):
    bpy.context.scene.collection.objects.link(o)
    if parent:
        o.parent = parent
    return o


def empty(name, at, parent=None):
    o = bpy.data.objects.new(name, None)
    o.location = at
    return link(o, parent)


def finish(o, mat, sharp=0.6, bevel=0.0, segments=2):
    o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('Edges', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
        mod.harden_normals = True
        mod.use_clamp_overlap = True
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.set_sharp_from_angle(angle=sharp)
    return o


def from_bmesh(name, bm, mat, parent=None, **kw):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    link(o, parent)
    return finish(o, mat, **kw)


def frame_to(direction):
    """Matrix turning local +Z toward direction."""
    return Vector(direction).normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()


def lathe(name, profile, mat, at=(0, 0, 0), axis=(0, 0, 1), seg=64, parent=None, **kw):
    """Solid of revolution of (radius, height) points around local Z."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(a * TAU / seg), r * math.sin(a * TAU / seg), z)) for a in range(seg)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1:
                bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                bm.faces.new((a[j], a[i], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.transform(Matrix.Translation(at) @ frame_to(axis))
    return from_bmesh(name, bm, mat, parent, **kw)


def disc(r0, r1, z0, z1):
    """Profile of a flat ring or full disc between two heights."""
    pts = [(r0, z0), (r1, z0), (r1, z1), (r0, z1)]
    return pts + [pts[0]] if r0 > 0 else [(0, z0), (r1, z0), (r1, z1), (0, z1)]


def prism(name, outline, z0, z1, mat, matrix=Matrix(), parent=None, **kw):
    """Extrudes a closed XY outline from z0 to z1, then places it."""
    bm = bmesh.new()
    lo = [bm.verts.new((x, y, z0)) for x, y in outline]
    hi = [bm.verts.new((x, y, z1)) for x, y in outline]
    bm.faces.new(list(reversed(lo)))
    bm.faces.new(hi)
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    bm.transform(matrix)
    return from_bmesh(name, bm, mat, parent, **kw)


def box(name, center, size, mat, parent=None, bevel=0.006, **kw):
    sx, sy, sz = (s / 2 for s in size)
    outline = [(-sx, -sy), (sx, -sy), (sx, sy), (-sx, sy)]
    return prism(name, outline, -sz, sz, mat, Matrix.Translation(center), parent, bevel=bevel, **kw)


def sweep(name, points, radius, mat, seg=24, parent=None, caps=True, **kw):
    """Tube following a polyline with rotation-minimising frames."""
    pts = [Vector(p) for p in points]
    bm = bmesh.new()
    t = (pts[1] - pts[0]).normalized()
    n = t.orthogonal().normalized()
    rings = []
    for k, p in enumerate(pts):
        if 0 < k < len(pts) - 1:
            nt = (pts[k + 1] - pts[k - 1]).normalized()
        else:
            nt = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        n = (n - nt * n.dot(nt)).normalized()
        b = nt.cross(n)
        rings.append([bm.verts.new(p + (n * math.cos(a * TAU / seg) + b * math.sin(a * TAU / seg)) * radius) for a in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    return from_bmesh(name, bm, mat, parent, **kw)


def arc(center, radius, a0, a1, plane=('x', 'y'), steps=16, z=0.0):
    out = []
    for i in range(steps + 1):
        a = a0 + (a1 - a0) * i / steps
        p = {'x': 0.0, 'y': 0.0, 'z': 0.0}
        p[plane[0]] = center[0] + radius * math.cos(a)
        p[plane[1]] = center[1] + radius * math.sin(a)
        out.append(p)
    return out


def thread(name, r_core, depth, pitch, length, at, mat, parent=None, steps=40):
    """Right-hand trapezoidal thread built as a true helix (Screw modifier)."""
    bm = bmesh.new()
    prof = [(r_core - 0.002, -pitch * 0.42), (r_core + depth, -pitch * 0.16), (r_core + depth, pitch * 0.16), (r_core - 0.002, pitch * 0.42)]
    vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    for i in range(len(vs)):
        bm.edges.new((vs[i], vs[(i + 1) % len(vs)]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me), parent)
    o.location = at
    mod = o.modifiers.new('Helix', 'SCREW')
    mod.axis = 'Z'
    mod.angle = TAU
    mod.screw_offset = pitch
    mod.iterations = max(1, int(length / pitch))
    mod.steps = steps
    mod.render_steps = steps
    mod.use_normal_calculate = True
    o.data.materials.append(mat)
    return o


def bolt(name, at, normal, mat, size=0.016, parent=None):
    """Hex head, washer and protruding thread, aligned to a face normal."""
    m = Matrix.Translation(at) @ frame_to(normal)
    hexa = [(size * math.cos(a * TAU / 6 + math.pi / 6), size * math.sin(a * TAU / 6 + math.pi / 6)) for a in range(6)]
    prism(name, hexa, size * 0.25, size * 0.95, mat, m, parent, bevel=size * 0.12)
    lathe(name + ' washer', disc(0, size * 1.35, 0, size * 0.25), mat, seg=20, parent=parent).matrix_world = m
    lathe(name + ' stud', [(0, size * 0.95), (size * 0.55, size * 0.95), (size * 0.55, size * 1.45), (size * 0.4, size * 1.6), (0, size * 1.6)], mat, seg=16, parent=parent).matrix_world = m


def remove(predicate):
    doomed = [o for o in bpy.data.objects if predicate(o)]
    for o in doomed:
        bpy.data.objects.remove(o, do_unlink=True)
    return len(doomed)


def text_mesh(name, body, at, size, mat, parent=None, rot=(math.pi / 2, 0, 0)):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = body
    curve.size = size
    curve.extrude = size * 0.06
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    o = link(bpy.data.objects.new(name, curve))
    o.location = at
    o.rotation_euler = rot
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.selected_objects:
        s.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.data.materials.clear()
    o.data.materials.append(mat)
    if parent:
        mw = o.matrix_world.copy()
        o.parent = parent
        o.matrix_world = mw
    return o


# ---------------------------------------------------------------- finition commune
SKIP_REFINE = ('flowpipe', 'text', 'label', 'title', 'engrav', 'tick', 'graduation', 'glyph', 'monogram', 'screen', 'display', 'lens', 'envelope', 'thread', 'puff')


def refine():
    """Bevelled manufactured edges and angle-based smoothing on every authored part.

    Raises the triangle budget where light catches it (edges, rims, bolt heads) instead of
    subdividing flat faces. Parts already dense, text and screens stay untouched."""
    done = 0
    for o in list(bpy.data.objects):
        if o.type != 'MESH' or any(k in o.name.lower() for k in SKIP_REFINE):
            continue
        if any(m.type == 'BEVEL' for m in o.modifiers) or any(m.type == 'SCREW' for m in o.modifiers):
            continue
        me = o.data
        if len(me.polygons) > 2500 or len(me.polygons) < 4:
            continue
        dims = sorted(o.dimensions)
        # Bolts, lamps and small fittings: a bevel there is invisible at workshop scale.
        if dims[0] < 0.004 or dims[2] < 0.12:
            continue
        for p in me.polygons:
            p.use_smooth = True
        me.set_sharp_from_angle(angle=math.radians(38))
        mod = o.modifiers.new('Manufactured edges', 'BEVEL')
        mod.width = min(0.018, dims[0] * 0.12, dims[1] * 0.06)
        mod.segments = 2
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(50)
        mod.harden_normals = True
        mod.use_clamp_overlap = True
        mod.miter_outer = 'MITER_ARC'
        done += 1
    print('REFINE', done, 'parts')

# ---------------------------------------------------------------- import / export
def load(key):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    packed = subprocess.run(['git', 'show', '%s:assets/dioramas-v2/%s.glb.gz' % (SOURCE_REV, key)], cwd=ROOT, check=True, capture_output=True).stdout
    tmp = os.path.join(tempfile.gettempdir(), key + '-v2.glb')
    with open(tmp, 'wb') as out:
        out.write(gzip.decompress(packed))
    bpy.ops.import_scene.gltf(filepath=tmp)
    os.remove(tmp)


def save(key):
    tmp = os.path.join(tempfile.gettempdir(), key + '-v3.glb')
    bpy.ops.export_scene.gltf(filepath=tmp, export_format='GLB', export_apply=True, export_yup=True,
                              export_animations=True, export_cameras=False, export_lights=False, export_extras=True)
    with open(tmp, 'rb') as f, open(os.path.join(DEST, key + '.glb.gz'), 'wb') as raw, gzip.GzipFile(fileobj=raw, mode='wb', compresslevel=9, mtime=0) as out:
        out.write(f.read())
    tris = sum(sum(len(p.vertices) - 2 for p in o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons)
               for o in bpy.data.objects if o.type == 'MESH')
    print('EXPORT', key, os.path.getsize(tmp) // 1024, 'KB', tris, 'triangles')
    os.remove(tmp)


# ---------------------------------------------------------------- Point financier
# Vanne murale à vis non montante : le volant fait tourner la vis, l'écrou de
# l'opercule remonte le long du filet. Un tour = PITCH de levée (lu par le JS).
PITCH = 0.055
GATE_X, PORT_Z, PORT_R = 1.3, 0.74, 0.34
SPINDLE_Y = -0.085
BLADE_BOTTOM, BLADE_HEIGHT, TRAVEL = 0.11, 1.09, 1.05
SPINDLE_BOTTOM = 1.22


def finance():
    steel = existing('Brushed steel', lambda: material('Brushed steel', '#6f7f84', 0.75, 0.38))
    graphite = existing('Graphite', lambda: material('Graphite', '#26292b', 0.2, 0.45))
    yellow = existing('Safety yellow', lambda: material('Safety yellow', '#f0a21e', 0.2, 0.4))
    red = existing('Alert red', lambda: material('Alert red', '#b3261e', 0.15, 0.4))
    paper = existing('Paper', lambda: material('Paper', '#efe9d6', 0.0, 0.85))
    enamel = existing('Warm enamel', lambda: material('Warm enamel', '#c8c6b6', 0.2, 0.5))
    blue = material('Sluice enamel', '#3f6f8f', 0.35, 0.36)
    bronze = material('Bronze nut', '#a1743c', 0.85, 0.32)
    rubber = material('Seal rubber', '#151719', 0.0, 0.8)
    machined = material('Machined thread', '#c4ccd0', 0.92, 0.22)
    concrete = material('Cast concrete', '#b9b6ad', 0.0, 0.92)
    throat = material('Port throat', '#0d0f10', 0.0, 0.95)
    machine = bpy.data.objects['Machine']
    fasteners = bpy.data.objects['FixedFasteners']

    # Ancienne vanne : cadre, vis factice en anneaux, opercule fixe et volant libre.
    remove(lambda o: o.parent and o.parent.name in ('GateBlade', 'Wheel'))
    remove(lambda o: o.name in ('GateBlade', 'Wheel'))
    remove(lambda o: o.name.split('.')[0] in ('Gate crossbar', 'Gate foot', 'Gate side', 'Aperture flange', 'Yellow aperture', 'Spindle', 'Spindle thread', 'Crossbar fixing', 'Tank shell'))
    remove(lambda o: o.name.startswith('Hex bolt') and 0.5 < o.matrix_world.translation.x < 2.1)

    gx, gz = GATE_X, PORT_Z
    top = 2.66
    # Massif béton percé du pertuis, plaque d'appui et siège jaune.
    box('Headwall footing', (gx, 0.33, 0.08), (1.86, 0.40, 0.16), concrete, machine, bevel=0.02)
    wall = box('Headwall', (gx, 0.265, 0.86), (1.70, 0.27, 1.40), concrete, machine, bevel=0)
    bore(wall, (gx, 0.3, gz), PORT_R + 0.02, 1.0)
    bev = wall.modifiers.new('Edges', 'BEVEL')
    bev.width, bev.segments, bev.limit_method = 0.02, 2, 'ANGLE'
    plate = box('Wall thimble', (gx, 0.115, gz + 0.02), (1.26, 0.03, 1.34), steel, machine, bevel=0)
    bore(plate, (gx, 0.1, gz), PORT_R, 0.5)
    lathe('Port seat ring', [(PORT_R, 0), (PORT_R + 0.11, 0), (PORT_R + 0.11, 0.022), (PORT_R + 0.03, 0.036), (PORT_R, 0.036), (PORT_R, 0)],
          yellow, at=(gx, 0.10, gz), axis=(0, -1, 0), seg=128, parent=machine)
    lathe('Port sleeve', [(PORT_R - 0.02, 0.0), (PORT_R, 0.0), (PORT_R, 0.36), (PORT_R - 0.02, 0.36), (PORT_R - 0.02, 0.0)],
          graphite, at=(gx, 0.10, gz), axis=(0, 1, 0), seg=96, parent=machine)
    lathe('Port throat', disc(0, PORT_R - 0.01, 0, 0.01), throat, at=(gx, 0.44, gz), axis=(0, 1, 0), seg=96, parent=machine)
    for k in range(16):
        a = k * TAU / 16
        bolt('Seat bolt', (gx + math.cos(a) * (PORT_R + 0.075), 0.064, gz + math.sin(a) * (PORT_R + 0.075)), (0, -1, 0), steel, 0.013, fasteners)

    # Conduite d'amenée : du pied du réservoir jusqu'à l'arrière du pertuis.
    tank_x, tank_r, py, pz, pr = -1.3, 1.02, 0.56, 0.25, 0.15
    x0 = tank_x + math.sqrt((tank_r + 0.02) ** 2 - py ** 2) - 0.03
    path = [(x0, py, pz), (gx - 0.25, py, pz)]
    path += [(gx - 0.25 + 0.25 * math.cos(a), py, pz + 0.25 + 0.25 * math.sin(a)) for a in [-math.pi / 2 + i * math.pi / 2 / 12 for i in range(1, 13)]]
    path += [(gx, 0.32 + 0.24 * math.cos(a), gz - 0.24 + 0.24 * math.sin(a)) for a in [i * math.pi / 2 / 12 for i in range(1, 13)]]
    path += [(gx, 0.26, gz)]
    sweep('Penstock feed', path, pr, steel, seg=56, parent=machine)
    lathe('Tank nozzle', disc(0, pr + 0.06, 0, 0.05), steel, at=(x0 + 0.02, py, pz), axis=(1, 0, 0), seg=64, parent=machine, bevel=0.004)
    for x in (0.12, gx - 0.6):
        lathe('Feed flange', disc(pr, pr + 0.06, -0.022, 0.022), steel, at=(x, py, pz), axis=(1, 0, 0), seg=72, parent=machine, bevel=0.004)
        for k in range(10):
            a = k * TAU / 10
            bolt('Feed bolt', (x + 0.022, py + math.cos(a) * (pr + 0.035), pz + math.sin(a) * (pr + 0.035)), (1, 0, 0), steel, 0.009, fasteners)
    for x in (-0.05, 0.62):
        box('Pipe saddle', (x, py, (pz - pr) / 2), (0.10, 0.30, pz - pr), graphite, machine, bevel=0.008)

    # Glissières en U, seuil et chevêtre en I.
    for side in (-1, 1):
        cx = gx + side * 0.56
        lip = [(-0.06, -0.075), (0.06, -0.075), (0.06, -0.055), (-0.04, -0.055), (-0.04, 0.055), (0.06, 0.055), (0.06, 0.075), (-0.06, 0.075)]
        outline = [(cx - side * x, y) for x, y in lip]
        if side > 0:
            outline.reverse()
        prism('Guide channel', outline, 0.06, top, steel, parent=machine, bevel=0.004)
        box('Guide foot plate', (cx + side * 0.04, -0.02, 0.07), (0.26, 0.30, 0.02), steel, machine, bevel=0.004)
        for dz in (0.35, 0.95, 1.55, 2.15):
            bolt('Guide anchor', (cx + side * 0.06, 0.0, dz), (side, 0, 0), steel, 0.012, fasteners)
        for dy in (-0.12, 0.08):
            bolt('Foot anchor', (cx + side * 0.12, dy, 0.08), (0, 0, 1), steel, 0.013, fasteners)
    box('Gate sill', (gx, -0.005, 0.085), (1.24, 0.15, 0.05), steel, machine, bevel=0.005)
    beam = [(-0.075, -0.10), (0.075, -0.10), (0.075, -0.082), (0.012, -0.082), (0.012, 0.082), (0.075, 0.082), (0.075, 0.10), (-0.075, 0.10), (-0.075, 0.082), (-0.012, 0.082), (-0.012, -0.082), (-0.075, -0.082)]
    m = Matrix.Translation((gx - 0.68, SPINDLE_Y, top + 0.10)) @ Matrix.Rotation(math.pi / 2, 4, 'Y') @ Matrix.Rotation(math.pi / 2, 4, 'Z')
    prism('Headstock beam', beam, 0, 1.36, steel, m, machine, bevel=0.004)
    for side in (-1, 1):
        box('Headstock end plate', (gx + side * 0.56, -0.045, top + 0.01), (0.17, 0.27, 0.02), steel, machine, bevel=0.004)
    front = SPINDLE_Y - 0.075
    box('Hazard band', (gx, front - 0.003, top + 0.10), (1.20, 0.006, 0.12), yellow, machine, bevel=0)
    for k in range(9):
        x0s = gx - 0.57 + k * 0.13
        prism('Hazard stripe', [(x0s, top + 0.045), (x0s + 0.05, top + 0.045), (x0s + 0.10, top + 0.155), (x0s + 0.05, top + 0.155)], 0, 0.003, graphite,
              Matrix.Translation((0, front - 0.006, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'X'), machine)
    sx, sy = gx, SPINDLE_Y
    lathe('Thrust bearing housing', [(0, top + 0.20), (0.11, top + 0.20), (0.11, top + 0.23), (0.085, top + 0.25), (0.085, top + 0.36), (0.065, top + 0.385), (0.045, top + 0.385), (0.045, top + 0.40), (0, top + 0.40)],
          graphite, at=(sx, sy, 0), seg=64, parent=machine, bevel=0.003)
    for k in range(6):
        a = k * TAU / 6 + 0.3
        bolt('Bearing bolt', (sx + math.cos(a) * 0.097, sy + math.sin(a) * 0.097, top + 0.23), (0, 0, 1), steel, 0.010, fasteners)
    lathe('Spindle collar', disc(0.034, 0.06, top - 0.04, top), steel, at=(sx, sy, 0), seg=48, parent=machine, bevel=0.003)

    # Volant et vis : un seul ensemble tournant (Wheel), pivot sur l'axe de la vis.
    wz = top + 0.52
    wheel = empty('Wheel', (sx, sy, wz))
    bottom = SPINDLE_BOTTOM - wz
    lathe('Spindle core', [(0, bottom), (0.029, bottom + 0.004), (0.029, top - 0.02 - wz), (0.026, top - wz), (0.026, 0.05), (0, 0.05)], machined, seg=40, parent=wheel)
    thread('Spindle thread', 0.028, 0.011, PITCH, (top - 0.05) - (SPINDLE_BOTTOM + 0.03), (0, 0, bottom + 0.03), machined, wheel)
    lathe('Wheel hub', [(0, -0.06), (0.042, -0.06), (0.05, -0.05), (0.05, 0.045), (0.04, 0.055), (0, 0.055)], steel, seg=48, parent=wheel, bevel=0.002)
    lathe('Handwheel rim', [(0.27 + 0.022 * math.cos(a * TAU / 24), 0.022 * math.sin(a * TAU / 24)) for a in range(25)], red, seg=144, parent=wheel)
    for k in range(5):
        a = k * TAU / 5
        p0, p1 = Vector((math.cos(a) * 0.045, math.sin(a) * 0.045, 0.0)), Vector((math.cos(a) * 0.258, math.sin(a) * 0.258, 0.0))
        pts = [p0.lerp(p1, t) + Vector((0, 0, 0.022 * math.sin(math.pi * t))) for t in [i / 8 for i in range(9)]]
        sweep('Wheel spoke', pts, 0.013, red, seg=20, parent=wheel)
    lathe('Spinner knob', [(0, 0.0), (0.016, 0.0), (0.016, 0.11), (0.022, 0.12), (0.022, 0.14), (0, 0.15)], graphite, at=(0.27, 0, 0.012), seg=28, parent=wheel)
    lathe('Hub nut', [(0, 0.055), (0.03, 0.055), (0.03, 0.08), (0, 0.08)], steel, seg=6, parent=wheel)

    # Opercule : plaque raidie, joints, tube de tige et écrou bronze qui monte le long du filet.
    blade = empty('GateBlade', (gx, 0.0, BLADE_BOTTOM))
    bh = BLADE_HEIGHT
    box('Sliding gate blade', (0, 0.03, bh / 2), (1.06, 0.04, bh), blue, blade, bevel=0.006)
    for z in (0.16, bh * 0.5, bh - 0.12):
        box('Blade stiffener', (0, -0.005, z), (1.0, 0.035, 0.07), blue, blade, bevel=0.006)
    for side in (-1, 1):
        box('Blade edge seal', (side * 0.515, 0.03, bh / 2), (0.02, 0.05, bh - 0.02), rubber, blade, bevel=0.004)
        box('Lifting lug', (side * 0.32, 0.03, bh + 0.05), (0.06, 0.03, 0.1), steel, blade, bevel=0.006)
    box('Blade bottom seal', (0, 0.03, -0.012), (1.02, 0.05, 0.025), rubber, blade, bevel=0.004)
    box('Blade top bar', (0, 0.03, bh - 0.015), (1.06, 0.05, 0.03), yellow, blade, bevel=0.004)
    lathe('Stem pocket', disc(0, 0.05, 0.1, bh), blue, at=(0, SPINDLE_Y, 0), seg=40, parent=blade, bevel=0.004)
    for z in (0.3, bh * 0.5, bh - 0.2):
        box('Pocket web', (0, (SPINDLE_Y + 0.01) / 2, z), (0.03, abs(SPINDLE_Y) + 0.02, 0.05), blue, blade, bevel=0.004)
    lathe('Lifting nut', [(0.034, bh - 0.02), (0.075, bh - 0.02), (0.075, bh + 0.10), (0.06, bh + 0.125), (0.034, bh + 0.125), (0.034, bh - 0.02)], bronze, at=(0, SPINDLE_Y, 0), seg=6, parent=blade, bevel=0.004)
    for k in range(4):
        a = k * TAU / 4 + math.pi / 4
        bolt('Nut bolt', (math.cos(a) * 0.058, SPINDLE_Y + math.sin(a) * 0.058, bh + 0.125), (0, 0, 1), steel, 0.007, blade)
    # Index d'ouverture : aiguille sur l'opercule, graduations sur la glissière droite.
    box('Opening pointer', (0.52, -0.085, bh), (0.07, 0.01, 0.018), red, blade, bevel=0.002)
    for k in range(11):
        box('Opening scale tick', (gx + 0.59, -0.077, BLADE_BOTTOM + bh + k * TRAVEL / 10), (0.04 if k % 5 == 0 else 0.025, 0.004, 0.008), graphite, machine, bevel=0)

    # Courriels d'alerte : partent de la conduite, sortent par le pertuis.
    for i, trim in enumerate((yellow, red)):
        env = empty('MailEnvelope_%d' % i, (gx, 0.30, gz))
        box('Envelope body', (0, 0, 0), (0.30, 0.012, 0.20), paper, env, bevel=0.004)
        prism('Envelope flap', [(-0.15, 0.10), (0.15, 0.10), (0.0, -0.005)], 0, 0.004, paper,
              Matrix.Translation((0, -0.006, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'X'), env)
        for side in (-1, 1):
            sweep('Envelope fold', [(side * 0.146, -0.0075, -0.096), (side * 0.035, -0.0075, -0.02)], 0.0025, trim, seg=8, parent=env)
        lathe('Envelope seal', disc(0, 0.032, 0, 0.006), trim, at=(0, -0.010, 0.0), axis=(0, -1, 0), seg=32, parent=env, bevel=0.002)
        text_mesh('Envelope at sign', '@', (0, -0.0175, -0.002), 0.04, paper, env)
        box('Envelope trim', (0, -0.0062, -0.096), (0.296, 0.002, 0.008), trim, env, bevel=0)

    # Repère du seuil (80 %) à gauche de la jauge du réservoir.
    gauge_bottom, gauge_top = 0.44, 1.90
    marker = empty('ThresholdMarker', (-1.43, -1.07, gauge_bottom + (gauge_top - gauge_bottom) * 0.8))
    prism('Threshold arrow', [(0.02, 0.0), (-0.05, -0.035), (-0.05, 0.035)], -0.008, 0.008, red, Matrix.Rotation(math.pi / 2, 4, 'X'), marker, bevel=0.002)
    box('Threshold tag', (-0.10, 0, 0), (0.09, 0.014, 0.05), red, marker, bevel=0.004)
    text_mesh('Threshold label', '80', (-0.10, -0.009, 0), 0.032, paper, marker)

    # Réservoir : virole à 160 facettes, cordons de soudure horizontaux et verticaux.
    lathe('Tank shell', [(0, 0.14), (1.02, 0.14), (1.02, 2.18), (0.98, 2.2), (0, 2.2)], enamel, at=(tank_x, 0, 0), seg=160, parent=machine)
    for z in (0.62, 1.12, 1.62):
        lathe('Shell weld', [(1.02, z - 0.008), (1.027, z - 0.004), (1.027, z + 0.004), (1.02, z + 0.008)], steel, at=(tank_x, 0, 0), seg=160, parent=machine)
    for k in range(10):
        a = k * TAU / 10 + 0.31
        m = Matrix.Translation((tank_x, 0, 0)) @ Matrix.Rotation(a, 4, 'Z')
        prism('Shell vertical weld', [(1.018, -0.004), (1.026, -0.004), (1.026, 0.004), (1.018, 0.004)], 0.16, 2.16, steel, m, machine)


def bore(obj, center, radius, depth):
    """Exact boolean hole along Y, applied before the bevel modifiers."""
    cutter = link(bpy.data.objects.new('cutter', bpy.data.meshes.new('cutter')))
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=128, radius1=radius, radius2=radius, depth=depth)
    bm.transform(Matrix.Translation(center) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    bm.to_mesh(cutter.data)
    bm.free()
    mod = obj.modifiers.new('Bore', 'BOOLEAN')
    mod.object = cutter
    mod.solver = 'EXACT'
    obj.modifiers.move(len(obj.modifiers) - 1, 0)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier='Bore')
    bpy.data.objects.remove(cutter, do_unlink=True)


# ---------------------------------------------------------------- Chaîne des PP
FLOW_PIPES = {'Red main manifold': 'FlowPipe_red', 'Yellow twin feed': 'FlowPipe_yellow',
              'Green return manifold': 'FlowPipe_green', 'Green vertical standby': 'FlowPipe_standby'}


def flow_uv(o, ring=15):
    """U becomes the arc length in metres along the pipe axis (rings of `ring` vertices)."""
    me = o.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    seen, parts = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        while stack:
            x = stack.pop()
            if x.index in seen:
                continue
            seen.add(x.index)
            comp.append(x.index)
            stack.extend(e.other_vert(x) for e in x.link_edges)
        parts.append(sorted(comp))
    main = max(parts, key=len)
    assert len(main) % ring == 0, (o.name, len(main))
    centers = [sum((bm.verts[i].co for i in main[k * ring:(k + 1) * ring]), Vector()) / ring for k in range(len(main) // ring)]
    bm.free()
    arc, ring_of = [0.0], {}
    for a, b in zip(centers, centers[1:]):
        arc.append(arc[-1] + (b - a).length)
    for k in range(len(centers)):
        for i in main[k * ring:(k + 1) * ring]:
            ring_of[i] = k
    uv = me.uv_layers[0].data
    for loop in me.loops:
        k = ring_of.get(loop.vertex_index)
        if k is not None:
            uv[loop.index].uv.x = arc[k]
    tail = o.matrix_world @ centers[-1]
    return arc[-1], tail, (tail - o.matrix_world @ centers[-2]).normalized()


def pa():
    steel = existing('Cast valve metal', lambda: material('Cast valve metal', '#5d6a6e', 0.65, 0.35))
    red = existing('Red pipe enamel', lambda: material('Red pipe enamel', '#a3161a', 0.28, 0.28))
    brass = existing('Brass and safety yellow', lambda: material('Brass and safety yellow', '#b88a1c', 0.68, 0.3))
    spring = material('Spring steel', '#c9ced1', 0.9, 0.25)
    machine = bpy.data.objects['Machine']
    # Conduites animées : abscisse curviligne en U pour le défilement du flux.
    for old, new in FLOW_PIPES.items():
        o = bpy.data.objects[old]
        length, tail, direction = flow_uv(o)
        o.name = new
        o['flowLength'] = round(length, 4)
        if new == 'FlowPipe_standby':
            # Bout ouvert de la colonne d'attente : premier évent de vapeur.
            empty('SteamVent_0', tail + direction * 0.08)
    bpy.data.objects['Heat exchanger'].name = 'Exchanger_body'

    # Soupape de sûreté sur le corps central, avec son échappement vertical.
    x, y, z = -0.30, 0.33, 1.685
    lathe('Relief valve flange', disc(0, 0.07, z, z + 0.025), steel, at=(x, y, 0), seg=48, parent=machine, bevel=0.003)
    for k in range(6):
        a = k * TAU / 6
        bolt('Relief flange bolt', (x + math.cos(a) * 0.055, y + math.sin(a) * 0.055, z + 0.025), (0, 0, 1), steel, 0.007, machine)
    lathe('Relief valve body', [(0, z + 0.025), (0.045, z + 0.025), (0.06, z + 0.06), (0.06, z + 0.13), (0.045, z + 0.16), (0, z + 0.16)], red, at=(x, y, 0), seg=48, parent=machine, bevel=0.003)
    lathe('Relief valve bonnet', [(0, z + 0.16), (0.04, z + 0.16), (0.03, z + 0.33), (0.034, z + 0.34), (0.034, z + 0.37), (0, z + 0.38)], steel, at=(x, y, 0), seg=40, parent=machine, bevel=0.002)
    for k in range(9):
        lathe('Relief spring coil', [(0.028 + 0.004 * math.cos(a * TAU / 10), z + 0.19 + k * 0.017 + 0.004 * math.sin(a * TAU / 10)) for a in range(11)], spring, at=(x, y, 0), seg=28, parent=machine)
    box('Relief test lever', (x + 0.07, y, z + 0.36), (0.16, 0.014, 0.02), brass, machine, bevel=0.003)
    outlet = [(x, y - 0.05, z + 0.095), (x, y - 0.12, z + 0.095)]
    outlet += [(x, y - 0.12 - 0.06 * math.sin(a), z + 0.155 - 0.06 * math.cos(a)) for a in [i * math.pi / 2 / 10 for i in range(1, 11)]]
    outlet += [(x, y - 0.18, z + 0.62)]
    sweep('Relief discharge stack', outlet, 0.03, red, seg=32, parent=machine, caps=False)
    lathe('Discharge stack lip', disc(0.03, 0.04, z + 0.6, z + 0.625), steel, at=(x, y - 0.18, 0), seg=40, parent=machine, bevel=0.002)
    box('Stack bracket', (x, y - 0.12, z + 0.40), (0.02, 0.12, 0.03), steel, machine, bevel=0.004)
    empty('SteamVent_1', (x, y - 0.18, z + 0.66))


BUILDERS = {'finance': finance, 'pa': pa}
ALL = ['finance', 'pa', 'vmvre', 'moteur44', 'cerfa', 'vre', 'studio', 'powerbi', 'suivi', 'gares']

if __name__ == '__main__':
    keys = (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []) or ALL
    for key in keys:
        load(key)
        BUILDERS.get(key, lambda: None)()
        refine()
        save(key)
