(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const J = window.AtlasGame.jeu, out = {};
  out.pins = document.querySelectorAll('.world-pin').length;
  document.querySelector('.world-pin').click(); await sleep(200); out.fiche = !document.getElementById('world-card').hidden;
  J.fermerFiche();
  // œufs : on déclenche chacun
  let n = 0; for (const [id, e] of J.oeufs) { try { e.action?.(); J.oeuf(id, e.texte); n++; } catch (err) { out['erreur_' + id] = String(err); } }
  out.oeufs = n + ' / ' + J.oeufs.size; out.eggsHud = document.getElementById('world-eggs').textContent;
  await sleep(500);
  // navigation
  J.pecher.entrer(); await sleep(300); J.sail.touches.add('up'); await sleep(1500); J.sail.touches.delete('up'); out.bateau = J.M.objets.bateau.position.toArray().map((v) => +v.toFixed(2));
  out.spots = J.pecher.spots.length; const s = J.pecher.spots[0]; J.M.objets.bateau.position.set(s.x - 0.3, 0, s.z);
  await sleep(300); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); await sleep(2500); out.phasePeche = J.pecher.peche.phase;
  await sleep(6000); out.phasePeche2 = J.pecher.peche.phase;
  J.pecher.sortir(); await sleep(300);
  // marche
  J.entrerMarche(); await sleep(200); J.marche.touches.add('up'); await sleep(1500); J.marche.touches.delete('up'); out.pos = J.marche.pos.toArray().map((v) => +v.toFixed(2)); J.sortirMarche();
  // nuit
  J.reglerNuit(true); await sleep(2500); out.nuit = document.body.classList.contains('is-night');
  return JSON.stringify(out);
})()
