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
export const isOld = () => typeof location !== 'undefined' && /[?&]machines=old\b/.test(location.search);
export const moduleName = (name) => (isOld() ? OLD_MACHINES : MACHINES)[name];
/** importe le module de la machine ; la dernière valeur chargée est exposée pour les tests (window.__cvMachineModules) */
export async function loadMachine(name) {
  const file = moduleName(name); if (!file) throw new Error('machine inconnue : ' + name);
  const mod = await import('./' + file + '.js');
  if (typeof window !== 'undefined') (window.__cvMachineModules ??= {})[name] = file;
  return mod;
}
