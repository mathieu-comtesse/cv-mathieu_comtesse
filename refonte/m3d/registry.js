// Registre unique des machines : seul endroit où un identifiant est associé à son module.
// Accueil, tuiles, fiches, démonstrations et tests passent tous par ici (aucune table locale ailleurs).
// ?machines=old : comparaison explicite avec les anciens modèles (diagnostic uniquement).
export const MACHINES = {
  finance: 'finance-reservoir', vm: 'vm-sorting', moteur: 'q18', pp: 'pp-clock', cerfa: 'cerfa-sorter', vre: 'vre-counter',
  'vrestudio-musicbox': 'nisaru', powerbi: 'powerbi-paternoster', studio: 'studio-pdf', suivi: 'suivi-switchboard', gares: 'gares-board'
};
export const OLD_MACHINES = {
  finance: 'finance', vm: 'vm', moteur: 'moteur', pp: 'pp', cerfa: 'cerfa', vre: 'vre-wattselse',
  'vrestudio-musicbox': 'nisaru', powerbi: 'powerbi-wattselse', studio: 'studio-wattselse', suivi: 'suivi', gares: 'gares'
};
/** Cadrage de présentation par machine (fiches) : angle en degrés, distance de la caméra, hauteur de visée (écran large / mobile), échelle du modèle.
 *  Une machine longue et basse (Studio PDF, Q18) se présente de trois quarts et plus grande ; une machine haute (horloge PP) garde sa verticalité ;
 *  le tableau des gares est plus frontal pour que ses caractères restent lisibles. Les proportions du modèle ne changent pas. */
export const FRAMING_DEFAULT = { yaw: 36, pitch: 26, dist: 34, aimY: 6.2, aimYm: 13, scale: 1.2 };
export const FRAMING = {
  moteur: { yaw: 30, pitch: 24, scale: 1.15 },
  studio: { yaw: 34, pitch: 27, aimYm: 14, scale: 1.3 },
  gares: { yaw: 14, pitch: 18, dist: 37, aimY: 7.5, scale: 1.05 },
  cerfa: { scale: 1.35 },
  finance: { dist: 36, aimY: 7.5, aimYm: 14, scale: 1.0 },
  vm: { scale: 1.2 },
  pp: { yaw: 40, pitch: 22, aimY: 8.2, aimYm: 16, scale: 1.4 },
  powerbi: { yaw: 36, pitch: 20, dist: 38, aimY: 8.5, aimYm: 16, scale: .95 },
  vre: { aimY: 7.5, aimYm: 15, scale: 1.3 },
  suivi: { dist: 36, aimY: 7.5, scale: 1.1 },
  'vrestudio-musicbox': { yaw: 28, pitch: 24, scale: 1.3 }
};
export const framingOf = (name) => ({ ...FRAMING_DEFAULT, ...(FRAMING[name] || {}) });
export const isOld = () => typeof location !== 'undefined' && /[?&]machines=old\b/.test(location.search);
export const moduleName = (name) => (isOld() ? OLD_MACHINES : MACHINES)[name];
/** importe le module de la machine ; la dernière valeur chargée est exposée pour les tests (window.__cvMachineModules) */
export async function loadMachine(name) {
  const file = moduleName(name); if (!file) throw new Error('machine inconnue : ' + name);
  const mod = await import('./' + file + '.js');
  if (typeof window !== 'undefined') (window.__cvMachineModules ??= {})[name] = file;
  return mod;
}
