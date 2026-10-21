// Fig 07 · Power Automate, chaîne des PP : un classeur à dossiers suspendus rangés par échéance, en 3D.
// Portage fidèle de figures/build-pp.mjs : mêmes cotes, même modèle (4 plans par jour, 3 s par jour, du jour 40 au jour 225),
// même lecture sous la passerelle, même vol jusqu'à la section du mois d'échéance, même curseur de relance un mois devant
// aujourd'hui et mêmes relances qui partent vers la boîte aux lettres.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease, hash as _unused } from './core.js';

export const WIDTH = 252;
const PLATE = { x: -124, y: -42, w: 252, d: 100, r: 8 };
const INBOX = { x: -114, y: 20, w: 30, d: 22 }, INBOX_H = 6;
const READER = { x: -110, y: -26, w: 30, d: 30 }, READER_H = 12, BRIDGE_Z = 34;
const DRAWER = { x: -60, y: -32, w: 140, d: 50 }, DRAWER_H = 16, WALL = 1.6;
const SEC = { x0: DRAWER.x + 4, y0: DRAWER.y + 5, d: DRAWER.d - 10, h: 15, per: .18, divider: 1.2 };
const RAIL_Z = DRAWER_H + 1, MAILBOX = { x: 92, y: -38, w: 24, d: 18 }, MAILBOX_H = 30;
const PER_DAY = 4, MIN_PER_PP = 10, DAYS = 225, MONTH = 19, LEAD = 20, DAY_S = 3;
const hash = (i) => { let h = Math.imul(i + 3, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
const PP = []; for (let a = 1; a <= DAYS; a++) for (let q = 0; q < PER_DAY; q++) { const j = PP.length; PP.push({ j, a, q, e: a + 30 + Math.floor(hash(j) * 200) }); }
const dateOf = (n) => { const d = new Date(Date.UTC(2023, 0, 2 + (n - 1) + 2 * Math.floor((n - 1) / 5))); return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const monthOf = (n) => Math.floor((n - 1) / MONTH);

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -60, y: PLATE.y + PLATE.d - 11, w: 110, d: 7 }, label: { x: 64, y: PLATE.y + PLATE.d - 14, w: 46, d: 10 } }));
  // corbeille d'arrivée
  g.add(slab(INBOX.x, INBOX.y, INBOX.w, INBOX.d, 0, 1.4, COL.lo, .3));
  for (const [x, y, w, d] of [[INBOX.x, INBOX.y, INBOX.w, 1.4], [INBOX.x, INBOX.y, 1.4, INBOX.d], [INBOX.x, INBOX.y + INBOX.d - 1.4, INBOX.w, 1.4], [INBOX.x + INBOX.w - 1.4, INBOX.y, 1.4, INBOX.d]]) g.add(slab(x, y, w, d, 1.4, INBOX_H - 1.4, COL.mid, .4));
  // lecteur à passerelle et afficheur d'échéance
  g.add(slab(READER.x, READER.y, READER.w, READER.d, 0, READER_H, COL.mid, 2));
  g.add(slab(READER.x + 2, READER.y, 5, READER.d, READER_H, BRIDGE_Z - READER_H, COL.mid, 1), slab(READER.x + READER.w - 7, READER.y, 5, READER.d, READER_H, BRIDGE_Z - READER_H, COL.mid, 1), slab(READER.x + 2, READER.y, READER.w - 4, READER.d, BRIDGE_Z, 5, COL.mid, 1.2));
  const due = display(20, 6); due.mesh.position.set(READER.x + READER.w / 2, BRIDGE_Z + 2.5, READER.y + READER.d + .05); g.add(due.mesh);
  const readLamp = cyl(0, 0, 1.4, 0, .8, COL.lo, 18); readLamp.rotation.x = Math.PI / 2; readLamp.position.set(READER.x + READER.w - 4, BRIDGE_Z + 2.5, READER.y + READER.d + .3); g.add(readLamp);
  // classeur : tiroir, graduation, affichage de la date du jour sur le flanc
  // bac ouvert (comme la figure d'origine) : fond, quatre parois, rails avant et arrière des dossiers suspendus ; l'intérieur reste visible
  const D = DRAWER;
  g.add(slab(D.x, D.y, D.w, D.d, 0, 2, COL.lo, 1));
  g.add(slab(D.x, D.y, D.w, WALL, 2, DRAWER_H - 2, COL.mid, .5), slab(D.x, D.y, WALL, D.d, 2, DRAWER_H - 2, COL.mid, .5), slab(D.x + D.w - WALL, D.y, WALL, D.d, 2, DRAWER_H - 2, COL.mid, .5), slab(D.x, D.y + D.d - WALL, D.w, WALL, 2, DRAWER_H - 2, COL.mid, .5));
  g.add(slab(D.x + 1, D.y + 2, D.w - 2, 1.4, RAIL_Z - 2, 2, COL.mid, .4), slab(D.x + 1, D.y + D.d - 3.4, D.w - 2, 1.4, RAIL_Z - 2, 2, COL.mid, .4));
  // fond intérieur plus sombre : donne de la profondeur au bac
  g.add(slab(D.x + WALL, D.y + WALL, D.w - 2 * WALL, D.d - 2 * WALL, 2, .3, COL.dark, .5));
  const today = display(20, 7); today.mesh.rotation.y = Math.PI / 2; today.mesh.position.set(DRAWER.x + DRAWER.w + .05, 8, DRAWER.y + DRAWER.d / 2); g.add(today.mesh);
  // sections : douze mois d'échéance, intercalaire + onglet + paquet de dossiers (largeur = nombre × 0,18)
  const secs = Array.from({ length: 12 }, (_, k) => {
    const div = box(0, SEC.y0 + SEC.d / 2, 3 + (SEC.h + 2) / 2, SEC.divider, SEC.d, SEC.h + 2, COL.lo, 0);
    const tab = box(0, 0, SEC.h + 7, SEC.divider, 8, 4, COL.accent, 0);
    const pack = box(0, SEC.y0 + SEC.d / 2, 3 + SEC.h / 2, 1, SEC.d - 2, SEC.h, COL.hi, 30);
    g.add(div, tab, pack); return { div, tab, pack, k };
  });
  // curseur de relance : plaque verticale sur le rail + chariot
  g.add(box(DRAWER.x + DRAWER.w / 2, DRAWER.y + DRAWER.d + 2.4, DRAWER_H + 1.2, DRAWER.w + 8, 1.4, 1.2, COL.lo, 0));
  const riderPlate = box(0, DRAWER.y + DRAWER.d / 2, RAIL_Z + 1.7, 1.2, DRAWER.d - 4, 1.4, COL.accent, 0), riderCar = box(0, DRAWER.y + DRAWER.d - 3, RAIL_Z + 3.5, 6, 4.4, 5, COL.accent); g.add(riderPlate, riderCar);
  // boîte aux lettres
  g.add(slab(MAILBOX.x + MAILBOX.w / 2 - 3, MAILBOX.y + MAILBOX.d / 2 - 3, 6, 6, 0, 14, COL.mid, 1), slab(MAILBOX.x + MAILBOX.w / 2 - 7, MAILBOX.y + MAILBOX.d / 2 - 7, 14, 14, 0, 2, COL.lo, 1.4), slab(MAILBOX.x, MAILBOX.y, MAILBOX.w, MAILBOX.d, 14, MAILBOX_H - 14, COL.mid, 1.6));
  // dossiers en transit et corbeille (22 × 16 × 1) ; relances (12 × 8 × 0,8)
  const folder = () => { const m = box(0, 0, 0, 22, 16, 1, COL.hi); m.geometry.dispose(); m.geometry = new THREE.BoxGeometry(22, 1, 16); m.visible = false; g.add(m); return m; };
  const inboxF = Array.from({ length: PER_DAY }, folder), flyF = folder(), readF = folder();
  const mails = Array.from({ length: 3 }, () => { const m = box(0, 0, 0, 12, 8, .8, COL.hi, 0); m.geometry.dispose(); m.geometry = new THREE.BoxGeometry(12, .8, 8); m.visible = false; g.add(m); return m; });
  const lampOn = new THREE.MeshStandardMaterial({ color: COL.accent, emissive: COL.accent, emissiveIntensity: .9 }), lampOff = readLamp.material;
  const place = (m, x, y, z, w = 22, d = 16) => m.position.set(x + w / 2, z + .5, y + d / 2);

  function state(day, frac) {
    const filed = (p) => p.a < day || (p.a === day && frac >= (p.q + 1) * .15 + .05);
    const active = PP.filter((p) => filed(p) && p.e >= day);
    return { active, done: PP.filter(filed).length };
  }
  function update(time) {
    const span = DAYS * DAY_S - 40 * DAY_S, clock = 40 * DAY_S + (time % span);
    const day = Math.min(DAYS, Math.floor(clock / DAY_S) + 1), frac = clock / DAY_S - (day - 1);
    const st = state(day, frac);
    // sections
    const m0 = monthOf(day), counts = Array(12).fill(0);
    for (const p of st.active) { const k = monthOf(p.e) - m0; if (k >= 0 && k < 12) counts[k]++; }
    let x = SEC.x0; const lay = counts.map((n, k) => { const s = { k, n, x, w: n * SEC.per }; x += s.w + SEC.divider + 1.2; return s; });
    lay.forEach((s) => {
      const o = secs[s.k];
      o.div.position.x = s.x + SEC.divider / 2; o.tab.position.set(s.x + SEC.divider / 2, SEC.h + 7, SEC.y0 + 2 + (s.k % 3) * 9 + 4);
      o.pack.visible = s.n > 0; o.pack.scale.x = Math.max(.001, s.w); o.pack.position.x = s.x + SEC.divider + .6 + s.w / 2;
    });
    // curseur de relance : un mois devant aujourd'hui
    const target = day + LEAD, kk = monthOf(target) - monthOf(day), within = ((target - 1) % MONTH) / MONTH, sec = lay[Math.min(11, kk)];
    const rx = sec.x + SEC.divider + .6 + sec.w * within;
    riderPlate.position.x = rx; riderCar.position.x = rx;
    const dueNow = PP.filter((p) => p.e - LEAD === day), firing = frac >= .8 && dueNow.length > 0;
    // corbeille : les plans du jour encore à lire
    const waiting = PER_DAY - Math.min(PER_DAY, Math.floor(Math.max(0, frac - .05) / .15));
    inboxF.forEach((m, i) => { m.visible = i < waiting; place(m, INBOX.x + 4, INBOX.y + 3, 1.4 + i * 1.1); });
    // plan en cours : lecture puis vol jusqu'à sa section
    const q = Math.floor((frac - .05) / .15), u = (frac - .05) / .15 - q;
    let shown = '--/--'; flyF.visible = false; readF.visible = false;
    if (frac >= .05 && q < PER_DAY && day <= DAYS) {
      const p = PP[(day - 1) * PER_DAY + q], start = [INBOX.x + 4, INBOX.y + 3, 1.4 + (PER_DAY - q - 1) * 1.1], read = [READER.x + 4, READER.y + 7, READER_H];
      if (u < .3) { const v = ease(u / .3); readF.visible = true; place(readF, start[0] + (read[0] - start[0]) * v, start[1] + (read[1] - start[1]) * v, start[2] + (read[2] - start[2]) * v); }
      else if (u < .6) { readF.visible = true; place(readF, read[0], read[1], read[2]); shown = dateOf(p.e); }
      else {
        const v = ease((u - .6) / .4), k2 = monthOf(p.e) - monthOf(day), dest = lay[Math.min(11, Math.max(0, k2))], to = [dest.x + dest.w, SEC.y0 + 6, SEC.h + 6];
        flyF.visible = true; place(flyF, read[0] + (to[0] - read[0]) * v, read[1] + (to[1] - read[1]) * v, read[2] + (to[2] - read[2]) * v + 24 * Math.sin(v * Math.PI)); shown = dateOf(p.e);
      }
    }
    // relances du jour : un mail par dossier atteint, qui monte vers la boîte aux lettres
    mails.forEach((m, i) => {
      m.visible = firing && i < dueNow.length;
      if (!m.visible) return;
      const v = ease((frac - .8) / .2), from = [rx, DRAWER.y + DRAWER.d / 2, RAIL_Z + 3], to = [MAILBOX.x + MAILBOX.w / 2, MAILBOX.y + MAILBOX.d / 2, MAILBOX_H + 1];
      m.position.set(from[0] + (to[0] - from[0]) * v + i * 3, from[2] + (to[2] - from[2]) * v + 30 * Math.sin(v * Math.PI) + i * 2, from[1] + (to[1] - from[1]) * v);
    });
    due.set(shown); today.set(dateOf(day));
    readLamp.material = shown !== '--/--' && u >= .3 && u < .6 ? lampOn : lampOff;
  }
  update(0);
  return { group: g, update, controls: { label: 'Jour', min: 40, max: 225, step: 5, fmt: (v) => 'jour ' + v, get: (t) => Math.floor((40 * DAY_S + (t % (DAYS * DAY_S - 40 * DAY_S))) / DAY_S) + 1, seek: (v) => (v - 40) * DAY_S } };
}
