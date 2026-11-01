// Fig 04 · Reporteur Q18 : un registre à rouleau motorisé.
// node figures/build-moteur.mjs  →  figures/moteur.html
// Le registre Excel est une longue bande de papier qui passe d'une bobine à l'autre devant une fenêtre de lecture. Le rapport SharePoint donne
// son OT ; on le compose au cadran, le moteur déroule la bande jusqu'à la ligne voulue, le tampon y reporte les données et, si le rapport en
// contient, un cavalier Q18 se clipse sur le bord de la bande : les Q18 restent visibles.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";

const WIDTH = 640, HEIGHT = 440;
const PLATE = { x: -128, y: -46, w: 256, d: 100, r: 8 };
const BASE = { x: -54, y: -14, w: 108, d: 30, r: 3 }, BASE_H = 16;
const POSTS = [-47, 41], POST_Z = 128, SW = 32;                    // montants et demi-largeur de la bande
const TOP_Z = 108, BOT_Z = 34, READ_Z = (TOP_Z + BOT_Z) / 2;       // axes des bobines, ligne de lecture
const ROWS_N = 36, NV = 10, ROW_H = (TOP_Z - BOT_Z) / NV;
const CONS = { x: -112, y: 8, w: 52, d: 36, r: 3 }, CONS_H = 18, DIAL = { x: -96, y: 26, r: 11 };
const MOTOR = { x0: 46, x1: 70, r: 9 };
const STAMP = { x: 12, rest: 46, hit: 20 };

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners({ x: -52, y: -14, w: 104, d: 30 }, 0, POST_Z + 6), [STAMP.x, 56, 90]], WIDTH, HEIGHT, { pad: 22, azimuth: 58 });
const { at, S, L, D, slab, front, right, flat } = tools(P);
const FX = (x, y, z) => G.frameAlong([x, y, z], [1, 0, 0]);

// ---------------------------------------------------------------- socle, montants, bobines
function baseSvg() {
  const out = [], f = front(BASE.y + BASE.d), r = right(BASE.x + BASE.w);
  out.push(`<path class="iso-halo" d="${k.haloOf(BASE, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(BASE, 3), 0, 3, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(BASE, 3, BASE_H - 3, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BASE, 8, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(BASE, 4).map(([x, y]) => at([x, y, BASE_H])), { size: 0.42 }));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(BASE.x + 6, 4, BASE.x + 40, 12, 1.2, 3)}${flat(BASE.x + 50, 4, BASE.x + BASE.w - 6, 12, 1.2, 3)}"/></g>`);
  out.push(D([BASE.x + 8, BASE.x + 38, BASE.x + 52, BASE.x + BASE.w - 8].map((x) => at([x, BASE.y + BASE.d, 8])), { size: 0.34 }));
  const vents = []; for (let i = 0; i < 5; i++) vents.push(flat(-(BASE.y + 5 + i * 5) - 1, 3.6, -(BASE.y + 5 + i * 5) + 1, 12, 1, 3));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  return out.join("");
}
function postsSvg(side) {
  const out = [];
  for (const x of POSTS) {
    const pl = { x, y: -9, w: 6, d: 18, r: 1 };
    if (side === "back") {
      out.push(S(slab({ x: x - 2, y: -11, w: 10, d: 22, r: 1.4 }, BASE_H, 2.4, 3, 0.4), { tone: "lo" }));
      out.push(S(slab(pl, BASE_H + 2.4, POST_Z - BASE_H - 2.4, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(pl, 60, P, 3), { tone: "faint" }) }));
      out.push(D([at([x + 3, 9, BASE_H + 6]), at([x + 3, 9, POST_Z - 6])], { size: 0.38 }));
      out.push(S(slab({ x: x - 1, y: -10, w: 8, d: 20, r: 1 }, POST_Z, 3, 3, 0.4), { tone: "mid" }));
    }
  }
  return out.join("");
}
function spoolSvg(part, z, big) {
  // Bobine d'axe x : flasques aux deux bouts, âme, bande enroulée (dynamique).
  const out = [], x0 = -40, x1 = 40;
  out.push(S(G.disc(x0 - 6, x0, 11, FX(0, 0, z), P), { tone: "lo" }).replace('class="iso-solid"', 'class="iso-solid"'));
  out.push(S(G.disc(x0, x1, 2.4, FX(0, 0, z), P), { tone: "mid" }));
  out.push(`<g data-part="${part}"></g>`);
  out.push(S(G.disc(x1, x1 + 6, 11, FX(0, 0, z), P), { tone: "lo" }));
  void big;
  return out.join("");
}

// ---------------------------------------------------------------- fenêtre de lecture, tampon, console, moteur
function windowSvg() {
  const out = [], y = 17, z0 = READ_Z - 9, z1 = READ_Z + 9;
  for (const sx of [-SW - 3, SW + 1]) {
    out.push(S(slab({ x: sx, y, w: 2, d: 3, r: 0.4 }, z0 - 4, z1 - z0 + 8, 2, 0.2), { tone: "mid" }));
    out.push(S(slab({ x: sx > 0 ? sx + 2 : sx - 4, y: -7, w: 4, d: y - -7, r: 0.5 }, z0 - 2, 3.4, 2, 0.2), { tone: "mid" }));
  }
  out.push(S(slab({ x: -SW - 3, y, w: 2 * SW + 6, d: 3, r: 0.4 }, z1, 3.4, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: -SW - 3, y, w: 2 * SW + 6, d: 3, r: 0.4 }, z0 - 3.4, 3.4, 2, 0.2), { tone: "mid" }));
  out.push(D([at([-SW - 2, y + 3, z1 + 1.7]), at([SW + 2, y + 3, z1 + 1.7]), at([-SW - 2, y + 3, z0 - 1.7]), at([SW + 2, y + 3, z0 - 1.7])], { size: 0.36 }));
  const [lx, ly] = at([0, y + 3, z1 + 3.4 + 1.4]);
  out.push(S(k.cylinder(0, y + 1.5, 2.2, z1 + 3.4, 1.4, P, 18), { tone: "mid" }));
  out.push(`<circle class="fig-lamp" data-part="lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1"/>`);
  return out.join("");
}
function stampSvg() {
  const out = [], h = { x: STAMP.x - 9, w: 18 }, F = G.frameAlong([STAMP.x, STAMP.rest, READ_Z], [0, -1, 0]);
  // Colonne, corps du vérin et ressort de rappel (fixes), puis tête (mobile).
  out.push(S(slab({ x: STAMP.x - 6, y: 44, w: 12, d: 12, r: 1.2 }, 0, 6, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: STAMP.x - 3, y: 47, w: 6, d: 6, r: 0.8 }, 6, READ_Z + 10 - 6, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: STAMP.x - 8, y: 43, w: 16, d: 14, r: 1.4 }, READ_Z + 4, 14, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: STAMP.x - 8, y: 43, w: 16, d: 14, r: 1.4 }, READ_Z + 10, P, 3), { tone: "faint" }) }));
  out.push(D([at([STAMP.x - 6, 57, READ_Z + 14]), at([STAMP.x + 6, 57, READ_Z + 14])], { size: 0.36 }));
  out.push(`<g data-part="stamp">`);
  out.push(S(G.disc(0, STAMP.rest - 43 + 2, 2.2, G.frameAlong([STAMP.x, 43, READ_Z + 11], [0, -1, 0]), P), { tone: "hi" }));
  out.push(S(slab({ x: h.x, y: STAMP.rest - 12, w: h.w, d: 4, r: 0.6 }, READ_Z - 6.4, 12.8, 2, 0.3), { tone: "hi", lit: true }));
  out.push(`</g>`);
  void F;
  return out.join("");
}
function consoleSvg() {
  const out = [], c = CONS, f = front(c.y + c.d), r = right(c.x + c.w);
  out.push(`<path class="iso-halo" d="${k.haloOf(c, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(c, 0, CONS_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(c, 5, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(c, 3.4).map(([x, y]) => at([x, y, CONS_H])), { size: 0.42 }));
  out.push(display(f, flat(c.x + 6, 6, c.x + 46, 13, 1.2), { part: "ot", x: c.x + 26, y: -9.2, size: 5.4, text: "_______" }));
  out.push(D([c.x + 4, c.x + 48].map((x) => at([x, c.y + c.d, 9.5])), { size: 0.34 }));
  const vents = []; for (let i = 0; i < 5; i++) vents.push(flat(-(c.y + 6 + i * 6) - 1, 4, -(c.y + 6 + i * 6) + 1, 14, 1, 3));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  // Plaque du cadran : repères de 1 à 0 sur la couronne.
  out.push(S(k.cylinder(DIAL.x, DIAL.y, DIAL.r + 2.4, CONS_H, 1, P, 40), { tone: "lo" }));
  const marks = []; for (let i = 0; i < 10; i++) { const a = (60 + 30 + i * 28) * Math.PI / 180; marks.push(k.segment([DIAL.x + Math.cos(a) * (DIAL.r + 0.4), DIAL.y + Math.sin(a) * (DIAL.r + 0.4), CONS_H + 1], [DIAL.x + Math.cos(a) * (DIAL.r + 2.2), DIAL.y + Math.sin(a) * (DIAL.r + 2.2), CONS_H + 1], P)); }
  out.push(L(marks.join(""), { tone: "mid" }));
  out.push(`<g data-part="dial"></g>`);
  out.push(S(k.cylinder(DIAL.x, DIAL.y, 2.6, CONS_H + 1.8, 1, P, 20), { tone: "hi" }));
  return out.join("");
}
function motorSvg() {
  const out = [], F = FX(0, 0, BOT_Z);
  out.push(S(slab({ x: MOTOR.x0 - 2, y: -8, w: 6, d: 16, r: 1 }, BASE_H, BOT_Z - 11 - BASE_H + 4, 3, 0.4), { tone: "mid" }));
  out.push(S(G.disc(MOTOR.x0, MOTOR.x1 - 6, MOTOR.r, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, MOTOR.x0, MOTOR.x1 - 6, MOTOR.r, 20, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(MOTOR.x1 - 6, MOTOR.x1, MOTOR.r - 1.6, F, P), { tone: "mid" }));
  out.push(`<g data-part="shaft-mark"></g>`);
  out.push(S(G.disc(MOTOR.x1, MOTOR.x1 + 1.2, 2.4, F, P), { tone: "hi" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un registre à rouleau motorisé. Une longue bande de papier, le registre Excel, passe d'une bobine à l'autre devant une fenêtre de lecture. Un cadran compose l'OT à sept chiffres, le moteur déroule la bande jusqu'à la bonne ligne, un tampon y reporte les données, et un cavalier Q18 se clipse sur le bord de la bande quand le rapport en contient.",
  body: [
    bench(P, PLATE, { strip: { x: -118, y: PLATE.y + PLATE.d - 13, w: 120, d: 7, r: 1 }, label: { x: 60, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    baseSvg(), consoleSvg(), postsSvg("back"), motorSvg(), spoolSvg("spool-top", TOP_Z), spoolSvg("spool-bot", BOT_Z),
    `<g data-part="strip"></g>`, `<g data-part="clips"></g>`, windowSvg(), `<g data-part="report"></g>`, stampSvg(),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
${PAPER}
const SW = ${SW}, TOP_Z = ${TOP_Z}, BOT_Z = ${BOT_Z}, READ_Z = ${READ_Z}, ROWS_N = ${ROWS_N}, NV = ${NV}, DIAL = ${JSON.stringify(DIAL)}, CONS_H = ${CONS_H}, MOTOR = ${JSON.stringify(MOTOR)}, STAMP = ${JSON.stringify(STAMP)};
// Vrais chiffres : 15 min de report évitées par rapport, valorisées à 104,74 €/h (26,19 €).
// Les OT, les lignes et la part de rapports avec Q18 sont illustratifs.
const SAVED_MIN = 15, EUR = 15 / 60 * 104.74;
const hash = (i) => { let h = Math.imul(i + 5, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const ROWS = Array.from({ length: ROWS_N }, (_, r) => ({ ot: String(4102000 + r * 24117 + Math.floor(hash(r) * 900)), q18: hash(r + 300) < 0.18 }));
const START_Q18 = ROWS.map((r) => r.q18);
const QUEUE = Array.from({ length: 8 }, (_, i) => ({ row: Math.floor(hash(i + 900) * ROWS_N), q18: hash(i + 700) < 0.45 }));
const T = { arrive: 0.8, digit: 0.5, spin: 1.8, open: 0.5, stamp: 0.8, tab: 0.6, rest: 1.4 };
const DIALED = 0.8, SPUN = DIALED + 7 * T.digit, OPENED = SPUN + T.spin, STAMPED = OPENED + T.open, TABBED = STAMPED + T.stamp, CLOSED = TABBED + T.tab, END = CLOSED + T.open + T.rest;
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
let job = 0, t = 0, offset = 0, from = 0, touring = true, idle = 0, manual = false;
const parts = { strip: $("strip"), clips: $("clips"), spoolT: $("spool-top"), spoolB: $("spool-bot"), stamp: $("stamp"), dial: $("dial"), ot: $("ot"), lamp: $("lamp"), mark: $("shaft-mark"), report: $("report") };
const FXs = (x, y, z) => ({ o: [x, y, z], a: [1, 0, 0] });
// La bande : seize rangées de la bobine du haut à celle du bas, avec une flèche vers nous qui danse quand elle défile.
function stripRows(speed, now, rt, rb) {
  const rows = [], N = 16;
  for (let i = 0; i <= N; i++) {
    const u = i / N, z = TOP_Z - u * (TOP_Z - BOT_Z), y0 = rt + (rb - rt) * u;
    const bow = 2.6 * Math.sin(Math.PI * u), wave = speed * 1.6 * Math.sin(6.283 * (u * 1.3 - now * 1.1)) * Math.sin(Math.PI * u), roll = speed * 0.9 * Math.sin(6.283 * (u * 0.8 + now * 0.7));
    rows.push([[SW, y0 + bow + wave - roll, z], [-SW, y0 + bow + wave + roll, z]]);
  }
  return rows;
}
const rowV = (r, off) => 0.5 + (r - off) / NV;
function stripSvg(rows, off, sel, hl) {
  let svg = paperSvg(rows, { lines: false });
  // Lignes du registre : séparateurs, numéro d'OT (trait court) et, une fois reportées, les données.
  let seps = "", ots = "", data = "", mark = "";
  const pt = (v, kk) => pPt(iso(paperPoint(rows, v, kk), P));
  for (let r = Math.floor(off - NV / 2) - 1; r <= Math.ceil(off + NV / 2) + 1; r++) {
    if (r < 0 || r >= ROWS_N) continue;
    const vc = rowV(r, off), vt = vc - 0.5 / NV, vb = vc + 0.5 / NV;
    if (vc < 0.06 || vc > 0.94) continue;
    if (vb < 0.97) seps += "M" + pt(vb, 0.03) + "L" + pt(vb, 0.97);
    ots += "M" + pt(vc, 0.08) + "L" + pt(vc, 0.34);
    if (ROWS[r].printed) for (const [a, b, dv] of [[0.4, 0.66, -0.16], [0.4, 0.58, 0.16]]) data += "M" + pt(vc + dv / NV, a) + "L" + pt(vc + dv / NV, b);
    if (r === sel && hl > 0) mark += '<path class="fg-hl" style="opacity:' + hl.toFixed(2) + '" d="M' + [pt(vt, 0), pt(vt, 1), pt(vb, 1), pt(vb, 0)].join("L") + 'Z"/>';
  }
  return mark + svg + '<path class="fg-sp" d="' + seps + '"/><path class="fg-tx" d="' + ots + '"/><path class="fg-tx fg-dn" d="' + data + '"/>';
}
function spoolWrap(z, r, left) {
  // Papier enroulé : un cylindre dont le rayon suit la quantité de bande restant sur la bobine.
  return solidSvg(G_disc(-40, 40, r, z), { tone: "hi" });
}
function G_disc(x0, x1, r, z) { const N = 28, ring = Array.from({ length: N }, (_, i) => [Math.cos(i / N * 6.283) * r, Math.sin(i / N * 6.283) * r]); const a = ring.map(([y, zz]) => iso([x0, y, z + zz], P)), b = ring.map(([y, zz]) => iso([x1, y, z + zz], P)); const hull = convexHull([...a, ...b]), d = (pts) => "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z"; return { fill: d(hull), outline: d(hull), shades: ["", "", "", ""], top: d(b) }; }
const target = (row) => row;
function dialHoles(rot) {
  const out = [];
  for (let i = 0; i < 10; i++) { const a = (60 + 30 + i * 28 + rot) * Math.PI / 180; out.push(ring(DIAL.x + Math.cos(a) * (DIAL.r - 3), DIAL.y + Math.sin(a) * (DIAL.r - 3), 2, CONS_H + 1, P, 16)); }
  return solidSvg(cylinder(DIAL.x, DIAL.y, DIAL.r, CONS_H + 1, 0.8, P, 40), { tone: "mid", inner: lineSvg(out.join(""), { tone: "lo" }) });
}
function draw(now) {
  const q = QUEUE[job], row = manual ? null : q.row;
  let speed = 0;
  if (!manual) { const u = ease((t - SPUN) / T.spin); const prev = offset; offset = t < SPUN ? from : from + (target(row) - from) * u; speed = Math.min(1, Math.abs(offset - prev) * 40); }
  const open = manual ? 0 : ease((t - OPENED) / T.open) * (1 - ease((t - CLOSED) / T.open));
  const sel = manual ? Math.round(offset) : row;
  const printed = !manual && t > STAMPED + T.stamp * 0.5;
  if (printed) ROWS[row].printed = true;
  const tabbing = !manual && q.q18 && t > TABBED && t < CLOSED + 0.05 ? ease((t - TABBED) / T.tab) : null;
  if (!manual && q.q18 && t >= CLOSED) ROWS[row].q18 = true;
  const p = Math.max(0, Math.min(1, offset / ROWS_N)), rt = 6 + 6 * (1 - p), rb = 6 + 6 * p;
  const rows = stripRows(Math.max(speed, manual ? 0.2 : 0), now, rt, rb);
  html(parts.strip, stripSvg(rows, offset, sel, open > 0 || manual ? 1 : 0));
  html(parts.spoolT, spoolWrap(TOP_Z, rt - 0.4, true)); html(parts.spoolB, spoolWrap(BOT_Z, rb - 0.4, false));
  // Cavaliers Q18 : posés sur le bord droit de la bande ; le nouveau descend d'en haut avant de se clipser.
  let clips = "";
  for (let r = Math.floor(offset - NV / 2) - 1; r <= Math.ceil(offset + NV / 2) + 1; r++) {
    if (r < 0 || r >= ROWS_N) continue;
    const drop = r === sel && tabbing !== null ? (1 - tabbing) * 12 : 0;
    if (!ROWS[r].q18 && !(r === sel && tabbing !== null)) continue;
    const vc = rowV(r, offset); if (vc < 0.06 || vc > 0.94) continue;
    const c = paperPoint(rows, vc, 0);
    clips += '<g transform="' + translateAlong(P, [c[0] - 4, c[1] - 1.8, c[2] + drop]) + '">' + CLIP + "</g>";
  }
  html(parts.clips, clips);
  const press = manual ? 0 : Math.sin(Math.PI * Math.max(0, Math.min(1, (t - STAMPED) / T.stamp)));
  attr(parts.stamp, "transform", translateAlong(P, [0, -(STAMP.rest - STAMP.hit) * press, (sel >= 0 ? 0 : 0)]));
  const digits = q.row === undefined ? "" : ROWS[q.row].ot;
  let rot = 0, shown = "_______";
  if (!manual) {
    const kk = Math.floor((t - DIALED) / T.digit), u = (t - DIALED) / T.digit - kk;
    if (t >= DIALED && kk < 7) { const n = +digits[kk] || 10; rot = (u < 0.45 ? ease(u / 0.45) : 1 - ease((u - 0.45) / 0.55)) * n * 28; }
    const typed = Math.max(0, Math.min(7, t < DIALED ? 0 : kk + (u > 0.45 ? 1 : 0)));
    shown = digits.slice(0, typed).padEnd(7, "_");
  } else shown = ROWS[sel].ot;
  html(parts.dial, dialHoles(-rot));
  if (parts.ot.textContent !== shown) parts.ot.textContent = shown;
  attr(parts.lamp, "data-on", !manual && t >= SPUN && t < OPENED);
  const sa = offset * 0.9;
  html(parts.mark, lineSvg(segment([MOTOR.x1, Math.cos(sa) * 2, BOT_Z + Math.sin(sa) * 2], [MOTOR.x1, Math.cos(sa) * (MOTOR.r - 2.4), BOT_Z + Math.sin(sa) * (MOTOR.r - 2.4)], P), { tone: "mid" }));
  const rise = manual ? 0 : (1 - ease(t / T.arrive)) * 30 + ease((t - END + 0.6) / 0.6) * 30;
  html(parts.report, rise >= 29.9 ? "" : '<g opacity="' + (1 - rise / 30).toFixed(2) + '">' + paperSvg(paperRows({ c: [-84, 42, 40 + rise], d: [1, 0, 0], w: [0, 1, 0], L: 26, W: 20, curl: 0.05, wave: 0.9, roll: 0.5, ph: job, t: now, NT: 10 }), { head: true, lit: true }) + "</g>");
  const line = "ligne " + (sel + 1);
  if (manual) say(line + " · OT " + ROWS[sel].ot + " · " + (ROWS[sel].q18 ? "Q18 visible" : "sans Q18"));
  else if (t < DIALED + 7 * T.digit) say("Rapport " + (job + 1) + " · OT composé " + shown);
  else if (t < OPENED) say("OT " + digits + " · le moteur cherche la ligne");
  else if (t < TABBED) say("OT " + digits + " → " + line + " · report en cours");
  else say("OT " + digits + " → " + line + " · " + (q.q18 ? "Q18 visible" : "sans Q18") + " · " + SAVED_MIN + " min · " + fr(EUR, 2) + " €");
}
function next(step) {
  from = offset; job = (job + step + QUEUE.length) % QUEUE.length; t = 0; manual = false;
  if (job === 0) ROWS.forEach((r, i) => { r.q18 = START_Q18[i]; r.printed = false; });
}
const run = loop((dt, calm) => {
  if (manual) { draw(performance.now() / 1000); return; }
  if (calm) t = CLOSED + T.open + 0.1;
  else { t += dt; if (t >= END && touring) next(1); else if (t >= END) t = END - 0.01; }
  draw(performance.now() / 1000);
});
const steer = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; next(1); }, 6000); };
dragX(() => { steer(); manual = true; return offset; }, (v, share) => { offset = Math.max(0, Math.min(ROWS_N - 1, v - share * 40)); run(); });
stage.addEventListener("keydown", (e) => { const to = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (to !== undefined) { e.preventDefault(); steer(); next(to); run(); } });
window.__fig = { at: (j, tt) => { touring = false; manual = false; job = j; t = tt; draw(1); return readout.textContent; }, T: { SPUN, OPENED, STAMPED, TABBED, CLOSED, END }, QUEUE };
draw(1);
`;
const CLIPSVG = k.solidSvg(k.slabOf({ x: -0.5, y: -2, w: 8, d: 4, r: 0.6 }, -2.4, 4.8, P, 2, 0.3), { tone: "hi", lit: true });

const plate = k.plateHtml({
  fig: "Fig 04",
  title: "Reporteur Q18",
  hint: "Glisse : registre · ← → : rapport",
  readout: "Rapport 1 · OT composé _______",
  keys: [
    { mark: "lit", label: "La ligne en cours, le tampon et le cavalier Q18" },
    { mark: "raised", label: "Registre Excel : les cavaliers marquent les rapports avec Q18" },
  ],
  caption: "Chaque rapport SharePoint donne son OT ; le moteur amène la ligne du registre devant la fenêtre, le tampon y reporte les données et le cavalier rend les Q18 visibles pour Power BI, les COSI et les clients de l'ABE SUD IdF. Le report manuel prenait 15 min par rapport : sur 4 000 à 5 000 rapports par an, 1 000 à 1 250 h et 104 740 à 130 925 € à 104,74 €/h. Les OT et les lignes affichés sont illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Reporteur Q18 : flèches gauche et droite pour changer de rapport, glisser pour dérouler le registre" aria-valuemin="0" aria-valuemax="7" aria-valuenow="0">${svg}</div>`,
});

writeFigure("moteur", { title: "Reporteur Q18 · registre à rouleau", plate, live: live.replace("CLIP + ", JSON.stringify(CLIPSVG) + " + "), css: `<style>.fg-hl{fill:#cfe0ff;stroke:none}.fg-sp{fill:none;stroke:#b4c0d6;stroke-width:.35}</style>` });
