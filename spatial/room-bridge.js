// RoomBridge : la vraie pièce d'accueil (js/room.js, personnage, mobilier, interactions) rendue avec la caméra du voyage spatial.
// Deux moteurs, une seule caméra : à chaque image, la caméra du monde (CameraTimeline) est copiée dans la caméra de la pièce juste avant son
// rendu. Les deux canvas se superposent donc avec exactement la même perspective, et la pièce rapetisse naturellement quand la caméra recule.
// Au repos (u = 0), la caméra du monde EST la caméra de la pièce : la clé 0 de la trajectoire est recalculée en direct depuis la vue réelle de la pièce.
const DEG = Math.PI / 180;

/** Même projection en perspective que la page d'accueil actuelle (refonte/main.js) : la pièce garde sa taille au centre, le proche grossit. */
function perspectivize(cam) {
  const N = 12, F = 140, R = 40;
  cam.near = N; cam.far = F; cam.isOrthographicCamera = false; cam.isPerspectiveCamera = true;
  cam.updateProjectionMatrix = function () {
    const k = N / R; this.projectionMatrix.makePerspective(this.left * k, this.right * k, this.top * k, this.bottom * k, N, F);
    this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  };
  cam.updateProjectionMatrix();
}

export async function loadRoom(container) {
  const [{ createRoom }, { initUI }] = await Promise.all([import('../js/room.js?v=nt6-20261026'), import('../js/ui.js?v=cv-monde3d-32')]);
  initUI();                                                            // fenêtres des applications de la pièce (poste Windows, rétro)
  window.__rfFreeCam = true;                                           // la caméra ne suit jamais le personnage (comme sur l'accueil)
  const room = await createRoom(container, document.getElementById('bubble'));
  perspectivize(room.camera); room.setCameraMode('free');
  return room;
}

/** Pose de la caméra de la pièce telle que son propre code la calcule (azimut, élévation, cible, distance 40, cadrage). */
export function roomPose(room, out = {}) {
  const v = room.view, t = room.target, r = 40, ce = Math.cos(v.el);
  out.pos = [t.x + Math.sin(v.az) * ce * r, t.y + Math.sin(v.el) * r, t.z + Math.cos(v.az) * ce * r];
  out.look = [t.x, t.y, t.z]; out.fov = 2 * Math.atan(room.camera.top / 40) / DEG; return out;
}

export class RoomBridge {
  constructor(room) { this.room = room; this.sync = true; this.visible = true; this.pose = { pos: [0, 0, 0], look: [0, 0, 0], fov: 24 }; }
  /** La caméra du monde (déjà calculée pour cette image) remplace celle de la pièce à chaque mise à jour de sa matrice et de sa projection :
      les éléments que la pièce positionne elle-même en suivant sa caméra (bulle de pensée, repères) restent alignés avec le rendu. */
  attach(world, ensureTick) {
    const r = this.room.renderer, orig = r.render.bind(r), cam = this.room.camera, w = world.camera;
    const copy = () => {
      cam.position.copy(w.position); cam.quaternion.copy(w.quaternion);
      cam.projectionMatrix.copy(w.projectionMatrix); cam.projectionMatrixInverse.copy(w.projectionMatrixInverse);
    };
    const umw = cam.updateMatrixWorld.bind(cam), upm = cam.updateProjectionMatrix.bind(cam);
    cam.updateMatrixWorld = (force) => { if (this.sync) { ensureTick(); copy(); } umw(force); };
    cam.updateProjectionMatrix = () => { upm(); if (this.sync) { ensureTick(); cam.projectionMatrix.copy(w.projectionMatrix); cam.projectionMatrixInverse.copy(w.projectionMatrixInverse); } };
    r.render = (scene, camera) => { if (camera === cam && this.sync) { ensureTick(); copy(); cam.updateMatrixWorld(true); } return orig(scene, camera); };
  }
  current() { return roomPose(this.room, this.pose); }
  /** Distance entre la caméra du monde et la cible de la pièce. */
  distance(camPos) { const t = this.room.target; return Math.hypot(camPos.x - t.x, camPos.y - t.y, camPos.z - t.z); }
}
