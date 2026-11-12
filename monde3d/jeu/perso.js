/* Le personnage : le modèle de Mathieu (celui de la pièce), ses animations recalées sur son squelette, et le pilotage (course, sprint, double saut). */
import * as THREE from 'three';
import { encre } from './rendu.js';
import { dedans, repousse } from './monde.js';

import { createCharacter } from '../../js/character.js?v=cv-scene-v49';

/* Le personnage est celui de la pièce, tel quel (squelette, chaussures, visage, corrections de posture) ; seules ses matières passent en aplats encrés. */
export async function charger() {
  const perso = await createCharacter();
  const mats = new Map();
  const conv = (m) => { if (!mats.has(m)) mats.set(m, encre({ emissive: (m.color ? m.color.clone() : new THREE.Color('#888')).multiplyScalar(m.map ? 0 : 0.28), emissiveMap: null, color: m.color ? m.color.clone() : new THREE.Color('#888'), map: m.map || null, vertexColors: !!m.vertexColors, side: THREE.DoubleSide, alphaTest: m.map ? 0.4 : 0 })); return mats.get(m); };
  let plaque = null, source = null;
  perso.group.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    const liste = Array.isArray(o.material) ? o.material : [o.material];
    if (liste.every((m) => m.transparent && m.opacity < 0.6)) { o.visible = false; return; }   // verres des lunettes
    if (o.name === 'expression_plate') { plaque = o; source = o.material; }
    o.material = Array.isArray(o.material) ? liste.map(conv) : conv(o.material);
    o.castShadow = o !== plaque;
  });
  const visage = () => { if (plaque && source && plaque.material.map !== source.map) { plaque.material.map = source.map; plaque.material.needsUpdate = true; } };
  return { perso, visage };
}

const H = 1.7, R = 0.34, PAS = 0.46, G = 27, SAUT = 9.6, V_COURSE = 5.8, V_SPRINT = 9.2;

export async function creerPerso(scene, monde) {
  const { perso, visage } = await charger(), group = perso.group;
  scene.add(group);
  const p = group.position.copy(monde.depart), v = new THREE.Vector3();
  const e = { group, pos: p, vit: v, cap: Math.PI, auSol: true, sol: null, sur: null, sprint: false, danse: false, evenements: [] };
  let courante = '', tCoyote = 0, tTampon = 0, double = false, sautTenu = false, tAtterri = 0, tRoule = 0, ecrase = 0, vEcrase = 0, tPas = 0, tSur = 0, temps = 0;
  const sur = new THREE.Vector3().copy(monde.depart);
  const joue = (nom, fondu = 0.16, vitesse = 1) => {
    if (courante === nom) return; courante = nom;
    perso.setNativePose(nom === 'Idle_Loop' ? 'debout' : null); perso.play(nom, { fade: fondu, speed: vitesse });
  };
  joue('Idle_Loop', 0);
  group.rotation.y = e.cap;

  e.replace = (pos) => { p.copy(pos); v.set(0, 0, 0); e.sol = null; e.auSol = false; };
  e.maj = (dt, entree, capCam) => {
    /* porté par une plateforme mobile */
    if (e.sol && e.sol.mobile && e.sol.actif) {
      const c = e.sol;
      if (c.dRot) { const dx = p.x - c.x, dz = p.z - c.z, co = Math.cos(c.dRot), si = Math.sin(c.dRot); p.x = c.x + dx * co + dz * si; p.z = c.z - dx * si + dz * co; e.cap += c.dRot; }
      if (c.dx !== undefined) { p.x += c.dx; p.z += c.dz; p.y = c.top; }
    }
    /* intention : repère de la caméra */
    const mag = Math.min(1, Math.hypot(entree.x, entree.y)), fx = -Math.sin(capCam), fz = -Math.cos(capCam);
    let wx = fx * entree.y + -fz * entree.x, wz = fz * entree.y + fx * entree.x; const wl = Math.hypot(wx, wz) || 1; wx /= wl; wz /= wl;
    e.sprint = entree.sprint && mag > 0.2;
    const vmax = (e.sprint ? V_SPRINT : V_COURSE) * mag, acc = (e.auSol ? 55 : 24) * dt;
    const tx = wx * vmax, tz = wz * vmax, ex = tx - v.x, ez = tz - v.z, el = Math.hypot(ex, ez);
    if (el <= acc) { v.x = tx; v.z = tz; } else { v.x += ex / el * acc; v.z += ez / el * acc; }
    if (mag > 0.1) { let d = Math.atan2(wx, wz) - e.cap; d = Math.atan2(Math.sin(d), Math.cos(d)); e.cap += d * Math.min(1, dt * 14); }
    /* saut : tampon, tolérance au bord, double saut, hauteur variable */
    tTampon = entree.sautPresse ? 0.14 : Math.max(0, tTampon - dt);
    tCoyote = e.auSol ? 0.12 : Math.max(0, tCoyote - dt);
    sautTenu = entree.saut;
    if (tTampon > 0) {
      if (tCoyote > 0) { v.y = SAUT; tTampon = 0; tCoyote = 0; e.auSol = false; e.sol = null; double = false; vEcrase = 5; e.evenements.push('saut'); joue('Jump_Loop', 0.1); }
      else if (!double && !e.auSol) { v.y = SAUT * 0.92; tTampon = 0; double = true; vEcrase = 4; e.evenements.push('double'); tRoule = 0.42; joue('Roll', 0.08, 1.7); }
    }
    if (!e.auSol) { v.y -= G * (v.y < 0 ? 1.3 : (!sautTenu && v.y > 3 ? 2.4 : 1)) * dt; if (v.y < -42) v.y = -42; }
    let tap = null;
    if (e.auSol && e.sol && e.sol.tapis) tap = e.sol.tapis;

    /* déplacement en deux sous-pas */
    const etait = e.auSol, chute = v.y;
    for (let k = 0; k < 2; k++) {
      const h = dt / 2, y0 = p.y;
      p.x += (v.x + (tap ? tap[0] : 0)) * h; p.z += (v.z + (tap ? tap[1] : 0)) * h; if (!e.auSol) p.y += v.y * h;
      let meilleur = null;
      for (const c of monde.cols) {
        if (!c.actif) continue;
        if (Math.abs(p.x - c.x) > 22 || Math.abs(p.z - c.z) > 22) continue;
        if (p.y < c.top - PAS && p.y + H > c.bas) {
          if (v.y > 0 && y0 + H <= c.bas + 0.08 && dedans(c, p.x, p.z)) { p.y = c.bas - H; v.y = 0; }   // plafond
          else repousse(c, p, R);
        }
      }
      for (const c of monde.cols) {
        if (!c.actif || !dedans(c, p.x, p.z, 0.1)) continue;
        if (c.top <= y0 + PAS + 1e-3 && c.top >= p.y - (e.auSol ? 0.5 : 1e-3) && (!meilleur || c.top > meilleur.top)) meilleur = c;
      }
      if (meilleur && v.y <= 0.01) {
        if (meilleur.rebond && !e.auSol) { p.y = meilleur.top; v.y = meilleur.rebond; meilleur.pulse = 1; double = false; e.sol = null; e.evenements.push('rebond'); joue('Jump_Loop', 0.1); continue; }
        p.y = meilleur.top; v.y = 0; e.auSol = true; e.sol = meilleur;
      } else if (e.auSol) { e.auSol = false; e.sol = null; v.y = Math.min(v.y, 0); }
    }
    if (e.auSol && e.sol?.surPas) e.sol.surPas();
    if (e.auSol && !etait) { double = false; tAtterri = 0.2; vEcrase = -Math.min(7, 2 + Math.abs(chute) * 0.35); e.evenements.push(chute < -14 ? 'gros' : 'atterri'); }
    if (e.auSol && e.sol?.nom && e.sol.nom !== e.sur) { e.sur = e.sol.nom; e.evenements.push('lieu'); }
    /* dernier appui sûr, pour revenir après une chute */
    if (e.auSol && e.sol?.fixe) { tSur += dt; if (tSur > 0.25) { sur.copy(p); const dx = e.sol.x - p.x, dz = e.sol.z - p.z, d = Math.hypot(dx, dz) || 1, r = Math.min(1.2, d); sur.x += dx / d * r; sur.z += dz / d * r; tSur = 0; } }
    if (p.y < monde.bas) e.evenements.push('chute');

    /* animation */
    const vh = Math.hypot(v.x, v.z); tAtterri = Math.max(0, tAtterri - dt); tRoule = Math.max(0, tRoule - dt);
    if (e.auSol) {
      tRoule = 0;
      if (vh > 0.6) { joue(e.sprint && vh > V_COURSE + 0.5 ? 'Sprint_Loop' : 'Jog_Fwd_Loop', 0.14, e.sprint ? 1.15 : 1); tPas -= dt * vh; if (tPas <= 0) { tPas = 2.3; e.evenements.push('pas'); } e.danse = false; }
      else if (e.danse) joue('Dance_Loop', 0.3);
      else if (tAtterri > 0) joue('Jump_Land', 0.06, 1.4);
      else joue('Idle_Loop', 0.22);
    } else if (tRoule <= 0) joue('Jump_Loop', 0.15);
    /* écrasement et étirement (ressort) */
    vEcrase += (-ecrase * 190 - vEcrase * 15) * dt; ecrase += vEcrase * dt;
    const sy = 1 + Math.max(-0.3, Math.min(0.3, ecrase * 0.09)); group.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    group.rotation.y = e.cap;
    perso.setBase(e.danse ? 'happy' : 'neutral'); temps += dt; perso.update(dt, temps); visage();
  };
  e.retour = () => { e.replace(sur); p.y = sur.y + 0.6; };
  return e;
}
