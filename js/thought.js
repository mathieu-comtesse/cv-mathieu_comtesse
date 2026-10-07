import { THREE } from './kit.js?v=d40f751';

/* Bulle de pensée : un nuage avec la miniature 3D de l'activité qui tourne lentement (comme les pensées du personnage de référence).
 * Un second rendu minuscule (96 px) dessine une copie de l'objet ; le nuage est un SVG, la traîne de deux petits cercles. */
const CLOUD = `<svg class="cloud" viewBox="0 0 180 150" aria-hidden="true"><g fill="#fff"><circle cx="48" cy="58" r="34"/><circle cx="82" cy="36" r="34"/><circle cx="124" cy="40" r="34"/><circle cx="148" cy="76" r="28"/><circle cx="120" cy="100" r="34"/><circle cx="76" cy="102" r="32"/><circle cx="40" cy="92" r="26"/><rect x="40" y="40" width="110" height="64"/></g></svg>`;

export function createThought(el) {
  el.classList.add('thought');
  el.innerHTML = `${CLOUD}<canvas width="96" height="96"></canvas><span class="cap"></span><i class="t1"></i><i class="t2"></i>`;
  const canvas = el.querySelector('canvas'), cap = el.querySelector('.cap');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1); renderer.setSize(96, 96, false); renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9ad95', 1.5));
  const sun = new THREE.DirectionalLight('#fff3e0', 2.2); sun.position.set(2, 3, 2.5); scene.add(sun);
  const cam = new THREE.OrthographicCamera(-0.62, 0.62, 0.62, -0.62, 0.1, 20); cam.position.set(0, 0, 5); cam.lookAt(0, 0, 0);
  const spin = new THREE.Group(), tilt = new THREE.Group(); tilt.add(spin); scene.add(tilt);
  let rate = 0.9;
  return {
    show(obj, text, { tiltDeg = 25, scale = 1, yaw = -17 } = {}) {
      while (spin.children.length) spin.remove(spin.children[0]);
      if (obj) {
        const c = obj.clone(true);
        const kill = []; c.traverse((o) => { if (o.userData && o.userData.isInk) kill.push(o); });
        kill.forEach((o) => o.removeFromParent());
        c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.visible = true;
        const holder = new THREE.Group(); holder.add(c); holder.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(holder), size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
        const k = (1.0 / Math.max(size.x, size.y, size.z)) * scale;
        c.position.sub(ctr); holder.scale.setScalar(k); spin.add(holder);
        tilt.rotation.x = tiltDeg * Math.PI / 180; spin.rotation.y = yaw * Math.PI / 180;
      }
      cap.textContent = '';
    },
    update(dt) { if (spin.children.length) { spin.rotation.y += dt * rate; renderer.render(scene, cam); } },
  };
}
