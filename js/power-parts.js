import { THREE } from './kit.js?v=cv-scene-v29';

/* Prises mâles et femelles du fichier « Power Plug / Outlet / Adapter / Connector Strip » (BlackCube, CC BY 4.0).
 * Le fichier est en centimètres : chaque pièce est ramenée à son point d'insertion, à l'échelle du mètre.
 *  - fiche : l'origine est le plan de contact des broches (broches vers -y), le câble sort vers +x ;
 *  - prise murale : l'origine est le centre du puits, sur la face avant (vers +y) ;
 *  - multiprise : l'origine est le milieu des cinq prises, sur la face du dessus (y = 0), longueur le long de x. */
const CM = 0.01;
const PLUGS = {
  white: { node: 'power_plug', base: [0, -0.917, 15.893], exit: [4.937, 1.998, 15.909] },
  black: { node: 'power_plug_2', base: [0, 5.204, 15.893], exit: [4.652, 7.853, 15.893] },
};
const OUTLET = { node: 'power_outlet', top: [0, 2.365, 23.332], depth: 2.33 };
const STRIP = { nodes: ['connector_strip'], top: [8.62, 2.806, 30.496], pitch: 4.31, count: 5, bottom: -1.275, cord: [25.6, 0.77, 30.5] };   // axe du presse-étoupe mesuré dans le modèle (pointe à x = 26)

export function createPowerParts(model) {
  const rootNode = model.scene.getObjectByName('RootNode');
  if (!rootNode) throw new Error('Power parts: RootNode missing');
  const part = (name, anchor) => {
    const src = rootNode.getObjectByName(name);
    if (!src) throw new Error('Power parts: ' + name + ' missing');
    const outer = new THREE.Group(), inner = new THREE.Group();
    inner.add(src.clone(true));
    inner.position.set(-anchor[0], -anchor[1], -anchor[2]);
    outer.add(inner);
    outer.scale.setScalar(CM);
    outer.userData.batchRoot = true; outer.userData.noInk = true;
    outer.traverse((o) => { if (o.isMesh) { o.userData.noInk = true; o.castShadow = true; o.receiveShadow = true; } });
    return outer;
  };
  const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  return {
    /** Fiche mâle coudée (blanche ou noire). userData.exit = point de sortie du câble (cm, repère de la fiche). */
    plug(kind = 'black') {
      const d = PLUGS[kind], g = part(d.node, d.base);
      g.name = 'PowerPlug-' + kind; g.userData.exit = rel(d.exit, d.base); g.userData.pinLength = 2.27;
      return g;
    },
    /** Prise femelle encastrée (face vers +y). */
    outlet() {
      const g = part(OUTLET.node, OUTLET.top);
      g.name = 'PowerOutlet'; g.userData.depth = OUTLET.depth;
      return g;
    },
    /** Multiprise à cinq prises, interrupteur à droite, cordon à droite. userData.sockets = centres des prises (cm). */
    strip() {
      const g = part(STRIP.nodes[0], STRIP.top);
      g.name = 'PowerStrip';
      g.userData.sockets = Array.from({ length: STRIP.count }, (_, i) => [(i - (STRIP.count - 1) / 2) * STRIP.pitch, 0, 0]);
      g.userData.cord = rel(STRIP.cord, STRIP.top);
      g.userData.height = STRIP.top[1] - STRIP.bottom;
      g.userData.rocker = g.getObjectByName('switch_switch_0');
      return g;
    },
  };
}

/** Point d'un repère local (en cm) exprimé dans le repère du parent : échelle uniforme (celle de l'objet, centimètres compris), rotation autour de y. */
export function pointOf(obj, local) {
  const k = obj.scale.x;
  return new THREE.Vector3(local[0] * k, local[1] * k, local[2] * k).applyAxisAngle(new THREE.Vector3(0, 1, 0), obj.rotation.y).add(obj.position);
}
/** Place une fiche dans une prise : pose, orientation (la sortie du câble regarde la direction donnée, en radians autour de y). */
export function insertPlug(plug, at, yaw, scale = 1) {
  plug.position.copy(at); plug.rotation.y = yaw; plug.scale.setScalar(CM * scale);
  return pointOf(plug, plug.userData.exit);
}
/** Cap (radians autour de y) qui fait regarder la sortie de la fiche, locale +x, vers (dx, dz). */
export const yawToward = (dx, dz) => Math.atan2(-dz, dx);
