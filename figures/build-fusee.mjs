// Fig 11 (variante B) · VRE Studio : une fusée réutilisable et son banc d'essai, sur un site clos.
// Une page est lue, triée, verrouillée, validée et versée au corpus dans le hangar ; le lot est brûlé au banc d'essai (entraînement),
// le booster est mesuré puis publié sur le pas de tir ; il emporte un satellite qui balaie des pages inédites et propose des cadres ;
// trois pupitres les corrigent, le booster se repose et revient au hangar, les corrections repartent dans le corpus.
// node figures/build-fusee.mjs  →  figures/vrestudio-fusee.html
import { readFileSync } from "node:fs";
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { bench, writeFigure, LOOP } from "./common.mjs";
import { scene } from "./scene-kit.mjs";

const WIDTH = 960, HEIGHT = 920;
const BURN = readFileSync(new URL("./burn-layer.js", import.meta.url), "utf8");
const PLATE = { x: -250, y: -190, w: 500, d: 390, r: 16 };
const P = k.fitProjection(
  [[PLATE.x, PLATE.y, -22], [PLATE.x + PLATE.w, PLATE.y, -22], [PLATE.x + PLATE.w, PLATE.y + PLATE.d, -22], [PLATE.x, PLATE.y + PLATE.d, -22], [110, -60, 285], [-40, -80, 120]],
  WIDTH, HEIGHT, { pad: 14, azimuth: 40 },
);
const Sc = scene(P);
const { T, at, S, L, D, put, bx, cy, turn, tube, lamp, dark, ln3, flat, pth, rad, polar, rect } = Sc;
const TAU = Math.PI * 2;
const X = [1, 0, 0], Y = [0, 1, 0], Zv = [0, 0, 1];
const dots = (pts, size = 0.4, tone = "lo") => D(pts.map((p) => at(p)), { size, tone });
const ringL = (cx, cy0, r, z, n = 36) => k.ring(cx, cy0, r, z, P, n);
const base = [bench(P, PLATE, { plateH: 14, footH: 6 })];
const pave = (x0, x1, y0, y1, o = {}) => {                      // dalle de béton : plaque basse, joints et boulons
  base.push(S(k.extrude(rect(x0, x1, y0, y1), 0, o.h ?? 0.8, P, { bevel: 0.3 }), { tone: o.tone || "lo", crease: "faint" }));
  const nx = Math.max(1, Math.round((x1 - x0) / (o.cell || 26))), ny = Math.max(1, Math.round((y1 - y0) / (o.cell || 26)));
  const ls = [];
  for (let i = 1; i < nx; i++) ls.push(k.lineOnTop([x0 + (x1 - x0) * i / nx, y0], [x0 + (x1 - x0) * i / nx, y1], (o.h ?? 0.8), P));
  for (let j = 1; j < ny; j++) ls.push(k.lineOnTop([x0, y0 + (y1 - y0) * j / ny], [x1, y0 + (y1 - y0) * j / ny], (o.h ?? 0.8), P));
  base.push(L(ls.join(""), { tone: "faint", free: true }));
};
const disc = (x, y, r, o = {}) => {
  base.push(S(k.cylinder(x, y, r, 0, o.h ?? 0.8, P, 56, 0.3), { tone: o.tone || "lo" }));
  base.push(L(ringL(x, y, r - 3, o.h ?? 0.8, 56) + ringL(x, y, r * 0.55, o.h ?? 0.8, 40), { tone: "faint" }));
  base.push(D(Array.from({ length: 12 }, (_, i) => at([x + (r - 1.6) * Math.cos(i / 12 * TAU), y + (r - 1.6) * Math.sin(i / 12 * TAU), o.h ?? 0.8])), { size: 0.4, tone: "lo" }));
};

// ---------------------------------------------------------------- aires de béton
pave(-244, -92, -156, -24, { cell: 30 });                       // hangar
pave(-78, 6, -124, -42, { cell: 28 });                          // banc d'essai
disc(98, -86, 44);                                              // pas de tir
disc(196, -92, 30);                                             // aire d'atterrissage
pave(-70, 70, 56, 150, { cell: 30 });                           // centre de contrôle
pave(86, 236, 28, 160, { tone: "mid", h: 0.5, cell: 38 });      // champ de pages inédites

// ---------------------------------------------------------------- rails
const RAIL = [[-232, -90], [-96, -90]];
{
  const rails = [];
  for (const dy of [-2.4, 2.4]) { rails.push(k.lineOnTop([RAIL[0][0], RAIL[0][1] + dy], [RAIL[1][0], RAIL[1][1] + dy], 1.4, P)); }
  base.push(S(k.extrude(rect(-232, -96, -93.6, -86.4), 0, 0.9, P, { bevel: 0.2 }), { tone: "lo", crease: "none" }));
  base.push(L(rails.join("") + Array.from({ length: 28 }, (_, i) => k.lineOnTop([-230 + i * 4.9, -92.4], [-230 + i * 4.9, -87.6], 0.9, P)).join(""), { tone: "mid", free: true }));
}

// ---------------------------------------------------------------- repères tournés et pièces génériques
const dotsAt = (pts, size = 0.4, tone = "lo") => D(pts.map((p) => at(p)), { size, tone });
const post = (x, y, z, h, r = 1.8, o = {}) => { put([x, y, z + h / 2], S(k.cylinder(x, y, r * 2, z, 1.2, P, 18), { tone: "lo" }) + S(k.cylinder(x, y, r, z + 1.2, h - 1.2, P, 14), { tone: o.tone || "mid", crease: "none" }), o.bias || 0); };
const faceY = (x0, x1, y, z0, z1) => [at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])];
const faceX = (x, y0, y1, z0, z1) => [at([x, y0, z0]), at([x, y1, z0]), at([x, y1, z1]), at([x, y0, z1])];
const windowY = (x0, x1, y, z0, z1) => { const p = faceY(x0, x1, y, z0, z1); return dark(pth(p, true)) + L(pth(p, true), { tone: "lo" }); };
const platePlain = (x0, x1, y, z0, z1) => { const p = faceY(x0, x1, y, z0, z1); return `<path class="iso-fill fig-window" d="${pth(p, true)}"/>` + L(pth(p, true), { tone: "lo" }); };

// ---------------------------------------------------------------- hangar « local » : murs nord et ouest, poteaux et fermes, trois baies sur la voie
const HG = { x0: -244, x1: -92, y0: -156, y1: -24, h: 54 };
{
  const { x0, x1, y0, y1, h } = HG;
  bx(x0, x1, y0, y0 + 2.4, 0.8, h, { tone: "mid", bevel: 0.6 });
  bx(x0, x0 + 2.4, y0, y1, 0.8, h, { tone: "mid", bevel: 0.6 });
  // face intérieure du mur nord : bandeau de verrières, lisses, tableau de service
  let f = "";
  for (let i = 0; i < 6; i++) f += windowY(x0 + 12 + i * 24, x0 + 28 + i * 24, y0 + 2.4, 34, 48);
  put([-168, y0 + 2.4, 30], f + L(ln3([x0, y0 + 2.4, 30], [x1, y0 + 2.4, 30]) + ln3([x0, y0 + 2.4, 8], [x1, y0 + 2.4, 8]) + ln3([x0, y0 + 2.4, 52], [x1, y0 + 2.4, 52]), { tone: "faint", free: true }), 0.2);
  // poteaux d'angle et lisses du toit : une ossature ouverte, sans toit
  for (const [x, y] of [[x1 - 1.6, y0 + 1.6], [x1 - 1.6, y1 - 1.6], [x0 + 1.6, y1 - 1.6]]) post(x, y, 0.8, h, 1.6);
  put([x1, (y0 + y1) / 2, h], bx(x1 - 3, x1, y0, y1, h - 2, 2.6, { reg: false, tone: "mid", bevel: 0.3 }), 0.1);
  put([(x0 + x1) / 2, y1, h], bx(x0, x1, y1 - 3, y1, h - 2, 2.6, { reg: false, tone: "mid", bevel: 0.3 }), 0.1);
  for (const x of [x0 + 72, x0 + 120]) put([x, (y0 + y1) / 2, h - 1], bx(x - 0.8, x + 0.8, y0, y1, h - 3, 1.6, { reg: false, tone: "lo", bevel: 0.15 }), 0.05);
  // pont roulant : chemin de roulement sur le mur nord, poutre qui traverse la voie
  put([-168, y0 + 4, 46], bx(x0 + 3, x1, y0 + 2.4, y0 + 5, 42, 2.4, { reg: false, tone: "lo", bevel: 0.2 }), 0.15);
}

// ---------------------------------------------------------------- baie A : trémie à pages, portique du laser de lecture
const LYR = -90;                                               // axe de la voie du hangar
const PW = 16, PH = 18, FY = [-6.5, -2.2, 2.2, 6.5];            // page : profondeur x, largeur y ; champs
const pageMarkup = (z, sc = 1) => {
  const w = PW * sc, h = PH * sc;
  let svg = S(k.extrude(rect(-w / 2, w / 2, -h / 2, h / 2), z, 0.7 * sc, P, { bevel: 0.15 }), { tone: "hi", crease: "none" });
  svg += L(FY.map((y) => k.planOutline({ x: -3.6 * sc, y: (y - 1.4) * sc, w: 7.2 * sc, d: 2.8 * sc, r: 0.3 }, z + 0.7 * sc, P, 2)).join(""), { tone: "mid" });
  svg += L([[7.4, 6.2], [8.4, 2.4]].map(([y, c]) => k.lineOnTop([(-PW / 2 + 1.4) * sc, y * sc], [(-PW / 2 + 1.4 + c * 0.6) * sc, y * sc], z + 0.7 * sc, P)).join(""), { tone: "lo", free: true });
  return svg;
};
{
  const hx = -232;
  bx(hx - 8, hx + 8, LYR - 13, LYR + 13, 0.8, 12, { tone: "mid", bevel: 0.7 });
  bx(hx - 9, hx + 9, LYR - 14, LYR + 14, 10.2, 2, { tone: "lo", bevel: 0.4 });
  for (let i = 0; i < 4; i++) put([hx, LYR, 14], S(k.extrude(rect(hx - 6, hx + 6, LYR - 9, LYR + 9), 12.4 + i * 0.9, 0.8, P, { bevel: 0.1 }), { tone: "hi", crease: "none" }), 0.3);
  const sl = [at([hx + 8, LYR - 11, 3]), at([hx + 8, LYR + 11, 3]), at([hx + 8, LYR + 11, 6.4]), at([hx + 8, LYR - 11, 6.4])];
  put([hx + 8, LYR, 5], dark(pth(sl, true)) + L(pth(sl, true), { tone: "lo" }), 0.4);
  // portique du laser
  const gx = -208;
  for (const sg of [-1, 1]) post(gx, LYR + sg * 17, 0.8, 32, 2);
  bx(gx - 4, gx + 4, LYR - 20, LYR + 20, 31, 3.6, { tone: "mid", bevel: 0.5 });
  put([gx, LYR, 36], L(ln3([gx - 4, LYR - 20, 33], [gx - 4, LYR + 20, 33]), { tone: "faint" }) + dots([[gx, LYR - 17, 34.8], [gx, LYR + 17, 34.8]], 0.45, "mid") + lamp("lamp-read", gx, LYR + 15, 34.9, 1.5), 0.6);
  put([gx, LYR, 20], `<g data-part="lhead">${bx(gx - 5, gx + 5, LYR - 3.4, LYR + 3.4, 29.6, 5.6, { reg: false, tone: "mid", bevel: 0.5 })}${S(k.cylinder(gx, LYR, 2.2, 17, 12.6, P, 20), { tone: "hi", crease: "none" })}${S(k.cylinder(gx, LYR, 3.2, 15.8, 1.4, P, 22), { tone: "hi", lit: true })}</g>`, 0.9);
}

// ---------------------------------------------------------------- profils de fusée (base à z = 0, axe vertical)
const BOOSTER_H = 72, STAGE2_H = 52, RS = 1.6;                    // dimensions de conception ; le véhicule est dessiné à l'échelle RS
const boosterProfile = (sc = 1) => [[0, 4.4], [1.0, 4.9], [2.6, 5.5], [8, 5.9], [9, 6], [66, 6], [67.5, 5.85], [72, 5.85]].map(([a, r]) => [a * sc, r * sc]);
const stage2Profile = (sc = 1) => [[0, 5.8], [24, 5.8], [27, 5.4], [34, 4.4], [42, 2.8], [48, 1.0], [52, 0.4]].map(([a, r]) => [a * sc, r * sc]);
function boosterMarkup(sc = 1, full = true) {
  const F = G.frameAlong([0, 0, 0], Zv);
  let out = "";
  if (full) {
    // trois moteurs : cloche à tuyère, collerette, couronne de refroidissement
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5, x = 2.6 * Math.cos(a), y = 2.6 * Math.sin(a); out += turn([x, y, -2.4], Zv, [[0, 1.5], [1.2, 1.75], [3.6, 2.2], [5.2, 2.3], [5.9, 2.6], [8.4, 3.2]], { reg: false, tone: "lo", inner: (Fb) => L(G.arcOf(Fb, 3.6, 2.2, P) + G.arcOf(Fb, 5.6, 2.45, P), { tone: "faint" }) }); }
    out += S(G.solidOf([[0, 4.4], [1.4, 4.9]], G.frameAlong([0, 0, 0.4], Zv), P), { tone: "lo" });
  }
  // corps : jupe moteur sombre, réservoir clair, bande de logo, ceinture d'interétage
  out += S(G.solidOf(boosterProfile(sc), F, P), { tone: "hi", inner: L(G.arcOf(F, 20 * sc, 6 * sc, P) + G.arcOf(F, 31 * sc, 6 * sc, P) + G.arcOf(F, 54 * sc, 6 * sc, P) + G.arcOf(F, 60 * sc, 6 * sc, P), { tone: "faint" }) + L(G.ribsOf(F, 11 * sc, 62 * sc, 6 * sc, 14, P, { phase: 0.3, seams: true }), { tone: "faint" }) });
  out += S(G.solidOf([[1 * sc, 4.95 * sc], [8.6 * sc, 5.95 * sc]], F, P), { tone: "lo" });
  if (full) out += `<g data-part="soot" opacity="0">${S(G.solidOf([[8.6 * sc, 6.03 * sc], [27 * sc, 6.03 * sc]], F, P), { tone: "lo", crease: "none" })}</g>`;
  out += S(G.solidOf([[36 * sc, 6.04 * sc], [46 * sc, 6.04 * sc]], F, P), { tone: "lo", inner: L(G.arcOf(F, 41 * sc, 6.05 * sc, P), { tone: "faint" }) });
  out += S(G.solidOf([[64 * sc, 6.05 * sc], [72 * sc, 5.9 * sc]], F, P), { tone: "lo", inner: L(G.arcOf(F, 66 * sc, 6.05 * sc, P) + G.arcOf(F, 70 * sc, 5.95 * sc, P), { tone: "faint" }) });
  if (full) {
    // quatre ailerons grillagés en tête, quatre carénages de jambes sur le flanc
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + 0.785, c = Math.cos(a), sn = Math.sin(a);
      out += S(k.extrude([[c * 5.6 - sn * 2.8, sn * 5.6 + c * 2.8], [c * 11.4 - sn * 2.8, sn * 11.4 + c * 2.8], [c * 11.4 + sn * 2.8, sn * 11.4 - c * 2.8], [c * 5.6 + sn * 2.8, sn * 5.6 - c * 2.8]], 67.6, 0.9, P, { bevel: 0.15 }), { tone: "lo", crease: "none" });
      let gr = ""; for (let q = -1; q <= 1; q++) gr += pth([at([c * 6.4 - sn * q * 1.4, sn * 6.4 + c * q * 1.4, 68.55]), at([c * 10.6 - sn * q * 1.4, sn * 10.6 + c * q * 1.4, 68.55])]);
      out += L(gr, { tone: "faint", free: true });
      out += S(k.extrude([[c * 5.8 - sn * 1.1, sn * 5.8 + c * 1.1], [c * 7.4 - sn * 1.1, sn * 7.4 + c * 1.1], [c * 7.4 + sn * 1.1, sn * 7.4 - c * 1.1], [c * 5.8 + sn * 1.1, sn * 5.8 - c * 1.1]], 9, 20, P, { bevel: 0.3 }), { tone: "lo" });
    }
    // dôme du réservoir supérieur, bague d'accouplement
    out += S(G.solidOf([[72, 5.4], [72.8, 5.0], [74.4, 4.2], [75.4, 3.6]], G.frameAlong([0, 0, 0], Zv), P), { tone: "mid" });
  }
  return out;
}
const stage2Markup = () => {
  const F = G.frameAlong([0, 0, 0], Zv);
  return S(G.solidOf(stage2Profile(1), F, P), { tone: "hi", inner: L(G.arcOf(F, 8, 5.8, P) + G.arcOf(F, 16, 5.8, P) + G.arcOf(F, 24, 5.8, P), { tone: "faint" }) + L(G.ribsOf(F, 2, 23, 5.8, 12, P, { phase: 0.1, seams: true }), { tone: "faint" }) })
    + S(G.solidOf([[0, 5.9], [4, 5.9]], F, P), { tone: "lo", inner: L(G.arcOf(F, 2, 5.92, P), { tone: "faint" }) })
    + S(G.solidOf([[26, 5.45], [29.4, 5.15]], F, P), { tone: "lo" })
    + L(G.ribsOf(F, 27, 46, 5.4, 2, P, { phase: 0.0, r1: 1.4, seams: false }), { tone: "mid" });
};

// ---------------------------------------------------------------- baie B : tourelle de tri à quatre alvéoles
const CHIPSHAPE = (kind) => {
  if (kind === 0) return Array.from({ length: 6 }, (_, i) => [1.7 * Math.cos(i * Math.PI / 3), 1.7 * Math.sin(i * Math.PI / 3)]);
  if (kind === 1) return [[-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4]];
  if (kind === 2) return Array.from({ length: 18 }, (_, i) => [1.5 * Math.cos(i * Math.PI / 9), 1.5 * Math.sin(i * Math.PI / 9)]);
  return [[-1.7, -1.4], [1.7, -1.4], [0, 1.7]];
};
const TUR = { x: -186, y: -124 };
{
  const { x, y } = TUR;
  put([x, y, 3], S(k.cylinder(x, y, 13, 0.8, 5.6, P, 40, 0.5), { tone: "mid" }) + S(k.cylinder(x, y, 11, 6.4, 2.4, P, 40, 0.3), { tone: "hi" }) + L(ringL(x, y, 11.1, 7.2, 40) + ringL(x, y, 13.02, 4, 40), { tone: "faint" }), 0.1);
  put([x, y, 9], `<g data-part="tur"></g>`, 0.5);
  [0, 1, 2, 3].forEach((i) => { const a = (-30 + i * 20) * Math.PI / 180 + Math.PI / 2; const px = x + 13.02 * Math.cos(a + 0.0), py = y + 13.02 * Math.sin(a); put([px, py, 4], lamp("sort-lamp-" + i, px, py, 3.8, 1.1), 0.6); });
  bx(x - 24, x - 16, y - 6, y + 6, 0.8, 11, { tone: "mid", bevel: 0.5 });
  put([x - 20, y, 6], S(k.cylinder(x - 20, y, 3.4, 11.8, 3, P, 18), { tone: "lo" }) + L(ln3([x - 16, y - 3, 5], [x - 11, y - 3, 7.6]) + ln3([x - 16, y + 3, 5], [x - 11, y + 3, 7.6]), { tone: "mid" }), 0.4);
}

// ---------------------------------------------------------------- baie C : armoire à deux clés et barrière-levante
{
  const kx = -160, ky = -128, face = ky + 6;
  bx(kx - 12, kx + 12, ky - 6, ky + 6, 0.8, 28, { tone: "mid", bevel: 0.7 });
  const rd = Array.from({ length: 14 }, (_, i) => at([kx - 6 + 2.4 * Math.cos(i * Math.PI / 7), face, 17 + 2.4 * Math.sin(i * Math.PI / 7)]));
  const sq = [at([kx + 3.6, face, 14.8]), at([kx + 8, face, 14.8]), at([kx + 8, face, 19.2]), at([kx + 3.6, face, 19.2])];
  put([kx, face, 16], dark(pth(rd, true)) + L(pth(rd, true), { tone: "lo" }) + dark(pth(sq, true)) + L(pth(sq, true), { tone: "lo" }) + L(ln3([kx - 12, face, 23], [kx + 12, face, 23]) + ln3([kx - 12, face, 9], [kx + 12, face, 9]), { tone: "faint" }) + dots([[kx - 10, face, 26], [kx + 10, face, 26], [kx - 10, face, 4], [kx + 10, face, 4]]) + lamp("lamp-lock", kx, face, 25.2, 1.6), 0.3);
  bx(kx - 7, kx - 5, face, face + 22, 0.8, 8.4, { tone: "lo", bevel: 0.2 }); bx(kx + 5, kx + 7, face, face + 22, 0.8, 8.4, { tone: "lo", bevel: 0.2 });
  // clés : le modèle (ronde) et les règles (carrée), couchées devant leurs rails
  const keyMk = (kind) => bx(-0.8, 0.8, 0, 14.4, -0.8, 1.6, { reg: false, tone: "mid", bevel: 0.2 }) + bx(-1.4, 1.4, 3, 4.2, -0.8, 1.6, { reg: false, tone: "mid", bevel: 0.15 }) + bx(-1.4, 1.4, 6, 7.2, -0.8, 1.6, { reg: false, tone: "mid", bevel: 0.15 }) + (kind === 0 ? S(k.cylinder(0, 17.6, 3.3, -0.8, 1.6, P, 22), { tone: "hi", lit: true }) + S(k.cylinder(0, 17.6, 1.2, -0.8, 1.7, P, 12), { tone: "lo", crease: "none" }) : bx(-3.2, 3.2, 14.4, 20.8, -0.8, 1.6, { reg: false, tone: "hi", lit: true, bevel: 0.3 }) + bx(-1, 1, 16.4, 18.8, -0.8, 1.7, { reg: false, tone: "lo", bevel: 0.1 }));
  put([kx, face + 8, 17], `<g data-part="key-n">${keyMk(0)}</g><g data-part="key-r">${keyMk(1)}</g>`, 0.9);
  // barrière-levante : colonne, contrepoids, pivot ; la lisse est dynamique
  bx(-150, -144, -106, -100, 0.8, 12, { tone: "mid", bevel: 0.4 });
  put([-147, -103, 14], S(k.cylinder(-147, -103, 2, 12.8, 3, P, 14), { tone: "hi", lit: true }) + `<g data-part="boom"></g>`, 0.7);
}

// ---------------------------------------------------------------- baie D : pupitre de relecture à volant, portique du tampon
{
  const dx = -128;
  bx(dx - 16, dx + 16, -62, -46, 0.8, 9, { tone: "mid", bevel: 0.7 });
  bx(dx - 16, dx + 16, -62, -58, 9.8, 14, { tone: "mid", bevel: 0.6 });
  put([dx, -58, 20], `<path class="iso-fill fig-window" d="${pth(faceY(dx - 12, dx - 2, -57.9, 14, 22), true)}"/>` + L(pth(faceY(dx - 12, dx - 2, -57.9, 14, 22), true), { tone: "lo" }) + lamp("lamp-hitl", dx + 8, -57.9, 22, 1.5), 0.4);
  // volant à main, axe vers nous
  put([dx, -44, 14], turn([dx + 8, -62, 6], Y, [[0, 1.6], [16, 1.6]], { reg: false, tone: "mid" }) + turn([dx + 8, -46, 6], Y, [[0, 6.4], [1.4, 6.4], [1.4, 5.4], [3, 5.4], [3, 6.4], [4, 6.4]], { reg: false, tone: "hi" }) + `<g data-part="wheel"></g>`, 0.5);
  // portique du tampon à main
  for (const sg of [-1, 1]) post(dx, LYR + sg * 19, 0.8, 34, 2);
  bx(dx - 4, dx + 4, LYR - 22, LYR + 22, 33, 3.8, { tone: "mid", bevel: 0.5 });
  put([dx, LYR, 38], L(ln3([dx - 4, LYR - 22, 35], [dx - 4, LYR + 22, 35]), { tone: "faint" }), 0.6);
  put([dx, LYR, 28], `<g data-part="shead">${bx(dx - 5, dx + 5, -3.4 + LYR, 3.4 + LYR, 31.6, 5.8, { reg: false, tone: "mid", bevel: 0.5 })}<g data-part="splow">${S(k.cylinder(dx, LYR, 1.2, 12, 20, P, 14), { tone: "hi", crease: "none", lit: true })}${S(k.cylinder(dx, LYR, 2.6, 8, 4, P, 24), { tone: "hi", lit: true })}${S(G.solidOf([[0, 1.6], [0.6, 3.1], [2.6, 3.4], [3.6, 2.6], [4.2, 1.2]], G.frameAlong([dx, LYR, 30], Zv), P), { tone: "hi", lit: true })}</g></g>`, 0.9);
  // tampon encreur
  bx(dx + 20, dx + 36, LYR + 14, LYR + 28, 0.8, 4, { tone: "mid", bevel: 0.5 }); put([dx + 28, LYR + 21, 6], dark(flat([[dx + 22, LYR + 16], [dx + 34, LYR + 16], [dx + 34, LYR + 26], [dx + 22, LYR + 26]], 4.8)) + L(flat([[dx + 22, LYR + 16], [dx + 34, LYR + 16], [dx + 34, LYR + 26], [dx + 22, LYR + 26]], 4.8), { tone: "lo" }), 0.4);
}

// ---------------------------------------------------------------- baie E : archive à trois feuillets, presse de scellement, afficheur du corpus
const ARC = { x: -104, y: -126 };
{
  const { x, y } = ARC;
  put([x, y, 2], S(k.cylinder(x, y, 15, 0.8, 3.4, P, 44, 0.5), { tone: "lo" }), 0.05);
  const layers = [[12.5, 4.2, "lo", "img"], [12, 6.8, "mid", "txt"], [11.5, 9.4, "hi", "pos"]];
  for (const [r, z, tone, nm] of layers) {
    let svg = S(k.cylinder(x, y, r, z, 2.6, P, 40, 0.4), { tone });
    if (nm === "img") svg += L(ringL(x, y, r - 2, z + 2.6, 40) + ringL(x, y, r - 6, z + 2.6, 32), { tone: "faint" });
    if (nm === "txt") svg += L(Array.from({ length: 4 }, (_, i) => k.lineOnTop([x - 8, y - 5 + i * 3.4], [x + 8, y - 5 + i * 3.4], z + 2.6, P)).join(""), { tone: "lo", free: true });
    if (nm === "pos") svg += L(Array.from({ length: 12 }, (_, i) => { const a = i / 12 * TAU; return k.lineOnTop(polar(8, a, [x, y]), polar(11, a, [x, y]), z + 2.6, P); }).join(""), { tone: "mid" });
    put([x, y, z + 1.3], svg, 0.1 + z * 0.001);
  }
  put([x, y, 18], S(k.cylinder(x, y, 3.4, 12, 7, P, 24), { tone: "mid" }) + S(k.cylinder(x, y, 5, 19, 1.8, P, 24, 0.3), { tone: "hi", lit: true }), 0.2);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, px = x + 13.8 * Math.cos(a), py = y + 13.8 * Math.sin(a); put([px, py, 4], lamp("slot-" + i, px, py, 4.2, 0.95), 0.3); }
  // presse de scellement
  post(x, y - 20, 0.8, 30, 2); bx(x - 3, x + 3, y - 22, y - 8, 28, 3.4, { tone: "mid", bevel: 0.5 });
  put([x, y - 8, 28], `<g data-part="seal">${S(k.cylinder(x, y, 6, 22, 3, P, 28, 0.3), { tone: "hi", lit: true })}${S(k.cylinder(x, y, 1.6, 25, 4, P, 12), { tone: "mid" })}</g>`, 0.9);
  // afficheur
  bx(x + 22, x + 38, y - 8, y, 0.8, 18, { tone: "mid", bevel: 0.6 });
  put([x + 30, y, 12], `<path class="iso-fill fig-window" d="${pth(faceY(x + 24, x + 36, y + 0.05, 8, 15), true)}"/>` + L(pth(faceY(x + 24, x + 36, y + 0.05, 8, 15), true), { tone: "lo" }) + `<text class="fig-digits" data-part="count" transform="${k.sideMatrix([0, y + 0.1], 0, P, "left")}" x="${x + 30}" y="-9.8" text-anchor="middle" font-size="6">10</text>`, 0.5);
}

// ---------------------------------------------------------------- registre des versions : une étagère, la version précédente et son aîné
{
  const rx = -204, ry = -46;
  for (const dx of [-14, 14]) bx(rx + dx - 1.2, rx + dx + 1.2, ry - 8, ry + 8, 0.8, 44, { tone: "mid", bevel: 0.2 });
  for (const z of [4, 24]) bx(rx - 16, rx + 16, ry - 8.6, ry + 8.6, z, 1.8, { tone: "hi", bevel: 0.3 });
  [[-7, 5.4, 0.3], [7, 25.4, 0.3]].forEach(([dx, z, sc], i) => {
    const F = G.frameAlong([rx + dx, ry, z], Zv);
    put([rx + dx, ry, z + 11], S(G.solidOf(boosterProfile(sc), F, P), { tone: "hi", inner: L(G.arcOf(F, 7, 1.8, P), { tone: "faint" }) }), 0.3);
    put([rx + dx, ry, z + 11], S(G.solidOf(stage2Profile(sc), G.frameAlong([rx + dx, ry, z + BOOSTER_H * sc], Zv), P), { tone: "hi" }), 0.31);
  });
  put([rx, ry, 8], `<path class="fig-glow" data-part="vault-0" d="${pth(rect(rx - 15, rx + 15, ry - 7.4, ry + 7.4).map(([x, y]) => at([x, y, 5.9])), true)}" opacity="0"/>`, 0.8);
}

// ---------------------------------------------------------------- banc d'essai : tour treillis, fosse de flamme, vérins de retenue
const ST = { x: -36, y: -83 };
const afterB = [];                                                   // pièces qui passent devant le véhicule (dessinées après lui)
const putA = (p3, svg, bias = 0) => afterB.push({ d: k.depthOf(p3, P) + bias, svg });
{
  const { x: cx, y: cy0 } = ST, H = 136, R = 22;
  // fosse de flamme : un canal sombre sous le booster, déflecteur incliné
  base.push(`<path class="iso-fill fig-dark" d="${pth(rect(cx - 15, cx + 15, cy0 - 44, cy0 + 16).map(([x, y]) => at([x, y, 0.9])), true)}"/>` + L(pth(rect(cx - 15, cx + 15, cy0 - 44, cy0 + 16).map(([x, y]) => at([x, y, 0.9])), true), { tone: "lo" }) + L(Array.from({ length: 8 }, (_, i) => k.lineOnTop([cx - 15, cy0 - 40 + i * 7.2], [cx + 15, cy0 - 40 + i * 7.2], 0.9, P)).join(""), { tone: "faint", free: true }));
  bx(cx - 28, cx + 28, cy0 - 28, cy0 + 28, 0.8, 4, { tone: "mid", bevel: 0.6 });
  put([cx, cy0, 6], L(k.planOutline({ x: cx - 26, y: cy0 - 26, w: 52, d: 52, r: 1 }, 4.8, P, 3), { tone: "faint" }) + dots([[cx - 25, cy0 - 25, 4.8], [cx + 25, cy0 - 25, 4.8], [cx - 25, cy0 + 25, 4.8], [cx + 25, cy0 + 25, 4.8]]), 0.3);
  // quatre vérins de retenue : des pinces sur la jupe du booster
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.785, px = cx + 14 * Math.cos(a), py = cy0 + 14 * Math.sin(a); put([px, py, 6], S(k.cylinder(px, py, 3.2, 4.8, 3.6, P, 14), { tone: "hi" }) + `<path class="fig-glow" data-part="load-${i}" d="${pth(Array.from({ length: 14 }, (_, q) => at([px + 3 * Math.cos(q / 14 * TAU), py + 3 * Math.sin(q / 14 * TAU), 8.45])), true)}" opacity="0"/>`, 0.4); }
  const col = (sx, sy) => { const x = cx + sx * R, y = cy0 + sy * R; return [x, y]; };
  const frontCol = (sx, sy) => sx + sy >= 0;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const [x, y] = col(sx, sy), svg = bx(x - 2.4, x + 2.4, y - 2.4, y + 2.4, 4.8, H, { reg: false, tone: "mid", bevel: 0.3 });
    (sx + sy > 0 || (sx === 1 || sy === 1) && sx + sy === 0 ? putA : put)([x, y, 50], svg);
  }
  // entretoises horizontales : trois niveaux, quatre côtés ; croisillons sur les faces visibles
  for (const z of [46, 92, 128]) {
    for (const [a, b2, c, d, front] of [[cx - R, cx + R, cy0 - R, cy0 - R, false], [cx - R, cx - R, cy0 - R, cy0 + R, false], [cx - R, cx + R, cy0 + R, cy0 + R, true], [cx + R, cx + R, cy0 - R, cy0 + R, true]]) {
      const svg = bx(Math.min(a, b2) - (a === b2 ? 0.7 : 0), Math.max(a, b2) + (a === b2 ? 0.7 : 0), Math.min(c, d) - (c === d ? 0.7 : 0), Math.max(c, d) + (c === d ? 0.7 : 0), z, 1.4, { reg: false, tone: "lo", bevel: 0.2 });
      (front ? putA : put)([(a + b2) / 2, (c + d) / 2, z], svg);
    }
  }
  const brace = [];
  for (const [z0, z1] of [[5.6, 46], [47.4, 92], [93.4, 128]]) {
    brace.push(ln3([cx - R + 2.4, cy0 + R + 2.4, z0], [cx + R - 2.4, cy0 + R + 2.4, z1]), ln3([cx + R - 2.4, cy0 + R + 2.4, z0], [cx - R + 2.4, cy0 + R + 2.4, z1]));
    brace.push(ln3([cx + R + 2.4, cy0 - R + 2.4, z0], [cx + R + 2.4, cy0 + R - 2.4, z1]), ln3([cx + R + 2.4, cy0 + R - 2.4, z0], [cx + R + 2.4, cy0 - R + 2.4, z1]));
  }
  putA([cx + R, cy0 + R, 50], L(brace.join(""), { tone: "mid", free: true }), 0.2);
  // paratonnerre, sommet de tour, grue de chargement du lot (dynamique)
  putA([cx, cy0, 138], S(k.cylinder(cx - R, cy0 + R, 0.7, 140.8, 14, P, 8), { tone: "mid", crease: "none" }) + S(G.sphereOf([cx - R, cy0 + R, 156], 1.4, P), { tone: "hi", lit: true }), 0.3);
  // mât d'élévateur à capsule : un rail vertical côté ouest et un chariot (dynamique)
  bx(cx - 32, cx - 29, cy0 + 8, cy0 + 12, 0.8, 92, { tone: "mid", bevel: 0.3 });
  put([cx - 30, cy0 + 10, 98], `<g data-part="lift"></g>` + `<path class="fig-glow" data-part="hatch" d="${pth(Array.from({ length: 16 }, (_, q) => at([cx + 10 * Math.cos(q / 16 * TAU + 0), cy0 + 10 * Math.sin(q / 16 * TAU), 76])), true)}" opacity="0"/>`, 0.5);
}
// ---------------------------------------------------------------- pas de tir : table, fosse, tour à deux bras, réservoir de déluge
const PAD = { x: 98, y: -86 };
{
  const { x: px, y: py } = PAD;
  base.push(`<path class="iso-fill fig-dark" d="${pth(rect(px - 12, px + 12, py - 50, py + 8).map(([x, y]) => at([x, y, 0.9])), true)}"/>` + L(pth(rect(px - 12, px + 12, py - 50, py + 8).map(([x, y]) => at([x, y, 0.9])), true), { tone: "lo" }));
  bx(px - 20, px + 20, py - 20, py + 20, 0.8, 8, { tone: "mid", bevel: 0.7 });
  put([px, py, 8], L(k.planOutline({ x: px - 18, y: py - 18, w: 36, d: 36, r: 1 }, 8.8, P, 3), { tone: "faint" }) + dots([[px - 17, py - 17, 8.8], [px + 17, py - 17, 8.8], [px - 17, py + 17, 8.8], [px + 17, py + 17, 8.8]]), 0.3);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.785, qx = px + 13 * Math.cos(a), qy = py + 13 * Math.sin(a); put([qx, qy, 9], S(k.cylinder(qx, qy, 3, 8.8, 3.6, P, 14), { tone: "hi" }), 0.4); }
  // tour de service : quatre membrures, entretoises tous les 25
  const tx = px + 40, ty = py;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = tx + sx * 5, y = ty + sy * 5, svg = bx(x - 1.6, x + 1.6, y - 1.6, y + 1.6, 0.8, 208, { reg: false, tone: "mid", bevel: 0.2 }); putA([x, y, 70], svg, 0.1); }
  const bars = [];
  for (let z = 26; z < 204; z += 26) bars.push(ln3([tx - 5, ty + 6.8, z], [tx + 5, ty + 6.8, z]), ln3([tx + 6.8, ty - 5, z], [tx + 6.8, ty + 5, z]));
  for (let z = 0.8; z < 190; z += 26) { bars.push(ln3([tx - 5, ty + 6.8, z + 1], [tx + 5, ty + 6.8, z + 25]), ln3([tx + 6.8, ty - 5, z + 1], [tx + 6.8, ty + 5, z + 25])); }
  putA([tx, ty, 80], L(bars.join(""), { tone: "mid", free: true }) + S(k.cylinder(tx, ty, 0.7, 208, 14, P, 8), { tone: "mid", crease: "none" }) + S(G.sphereOf([tx, ty, 223], 1.4, P), { tone: "hi", lit: true }), 0.2);
  putA([tx, ty, 2], S(k.cylinder(tx, ty, 8, 0.8, 1.4, P, 4), { tone: "lo" }), 0.0);
  putA([tx - 20, ty, 100], `<g data-part="arm-a"></g><g data-part="arm-b"></g>`, 0.6);
  // réservoir de déluge et conduite
  cy(px + 36, py - 40, 9, 0.8, 24, { tone: "mid" }); cy(px + 36, py - 40, 6.6, 24.8, 3, { tone: "hi" });
  put([px + 36, py - 40, 14], L(ringL(px + 36, py - 40, 9.02, 8, 30) + ringL(px + 36, py - 40, 9.02, 18, 30), { tone: "faint" }), 0.3);
  tube([[px + 30, py - 40, 5], [px + 14, py - 40, 5], [px + 8, py - 30, 2]], 1.6, { maxLength: 30, caps: [true, true], tone: "mid" });
  put([px + 36, py - 40, 14], `<path class="fig-glow" data-part="deluge" d="${pth(rect(px - 9, px + 9, py - 41, py - 20).map(([x, y]) => at([x, y, 1])), true)}" opacity="0"/>`, 0.6);
}
// ---------------------------------------------------------------- aire d'atterrissage : cible, quatre repères de pieds, camion de service
const LAND = { x: 196, y: -92 };
{
  const { x, y } = LAND;
  base.push(L(Array.from({ length: 4 }, (_, i) => { const a = i / 4 * TAU + 0.785; return k.lineOnTop(polar(8, a, [x, y]), polar(24, a, [x, y]), 0.8, P); }).join("") + ringL(x, y, 14, 0.8, 40), { tone: "mid", free: true }));
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.785, qx = x + 14 * Math.cos(a), qy = y + 14 * Math.sin(a); base.push(S(k.cylinder(qx, qy, 2.6, 0.8, 0.8, P, 14), { tone: "hi", crease: "none" })); }
  bx(222, 238, -64, -52, 0.8, 8, { tone: "mid", bevel: 0.5 }); bx(218, 224, -62, -54, 0.8, 5, { tone: "lo", bevel: 0.4 });
  put([230, -58, 12], L(ln3([222, -52, 5], [238, -52, 5]), { tone: "faint", free: true }) + dots([[224, -52, 8], [236, -52, 8]]), 0.3);
}
// ---------------------------------------------------------------- rails : transporteur vers le pas de tir, retour du booster
const RL1 = [[6, -83], [68, -83]];
const RL2 = [[LAND.x, -64], [LAND.x, -26], [ST.x, -26], [ST.x, -52]];
const railLine = (pts, w = 2.6) => {
  const lines = [], ties = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l, nx = -uy, ny = ux;
    for (const sg of [-1, 1]) lines.push(k.lineOnTop([x0 + nx * w * sg, y0 + ny * w * sg], [x1 + nx * w * sg, y1 + ny * w * sg], 1.0, P));
    for (let d = 2; d < l; d += 5) ties.push(k.lineOnTop([x0 + ux * d + nx * (w + 1.2), y0 + uy * d + ny * (w + 1.2)], [x0 + ux * d - nx * (w + 1.2), y0 + uy * d - ny * (w + 1.2)], 0.9, P));
  }
  base.push(L(ties.join(""), { tone: "lo", free: true }) + L(lines.join(""), { tone: "mid", free: true }));
};
railLine(RL1); railLine(RL2);
// voie du hangar vers le banc d'essai : le prolongement de la voie du hangar
base.push(L(k.lineOnTop([-96, LYR - 2.4], [-60, LYR - 2.4], 1.0, P) + k.lineOnTop([-96, LYR + 2.4], [-60, LYR + 2.4], 1.0, P) + Array.from({ length: 8 }, (_, i) => k.lineOnTop([-94 + i * 4.6, LYR - 4.8], [-94 + i * 4.6, LYR + 4.8], 0.9, P)).join(""), { tone: "mid", free: true }));

// ---------------------------------------------------------------- pupitre du banc d'essai : colonnes de seuil, levier, goupille, cadran de fiabilité, coffre des pages inédites
const CN = { x0: -72, x1: -22, y0: -42, y1: -30 };
{
  const { x0, x1, y0, y1 } = CN;
  put([-47, -36, 1], `<path class="iso-halo" d="${k.haloOf({ x: x0 - 3, y: y0 - 3, w: x1 - x0 + 6, d: y1 - y0 + 6, r: 3 }, 0, 4, P)}" style="filter:blur(3px)"/>`, -0.5);
  bx(x0, x1, y0, y1, 0.8, 9, { tone: "mid", bevel: 0.8 });
  bx(x0, x1, y0, y0 + 3, 9.8, 20, { tone: "mid", bevel: 0.6 });
  const gx = -64, gz = 21, gr = 6.4, ga = (v) => (200 - v * 220) * Math.PI / 180;
  const P3 = (rr, a) => at([gx + rr * Math.cos(a), y0 + 3.05, gz + rr * Math.sin(a)]);
  const circ = (rr) => pth(Array.from({ length: 32 }, (_, i) => P3(rr, i / 32 * TAU)), true);
  put([gx, y0 + 3, gz], `<path class="iso-fill fig-window" d="${circ(gr)}"/>` + L(circ(gr), { tone: "mid" }) + L(circ(gr - 1.4), { tone: "faint" }) + L(Array.from({ length: 11 }, (_, q) => pth([P3(gr - 1.4, ga(q / 10)), P3(gr, ga(q / 10))])).join(""), { tone: "lo" }) + L(pth([P3(gr - 1.4, ga(0.75)), P3(gr, ga(0.75))]) + pth([P3(gr - 1.4, ga(0.9)), P3(gr, ga(0.9))]), { tone: "hi" }) + `<g data-part="rel-needle"></g>`, 0.6);
  put([-34, y0 + 3, 26], lamp("lamp-pub", -34, y0 + 3.1, 27, 1.7) + lamp("lamp-cand", -42, y0 + 3.1, 27, 1.5), 0.6);
  const zv = (v) => 13 + (v - 0.5) / 0.5 * 19.2;
  for (const [i, cx2, mk] of [[0, -58, 0.75], [1, -48, 0.9]]) {
    cy(cx2, -35, 3.6, 9.8, 1.6, { tone: "lo" }); cy(cx2, -35, 1.8, 11.4, 22, { tone: "mid", crease: "none" });
    put([cx2, -35, 25], L(Array.from({ length: 9 }, (_, q) => k.ring(cx2, -35, 1.85, zv(0.5 + q * 0.0625), P, 14)).join(""), { tone: "faint" }) + L(k.ring(cx2, -35, 1.9, zv(mk), P, 14), { tone: "hi" }) + lamp("fork-" + i, cx2, -35, 34, 1.4), 0.6);
  }
  put([-32, -35, 17], `<g data-part="lever"></g><g data-part="cols"></g>`, 0.7);
  put([-32, -35, 13], S(k.cylinder(-32, -35, 2.6, 9.8, 1.4, P, 20), { tone: "lo" }) + `<g data-part="pin">${S(k.cylinder(-24, -41, 0.9, 9.8, 9, P, 10), { tone: "hi", lit: true })}</g>`, 0.3);
  bx(-27, -22, -42, -37, 9.8, 3, { tone: "lo", bevel: 0.3 });
  // coffre des pages inédites : un caisson verrouillé, un tiroir à glissière
  bx(-12, 6, -44, -28, 0.8, 26, { tone: "mid", bevel: 0.7 });
  const dr = faceY(-9, 3, -28, 5, 21);
  put([-3, -28, 14], L(pth(dr, true), { tone: "lo" }) + L(ln3([-12, -28, 25], [6, -28, 25]) + ln3([-12, -28, 3], [6, -28, 3]), { tone: "faint", free: true }) + dots([[-10, -28, 24], [4, -28, 24]]) + lamp("lamp-cab", -3, -28, 23.4, 1.4), 0.3);
  put([-3, -22, 6], `<g data-part="drawer">${bx(-9, 3, -28, -16, 5, 2.2, { reg: false, tone: "lo", bevel: 0.3 })}${bx(-9, 3, -17, -15.4, 5, 5, { reg: false, tone: "mid", bevel: 0.3 })}</g>`, 0.5);
}
// ---------------------------------------------------------------- centre de contrôle : trois pupitres, mur d'écran, cadran du gain, parabole
const MC = { x0: -70, x1: 70, y0: 56, y1: 152, h: 44 };
{
  const { x0, x1, y0, y1, h } = MC;
  put([0, 104, 1], `<path class="iso-halo" d="${k.haloOf({ x: x0 - 4, y: y0 - 4, w: x1 - x0 + 8, d: y1 - y0 + 8, r: 3 }, 0, 4, P)}" style="filter:blur(3px)"/>`, -0.6);
  base.push(S(k.extrude(rect(x0, x1, y0, y1), 0, 1.6, P, { bevel: 0.5 }), { tone: "lo" }));
  bx(x0, x1, y0, y0 + 2.4, 1.6, h, { tone: "mid", bevel: 0.7 });
  bx(x0, x0 + 2.4, y0, y1, 1.6, h, { tone: "mid", bevel: 0.7 });
  bx(x1 - 2.4, x1, y0, y1, 1.6, h, { tone: "mid", bevel: 0.7 });
  // mur d'écran : cadre, quadrillage de la carte du champ, repères
  const sx0 = -52, sx1 = 52, sz0 = 14, sz1 = 38, yf = y0 + 2.4;
  const scr = faceY(sx0, sx1, yf + 0.05, sz0, sz1);
  put([0, yf, 26], bx(sx0 - 2, sx1 + 2, yf, yf + 1.2, sz0 - 2, sz1 - sz0 + 4, { reg: false, tone: "lo", bevel: 0.3 }) + `<path class="iso-fill fig-dark" d="${pth(scr, true)}"/>` + L(pth(scr, true), { tone: "lo" }) + `<g data-part="wall"></g>`, 0.3);
  // tuiles de la carte : douze rectangles, un par page du champ
  const tiles = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) { const u0 = sx0 + 8 + c * 24, w = 18, zz0 = sz0 + 3 + r * 7, hh = 5.4; tiles.push(pth(faceY(u0, u0 + w, yf + 0.06, zz0, zz0 + hh), true)); }
  put([0, yf, 26], L(tiles.join(""), { tone: "mid" }), 0.4);
  for (let i = 0; i < 3; i++) {
    const cx2 = -40 + i * 40, yy = 120;
    bx(cx2 - 12, cx2 + 12, yy, yy + 12, 1.6, 9, { tone: "mid", bevel: 0.6 });
    bx(cx2 - 9, cx2 + 9, yy, yy + 1.8, 10.6, 11, { tone: "hi", bevel: 0.3 });
    put([cx2, yy, 20], `<path class="iso-fill fig-window" d="${pth(faceY(cx2 - 7, cx2 + 7, yy + 1.85, 13, 19.6), true)}"/>` + lamp("vdesk-" + i, cx2 + 8, yy + 1.9, 10.4, 1.2) + `<g data-part="stamp-${i}">${S(k.cylinder(cx2 + 4, yy + 8, 1.6, 10.6, 2.4, P, 14), { tone: "hi", lit: true })}${S(k.cylinder(cx2 + 4, yy + 8, 0.8, 13, 3.2, P, 10), { tone: "mid" })}</g>`, 0.4);
  }
  bx(-52, 52, 136, 139, 1.6, 3, { tone: "lo", bevel: 0.3 });
  put([0, 137.5, 6], `<path class="fig-glow" data-part="bus" d="${pth(rect(-51, 51, 136.4, 138.6).map(([x, y]) => at([x, y, 4.65])), true)}" opacity="0"/>`, 0.5);
  // cadran du gain sur la face est : ×1 (gris, fixe) et ×2,3 (accent)
  const gy = 98, gz = 26, gr = 13, xf = x1 + 0.05, ga = (v) => (205 - v * 230 / 3) * Math.PI / 180;
  const P3 = (rr, a) => at([xf, gy + rr * Math.cos(a), gz + rr * Math.sin(a)]);
  const circ = (rr) => pth(Array.from({ length: 40 }, (_, i) => P3(rr, i / 40 * TAU)), true);
  let g = S(G.disc(0, 1.6, gr, G.frameAlong([x1, gy, gz], X), P), { tone: "mid" });
  const P4 = (rr, a) => at([x1 + 1.65, gy + rr * Math.cos(a), gz + rr * Math.sin(a)]);
  const circ4 = (rr) => pth(Array.from({ length: 40 }, (_, i) => P4(rr, i / 40 * TAU)), true);
  g += `<path class="iso-fill fig-window" d="${circ4(gr - 1.2)}"/>` + L(circ4(gr - 1.2), { tone: "lo" }) + L(circ4(gr - 3.4), { tone: "faint" });
  const tk = [], tm = [];
  for (let q = 0; q <= 12; q++) { const a = ga(q * 0.25), r0 = q % 4 === 0 ? gr - 4.6 : gr - 3.7; (q % 4 === 0 ? tm : tk).push(pth([P4(r0, a), P4(gr - 1.2, a)])); }
  g += L(tk.join(""), { tone: "lo" }) + L(tm.join(""), { tone: "mid" }) + L(pth([P4(gr - 5.4, ga(2.3)), P4(gr - 1.2, ga(2.3))]), { tone: "hi" }) + D([P4(gr - 5.4, ga(2.3))], { size: 0.7, tone: "hi" }) + L(pth([P4(0, 0), P4(gr - 3.7, ga(1))]), { tone: "mid" });
  put([x1, gy, gz], g, 0.6);
  put([x1, gy, gz], `<g data-part="gain-needle"></g>`, 0.8);
  // parabole sur le toit
  const dx = 40, dy = 80;
  put([dx, dy, h + 8], S(k.cylinder(dx, dy, 4, h + 1.6, 2, P, 20), { tone: "lo" }) + S(k.cylinder(dx, dy, 1.4, h + 3.6, 9, P, 12), { tone: "mid", crease: "none" }) + S(G.solidOf([[0, 0.6], [1, 7.4], [3.4, 9], [4.4, 9]], G.frameAlong([dx, dy, h + 12.6], [0.25, 0.35, 0.9]), P), { tone: "hi", lit: true }), 0.6);
  for (const [x, y] of [[x0 + 1.2, y1 - 1.2], [x1 - 1.2, y1 - 1.2]]) post(x, y, 1.6, h, 1.4);
  put([0, y1, h], bx(x0, x1, y1 - 2.6, y1, h - 2, 2.4, { reg: false, tone: "mid", bevel: 0.3 }), 0.1);
}
// ---------------------------------------------------------------- champ de pages inédites
const FIELD = { cx: [106, 140, 174, 208], cy: [62, 94, 126], sc: 1.45 };
{
  for (const x of FIELD.cx) for (const y of FIELD.cy) put([x, y, 1], `<g transform="${T.at ? "" : ""}">` + S(k.extrude(rect(x - PW * FIELD.sc / 2, x + PW * FIELD.sc / 2, y - PH * FIELD.sc / 2, y + PH * FIELD.sc / 2), 0.5, 0.7, P, { bevel: 0.2 }), { tone: "hi", crease: "none" }) + L([-6, -3, 0, 3, 6].map((q) => k.lineOnTop([x - 8, y + q * 1.8 + 1], [x + 3, y + q * 1.8 + 1], 1.2, P)).join(""), { tone: "lo", free: true }) + "</g>", 0.1);
}
// ---------------------------------------------------------------- clôture du site, porte « LOCAL », tube de retour des corrections
const RET2 = [[-68, 132, 4], [-238, 132, 4], [-238, -74, 4], [-236, -74, 9]];
{
  const x0 = -242, x1 = 242, y0 = -182, y1 = 192, step = 24;
  const fpost = (x, y) => put([x, y, 5], S(k.cylinder(x, y, 0.9, 0, 11, P, 10), { tone: "mid", crease: "none" }), 0.1);
  const rails = (a, b) => { const out = []; for (const z of [10, 6]) out.push(pth([at([...a, z]), at([...b, z])])); return L(out.join(""), { tone: "lo", free: true }) + dots([[...a, 10], [...b, 10]], 0.5, "mid"); };
  const side = (ax, ay, bx2, by2, gate) => {
    const n = Math.round(Math.hypot(bx2 - ax, by2 - ay) / step);
    for (let i = 0; i <= n; i++) fpost(ax + (bx2 - ax) * i / n, ay + (by2 - ay) * i / n);
    for (let i = 0; i < n; i++) { const a = [ax + (bx2 - ax) * i / n, ay + (by2 - ay) * i / n], b = [ax + (bx2 - ax) * (i + 1) / n, ay + (by2 - ay) * (i + 1) / n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (gate && gate(m)) continue; put([m[0], m[1], 8], rails(a, b), 0.2); }
  };
  side(x0, y0, x1, y0); side(x1, y0, x1, y1); side(x1, y1, x0, y1, ([mx]) => mx > -66 && mx < -22); side(x0, y1, x0, y0);
  for (const [a, b] of [[-66, -45], [-43, -22]]) put([(a + b) / 2, y1, 8], bx(a, b, y1 - 0.8, y1 + 0.8, 1, 10, { reg: false, tone: "hi", bevel: 0.2 }) + L(ln3([a, y1 + 0.8, 5], [b, y1 + 0.8, 5]), { tone: "faint" }), 0.3);
  put([-44, y1, 16], bx(-54, -34, y1 - 0.6, y1 + 0.6, 12, 6, { reg: false, tone: "lo", bevel: 0.2 }) + `<text class="iso-face-text" data-tone="hi" transform="${k.sideMatrix([0, y1 + 0.7], 0, P, "left")}" x="-44" y="-14.2" font-size="3.4" text-anchor="middle" letter-spacing=".18em">LOCAL</text>`, 0.5);
  for (const x of [-66, -22]) { cy(x, y1, 1.3, 0, 22, { tone: "mid", crease: "none" }); cy(x, y1, 2.2, 22, 1.2, { tone: "lo" }); }
  bx(-67, -21, y1 - 1, y1 + 1, 22.4, 1.6, { tone: "mid", bevel: 0.3 });
}
tube(RET2, 2.6, { maxLength: 40, spacing: 4, caps: [true, true], tone: "lo", rings: { pitch: 6, fade: [0.05, 0.4] } });

// ---------------------------------------------------------------- voirie et équipements : projecteurs, manche à air, regards, bornes, balises, règle du champ
{
  // quatre mâts de projecteurs aux angles de la clôture : fût, échelle de crinoline, rampe de quatre lentilles
  const mast = (x, y, h, face) => {
    const lens = [-5.4, -1.8, 1.8, 5.4].map((u) => at([x + u * face[0], y + u * face[1], h + 2.6]));
    put([x, y, h / 2], S(k.cylinder(x, y, 3.4, 0.8, 2.2, P, 18), { tone: "lo" }) + S(k.cylinder(x, y, 1.5, 3, h - 3, P, 14), { tone: "mid", crease: "none" }) + L(ringL(x, y, 1.52, 24, 14) + ringL(x, y, 1.52, h * 0.6, 14), { tone: "faint" }), 0.2);
    put([x, y, h + 2], S(k.extrude(rect(x - 6.4, x + 6.4, y - 1.8, y + 1.8), h, 1.6, P, { bevel: 0.3 }), { tone: "mid" }) + S(k.extrude(rect(x - 6, x + 6, y - 2, y + 2), h + 1.6, 3.4, P, { bevel: 0.4 }), { tone: "hi" }) + D(lens, { size: 0.9, tone: "hi" }), 0.5);
  };
  mast(-232, -172, 64, [1, 0]); mast(232, -172, 64, [1, 0]); mast(232, 184, 64, [1, 0]); mast(-232, 184, 64, [1, 0]);
  // manche à air : mât, bague, cône à bandes, tourné dans le sens du vent
  const wx = 0.89, wy = -0.45, sx = 150, sy = -168, sh = 46;
  put([sx, sy, sh / 2], S(k.cylinder(sx, sy, 3, 0.8, 2, P, 16), { tone: "lo" }) + S(k.cylinder(sx, sy, 1.2, 2.8, sh - 2.8, P, 12), { tone: "mid", crease: "none" }) + S(G.sphereOf([sx, sy, sh + 1], 1.7, P), { tone: "hi", lit: true }), 0.2);
  turn([sx + 2, sy, sh], [wx, wy, 0], [[0, 3.6], [1.2, 3.8], [3, 3.3], [11, 2.2], [20, 1.2]], { tone: "hi", bias: 0.6, inner: (Fb) => L(G.arcOf(Fb, 6, 3.1, P) + G.arcOf(Fb, 11.5, 2.2, P) + G.arcOf(Fb, 16, 1.6, P), { tone: "faint" }) });
  // regards d'accès et bornes le long de la voie de service
  const manhole = (x, y) => { cy(x, y, 4, 0.8, 0.5, { tone: "lo" }); base.push(L(ringL(x, y, 2.6, 1.3, 20) + ln3([x - 2.6, y, 1.3], [x + 2.6, y, 1.3]) + ln3([x, y - 2.6, 1.3], [x, y + 2.6, 1.3]), { tone: "faint" })); };
  for (const [x, y] of [[-44, -112], [24, -62], [130, -40], [170, 18], [-100, 100], [-28, 38]]) manhole(x, y);
  for (let i = 0; i < 6; i++) { const x = 58 + i * 8; put([x, -14, 5], S(k.cylinder(x, -14, 1.8, 0.8, 7, P, 14), { tone: "hi" }) + S(k.cylinder(x, -14, 1.8, 7.8, 0.8, P, 14), { tone: "lo" }), 0.3); }
  // anneaux d'alerte au sol des deux aires : traits radiaux entre deux cercles
  const hazard = (x, y, r0, r1, n) => base.push(L(ringL(x, y, r0, 0.82, 56) + Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return k.lineOnTop(polar(r0, a, [x, y]), polar(r1, a, [x, y]), 0.82, P); }).join(""), { tone: "faint" }));
  hazard(98, -86, 37, 41, 48); hazard(196, -92, 24, 27, 32);
  // champ de pages : règle graduée le long du bord avant
  { const strip = { x: 92, y: 163, w: 138, d: 7, r: 1 }; base.push(S(Sc.T.slab(strip, 0, 0.6, 3, 0), { tone: "lo", crease: "none" })); const tk = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P); base.push(L(tk.minor, { tone: "lo" }), L(tk.major, { tone: "mid" }), D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 })); }
}

// ---------------------------------------------------------------- pièces mobiles : chariot, capsule, fiche, véhicule, satellite
const cartMarkup = () => {
  let svg = S(k.extrude(rect(-10, 10, -8, 8), 1.2, 2.4, P, { bevel: 0.4 }), { tone: "mid" });
  svg += L(k.planOutline({ x: -8.5, y: -6.5, w: 17, d: 13, r: 0.6 }, 3.6, P, 2), { tone: "faint" });
  for (const [x, y] of [[-7, -9], [7, -9], [-7, 9], [7, 9]]) svg += S(k.cylinder(x, y, 1.6, 0.4, 1.0, P, 12), { tone: "lo", crease: "none" });
  svg += pageMarkup(3.6) + [0, 1, 2, 3].map((i) => { const d = k.planOutline({ x: -3.6, y: FY[i] - 1.4, w: 7.2, d: 2.8, r: 0.3 }, 4.4, P, 2); return `<g data-part="ink-${i}" opacity="0"><path class="fig-ink" d="${d}"/><path class="iso-line" data-tone="hi" d="${d}" style="stroke-width:1.5"/></g>`; }).join("");
  return svg;
};
const capsuleMarkup = () => S(k.extrude(rect(-6.5, 6.5, -6.5, 6.5), 0, 10, P, { bevel: 0.6 }), { tone: "mid" }) + bx(-6.7, 6.7, -1.6, 1.6, 8.6, 0.9, { reg: false, tone: "lo", crease: "none", bevel: 0.1 }) + bx(-1.6, 1.6, -6.7, 6.7, 8.6, 0.9, { reg: false, tone: "lo", crease: "none", bevel: 0.1 }) + S(k.cylinder(0, 0, 2.4, 9.5, 1.2, P, 18), { tone: "hi", lit: true });
const cardMarkup = () => [["img", 0, "lo"], ["txt", 0.9, "mid"], ["pos", 1.8, "hi"]].map(([nm, z, tone]) => `<g data-part="card-${nm}">${S(k.extrude(rect(-7, 7, -5, 5), z, 0.7, P, { bevel: 0.15 }), { tone, crease: "none" })}</g>`).join("");
const satMarkup = () => {
  let out = S(k.extrude(rect(-4.4, 4.4, -3.4, 3.4), -3.2, 6.4, P, { bevel: 0.5 }), { tone: "hi" }) + L(k.planOutline({ x: -3.4, y: -2.4, w: 6.8, d: 4.8, r: 0.4 }, 3.2, P, 2) + k.lineOnTop([-4.4, 0], [4.4, 0], 3.2, P), { tone: "faint" });
  out += S(k.cylinder(0, 0, 2, -5.8, 2.6, P, 16), { tone: "lo" }) + S(k.cylinder(0, 0, 2.5, -6.6, 0.9, P, 16), { tone: "hi", lit: true }) + L(k.ring(0, 0, 2.05, -4.6, P, 16), { tone: "faint" });
  out += S(k.cylinder(0, 0, 0.5, 3.2, 3.8, P, 8), { tone: "mid", crease: "none" }) + S(G.solidOf([[0, 0.4], [0.7, 2.6], [1.8, 3.2], [2.2, 3.2]], G.frameAlong([0, 0, 6.6], Zv), P), { tone: "hi", lit: true });
  out += S(k.extrude(rect(-1.4, 1.4, -4.4, -3.4), -2.4, 1.6, P, { bevel: 0.1 }), { tone: "lo" }) + S(k.cylinder(2.4, 3.8, 0.7, 0.8, 2.4, P, 10), { tone: "mid", crease: "none" });
  return out;
};
const panelMarkup = (sg) => {
  const x0 = sg > 0 ? 4.4 : -15.6, x1 = sg > 0 ? 15.6 : -4.4;
  let out = S(k.extrude(rect(x0, x1, -3.2, 3.2), 0.4, 0.5, P, { bevel: 0.1 }), { tone: "lo", crease: "none" });
  const ls = [];
  for (let i = 1; i < 6; i++) ls.push(k.lineOnTop([x0 + i * (x1 - x0) / 6, -3.2], [x0 + i * (x1 - x0) / 6, 3.2], 0.9, P));
  for (let j = 1; j < 3; j++) ls.push(k.lineOnTop([x0, -3.2 + j * 6.4 / 3], [x1, -3.2 + j * 6.4 / 3], 0.9, P));
  out += L(ls.join(""), { tone: "faint" }) + S(k.extrude(rect(sg > 0 ? 3.4 : -4.4, sg > 0 ? 4.4 : -3.4, -0.6, 0.6), 0.2, 0.6, P, { bevel: 0.1 }), { tone: "mid" });
  return out;
};
const veh = `<g data-part="booster">${boosterMarkup(1, true)}<g data-part="legs"></g></g><g data-part="stage2">${stage2Markup()}</g><g data-part="sat">${satMarkup()}<g data-part="pan-l">${panelMarkup(-1)}</g><g data-part="pan-r">${panelMarkup(1)}</g></g><g data-part="cart" opacity="1">${cartMarkup()}</g><g data-part="capsule" opacity="0">${capsuleMarkup()}</g><g data-part="cardfly" opacity="0">${cardMarkup()}</g><g data-part="chips"></g>`;

// ---------------------------------------------------------------- modèle
const STATIONS = [
  ["Lecture · Document AI", "un laser lit les quatre champs de la page sur son chariot"],
  ["Tri · mini-BERT", "chaque champ tombe dans l'alvéole de sa catégorie"],
  ["Hybride neuro-symbolique", "la clé du modèle et la clé des règles lèvent la barrière"],
  ["Relecture · Human-in-the-Loop", "la main tourne le volant, le tampon valide chaque cadre"],
  ["Corpus multimodal", "la fiche rejoint l'archive : image, texte, positions"],
  ["Entraînement · LayoutLMv3", "le lot est chargé dans le booster : trois essais à feu"],
  ["Évaluation et publication", "pages inédites sous clé, deux seuils, le levier publie"],
  ["Inférence", "le lancement : le satellite balaie des pages inédites et propose des cadres"],
  ["Validation et boucle", "trois pupitres, le booster se repose, les corrections repartent au hangar : gain × 2,3"],
];
const live = `
const P = ${JSON.stringify(P)};
const LYR = ${LYR}, PW = ${PW}, PH = ${PH}, FY = ${JSON.stringify(FY)}, BOOSTER_H = ${BOOSTER_H}, STAGE2_H = ${STAGE2_H}, RS = ${RS}, BH = ${BOOSTER_H * RS};
const TUR = ${JSON.stringify(TUR)}, ARC = ${JSON.stringify(ARC)}, ST = ${JSON.stringify(ST)}, PAD = ${JSON.stringify(PAD)}, LAND = ${JSON.stringify(LAND)};
const RL1 = ${JSON.stringify(RL1)}, RL2 = ${JSON.stringify(RL2)}, RET2 = ${JSON.stringify(RET2)}, FIELD = ${JSON.stringify(FIELD)}, MC = ${JSON.stringify(MC)};
const SHAPES = ${JSON.stringify([0, 1, 2, 3].map(CHIPSHAPE))};
const CHIPS = ${JSON.stringify([0, 1, 2, 3].map((i) => S(k.extrude(CHIPSHAPE(i), 0, 1.3, P, { bevel: 0.25 }), { tone: "hi", lit: true })))};
const STATIONS = ${JSON.stringify(STATIONS)};
${LOOP}
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TAU = Math.PI * 2;
const hash = (n) => { let h = Math.imul(n + 7, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const pr = (x, y, z) => iso([x, y, z], P);
const tW = (dx, dy, dz) => translateAlong(P, [dx, dy, dz || 0]);
const O0 = iso([0, 0, 0], P), scl = (k2) => ' translate(' + O0[0].toFixed(2) + ' ' + O0[1].toFixed(2) + ') scale(' + k2 + ') translate(' + (-O0[0]).toFixed(2) + ' ' + (-O0[1]).toFixed(2) + ')';
const Ts = [0, 6, 12.5, 19.5, 27.5, 35, 47, 59, 74], TD = 90, TEND = 92;
const stationAt = (s) => { let i = 0; Ts.forEach((a, j) => { if (s >= a) i = j; }); return i; };
const lineFx = (d, w, a, extra) => '<path class="fx-line" d="' + d + '" style="stroke-width:' + w + ';opacity:' + clamp01(a).toFixed(2) + (extra || '') + '"/>';
const dotFx = (p, r, a, cls) => '<circle class="' + (cls || 'fx-dot') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(2) + '" style="opacity:' + clamp01(a).toFixed(2) + '"/>';
const ringPts = (cx, cy, r, z, n) => Array.from({ length: n || 28 }, (_, i) => pr(cx + r * Math.cos(i / (n || 28) * TAU), cy + r * Math.sin(i / (n || 28) * TAU), z));
const rectAt = (cx, cy, w, d, z) => pathOf([pr(cx - w / 2, cy - d / 2, z), pr(cx + w / 2, cy - d / 2, z), pr(cx + w / 2, cy + d / 2, z), pr(cx - w / 2, cy + d / 2, z)], true);
const pw = (kf, t) => { if (t <= kf[0][0]) return kf[0][1]; for (let i = 1; i < kf.length; i++) if (t <= kf[i][0]) return lerp(kf[i - 1][1], kf[i][1], ease((t - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0] || 1))); return kf[kf.length - 1][1]; };
const polyAt = (pts, d) => { let walked = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], (pts[i][2] || 0) - (pts[i - 1][2] || 0)); if (d <= walked + l || i === pts.length - 1) { const g = clamp01((d - walked) / (l || 1)); return [lerp(pts[i - 1][0], pts[i][0], g), lerp(pts[i - 1][1], pts[i][1], g), lerp(pts[i - 1][2] || 0, pts[i][2] || 0, g)]; } walked += l; } return pts[pts.length - 1]; };
const polyLen = (pts) => pts.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], (p[2] || 0) - (pts[i - 1][2] || 0)) : 0), 0);

// ---- événements
const EV = {
  cartIn: [0.2, 1.4], read: [1.8, 3.4], cartB: [5.0, 6.0], chip: 6.6, cartC: [11.4, 12.4], keyN: [13.0, 14.2], keyR: [14.0, 15.2], lock: 15.4, boom: [16.0, 17.4], cartD: [17.8, 19.4],
  stamp: (n) => 20.2 + n * 1.45, cartE: [26.2, 27.4], cardUp: [28.0, 28.9], cardFly: [29.0, 31.0], seal: [32.0, 33.4], capOut: [33.6, 35.2],
  capRail: [35.2, 37.0], capLift: [37.2, 39.4], hatch: [39.4, 40.2], burn: [40.8, 43.0, 45.2], safe: [47.4, 48.6], rel: [49.0, 53.4], pin: [53.8, 54.4], lever: [54.4, 55.8], roll: [56.4, 59.0],
  arms: [59.4, 60.4], ignite: 61.0, lift: 61.8, sep: 66.2, deploy: [67.4, 68.4], scan: [68.8, 75.4], landBurn: [70.2, 72.8], touch: 72.8, wall: [72.0, 76], stampM: 76.4, cass: [78.2, 85.0], ret: [78.4, 85.4], gain: [76, 84]
};
const SEQ = (kk) => { const c = Math.floor(kk / 3), r = c % 2 ? 2 - (kk % 3) : kk % 3; return [c, r]; };
const SCANT = (kk) => EV.scan[0] + kk * ((EV.scan[1] - EV.scan[0]) / 12);
// ---- vol : du pas de tir au point de séparation, puis la descente du booster, l'orbite basse du satellite
const ASC = [[PAD.x, PAD.y, 8], [PAD.x + 1, PAD.y + 3, 34], [PAD.x + 6, PAD.y + 10, 76], [PAD.x + 14, PAD.y + 22, 124]];
const TOUCH = [LAND.x, LAND.y, 1];
const SEPP = ASC[3];
${BURN}
const burn = makeBurn(stage, svg, ${WIDTH}, ${HEIGHT}, pr);
const WIND = [10, -5];
const ascPos = (te) => { const u = seg(te, EV.lift, EV.sep); return polyAt(ASC, Math.pow(u, 1.9) * polyLen(ASC)); };
const descPos = (te) => { const u = seg(te, EV.sep, EV.touch), e = ease(u); return [lerp(SEPP[0], TOUCH[0], e), lerp(SEPP[1], TOUCH[1], e), lerp(SEPP[2] + 6, TOUCH[2], Math.pow(u, 0.75)) + 18 * Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - u)]; };
const SMOKE = [
  { seed: 1, kind: 'blast', t0: EV.ignite - 0.2, t1: EV.lift + 2.4, rate: 110, life: 5.8, o: [PAD.x, PAD.y, 9], v: [22, 86], r: [4, 13], rise: [6, 28], a: 0.5, warm: 1, warmT: 1.2, soot: 0.9, wind: WIND, r0: 6, axis: 0.8, zspan: 70 },
  { seed: 2, kind: 'trail', t0: EV.lift + 0.1, t1: EV.sep, rate: 130, life: 5.6, ref: [PAD.x, PAD.y], path: (te) => { const p = ascPos(te); return [p[0], p[1], Math.max(9, p[2] - 2.2 * RS)]; }, r: [3, 12], rise: [1, 3], a: 0.46, warm: 0.9, warmT: 0.45, soot: 1.2, wind: WIND, zb: 9, zspan: 130 },
  { seed: 3, kind: 'column', t0: 60.4, t1: 64.4, rate: 60, life: 4, o: [PAD.x, PAD.y, 9], v: [10, 30], r: [4, 11], rise: [16, 40], a: 0.34, wind: WIND, zspan: 60 },
  { seed: 9, kind: 'column', t0: EV.roll[1], t1: EV.ignite + 0.6, rate: 22, life: 2.8, o: [PAD.x + 4, PAD.y - 3, 9 + BH * 0.8], ref: [PAD.x, PAD.y], v: [1, 5], r: [2, 6], rise: [4, 12], a: 0.32, wind: WIND, zspan: 24 },
  { seed: 10, kind: 'ball', t0: EV.sep, t1: EV.sep + 0.3, rate: 200, life: 2.2, o: [SEPP[0], SEPP[1], SEPP[2] + BH + 4], ref: [SEPP[0] + 6, SEPP[1] + 10], v: [8, 44], r: [2, 7], rise: [3], a: 0.5, warm: 0.7, warmT: 0.4, zspan: 30 },
  ...[0, 1, 2].map((i) => ({ seed: 4 + i, kind: 'blast', t0: EV.burn[i] + 0.15, t1: EV.burn[i] + 1.7, rate: 80, life: 3.8, o: [ST.x, ST.y, 3], v: [10, 42], r: [3, 11], rise: [8, 26], a: 0.42, warm: 1, warmT: 0.9, soot: 0.8, r0: 4, zspan: 50 })),
  { seed: 8, kind: 'blast', t0: EV.landBurn[0] + 1.2, t1: EV.touch + 0.6, rate: 90, life: 4.6, o: [LAND.x, LAND.y, 2], v: [18, 66], r: [4, 13], rise: [5, 18], a: 0.46, warm: 1, warmT: 1, soot: 0.6, wind: WIND, r0: 5, zspan: 50 },
  { seed: 11, kind: 'trail', t0: EV.landBurn[0], t1: EV.touch, rate: 70, life: 3.4, ref: [LAND.x, LAND.y], path: (te) => { const p = descPos(te); return [p[0], p[1], p[2] - 2.2 * RS]; }, r: [2.5, 9], rise: [1, 2], a: 0.3, warm: 0.8, warmT: 0.4, wind: WIND, zb: 2, zspan: 100 },
];
const RINGS = [{ x: PAD.x, y: PAD.y, z: 8.8, t: EV.ignite, r0: 8, r1: 46, dur: 1.2, a: 0.3 }, { x: PAD.x, y: PAD.y, z: 8.8, t: EV.lift - 0.1, r0: 12, r1: 110, dur: 2.4, a: 0.3 }, { x: LAND.x, y: LAND.y, z: 1, t: EV.touch - 0.5, r0: 8, r1: 80, dur: 1.9, a: 0.45 }];
const mistAt = (o, s) => { const b = o.booster, a = s >= EV.lift + 1.2 && s < EV.sep + 0.6 ? Math.sin(Math.PI * seg(s, EV.lift + 1.2, EV.sep + 0.6)) * 0.55 : 0; return [{ x: b.x, y: b.y, z: b.z + BH + STAGE2_H * RS * 0.62, r: 13, a }]; };
const fadeEnd = (v, s) => v * (1 - ease(seg(s, TD, TEND)));
function decalsAt(o, s) {
  const b = o.booster, d = [];
  d.push({ k: 'scorch', x: PAD.x, y: PAD.y, gz: 8.9, R: 26, a: fadeEnd(0.62 * ease(seg(s, EV.ignite, EV.lift + 3)), s) });
  d.push({ k: 'scorch', x: ST.x, y: ST.y, gz: 1.3, R: 17, a: fadeEnd(0.4 * ease(seg(s, EV.burn[0], EV.burn[2] + 1.5)), s) });
  d.push({ k: 'scorch', x: LAND.x, y: LAND.y, gz: 1.1, R: 20, a: fadeEnd(0.42 * ease(seg(s, EV.touch, EV.touch + 1.6)), s) });
  if (s >= EV.roll[0] && s < EV.ret[0]) { const top = b.z + BH + (o.s2 ? STAGE2_H * RS : 0); d.push({ k: 'shadow', x: b.x, y: b.y, gz: 0.9, z0: b.z - 2, z1: top, r: 7, a: 0.7 * ease(seg(s, EV.roll[0], EV.roll[0] + 0.8)) * (1 - clamp01((b.z - 20) / 260)) * (1 - ease(seg(s, EV.ret[0] - 0.8, EV.ret[0]))) }); }
  return d;
}
function flamesAt(o, s) {
  const out = [], b = o.booster;
  if (o.thrust > 0.02 && s < EV.roll[0]) out.push({ x: ST.x, y: ST.y, z: 1.8, dir: [0, 0, -1], len: 70, w: 12, p: Math.min(1, o.thrust * 1.35), seed: 1, ground: 0.8, sheet: 30 });
  if (s >= EV.ignite && s < EV.lift) { const fq = ease(seg(s, EV.ignite, EV.lift)); out.push({ x: PAD.x, y: PAD.y, z: 9.3, dir: [0, 0, -1], len: 90, w: 13, p: 0.3 + 0.7 * fq, seed: 2, ground: 8.8, sheet: 22 + 18 * fq }); }
  if (s >= EV.lift && s < EV.sep) out.push({ x: b.x, y: b.y, z: Math.max(9.3, b.z - 2.2 * RS), dir: [0, 0, -1], len: 110, w: 15, p: 1, seed: 3, ground: 8.8, sheet: 38, light: 130 });
  if (o.s2 && s >= EV.sep && s < EV.sep + 4.8) { const f2 = ease(seg(s, EV.sep + 0.2, EV.sep + 0.8)) * (1 - ease(seg(s, EV.sep + 3.8, EV.sep + 4.8))) * o.s2.a; out.push({ x: o.s2.x, y: o.s2.y, z: o.s2.z - 0.8 * RS, dir: [0, 0, -1], len: 34, w: 4.6, p: f2, seed: 5 }); }
  if (s >= EV.landBurn[0] && s < EV.touch + 0.6) { const f = ease(seg(s, EV.landBurn[0], EV.landBurn[0] + 0.5)) * (1 - ease(seg(s, EV.touch, EV.touch + 0.6))); out.push({ x: b.x, y: b.y, z: Math.max(1.4, b.z - 2.2 * RS), dir: [0, 0, -1], len: 70, w: 12, p: f, seed: 6, ground: 0.8, sheet: 26 }); }
  return out;
}
function stateAt(s) {
  const o = { s }, res = ease(seg(s, TD + 0.2, TD + 1.6)), per = (a, b) => ease(seg(s, a, b)) * (1 - res);
  // 0 · le chariot entre, le laser lit
  const cx = pw([[0, -222], [EV.cartIn[0], -222], [EV.cartIn[1], -208], [EV.cartB[0], -208], [EV.cartB[1], -186], [EV.cartC[0], -186], [EV.cartC[1], -160], [EV.cartD[0], -160], [EV.cartD[1], -128], [EV.cartE[0], -128], [EV.cartE[1], -104], [90, -104]], s);
  o.cartX = cx; o.cartA = 1;
  o.headY = s < EV.read[1] ? (s < EV.read[0] ? lerp(LYR - 22, LYR - 10, ease(seg(s, 1.0, 1.8))) : lerp(LYR - 10, LYR + 10, seg(s, EV.read[0], EV.read[1]))) : lerp(LYR + 10, LYR - 22, ease(seg(s, 3.5, 4.4)));
  o.scan0 = s > EV.read[0] && s < EV.read[1];
  o.read = FY.map((y) => (s > EV.read[0] && o.headY >= LYR + y - 1 ? clamp01(1 - (s - 4.6) / 0.6) : 0));
  o.lampRead = s > 1.0 && s < 4.4;
  // 1 · tourelle : quatre champs, quatre alvéoles
  o.turPhi = 0.3 * s;
  o.chips = []; o.sorted = [0, 0, 0, 0]; o.drop = [-1, -1, -1, -1];
  for (let q = 0; q < 4; q++) {
    const a = EV.chip + q * 0.8, u = seg(s, a, a + 0.7), f = seg(s, a + 0.7, a + 1.0);
    const ph = o.turPhi + (a + 0.7) * 0.3 - s * 0.3 + q * TAU / 4;     // l'alvéole q à l'instant d'arrivée
    const hx = TUR.x + 6.4 * Math.cos(0.3 * (a + 0.7) + q * TAU / 4), hy = TUR.y + 6.4 * Math.sin(0.3 * (a + 0.7) + q * TAU / 4);
    o.sorted[q] = per(a + 0.7, a + 1.0) > 0.5 ? 1 : 0;
    if (u > 0 && u < 1) o.chips.push({ q, x: lerp(-186, hx, ease(u)), y: lerp(LYR + FY[q], hy, ease(u)), z: lerp(4.8, 9.6, ease(u)) + 14 * Math.sin(u * Math.PI), a: 1 });
    else if (u >= 1 && f < 1) { o.chips.push({ q, x: TUR.x + 6.4 * Math.cos(0.3 * s + q * TAU / 4), y: TUR.y + 6.4 * Math.sin(0.3 * s + q * TAU / 4), z: lerp(9.6, 8.4, f), a: 1 - f }); o.drop[q] = f; }
  }
  // 2 · deux clés, la barrière-levante
  o.keyN = per(EV.keyN[0], EV.keyN[1]); o.keyR = per(EV.keyR[0], EV.keyR[1]); o.lampLock = per(EV.lock, EV.lock + 0.2) > 0.5 ? 1 : 0; o.boom = per(EV.boom[0], EV.boom[1]);
  // 3 · pupitre : le volant tourne, le tampon passe de champ en champ
  const stepT = (n) => EV.stamp(n);
  o.stU = LYR - 22; o.press = 0; o.hit = [];
  for (let n = 0; n < 4; n++) {
    if (s >= stepT(n) - 0.4) {
      const fy = LYR + FY[n];
      o.stU = n === 0 ? lerp(LYR - 22, fy, ease(seg(s, stepT(0) - 0.4, stepT(0) + 0.2))) : lerp(LYR + FY[n - 1], fy, ease(seg(s, stepT(n) - 0.4, stepT(n) + 0.2)));
      const d = s - stepT(n) - 0.3; o.press = Math.max(o.press, d < 0 ? 0 : d < 0.18 ? ease(d / 0.18) : d < 0.36 ? 1 - ease((d - 0.18) / 0.18) : 0);
      const age = s - (stepT(n) + 0.48); if (age >= 0 && age < 0.8) o.hit.push({ n, age });
    }
  }
  if (s > stepT(3) + 1.2) o.stU = lerp(LYR + FY[3], LYR - 22, ease(seg(s, stepT(3) + 1.2, stepT(3) + 2.0)));
  o.ink = FY.map((_, n) => ease(seg(s, stepT(n) + 0.5, stepT(n) + 0.6)) * (s < EV.cardUp[0] ? 1 : 0));
  o.wheel = (s > 20 && s < 27) ? (s - 20) * 3.2 : 0; o.lampH = s > 19.6 && s < 27 ? 1 : 0;
  // 4 · fiche à trois feuillets, archive, scellement
  o.cardA = s >= EV.cardUp[0] && s < EV.cardFly[1] ? 1 : 0; o.spread = ease(seg(s, EV.cardUp[0], EV.cardUp[1]));
  const cf = seg(s, EV.cardFly[0], EV.cardFly[1]), ce = ease(cf);
  o.cardFly = cf > 0 && cf < 1 ? { x: lerp(-104, ARC.x, ce), y: lerp(LYR, ARC.y, ce), z: lerp(4.6, 13.2, ce) + 10 * Math.sin(cf * Math.PI) } : null;
  o.pageA = s < EV.cardUp[0] ? 1 : 0;
  o.slots = 10 + (per(31.1, 31.3) > 0.5 ? 1 : 0); o.arch = s > 31 && s < 32.6 ? Math.sin(Math.PI * (s - 31) / 1.6) : 0;
  o.seal = per(EV.seal[0], EV.seal[1]) * (1 - ease(seg(s, 33.4, 33.9)));
  // 5 · capsule : voie, ascenseur, trappe ; essais à feu
  const capT = seg(s, EV.capOut[0], EV.capOut[1]);
  o.cap = null;
  if (s >= EV.capOut[0] && s < EV.hatch[1]) {
    if (s < EV.capRail[0]) o.cap = { x: lerp(ARC.x, -100, ease(capT)), y: lerp(ARC.y + 8, LYR, ease(capT)), z: lerp(7, 1.6, ease(capT)), a: ease(seg(s, EV.capOut[0], EV.capOut[0] + 0.4)) };
    else if (s < EV.capLift[0]) o.cap = { x: lerp(-100, ST.x - 30, ease(seg(s, EV.capRail[0], EV.capRail[1]))), y: LYR + (ST.y + 8 - LYR) * ease(seg(s, EV.capRail[0], EV.capRail[1])) * 0 + 0, z: 1.6, a: 1 };
    else if (s < EV.hatch[0]) o.cap = { x: ST.x - 30, y: lerp(LYR, ST.y + 10, 1), z: lerp(1.6, 76, ease(seg(s, EV.capLift[0], EV.capLift[1]))), a: 1 };
    else o.cap = { x: lerp(ST.x - 30, ST.x - 12, ease(seg(s, EV.hatch[0], EV.hatch[1]))), y: ST.y + 10, z: 76, a: 1 - ease(seg(s, EV.hatch[0] + 0.5, EV.hatch[1])) };
  }
  o.hatch = s > EV.hatch[0] && s < 46.6 ? 0.7 + 0.3 * Math.sin(s * 8) : 0;
  const bt = (i) => EV.burn[i]; o.thrust = 0; o.epochs = 0;
  for (let i = 0; i < 3; i++) { const d = s - bt(i); const v = d < 0 ? 0 : d < 0.3 ? ease(d / 0.3) : d < 1.4 ? 1 : d < 1.8 ? 1 - ease((d - 1.4) / 0.4) : 0; o.thrust = Math.max(o.thrust, v * (0.55 + 0.2 * i)); if (d > 0) o.epochs = i + 1; }
  o.loss = lerp(1, 0.14, ease(seg(s, EV.burn[0], EV.burn[2] + 1.5)));
  // 6 · évaluation
  o.drawer = per(EV.safe[0], EV.safe[1]) * (1 - ease(seg(s, 52.4, 53.2)));
  o.rel = s < EV.rel[0] ? 0 : s < 56 ? ease(seg(s, EV.rel[0], EV.rel[1])) * 0.92 : 0.92; o.relShow = s >= EV.rel[0] && s < TD;
  o.colV = [0.5 + per(50.8, 52.0) * 0.25, 0.5 + per(52.2, 53.4) * 0.4]; o.forkOn = [o.colV[0] >= 0.749 ? 1 : 0, o.colV[1] >= 0.899 ? 1 : 0];
  o.pin = per(EV.pin[0], EV.pin[1]); o.pull = per(EV.lever[0], EV.lever[1]); o.lampPub = o.pull > 0.97 ? 1 : 0; o.lampCand = o.forkOn[1] && !o.lampPub ? 1 : 0;
  o.cab = s > 47 && s < 56 ? 1 : 0; o.vault = per(55.8, 57) * 0.7;
  // véhicule : au banc, sur le transporteur, au pas de tir, en vol, à l'atterrissage, sur le rail de retour
  let bp = [ST.x, ST.y, 4.8], bAlpha = 1; o.s2 = null; o.legs = 0; o.plumes = [];
  const rollU = ease(seg(s, EV.roll[0], EV.roll[1]));
  if (s < EV.roll[0]) bp = [ST.x, ST.y, 4.8];
  else if (s < EV.lift) bp = [lerp(ST.x, PAD.x, rollU), lerp(ST.y, PAD.y, rollU), lerp(4.8, 8, rollU)];
  const ascU = seg(s, EV.lift, EV.sep);
  if (s >= EV.lift && s < EV.sep) { const d = Math.pow(ascU, 1.9) * polyLen(ASC); bp = polyAt(ASC, d); }
  // stage 2 : empilé pendant le roulage, monte avec le booster, continue après la séparation
  const s2start = EV.roll[0] + 0.3;
  if (s >= s2start && s < EV.sep + 6) {
    if (s < EV.sep) o.s2 = { x: bp[0], y: bp[1], z: bp[2] + BH, a: ease(seg(s, s2start, s2start + 0.6)) };
    else { const u = seg(s, EV.sep, EV.sep + 6); o.s2 = { x: SEPP[0] + 4 * u, y: SEPP[1] + 8 * u, z: SEPP[2] + BH + 4 + 30 * u * u, a: 1 - ease(seg(s, EV.sep + 1.8, EV.sep + 4.2)) }; }
  }
  // descente du booster : retour au-dessus de l'aire, relance, pose
  if (s >= EV.sep && s < EV.touch) {
    const u = seg(s, EV.sep, EV.touch), e = ease(u);
    bp = [lerp(SEPP[0], TOUCH[0], e), lerp(SEPP[1], TOUCH[1], e), lerp(SEPP[2] + 6, TOUCH[2], Math.pow(u, 0.75)) + 18 * Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - u)];
    o.legs = ease(seg(s, 70.6, 71.6));
  }
  if (s >= EV.touch && s < EV.ret[0]) { bp = [TOUCH[0], TOUCH[1], 1]; o.legs = 1; }
  if (s >= EV.ret[0]) {
    const path = [[LAND.x, LAND.y, 1], ...RL2.map((p) => [p[0], p[1], 3]), [ST.x, ST.y, 4.8]];
    const u = ease(seg(s, EV.ret[0], EV.ret[1])); bp = polyAt(path, u * polyLen(path)); o.legs = 1 - ease(seg(s, EV.ret[0], EV.ret[0] + 0.8));
  }
  o.booster = { x: bp[0], y: bp[1], z: bp[2], a: bAlpha };
  o.arms = per(EV.arms[0], EV.arms[1]) ; o.deluge = s > 60.4 && s < 64 ? ease(seg(s, 60.4, 61.6)) * (1 - ease(seg(s, 62.6, 64))) : 0;
  // satellite : déploiement, balayage de douze pages en serpentin
  o.sat = null;
  if (s >= EV.sep + 1.0 && s < 80) {
    const u = seg(s, EV.sep + 1.0, EV.sep + 3.0);
    if (s < EV.scan[0]) { const e = ease(u); o.sat = { x: lerp(SEPP[0] + 4, FIELD.cx[0] - 6, e), y: lerp(SEPP[1] + 8, FIELD.cy[0] - 18, e), z: lerp(SEPP[2] + BH + 10, 130, e) }; }
    else if (s < EV.scan[1]) { const kk = Math.min(11, Math.floor((s - EV.scan[0]) / ((EV.scan[1] - EV.scan[0]) / 12))), f = ((s - EV.scan[0]) / ((EV.scan[1] - EV.scan[0]) / 12)) % 1; const a = SEQ(kk), b = SEQ(Math.min(11, kk + 1)); o.sat = { x: lerp(FIELD.cx[a[0]], FIELD.cx[b[0]], ease(f)), y: lerp(FIELD.cy[a[1]], FIELD.cy[b[1]], ease(f)), z: 130 + 4 * Math.sin(s * 2) }; }
    else { const u2 = seg(s, EV.scan[1], 78); o.sat = { x: FIELD.cx[3] + 70 * u2 * u2, y: FIELD.cy[2] + 40 * u2 * u2, z: 130 + 90 * u2 }; }
    o.sat.a = s < EV.scan[1] ? 1 : 1 - ease(seg(s, 77, 79)); o.satPan = ease(seg(s, EV.deploy[0], EV.deploy[1]));
    o.sat.dist = (s >= EV.scan[0] && s < EV.scan[1]);
  }
  o.visit = Array.from({ length: 12 }, (_, kk) => ease(seg(s, SCANT(kk) + 0.1, SCANT(kk) + 0.6)) * (1 - ease(seg(s, 79, 80))));
  // 8 · pupitres, bus, cassette de retour, gain
  o.stampM = (() => { const d = s - EV.stampM; return d < 0 ? 0 : d < 0.18 ? ease(d / 0.18) : d < 0.36 ? 1 - ease((d - 0.18) / 0.18) : 0; })();
  o.validated = s > EV.stampM + 0.2 ? ease(seg(s, EV.stampM + 0.2, EV.stampM + 0.7)) : 0;
  o.bus = s > EV.stampM && s < EV.stampM + 2.2 ? Math.sin(Math.PI * (s - EV.stampM) / 2.2) : 0; o.vdesk = s > EV.stampM + 0.3 && s < EV.cass[0] ? 1 : 0;
  o.cass = s > EV.cass[0] && s < EV.cass[1] + 0.4 ? seg(s, EV.cass[0], EV.cass[1]) : -1;
  o.gain = lerp(1, 2.3, ease(seg(s, EV.gain[0], EV.gain[1]))) * (1 - res) + res;
  o.downlink = s > EV.scan[0] + 0.4 && s < 77.5 ? 1 : 0;
  o.res = res;
  return o;
}

const parts = {};
for (const n of ["lhead", "tur", "chips", "boom", "key-n", "key-r", "shead", "splow", "wheel", "seal", "count", "cart", "capsule", "cardfly", "card-img", "card-txt", "card-pos", "booster", "soot", "legs", "stage2", "sat", "pan-l", "pan-r", "lift", "hatch", "arm-a", "arm-b", "deluge", "wall", "bus", "gain-needle", "rel-needle", "cols", "lever", "pin", "drawer", "lamp-read", "lamp-lock", "lamp-hitl", "lamp-pub", "lamp-cand", "lamp-cab", "vault-0"]) parts[n] = $(n);
const inks = [0, 1, 2, 3].map((i) => $("ink-" + i)), loads = [0, 1, 2, 3].map((i) => $("load-" + i)), slots = Array.from({ length: 12 }, (_, i) => $("slot-" + i));
const sortLamps = [0, 1, 2, 3].map((i) => $("sort-lamp-" + i)), forkLamps = [0, 1].map((i) => $("fork-" + i)), vdesk = [0, 1, 2].map((i) => $("vdesk-" + i)), stamps = [0, 1, 2].map((i) => $("stamp-" + i));
const fxLayer = svg.querySelector("#fx");
let t = 0, frozen = false, touring = true, idle = 0;
const setG = (el, v) => { if (el) el.setAttribute("opacity", clamp01(v).toFixed(2)); };
function barSvg(x0, y0, x1, y1, w, z, h, tone) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  return solidSvg(extrude([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], z, h, P, { bevel: 0.2 }), { tone: tone || "mid" });
}
// panache : trois couches (halo, flamme, cœur) qui vacillent, du point d'éjection vers le bas
function flame(x, y, z, len, w, a, ph) {
  if (a <= 0.02) return '';
  const fl = 0.85 + 0.15 * Math.sin(ph * 31) + 0.08 * Math.sin(ph * 57), p0 = pr(x, y, z), wpx = w;
  const tri = (ww, ll, cls, al) => { const pt = pr(x, y, z - ll * fl); return '<path class="' + cls + '" style="opacity:' + (al * a).toFixed(2) + '" d="M' + (p0[0] - ww).toFixed(1) + ' ' + p0[1].toFixed(1) + 'Q' + (p0[0] - ww * 0.9).toFixed(1) + ' ' + ((p0[1] + pt[1]) / 2).toFixed(1) + ' ' + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1) + 'Q' + (p0[0] + ww * 0.9).toFixed(1) + ' ' + ((p0[1] + pt[1]) / 2).toFixed(1) + ' ' + (p0[0] + ww).toFixed(1) + ' ' + p0[1].toFixed(1) + 'Z"/>'; };
  let out = tri(wpx * 1.9, len * 1.25, 'fx-fo', 0.26) + tri(wpx * 1.2, len * 1.05, 'fx-fo', 0.3) + tri(wpx, len, 'fx-fm', 0.7) + tri(wpx * 0.5, len * 0.66, 'fx-fc', 0.95);
  for (let i = 1; i <= 4; i++) { const g = i / 5, pt = pr(x, y, z - len * fl * g * 0.8), rx = wpx * 0.55 * (1 - g * 0.8); out += '<ellipse class="fx-fc" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + (rx * 0.5).toFixed(1) + '" style="opacity:' + (a * 0.9 * (1 - g * 0.5)).toFixed(2) + '"/>'; }
  return out;
}
const puff = (x, y, z, r, a) => dotFx(pr(x, y, z), r * RS * 0.75, a, 'fx-smoke');
// ---- les effets
function fxSvg(o, s) {
  let out = '';
  // 0 : nappe du laser, champs lus
  if (o.scan0) { const yh = o.headY, zl = 15.4, zp = 4.8; out += '<path class="fx-cone" d="' + pathOf([pr(-208, yh, zl), pr(-208 - PW / 2, yh, zp), pr(-208 + PW / 2, yh, zp)], true) + '"/>' + lineFx(pathOf([pr(-208 - PW / 2, yh, zp), pr(-208 + PW / 2, yh, zp)]), 1.4, 0.95); }
  o.read.forEach((a, i) => { if (a > 0.02) out += lineFx(rectAt(-208, LYR + FY[i], 7.6, 3.2, 4.9), 1.1, a); });
  // 1 : anneau d'arrivée dans l'alvéole
  o.drop.forEach((f, q) => { if (f >= 0) out += lineFx(pathOf(ringPts(TUR.x + 6.4 * Math.cos(0.3 * s + q * TAU / 4), TUR.y + 6.4 * Math.sin(0.3 * s + q * TAU / 4), 2 + f * 5, 9, 22), true), 1, 1 - f); });
  // 3 : ondes d'encre au tampon
  o.hit.forEach((h) => { const u = h.age / 0.8; out += lineFx(pathOf(ringPts(-128, LYR + FY[h.n], 3 + u * 9, 5, 26), true), 1.3, 1 - u) + lineFx(pathOf(ringPts(-128, LYR + FY[h.n], 2 + u * 5, 5, 20), true), 0.8, (1 - u) * 0.7); });
  // 4 : onde de l'archive, éclair du scellement
  if (o.arch > 0.02) out += lineFx(pathOf(ringPts(ARC.x, ARC.y, 12 + 7 * o.arch, 12.2, 40), true), 1.3, o.arch) + lineFx(pathOf(ringPts(ARC.x, ARC.y, 9 + 4 * o.arch, 14, 32), true), 1, o.arch * 0.7);
  if (s >= EV.sep && s < EV.sep + 0.8) { const u = (s - EV.sep) / 0.8; out += lineFx(pathOf(ringPts(SEPP[0], SEPP[1], (6 + u * 14) * RS, SEPP[2] + BH, 28), true), 1.3, 1 - u); }
  // satellite : nappe sur la page visitée, cadres BT (plein) et locaux (double trait)
  if (o.sat && o.sat.dist) {
    const sx = o.sat.x, sy = o.sat.y, sz = o.sat.z - 6.4, kk = Math.min(11, Math.floor((s - EV.scan[0]) / ((EV.scan[1] - EV.scan[0]) / 12))), c = SEQ(kk), tx = FIELD.cx[c[0]], ty = FIELD.cy[c[1]], hw = PW * FIELD.sc / 2, hh = PH * FIELD.sc / 2;
    out += '<path class="fx-cone" style="opacity:.5" d="' + pathOf([pr(sx, sy, sz), pr(tx - hw, ty - hh, 1.4), pr(tx + hw, ty - hh, 1.4), pr(tx + hw, ty + hh, 1.4), pr(tx - hw, ty + hh, 1.4)], true) + '"/>';
    const f2 = (s * 1.3) % 1; out += lineFx(pathOf([pr(tx - hw, ty - hh + f2 * 2 * hh, 1.5), pr(tx + hw, ty - hh + f2 * 2 * hh, 1.5)]), 1.4, 0.9);
  }
  for (let kk = 0; kk < 12; kk++) {
    const v = o.visit[kk]; if (v <= 0.02) continue; const c = SEQ(kk), tx = FIELD.cx[c[0]], ty = FIELD.cy[c[1]], sc = FIELD.sc, sel = kk === 4;
    const F2 = [[-4.6, -6.2, 5.6, 3.4, 0], [1.4, -1.6, 6.4, 4.6, 1], [-1.2, 5.6, 7.4, 2.8, 0]];
    F2.forEach(([fx, fy, w, d, kind], i) => {
      const u = ease(clamp01((v - i * 0.2) / 0.5)); if (u < 0.02) return;
      const val = sel ? o.validated : 0;
      out += lineFx(rectAt(tx + fx * sc * 0.7, ty + fy * sc * 0.7, w * sc * 0.7 * u, d * sc * 0.7 * u, 1.4), kind ? 1.0 : 1.5, u * (0.6 + 0.4 * val));
      if (kind) out += lineFx(rectAt(tx + fx * sc * 0.7, ty + fy * sc * 0.7, (w * sc * 0.7 + 1.6) * u, (d * sc * 0.7 + 1.6) * u, 1.4), 0.7, u * 0.7);
      if (val > 0.02) out += '<path class="fx-lit" style="opacity:' + (0.25 * val * u).toFixed(2) + '" d="' + rectAt(tx + fx * sc * 0.7, ty + fy * sc * 0.7, w * sc * 0.7, d * sc * 0.7, 1.45) + '"/>';
    });
  }
  // liaison descendante vers la parabole
  if (o.sat && o.downlink) { const dish = pr(40, 80, MC.h + 12.6), sp = pr(o.sat.x, o.sat.y, o.sat.z); out += lineFx(pathOf([sp, dish]), 1.1, 0.7 * o.sat.a, ';stroke-dasharray:3 5;stroke-dashoffset:' + (-s * 30).toFixed(1)); for (let i = 0; i < 3; i++) { const g = (s * 0.9 + i / 3) % 1; out += dotFx([lerp(sp[0], dish[0], g), lerp(sp[1], dish[1], g)], 1.8, 0.9 * (1 - Math.abs(g - 0.5) * 0.6)); } }
  // 8 : onde d'encre au pupitre central, cassette dans le tube
  if (s > EV.stampM + 0.15 && s < EV.stampM + 1.0) { const u = (s - EV.stampM - 0.15) / 0.85; out += lineFx(pathOf(ringPts(0, 128, 4 + u * 14, 11, 30), true), 1.3, 1 - u) + lineFx(pathOf(ringPts(0, 128, 2 + u * 8, 11, 24), true), 0.8, (1 - u) * 0.7); }
  if (o.cass >= 0) {
    const tot = polyLen(RET2), d0 = ease(o.cass) * tot;
    for (let q = 8; q >= 1; q--) out += dotFx(pr(...polyAt(RET2, Math.max(0, d0 - q * 7))), 2.4 - q * 0.2, 0.55 - q * 0.06);
    const pp = pr(...polyAt(RET2, d0)); out += dotFx(pp, 4.4, 0.3, 'fx-halo') + dotFx(pp, 2.4, 1) + dotFx(pp, 1.1, 1, 'fx-core');
    if (o.cass > 0.96) out += lineFx(pathOf(ringPts(-232, LYR, 6 + (o.cass - 0.96) * 200, 14, 28), true), 1.2, 1 - (o.cass - 0.96) / 0.04);
  }
  return out;
}
function draw(o, s) {
  // véhicules
  const b = o.booster; parts.booster.setAttribute("transform", tW(b.x, b.y, b.z) + scl(RS)); parts.booster.setAttribute("opacity", "1");
  let lg = ''; if (o.legs > 0.02) { const e = o.legs; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.785, c = Math.cos(a), sn = Math.sin(a), top = pr(c * 6, sn * 6, 22), foot = pr(c * (6 + 13 * e), sn * (6 + 13 * e), 0.2 + 22 * (1 - e) * 0); lg += pathOf([top, foot]); } lg = '<path class="iso-line" data-tone="hi" data-free="" d="' + lg + '"/>' + dotsSvg(Array.from({ length: 4 }, (_, i) => { const a = i / 4 * TAU + 0.785; return pr(Math.cos(a) * (6 + 13 * o.legs), Math.sin(a) * (6 + 13 * o.legs), 0.2); }), { size: 0.9, tone: "hi" }); }
  parts.legs.innerHTML = lg;
  parts.soot.setAttribute("opacity", fadeEnd(Math.max(0.4 * ease(seg(s, EV.burn[0], EV.burn[2] + 1.5)), 0.85 * ease(seg(s, EV.ignite, EV.lift + 2.5))), s).toFixed(2));
  if (o.s2) { parts.stage2.setAttribute("transform", tW(o.s2.x, o.s2.y, o.s2.z) + scl(RS)); parts.stage2.setAttribute("opacity", o.s2.a.toFixed(2)); } else parts.stage2.setAttribute("opacity", "0");
  if (o.sat && o.sat.a > 0.02 && s > EV.sep + 1) { parts.sat.setAttribute("transform", tW(o.sat.x, o.sat.y, o.sat.z) + scl(1.5)); parts.sat.setAttribute("opacity", o.sat.a.toFixed(2)); const pn = o.satPan || 0; parts["pan-l"].setAttribute("transform", tW(-9 * (1 - pn), 0, 0)); parts["pan-r"].setAttribute("transform", tW(9 * (1 - pn), 0, 0)); parts["pan-l"].setAttribute("opacity", pn.toFixed(2)); parts["pan-r"].setAttribute("opacity", pn.toFixed(2)); } else parts.sat.setAttribute("opacity", "0");
  // hangar : chariot, laser, tourelle
  parts.cart.setAttribute("transform", tW(o.cartX, LYR, 0.4)); parts.cart.setAttribute("opacity", s < EV.capOut[0] + 0.6 ? "1" : "0");
  parts.cart.setAttribute("opacity", s < EV.cardUp[0] ? "1" : (s < EV.cardFly[1] ? "1" : "0"));
  inks.forEach((g, i) => g.setAttribute("opacity", o.ink[i].toFixed(2)));
  parts.lhead.setAttribute("transform", tW(0, o.headY - LYR, 0)); parts["lamp-read"].dataset.on = String(o.lampRead);
  let tr = ''; for (let q = 0; q < 4; q++) { const a = o.turPhi + q * TAU / 4, pts = SHAPES[q].map(([u, v]) => { const px = TUR.x + 6.4 * Math.cos(a) + u * 1.3 * Math.cos(a + 1.57) - v * 1.3 * Math.sin(a + 1.57) * 0 + u * 0, py = TUR.y + 6.4 * Math.sin(a) + v * 1.3; return pr(TUR.x + 6.4 * Math.cos(a) + u * 1.2, TUR.y + 6.4 * Math.sin(a) + v * 1.2, 8.8); }); tr += '<path class="iso-fill fig-dark" d="' + pathOf(pts, true) + '"/><path class="iso-line" data-tone="lo" d="' + pathOf(pts, true) + '"/>'; }
  tr += '<path class="iso-line" data-tone="hi" d="' + pathOf([pr(TUR.x + 9.4 * Math.cos(o.turPhi + 0.78), TUR.y + 9.4 * Math.sin(o.turPhi + 0.78), 8.8), pr(TUR.x + 10.8 * Math.cos(o.turPhi + 0.78), TUR.y + 10.8 * Math.sin(o.turPhi + 0.78), 8.8)]) + '"/>';
  parts.tur.innerHTML = tr;
  parts.chips.innerHTML = o.chips.map((c) => '<g transform="' + tW(c.x, c.y, c.z) + '" opacity="' + c.a.toFixed(2) + '">' + CHIPS[c.q] + "</g>").join("");
  sortLamps.forEach((l, i) => { l.dataset.on = String(o.sorted[i] === 1); });
  // clés, barrière
  const face = -122;
  parts["key-n"].setAttribute("transform", tW(-166, face + lerp(14, 0.2, o.keyN), 17)); parts["key-r"].setAttribute("transform", tW(-154, face + lerp(14, 0.2, o.keyR), 17));
  parts["lamp-lock"].dataset.on = String(o.lampLock === 1);
  const ba = o.boom * 1.35, px = -147, py = -103, ln = 22; parts.boom.innerHTML = (() => { const p0 = [px, py, 15.4], p1 = [px, py + ln * Math.cos(ba), 15.4 + ln * Math.sin(ba)], w = 1.3; const a = pr(...p0), b2 = pr(...p1), nx = 0, d = (pt, sx) => [pt[0] + sx * 1.8, pt[1]]; let g = '<path class="iso-fill" d="' + pathOf([d(a, -1), d(b2, -1), d(b2, 1), d(a, 1)], true) + '"/><path class="iso-line" data-tone="mid" d="' + pathOf([d(a, -1), d(b2, -1), d(b2, 1), d(a, 1)], true) + '"/>'; for (let i = 1; i < 5; i++) { const f = i / 5; g += '<path class="iso-line" data-tone="lo" d="' + pathOf([[lerp(a[0], b2[0], f) - 1.8, lerp(a[1], b2[1], f)], [lerp(a[0], b2[0], f) + 1.8, lerp(a[1], b2[1], f)]]) + '"/>'; } return g; })();
  // pupitre de relecture : volant, tampon
  let sp = ''; for (let q = 0; q < 6; q++) { const a = o.wheel + q * Math.PI / 3; sp += pathOf([pr(-120, -44, 6), pr(-120 + 5.8 * Math.cos(a), -44, 6 + 5.8 * Math.sin(a))]); }
  parts.wheel.innerHTML = '<path class="iso-line" data-tone="hi" d="' + sp + '"/>' + dotsSvg([pr(-120, -44, 6)], { size: 0.7, tone: "hi" });
  parts["lamp-hitl"].dataset.on = String(o.lampH === 1);
  parts.shead.setAttribute("transform", tW(0, o.stU - LYR, 0)); parts.splow.setAttribute("transform", tW(0, 0, -3.2 * o.press));
  // archive, scellement, capsule
  parts.cardfly.setAttribute("opacity", o.cardFly ? "1" : "0"); if (o.cardFly) parts.cardfly.setAttribute("transform", tW(o.cardFly.x, o.cardFly.y, o.cardFly.z));
  parts["card-txt"].setAttribute("transform", tW(0, 0, 0)); 
  slots.forEach((g, i) => { g.dataset.on = String(i < o.slots); });
  const cn = String(o.slots); if (parts.count.textContent !== cn) parts.count.textContent = cn;
  parts.seal.setAttribute("transform", tW(0, 0, 8 - 8 * o.seal * 0 - 8 * ease(clamp01(o.seal * 1.0)) * 1)); parts.seal.setAttribute("opacity", "1");
  if (o.cap) { parts.capsule.setAttribute("opacity", o.cap.a.toFixed(2)); parts.capsule.setAttribute("transform", tW(o.cap.x, o.cap.y, o.cap.z)); } else parts.capsule.setAttribute("opacity", "0");
  // banc d'essai : élévateur, trappe, vérins
  parts.lift.innerHTML = o.cap && s >= EV.capRail[1] - 0.2 && s < EV.hatch[0] + 0.6 ? solidSvg(extrude([[ST.x - 38, ST.y + 6], [ST.x - 24, ST.y + 6], [ST.x - 24, ST.y + 14], [ST.x - 38, ST.y + 14]], o.cap.z - 1.8, 1.4, P, { bevel: 0.2 }), { tone: "hi", lit: true }) : "";
  setG(parts.hatch, o.hatch); loads.forEach((g, i) => setG(g, o.thrust * (0.7 + 0.3 * Math.sin(s * 9 + i)) * (s < EV.roll[0] ? 1 : 0)));
  // pupitre du banc : coffre, cadran, colonnes, levier
  parts.drawer.setAttribute("opacity", Math.min(1, o.drawer * 2).toFixed(2)); parts.drawer.setAttribute("transform", tW(0, 10 * o.drawer, 0)); parts["lamp-cab"].dataset.on = String(o.cab === 1);
  parts["rel-needle"].innerHTML = o.relShow ? '<path class="iso-line" data-tone="hi" d="' + pathOf([pr(-64, -38.95, 21), pr(-64 + 5 * Math.cos((200 - o.rel * 220) * Math.PI / 180), -38.95, 21 + 5 * Math.sin((200 - o.rel * 220) * Math.PI / 180))]) + '"/>' + dotsSvg([pr(-64, -38.95, 21)], { size: 0.6, tone: "hi" }) : "";
  const zv = (v) => 13 + (v - 0.5) / 0.5 * 19.2;
  parts.cols.innerHTML = [0, 1].map((i) => solidSvg(cylinder(i ? -48 : -58, -35, 3.2, zv(o.colV[i]) - 0.9, 1.8, P, 20, 0.2), { tone: "hi", lit: true })).join("");
  forkLamps.forEach((l, i) => { l.dataset.on = String(o.forkOn[i] === 1); });
  parts.pin.setAttribute("transform", tW(0, 0, 8 * o.pin));
  const ang = lerp(Math.atan2(-6, 8), Math.atan2(-6, 8) - 1.55, o.pull), tx = -32 + 10 * Math.cos(ang), ty = -35 + 10 * Math.sin(ang);
  parts.lever.innerHTML = barSvg(-32, -35, tx, ty, 2.6, 11.4, 2.2, "mid") + solidSvg(cylinder(tx, ty, 2, 13.6, 2.4, P, 16), { tone: "hi", lit: true });
  parts["lamp-pub"].dataset.on = String(o.lampPub === 1); parts["lamp-cand"].dataset.on = String(o.lampCand === 1); setG(parts["vault-0"], o.vault);
  // pas de tir : bras de service, déluge
  const tx0 = PAD.x + 40, ty0 = PAD.y, aa = Math.PI + 1.5 * o.arms;
  parts["arm-a"].innerHTML = barSvg(tx0 - 5, ty0 - 5, tx0 - 5 + 22 * Math.cos(aa), ty0 - 5 + 22 * Math.sin(aa), 2.6, 100, 3, "mid") + solidSvg(cylinder(tx0 - 5 + 22 * Math.cos(aa), ty0 - 5 + 22 * Math.sin(aa), 2.4, 100, 5, P, 14), { tone: "hi", lit: true });
  parts["arm-b"].innerHTML = barSvg(tx0 - 5, ty0 - 5, tx0 - 5 + 20 * Math.cos(aa), ty0 - 5 + 20 * Math.sin(aa), 2.6, 154, 3, "mid");
  setG(parts.deluge, o.deluge * 0.5);
  // contrôle : mur d'écran, pupitres, bus, gain
  let wl = ''; { const sx0 = -52, sz0 = 14, yf = MC.y0 + 2.4 + 0.07; for (let kk = 0; kk < 12; kk++) { const v = o.visit[kk]; if (v < 0.05) continue; const c = SEQ(kk), u0 = sx0 + 8 + c[0] * 24, zz0 = sz0 + 3 + c[1] * 7, val = kk === 4 ? o.validated : 0; wl += lineFx(pathOf([pr(u0 + 1, yf, zz0 + 1), pr(u0 + 7, yf, zz0 + 1), pr(u0 + 7, yf, zz0 + 3.2), pr(u0 + 1, yf, zz0 + 3.2)], true), 1, v * (0.6 + 0.4 * val)) + lineFx(pathOf([pr(u0 + 9, yf, zz0 + 2), pr(u0 + 16, yf, zz0 + 2), pr(u0 + 16, yf, zz0 + 4.6), pr(u0 + 9, yf, zz0 + 4.6)], true), 1, v * 0.8); if (val > 0.05) wl += '<path class="fx-lit" style="opacity:' + (0.3 * val).toFixed(2) + '" d="' + pathOf([pr(u0 + 1, yf, zz0 + 1), pr(u0 + 7, yf, zz0 + 1), pr(u0 + 7, yf, zz0 + 3.2), pr(u0 + 1, yf, zz0 + 3.2)], true) + '"/>'; } }
  parts.wall.innerHTML = wl;
  setG(parts.bus, o.bus); vdesk.forEach((l, i) => { l.dataset.on = String(i === 1 && o.vdesk === 1); }); stamps[1].setAttribute("transform", tW(0, 0, -2.6 * o.stampM));
  const ga = (205 - o.gain * 230 / 3) * Math.PI / 180, gyy = 98, gzz = 26;
  parts["gain-needle"].innerHTML = '<path class="iso-line" data-tone="hi" d="' + pathOf([pr(MC.x1 + 1.7, gyy, gzz), pr(MC.x1 + 1.7, gyy + 8.8 * Math.cos(ga), gzz + 8.8 * Math.sin(ga))]) + '"/>' + dotsSvg([pr(MC.x1 + 1.7, gyy, gzz)], { size: 0.9, tone: "hi" });
  fxLayer.innerHTML = fxSvg(o, s);
  burn.frame(s, SMOKE, flamesAt(o, s), RINGS, { decals: decalsAt(o, s), mists: mistAt(o, s), flash: Math.max(0.5 * ease(seg(s, EV.ignite, EV.lift)) * (1 - ease(seg(s, EV.lift + 1.5, EV.lift + 3.5))), 0.22 * ease(seg(s, EV.landBurn[0] + 1, EV.touch)) * (1 - ease(seg(s, EV.touch, EV.touch + 1.2)))) });
}
function reading(s) { const i = stationAt(s), [name, status] = STATIONS[Math.min(i, STATIONS.length - 1)]; return (i + 1) + " · " + name + " · " + status; }
// étapes : une carte par poste, la carte active est cerclée de l'accent, un clic saute au poste
const stepsEl = document.createElement("div"); stepsEl.className = "vre-steps";
stepsEl.innerHTML = STATIONS.map(([n, d], i) => '<button type="button" class="vre-step" data-i="' + i + '"><span class="vre-n">' + (i + 1) + '</span><span class="vre-t"><b>' + n + '</b><i>' + d + '</i></span></button>').join("");
document.querySelector(".iso-plate").after(stepsEl);
let lastSt = -1;
const markSt = (s) => { const i = stationAt(s); if (i !== lastSt) { lastSt = i; stepsEl.querySelectorAll(".vre-step").forEach((el, j) => el.classList.toggle("on", j === i)); } };
const run = loop((dt, calm) => {
  if (frozen) return;
  if (touring) { t = calm ? Ts[7] + 5 : t + dt; if (t >= TEND) t = 0; }
  const o = stateAt(t); draw(o, t); say(reading(t)); markSt(t);
});
stepsEl.addEventListener("click", (e) => { const b = e.target.closest(".vre-step"); if (b) jump(+b.dataset.i); });
const jump = (i) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 9000); t = Ts[(i + 9) % 9] + 3.4; run(); };
dragX(() => stationAt(t), (v, share) => { const n = (Math.round(v + share * 9) % 9 + 9) % 9; if (n !== stationAt(t)) jump(n); });
stage.addEventListener("keydown", (e) => { const i = stationAt(t); if (e.key === "ArrowRight") { e.preventDefault(); jump(i + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); jump(i - 1); } });
window.__fig = { at: (s) => { touring = false; frozen = true; t = s; const o = stateAt(s); draw(o, s); say(reading(s)); markSt(s); return reading(s); }, Ts, stateAt };
draw(stateAt(0), 0); say(reading(0)); markSt(0);
`;

// ---------------------------------------------------------------- finition : ombres portées douces, occlusion aux pieds des murs, grain du béton
const polish = (() => {
  const o0 = at([0, 0, 0]), exv = [at([1, 0, 0])[0] - o0[0], at([1, 0, 0])[1] - o0[1]], eyv = [at([0, 1, 0])[0] - o0[0], at([0, 1, 0])[1] - o0[1]], dt = exv[0] * eyv[1] - exv[1] * eyv[0];
  const wx = Math.SQRT1_2, wy = Math.SQRT1_2;
  console.log("lumière (monde)", wx.toFixed(2), wy.toFixed(2));
  const hull = (pts) => { const q = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const p of q) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of [...q].reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); } return [...lo.slice(0, -1), ...up.slice(0, -1)]; };
  const shadow = (x0, x1, y0, y1, h, a = 1, kk = 0.3) => { const L2 = h * kk, pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; return `<path class="fig-shadow" style="--a:${a}" d="${pth(hull([...pts, ...pts.map(([x, y]) => [x + wx * L2, y + wy * L2])]).map(([x, y]) => at([x, y, 0.9])), true)}"/>`; };
  const out = [];
  // murs : ombre portée vers l'intérieur et occlusion aux pieds
  out.push(shadow(HG.x0, HG.x1, HG.y0, HG.y0 + 2.4, HG.h, 1, 0.34), shadow(HG.x0, HG.x0 + 2.4, HG.y0, HG.y1, HG.h, 1, 0.34));
  out.push(shadow(MC.x0, MC.x1, MC.y0, MC.y0 + 2.4, MC.h, 1, 0.34), shadow(MC.x0, MC.x0 + 2.4, MC.y0, MC.y1, MC.h, 1, 0.34), shadow(MC.x1 - 2.4, MC.x1, MC.y0 + 2.4, MC.y1, MC.h, 0.8, -0.2));
  // tours et banc d'essai
  out.push(shadow(PAD.x + 34, PAD.x + 46, PAD.y - 6, PAD.y + 6, 208, 0.9, 0.26), shadow(ST.x - 22, ST.x + 22, ST.y - 22, ST.y + 22, 136, 0.7, 0.2), shadow(PAD.x + 27, PAD.x + 45, PAD.y - 49, PAD.y - 31, 24, 1, 0.5));
  // grain du béton sur toute la plaque
  const g = k.corners(PLATE, 0).map(([x, y]) => at([x, y, 0.2]));
  out.push(`<path class="fig-grain" d="${pth(g, true)}" filter="url(#fig-grain)"/>`);
  return `<defs><filter id="fig-sh" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.2"/></filter><filter id="fig-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.25" result="a"/><feComposite in="a" in2="SourceGraphic" operator="in"/></filter></defs><g filter="url(#fig-sh)">${out.slice(0, -1).join("")}</g>${out[out.length - 1]}`;
})();

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un site de lancement clos par une clôture. Dans le hangar, une page roule sur un chariot : un laser lit ses champs, une tourelle les trie, deux clés lèvent une barrière-levante, un tampon valide chaque cadre, la fiche rejoint une archive à trois feuillets et le lot est scellé. Au banc d'essai, le lot est chargé dans le booster, qui fait trois essais à feu ; deux colonnes de seuil le mesurent sur des pages inédites gardées dans un coffre, un levier le publie et la version précédente reste au registre. Le booster part du pas de tir, sépare un satellite qui balaie douze pages inédites et propose des cadres, puis se repose sur son aire et revient au banc. Trois pupitres corrigent les cadres, une cassette de verre les renvoie au hangar, et le cadran du centre de contrôle compare le gain : ×1, l'extracteur VRE, contre ×2,3.",
  body: [...base, polish, Sc.flush(), `<foreignObject id="burn-back" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" style="pointer-events:none;overflow:visible"><canvas xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:block"></canvas></foreignObject>`, `<g id="veh">${veh}</g>`, afterB.sort((a, b) => a.d - b.d).map((i) => i.svg).join(""), `<g id="fx" class="fx"></g>`],
});
const plate = k.plateHtml({
  fig: "Fig 11", title: "VRE Studio", hint: "Glisse ou ← → : étape", readout: "1 · Lecture · Document AI",
  keys: [
    { mark: "raised", label: "Le chariot, le lot, le booster, le satellite : le même contenu qui change d'état" },
    { mark: "flat", label: "La clôture : tout est local, une seule porte" },
    { mark: "lit", label: "Ce qui vient d'agir : laser, clé, tampon, flamme, nappe" },
  ],
  caption: "Un site de lancement local. Dans le hangar, une page roule sur un chariot : un laser la lit (Document AI), une tourelle trie ses quatre champs (mini-BERT), deux clés, celle du modèle et celle des règles, lèvent une barrière-levante (hybride neuro-symbolique), un tampon à main valide chaque cadre (Human-in-the-Loop), puis la fiche rejoint une archive à trois feuillets, image, texte et positions, et le lot est scellé (corpus multimodal). Au banc d'essai, le lot est chargé dans le booster, qui fait trois essais à feu (entraînement LayoutLMv3) ; deux colonnes de seuil le mesurent avec des pages inédites gardées dans un coffre, un levier le publie, la version précédente reste au registre (MLOps local). Le booster part du pas de tir et sépare un satellite qui balaie douze pages inédites et propose des cadres de deux sortes, BT et locaux (inférence), puis se repose sur son aire et revient au banc. Trois pupitres du centre de contrôle partagent les corrections, une cassette de verre les ramène au hangar, et un cadran compare le gain : ×1 pour l'extracteur VRE, ×2,3 pour VRE Studio. Les seuils et les cadres sont des valeurs d'illustration.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="VRE Studio : flèches gauche et droite pour passer d'une étape à l'autre" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0">${svg}</div>`,
});
writeFigure("vrestudio-fusee", { title: "VRE Studio · la fusée", plate, live, width: 960, css: "<style>.fig-deck{fill:var(--anatomy-lo);opacity:.3}.fig-dark{fill:var(--anatomy-lo);opacity:.55}.fig-glow{fill:var(--g,#34d399);stroke:none;pointer-events:none}.fig-ink{fill:var(--anatomy-lit);opacity:.14}.fig-shadow{fill:#000;stroke:none;opacity:calc(var(--a,1) * .55)}[data-theme=light] .fig-shadow{fill:#2a2c32;opacity:calc(var(--a,1) * .16)}.fig-grain{fill:#000;stroke:none;opacity:.07;pointer-events:none}[data-theme=light] .fig-grain{opacity:.045}.fx{pointer-events:none}.fx-line{fill:none;stroke:var(--g,#34d399);stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 2.5px var(--g,#34d399))}.fx-cone{fill:var(--g,#34d399);opacity:.28;stroke:none}.fx-dot{fill:var(--g,#34d399);stroke:none}.fx-halo{fill:var(--g,#34d399);stroke:none;filter:blur(2px)}.fx-core{fill:#fff;stroke:none}.fx-lit{fill:var(--g,#34d399);stroke:none}.fx-fo{fill:var(--g,#34d399);stroke:none;filter:blur(1.5px)}.fx-fm{fill:var(--g,#34d399);stroke:none}.fx-fc{fill:#fff;stroke:none}.fx-smoke{fill:var(--anatomy-lo);stroke:none;filter:blur(2px)}.vre-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin:14px auto 0;max-width:960px}.vre-step{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:11px;padding:12px 14px;border-radius:12px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-faint);transition:box-shadow .25s}.vre-step:hover{box-shadow:0 0 0 1px var(--anatomy-muted)}.vre-step:focus-visible{outline:2px solid var(--anatomy-muted);outline-offset:2px}.vre-step.on{box-shadow:0 0 0 2px #fb7185}.vre-n{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:600 11px/1 var(--anatomy-mono,monospace);background:var(--anatomy-faint);color:var(--anatomy-text)}.vre-step.on .vre-n{background:#fb7185;color:#fff}.vre-t b{display:block;font:600 13px/1.25 system-ui,sans-serif;color:var(--anatomy-strong)}.vre-t i{display:block;font:normal 12px/1.4 system-ui,sans-serif;color:var(--anatomy-text);margin-top:3px}</style>" });
