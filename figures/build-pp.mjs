// Fig 07 · Power Automate, chaîne des PP : un cadran solaire des échéances.
// node figures/build-pp.mjs  →  figures/pp.html
// Un cadran de pierre d'un tour pour une année. L'ombre du style (la lame au centre) avance d'un cran par jour : c'est aujourd'hui.
// Chaque jour, quatre plans de prévention quittent la corbeille, passent sous le lecteur qui relève leur échéance, puis se posent sur le cadran,
// à l'angle de leur date. Une seconde ombre, plus pâle, court un mois devant la première : chaque feuille qu'elle touche se redresse et envoie
// sa lettre à la boîte aux lettres. Quand l'ombre du jour passe sur une feuille, le plan est échu et s'efface.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";

const WIDTH = 660, HEIGHT = 470;
const PLATE = { x: -150, y: -78, w: 300, d: 160, r: 9 };
const DIAL = { R: 60, plinth: 67, z: 6 };                                   // cadran et socle étagé
const GNOMON = { h: 46, half: 16, t: 2.6 };
const INBOX = { x: -136, y: 14, w: 32, d: 26, r: 1.6 }, INBOX_H = 6;
const READER = { x: -96, y: 17, w: 24, d: 20, r: 1.6 }, READER_H = 14, YC = 27, SLOT_Z = 5.4;
const POSTBOX = { x: 96, y: -8 };                                          // pied de la boîte aux lettres
const STELE = { x: -26, y: 70, w: 52, d: 10, r: 1.4 }, STELE_H = 15;
const LEAD_ANG = 31.6;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [0, 0, 56], [POSTBOX.x, POSTBOX.y, 58], [-136, 14, 30]], WIDTH, HEIGHT, { pad: 22, azimuth: 56 });
const { at, S, L, D, slab, front, right, flat, byDepth } = tools(P);
const pos = (a, r, z = 0) => [Math.sin(a) * r, -Math.cos(a) * r, z];       // angle depuis le fond, dans le sens des aiguilles

// ---------------------------------------------------------------- cadran
function dialSvg() {
  const out = [], F0 = G.frameAlong([0, 0, 0], [0, 0, 1]), F1 = G.frameAlong([0, 0, DIAL.z], [0, 0, 1]), Fm = G.frameAlong([0, 0, 3], [0, 0, 1]);
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -DIAL.plinth, y: -DIAL.plinth, w: 2 * DIAL.plinth, d: 2 * DIAL.plinth, r: DIAL.plinth }, 0, 2, P)}" style="filter:blur(4px)"/>`);
  out.push(S(G.disc(0, 3, DIAL.plinth, F0, P), { tone: "lo", inner: k.fadedSvg(G.ribsOf(F0, 0.1, 2.9, DIAL.plinth, 96, P, { fade: [0.1, 0.55] }), { tone: "faint" }) }));
  out.push(S(G.disc(0, 3, DIAL.R, Fm, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(Fm, 0.1, 2.9, DIAL.R, 84, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  // Face du cadran : deux rainures, couronne des mois (un trait par mois, majeur par trimestre), croix des points cardinaux, vis.
  out.push(L(G.circleOf(F1, 0, 54, P) + G.circleOf(F1, 0, 16, P), { tone: "faint" }));
  const minor = [], major = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, long = i % 3 === 0; (long ? major : minor).push(k.segment(pos(a, long ? 48 : 54, DIAL.z), pos(a, DIAL.R - 0.01, DIAL.z), P)); }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid", free: "start" }));
  const days = []; for (let i = 0; i < 228; i += 1) { const a = i / 228 * Math.PI * 2; if (i % 19) days.push(k.segment(pos(a, 57.6, DIAL.z), pos(a, DIAL.R - 0.01, DIAL.z), P)); }
  out.push(L(days.join(""), { tone: "faint" }));
  out.push(D(G.dotsOf(F1, 0, 58.4, 8, P, { phase: Math.PI / 8, all: true }), { size: 0.4 }));
  // Douze bornes de mois sur le socle, quatre plus hautes.
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, [x, y] = pos(a, 63.6), tall = i % 3 === 0; out.push(S(k.cylinder(x, y, tall ? 2.2 : 1.6, 3, tall ? 3.4 : 1.8, P, 14), { tone: tall ? "mid" : "lo" })); }
  // Centre : platine du style, quatre vis.
  out.push(S(slab({ x: -GNOMON.t - 5, y: -GNOMON.half - 5, w: 2 * GNOMON.t + 10, d: 2 * GNOMON.half + 10, r: 2 }, DIAL.z, 1.6, 3, 0.4), { tone: "lo" }));
  out.push(D(k.corners({ x: -GNOMON.t - 5, y: -GNOMON.half - 5, w: 2 * GNOMON.t + 10, d: 2 * GNOMON.half + 10 }, 2.2).map(([x, y]) => at([x, y, DIAL.z + 1.6])), { size: 0.36 }));
  return out.join("");
}
function gnomonSvg() {
  const out = [], F = G.frameOf([-GNOMON.t / 2, 0, DIAL.z + 1.6], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  out.push(S(G.prismOf(F, [[-GNOMON.half, 0], [GNOMON.half, 0], [GNOMON.half, GNOMON.h]], 0, GNOMON.t, P), { tone: "mid" }));
  out.push(S(G.prismOf(F, [[-GNOMON.half + 1.2, 0], [GNOMON.half - 1.2, 0], [GNOMON.half - 1.2, 3.4]], -0.6, GNOMON.t + 0.6, P), { tone: "hi" }));
  out.push(D([at([GNOMON.t / 2 + 0.2, GNOMON.half - 3, DIAL.z + 1.6 + 6]), at([GNOMON.t / 2 + 0.2, GNOMON.half - 3, DIAL.z + 1.6 + GNOMON.h - 8])], { size: 0.38 }));
  return out.join("");
}

// ---------------------------------------------------------------- corbeille, lecteur, stèle, boîte aux lettres
function trayAndReader() {
  const out = [], t = INBOX, rd = READER;
  out.push(S(slab(t, 0, 1.6, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: t.x, y: t.y + t.d - 1.6, w: t.w, d: 1.6, r: 0.4 }, 1.6, INBOX_H - 1.6, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: t.x, y: t.y, w: 1.6, d: t.d, r: 0.4 }, 1.6, INBOX_H - 1.6, 2, 0.2), { tone: "mid" }));
  out.push(`<g data-part="inbox"></g>`);
  out.push(S(slab({ x: t.x, y: t.y + 0, w: t.w, d: 1.6, r: 0.4 }, 1.6, INBOX_H + 2 - 1.6, 2, 0.2), { tone: "mid" }));
  // fente de sortie du chargeur (face tournée vers le lecteur) : deux montants et un linteau autour d'une ouverture sombre
  out.push(S(slab({ x: t.x + t.w - 1.6, y: t.y, w: 1.6, d: t.d / 2 - 12, r: 0.3 }, 1.6, INBOX_H + 2 - 1.6, 2, 0.1), { tone: "mid" }), S(slab({ x: t.x + t.w - 1.6, y: t.y + t.d / 2 + 12, w: 1.6, d: t.d / 2 - 12, r: 0.3 }, 1.6, INBOX_H + 2 - 1.6, 2, 0.1), { tone: "mid" }));
  out.push(`<g transform="${k.sideMatrix([t.x + t.w, 0], 0, P, "right")}"><path class="iso-fill fig-dark" d="${flat(-(YC + 11.5), SLOT_Z - 1.3, -(YC - 11.5), SLOT_Z + 1.3, 0.4, 2)}"/></g>`);
  out.push(`<g data-part="reading"></g>`);
  out.push(D([at([t.x + 3, t.y + t.d, INBOX_H - 2]), at([t.x + t.w - 3, t.y + t.d, INBOX_H - 2])], { size: 0.34 }));
  out.push(k.faceTextSvg(`${front(t.y + t.d)} translate(${t.x + t.w / 2} ${-(INBOX_H - 3.6)})`, "ARRIVÉE", { size: 2.8, tone: "mid", anchor: "middle" }));
  // lecteur : tunnel fermé, fente de sortie visible sur la face est, étiquette sur la face avant, voyant sur le dessus
  out.push(S(slab(rd, 0, READER_H, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(rd, 7, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: rd.x - 0.8, y: rd.y - 0.8, w: rd.w + 1.6, d: rd.d + 1.6, r: 1.4 }, READER_H, 2, 3, 0.5), { tone: "lo" }));
  out.push(`<g transform="${k.sideMatrix([rd.x + rd.w, 0], 0, P, "right")}"><path class="iso-fill fig-dark" d="${flat(-(YC + 11.5), SLOT_Z - 1.3, -(YC - 11.5), SLOT_Z + 1.3, 0.4, 2)}"/><path class="iso-line" data-tone="mid" d="${flat(-(YC + 12.5), SLOT_Z - 2.3, -(YC - 12.5), SLOT_Z + 2.3, 0.8, 2)}"/></g>`);
  out.push(k.faceTextSvg(`${front(rd.y + rd.d)} translate(${rd.x + rd.w / 2} ${-(READER_H - 4.4)})`, "LECTEUR", { size: 3, tone: "mid", anchor: "middle" }));
  const [lx, ly] = at([rd.x + rd.w / 2, YC, READER_H + 5.8]);
  out.push(S(k.cylinder(rd.x + rd.w / 2, YC, 2.2, READER_H + 2, 1.4, P, 18), { tone: "mid" }));
  out.push(`<circle class="fig-lamp" data-part="read-lamp" cx="${lx.toFixed(1)}" cy="${(ly - 2.4).toFixed(1)}" r="1.1"/>`);
  return out.join("");
}
function steleSvg() {
  const out = [], s = STELE, f = front(s.y + s.d);
  out.push(S(slab({ x: s.x - 3, y: s.y - 2, w: s.w + 6, d: s.d + 4, r: 2 }, 0, 3, 3, 0.5), { tone: "lo" }));
  out.push(S(slab(s, 3, STELE_H - 3, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(s, 9, P, 3), { tone: "faint" }) }));
  out.push(display(f, flat(s.x + 3, 6, s.x + 23, 12.4, 1), { part: "today", x: s.x + 13, y: -9.1, size: 4, text: "00/00" }));
  out.push(display(f, flat(s.x + 29, 6, s.x + 49, 12.4, 1), { part: "due", x: s.x + 39, y: -9.1, size: 4, text: "--/--" }));
  out.push(D([at([s.x + 1.6, s.y + s.d, 9]), at([s.x + 25.5, s.y + s.d, 9]), at([s.x + s.w - 1.6, s.y + s.d, 9])], { size: 0.32 }));
  return out.join("");
}
function postboxSvg() {
  const out = [], x = POSTBOX.x, y = POSTBOX.y;
  out.push(S(slab({ x: x - 7, y: y - 7, w: 14, d: 14, r: 2 }, 0, 3, 3, 0.5), { tone: "lo" }));
  out.push(S(slab({ x: x - 2, y: y - 2, w: 4, d: 4, r: 0.6 }, 3, 38, 3, 0.4), { tone: "mid" }));
  out.push(D(k.corners({ x: x - 7, y: y - 7, w: 14, d: 14 }, 1.6).map(([bx, by]) => at([bx, by, 3])), { size: 0.34 }));
  // Boîte : corps arrondi, bouche, fanion de relève sur le flanc (il se lève quand une lettre part).
  const b = { x: x - 11, y: y - 8, w: 22, d: 16, r: 4 };
  out.push(S(slab(b, 41, 14, 4, 1.6), { tone: "mid", inner: L(k.sideSeam(b, 47, P, 4), { tone: "faint" }) }));
  out.push(`<g transform="${front(b.y + b.d)}"><path class="iso-line" data-tone="lo" d="${flat(b.x + 4, 47, b.x + b.w - 4, 51, 1.4, 3)}"/></g>`);
  out.push(D([at([b.x + 3, b.y + b.d, 44]), at([b.x + b.w - 3, b.y + b.d, 44])], { size: 0.34 }));
  out.push(`<g data-part="flag"></g>`);
  const [lx, ly] = at([x, y + 8, 49]);
  out.push(`<circle class="fig-lamp" data-part="mail-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un cadran solaire de pierre, un tour pour une année d'échéances. L'ombre du style au centre avance d'un cran par jour. Les plans de prévention quittent la corbeille, passent sous le lecteur, puis se posent sur le cadran à l'angle de leur échéance, feuilles souples. Une seconde ombre pâle court un mois devant : chaque feuille qu'elle touche se redresse et envoie une lettre vers la boîte aux lettres. Quand l'ombre du jour passe sur une feuille, le plan est échu.",
  body: [
    bench(P, PLATE, { strip: { x: -140, y: PLATE.y + PLATE.d - 13, w: 140, d: 7, r: 1 }, label: { x: 74, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    dialSvg(), `<g data-part="shadow"></g>`, `<g data-part="fan-back"></g>`, gnomonSvg(), `<g data-part="fan-front"></g>`,
    trayAndReader(), steleSvg(), postboxSvg(), `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
${PAPER}
const YC = ${YC}, SLOT_Z = ${SLOT_Z}, DIAL = ${JSON.stringify(DIAL)}, INBOX = ${JSON.stringify(INBOX)}, READER = ${JSON.stringify(READER)}, READER_H = ${READER_H}, POSTBOX = ${JSON.stringify(POSTBOX)}, LEAD_ANG = ${LEAD_ANG};
// Vrais chiffres : 10 min de contrôle et de saisie évitées par PP, 4 PP par jour (40 min),
// environ 225 jours par an à 104,74 €/h (≈ 15 700 €). Durées de validité et délai de relance illustratifs.
const PER_DAY = 4, MIN_PER_PP = 10, RATE = 104.74, DAYS = 225, YEAR = 228, LEAD = 20, DAY_S = 3, TAU = Math.PI * 2, ANG = TAU / YEAR;
const hash = (i) => { let h = Math.imul(i + 3, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const PP = []; for (let a = 1; a <= DAYS; a++) for (let q = 0; q < PER_DAY; q++) { const j = PP.length; PP.push({ j, a, q, e: a + 30 + Math.floor(hash(j) * 200) }); }
const dateOf = (n) => { const d = new Date(Date.UTC(2023, 0, 2 + (n - 1) + 2 * Math.floor((n - 1) / 5))); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); };
let clock = 40 * DAY_S, touring = true, idle = 0;
const parts = { inbox: $("inbox"), reading: $("reading"), shadow: $("shadow"), back: $("fan-back"), front: $("fan-front"), air: $("air"), due: $("due"), today: $("today"), lamp: $("read-lamp"), mail: $("mail-lamp"), flag: $("flag") };
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const pos = (a, r, z = 0) => [Math.sin(a) * r, -Math.cos(a) * r, z];
const wrapA = (e) => ((e * ANG) % TAU + TAU) % TAU;
function state(day, frac) {
  const filed = (p) => p.a < day || (p.a === day && frac >= (p.q + 1) * 0.15 + 0.05);
  const active = PP.filter((p) => filed(p) && p.e >= day);
  const relanced = PP.filter((p) => filed(p) && p.e - LEAD <= day - (frac < 0.8 ? 1 : 0)).length;
  return { active, relanced, done: PP.filter(filed).length };
}
// Ombre : une lame fine du centre au bord, à l'angle du jour ; la seconde, plus pâle, un mois devant.
function shadowSvg(a, pale) {
  const [x1, y1] = pos(a, 56), t = [Math.cos(a) * 1.5, Math.sin(a) * 1.5], z = DIAL.z + 0.05, w = pale ? 0.9 : 1.6;
  const q = [[-t[0] * w, -t[1] * w], [x1 - t[0] * w * 0.5, y1 - t[1] * w * 0.5], [x1 + t[0] * w * 0.5, y1 + t[1] * w * 0.5], [t[0] * w, t[1] * w]].map(([x, y]) => iso([x, y, z], P));
  return '<path class="fg-shd' + (pale ? " fg-shp" : "") + '" d="M' + q.map(pPt).join("L") + 'Z"/>';
}
// Un plan posé sur le cadran, à l'angle de son échéance : à plat, brise légère ; redressé et éclairé quand la relance l'a touché.
function planSvg(p, now, up) {
  const a = wrapA(p.e), r = 32 + (p.j % 4) * 7, d = [Math.sin(a), -Math.cos(a), 0], w = [Math.cos(a), Math.sin(a), 0], c = pos(a, r, DIAL.z + 0.7 + up * 4);
  return paperSvg(paperRows({ c, d, w, L: 14, W: 9, curl: (p.j % 2 ? 1 : -1) * 0.04 + up * 0.09, wave: 0.18 + up * 1.1, roll: 0.15 + up * 0.5, ph: p.j * 1.9, t: now, NT: 5 }), { lines: false, head: true, lit: up > 0.3 });
}
function draw(now) {
  const day = Math.min(DAYS, Math.floor(clock / DAY_S) + 1), frac = clock / DAY_S - (day - 1), dayf = day - 1 + frac;
  const st = state(day, frac), psi = dayf * ANG, rel = psi + LEAD_ANG * Math.PI / 180;
  html(parts.shadow, shadowSvg(rel, true) + shadowSvg(psi, false));
  // Au plus quatre feuilles par secteur d'un mois, aux dates réelles ; peintes d'arrière en avant.
  const sectors = Array.from({ length: 12 }, () => []);
  for (const p of st.active) sectors[Math.floor(wrapA(p.e) / TAU * 12) % 12].push(p);
  const list = [];
  sectors.forEach((arr) => { arr.sort((x, y) => x.e - y.e); const n = Math.min(5, arr.length); for (let i = 0; i < n; i++) list.push(arr[Math.floor((i + 0.5) / n * arr.length)]); });
  list.sort((x, y) => iso(pos(wrapA(x.e), 34), P)[1] - iso(pos(wrapA(y.e), 34), P)[1]);
  const cy = iso([0, 0, DIAL.z], P)[1];
  let back = "", frontS = "";
  for (const p of list) {
    const dd = ((wrapA(p.e) - ((rel % TAU + TAU) % TAU)) % TAU + TAU) % TAU, touched = dd > TAU - 0.5 || dd < 0.12 ? 1 : 0;   // la lame pâle vient de passer dessus
    const upv = (p.e - LEAD <= dayf) ? Math.max(0, 1 - Math.abs(dayf - (p.e - LEAD)) / 6) : 0;
    const s = planSvg(p, now, Math.max(upv, touched * 0.0));
    if (iso(pos(wrapA(p.e), 34), P)[1] < cy) back += s; else frontS += s;
  }
  html(parts.back, back); html(parts.front, frontS);
  const due = PP.filter((p) => p.e - LEAD === day), firing = frac >= 0.8 && due.length > 0;
  html(parts.flag, solidSvg(slabOf({ x: POSTBOX.x + 10, y: POSTBOX.y - 1, w: 1.4, d: 2, r: 0.3 }, firing ? 52 : 44, firing ? 14 : 6, P, 2, 0.1), firing ? { tone: "hi", lit: true } : { tone: "mid" }));
  const waiting = PER_DAY - Math.min(PER_DAY, Math.floor(Math.max(0, frac - 0.05) / 0.15));
  html(parts.inbox, Array.from({ length: waiting }, (_, i) => paperSvg(paperRows({ c: [INBOX.x + 14, YC, 2 + i * 1.1], d: [1, 0, 0], w: [0, 1, 0], L: 22, W: 16, curl: 0.05 * (i % 2 ? 1 : -1), wave: 0.3, ph: i * 2, t: now, NT: 6 }), { head: true })).join(""));
  const q = Math.floor((frac - 0.05) / 0.15), u = (frac - 0.05) / 0.15 - q;
  let reading = "", air = "", shown = "--/--";
  if (frac >= 0.05 && q < PER_DAY && day <= DAYS) {
    const p = PP[(day - 1) * PER_DAY + q], start = [INBOX.x + 14, YC, 2 + (PER_DAY - q - 1) * 1.1], mid = READER.x + READER.w / 2, slotIn = [INBOX.x + INBOX.w + 8, YC, SLOT_Z], out0 = [READER.x + READER.w + 9, YC, SLOT_Z];
    const sheet = (c, curl, wave, lit) => paperSvg(paperRows({ c, d: [1, 0, 0], w: [0, 1, 0], L: 16, W: 22, curl, wave, roll: wave * 0.6, ph: p.j, t: now, NT: 8 }), { head: true, lit });
    if (u < 0.12) { const v = ease(u / 0.12); reading = sheet(start.map((s0, i) => s0 + (slotIn[i] - s0) * v), -0.05 * Math.sin(v * Math.PI), 0.8 * Math.sin(v * Math.PI), true); }
    else if (u < 0.3) { const v = ease((u - 0.12) / 0.18); if (v < 0.55) reading = sheet([slotIn[0] + (mid - slotIn[0]) * v, YC, SLOT_Z], 0.02, 0.2, true); }
    else if (u < 0.6) { shown = dateOf(p.e); }
    else if (u < 0.68) { const v = ease((u - 0.6) / 0.08); if (v > 0.45) air = sheet([mid + (out0[0] - mid) * v, YC, SLOT_Z], 0.02, 0.2, true); shown = dateOf(p.e); }
    else { const v = ease((u - 0.68) / 0.32), to = pos(wrapA(p.e), 40, DIAL.z + 1); air = sheet([out0[0] + (to[0] - out0[0]) * v, out0[1] + (to[1] - out0[1]) * v, out0[2] + (to[2] - out0[2]) * v + 18 * Math.sin(v * Math.PI)], -0.08 * Math.sin(v * Math.PI), 1.4 * Math.sin(v * Math.PI), true); shown = dateOf(p.e); }
  }
  // Relances du jour : une lettre souple par plan atteint, du cadran vers la boîte.
  if (firing) {
    const v = ease((frac - 0.8) / 0.2), a = wrapA(due[0].e), from = pos(a, 40, DIAL.z + 4), to = [POSTBOX.x, POSTBOX.y + 6, 51];
    air += due.slice(0, 3).map((_, i) => { const c = [from[0] + (to[0] - from[0]) * v + i * 3, from[1] + (to[1] - from[1]) * v, from[2] + (to[2] - from[2]) * v + 26 * Math.sin(v * Math.PI) + i * 2]; return '<g opacity="' + (1 - 0.5 * v).toFixed(2) + '">' + paperSvg(paperRows({ c, d: [1, 0, 0], w: [0, 1, 0], L: 14, W: 9, curl: -0.07 * Math.sin(v * Math.PI), wave: 1 * Math.sin(v * Math.PI), roll: 0.7, ph: i * 2, t: now, NT: 6 }), { flap: true, lines: false }) + "</g>"; }).join("");
  }
  html(parts.reading, reading); html(parts.air, air);
  if (parts.due.textContent !== shown) parts.due.textContent = shown;
  const today = dateOf(day); if (parts.today.textContent !== today) parts.today.textContent = today;
  attr(parts.lamp, "data-on", shown !== "--/--" && u >= 0.3 && u < 0.6);
  attr(parts.mail, "data-on", firing);
  const mins = st.done * MIN_PER_PP, h = Math.floor(mins / 60), mm = mins % 60;
  say("Jour " + day + " · " + st.done + " PP classés · " + st.relanced + " relance" + (st.relanced > 1 ? "s" : "") + " · " + h + " h" + (mm ? " " + String(mm).padStart(2, "0") : "") + " · " + fr(mins / 60 * RATE) + " €");
}
const run = loop((dt, calm) => {
  if (calm) clock = 120 * DAY_S;
  else if (touring) { clock += dt; if (clock >= DAYS * DAY_S) clock = 40 * DAY_S; }
  draw(performance.now() / 1000);
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); clock = Math.max(0, Math.min(DAYS * DAY_S - 0.01, next)); run(); };
dragX(() => clock, (v, share) => steer(v + share * 150 * DAY_S));
stage.addEventListener("keydown", (e) => { const to = { ArrowRight: clock + 10 * DAY_S, ArrowLeft: clock - 10 * DAY_S, Home: 0, End: DAYS * DAY_S - 0.01 }[e.key]; if (to !== undefined) { e.preventDefault(); steer(to); } });
window.__fig = { at: (day, frac) => { touring = false; clock = (day - 1 + frac) * DAY_S; draw(1); return readout.textContent; }, due: (d) => PP.filter((p) => p.e - LEAD === d).length };
draw(1);
`;

const plate = k.plateHtml({
  fig: "Fig 07",
  title: "Chaîne des PP",
  hint: "Glisse ou ← → : jours",
  readout: "Jour 40",
  keys: [
    { mark: "lit", label: "Le plan lu, et les feuilles redressées par la relance" },
    { mark: "raised", label: "Cadran : un tour pour une année ; ombre foncée : aujourd'hui, ombre pâle : un mois devant" },
  ],
  caption: "Chaque plan de prévention déposé est lu, son échéance contrôlée, puis il est classé avec son lien dans le suivi ; les échéances déclenchent les relances sans bloquer le processus. Le contrôle et la saisie évités valent 10 min par PP, soit 40 min par jour : sur environ 225 jours, ≈ 15 700 € par an à 104,74 €/h. Durées de validité et délai de relance illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Chaîne des PP : flèches gauche et droite pour avancer dans les jours" aria-valuemin="1" aria-valuemax="225" aria-valuenow="40">${svg}</div>`,
});

writeFigure("pp", { title: "Chaîne des PP · cadran solaire des échéances", plate, live, css: `<style>.fg-shd{fill:#1d2230;opacity:.22}.fg-shp{opacity:.1}</style>` });
