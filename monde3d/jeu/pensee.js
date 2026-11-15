/* Bulle de pensée, reprise de la pièce : un nuage au-dessus de Mathieu, avec la miniature 3D de l'objet qui l'occupe et le nom de l'activité. */
import * as THREE from 'three';

const NUAGE = `<svg viewBox="0 0 180 150" aria-hidden="true"><g fill="#fbf7ec" stroke="#2a2530" stroke-width="4.4"><circle cx="48" cy="58" r="34"/><circle cx="82" cy="36" r="34"/><circle cx="124" cy="40" r="34"/><circle cx="148" cy="76" r="28"/><circle cx="120" cy="100" r="34"/><circle cx="76" cy="102" r="32"/><circle cx="40" cy="90" r="28"/></g><g fill="#fbf7ec"><circle cx="48" cy="58" r="31.8"/><circle cx="82" cy="36" r="31.5"/><circle cx="124" cy="40" r="31.5"/><circle cx="148" cy="76" r="25.5"/><circle cx="120" cy="100" r="31.5"/><circle cx="76" cy="102" r="29.5"/><circle cx="40" cy="90" r="25.5"/><rect x="50" y="40" width="80" height="60"/></g></svg>`;
const LIN = Float32Array.from({ length: 256 }, (_, i) => { const v = i / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });

export function creerPensee(el, piece) {
  el.innerHTML = `${NUAGE}<canvas width="128" height="128"></canvas><span></span><i></i><i></i>`;
  const canvas = el.querySelector('canvas'), legende = el.querySelector('span');
  let renderer = null, scene, cam, tourne, mat, visible = 0, image = 0, courant = null;
  const maillages = new Map();
  const prepare = () => {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); renderer.setPixelRatio(1); renderer.setSize(128, 128, false); renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#ffffff', '#b9ad95', 1.6));
    const s = new THREE.DirectionalLight('#fff3e0', 2.4); s.position.set(2, 3, 2.5); scene.add(s);
    cam = new THREE.OrthographicCamera(-0.62, 0.62, 0.62, -0.62, 0.1, 20); cam.position.set(0, 0, 5);
    tourne = new THREE.Group(); const incline = new THREE.Group(); incline.rotation.x = 0.42; incline.add(tourne); scene.add(incline);
    mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  };
  const maillage = (id) => {
    if (maillages.has(id)) return maillages.get(id);
    let me;
    const o = piece.objets.get(id);
    if (o) {
      const [x0, y0, z0, x1, y1, z1] = o.bb, k = 1 / Math.max(x1 - x0, y1 - y0, z1 - z0), c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
      const P = new Float32Array(o.n * 9), C = new Float32Array(o.n * 9);
      for (let t = 0; t < o.n; t++) for (let j = 0; j < 3; j++) for (let a = 0; a < 3; a++) { P[t * 9 + j * 3 + a] = (piece.pos[(o.debut + t) * 9 + j * 3 + a] - c[a]) * k; C[t * 9 + j * 3 + a] = LIN[piece.coul[(o.debut + t) * 4 + a]]; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.computeVertexNormals();
      me = new THREE.Mesh(g, mat);
    } else {   // cristal
      me = new THREE.Group();
      for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.3, 0.5, 5), new THREE.MeshLambertMaterial({ color: '#f3eca5', flatShading: true })); m.position.y = s * 0.25; m.rotation.x = s < 0 ? Math.PI : 0; me.add(m); }
    }
    maillages.set(id, me); return me;
  };
  const v = new THREE.Vector3();
  return {
    get courant() { return courant; },
    montre(id, texte, duree = 4) {
      prepare(); courant = id; visible = duree; legende.textContent = texte;
      tourne.clear(); tourne.add(maillage(id)); tourne.rotation.y = -0.3; el.classList.add('vu');
    },
    cache() { visible = Math.min(visible, 0.01); },
    maj(dt, tete, camera) {
      if (visible <= 0) return;
      visible -= dt; if (visible <= 0) { el.classList.remove('vu'); courant = null; return; }
      v.copy(tete).project(camera);
      el.style.transform = `translate(${((v.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - v.y) / 2 * innerHeight).toFixed(1)}px) translate(-50%, -100%) scale(${Math.min(1, Math.max(0.3, innerWidth / 820)).toFixed(3)})`;
      tourne.rotation.y += dt * 0.9;
      if (++image % 3 === 0) renderer.render(scene, cam);
    },
  };
}
