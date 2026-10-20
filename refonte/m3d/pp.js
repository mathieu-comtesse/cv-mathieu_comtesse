// Fig 07 · Power Automate, chaîne des PP : un classeur à dossiers suspendus rangés par échéance, en 3D (cotes de figures/build-pp.mjs).
// Chaque plan de prévention quitte la corbeille, passe sous le lecteur qui relève son échéance, puis rejoint la section de son mois.
// Le curseur de relance glisse sur le rail un mois devant aujourd'hui : chaque dossier qu'il atteint envoie son mail.
import * as THREE from 'three';
import { COL, mat, slab, box, cyl, group, bench, display, ease, hash } from './core.js';

export const WIDTH = 252;
const PLATE = { x: -124, y: -42, w: 252, d: 100, r: 8 };
const INBOX = { x: -114, y: 20, w: 30, d: 22 }, READER = { x: -110, y: -26, w: 30, d: 30 }, READER_H = 12, BRIDGE_Z = 34;
const DRAWER = { x: -60, y: -32, w: 140, d: 50 }, DRAWER_H = 16, WALL = 1.6;
const SEC = { x0: DRAWER.x + 4, y0: DRAWER.y + 5, d: DRAWER.d - 10, h: 15, n: 12 };
const MAILBOX = { x: 92, y: -38, w: 24, d: 18 }, MAILBOX_H = 30;
const SECW = (DRAWER.w - 8) / SEC.n, PERIOD = 2.6;
const MONTHS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

export function build() {
  const g = new THREE.Group();
  g.add(bench(PLATE, { strip: { x: -100, y: PLATE.y + PLATE.d - 12, w: 120, d: 7 }, label: { x: 60, y: PLATE.y + PLATE.d - 24, w: 46, d: 11 } }));
  // corbeille d'arrivée
  g.add(slab(INBOX.x, INBOX.y, INBOX.w, INBOX.d, 0, 1.4, COL.lo, .3));
  for (const [x, y, w, d] of [[INBOX.x, INBOX.y, INBOX.w, 1.4], [INBOX.x, INBOX.y, 1.4, INBOX.d], [INBOX.x, INBOX.y + INBOX.d - 1.4, INBOX.w, 1.4], [INBOX.x + INBOX.w - 1.4, INBOX.y, 1.4, INBOX.d]]) g.add(slab(x, y, w, d, 1.4, 4.6, COL.mid, .4));
  const inStack = box(INBOX.x + INBOX.w / 2, INBOX.y + INBOX.d / 2, 1.4, 20, 14, 1, COL.hi); g.add(inStack);
  // lecteur à passerelle
  g.add(slab(READER.x, READER.y, READER.w, READER.d, 0, READER_H, COL.mid, 2));
  g.add(slab(READER.x + 2, READER.y, 5, READER.d, READER_H, BRIDGE_Z - READER_H, COL.mid, 1), slab(READER.x + READER.w - 7, READER.y, 5, READER.d, READER_H, BRIDGE_Z - READER_H, COL.mid, 1), slab(READER.x + 2, READER.y, READER.w - 4, READER.d, BRIDGE_Z, 5, COL.mid, 1.2));
  const rd = display(20, 6); rd.mesh.position.set(READER.x + READER.w / 2, BRIDGE_Z + 2.5, READER.y + READER.d + .05); g.add(rd.mesh);
  const beam = box(READER.x + READER.w / 2, READER.y + READER.d / 2, READER_H + .6, 22, 2, .3, COL.accent, 0); g.add(beam);
  // classeur : tiroir ouvert, dossiers suspendus, cloisons des mois
  g.add(slab(DRAWER.x, DRAWER.y, DRAWER.w, DRAWER.d, 0, DRAWER_H, COL.mid, 2));
  g.add(slab(DRAWER.x + WALL, DRAWER.y + WALL, DRAWER.w - 2 * WALL, DRAWER.d - 2 * WALL, DRAWER_H - .6, .6, COL.dark, 1));
  const folders = [], tabs = [];
  for (let i = 0; i < SEC.n; i++) {
    const cx = SEC.x0 + i * SECW + SECW / 2;
    g.add(box(SEC.x0 + i * SECW, SEC.y0 + SEC.d / 2, DRAWER_H + SEC.h / 2, 1.2, SEC.d, SEC.h, COL.lo, 20));
    const f = box(cx, SEC.y0 + SEC.d / 2, DRAWER_H + 1, SECW - 3, SEC.d - 2, 1, COL.hi); g.add(f); folders.push(f);
    const t = box(cx, SEC.y0 + 1, DRAWER_H + SEC.h + 1.4, SECW - 3, 1, 3, COL.accent, 0); g.add(t); tabs.push(t);
  }
  // rail et curseur de relance
  g.add(box(DRAWER.x + DRAWER.w / 2, DRAWER.y + DRAWER.d + 2.4, DRAWER_H + 2, DRAWER.w + 8, 1.4, 1.2, COL.lo, 0));
  const cursor = box(0, DRAWER.y + DRAWER.d + 2.4, DRAWER_H + 5, 6, 4, 8, COL.accent); g.add(cursor);
  // boîte aux lettres
  g.add(slab(MAILBOX.x, MAILBOX.y, MAILBOX.w, MAILBOX.d, 0, MAILBOX_H, COL.mid, 1.6), slab(MAILBOX.x + 3, MAILBOX.y + MAILBOX.d, 18, .6, MAILBOX_H - 12, 5, COL.dark, .3));
  const flag = box(MAILBOX.x + MAILBOX.w + 1.5, MAILBOX.y + 8, MAILBOX_H - 6, 1.4, 1.4, 12, COL.red, 0); g.add(flag);
  const mail = box(0, 0, 0, 6, 4, .4, COL.hi, 0); g.add(mail);
  const plan = card3(); g.add(plan);
  function card3() { const m = box(0, 0, 0, 14, 20, .5, COL.hi); return m; }
  const counts = new Array(SEC.n).fill(0);

  function update(time) {
    const idx = Math.floor(time / PERIOD), t = time - idx * PERIOD;
    const month = Math.floor(hash(idx + 31) * SEC.n), today = 4;
    const cn = new Array(SEC.n).fill(0); for (let i = Math.max(0, idx - 24); i < idx; i++) cn[Math.floor(hash(i + 31) * SEC.n)]++;
    folders.forEach((f, i) => { const h = 1 + Math.min(10, cn[i] + (i === month && t > 2 ? 1 : 0)) * 1.2; f.scale.y = h; f.position.y = DRAWER_H + h / 2; });
    // plan en transit : corbeille → lecteur → section du mois
    const sx = INBOX.x + INBOX.w / 2, sy = INBOX.y + INBOX.d / 2, rx = READER.x + READER.w / 2, ry = READER.y + READER.d / 2;
    const tx = SEC.x0 + month * SECW + SECW / 2, ty = SEC.y0 + SEC.d / 2;
    plan.rotation.x = Math.PI / 2; let x, y, z;
    if (t < .7) { const u = ease(t / .7); x = sx + (rx - sx) * u; y = sy + (ry - sy) * u; z = 6 + (READER_H + 4 - 6) * u; }
    else if (t < 1.3) { x = rx; y = ry; z = READER_H + 4; }
    else { const u = ease((t - 1.3) / 1.2); x = rx + (tx - rx) * u; y = ry + (ty - ry) * u; z = READER_H + 4 + (DRAWER_H + SEC.h + 8 - READER_H - 4) * Math.sin(Math.PI * u * .5) - (u > .8 ? (u - .8) * 5 * 12 : 0); }
    plan.position.set(x, z, y); plan.visible = t < 2.5;
    rd.set(t > .7 && t < 1.8 ? MONTHS[month] : '— — —');
    beam.visible = t > .7 && t < 1.3;
    const sc = 1 - ((time * 0.02) % 1) * 0; inStack.scale.y = Math.max(.5, 8 - (idx % 8)); inStack.position.y = 1.4 + inStack.scale.y / 2;
    // curseur : un mois devant aujourd'hui, il glisse et déclenche les mails
    const cx0 = SEC.x0 + (today + 1) * SECW + SECW / 2, cx1 = SEC.x0 + (today + 2) * SECW + SECW / 2;
    const cp = (time % 12) / 12; cursor.position.x = DRAWER.x + 4 + SECW * (1 + cp * 10);
    const hit = Math.floor((cursor.position.x - SEC.x0) / SECW);
    tabs.forEach((tb, i) => { tb.material = i === hit ? new THREE.MeshStandardMaterial({ color: COL.red, emissive: COL.red, emissiveIntensity: .5 }) : new THREE.MeshStandardMaterial({ color: COL.accent }); });
    const m = (time % (12 / 10)) / (12 / 10);
    mail.position.set(cursor.position.x + (MAILBOX.x - cursor.position.x) * m, DRAWER_H + 12 + Math.sin(Math.PI * m) * 16, DRAWER.y + DRAWER.d + 2.4 + (MAILBOX.y + 8 - DRAWER.y - DRAWER.d - 2.4) * m);
    flag.rotation.z = m > .9 ? -.3 : 0;
  }
  update(0);
  return { group: g, update };
}
