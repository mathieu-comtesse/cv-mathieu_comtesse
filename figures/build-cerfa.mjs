// Fig 01 · CERFA v3 : un trieur à billes à trois trappes.
// node figures/build-cerfa.mjs  →  figures/cerfa.html (thème clair)
// Le lot de fiches est un chargeur de billes. Chaque bille roule sur la rampe inclinée sous la lampe de lecture ;
// la trappe de son verdict s'ouvre, la bille tombe dans sa goulotte et s'empile dans son bac :
// conforme, doublon, non-conformité, ou, au bout de la rampe, retard. Un compteur par bac.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 560, HEIGHT = 520;
// ---------------------------------------------------------------- monde (1 unité ≈ 5 mm)
const PLATE = { x: -84, y: -40, w: 168, d: 80, r: 8 };
const CAB = { x: -66, y: -12, w: 132, d: 28, r: 3 }, CAB_H = 26;       // caisson des compteurs
const TRAY_Z = CAB_H, R = 3.6, STEP = 7.2, CAP = 4;                       // bille : 18 mm, pile visible de 4
const HX = [-50, -20, 10, 40];                                           // goulottes : retard, NC, doublon, conforme
const XR = 56, SL = 0.3, ZR = 108;                                      // départ de rampe et pente
const zs = (x) => ZR - SL * (XR - x);                                    // surface de la rampe
const CH = 5.6;                                                          // demi-largeur intérieure d'une goulotte
const Y0 = -5.6, Y1 = 3.2, YB = -1.2;                                    // canal : fond, lèvre avant, axe des billes
const TOP = ZR + 34, BTOP = ZR + 46;                                     // haut du chargeur, haut du bâti
const READ = { x0: 44, x1: 54 };
const LOT = { min: 50, max: 500, rest: 300 };
const KNOB = { y: 1, z: 13, r: 5 };

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners({ x: -66, y: -12, w: 132, d: 30 }, 0, TOP + 4)], WIDTH, HEIGHT, { pad: 24, azimuth: 76 });
const { at, S, L, D, slab, front, right, flat, byDepth } = tools(P);
const FRM = (y0, y1) => G.frameOf([0, y1, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1]);   // prisme dans le plan xz, étendu vers −y
const prism = (poly, y0 = Y0, y1 = Y1) => G.prismOf(FRM(y0, y1), poly, 0, y1 - y0, P);
const board = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const rampPoly = (x0, x1, t = 3) => [[x0, zs(x0)], [x1, zs(x1)], [x1, zs(x1) - t], [x0, zs(x0) - t]];
const lipPoly = (x0, x1) => [[x0, zs(x0)], [x1, zs(x1)], [x1, zs(x1) + 2.4], [x0, zs(x0) + 2.4]];
const GATE = 5.4;                                                        // demi-ouverture de trappe
// Segments de rampe entre goulottes (de gauche à droite).
const SEG = [[-44, HX[1] - GATE - 0.4], [HX[1] + GATE + 0.4, HX[2] - GATE - 0.4], [HX[2] + GATE + 0.4, HX[3] - GATE - 0.4], [HX[3] + GATE + 0.4, XR]];

// ---------------------------------------------------------------- socle et caisson
function baseSvg() {
  return bench(P, PLATE, {
    strip: { x: -80, y: PLATE.y + PLATE.d - 15, w: 120, d: 7, r: 1 },
    label: { x: 44, y: PLATE.y + PLATE.d - 19, w: 34, d: 11, r: 1.2 },
  });
}
function cabinet() {
  const out = [], f = front(CAB.y + CAB.d);
  out.push(S(slab(k.insetPlan(CAB, 3), 0, 4, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(CAB, 4, CAB_H - 4, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(CAB, 12, P, 3), { tone: "faint" }) }));
  // Quatre fenêtres de compteur sous les bacs, vissées.
  HX.forEach((cx, i) => {
    const win = flat(cx - 10, 11, cx + 10, 19, 1.4);
    out.push(`<g transform="${f}"><path class="iso-fill fig-window" d="${win}"/><path class="iso-line" data-tone="lo" d="${win}"/><text class="fig-digits" data-part="count-${i}" x="${cx}" y="-12.9" text-anchor="middle" font-size="5.4">0000</text></g>`);
    out.push(D([at([cx - 12.6, CAB.y + CAB.d, 15]), at([cx + 12.6, CAB.y + CAB.d, 15])], { size: 0.4 }));
  });
  // Étiquettes de bac : retard, NC, doublon, conforme (quatre barres de repère, sans inscription).
  HX.forEach((cx, i) => out.push(`<g transform="${f}"><path class="iso-line" data-tone="${["hi", "mid", "mid", "lo"][i]}" d="${flat(cx - 6, 4.4, cx + 6, 6.2, 0.6, 3)}"/></g>`));
  out.push(D(k.corners(CAB, 4).map(([x, y]) => at([x, y, CAB_H])), { size: 0.42 }));
  return out.join("");
}
// Flanc droit : bouton de lot gradué, afficheur, fentes d'aération.
function sidePanel() {
  const out = [], x = CAB.x + CAB.w, F = G.frameAlong([x, KNOB.y, KNOB.z], [1, 0, 0]);
  const win = flat(-KNOB.y - 9, 19.6, -KNOB.y + 9, 24.4, 1);
  out.push(`<g transform="${right(x)}"><path class="iso-fill fig-window" d="${win}"/><path class="iso-line" data-tone="lo" d="${win}"/><text class="fig-digits" data-part="lot" x="${-KNOB.y}" y="-20.6" text-anchor="middle" font-size="3.8">300</text></g>`);
  const minor = [], major = [];
  for (let lot = LOT.min; lot <= LOT.max; lot += 50) {
    const a = angleOf(lot), r0 = KNOB.r + 1.4, r1 = lot % 100 ? KNOB.r + 2.6 : KNOB.r + 3.4;
    const p = (r) => [x, KNOB.y + Math.sin(a) * r, KNOB.z + Math.cos(a) * r];
    (lot % 100 ? minor : major).push(k.segment(p(r0), p(r1), P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(S(G.disc(0, 1.4, KNOB.r + 0.8, F, P), { tone: "lo" }));
  out.push(S(G.disc(1.4, 5, KNOB.r, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 1.4, 5, KNOB.r, 28, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(5, 6, KNOB.r - 1.2, F, P), { tone: "hi" }));
  out.push(`<path data-part="knob-pointer" class="iso-line" data-tone="hi" data-free="end" d="${pointerAt(LOT.rest)}" style="stroke-width:1"/>`);
  const slots = [];
  for (let i = 0; i < 5; i++) slots.push(flat(-(CAB.y + 5 + i * 4.6) - 1, 3, -(CAB.y + 5 + i * 4.6) + 1, 9, 1, 4));
  out.push(`<g transform="${right(x)}"><path class="iso-line" data-tone="lo" d="${slots.join("")}"/></g>`);
  return out.join("");
}
function angleOf(lot) { return (-0.75 + 1.5 * (lot - LOT.min) / (LOT.max - LOT.min)) * Math.PI; }
function pointerAt(lot) {
  const a = angleOf(lot), x = CAB.x + CAB.w + 6.2;
  return k.segment([x, KNOB.y, KNOB.z], [x, KNOB.y + Math.sin(a) * 3.8, KNOB.z + Math.cos(a) * 3.8], P);
}

// ---------------------------------------------------------------- bacs, panneau, rampe : de gauche à droite
const DIV_X = [-66, -35, -5, 25, 55];                                   // cloisons des bacs
function divider(x) {
  return S(slab({ x: x - 0.8, y: -9.5, w: 1.6, d: 24.5, r: 0.4 }, TRAY_Z, 30, 2, 0.3), { tone: "mid" });
}
function wall(x) { return S(slab({ x: x - 0.6, y: Y0 - 0.2, w: 1.2, d: Y1 - Y0 + 0.2, r: 0.2 }, TRAY_Z + 31, zs(x) - 3 - TRAY_Z - 31, 2, 0.3), { tone: "mid" }); }
function backPanel() {
  const out = [], pan = { x: -64, y: -10, w: 128, d: 4.4, r: 0.8 };
  out.push(S(slab(pan, TRAY_Z, BTOP - 6 - TRAY_Z, 3, 0.6), { tone: "lo", inner: L(k.sideSeam(pan, 70, P, 3), { tone: "faint" }) }));
  // Plaque perforée : une grille de picots sur la face avant du panneau.
  const dots = [];
  for (let x = -56; x <= 56; x += 14) for (let z = 66; z <= BTOP - 8; z += 14) if (z + 6 < zs(x) - 6 || z > zs(x) + 6) dots.push(at([x, -5.6, z]));
  out.push(D(dots, { size: 0.42 }));
  return out.join("");
}
function gatesSvg() {
  // Trois tiroirs-trappes, un par verdict : fermés ils portent la bille, ouverts ils sortent vers l'avant.
  return [1, 2, 3].map((kk) => `<g data-part="gate-${kk}">${S(prism(rampPoly(HX[kk] - GATE - 0.2, HX[kk] + GATE + 0.2, 2), Y0 + 0.4, Y1 - 0.4), { tone: "hi" })}</g>`).join("");
}
function structure() {
  // Peint de gauche à droite : plus x est grand, plus l'objet est proche.
  const out = [];
  out.push(backPanel());
  for (let kk = 0; kk < 4; kk++) {
    out.push(divider(DIV_X[kk]));
    out.push(`<g data-part="pile-${kk}"></g>`);
    // Goulotte : paroi gauche, chute, paroi droite.
    if (kk === 0) {
      out.push(wall(HX[0] - CH), `<g data-part="fall-0"></g>`, wall(HX[0] + CH));
    } else {
      out.push(S(prism(rampPoly(SEG[kk - 1][0], SEG[kk - 1][1])), { tone: "mid" }));
      out.push(wall(HX[kk] - CH), `<g data-part="fall-${kk}"></g>`, wall(HX[kk] + CH));
    }
  }
  out.push(S(prism(rampPoly(SEG[3][0], SEG[3][1])), { tone: "mid" }));
  return out;
}
function hopper() {
  const out = [], x0 = XR - 5.4, x1 = XR + 5.4;
  out.push(S(slab({ x: x0 - 1.8, y: Y0 - 0.4, w: 1.8, d: Y1 - Y0 + 0.4, r: 0.3 }, zs(XR - 6) + 0.5, TOP - zs(XR - 6), 2, 0.3), { tone: "mid" }));
  out.push(`<g data-part="mag"></g>`);
  out.push(S(slab({ x: x1, y: Y0 - 0.4, w: 1.8, d: Y1 - Y0 + 0.4, r: 0.3 }, zs(XR) - 2, TOP - zs(XR) + 2, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function frontSvg() {
  const out = [];
  // Lèvres avant des rampes et des bacs, bridge de lecture avec sa lampe.
  SEG.forEach(([a, b]) => out.push(S(prism(lipPoly(a, b), Y1, Y1 + 2.6), { tone: "mid" })));
  for (let kk = 0; kk < 4; kk++) {
    const lip = { x: DIV_X[kk] + 1, y: 13.4, w: DIV_X[kk + 1] - DIV_X[kk] - 2, d: 2.6, r: 0.6 };
    out.push(S(slab(lip, TRAY_Z, 7, 2, 0.4), { tone: "mid" }));
    out.push(D([at([lip.x + 5, 14.7, TRAY_Z + 7]), at([lip.x + lip.w - 5, 14.7, TRAY_Z + 7])], { size: 0.4 }));
  }
  out.push(S(slab({ x: DIV_X[4] - 0.8, y: -9.5, w: 1.6, d: 24.5, r: 0.4 }, TRAY_Z, 30, 2, 0.3), { tone: "mid" }));
  // Pont de lecture au-dessus de la rampe.
  const bx = (READ.x0 + READ.x1) / 2, bz = zs(bx);
  out.push(S(slab({ x: READ.x0 - 1.5, y: 4.2, w: 2.2, d: 2.2, r: 0.4 }, bz, 14, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: READ.x1 - 0.7, y: 4.2, w: 2.2, d: 2.2, r: 0.4 }, bz, 14, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: READ.x0 - 2.5, y: -7, w: READ.x1 - READ.x0 + 5, d: 12, r: 1.4 }, bz + 14, 5, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: READ.x0 - 2.5, y: -7, w: READ.x1 - READ.x0 + 5, d: 12, r: 1.4 }, bz + 16, P, 3), { tone: "faint" }) }));
  out.push(S(k.cylinder(bx, -1, 2.4, bz + 19, 2, P, 20), { tone: "mid" }));
  { const [lx, ly] = at([bx, -1, bz + 21.4]); out.push(`<circle class="fig-lamp" data-part="lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.2"/>`); }
  // Poteaux avant du bâti et chapeau du panneau.
  for (const px of [-66.8, 63.2]) {
    out.push(S(slab({ x: px, y: -10, w: 3.6, d: 22, r: 0.8 }, TRAY_Z, BTOP - 6 - TRAY_Z, 3, 0.5), { tone: "mid" }));
    out.push(D([at([px + 1.8, 12, TRAY_Z + 8]), at([px + 1.8, 12, BTOP - 14])], { size: 0.4 }));
  }
  out.push(S(slab({ x: -66.8, y: -10, w: 133.6, d: 6.5, r: 1.2 }, BTOP - 4, 3.5, 3, 0.7), { tone: "mid", inner: L(k.sideSeam({ x: -66.8, y: -10, w: 133.6, d: 6.5, r: 1.2 }, BTOP - 2.5, P, 3), { tone: "faint" }) }));
  return out.join("");
}

// ---------------------------------------------------------------- billes (dessinées à l'origine)
const BALL = k.solidSvg(G.sphereOf([0, 0, 0], R, P), { tone: "hi", lit: true });
const BALL_HI = k.solidSvg(G.sphereOf([0, 0, 0], R, P), { tone: "hi" });

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un trieur à billes. Le chargeur en haut à droite tient le lot de fiches CERFA, une bille par fiche. Chaque bille roule sur une rampe inclinée sous une lampe de lecture ; la trappe de son verdict s'ouvre et elle tombe dans sa goulotte : conforme, doublon, non-conformité. Les retards roulent jusqu'au bout. Quatre bacs et quatre compteurs.",
  body: [baseSvg(), cabinet(), sidePanel(), ...structure(), gatesSvg(), `<g data-part="roll"></g>`, hopper(), frontSvg()],
});

// ---------------------------------------------------------------- modèle et animation
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
const BALL = ${JSON.stringify(BALL)}, BALL_HI = ${JSON.stringify(BALL_HI)};
const R = ${R}, STEP = ${STEP}, CAP = ${CAP}, TRAY_Z = ${TRAY_Z}, HX = ${JSON.stringify(HX)}, XR = ${XR}, SL = ${SL}, ZR = ${ZR}, YB = ${YB};
const LOT = ${JSON.stringify(LOT)}, READ = ${JSON.stringify(READ)}, KNOB = ${JSON.stringify(KNOB)}, RIGHT_X = ${CAB.x + CAB.w}, GATE = ${GATE};
const zs = (x) => ZR - SL * (XR - x), K = Math.sqrt(1 + SL * SL);
// Vrais chiffres : un lot de 300 fiches en 1 min 20 s ; 20 à 25 h à la main, soit 4 à 5 min par fiche.
const MACHINE_S = 80 / 300, HAND_MIN = [4, 5];
// Répartition illustrative entre les bacs : conforme, doublon, non-conformité, retard (kind 3, 2, 1, 0).
const WEIGHTS = [0.72, 0.06, 0.1, 0.12];
const kindOf = (i) => { let h = Math.imul(i + 1, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; const u = (h >>> 0) / 4294967296; let s = 0; for (let q = 0; q < 4; q++) { s += WEIGHTS[q]; if (u < s) return [3, 2, 1, 0][q]; } return 3; };
const INTERVAL = 0.42, V = 150, G_ = 900;
const roll = $("roll"), mag = $("mag"), lamp = $("lamp"), pointer = $("knob-pointer"), lotText = $("lot");
const gates = [null, $("gate-1"), $("gate-2"), $("gate-3")], piles = [0, 1, 2, 3].map((i) => $("pile-" + i)), falls = [0, 1, 2, 3].map((i) => $("fall-" + i)), counts = [0, 1, 2, 3].map((i) => $("count-" + i));
const pool = Array.from({ length: 8 }, () => { const u = document.createElementNS("http://www.w3.org/2000/svg", "g"); u.innerHTML = BALL; u.style.display = "none"; roll.append(u); return u; });
const clock = (s) => s < 60 ? s.toFixed(0) + " s" : Math.floor(s / 60) + " min " + String(Math.round(s % 60)).padStart(2, "0") + " s";
const span = (a, b) => b < 60 ? Math.round(a) + "–" + Math.round(b) + " min" : (b >= 600 ? Math.round(a / 60) + "–" + Math.round(b / 60) : (a / 60).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + "–" + (b / 60).toLocaleString("fr-FR", { maximumFractionDigits: 1 })) + " h";
let lot = LOT.rest, shown = lot, kinds = [], t = 0, holdUntil = 0, touring = true, idle = 0;
const drawn = { mag: null, piles: null };
const reset = () => { kinds = Array.from({ length: lot }, (_, i) => kindOf(i)); t = still.matches ? 1e6 : -0.6; holdUntil = 0; drawn.mag = drawn.piles = null; };
// Une bille : roule jusqu'à sa goulotte (ou au bout de la rampe), tombe, se pose sur la pile.
const tRoll = (kk) => (XR - HX[kk]) / V;
const landZ = (kk, n) => TRAY_Z + R + Math.min(n, CAP - 1) * STEP;
const fallTime = (kk, n) => Math.sqrt(2 * Math.max(1, zs(HX[kk]) + R * K - landZ(kk, n)) / G_);
function state() {
  const landed = [0, 0, 0, 0], flying = [];
  let sent = 0;
  for (let i = 0; i < lot; i++) {
    const age = t - i * INTERVAL;
    if (age < 0) break;
    sent++;
    const kk = kinds[i];
    // Compte provisoire : les billes arrivées avant elle dans ce bac.
    const n = landed[kk];
    if (age >= tRoll(kk) + fallTime(kk, n)) landed[kk]++; else flying.push([i, age, n]);
  }
  return { sent, landed, flying, done: landed.reduce((a, b) => a + b, 0) };
}
function ball(kk, age, n) {
  const tr = tRoll(kk);
  if (age < tr) { const x = XR - age * V; return { x, z: zs(x) + R * K, group: roll }; }
  const tau = age - tr, z0 = zs(HX[kk]) + R * K, z = Math.max(landZ(kk, n), z0 - 0.5 * G_ * tau * tau);
  return { x: HX[kk], z, group: falls[kk] };
}
function drawPile(kk, n) {
  let s = "";
  for (let q = 0; q < Math.min(n, CAP); q++) s += '<g transform="' + translateAlong(P, [HX[kk], YB, TRAY_Z + R + q * STEP]) + '">' + BALL_HI + "</g>";
  return s;
}
function draw() {
  const s = state(), left = lot - s.sent;
  // Chargeur : une colonne de billes qui descend avec le lot.
  const col = Math.min(8, Math.ceil(left / lot * 8));
  if (drawn.mag !== col) { let g = ""; for (let q = 0; q < col; q++) g += '<g transform="' + translateAlong(P, [XR, YB, zs(XR) + R * K + 0.4 + q * STEP]) + '">' + BALL_HI + "</g>"; mag.innerHTML = g; drawn.mag = col; }
  const key = s.landed.join(",");
  if (drawn.piles !== key) {
    s.landed.forEach((n, kk) => { piles[kk].innerHTML = drawPile(kk, n); counts[kk].textContent = String(n).padStart(4, "0"); });
    drawn.piles = key;
  }
  // Placer les billes en vol dans leur couche (rampe ou goulotte).
  let reading = false;
  pool.forEach((u, q) => {
    const f = s.flying[q];
    if (!f) { u.style.display = "none"; return; }
    const b = ball(kinds[f[0]], f[1], f[2]);
    if (u.parentNode !== b.group) b.group.append(u);
    u.setAttribute("transform", translateAlong(P, [b.x, YB, b.z]));
    u.style.display = "";
    if (b.x < READ.x1 + R && b.x > READ.x0 - R && b.group === roll) reading = true;
  });
  attr(lamp, "data-on", reading);
  // Trappes : celle du verdict sort vers l'avant juste avant la bille, puis se referme.
  for (let kk = 1; kk <= 3; kk++) {
    let open = 0;
    s.flying.forEach(([i, age]) => { if (kinds[i] !== kk) return; const a = age - tRoll(kk); open = Math.max(open, Math.min(1, Math.max(0, (a + 0.32) / 0.16)) * (a < 0.3 ? 1 : Math.max(0, 1 - (a - 0.3) / 0.2))); });
    put(gates[kk], translateAlong(P, [0, 10.5 * open, 0]));
  }
  attr(pointer, "d", pointerAt(shown));
  lotText.textContent = String(Math.round(shown / 10) * 10);
  const done = s.done, machine = clock(done * MACHINE_S), hand = span(done * HAND_MIN[0], done * HAND_MIN[1]);
  say(done < lot ? fr(done) + " / " + fr(lot) + " fiches · " + machine + " · à la main " + hand : fr(lot) + " fiches en " + machine + " · à la main " + hand);
  return s;
}
function pointerAt(l) {
  const a = (-0.75 + 1.5 * (l - LOT.min) / (LOT.max - LOT.min)) * Math.PI, x = RIGHT_X + 6.2;
  return segment([x, KNOB.y, KNOB.z], [x, KNOB.y + Math.sin(a) * 3.8, KNOB.z + Math.cos(a) * 3.8], P);
}
const run = loop((dt) => {
  shown += (lot - shown) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(lot - shown) < 0.5) shown = lot;
  if (!still.matches) t += dt;
  const s = draw();
  if (s.done === lot && !still.matches) { if (!holdUntil) holdUntil = t + 3; else if (t > holdUntil && touring) reset(); }
});
const setLot = (next) => {
  next = Math.max(LOT.min, Math.min(LOT.max, Math.round(next / 10) * 10));
  touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 3600);
  if (next !== lot) { lot = next; reset(); }
  stage.setAttribute("aria-valuenow", String(lot));
  stage.setAttribute("aria-valuetext", "Lot de " + lot + " fiches : " + clock(lot * MACHINE_S) + " à la machine, " + span(lot * HAND_MIN[0], lot * HAND_MIN[1]) + " à la main");
  run();
};
dragX(() => lot, (v, share) => setLot(v + share * 900));
stage.addEventListener("keydown", (e) => {
  const step = e.shiftKey ? 100 : 50;
  const to = { ArrowRight: lot + step, ArrowUp: lot + step, ArrowLeft: lot - step, ArrowDown: lot - step, Home: LOT.min, End: LOT.max }[e.key];
  if (to !== undefined) { e.preventDefault(); setLot(to); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reset(); run(); }
});
still.addEventListener("change", () => { reset(); run(); });
window.__fig = { at: (sec) => { touring = false; t = sec; draw(); return readout.textContent; } };
reset(); draw();
`;

const plate = k.plateHtml({
  fig: "Fig 01",
  title: "CERFA v3",
  hint: "Glisse ← → : taille du lot",
  readout: "0 / 300 fiches · 0 s · à la main 0–0 min",
  keys: [
    { mark: "lit", label: "La fiche lue, de la rampe à son bac" },
    { mark: "raised", label: "Bacs : retard, non-conformité, doublon, conforme" },
  ],
  caption: "Le trieur traite un lot de 300 fiches CERFA et attestations en 1 min 20 s, contre 20 à 25 h à la main. L’extracteur permet d’appliquer des pénalités sur les retards, fait remonter les non-conformités et a permis un audit national sur les CERFA fluides frigorigènes. La répartition entre les bacs est illustrative.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Trieur de fiches CERFA : flèches gauche et droite pour changer la taille du lot, Entrée pour relancer" aria-valuemin="${LOT.min}" aria-valuemax="${LOT.max}" aria-valuenow="${LOT.rest}">${svg}</div>`,
});

writeFigure("cerfa", { title: "CERFA v3 · trieur à billes", plate, live, width: 680 });
