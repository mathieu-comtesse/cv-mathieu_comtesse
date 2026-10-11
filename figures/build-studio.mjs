// Fig 10 · Studio d'extracteurs PDF : une machine à reproduire les clés.
// node figures/build-studio.mjs  →  figures/studio.html
// La clé modèle (le PDF exemple) est serrée à l'arrière, l'ébauche à l'avant. Le pont glisse le long
// des deux lames : le palpeur suit chaque zone tracée sur le modèle, la fraise taille la même
// encoche dans l'ébauche. La clé taillée (l'extracteur) ouvre ensuite le casier de sa famille.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 400;
const PLATE = { x: -122, y: -62, w: 244, d: 124, r: 8 };
const BASE = { x: -100, y: -40, w: 142, d: 70, r: 4 }, BASE_H = 14;
const KEY = { x0: -44, x1: 14, w: 10, z: BASE_H + 6, t: 1.6, head: 9 };
const LANES = { master: -16, blank: 12 };                         // y du bord denté de chaque clé
const RAIL = { y: -36, z: 22 }, BRIDGE_Z = 46;
const LOCKER = { x: 56, y: -56, w: 52, d: 30, r: 2 }, LOCKER_H = 52, DOOR = { w: 22, h: 21 };
const DOORS = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([c, r]) => ({ x: LOCKER.x + 3 + c * (DOOR.w + 2), z: 4 + (1 - r) * (DOOR.h + 2) }));

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [BASE.x, RAIL.y, BRIDGE_Z + 18], [LOCKER.x + LOCKER.w, LOCKER.y, LOCKER_H + 4]], WIDTH, HEIGHT, { pad: 20, azimuth: 52, elevation: 34 });
const { at, S, L, D, slab, front, right, flat } = tools(P);
const Z = [0, 0, 1];

// ---------------------------------------------------------------- bâti, étaux, rail
function baseSvg() {
  const out = [], b = BASE;
  out.push(`<path class="iso-halo" d="${k.haloOf(b, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(b, 0, BASE_H, 4, 1), { tone: "mid", inner: L(k.sideSeam(b, 4, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(b, 4), BASE_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(b, 6).map(([x, y]) => at([x, y, BASE_H])), { size: 0.45 }));
  // Rail arrière du pont, avec ses butées.
  out.push(S(slab({ x: b.x + 4, y: RAIL.y - 3, w: b.w - 8, d: 6, r: 1 }, BASE_H, RAIL.z - BASE_H, 3, 0.5), { tone: "mid" }));
  out.push(L(k.lineOnTop([b.x + 6, RAIL.y], [b.x + b.w - 6, RAIL.y], RAIL.z, P), { tone: "lo" }));
  for (const x of [b.x + 4, b.x + b.w - 8]) out.push(S(slab({ x, y: RAIL.y - 4, w: 4, d: 8, r: 0.8 }, RAIL.z, 4, 2, 0.3), { tone: "mid" }));
  // Règle graduée le long du rail.
  const ticks = k.topTicks(KEY.x0, KEY.x1, 2, 5, RAIL.y + 3.4, BASE_H, [1.6, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // Afficheur de la famille sur la face avant ; sélecteur à droite.
  out.push(display(front(b.y + b.d), flat(b.x + 8, 4, b.x + 60, 10.5, 1), { part: "family", x: b.x + 34, y: -5.2, size: 4.8, text: "CERFA" }));
  out.push(S(k.cylinder(b.x + b.w - 16, b.y + b.d - 12, 6, BASE_H, 1, P, 32), { tone: "lo" }));
  out.push(S(k.cylinder(b.x + b.w - 16, b.y + b.d - 12, 4.6, BASE_H + 1, 4, P, 32, 0.4), { tone: "mid", inner: L(k.knurl(b.x + b.w - 16, b.y + b.d - 12, 4.6, BASE_H + 1, BASE_H + 5, 30, P), { tone: "faint" }) }));
  out.push(`<g data-part="selector"></g>`);
  return out.join("");
}
function viseSvg(y, part) {
  // Étau : mâchoire fixe derrière la clé, mâchoire mobile devant, vis à molette.
  const out = [], jaw = (yy) => S(slab({ x: KEY.x0 - 18, y: yy, w: 16, d: 4, r: 0.8 }, BASE_H, 7, 2, 0.4), { tone: "mid" });
  if (part === "back") {
    out.push(S(slab({ x: KEY.x0 - 20, y: y - KEY.w - 4, w: 20, d: KEY.w + 8, r: 1.2 }, BASE_H, 2, 2, 0.4), { tone: "lo" }));
    out.push(jaw(y - KEY.w - 4));
    out.push(S(slab({ x: KEY.x0 - 4, y: y - KEY.w - 1, w: KEY.x1 - KEY.x0 + 8, d: KEY.w + 1, r: 0.6 }, BASE_H, KEY.z - BASE_H - KEY.t / 2, 2, 0.3), { tone: "lo" }));
    return out.join("");
  }
  out.push(jaw(y + 0.4));
  const F = G.frameAlong([KEY.x0 - 10, y + 4.4, BASE_H + 3.5], [0, 1, 0]);
  out.push(S(G.disc(0, 6, 1.2, F, P), { tone: "mid" }), S(G.disc(6, 8.4, 3.4, F, P), { tone: "mid", inner: L(G.ribsOf(F, 6.2, 8.2, 3.4, 16, P), { tone: "faint" }) }));
  return out.join("");
}
// Pont mobile : chariot sur le rail, poutre, palpeur, fraise et son moteur (dessiné en x = 0).
function bridgeSvg() {
  const out = [];
  out.push(S(slab({ x: -6, y: RAIL.y - 5, w: 12, d: 10, r: 1.4 }, RAIL.z, 6, 3, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: -3, y: RAIL.y - 2, w: 6, d: 6, r: 1 }, RAIL.z + 6, BRIDGE_Z - RAIL.z - 6, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: -4, y: RAIL.y - 3, w: 8, d: LANES.blank + 12 - RAIL.y, r: 1.2 }, BRIDGE_Z, 5, 3, 0.5), { tone: "mid", inner: L(k.sideSeam({ x: -4, y: RAIL.y - 3, w: 8, d: LANES.blank + 12 - RAIL.y, r: 1.2 }, BRIDGE_Z + 2.5, P, 3), { tone: "faint" }) }));
  out.push(D([at([0, RAIL.y, BRIDGE_Z + 5]), at([0, LANES.blank + 6, BRIDGE_Z + 5])], { size: 0.45 }));
  return out.join("");
}
function lockerSvg() {
  const out = [], l = LOCKER;
  out.push(`<path class="iso-halo" d="${k.haloOf(l, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(l, 0, LOCKER_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(l, LOCKER_H - 4, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: l.x - 1.5, y: l.y - 1.5, w: l.w + 3, d: l.d + 3, r: 2 }, LOCKER_H, 3, 3, 0.5), { tone: "mid" }));
  // Niches derrière les portes (visibles quand elles s'ouvrent).
  const f = front(l.y + l.d);
  out.push(`<g transform="${f}">${DOORS.map((d) => `<path class="iso-shade" data-shade="0" d="${flat(d.x, d.z, d.x + DOOR.w, d.z + DOOR.h, 0.6, 2)}"/>`).join("")}</g>`);
  out.push(`<g data-part="doors"></g>`);
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une machine à reproduire les clés sur un établi : à l'arrière, la clé modèle serrée dans son étau ; à l'avant, l'ébauche ; un pont mobile porte un palpeur et une fraise. À droite, un casier à quatre portes, une par famille de documents. Le pont suit les zones du modèle et taille les mêmes encoches dans l'ébauche ; la clé taillée ouvre ensuite le casier de sa famille.",
  body: [
    bench(P, PLATE, { strip: { x: -110, y: PLATE.y + PLATE.d - 11, w: 100, d: 7, r: 1 }, label: { x: 30, y: PLATE.y + PLATE.d - 14, w: 46, d: 10, r: 1.2 } }),
    baseSvg(), viseSvg(LANES.master, "back"), `<g data-part="master"></g>`, viseSvg(LANES.master, "front"), `<g data-part="stylus"></g>`,
    viseSvg(LANES.blank, "back"), `<g data-part="blank"></g>`, viseSvg(LANES.blank, "front"),
    `<g data-part="bridge">${bridgeSvg()}</g>`, `<g data-part="cutter"></g>`,
    lockerSvg(), `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const KEY = ${JSON.stringify(KEY)}, LANES = ${JSON.stringify(LANES)}, RAIL = ${JSON.stringify(RAIL)}, BRIDGE_Z = ${BRIDGE_Z}, BASE_H = ${BASE_H};
const LOCKER = ${JSON.stringify(LOCKER)}, DOOR = ${JSON.stringify(DOOR)}, DOORS = ${JSON.stringify(DOORS)}, SEL = ${JSON.stringify([-100 + 142 - 16, -40 + 70 - 12])};
${LOOP}
// Vrais chiffres : 5 à 10 jours de développement (7 h) remplacés par 4 h avec le studio,
// soit 31 à 66 h et 3 200 à 6 900 € évités par famille à 104,74 €/h ; traitement 100 % local.
// Le nombre de zones par famille est illustratif.
const FAMILIES = [["CERFA", 7], ["VRE", 5], ["PP", 6], ["FACTURES", 4]];
const hash = (i) => { let h = Math.imul(i + 17, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
// Encoches : une par zone tracée, profondeurs propres à la famille.
const notches = (f) => { const n = FAMILIES[f][1]; return Array.from({ length: n }, (_, i) => ({ x: KEY.x0 + 8 + (i + 0.5) * (KEY.x1 - KEY.x0 - 12) / n, depth: 1.6 + hash(f * 31 + i) * 3.8 })); };
const T = { trace: 9, fly: 1.4, open: 1.2, hold: 2.6 };
let fam = 0, t = 0, touring = true, idle = 0;
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
// Profondeur du bord denté à l'abscisse x (0 = bord intact).
function depthAt(list, x) { let d = 0; for (const n of list) { const w = 2.6 + n.depth * 0.5, u = Math.abs(x - n.x); if (u < w) d = Math.max(d, n.depth * (1 - u / w)); } return d; }
// Clé couchée : anneau de tête et lame dont le bord denté (côté +y) suit le profil donné.
// Clé couchée : anneau de tête et lame dont le bord denté suit le profil. Coordonnées locales
// depuis la pointe, tournées de phi puis posées en (tx, ty, z) : elle peut pivoter vers sa serrure.
function keySvg(y, profile, lit, phi = 0, tx = KEY.x1 + 3, ty = y, z = KEY.z - KEY.t / 2) {
  const c = Math.cos(phi), s = Math.sin(phi), tip = KEY.x1 + 3;
  const put = ([x, yy]) => { const lx = x - tip, ly = yy - y; return [tx + lx * c - ly * s, ty + lx * s + ly * c]; };
  const top = [], N = 60;
  for (let i = 0; i <= N; i++) { const x = KEY.x0 + (KEY.x1 - KEY.x0) * i / N; top.push([x, y - profile(x)]); }
  const blade = [[KEY.x0, y - KEY.w], ...top, [tip, y - KEY.w / 2], [KEY.x1, y - KEY.w]].map(put);
  const head = Array.from({ length: 24 }, (_, i) => { const a = i / 24 * 2 * Math.PI; return put([KEY.x0 - KEY.head + Math.cos(a) * KEY.head, y - KEY.w / 2 + Math.sin(a) * KEY.head]); });
  const [hx, hy] = put([KEY.x0 - KEY.head - 3, y - KEY.w / 2]);
  return solidSvg(extrude(head, z, KEY.t, P, { convex: true }), { tone: "hi", lit, inner: lineSvg(ring(hx, hy, 2.4, z + KEY.t, P, 20), { tone: "lo" }) }) + solidSvg(extrude(blade, z, KEY.t, P), { tone: "hi", lit });
}
// Outils : palpeur (tige) et fraise (disque denté) sous le pont, à l'abscisse x.
const stylusSvg = (x, dm) => solidSvg(cylinder(x, LANES.master + 1.2 - dm, 1.2, KEY.z - 1, BRIDGE_Z - KEY.z + 1, P, 14), { tone: "hi", crease: "none" });
function cutterSvg(x, db, spin) {
  const out = [];
  // Fraise sur l'ébauche, et son moteur sur le pont.
  out.push(solidSvg(cylinder(x, LANES.blank + 5.6 - db, 1.4, KEY.z + 2, BRIDGE_Z - KEY.z - 2, P, 14), { tone: "mid", crease: "none" }));
  const teeth = Array.from({ length: 12 }, (_, i) => { const a = spin + i / 12 * 2 * Math.PI; return lineOnTop([x + Math.cos(a) * 3.2, LANES.blank + 5.6 - db + Math.sin(a) * 3.2], [x + Math.cos(a) * 5.4, LANES.blank + 5.6 - db + Math.sin(a) * 5.4], KEY.z + 2, P); });
  out.push(solidSvg(cylinder(x, LANES.blank + 5.6 - db, 5.4, KEY.z, 2, P, 32), { tone: "mid", inner: lineSvg(teeth.join(""), { tone: "lo" }) }));
  out.push(solidSvg(cylinder(x, LANES.blank + 5.6 - db, 4.6, BRIDGE_Z + 5, 9, P, 28, 0.6), { tone: "mid", inner: lineSvg(lineOnTop([x, LANES.blank + 5.6 - db], [x + Math.cos(spin) * 4, LANES.blank + 5.6 - db + Math.sin(spin) * 4], BRIDGE_Z + 14, P), { tone: "hi" }) }));
  return out.join("");
}
function boxPath(c) {
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], ctr = c.reduce((s, p) => s.map((v, i) => v + p[i] / 8), [0, 0, 0]);
  const V = [depthOf([1, 0, 0], P), depthOf([0, 1, 0], P), depthOf([0, 0, 1], P)];
  const pts = c.map((p) => iso(p, P)), hull = convexHull(pts), d = (f) => "M" + f.map((i) => pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1)).join("L") + "Z";
  const shades = ["", "", "", ""]; let top = "";
  for (const f of faces.slice(1)) {
    const fc = f.reduce((s, i) => s.map((v, j) => v + c[i][j] / 4), [0, 0, 0]), n = fc.map((v, j) => v - ctr[j]);
    if (n[0] * V[0] + n[1] * V[1] + n[2] * V[2] <= 0) continue;
    if (n[2] > 0.5) top += d(f); else shades[Math.abs(n[0]) > Math.abs(n[1]) ? 1 : 2] += d(f);
  }
  const h = "M" + hull.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
  return { fill: h, outline: h, shades, top };
}
// Porte du casier, charnière à gauche, ouverte de angle (radians) vers l'extérieur.
function doorSvg(d, angle, lit) {
  const y0 = LOCKER.y + LOCKER.d, th = 1.4, c = Math.cos(angle), s = Math.sin(angle);
  const p = (u, v) => [d.x + u * c, y0 + u * s + v * c * 0 + v, 0];
  const ring = [[0, 0], [DOOR.w, 0], [DOOR.w, th], [0, th]].map(([u, v]) => [d.x + u * c - v * s, y0 + u * s + v * c]);
  const corners = [...ring.map(([x, y]) => [x, y, d.z]), ...ring.map(([x, y]) => [x, y, d.z + DOOR.h])];
  const kx = d.x + (DOOR.w - 5) * c - th * s, ky = y0 + (DOOR.w - 5) * s + th * c;
  const keyhole = dotsSvg([iso([kx, ky, d.z + DOOR.h / 2], P)], { size: 0.9 });
  return solidSvg(boxPath(corners), { tone: "mid", lit, inner: keyhole });
}
const parts = { master: $("master"), blank: $("blank"), bridge: $("bridge"), stylus: $("stylus"), cutter: $("cutter"), doors: $("doors"), air: $("air"), family: $("family"), selector: $("selector") };
function draw() {
  const list = notches(fam), name = FAMILIES[fam][0], total = T.trace + T.fly + T.open + T.hold;
  const u = Math.min(1, t / T.trace), x = KEY.x0 - 4 + (KEY.x1 - KEY.x0 + 8) * ease(u);
  const dm = depthAt(list, x), cut = (xx) => (xx <= x ? depthAt(list, xx) : 0);
  const spin = t * 18;
  parts.master.innerHTML = keySvg(LANES.master, (xx) => depthAt(list, xx), false);
  const flying = t > T.trace;
  parts.blank.innerHTML = flying ? "" : keySvg(LANES.blank, cut, false);
  parts.bridge.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  parts.stylus.innerHTML = stylusSvg(x, dm); parts.cutter.innerHTML = cutterSvg(x, dm, spin);
  // La clé taillée rejoint la serrure de sa porte, qui s'ouvre.
  const door = DOORS[fam], v = ease((t - T.trace) / T.fly), open = ease((t - T.trace - T.fly) / T.open) * (1 - ease((t - total + 0.6) / 0.6));
  let air = "";
  if (flying && open < 0.4) {
    // Quart de tour en vol : la pointe finit dans la serrure, la tête vers le lecteur.
    const from = [KEY.x1 + 3, LANES.blank, KEY.z - KEY.t / 2], to = [door.x + DOOR.w - 5 + KEY.w / 2, LOCKER.y + LOCKER.d + 1.4, door.z + DOOR.h / 2 - KEY.t / 2];
    const p = from.map((a, i) => a + (to[i] - a) * v); p[2] += 26 * Math.sin(Math.PI * v);
    air = keySvg(LANES.blank, (xx) => depthAt(list, xx), true, -Math.PI / 2 * v, p[0], p[1], p[2]);
  }
  parts.air.innerHTML = air;
  parts.doors.innerHTML = DOORS.map((d, i) => doorSvg(d, i === fam ? open * 1.2 : 0, false)).join("");
  if (parts.family.textContent !== name) parts.family.textContent = name;
  const a = -Math.PI * 0.5 + fam * Math.PI / 3;
  parts.selector.innerHTML = lineSvg(lineOnTop([SEL[0], SEL[1]], [SEL[0] + Math.cos(a) * 4.2, SEL[1] + Math.sin(a) * 4.2], BASE_H + 5, P), { tone: "hi" }) + dotsSvg([iso([SEL[0], SEL[1], BASE_H + 5], P)], { size: 0.6 });
  const traced = list.filter((n) => n.x <= x).length;
  say(!flying ? name + " · zone " + Math.max(traced, 0) + " / " + list.length + " tracée" + (traced > 1 ? "s" : "")
    : t < T.trace + T.fly + 0.4 ? name + " · extracteur prêt en 4 h au lieu de 5 à 10 jours" : name + " · 3 200 à 6 900 € évités · 100 % local");
}
const cycle = () => T.trace + T.fly + T.open + T.hold;
const run = loop((dt, calm) => {
  if (calm) t = T.trace + T.fly + T.open + 0.1;
  else { t += dt; if (t >= cycle()) { t = 0; if (touring) fam = (fam + 1) % FAMILIES.length; } }
  draw();
});
const choose = (f) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 6000); fam = (f + FAMILIES.length) % FAMILIES.length; t = 0; run(); };
dragX(() => fam, (v, share) => { const f = (Math.round(v + share * 4) % 4 + 4) % 4; if (f !== fam) choose(f); });
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: fam + 1, ArrowLeft: fam - 1, Enter: fam, " ": fam }[e.key];
  if (to !== undefined) { e.preventDefault(); choose(to); }
});
// Accès de vérification (captures).
window.__fig = { at: (f, tt) => { touring = false; fam = f; t = tt; draw(); return readout.textContent; }, T };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 10",
  title: "Studio d'extracteurs",
  hint: "Glisse ou ← → : famille",
  readout: "CERFA · zone 0 / 7 tracée",
  keys: [
    { mark: "lit", label: "La clé taillée : l'extracteur de la famille" },
    { mark: "raised", label: "Clé modèle à l'arrière (le PDF exemple), ébauche à l'avant, casier des familles à droite" },
  ],
  caption: "Les zones à lire sont tracées sur un exemple du document, sans écrire de code ; l'extracteur est essayé sur des documents réels puis livré en page HTML ou en exécutable, et traite les PDF sur l'appareil, sans qu'aucun ne le quitte. Un extracteur prenait 5 à 10 jours de développement ; avec le studio, 4 h : 31 à 66 h et 3 200 à 6 900 € évités par famille, à 104,74 €/h. Nombre de zones par famille illustratif.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Studio d'extracteurs : flèches gauche et droite pour changer de famille" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1">${svg}</div>`,
});

writeFigure("studio", { title: "Studio d'extracteurs · reproduction de clés", plate, live });
