"""Petit kit de modélisation (bmesh, sans opérateurs) pour les bâtiments de l'atlas. Repère local : y vers le haut, la façade regarde +z,
l'origine est au sol au centre de l'emprise. Chaque primitive reçoit un NOM de matériau « type|#couleur » (ex. « pierre|#e6d8bb »,
« tuile|#c9703f », « verre| », « fenetre|#ffcf70 ») que le jeu transforme en matériau procédural (atlas-batiments.js) : le GLB ne porte
que la forme, la répartition des matières et des points d'ancrage (objets vides nommés « ancre_xxx »).

Exemple :  K = Kit('avignon') ; K.boite((3.4, 1.1, 1.5), (0, .55, 0), 'pierre|#e6d8bb', biseau=.02) ; K.toit_deux_pans(...) ; K.fin()"""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Euler

def rot_mat(rot):
    return Euler((rot[0], rot[1], rot[2]), 'YXZ').to_matrix().to_4x4() if isinstance(rot, (tuple, list)) else Matrix.Rotation(rot, 4, 'Y')

class Kit:
    def __init__(self, nom):
        self.nom = nom; self.bm = bmesh.new(); self.slots = []; self.ancres = {}
    # ------------------------------------------------------------------------------------------ outils
    def slot(self, nom):
        if nom not in self.slots: self.slots.append(nom)
        return self.slots.index(nom)
    def _fin_prim(self, verts, mat, lisse=False, matrice=None, biseau=0.0):
        if matrice is not None: bmesh.ops.transform(self.bm, matrix=matrice, verts=verts)
        faces = list({f for v in verts for f in v.link_faces if all(w in verts for w in f.verts)})
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        idx = self.slot(mat)
        for f in faces: f.material_index = idx; f.smooth = lisse           # avant le biseau : les faces recréées en héritent
        if biseau > 0:
            aretes = list({e for f in faces for e in f.edges})
            r = bmesh.ops.bevel(self.bm, geom=aretes, offset=biseau, segments=1, affect='EDGES')
            faces = [f for f in faces if f.is_valid] + [f for f in r['faces'] if f.is_valid]
            for f in faces: f.material_index = idx; f.smooth = lisse
        return faces
    # ------------------------------------------------------------------------------------------ primitives
    def boite(self, taille, c, mat, rot=0.0, biseau=0.0, lisse=False, haut=None, pied=None):
        """Boîte de taille (x, y, z) centrée en c. haut : matériau différent pour la face supérieure."""
        r = bmesh.ops.create_cube(self.bm, size=1.0)
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot) @ Matrix.Diagonal((taille[0], taille[1], taille[2], 1.0))
        faces = self._fin_prim(r['verts'], mat, lisse, m, biseau)
        self._pied(taille, c, mat, rot, forcer=pied)
        if haut:
            idx = self.slot(haut)
            for f in faces:
                if f.normal.y > 0.9: f.material_index = idx
        return faces
    PIED_Y = -2.0
    def _pied(self, taille, c, mat, rot, forcer=None):
        """Jupe de fondation : tout volume large posé au sol est prolongé vers le bas jusqu'à PIED_Y. Le jeu recale le bas de la jupe sur le relief
        de l'île (atlas-batiments.js, ajusterPieds) : plus aucune partie de bâtiment ne flotte au-dessus d'une pente ou d'une falaise."""
        bas = c[1] - taille[1] / 2
        if forcer is False or bas > 0.2 or bas < -0.01: return
        if forcer is not True and (getattr(self, 'sans_pied', False) or min(taille[0], taille[2]) < 0.5): return
        h = bas - self.PIED_Y
        r = bmesh.ops.create_cube(self.bm, size=1.0)
        m = Matrix.Translation(Vector((c[0], (bas + self.PIED_Y) / 2, c[2]))) @ rot_mat(rot) @ Matrix.Diagonal((taille[0], h, taille[2], 1.0))
        self._fin_prim(r['verts'], mat, False, m, 0.0)
    def cylindre(self, c, r, h, mat, seg=20, r_haut=None, rot=0.0, lisse=True, ferme=True, biseau=0.0, axe='y', pied=None):
        """Cylindre / tronc de cône posé sur c (le centre de la base), de hauteur h. axe='x' ou 'z' : couché, c = centre de la base, qui part vers +x ou +z."""
        res = bmesh.ops.create_cone(self.bm, cap_ends=ferme, cap_tris=False, segments=seg, radius1=r, radius2=(r if r_haut is None else r_haut), depth=h)
        # create_cone est dirigé selon z (radius1 en -z) : on le couche selon y, x ou z
        if axe == 'y': m = Matrix.Translation(Vector(c) + Vector((0, h / 2, 0))) @ rot_mat(rot) @ Matrix.Rotation(-math.pi / 2, 4, 'X')
        elif axe == 'z': m = Matrix.Translation(Vector(c) + Vector((0, 0, h / 2))) @ rot_mat(rot)
        else: m = Matrix.Translation(Vector(c) + Vector((h / 2, 0, 0))) @ rot_mat(rot) @ Matrix.Rotation(math.pi / 2, 4, 'Y')
        faces = self._fin_prim(res['verts'], mat, lisse, m, biseau)
        if axe == 'y' and ferme and pied is not False and -0.01 <= c[1] <= 0.2 and (pied is True or (r >= 0.4 and not getattr(self, 'sans_pied', False))):
            hp = c[1] - self.PIED_Y
            rp = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=hp)
            self._fin_prim(rp['verts'], mat, lisse, Matrix.Translation(Vector((c[0], self.PIED_Y + hp / 2, c[2]))) @ rot_mat(rot) @ Matrix.Rotation(-math.pi / 2, 4, 'X'), 0.0)
        return faces
    def ruban(self, pts, largeur, epais, mat):
        """Bande épaisse le long d'un tracé (liste de points) : tablier cintré d'un pont, rampe, chemin surélevé."""
        P = [Vector(p) for p in pts]; n = len(P); L = []; Rr = []
        for i, p in enumerate(P):
            t = (P[min(n - 1, i + 1)] - P[max(0, i - 1)]); t.y = 0; t.normalize() if t.length > 1e-6 else None
            lat = Vector((t.z, 0, -t.x)) * (largeur / 2)
            L.append(p + lat); Rr.append(p - lat)
        idx = self.slot(mat); dn = Vector((0, -epais, 0))
        def q(a, b, c, d):
            f = self.bm.faces.new([self.bm.verts.new(v) for v in (a, b, c, d)]); f.material_index = idx
        for i in range(n - 1):
            q(L[i], L[i + 1], Rr[i + 1], Rr[i])                                    # dessus
            q(Rr[i] + dn, Rr[i + 1] + dn, L[i + 1] + dn, L[i] + dn)                # dessous
            q(L[i] + dn, L[i + 1] + dn, L[i + 1], L[i])                            # flanc gauche
            q(Rr[i], Rr[i + 1], Rr[i + 1] + dn, Rr[i] + dn)                        # flanc droit
        q(L[0] + dn, L[0], Rr[0], Rr[0] + dn); q(Rr[-1] + dn, Rr[-1], L[-1], L[-1] + dn)
    def coque(self, sections, mat, mats=None):
        """Coque par sections : liste de (x, [(z, y), ...]) du même nombre de points (z, y) par section, de l'étrave à la poupe ; fermée aux extrémités."""
        idx = self.slot(mat)
        anneaux = [[self.bm.verts.new((x, y, z)) for (z, y) in pts] for x, pts in sections]
        k = len(sections[0][1])
        for i in range(len(anneaux) - 1):
            for j in range(k):
                f = self.bm.faces.new((anneaux[i][j], anneaux[i + 1][j], anneaux[i + 1][(j + 1) % k], anneaux[i][(j + 1) % k])); f.material_index = self.slot(mats[j]) if mats else idx; f.smooth = (j != k - 1)
        for ring, flip in ((anneaux[0], True), (anneaux[-1], False)):
            f = self.bm.faces.new(ring[::-1] if flip else ring); f.material_index = idx
        fs = [f for r in anneaux for v in r for f in v.link_faces]
        bmesh.ops.recalc_face_normals(self.bm, faces=list(set(fs)))
    def cone(self, c, r, h, mat, seg=4, rot=0.0, lisse=False):
        return self.cylindre(c, r, h, mat, seg=seg, r_haut=0.0001, rot=rot, lisse=lisse)
    def prisme(self, pts, y0, y1, mat, lisse=False, biseau=0.0):
        """Extrusion d'un polygone du plan xz (liste de (x, z), sens trigonométrique vu de dessus) de y0 à y1."""
        vs = [self.bm.verts.new((x, y0, z)) for (x, z) in pts]
        f = self.bm.faces.new(vs[::-1] if self._aire(pts) > 0 else vs)
        if f.normal.y > 0: f.normal_flip()
        r = bmesh.ops.extrude_face_region(self.bm, geom=[f])
        nv = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(self.bm, vec=(0, y1 - y0, 0), verts=nv)
        allv = vs + nv
        faces = list({ff for v in allv for ff in v.link_faces})
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        idx = self.slot(mat)
        for ff in faces: ff.material_index = idx; ff.smooth = lisse
        return faces
    @staticmethod
    def _aire(pts):
        return sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts))) / 2
    def quad(self, a, b, c, d, mat, lisse=False):
        v = [self.bm.verts.new(p) for p in (a, b, c, d)]
        f = self.bm.faces.new(v); idx = self.slot(mat); f.material_index = idx; f.smooth = lisse; return f
    def tri(self, a, b, c, mat):
        v = [self.bm.verts.new(p) for p in (a, b, c)]
        f = self.bm.faces.new(v); f.material_index = self.slot(mat); return f
    # ------------------------------------------------------------------------------------------ toits
    def toit_deux_pans(self, c, w, d, h, mat, debord=0.1, rot=0.0, epaisseur=0.05, mat_pignon=None, faitage=None):
        """Toit à deux pans, faîtage selon x (largeur w), pente vers ±z. c = centre du bas du toit (au niveau de la gouttière)."""
        W = w + 2 * debord; D = d + 2 * debord
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        # dessus (deux plans), dessous, pignons
        a, b, e, f = P(-W / 2, 0, D / 2), P(W / 2, 0, D / 2), P(W / 2, h, 0), P(-W / 2, h, 0)
        self.quad(a, b, e, f, mat)                                               # pan avant (+z)
        self.quad(P(W / 2, 0, -D / 2), P(-W / 2, 0, -D / 2), P(-W / 2, h, 0), P(W / 2, h, 0), mat)  # pan arrière
        pm = mat_pignon or mat
        self.tri(P(-W / 2, 0, D / 2), P(-W / 2, h, 0), P(-W / 2, 0, -D / 2), pm)       # pignon gauche
        self.tri(P(W / 2, 0, -D / 2), P(W / 2, h, 0), P(W / 2, 0, D / 2), pm)
        # sous-face
        self.quad(P(-W / 2, 0, -D / 2), P(W / 2, 0, -D / 2), P(W / 2, 0, D / 2), P(-W / 2, 0, D / 2), pm)
        # arête de faîtage
        self.boite((W + .02, 0.035, 0.06), P(0, h + 0.012, 0), faitage or mat, rot=rot)
    def toit_quatre_pans(self, c, w, d, h, mat, debord=0.1, rot=0.0, faite=0.0, mat_dessous=None):
        """Toit en croupe (pyramide aplatie à faîtage de longueur `faite`)."""
        W = w + 2 * debord; D = d + 2 * debord; m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        fx = min(faite, W - 0.01) / 2
        A, B, C, E = P(-W / 2, 0, D / 2), P(W / 2, 0, D / 2), P(W / 2, 0, -D / 2), P(-W / 2, 0, -D / 2)
        a, b = P(-fx, h, 0), P(fx, h, 0)
        if fx > 0.001:
            self.quad(A, B, b, a, mat); self.quad(C, E, a, b, mat)
        else:
            self.tri(A, B, b, mat); self.tri(C, E, a, mat)
        self.tri(B, C, b, mat)
        self.tri(E, A, a, mat)
        self.quad(E, C, B, A, mat_dessous or mat)
    def toit_pyramide(self, c, w, d, h, mat, debord=0.08, rot=0.0, mat_dessous=None):
        self.toit_quatre_pans(c, w, d, h, mat, debord, rot, 0.0, mat_dessous)
    def toit_pagode(self, c, w, d, h, mat, relev=0.18, debord=0.45, rot=0.0, mat_bord=None):
        """Toit à coins relevés (dojo) : quatre pans galbés, pointes relevées aux angles."""
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        W = w / 2 + debord; D = d / 2 + debord; n = 7
        top = (0, h, 0)
        def bord(i):                                  # point sur le bord de l'avant-toit, i de 0..n le long d'un côté, relevé aux coins
            pass
        # on construit en grille polaire : anneaux de plus en plus petits, courbure concave (profil en cuvette)
        anneaux = []
        for k in range(0, 6):
            t = k / 5.0
            y = h * (t ** 1.7) + (relev * (1 - t) ** 3)                   # profil concave, relevé au bord
            sx = (W) * (1 - t) + 0.02; sz = (D) * (1 - t) + 0.02
            ring = []
            for i in range(n * 4):
                s = i / n                                                 # 0..4 : côtés
                side = int(s) % 4; u = s - int(s)
                if side == 0: x, z = -sx + 2 * sx * u, sz
                elif side == 1: x, z = sx, sz - 2 * sz * u
                elif side == 2: x, z = sx - 2 * sx * u, -sz
                else: x, z = -sx, -sz + 2 * sz * u
                corner = 1 - abs(2 * u - 1)                              # 0 aux coins, 1 au milieu du côté
                yy = y + (relev * 1.4 * (1 - t) ** 2) * (1 - corner) ** 2     # coins relevés
                ring.append(P(x, yy, z))
            anneaux.append(ring)
        for k in range(len(anneaux) - 1):
            for i in range(n * 4):
                j = (i + 1) % (n * 4)
                self.quad(anneaux[k][i], anneaux[k][j], anneaux[k + 1][j], anneaux[k + 1][i], mat)
        # dessous
        R = anneaux[0]
        for i in range(n * 4):
            j = (i + 1) % (n * 4)
            self.tri(R[j], R[i], P(0, 0.02, 0), mat_bord or mat)
    # ------------------------------------------------------------------------------------------ ouvertures
    def fenetre(self, c, w, h, dirn, cadre, volets=None, arc=False, mat_verre='verre|#1c3040', appui=True, profondeur=0.05, croisillons=True):
        """Fenêtre posée sur un mur : dirn = 0 (+z), 1 (+x), 2 (-z), 3 (-x). c = centre de la fenêtre sur la face du mur."""
        rot = dirn * math.pi / 2
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        e = 0.035
        # verre légèrement en retrait
        self.boite((w, h, 0.012), (m @ Vector((0, 0, 0.002)))[:], mat_verre, rot=rot)
        # cadre : 4 montants
        self.boite((w + 2 * e, e, profondeur), (m @ Vector((0, h / 2 + e / 2 - (0 if not arc else 0), profondeur / 2)))[:], cadre, rot=rot)
        self.boite((w + 2 * e, e, profondeur), (m @ Vector((0, -h / 2 - e / 2, profondeur / 2)))[:], cadre, rot=rot)
        self.boite((e, h, profondeur), (m @ Vector((-w / 2 - e / 2, 0, profondeur / 2)))[:], cadre, rot=rot)
        self.boite((e, h, profondeur), (m @ Vector((w / 2 + e / 2, 0, profondeur / 2)))[:], cadre, rot=rot)
        if croisillons:
            self.boite((0.016, h, 0.02), (m @ Vector((0, 0, 0.012)))[:], cadre, rot=rot)
            self.boite((w, 0.016, 0.02), (m @ Vector((0, h * 0.12, 0.012)))[:], cadre, rot=rot)
        if arc:
            self.cylindre_couche(P(0, h / 2, 0.012), w / 2, 0.012, mat_verre, rot, demi=True)
        if appui:
            self.boite((w + 0.12, 0.03, profondeur + 0.05), (m @ Vector((0, -h / 2 - e - 0.012, (profondeur + 0.05) / 2)))[:], cadre, rot=rot)
        if volets:
            for s in (-1, 1):
                self.boite((w / 2 + 0.01, h + 0.02, 0.02), (m @ Vector((s * (w / 2 + w / 4 + e + 0.01), 0, 0.02)))[:], volets, rot=rot)
    def cylindre_couche(self, c, r, ep, mat, rot, demi=False, seg=14):
        """Demi-disque vertical (arc d'une fenêtre ou d'une porte cintrées), axe selon la direction de la façade."""
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        centre = self.bm.verts.new((m @ Vector((0, 0, 0)))[:])
        pts = [self.bm.verts.new((m @ Vector((math.cos(a) * r, math.sin(a) * r, 0)))[:]) for a in [i / seg * math.pi for i in range(seg + 1)]] if demi else []
        idx = self.slot(mat)
        for i in range(len(pts) - 1):
            f = self.bm.faces.new((centre, pts[i], pts[i + 1])); f.material_index = idx
    def porte(self, c, w, h, dirn, cadre, battant='bois|#6b4a2e', arc=True, marches=True):
        rot = dirn * math.pi / 2
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        self.boite((w, h, 0.03), P(0, h / 2, 0.0), battant, rot=rot)
        e = 0.05
        self.boite((e, h, 0.07), P(-w / 2 - e / 2, h / 2, 0.035), cadre, rot=rot); self.boite((e, h, 0.07), P(w / 2 + e / 2, h / 2, 0.035), cadre, rot=rot)
        self.boite((w + 2 * e, e, 0.07), P(0, h + e / 2, 0.035), cadre, rot=rot)
        if marches:
            self.boite((w + 0.5, 0.05, 0.24), P(0, 0.025, 0.12), cadre, rot=rot); self.boite((w + 0.3, 0.05, 0.14), P(0, 0.075, 0.07), cadre, rot=rot)
    # ------------------------------------------------------------------------------------------ divers
    def ancre(self, nom, pos, rot=0.0):
        self.ancres[nom] = (tuple(pos), rot)
    def tronc_courbe(self, pts, r0, r1, mat, seg=8):
        """Tube le long de points (liste de vecteurs) de rayon r0 -> r1."""
        anneaux = []
        n = len(pts)
        for i, p in enumerate(pts):
            t = (Vector(pts[min(n - 1, i + 1)]) - Vector(pts[max(0, i - 1)])).normalized()
            s = t.cross(Vector((0, 1, 0)) if abs(t.y) < 0.95 else Vector((1, 0, 0))).normalized(); b = t.cross(s).normalized()
            r = r0 + (r1 - r0) * i / max(1, n - 1)
            anneaux.append([self.bm.verts.new(Vector(p) + (s * math.cos(a) + b * math.sin(a)) * r) for a in [k / seg * 2 * math.pi for k in range(seg)]])
        idx = self.slot(mat)
        for i in range(n - 1):
            for k in range(seg):
                f = self.bm.faces.new((anneaux[i][k], anneaux[i][(k + 1) % seg], anneaux[i + 1][(k + 1) % seg], anneaux[i + 1][k])); f.material_index = idx; f.smooth = True

    def prisme_z(self, pts, z0, z1, mat, lisse=False):
        """Extrusion d'un polygone du plan xy (liste de (x, y)) le long de z, de z0 à z1 : dents de scie, pignons, profils de toit."""
        vs = [self.bm.verts.new((x, y, z0)) for (x, y) in pts]
        f = self.bm.faces.new(vs)
        r = bmesh.ops.extrude_face_region(self.bm, geom=[f])
        nv = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
        bmesh.ops.translate(self.bm, vec=(0, 0, z1 - z0), verts=nv)
        faces = list({ff for v in vs + nv for ff in v.link_faces})
        bmesh.ops.recalc_face_normals(self.bm, faces=faces)
        idx = self.slot(mat)
        for ff in faces: ff.material_index = idx; ff.smooth = lisse
        return faces
    def toit_simple_pente(self, c, w, d, h, mat, debord=0.05, rot=0.0, epaisseur=0.04):
        """Toit à un seul pan (marquise, appentis) : haut côté -z, bas côté +z, centré en c (niveau bas)."""
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        W = w / 2 + debord; D = d / 2 + debord
        self.quad(P(-W, 0, D), P(W, 0, D), P(W, h, -D), P(-W, h, -D), mat)
        self.quad(P(W, -epaisseur, D), P(-W, -epaisseur, D), P(-W, h - epaisseur, -D), P(W, h - epaisseur, -D), mat)
        self.quad(P(-W, 0, D), P(-W, -epaisseur, D), P(W, -epaisseur, D), P(W, 0, D), mat)
        self.tri(P(-W, 0, D), P(-W, h, -D), P(-W, -epaisseur, D), mat); self.tri(P(W, -epaisseur, D), P(W, h, -D), P(W, 0, D), mat)
    # ------------------------------------------------------------------------------------------ éléments courants
    def escalier(self, c, largeur, n, hauteur_marche, profondeur_marche, mat, dirn=0):
        """Escalier montant vers l'intérieur du bâtiment : le bas des marches est en c, la direction de montée est -z local (dirn tourne)."""
        rot = dirn * math.pi / 2; m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        for i in range(n):
            self.boite((largeur, hauteur_marche * (i + 1), profondeur_marche), (m @ Vector((0, hauteur_marche * (i + 1) / 2, -(i + 0.5) * profondeur_marche)))[:], mat, rot=rot, biseau=0.006, pied=True)
    def garde_corps(self, a, b, h, mat, poteaux=0.35, lisse=0.02, mat_poteau=None):
        """Garde-corps entre deux points (x, y, z) : poteaux et main courante."""
        A = Vector(a); B = Vector(b); d = B - A; L = d.length; n = max(1, int(L / poteaux))
        ang = math.atan2(d.x, d.z)
        for i in range(n + 1):
            p = A + d * (i / n)
            self.boite((0.025, h, 0.025), (p.x, p.y + h / 2, p.z), mat_poteau or mat)
        mid = (A + B) / 2
        self.boite((lisse, lisse, L), (mid.x, mid.y + h, mid.z), mat, rot=ang)
        self.boite((lisse * 0.7, lisse * 0.7, L), (mid.x, mid.y + h * 0.55, mid.z), mat, rot=ang)
    def banc(self, c, rot=0.0, mat_assise='bois|#8a5a34', mat_pieds='metal|#2d3036', l=0.5):
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        self.boite((l, 0.025, 0.14), P(0, 0.17, 0), mat_assise, rot=rot); self.boite((l, 0.12, 0.02), P(0, 0.27, -0.06), mat_assise, rot=rot)
        for s in (-1, 1): self.boite((0.02, 0.17, 0.14), P(s * (l / 2 - 0.03), 0.085, 0), mat_pieds, rot=rot)
    def lampadaire(self, c, h=1.0, mat='metal|#2d3036', lampe='fenetre|#ffe9a8', bras=0.0, rot=0.0):
        self.cylindre(c, 0.018, h, mat, seg=8, r_haut=0.012)
        m = Matrix.Translation(Vector(c)) @ rot_mat(rot)
        P = lambda x, y, z: (m @ Vector((x, y, z)))[:]
        if bras:
            self.boite((0.015, 0.015, bras), P(0, h, bras / 2), mat, rot=rot)
        self.boite((0.07, 0.05, 0.07), P(0, h + 0.03, bras), lampe, rot=rot); self.boite((0.1, 0.015, 0.1), P(0, h + 0.065, bras), mat, rot=rot)
    def rubik(self, c, taille=0.15):
        """Cube de Rubik : 27 petits cubes, faces colorées selon leur orientation."""
        couleurs = ['peinture|#e63946', 'peinture|#ff8a3d', 'peinture|#f4d03f', 'peinture|#ffffff', 'peinture|#2a7de1', 'peinture|#3dbb5a']
        s = taille / 3
        for i in range(-1, 2):
            for j in range(-1, 2):
                for k in range(-1, 2):
                    faces = self.boite((s * 0.96, s * 0.96, s * 0.96), (c[0] + i * s, c[1] + j * s, c[2] + k * s), 'plastique|#161616', biseau=0.003)
                    for f in faces:
                        n = f.normal
                        for ax, (pos, neg) in enumerate(((0, 1), (2, 3), (4, 5))):
                            comp = (n.x, n.y, n.z)[ax]
                            coord = (i, j, k)[ax]
                            if abs(comp) > 0.9 and coord == (1 if comp > 0 else -1): f.material_index = self.slot(couleurs[(pos if comp > 0 else neg)])
    # ------------------------------------------------------------------------------------------ sortie
    def fin(self, collection=None):
        # repère du kit (y haut, façade +z) -> repère de Blender (z haut) : l'export glTF le remet y haut, façade +z
        conv = Matrix.Rotation(math.pi / 2, 4, 'X')
        bmesh.ops.transform(self.bm, matrix=conv, verts=self.bm.verts)
        me = bpy.data.meshes.new(self.nom); self.bm.to_mesh(me); self.bm.free()
        for nom in self.slots:
            mat = bpy.data.materials.get(nom) or bpy.data.materials.new(nom)
            if mat.node_tree is None: mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            hexa = nom.split('|')[1] if '|' in nom else ''
            if bsdf and len(hexa) == 7:
                c = [int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)]
                lin = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
                bsdf.inputs['Base Color'].default_value = (lin[0], lin[1], lin[2], 1)
            me.materials.append(mat)
        ob = bpy.data.objects.new('bat_' + self.nom, me)
        (collection or bpy.context.scene.collection).objects.link(ob)
        for nom, (pos, rot) in self.ancres.items():
            e = bpy.data.objects.new('ancre_' + self.nom + '_' + nom, None); e.empty_display_type = 'PLAIN_AXES'
            e.location = (pos[0], -pos[2], pos[1]); e.rotation_euler = (0, 0, -rot); e.parent = ob
            (collection or bpy.context.scene.collection).objects.link(e)
        return ob
