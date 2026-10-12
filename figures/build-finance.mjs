// Fig 06 · Point financier : cinq manomètres à contact sur un tableau.
// node figures/build-finance.mjs  →  figures/finance.html
// Chaque manomètre lit la consommation d'un périmètre (dépenses / fonds) : CS, Locatif, MEC,
// PPTM et GLOBAL. L'index réglable marque le seuil lu dans Excel ; quand l'aiguille l'atteint,
// le contact se ferme et une enveloppe d'alerte préventive sort ; au-delà de 100 %, une seconde
// enveloppe signale le dépassement. Les enveloppes restent dans le bac : pas d'alerte en double.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 600, HEIGHT = 380;
const PLATE = { x: -150, y: -32, w: 300, d: 84, r: 8 };
const PANEL = { x: -138, y: -8, w: 276, d: 8, r: 1.6 }, PANEL_Z = [22, 104];
const GAUGES = [{ x: -104, r: 17 }, { x: -60, r: 17 }, { x: -16, r: 17 }, { x: 28, r: 17 }, { x: 84, r: 23 }];
const GZ = 72, CASE_D = 7, SLOT_Z = 30, LAMP_Z = 39;
const SWEEP = { from: -0.75 * Math.PI, span: 1.5 * Math.PI, max: 1.2 };   // 0 à 120 %
const TRAY = { x: -128, y: 6, w: 256, d: 24, r: 2 }, TRAY_H = 7;
const KNOB = { x: 124, z: 42, r: 6 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(PANEL, PANEL_Z[0], PANEL_Z[1] + 6), [GAUGES[4].x, CASE_D, GZ + GAUGES[4].r + 4]],
  WIDTH, HEIGHT, { pad: 20, azimuth: 66 },
);
const { at, S, L, D, slab, front, flat } = tools(P);
const Y = [0, 1, 0];
const angleOf = (ratio) => SWEEP.from + (Math.min(ratio, SWEEP.max) / SWEEP.max) * SWEEP.span;

// ---------------------------------------------------------------- tableau
function panelSvg() {
  const out = [], f = front(0);
  for (const x of [-120, 112]) {
    out.push(S(slab({ x: x - 6, y: -20, w: 20, d: 24, r: 2 }, 0, 3, 3, 0.5), { tone: "lo" }));
    out.push(D(k.corners({ x: x - 6, y: -20, w: 20, d: 24 }, 2.4).map(([px, py]) => at([px, py, 3])), { size: 0.42 }));
    out.push(S(slab({ x, y: -14, w: 8, d: 6, r: 1 }, 3, PANEL_Z[0] - 3, 3, 0.4), { tone: "mid" }));
  }
  out.push(S(slab(PANEL, PANEL_Z[0], PANEL_Z[1] - PANEL_Z[0], 4, 0.8), { tone: "mid", inner: L(k.sideSeam(PANEL, PANEL_Z[0] + 4, P, 4), { tone: "faint" }) }));
  out.push(S(slab({ x: PANEL.x - 2, y: PANEL.y - 1, w: PANEL.w + 4, d: PANEL.d + 4, r: 1.4 }, PANEL_Z[1], 3, 3, 0.5), { tone: "mid" }));
  out.push(D([[PANEL.x + 4, PANEL_Z[0] + 4], [PANEL.x + PANEL.w - 4, PANEL_Z[0] + 4], [PANEL.x + 4, PANEL_Z[1] - 4], [PANEL.x + PANEL.w - 4, PANEL_Z[1] - 4]].map(([x, z]) => at([x, 0, z])), { size: 0.45 }));
  // Fentes d'enveloppe et voyants de contact sous chaque manomètre.
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${GAUGES.map((g) => flat(g.x - 9, SLOT_Z - 1.4, g.x + 9, SLOT_Z + 1.4, 1.2, 3)).join("")}"/>`);
  out.push(GAUGES.map((g) => `<circle class="iso-line" data-tone="lo" cx="${g.x}" cy="${-LAMP_Z}" r="3" fill="none"/>`).join("") + `</g>`);
  GAUGES.forEach((g, i) => { const [lx, ly] = at([g.x, 0, LAMP_Z]); out.push(`<circle class="fig-lamp" data-part="lamp-${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.8"/>`); });
  // Bouton du seuil, commun aux cinq index : il représente la cellule lue dans Excel.
  const F = G.frameAlong([KNOB.x, 0, KNOB.z], Y);
  out.push(S(G.disc(0, 1, KNOB.r + 1.6, F, P), { tone: "lo" }));
  out.push(S(G.disc(1, 6, KNOB.r, F, P), { tone: "mid", inner: L(G.ribsOf(F, 1.2, 5.8, KNOB.r, 26, P), { tone: "faint" }) }));
  out.push(`<g data-part="knob-mark"></g>`);
  return out.join("");
}
function gaugeSvg(g, i) {
  const out = [], F = G.frameAlong([g.x, 0, GZ], Y), f = front(CASE_D + 0.6);
  out.push(S(G.disc(0, CASE_D - 1.6, g.r + 2.4, F, P), { tone: "mid", inner: L(G.ribsOf(F, 0.6, CASE_D - 2.2, g.r + 2.4, 8, P, { phase: Math.PI / 8 }), { tone: "faint" }) }));
  out.push(S(G.disc(CASE_D - 1.6, CASE_D + 0.6, g.r + 2.8, F, P), { tone: "mid" }));
  // Cadran : graduations tous les 5 %, majeures tous les 20 %, la zone au-delà de 100 % hachurée.
  const minor = [], major = [], ring100 = [];
  for (let p = 0; p <= 120; p += 5) {
    const a = angleOf(p / 100), big = p % 20 === 0, r0 = g.r - (big ? 4 : 2.4), r1 = g.r - 0.6;
    (big ? major : minor).push(`M${(g.x + Math.sin(a) * r0).toFixed(2)} ${(-(GZ + Math.cos(a) * r0)).toFixed(2)}L${(g.x + Math.sin(a) * r1).toFixed(2)} ${(-(GZ + Math.cos(a) * r1)).toFixed(2)}`);
  }
  for (let s = 0; s <= 12; s++) { const a = angleOf(1 + (s / 12) * 0.2), r = g.r - 1.4; ring100.push([g.x + Math.sin(a) * r, -(GZ + Math.cos(a) * r)]); }
  out.push(`<g transform="${f}"><circle class="iso-fill fig-window" cx="${g.x}" cy="${-GZ}" r="${g.r}"/><circle class="iso-line" data-tone="lo" cx="${g.x}" cy="${-GZ}" r="${g.r}" fill="none"/>`);
  out.push(`<path class="iso-line" data-tone="faint" d="${minor.join("")}"/><path class="iso-line" data-tone="mid" d="${major.join("")}"/>`);
  out.push(`<path class="iso-line" data-tone="hi" d="M${ring100.map(([x, y]) => x.toFixed(2) + " " + y.toFixed(2)).join("L")}" style="stroke-width:1.6"/>`);
  out.push(`<path class="fig-index" data-part="index-${i}" d=""/><path class="iso-line" data-tone="hi" data-part="needle-${i}" d="" style="stroke-width:1.1"/><circle class="iso-dot" cx="${g.x}" cy="${-GZ}" r="1.4"/></g>`);
  // Vis de lunette.
  out.push(D(G.dotsOf(F, CASE_D + 0.6, g.r + 1.6, 4, P, { phase: Math.PI / 4, all: true }), { size: 0.4 }));
  return out.join("");
}

// ---------------------------------------------------------------- bac des alertes envoyées
function traySvg(part) {
  const out = [], t = TRAY, wall = 1.4;
  if (part === "back") {
    out.push(S(slab(t, 0, 1.4, 3, 0.3), { tone: "lo" }));
    out.push(S(slab({ x: t.x, y: t.y, w: t.w, d: wall, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
    out.push(S(slab({ x: t.x, y: t.y, w: wall, d: t.d, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
    // Séparateurs : un compartiment par périmètre.
    for (const g of GAUGES.slice(0, 4)) out.push(S(slab({ x: g.x + 21, y: t.y + wall, w: 1.2, d: t.d - wall * 2, r: 0.3 }, 1.4, TRAY_H - 2.6, 2, 0.1), { tone: "mid" }));
    return out.join("");
  }
  out.push(S(slab({ x: t.x + t.w - wall, y: t.y, w: wall, d: t.d, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: t.x, y: t.y + t.d - wall, w: t.w, d: wall, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
  out.push(D(GAUGES.map((g) => at([g.x, t.y + t.d, TRAY_H - 2.4])), { size: 0.4 }));
  return out.join("");
}

// Enveloppe couchée, centrée à l'origine ; le dépassement porte une bande.
function envelopeSvg(over) {
  const w = 16, d = 10, h = 0.9, plan = { x: -w / 2, y: -d / 2, w, d, r: 0.5 };
  const flap = k.onTop([[-w / 2 + 0.4, -d / 2 + 0.3], [0, 0.6], [w / 2 - 0.4, -d / 2 + 0.3]], h, P);
  const band = over ? k.lineOnTop([-w / 2 + 0.4, d / 2 - 2.2], [w / 2 - 0.4, d / 2 - 2.2], h, P) + k.lineOnTop([-w / 2 + 0.4, d / 2 - 3.4], [w / 2 - 0.4, d / 2 - 3.4], h, P) : "";
  return k.solidSvg(k.slabOf(plan, 0, h, P, 2, 0.2), { tone: "hi", inner: k.lineSvg(flap + band, { tone: "lo" }) });
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Un tableau de cinq manomètres à contact sur un établi, pour les périmètres CS, Locatif, MEC, PPTM et GLOBAL. Chaque aiguille montre la consommation des fonds ; un index réglable marque le seuil. Chaque périmètre envoie environ six alertes par semaine, soit trente en tout : le voyant s'allume et une enveloppe sort de la fente pour tomber dans le bac, qui garde la semaine en cours ; une enveloppe barrée signale un dépassement au-delà de 100 %.",
  body: [
    bench(P, PLATE, { strip: { x: -120, y: PLATE.y + PLATE.d - 11, w: 120, d: 7, r: 1 }, label: { x: 40, y: PLATE.y + PLATE.d - 13, w: 46, d: 10, r: 1.2 } }),
    panelSvg(), ...GAUGES.map(gaugeSvg),
    traySvg("back"), `<g data-part="mail"></g>`, traySvg("front"),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
const P = ${JSON.stringify(P)};
const GAUGES = ${JSON.stringify(GAUGES)}, GZ = ${GZ}, SWEEP = ${JSON.stringify(SWEEP)}, SLOT_Z = ${SLOT_Z}, TRAY = ${JSON.stringify(TRAY)}, KNOB = ${JSON.stringify(KNOB)};
const ENV = [${JSON.stringify(envelopeSvg(false))}, ${JSON.stringify(envelopeSvg(true))}];
${LOOP}
// Vrais chiffres : 5 périmètres × 5 min de pointage par jour évitées, 225 jours, 104,74 €/h.
// Les fonds et les dépenses sont illustratifs.
const NAMES = ["CS", "Locatif", "MEC", "PPTM", "GLOBAL"], DAYS = 225, MIN_PER_DAY = 25, RATE = 104.74;
const FUNDS = [420, 260, 180, 140], FINAL = [0.93, 0.72, 1.12, 0.86];
const curve = (u) => u - Math.sin(2 * Math.PI * u * 9) / (2 * Math.PI * 9) * 0.6;   // factures mensuelles
function ratios(day) {
  const u = Math.max(0, Math.min(1, day / DAYS)), spent = FUNDS.map((f, i) => f * FINAL[i] * curve(u));
  return [...spent.map((s, i) => s / FUNDS[i]), spent.reduce((a, b) => a + b, 0) / FUNDS.reduce((a, b) => a + b, 0)];
}
const angleOf = (r) => SWEEP.from + Math.min(r, SWEEP.max) / SWEEP.max * SWEEP.span;
let day = 0, threshold = 0.8, shownT = 0.8, touring = true, idle = 0, hold = 0, sent = [], news = null;
const mail = $("mail"), mark = $("knob-mark");
// Rythme réel : 5 périmètres × 6 alertes par semaine = 30. Une semaine compte 5 matins ; chaque périmètre envoie
// 1 alerte par matin, et un matin de plus (décalé d'un périmètre à l'autre) pour faire 6. Le bac garde la semaine en cours.
const WEEK = 5, PER_WEEK = 6, SHOWN = 6;
function check(d) {
  const r = ratios(d), w = (d - 1) % WEEK;
  r.forEach((v, i) => {
    const n = 1 + (w === i % WEEK ? 1 : 0);
    for (let k = 0; k < n; k++) { sent.push({ i, level: v >= 1 ? 1 : 0, day: d + k * 0.35, ratio: v }); news = sent[sent.length - 1]; }
  });
}
const inTray = (d) => GAUGES.map((g, i) => sent.filter((s) => s.i === i && s.day <= d).slice(-SHOWN));
function needle(g, r) { const a = angleOf(r), l = g.r - 3; return "M" + g.x + " " + (-GZ) + "L" + (g.x + Math.sin(a) * l).toFixed(2) + " " + (-(GZ + Math.cos(a) * l)).toFixed(2); }
function index(g, t) {
  const a = angleOf(t), r0 = g.r - 0.4, r1 = g.r - 5, w = 0.07;
  const p = (ang, r) => (g.x + Math.sin(ang) * r).toFixed(2) + " " + (-(GZ + Math.cos(ang) * r)).toFixed(2);
  return "M" + p(a - w, r0) + "L" + p(a + w, r0) + "L" + p(a, r1) + "Z";
}
function envelopeAt(s, now, stack) {
  const g = GAUGES[s.i], age = (now - s.day) / 1.2;
  const restZ = 1.4 + stack * 1.1, y = Math.min(1, age / 0.5) * (TRAY.y + 12), drop = age < 0.5 ? 0 : Math.min(1, ((age - 0.5) / 0.4) ** 2);
  const z = SLOT_Z - 0.5 - (SLOT_Z - 0.5 - restZ) * drop, op = Math.min(1, age / 0.25);
  return '<g transform="' + translateAlong(P, [g.x + s.level * 3, y, z]) + '" opacity="' + op.toFixed(2) + '">' + ENV[s.level] + "</g>";
}
function draw() {
  const r = ratios(day);
  GAUGES.forEach((g, i) => {
    $("needle-" + i).setAttribute("d", needle(g, r[i]));
    $("index-" + i).setAttribute("d", index(g, shownT));
    const last = sent.filter((s) => s.i === i && s.day <= day).pop();
    $("lamp-" + i).dataset.on = String(r[i] >= threshold || (last && day - last.day < 0.6));
  });
  mail.innerHTML = inTray(day).map((list) => list.map((s, k) => envelopeAt(s, day, k)).join("")).join("");
  const a = (shownT - 0.5) / 0.5 * Math.PI * 1.2 - Math.PI * 0.6, F = [KNOB.x, 6, KNOB.z];
  mark.innerHTML = lineSvg(segment([KNOB.x + Math.sin(a) * 1.4, 6, KNOB.z + Math.cos(a) * 1.4], [KNOB.x + Math.sin(a) * KNOB.r, 6, KNOB.z + Math.cos(a) * KNOB.r], P), { tone: "hi" }) + dotsSvg([iso([KNOB.x + Math.sin(a) * 1.4, 6, KNOB.z + Math.cos(a) * 1.4], P)], { size: 0.5 });
  const d = Math.floor(day), mins = d * MIN_PER_DAY, h = Math.floor(mins / 60), mm = mins % 60;
  const pc = Math.round(threshold * 100), total = sent.filter((s) => s.day <= day).length;
  const wk = Math.floor((Math.max(1, d) - 1) / WEEK), inWeek = sent.filter((s) => s.day <= day && s.day >= wk * WEEK + 1).length;
  say("Sem. " + (wk + 1) + " · " + inWeek + "/" + GAUGES.length * PER_WEEK + " alertes · " + total + " envoyées · " + h + " h" + (mm ? " " + String(mm).padStart(2, "0") : "") + " évitées");
}
const run = loop((dt, calm) => {
  shownT += (threshold - shownT) * Math.min(1, dt * 8);
  if (calm) { day = DAYS; check(day); }
  else if (touring) {
    if (day < DAYS) { const before = Math.floor(day); day = Math.min(DAYS, day + dt * 2); for (let n = before + 1; n <= Math.floor(day); n++) check(n); }
    else if ((hold += dt) > 4) { day = 0; hold = 0; sent = []; news = null; }
  }
  draw();
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); threshold = Math.max(0.5, Math.min(1, Math.round(next * 20) / 20)); check(Math.floor(day)); run(); };
dragX(() => threshold, (v, share) => steer(v + share * 0.8));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: threshold + 0.05, ArrowLeft: threshold - 0.05, Home: 0.5, End: 1 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(to); }
});
// Accès de vérification (captures) : rejoue l'année jusqu'au jour d avec le seuil t.
window.__fig = { at: (d, t = 0.8) => { touring = false; threshold = shownT = t; sent = []; news = null; for (let n = 1; n <= d; n++) check(n); day = d; draw(); return readout.textContent; } };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 06",
  title: "Point financier",
  hint: "Glisse ou ← → : seuil",
  readout: "Jour 1 · seuil 80 %",
  keys: [
    { mark: "lit", label: "L'index du seuil, réglable de 50 à 100 % comme la cellule Excel" },
    { mark: "raised", label: "Manomètres, de gauche à droite : CS, Locatif, MEC, PPTM, GLOBAL ; bac des alertes envoyées" },
  ],
  caption: "Chaque matin, les quatre flux et la vue globale comparent les dépenses aux fonds du compte : chaque périmètre envoie environ 6 alertes par semaine, soit 30 par semaine pour les cinq, préventives au seuil ou de dépassement (TND négatif) au-delà des fonds. Le bac montre la semaine en cours, sans bloquer les dépenses. Le pointage évité vaut 5 min par périmètre et par jour, soit 25 min : sur 225 jours, 93,75 h et environ 9 800 € par an à 104,74 €/h. Fonds et dépenses illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Point financier : flèches gauche et droite pour régler le seuil" aria-valuemin="50" aria-valuemax="100" aria-valuenow="80">${svg}</div>`,
});

writeFigure("finance", { title: "Point financier · manomètres à contact", plate, live, css: `<style>.fig-index{fill:var(--anatomy-lit);stroke:var(--anatomy-lit);stroke-width:.4;stroke-linejoin:round}</style>` });
