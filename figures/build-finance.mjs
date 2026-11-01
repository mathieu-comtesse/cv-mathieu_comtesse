// Fig 06 · Point financier : cinq cuves jaugées à trop-plein et à flotteur.
// node figures/build-finance.mjs  →  figures/finance.html
// Chaque cuve se remplit avec la consommation d'un périmètre (dépenses / fonds) : CS, Locatif, MEC, PPTM et GLOBAL.
// Le repère réglable marque le seuil lu dans Excel ; quand le flotteur l'atteint, le contact se ferme et une enveloppe d'alerte
// préventive sort du socle ; au-delà de 100 %, le liquide passe au trop-plein et une seconde enveloppe signale le dépassement.
// Les enveloppes restent dans le bac : pas d'alerte en double.
import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../.claude/skills/anatomy/kit/lathe.mjs";
import { tools, bench, display, writeFigure, LOOP } from "./common.mjs";

const WIDTH = 640, HEIGHT = 440;
const PLATE = { x: -154, y: -44, w: 308, d: 100, r: 8 };
const TANKS = [{ x: -140, w: 40 }, { x: -94, w: 40 }, { x: -48, w: 40 }, { x: -2, w: 40 }, { x: 44, w: 58 }].map((t) => ({ ...t, cx: t.x + t.w / 2 }));
const TY = -28, TD = 26, FY = TY + TD;                   // fond et face avant des cuves
const FLOOR = 7, SCALE = 44, WALL_TOP = FLOOR + SCALE * 1.22;   // plancher, hauteur de 100 %, haut des parois
const SWEEP = { max: 1.2 };
const TRAY = { x: -146, y: 6, w: 250, d: 24, r: 2 }, TRAY_H = 7;
const KNOB = { x: 128, y: -4, z: 26, r: 7 };                // bouton du seuil, sur son pupitre
const CONSOLE = { x: 108, y: -26, w: 36, d: 36, r: 3 }, CON_H = 34;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), ...k.boxCorners({ x: -142, y: TY, w: 290, d: 40 }, 0, WALL_TOP + 8)], WIDTH, HEIGHT, { pad: 22, azimuth: 66 });
const { at, S, L, D, slab, front, right, flat } = tools(P);
const zOf = (ratio) => FLOOR + Math.min(ratio, SWEEP.max) * SCALE;

// ---------------------------------------------------------------- cuves
function tankBack(t, i) {
  const out = [], plan = { x: t.x, y: TY, w: t.w, d: TD, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, 0, 2, P)}" style="filter:blur(3px)"/>`);
  // Socle : plateau, plaque de contact en face avant (fenêtre du pourcentage, fente d'enveloppe, voyant).
  out.push(S(slab(plan, 0, FLOOR, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(plan, 3.2, P, 3), { tone: "faint" }) }));
  const f = front(FY);
  out.push(display(f, flat(t.cx - 11, 1.6, t.cx + 5, 5.4, 0.8), { part: "pc-" + i, x: t.cx - 3, y: -3.4, size: 2.6, text: "000 %" }));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(t.cx + 8, 2.2, t.cx + 17, 4.8, 0.8, 3)}"/></g>`);
  const [lx, ly] = at([t.x + 3.4, FY, 3.6]);
  out.push(`<circle class="fig-lamp" data-part="lamp-${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.1"/>`);
  out.push(D([at([t.x + 1.4, FY, 1.6]), at([t.x + t.w - 1.4, FY, 1.6]), at([t.x + 1.4, FY, 5.4]), at([t.x + t.w - 1.4, FY, 5.4])], { size: 0.34 }));
  // Fond et parois arrière et gauche.
  out.push(S(slab({ x: t.x + 1, y: TY + 1, w: t.w - 2, d: TD - 2, r: 1 }, FLOOR, 1, 2, 0.2), { tone: "lo" }));
  out.push(S(slab({ x: t.x + 1, y: TY + 1, w: t.w - 2, d: 1.6, r: 0.3 }, FLOOR + 1, WALL_TOP - FLOOR - 1, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: t.x + 1, y: TY + 1, w: 1.6, d: TD - 2, r: 0.3 }, FLOOR + 1, WALL_TOP - FLOOR - 1, 2, 0.3), { tone: "mid" }));
  // Tige du flotteur, dans l'angle arrière gauche.
  out.push(S(slab({ x: t.x + 4, y: TY + 3, w: 1.4, d: 1.4, r: 0.3 }, FLOOR + 1, WALL_TOP - FLOOR - 4, 2, 0.1), { tone: "lo" }));
  out.push(`<g data-part="liquid-${i}"></g>`);
  return out.join("");
}
function tankFront(t, i) {
  const out = [], xr = t.x + t.w - 2.6;
  // Paroi droite, lèvre avant basse, graduation en bord avant gauche.
  out.push(S(slab({ x: xr, y: TY + 1, w: 1.6, d: TD - 2, r: 0.3 }, FLOOR + 1, WALL_TOP - FLOOR - 1, 2, 0.3), { tone: "mid" }));
  out.push(S(slab({ x: t.x + 1, y: FY - 2.4, w: t.w - 2, d: 1.6, r: 0.3 }, FLOOR + 1, 3.4, 2, 0.2), { tone: "mid" }));
  const post = { x: t.x + 1, y: FY - 2.4, w: 1.8, d: 1.6, r: 0.2 };
  out.push(S(slab(post, FLOOR + 1, WALL_TOP - FLOOR - 1, 2, 0.2), { tone: "mid" }));
  // Graduations : un trait tous les 10 %, un majeur tous les 50 %, 100 % marqué plus long.
  const minor = [], major = [];
  for (let p = 0; p <= 120; p += 10) {
    const z = zOf(p / 100), long = p % 50 === 0 || p === 100;
    (long ? major : minor).push(k.segment([t.x + 2.8, FY - 0.8, z], [t.x + 2.8 + (long ? 4.2 : 2.4), FY - 0.8, z], P));
  }
  out.push(L(minor.join(""), { tone: "lo", free: true }), L(major.join(""), { tone: "mid", free: true }));
  // Trop-plein à 100 % : un bec sur la paroi droite, et le jet quand le niveau le dépasse.
  const F = G.frameAlong([xr + 1.6, TY + TD / 2, zOf(1)], [1, 0, 0]);
  out.push(S(G.disc(0, 5, 2.2, F, P), { tone: "mid" }));
  out.push(`<g data-part="drip-${i}"></g>`);
  out.push(`<g data-part="mark-${i}"></g>`);
  out.push(D([at([t.x + 1.9, FY - 0.8, WALL_TOP]), at([t.x + t.w - 1.9, FY - 0.8, WALL_TOP - 0.01])].slice(0, 1), { size: 0.4 }));
  return out.join("");
}

// ---------------------------------------------------------------- pupitre du seuil
function consoleSvg() {
  const out = [], c = CONSOLE, f = front(c.y + c.d), F = G.frameAlong([KNOB.x, c.y + c.d, KNOB.z], [0, 1, 0]);
  out.push(`<path class="iso-halo" d="${k.haloOf(c, 0, 2, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(c, 0, CON_H, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(c, 6, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(c, 3.4).map(([x, y]) => at([x, y, CON_H])), { size: 0.42 }));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${flat(c.x + 5, 4, c.x + c.w - 5, 16, 1.4, 3)}"/></g>`);
  out.push(D([at([c.x + 7, c.y + c.d, 10]), at([c.x + c.w - 7, c.y + c.d, 10])], { size: 0.38 }));
  out.push(S(G.disc(0, 1, KNOB.r + 1.6, F, P), { tone: "lo" }));
  out.push(S(G.disc(1, 6, KNOB.r, F, P), { tone: "mid", inner: L(G.ribsOf(F, 1.2, 5.8, KNOB.r, 26, P), { tone: "faint" }) }));
  out.push(`<g data-part="knob-mark"></g>`);
  return out.join("");
}

// ---------------------------------------------------------------- bac des alertes envoyées
function traySvg(part) {
  const out = [], t = TRAY, wall = 1.4;
  if (part === "back") {
    out.push(S(slab(t, 0, 1.4, 3, 0.3), { tone: "lo" }));
    out.push(S(slab({ x: t.x, y: t.y, w: t.w, d: wall, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
    out.push(S(slab({ x: t.x, y: t.y, w: wall, d: t.d, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
    for (const g of TANKS.slice(0, 4)) out.push(S(slab({ x: g.x + g.w + 3 - 0.6, y: t.y + wall, w: 1.2, d: t.d - wall * 2, r: 0.3 }, 1.4, TRAY_H - 2.6, 2, 0.1), { tone: "mid" }));
    return out.join("");
  }
  out.push(S(slab({ x: t.x + t.w - wall, y: t.y, w: wall, d: t.d, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: t.x, y: t.y + t.d - wall, w: t.w, d: wall, r: 0.5 }, 1.4, TRAY_H - 1.4, 2, 0.2), { tone: "mid" }));
  out.push(D(TANKS.map((g) => at([g.cx, t.y + t.d, TRAY_H - 2.4])), { size: 0.4 }));
  return out.join("");
}
// Enveloppe couchée, centrée à l'origine ; le dépassement porte une bande.
function envelopeSvg(over) {
  const w = 16, d = 10, h = 0.9, plan = { x: -w / 2, y: -d / 2, w, d, r: 0.5 };
  const flap = k.onTop([[-w / 2 + 0.4, -d / 2 + 0.3], [0, 0.6], [w / 2 - 0.4, -d / 2 + 0.3]], h, P);
  const band = over ? k.lineOnTop([-w / 2 + 0.4, d / 2 - 2.2], [w / 2 - 0.4, d / 2 - 2.2], h, P) + k.lineOnTop([-w / 2 + 0.4, d / 2 - 3.4], [w / 2 - 0.4, d / 2 - 3.4], h, P) : "";
  return k.solidSvg(k.slabOf(plan, 0, h, P, 2, 0.2), { tone: "hi", inner: k.lineSvg(flap + band, { tone: "lo" }) });
}


// ---------------------------------------------------------------- finitions
function tankDetail(t, i) {
  const out = [], f = front(FY);
  // Liseré de tête sur les parois, tirants arrière, vis, robinet de vidange sur le socle.
  out.push(S(slab({ x: t.x + 0.4, y: TY + 0.4, w: t.w - 0.8, d: 2.8, r: 0.4 }, WALL_TOP - 1.6, 1.6, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: t.x + 0.4, y: TY + 0.4, w: 2.8, d: TD - 0.8, r: 0.4 }, WALL_TOP - 1.6, 1.6, 2, 0.2), { tone: "mid" }));
  out.push(S(slab({ x: t.x + t.w - 3.2, y: TY + 0.4, w: 2.8, d: TD - 0.8, r: 0.4 }, WALL_TOP - 1.6, 1.6, 2, 0.2), { tone: "mid" }));
  out.push(D([at([t.x + 2, TY + 2, WALL_TOP]), at([t.x + t.w - 2, TY + 2, WALL_TOP]), at([t.x + t.w - 2, FY - 3, WALL_TOP])], { size: 0.34 }));
  const F = G.frameAlong([t.x + t.w - 8, FY, 3.6], [0, 1, 0]);
  out.push(S(G.disc(0, 2.6, 1.7, F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 0, 2.6, 1.7, 10, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(S(G.disc(2.6, 3.4, 2.6, F, P), { tone: "hi" }));
  void f; void i;
  return out.join("");
}
function consoleDetail() {
  const out = [], c = CONSOLE, f = right(c.x + c.w);
  // Échelle du seuil autour du bouton (50 à 100 %), évents sur le flanc, plaque de série.
  const from = -Math.PI * 0.6, span = Math.PI * 1.2, yf = c.y + c.d;
  const pts = []; for (let n = 0; n <= 5; n++) { const a = from + n / 5 * span; pts.push([a, n]); }
  const minor = [], major = [];
  for (let n = 0; n <= 10; n++) { const a = from + n / 10 * span, r0 = KNOB.r + 2, r1 = KNOB.r + (n % 2 ? 3.4 : 4.6); (n % 2 ? minor : major).push(k.segment([KNOB.x + Math.sin(a) * r0, yf, KNOB.z + Math.cos(a) * r0], [KNOB.x + Math.sin(a) * r1, yf, KNOB.z + Math.cos(a) * r1], P)); }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  const vents = []; for (let i = 0; i < 6; i++) vents.push(flat(-(c.y + 6 + i * 4.8) - 0.9, 6, -(c.y + 6 + i * 4.8) + 0.9, 22, 0.9, 3));
  out.push(`<g transform="${f}"><path class="iso-line" data-tone="lo" d="${vents.join("")}"/></g>`);
  void pts;
  return out.join("");
}
function trayDetail() {
  const out = [], f = front(TRAY.y + TRAY.d);
  // Une fenêtre par périmètre sur la lèvre du bac, vissée.
  ["CS", "Locatif", "MEC", "PPTM", "GLOBAL"].forEach((name, i) => {
    const cx = TANKS[i].cx, win = flat(cx - 9, 2, cx + 9, 6.2, 0.8);
    out.push(`<g transform="${f}"><path class="iso-fill fig-window" d="${win}"/><path class="iso-line" data-tone="lo" d="${win}"/></g>`);
    out.push(k.faceTextSvg(`${f} translate(${cx} -2.9)`, name, { size: 3, tone: "hi", anchor: "middle" }));
    out.push(D([at([cx - 11, TRAY.y + TRAY.d, 4]), at([cx + 11, TRAY.y + TRAY.d, 4])], { size: 0.32 }));
  });
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Cinq cuves jaugées sur un établi, une par périmètre : CS, Locatif, MEC, PPTM et GLOBAL. Chaque cuve se remplit avec la consommation des fonds, graduée en pourcentage ; un repère réglable marque le seuil. Quand le niveau l'atteint, le voyant s'allume et une enveloppe d'alerte sort du socle vers le bac ; au-delà de 100 %, le trop-plein déverse et une seconde enveloppe signale le dépassement.",
  body: [
    bench(P, PLATE, { strip: { x: -140, y: PLATE.y + PLATE.d - 13, w: 150, d: 7, r: 1 }, label: { x: 50, y: PLATE.y + PLATE.d - 15, w: 46, d: 11, r: 1.2 } }),
    consoleSvg(), consoleDetail(),
    ...TANKS.flatMap((t, i) => [tankBack(t, i), tankFront(t, i), tankDetail(t, i)]),
    traySvg("back"), `<g data-part="mail"></g>`, traySvg("front"), trayDetail(),
  ],
});

// ---------------------------------------------------------------- modèle
const live = `
${LOOP}
const P = ${JSON.stringify(P)};
const TANKS = ${JSON.stringify(TANKS)}, TY = ${TY}, TD = ${TD}, FY = ${FY}, FLOOR = ${FLOOR}, SCALE = ${SCALE}, SWEEP = ${JSON.stringify(SWEEP)}, TRAY = ${JSON.stringify(TRAY)}, KNOB = ${JSON.stringify(KNOB)}, CON_Y = ${CONSOLE.y + CONSOLE.d};
const ENV = [${JSON.stringify(envelopeSvg(false))}, ${JSON.stringify(envelopeSvg(true))}];
// Vrais chiffres : 5 périmètres × 5 min de pointage par jour évitées, 225 jours, 104,74 €/h.
// Les fonds et les dépenses sont illustratifs.
const NAMES = ["CS", "Locatif", "MEC", "PPTM", "GLOBAL"], DAYS = 225, MIN_PER_DAY = 25, RATE = 104.74;
const FUNDS = [420, 260, 180, 140], FINAL = [0.93, 0.72, 1.12, 0.86];
const curve = (u) => u - Math.sin(2 * Math.PI * u * 9) / (2 * Math.PI * 9) * 0.6;   // factures mensuelles
function ratios(day) {
  const u = Math.max(0, Math.min(1, day / DAYS)), spent = FUNDS.map((f, i) => f * FINAL[i] * curve(u));
  return [...spent.map((s, i) => s / FUNDS[i]), spent.reduce((a, b) => a + b, 0) / FUNDS.reduce((a, b) => a + b, 0)];
}
const zOf = (r) => FLOOR + Math.min(r, SWEEP.max) * SCALE;
let day = 0, threshold = 0.8, shownT = 0.8, touring = true, idle = 0, hold = 0, sent = [];
const mail = $("mail"), mark = $("knob-mark");
// Rythme réel : 5 périmètres × 6 alertes par semaine = 30. Une semaine compte 5 matins ; chaque périmètre envoie
// 1 alerte par matin, et un matin de plus (décalé d'un périmètre à l'autre) pour faire 6. Le bac garde la semaine en cours.
const WEEK = 5, SHOWN = 6;
function check(d) {
  const r = ratios(d), w = (d - 1) % WEEK;
  r.forEach((v, i) => {
    const n = 1 + (w === i % WEEK ? 1 : 0);
    for (let q = 0; q < n; q++) sent.push({ i, level: v >= 1 ? 1 : 0, day: d + q * 0.35, ratio: v });
  });
}
const inTray = (d) => TANKS.map((_, i) => sent.filter((s) => s.i === i && s.day <= d).slice(-SHOWN));
const liquids = TANKS.map((_, i) => $("liquid-" + i)), drips = TANKS.map((_, i) => $("drip-" + i)), marks = TANKS.map((_, i) => $("mark-" + i)), lamps = TANKS.map((_, i) => $("lamp-" + i)), pcs = TANKS.map((_, i) => $("pc-" + i));
const text = (el, s) => { if (el.textContent !== s) el.textContent = s; };
// Liquide : une dalle qui monte, et le flotteur (un disque) à sa surface.
function liquid(t, ratio) {
  const z = zOf(ratio), h = Math.max(0.4, z - FLOOR - 1);
  const plan = { x: t.x + 2.8, y: TY + 2.8, w: t.w - 5.6, d: TD - 5.2, r: 0.8 };
  const body = solidSvg(slabOf(plan, FLOOR + 1, h, P, 2, 0.3), { tone: "hi", className: "fig-liquid" });
  const float = solidSvg(cylinder(t.x + 5, TY + 4, 2.6, FLOOR + 1 + h, 1.4, P, 20), { tone: "mid" });
  return body + float;
}
// Repère de seuil : un fanion à la bonne hauteur sur la graduation de chaque cuve.
function flag(t, ratio) {
  const z = zOf(ratio);
  return solidSvg(slabOf({ x: t.x + 1.8, y: FY - 2.2, w: 3.6, d: 2.2, r: 0.3 }, z - 0.8, 1.6, P, 2, 0.1), { tone: "hi", lit: true });
}
function envelopeAt(s, now, stack) {
  const g = TANKS[s.i], age = (now - s.day) / 1.2;
  const out = Math.min(1, age / 0.5), drop = age < 0.5 ? 0 : Math.min(1, ((age - 0.5) / 0.4) ** 2);
  const restZ = 1.4 + stack * 1.1, z = 4 - (4 - restZ) * drop, y = FY - 4 + out * (TRAY.y + 12 - FY + 4), op = Math.min(1, age / 0.25);
  return '<g transform="' + translateAlong(P, [g.cx + s.level * 3, y, z]) + '" opacity="' + op.toFixed(2) + '">' + ENV[s.level] + "</g>";
}
function draw() {
  const r = ratios(day);
  TANKS.forEach((t, i) => {
    html(liquids[i], liquid(t, r[i]));
    html(marks[i], flag(t, shownT));
    // Trop-plein : un filet qui descend du bec jusqu'au bac quand la consommation dépasse les fonds.
    html(drips[i], r[i] > 1 ? solidSvg(slabOf({ x: t.x + t.w - 1.2, y: TY + TD / 2 - 1, w: 1.6, d: 2, r: 0.4 }, 1.4, zOf(1) - 1.4, P, 2, 0.1), { tone: "hi", className: "fig-liquid" }) : "");
    const last = sent.filter((s) => s.i === i && s.day <= day).pop();
    attr(lamps[i], "data-on", r[i] >= shownT || (last && day - last.day < 0.6));
    text(pcs[i], String(Math.round(r[i] * 100)).padStart(3, " ") + " %");
  });
  html(mail, inTray(day).map((list) => list.map((s, q) => envelopeAt(s, day, q)).join("")).join(""));
  const a = (shownT - 0.5) / 0.5 * Math.PI * 1.2 - Math.PI * 0.6;
  html(mark, lineSvg(segment([KNOB.x + Math.sin(a) * 1.4, CON_Y + 6, KNOB.z + Math.cos(a) * 1.4], [KNOB.x + Math.sin(a) * KNOB.r, CON_Y + 6, KNOB.z + Math.cos(a) * KNOB.r], P), { tone: "hi" }) + dotsSvg([iso([KNOB.x + Math.sin(a) * 1.4, CON_Y + 6, KNOB.z + Math.cos(a) * 1.4], P)], { size: 0.5 }));
  const d = Math.floor(day), mins = d * MIN_PER_DAY, h = Math.floor(mins / 60), mm = mins % 60;
  const total = sent.filter((s) => s.day <= day).length;
  const wk = Math.floor((Math.max(1, d) - 1) / WEEK), inWeek = sent.filter((s) => s.day <= day && s.day >= wk * WEEK + 1).length;
  say("Sem. " + (wk + 1) + " · " + inWeek + "/" + TANKS.length * 6 + " alertes · " + total + " envoyées · " + h + " h" + (mm ? " " + String(mm).padStart(2, "0") : "") + " évitées");
}
const run = loop((dt, calm) => {
  shownT += (threshold - shownT) * Math.min(1, dt * 8);
  if (calm) { day = DAYS; sent = []; for (let n = 1; n <= DAYS; n++) check(n); }
  else if (touring) {
    if (day < DAYS) { const before = Math.floor(day); day = Math.min(DAYS, day + dt * 2); for (let n = before + 1; n <= Math.floor(day); n++) check(n); }
    else if ((hold += dt) > 4) { day = 0; hold = 0; sent = []; }
  }
  draw();
});
const steer = (next) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; }, 5000); threshold = Math.max(0.5, Math.min(1, Math.round(next * 20) / 20)); run(); };
dragX(() => threshold, (v, share) => steer(v + share * 0.8));
stage.addEventListener("keydown", (e) => {
  const to = { ArrowRight: threshold + 0.05, ArrowLeft: threshold - 0.05, Home: 0.5, End: 1 }[e.key];
  if (to !== undefined) { e.preventDefault(); steer(to); }
});
// Accès de vérification (captures) : rejoue l'année jusqu'au jour d avec le seuil t.
window.__fig = { at: (d, t = 0.8) => { touring = false; threshold = shownT = t; sent = []; for (let n = 1; n <= d; n++) check(n); day = d; draw(); return readout.textContent; } };
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 06",
  title: "Point financier",
  hint: "Glisse ou ← → : seuil",
  readout: "Jour 1 · seuil 80 %",
  keys: [
    { mark: "lit", label: "Le repère du seuil, réglable de 50 à 100 % comme la cellule Excel" },
    { mark: "raised", label: "Cuves, de gauche à droite : CS, Locatif, MEC, PPTM, GLOBAL ; bac des alertes envoyées" },
  ],
  caption: "Chaque matin, les quatre flux et la vue globale comparent les dépenses aux fonds du compte : chaque périmètre envoie environ 6 alertes par semaine, soit 30 par semaine pour les cinq, préventives au seuil ou de dépassement (TND négatif) au-delà des fonds. Le bac montre la semaine en cours, sans bloquer les dépenses. Le pointage évité vaut 5 min par périmètre et par jour, soit 25 min : sur 225 jours, 93,75 h et environ 9 800 € par an à 104,74 €/h. Fonds et dépenses illustratifs.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Point financier : flèches gauche et droite pour régler le seuil" aria-valuemin="50" aria-valuemax="100" aria-valuenow="80">${svg}</div>`,
});

writeFigure("finance", { title: "Point financier · cuves à trop-plein", plate, live, css: `<style>.fig-liquid .iso-fill,.fig-liquid .iso-top{fill:color-mix(in srgb,var(--g) 34%,var(--anatomy-top))}.fig-liquid .iso-shade{fill:color-mix(in srgb,var(--g) 20%,var(--anatomy-shade-1))}.fig-liquid .iso-edge,.fig-liquid .iso-line{stroke:color-mix(in srgb,var(--g) 70%,var(--anatomy-hi))}</style>` });
