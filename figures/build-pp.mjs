// Fig 07 · Power Automate, chaîne des PP : un classeur à dossiers suspendus rangés par échéance.
// node figures/build-pp.mjs  →  figures/pp.html
// Chaque jour, quatre plans de prévention quittent la corbeille d'arrivée, passent sous le lecteur
// qui relève leur échéance, puis rejoignent la section du mois où ils expirent. Le curseur de relance
// glisse sur le rail un mois devant aujourd'hui : chaque dossier qu'il atteint envoie son mail.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 380;
const PLATE = { x: -124, y: -42, w: 252, d: 100, r: 8 };
const INBOX = { x: -114, y: 20, w: 30, d: 22, r: 1.4 }, INBOX_H = 6;
const READER = { x: -110, y: -26, w: 30, d: 30, r: 2 }, READER_H = 12, BRIDGE_Z = 34;
const DRAWER = { x: -60, y: -32, w: 140, d: 50, r: 2 }, DRAWER_H = 16, WALL = 1.6;
const SEC = { x0: DRAWER.x + 4, y0: DRAWER.y + 5, d: DRAWER.d - 10, h: 15, per: 0.18, divider: 1.2 };
const RAIL_Z = DRAWER_H + 1, MAILBOX = { x: 92, y: -38, w: 24, d: 18, r: 1.6 }, MAILBOX_H = 30;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [READER.x, READER.y, BRIDGE_Z + 8], [MAILBOX.x + MAILBOX.w, MAILBOX.y, MAILBOX_H + 4], [DRAWER.x, DRAWER.y, DRAWER_H + 12]], WIDTH, HEIGHT, { pad: 22, azimuth: 52, elevation: 38 });
const { at, S, L, D, slab, front, right, flat } = tools(P);

// ---------------------------------------------------------------- arrivée et lecteur
function inboxSvg() {
  const out = [], t = INBOX;
  out.push(S(slab(t, 0, 1.4, 3, 0.3), { tone: "lo" }));
  out.push(S(slab({ x: t.x, y: t.y, w: t.w, d: 1.4, r: 0.4 }, 1.4, INBOX_H - 1.4, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: t.x, y: t.y, w: 1.4, d: t.d, r: 0.4 }, 1.4, INBOX_H - 1.4, 2, 0.2), { tone: "mid" }));
  out.push(`<g data-part="inbox"></g>`);
  out.push(S(slab({ x: t.x, y: t.y + t.d - 1.4, w: t.w, d: 1.4, r: 0.4 }, 1.4, INBOX_H - 1.4, 2, 0.2), { tone: "mid" }));
  return out.join("");
}
function readerSvg(part) {
  const out = [], r = READER;
  if (part === "base") {
    out.push(S(slab(r, 0, READER_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(r, 3, P, 4), { tone: "faint" }) }));
    out.push(L(k.planOutline({ x: r.x + 4, y: r.y + 5, w: r.w - 8, d: r.d - 10, r: 1 }, READER_H, P, 3), { tone: "lo" }));
    // Montants arrière de la passerelle de lecture.
    for (const x of [r.x + 2, r.x + r.w - 6]) out.push(S(slab({ x, y: r.y + 1, w: 4, d: 4, r: 0.6 }, READER_H, BRIDGE_Z - READER_H, 2, 0.3), { tone: "mid" }));
    return out.join("");
  }
  // Passerelle, tête de lecture et lampe ; afficheur de l'échéance sur la face avant.
  for (const x of [r.x + 2, r.x + r.w - 6]) out.push(S(slab({ x, y: r.y + r.d - 5, w: 4, d: 4, r: 0.6 }, READER_H, BRIDGE_Z - READER_H, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: r.x, y: r.y + 1, w: r.w, d: r.d - 2, r: 1.4 }, BRIDGE_Z, 4, 3, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: r.x + 9, y: r.y + 9, w: 12, d: 12, r: 1.4 }, BRIDGE_Z - 5, 5, 3, 0.4), { tone: "lo" }));
  out.push(D(k.corners({ x: r.x, y: r.y + 1, w: r.w, d: r.d - 2 }, 2.2).map(([x, y]) => at([x, y, BRIDGE_Z + 4])), { size: 0.42 }));
  out.push(display(front(r.y + r.d), flat(r.x + 3, 3, r.x + r.w - 3, 9.5, 1), { part: "due", x: r.x + r.w / 2, y: -4.4, size: 5, text: "--/--" }));
  const [lx, ly] = at([r.x + r.w - 4, r.y + r.d - 4, BRIDGE_Z + 4]);
  out.push(`<circle class="fig-lamp" data-part="read-lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.3"/>`);
  return out.join("");
}

// ---------------------------------------------------------------- classeur
function drawerSvg(part) {
  const out = [], d = DRAWER;
  if (part === "back") {
    out.push(`<path class="iso-halo" d="${k.haloOf(d, 0, 2, P)}" style="filter:blur(3px)"/>`);
    out.push(S(slab(d, 0, 2, 3, 0.4), { tone: "lo" }));
    out.push(S(slab({ x: d.x, y: d.y, w: d.w, d: WALL, r: 0.5 }, 2, DRAWER_H - 2, 2, 0.3), { tone: "mid" }));
    out.push(S(slab({ x: d.x, y: d.y, w: WALL, d: d.d, r: 0.5 }, 2, DRAWER_H - 2, 2, 0.3), { tone: "mid" }));
    // Rail arrière des dossiers suspendus.
    out.push(S(slab({ x: d.x + 1, y: d.y + 2, w: d.w - 2, d: 1.4, r: 0.4 }, RAIL_Z - 2, 2, 2, 0.2), { tone: "mid" }));
    return out.join("");
  }
  out.push(S(slab({ x: d.x + d.w - WALL, y: d.y, w: WALL, d: d.d, r: 0.5 }, 2, DRAWER_H - 2, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: d.x, y: d.y + d.d - WALL, w: d.w, d: WALL, r: 0.5 }, 2, DRAWER_H - 2, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: d.x + 1, y: d.y + d.d - 3.4, w: d.w - 2, d: 1.4, r: 0.4 }, RAIL_Z - 2, 2, 2, 0.2), { tone: "mid" }));
  // Règle des mois sur la face avant, porte-étiquette et poignée sur le flanc droit.
  const f = front(d.y + d.d), ticks = [];
  const n = Math.floor((d.w - 8) / 4.8);
  for (let i = 0; i <= n; i++) ticks.push(`M${d.x + 4 + i * 4.8} ${-(DRAWER_H - 3)}v${i % 5 ? 2 : 3.4}`);
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="M${d.x + 4} ${-(DRAWER_H - 3)}h${n * 4.8}${ticks.join("")}"/></g>`);
  const side = right(d.x + d.w);
  out.push(`<g transform="${side}"><path class="iso-line" data-tone="lo" d="${flat(-d.y - d.d + 10, 2.6, -d.y - 10, 13.4, 1.2, 3)}"/></g>`);
  out.push(display(side, flat(-d.y - d.d + 12, 4.6, -d.y - 12, 11.4, 0.8), { part: "today", x: -d.y - d.d / 2, y: -6.2, size: 5.2, text: "02/01" }));
  return out.join("");
}
// Boîte aux lettres des relances.
function mailboxSvg() {
  const out = [], m = MAILBOX;
  out.push(S(slab({ x: m.x + m.w / 2 - 3, y: m.y + m.d / 2 - 3, w: 6, d: 6, r: 1 }, 0, 14, 2, 0.4), { tone: "mid" }));
  out.push(S(slab({ x: m.x + m.w / 2 - 7, y: m.y + m.d / 2 - 7, w: 14, d: 14, r: 1.4 }, 0, 2, 2, 0.4), { tone: "lo" }));
  out.push(S(slab(m, 14, MAILBOX_H - 14, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(m, 18, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline({ x: m.x + 5, y: m.y + m.d / 2 - 1.2, w: m.w - 10, d: 2.4, r: 0.8 }, MAILBOX_H, P, 3), { tone: "lo" }));
  out.push(D(k.corners(m, 2.4).map(([x, y]) => at([x, y, MAILBOX_H])), { size: 0.4 }));
  out.push(`<g data-part="mailbox-count"></g>`);
  return out.join("");
}

// Dossier couché (en transit), origine au coin bas.
const folderFlat = () => k.solidSvg(k.slabOf({ x: 0, y: 0, w: 22, d: 16, r: 0.6 }, 0, 1, P, 2, 0.2), { tone: "hi", inner: k.lineSvg(k.lineOnTop([3, 4], [14, 4], 1, P) + k.lineOnTop([3, 7], [18, 7], 1, P) + k.lineOnTop([3, 10], [11, 10], 1, P), { tone: "lo", free: true }) });
const envelope = () => k.solidSvg(k.slabOf({ x: -6, y: -4, w: 12, d: 8, r: 0.4 }, 0, 0.8, P, 2, 0.2), { tone: "hi", inner: k.lineSvg(k.onTop([[-5.6, -3.7], [0, 0.6], [5.6, -3.7]], 0.8, P), { tone: "lo" }) });

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Une corbeille d'arrivée, un lecteur à passerelle, un classeur ouvert à dossiers suspendus rangés par mois d'échéance, et une boîte aux lettres. Chaque plan de prévention passe sous le lecteur, qui affiche son échéance, puis rejoint la section de son mois. Un curseur glisse sur le rail un mois devant aujourd'hui ; chaque dossier qu'il atteint envoie un mail de relance.",
  body: [
    bench(P, PLATE, { strip: { x: -60, y: PLATE.y + PLATE.d - 11, w: 110, d: 7, r: 1 }, label: { x: 64, y: PLATE.y + PLATE.d - 14, w: 46, d: 10, r: 1.2 } }),
    inboxSvg(), readerSvg("base"), `<g data-part="reading"></g>`, readerSvg("bridge"),
    drawerSvg("back"), `<g data-part="sections"></g>`, `<g data-part="rider"></g>`, drawerSvg("front"),
    mailboxSvg(), `<g data-part="air"></g>`,
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const INBOX = ${JSON.stringify(INBOX)}, INBOX_H = ${INBOX_H}, READER = ${JSON.stringify(READER)}, READER_H = ${READER_H}, DRAWER = ${JSON.stringify(DRAWER)}, SEC = ${JSON.stringify(SEC)}, RAIL_Z = ${RAIL_Z}, MAILBOX = ${JSON.stringify(MAILBOX)}, MAILBOX_H = ${MAILBOX_H};
const FOLDER = ${JSON.stringify(folderFlat())}, ENVELOPE = ${JSON.stringify(envelope())};
${LOOP}
// Vrais chiffres : 10 min de contrôle et de saisie évitées par PP, 4 PP par jour (40 min),
// environ 225 jours par an à 104,74 €/h (≈ 15 700 €). Durées de validité et délai de relance illustratifs.
const PER_DAY = 4, MIN_PER_PP = 10, RATE = 104.74, DAYS = 225, MONTH = 19, LEAD = 20, DAY_S = 3;
const hash = (i) => { let h = Math.imul(i + 3, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
// Plans de prévention : arrivée (jour ouvré), échéance (jour ouvré), lu un par un.
const PP = []; for (let a = 1; a <= DAYS; a++) for (let q = 0; q < PER_DAY; q++) { const j = PP.length; PP.push({ j, a, q, e: a + 30 + Math.floor(hash(j) * 200) }); }
// Jour ouvré → date (cinq jours par semaine depuis le lundi 2 janvier).
const dateOf = (n) => { const d = new Date(Date.UTC(2023, 0, 2 + (n - 1) + 2 * Math.floor((n - 1) / 5))); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); };
const monthOf = (n) => Math.floor((n - 1) / MONTH);
let clock = 40 * DAY_S, touring = true, idle = 0, sig = "";
const parts = { inbox: $("inbox"), reading: $("reading"), sections: $("sections"), rider: $("rider"), air: $("air"), due: $("due"), today: $("today"), lamp: $("read-lamp") };
const ease = (u) => (u = Math.max(0, Math.min(1, u)), u * u * (3 - 2 * u));
// État d'un jour : dossiers classés et actifs, relances envoyées jusqu'ici.
function state(day, frac) {
  const filed = (p) => p.a < day || (p.a === day && frac >= (p.q + 1) * 0.15 + 0.05);
  const active = PP.filter((p) => filed(p) && p.e >= day);
  const relanced = PP.filter((p) => filed(p) && p.e - LEAD <= day - (frac < 0.8 ? 1 : 0)).length;
  const done = PP.filter(filed).length;
  return { active, relanced, done };
}
// Sections du classeur : douze mois d'échéance à partir du mois en cours.
function layout(day, active) {
  const m0 = monthOf(day), counts = Array(12).fill(0);
  for (const p of active) { const k = monthOf(p.e) - m0; if (k >= 0 && k < 12) counts[k]++; }
  let x = SEC.x0; const secs = counts.map((n, k) => { const s = { k, n, x, w: n * SEC.per }; x += s.w + SEC.divider + 1.2; return s; });
  return secs;
}
function sectionSvg(s, lit) {
  let out = "";
  // Intercalaire du mois : plaque et onglet qui dépasse au-dessus des dossiers.
  out += solidSvg(slabOf({ x: s.x, y: SEC.y0, w: SEC.divider, d: SEC.d, r: 0.3 }, 3, SEC.h + 2, P, 2, 0.1), { tone: "mid" });
  out += solidSvg(slabOf({ x: s.x, y: SEC.y0 + 2 + (s.k % 3) * 9, w: SEC.divider, d: 8, r: 0.4 }, SEC.h + 5, 4, P, 2, 0.1), { tone: lit ? "hi" : "mid", lit });
  if (s.n) {
    const x = s.x + SEC.divider + 0.6, seams = [];
    for (let i = 5; i < s.n; i += 5) seams.push(lineOnTop([x + i * SEC.per, SEC.y0 + 1], [x + i * SEC.per, SEC.y0 + SEC.d - 1], 3 + SEC.h, P));
    out += solidSvg(slabOf({ x, y: SEC.y0 + 1, w: s.w, d: SEC.d - 2, r: 0.2 }, 3, SEC.h, P, 2, 0.1), { tone: "hi", inner: lineSvg(seams.join(""), { tone: "faint" }) });
  }
  return out;
}
function draw() {
  const day = Math.min(DAYS, Math.floor(clock / DAY_S) + 1), frac = clock / DAY_S - (day - 1);
  const st = state(day, frac), secs = layout(day, st.active);
  // Curseur de relance : un mois devant aujourd'hui, à sa place dans la section correspondante.
  const target = day + LEAD, k = monthOf(target) - monthOf(day), within = ((target - 1) % MONTH) / MONTH, sec = secs[Math.min(11, k)];
  const rx = sec.x + SEC.divider + 0.6 + sec.w * within;
  const due = PP.filter((p) => p.e - LEAD === day);
  const firing = frac >= 0.8 && due.length > 0;
  const s = day + "|" + Math.floor(frac / 0.05) + "|" + firing;
  if (s !== sig) {
    parts.sections.innerHTML = secs.map((x) => sectionSvg(x, false)).join("");
    parts.rider.innerHTML = solidSvg(slabOf({ x: rx - 0.6, y: DRAWER.y + 2, w: 1.2, d: DRAWER.d - 4, r: 0.3 }, RAIL_Z + 1, 1.4, P, 2, 0), { tone: "hi", lit: true }) + solidSvg(slabOf({ x: rx - 3, y: DRAWER.y + DRAWER.d - 5, w: 6, d: 4.4, r: 0.8 }, RAIL_Z - 1, 5, P, 2, 0.4), { tone: "hi", lit: true }) + solidSvg(slabOf({ x: rx - 0.8, y: DRAWER.y + DRAWER.d - 3.6, w: 1.6, d: 1.6, r: 0.3 }, RAIL_Z + 4, 9, P, 2, 0.2), { tone: "hi", lit: true });
    sig = s;
  }
  // Corbeille : les plans du jour encore à lire.
  const waiting = PER_DAY - Math.min(PER_DAY, Math.floor(Math.max(0, frac - 0.05) / 0.15));
  parts.inbox.innerHTML = Array.from({ length: waiting }, (_, i) => '<g transform="' + translateAlong(P, [INBOX.x + 4, INBOX.y + 3, 1.4 + i * 1.1]) + '">' + FOLDER + "</g>").join("");
  // Le plan en cours : lecture sous la passerelle, puis vol jusqu'à sa section.
  const q = Math.floor((frac - 0.05) / 0.15), u = (frac - 0.05) / 0.15 - q;
  let reading = "", air = "", shown = "--/--";
  if (frac >= 0.05 && q < PER_DAY && day <= DAYS) {
    const p = PP[(day - 1) * PER_DAY + q], start = [INBOX.x + 4, INBOX.y + 3, 1.4 + (PER_DAY - q - 1) * 1.1], read = [READER.x + 4, READER.y + 7, READER_H];
    if (u < 0.3) reading = '<g transform="' + translateAlong(P, start.map((v, i) => v + (read[i] - v) * ease(u / 0.3))) + '">' + FOLDER + "</g>";
    else if (u < 0.6) { reading = '<g transform="' + translateAlong(P, read) + '">' + FOLDER + "</g>"; shown = dateOf(p.e); }
    else {
      const v = ease((u - 0.6) / 0.4), kk = monthOf(p.e) - monthOf(day), dest = secs[Math.min(11, Math.max(0, kk))], to = [dest.x + dest.w, SEC.y0 + 6, SEC.h + 6];
      air = '<g transform="' + translateAlong(P, [read[0] + (to[0] - read[0]) * v, read[1] + (to[1] - read[1]) * v, read[2] + (to[2] - read[2]) * v + 24 * Math.sin(v * Math.PI)]) + '">' + FOLDER + "</g>";
      shown = dateOf(p.e);
    }
  }
  // Relances du jour : un mail par dossier atteint, qui monte vers la boîte aux lettres.
  if (firing) {
    const v = ease((frac - 0.8) / 0.2), from = [rx, DRAWER.y + DRAWER.d / 2, RAIL_Z + 3], to = [MAILBOX.x + MAILBOX.w / 2, MAILBOX.y + MAILBOX.d / 2, MAILBOX_H + 1];
    air += due.slice(0, 3).map((_, i) => '<g transform="' + translateAlong(P, [from[0] + (to[0] - from[0]) * v + i * 3, from[1] + (to[1] - from[1]) * v, from[2] + (to[2] - from[2]) * v + 30 * Math.sin(v * Math.PI) + i * 2]) + '" opacity="' + (1 - Math.max(0, v - 0.85) / 0.15).toFixed(2) + '">' + ENVELOPE + "</g>").join("");
  }
  parts.reading.innerHTML = reading; parts.air.innerHTML = air;
  if (parts.due.textContent !== shown) parts.due.textContent = shown;
  const today = dateOf(day); if (parts.today.textContent !== today) parts.today.textContent = today;
  parts.lamp.dataset.on = String(shown !== "--/--" && u >= 0.3 && u < 0.6);
  const mins = st.done * MIN_PER_PP, h = Math.floor(mins / 60), mm = mins % 60;
  say("Jour " + day + " · " + st.done + " PP classés · " + st.relanced + " relance" + (st.relanced > 1 ? "s" : "") + " · " + h + " h" + (mm ? " " + String(mm).padStart(2, "0") : "") + " · " + fr(mins / 60 * RATE) + " €");
}
const run = loop((dt, calm) => {
  if (calm) clock = 120 * DAY_S;
  else if (touring) { clock += dt; if (clock >= DAYS * DAY_S) clock = 40 * DAY_S; }
  draw();
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); clock = Math.max(0, Math.min(DAYS * DAY_S - 0.01, next)); run(); };
dragX(() => clock, (v, share) => steer(v + share * 150 * DAY_S));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: clock + 10 * DAY_S, ArrowLeft: clock - 10 * DAY_S, Home: 0, End: DAYS * DAY_S - 0.01 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(to); }
});
// Accès de vérification (captures).
window.__fig = { at: (day, frac) => { touring = false; clock = (day - 1 + frac) * DAY_S; draw(); return readout.textContent; }, due: (d) => PP.filter((p) => p.e - LEAD === d).length };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 07",
  title: "Chaîne des PP",
  hint: "Glisse ou ← → : jours",
  readout: "Jour 40",
  keys: [
    { mark: "lit", label: "Le curseur de relance, un mois devant aujourd'hui" },
    { mark: "raised", label: "Sections du classeur : un mois d'échéance chacune, épaisses du nombre de PP suivis" },
  ],
  caption: "Chaque plan de prévention déposé est lu, son échéance contrôlée, puis il est classé avec son lien dans le suivi ; les échéances déclenchent les relances sans bloquer le processus. Le contrôle et la saisie évités valent 10 min par PP, soit 40 min par jour : sur environ 225 jours, ≈ 15 700 € par an à 104,74 €/h. Durées de validité et délai de relance illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Chaîne des PP : flèches gauche et droite pour avancer de dix jours" aria-valuemin="1" aria-valuemax="225" aria-valuenow="40">${svg}</div>`,
});

writeFigure("pp", { title: "Chaîne des PP · classeur à échéances", plate, live });
