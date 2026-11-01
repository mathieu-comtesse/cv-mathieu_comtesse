// InteractionStateManager : machine à états explicite. Les états ne se concurrencent pas : chaque entrée du clavier, de la souris
// ou du toucher demande à la machine ce qu'elle autorise.
//   EXPLORATION : la molette fait avancer la caméra.
//   INSPECTION  : une machine est sélectionnée et manipulable (règles, réglage propre).
//   LECTURE     : un panneau est ouvert, la molette défile dans le panneau, la caméra est figée.
//   NAVIGATION  : la caméra rejoint un point d'intérêt choisi.
//   TRANSITION  : changement de cadrage ou ouverture de panneau en cours.
export const STATE = { EXPLORATION: 'exploration', INSPECTION: 'inspection', LECTURE: 'lecture', NAVIGATION: 'navigation', TRANSITION: 'transition' };

const ALLOWED = {
  exploration: ['inspection', 'navigation', 'transition', 'lecture'],
  inspection: ['exploration', 'lecture', 'navigation', 'transition'],
  lecture: ['inspection', 'transition'],
  navigation: ['exploration', 'inspection', 'transition', 'lecture'],
  transition: ['exploration', 'inspection', 'lecture', 'navigation']
};

export class InteractionStateManager extends EventTarget {
  constructor() { super(); this.state = STATE.EXPLORATION; this.history = []; }
  is(...s) { return s.includes(this.state); }
  /** Passe à un état si la transition est autorisée. Retourne false sinon. */
  to(next, detail = {}) {
    if (next === this.state) return true;
    if (!ALLOWED[this.state].includes(next)) return false;
    const prev = this.state; this.state = next;
    this.history.push(prev); if (this.history.length > 20) this.history.shift();
    document.documentElement.dataset.spState = next;
    this.dispatchEvent(new CustomEvent('change', { detail: { from: prev, to: next, ...detail } }));
    return true;
  }
  // priorités : 1 contrôle actif, 2 panneau ouvert, 3 machine sélectionnée, 4 déplacement général
  get wheelGoesTo() { return this.state === STATE.LECTURE ? 'panel' : this.state === STATE.NAVIGATION ? 'none' : 'camera'; }
  get cameraFree() { return this.state === STATE.EXPLORATION || this.state === STATE.INSPECTION; }
}
