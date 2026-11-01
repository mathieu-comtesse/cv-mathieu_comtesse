// Fig 07 · Power Automate, chaîne des PP : une roue des échéances.
// node figures/build-pp.mjs  →  figures/pp.html
// Chaque jour, quatre plans de prévention quittent la corbeille, passent sous le lecteur qui relève leur échéance, puis s'insèrent
// en feuillets sur la roue, à l'angle de leur date : la roue d'une année tourne d'un cran par jour. Le bras de relance se tient un mois
// devant aujourd'hui : chaque feuillet qui l'atteint envoie son mail vers la boîte aux lettres.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP, PAPER } from "./common.mjs";

const WIDTH = 640, HEIGHT = 440;
const PLATE = { x: -132, y: -46, w: 264, d: 100, r: 8 };
const BASE = { x: -54, y: -20, w: 108, d: 40, r: 3 }, BASE_H = 20;
const WHEEL = { z: 78, R: 32, thick: 8 }, ARMS = [-52, 46];
const INBOX = { x: -122, y: 8, w: 34, d: 26, r: 1.6 }, INBOX_H = 6;
const READER = { x: -84, y: 12, w: 26, d: 20, r: 1.6 }, READER_H = 24;
const MAILBOX = { x: 64, y: -10, w: 26, d: 20, r: 2 }, MAILBOX_H = 34;
const LEAD_ANG = 31.6;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(BASE, 0, WHEEL.z + WHEEL.R + 22), ...k.boxCorners(MAILBOX, 0, MAILBOX_H + 14)], WIDTH, HEIGHT, { pad: 22, azimuth: 58 });
const { at, S, L, D, slab, front, right, flat } = tools(P);
const FY = (z) => G.frameAlong([0, -WHEEL.thick / 2, z], [0, 1, 0]);

// ---------------------------------------------------------------- socle, fourche, roue
function baseSvg() {
  const out = [], b = BASE, f = front(b.y + b.d), r = right(b.x + b.w);
  out.push(`<path class="iso-halo" d="${k.haloOf(b, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(k.insetPlan(b, 3), 0, 3, 3, 0.4), { tone: "lo" }));
  out.push(S(slab(b, 3, BASE_H - 3, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(b, 9, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(b, 4).map(([x, y]) => at([x, y, BASE_H])), { size: 0.42 }));
  out.push(display(f, flat(-40, 6, -8, 14, 1.2), { part: "today", x: -24, y: -9.6, size: 5, text: "00/00" }));
  out.push(display(f, flat(8, 6, 40, 14, 1.2), { part: "due", x: 24, y: -9.6, size: 5, text: "--/--" }));
  out.push(D([-44, -4, 4, 44].map((x) => at([x, b.y + b.d, 10])), { size: 0.34 }));
  const vents = []; for (let i = 0; i < 6; i++) vents.push(flat(-(b.y + 5 + i * 5.6) - 1, 4, -(b.y + 5 + i * 5.6) + 1, 15, 1, 3));
  out.push(`<g transform="${r}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  const t = k.topTicks(b.x + 8, b.x + b.w - 8, 6, 5, b.y + b.d - 7.8, BASE_H + 0.5, [1, 1.8], P);
  out.push(S(slab({ x: b.x + 6, y: b.y + b.d - 8, w: b.w - 12, d: 3.2, r: 0 }, BASE_H, 0.5, 2, 0), { tone: "lo", crease: "none" }), L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}
function armSvg(x) {
  const out = [], pl = { x: x - 3, y: -9, w: 6, d: 18, r: 1 }, top = WHEEL.z + WHEEL.R + 14;
  out.push(S(slab(pl, BASE_H, top - BASE_H, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(pl, 50, P, 3), { tone: "faint" }) }));
  out.push(S(slab({ x: x - 4, y: -10, w: 8, d: 20, r: 1 }, top, 3, 3, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: x - 4, y: -10, w: 8, d: 20, r: 1 }, BASE_H + 10, 2.4, 3, 0.4), { tone: "lo" }));
  out.push(D([at([x, 9, BASE_H + 5]), at([x, 9, top - 6]), at([x, -9, top - 6])], { size: 0.38 }));
  // Palier de l'axe : bague moletée.
  const F = G.frameAlong([x > 0 ? x - 3 : x + 3, 0, WHEEL.z], [x > 0 ? -1 : 1, 0, 0]);
  out.push(S(G.disc(0, 3, 7, F, P), { tone: "lo" }));
  return out.join("");
}
function wheelSvg() {
  const out = [], F = FY(WHEEL.z), R = WHEEL.R, T = WHEEL.thick;
  out.push(S(G.disc(0, T, R, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 0.1, T - 0.1, R, 72, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  // Face avant : couronne de graduations (un trait par mois, majeur par trimestre), moyeu et boulons.
  const Ff = G.frameAlong([0, T / 2, WHEEL.z], [0, 1, 0]);
  out.push(L(G.circleOf(Ff, 0, R - 5.4, P) + G.circleOf(Ff, 0, 11, P), { tone: "faint" }));
  const minor = [], major = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, long = i % 3 === 0; (long ? major : minor).push(k.segment([Math.sin(a) * (R - (long ? 8 : 6)), T / 2, WHEEL.z + Math.cos(a) * (R - (long ? 8 : 6))], [Math.sin(a) * (R - 5.4), T / 2, WHEEL.z + Math.cos(a) * (R - 5.4)], P)); }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(S(G.disc(0, 2, 10, Ff, P), { tone: "lo" }));
  out.push(S(G.disc(2, 3.4, 4, Ff, P), { tone: "hi" }));
  out.push(D(G.dotsOf(Ff, 2, 7, 6, P, { phase: Math.PI / 6, all: true }), { size: 0.4 }));
  return out.join("");
}
function pointersSvg() {
  const out = [], R = WHEEL.R, y = WHEEL.thick / 2 + 0.6;
  // Index d'aujourd'hui (fixe, en haut) et bras de relance (un mois devant), tous deux sur la couronne.
  out.push(S(slab({ x: -1.4, y: -3, w: 2.8, d: 7, r: 0.4 }, WHEEL.z + R + 3, 8, 2, 0.2), { tone: "hi", lit: true }));
  const a = LEAD_ANG * Math.PI / 180;
  out.push(`<g data-part="relay"></g>`);
  void a; void y;
  return out.join("");
}
function mailboxSvg() {
  const out = [], m = MAILBOX, f = front(m.y + m.d);
  out.push(S(slab({ x: m.x - 2, y: m.y - 2, w: m.w + 4, d: m.d + 4, r: 2.4 }, 0, 3, 3, 0.5), { tone: "lo" }));
  out.push(S(slab(m, 3, MAILBOX_H - 3, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(m, 14, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: m.x - 1.6, y: m.y - 1.6, w: m.w + 3.2, d: m.d + 3.2, r: 2.4 }, MAILBOX_H - 3, 3, 3, 0.5), { tone: "mid" }));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(m.x + 4, 22, m.x + m.w - 4, 26, 1.2, 3)}${flat(m.x + 6, 6, m.x + m.w - 6, 16, 1, 3)}"/></g>`);
  out.push(D([at([m.x + 3, m.y + m.d, 10]), at([m.x + m.w - 3, m.y + m.d, 10])], { size: 0.36 }));
  const [lx, ly] = at([m.x + m.w / 2, m.y + m.d, 30]);
  out.push(`<circle class="fig-lamp" data-part="mail-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  return out.join("");
}
function trayAndReader() {
  const out = [], t = INBOX, rd = READER, rf = front(rd.y + rd.d);
  out.push(S(slab(t, 0, 1.6, 3, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: t.x, y: t.y + t.d - 1.6, w: t.w, d: 1.6, r: 0.4 }, 1.6, INBOX_H - 1.6, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: t.x, y: t.y, w: 1.6, d: t.d, r: 0.4 }, 1.6, INBOX_H - 1.6, 2, 0.2), { tone: "mid" }));
  out.push(`<g data-part="inbox"></g>`);
  out.push(D([at([t.x + 3, t.y + t.d, INBOX_H - 2]), at([t.x + t.w - 3, t.y + t.d, INBOX_H - 2])], { size: 0.34 }));
  out.push(S(slab(rd, 0, 6, 3, 0.8), { tone: "mid" }));
  out.push(S(slab({ x: rd.x + 2, y: rd.y + 2, w: 3, d: 3, r: 0.5 }, 6, READER_H - 6, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: rd.x + rd.w - 5, y: rd.y + 2, w: 3, d: 3, r: 0.5 }, 6, READER_H - 6, 2, 0.3), { tone: "mid" }));
  out.push(`<g data-part="reading"></g>`);
  out.push(S(slab({ x: rd.x - 1, y: rd.y, w: rd.w + 2, d: rd.d - 2, r: 1.4 }, READER_H, 5, 3, 0.6), { tone: "mid", inner: L(k.sideSeam({ x: rd.x - 1, y: rd.y, w: rd.w + 2, d: rd.d - 2, r: 1.4 }, READER_H + 2.5, P, 3), { tone: "faint" }) }));
  const [lx, ly] = at([rd.x + rd.w / 2, rd.y + rd.d - 2, READER_H + 5.6]);
  out.push(S(k.cylinder(rd.x + rd.w / 2, rd.y + rd.d / 2 - 1, 2.6, READER_H + 5, 1.4, P, 18), { tone: "mid" }));
  out.push(`<circle class="fig-lamp" data-part="read-lamp" cx="${lx.toFixed(1)}" cy="${(ly - 1.6).toFixed(1)}" r="1.1"/>`);
  out.push(D([at([rd.x + 2, rd.y + rd.d, 3]), at([rd.x + rd.w - 2, rd.y + rd.d, 3])], { size: 0.34 }));
  void rf;
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une roue des échéances. Les plans de prévention quittent la corbeille, passent sous le lecteur qui relève leur échéance, puis s'insèrent en feuillets souples sur la roue, à l'angle de leur date ; la roue d'une année avance d'un cran par jour. Un bras de relance se tient un mois devant l'index d'aujourd'hui : chaque feuillet qui l'atteint envoie une lettre vers la boîte aux lettres.",
  body: [
    bench(P, PLATE, { strip: { x: -124, y: PLATE.y + PLATE.d - 13, w: 120, d: 7, r: 1 }, label: { x: 54, y: PLATE.y + PLATE.d - 17, w: 46, d: 11, r: 1.2 } }),
    trayAndReader(), baseSvg(), armSvg(ARMS[0]), wheelSvg(), `<g data-part="fan"></g>`, armSvg(ARMS[1]), pointersSvg(), mailboxSvg(), `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
${PAPER}
const INBOX = ${JSON.stringify(INBOX)}, READER = ${JSON.stringify(READER)}, READER_H = ${READER_H}, WHEEL = ${JSON.stringify(WHEEL)}, MAILBOX = ${JSON.stringify(MAILBOX)}, MAILBOX_H = ${MAILBOX_H}, LEAD_ANG = ${LEAD_ANG};
// Vrais chiffres : 10 min de contrôle et de saisie évitées par PP, 4 PP par jour (40 min),
// environ 225 jours par an à 104,74 €/h (≈ 15 700 €). Durées de validité et délai de relance illustratifs.
const PER_DAY = 4, MIN_PER_PP = 10, RATE = 104.74, DAYS = 225, MONTH = 19, LEAD = 20, DAY_S = 3;
const hash = (i) => { let h = Math.imul(i + 3, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const PP = []; for (let a = 1; a <= DAYS; a++) for (let q = 0; q < PER_DAY; q++) { const j = PP.length; PP.push({ j, a, q, e: a + 30 + Math.floor(hash(j) * 200) }); }
const dateOf = (n) => { const d = new Date(Date.UTC(2023, 0, 2 + (n - 1) + 2 * Math.floor((n - 1) / 5))); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); };
let clock = 40 * DAY_S, touring = true, idle = 0;
const parts = { inbox: $("inbox"), reading: $("reading"), fan: $("fan"), relay: $("relay"), air: $("air"), due: $("due"), today: $("today"), lamp: $("read-lamp"), mail: $("mail-lamp") };
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
const DEG = Math.PI / 180, ANG = 30 / MONTH;                          // un jour = 1,58 degré sur la roue
function state(day, frac) {
  const filed = (p) => p.a < day || (p.a === day && frac >= (p.q + 1) * 0.15 + 0.05);
  const active = PP.filter((p) => filed(p) && p.e >= day);
  const relanced = PP.filter((p) => filed(p) && p.e - LEAD <= day - (frac < 0.8 ? 1 : 0)).length;
  return { active, relanced, done: PP.filter(filed).length };
}
// Un feuillet de la roue : planté à l'angle de sa date, penché par la rotation, il ondule quand la roue avance.
function rimPoint(ang, r, y = 0) { const a = ang * DEG; return [Math.sin(a) * r, y, WHEEL.z + Math.cos(a) * r]; }
function fanSheet(ang, i, now, spin) {
  const L0 = 12, a = ang * DEG, d = [Math.sin(a), 0, Math.cos(a)], c = rimPoint(ang, WHEEL.R + 1 + L0 / 2);
  const tilt = 0.08 + 0.05 * Math.sin(i * 2.3);
  return paperSvg(paperRows({ c, d, w: [0, 1, 0], L: L0, W: 8, curl: tilt * (i % 2 ? 1 : -1) + spin * 0.12, wave: 0.5 + spin * 1.2, roll: 0.3, ph: i * 1.9, t: now, NT: 5 }), { lines: false, head: true });
}
function wheelSvgSheets(day, frac, st, now) {
  const dayf = day - 1 + frac, spin = Math.abs(Math.sin(frac * Math.PI)) * 0.4;
  // Au plus cinq feuillets par secteur d'un mois, aux dates réelles, du plus lointain au plus proche (ordre de peinture).
  const sectors = Array.from({ length: 12 }, () => []);
  for (const p of st.active) { const dd = p.e - dayf, s = Math.floor(dd / MONTH); if (s >= 0 && s < 12) sectors[s].push(p); }
  const list = [];
  sectors.forEach((arr) => { arr.sort((a, b) => a.e - b.e); const n = Math.min(5, arr.length); for (let i = 0; i < n; i++) { const p = arr[Math.floor((i + 0.5) / n * arr.length)]; list.push({ p, ang: (p.e - dayf) * ANG }); } });
  list.sort((a, b) => Math.cos(a.ang * DEG) - Math.cos(b.ang * DEG));
  return list.map((q, i) => fanSheet(q.ang, q.p.j, now, spin)).join("");
}
function draw(now) {
  const day = Math.min(DAYS, Math.floor(clock / DAY_S) + 1), frac = clock / DAY_S - (day - 1);
  const st = state(day, frac);
  html(parts.fan, wheelSvgSheets(day, frac, st, now));
  const due = PP.filter((p) => p.e - LEAD === day), firing = frac >= 0.8 && due.length > 0;
  // Bras de relance : une lame lumineuse posée sur la couronne, un mois devant l'index.
  html(parts.relay, solidSvg(slabOf({ x: Math.sin(LEAD_ANG * DEG) * (WHEEL.R + 3) - 1.2, y: -3, w: 2.4, d: 7, r: 0.3 }, WHEEL.z + Math.cos(LEAD_ANG * DEG) * (WHEEL.R + 3) - 3, 6, P, 2, 0.1), firing ? { tone: "hi", lit: true } : { tone: "mid" }));
  const waiting = PER_DAY - Math.min(PER_DAY, Math.floor(Math.max(0, frac - 0.05) / 0.15));
  html(parts.inbox, Array.from({ length: waiting }, (_, i) => paperSvg(paperRows({ c: [INBOX.x + 17, INBOX.y + 12, 2 + i * 1.1], d: [1, 0, 0], w: [0, 1, 0], L: 22, W: 16, curl: 0.05 * (i % 2 ? 1 : -1), wave: 0.3, ph: i * 2, t: now, NT: 6 }), { head: true })).join(""));
  const q = Math.floor((frac - 0.05) / 0.15), u = (frac - 0.05) / 0.15 - q;
  let reading = "", air = "", shown = "--/--";
  if (frac >= 0.05 && q < PER_DAY && day <= DAYS) {
    const p = PP[(day - 1) * PER_DAY + q], start = [INBOX.x + 17, INBOX.y + 12, 2 + (PER_DAY - q - 1) * 1.1], read = [READER.x + READER.w / 2, READER.y + READER.d / 2, READER_H + 0.8];
    const sheet = (c, curl, wave, lit) => paperSvg(paperRows({ c, d: [1, 0, 0], w: [0, 1, 0], L: 22, W: 16, curl, wave, roll: wave * 0.6, ph: p.j, t: now, NT: 8 }), { head: true, lit });
    if (u < 0.3) { const v = ease(u / 0.3); reading = sheet(start.map((s, i) => s + (read[i] - s) * v), -0.06 * Math.sin(v * Math.PI) + 0.03, 1.1 * Math.sin(v * Math.PI), true); }
    else if (u < 0.6) { reading = sheet(read, 0.02, 0.2, true); shown = dateOf(p.e); }
    else {
      const v = ease((u - 0.6) / 0.4), ang = (p.e - (day - 1 + frac)) * ANG, to = rimPoint(ang, WHEEL.R + 8);
      air = sheet([read[0] + (to[0] - read[0]) * v, read[1] + (to[1] - read[1]) * v, read[2] + (to[2] - read[2]) * v + 16 * Math.sin(v * Math.PI)], -0.08 * Math.sin(v * Math.PI), 1.4 * Math.sin(v * Math.PI), true);
      shown = dateOf(p.e);
    }
  }
  // Relances du jour : une lettre souple par dossier atteint, qui monte du bras vers la boîte aux lettres.
  if (firing) {
    const v = ease((frac - 0.8) / 0.2), from = rimPoint(LEAD_ANG, WHEEL.R + 5), to = [MAILBOX.x + MAILBOX.w / 2, MAILBOX.y + MAILBOX.d / 2, MAILBOX_H + 1];
    air += due.slice(0, 3).map((_, i) => { const c = [from[0] + (to[0] - from[0]) * v + i * 3, from[1] + (to[1] - from[1]) * v, from[2] + (to[2] - from[2]) * v + 24 * Math.sin(v * Math.PI) + i * 2]; return '<g opacity="' + (1 - 0.5 * v).toFixed(2) + '">' + paperSvg(paperRows({ c, d: [1, 0, 0], w: [0, 1, 0], L: 14, W: 9, curl: -0.07 * Math.sin(v * Math.PI), wave: 1 * Math.sin(v * Math.PI), roll: 0.7, ph: i * 2, t: now, NT: 6 }), { flap: true, lines: false }) + "</g>"; }).join("");
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
    { mark: "lit", label: "Le plan lu et le bras de relance, un mois devant aujourd'hui" },
    { mark: "raised", label: "Roue : un tour pour une année d'échéances ; boîte aux lettres : les relances" },
  ],
  caption: "Chaque plan de prévention déposé est lu, son échéance contrôlée, puis il est classé avec son lien dans le suivi ; les échéances déclenchent les relances sans bloquer le processus. Le contrôle et la saisie évités valent 10 min par PP, soit 40 min par jour : sur environ 225 jours, ≈ 15 700 € par an à 104,74 €/h. Durées de validité et délai de relance illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Chaîne des PP : flèches gauche et droite pour avancer dans les jours" aria-valuemin="1" aria-valuemax="225" aria-valuenow="40">${svg}</div>`,
});

writeFigure("pp", { title: "Chaîne des PP · roue des échéances", plate, live });
