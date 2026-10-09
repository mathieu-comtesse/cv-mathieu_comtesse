import { THREE } from './kit.js?v=cv-scene-v27';
import { createCharacter } from './character.js?v=bf01a16';

/* Portrait 3D de la page Info : le personnage, en buste, dont la tête suit le curseur (comme le portrait de la référence). */
export async function initPortrait(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#a9a49a', 1.6));
  const sun = new THREE.DirectionalLight('#fff3e0', 2.4); sun.position.set(1.5, 2.5, 3); scene.add(sun);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);

  const hero = await createCharacter();
  hero.group.rotation.y = 0.18;
  scene.add(hero.group);
  hero.play('Idle_Loop', { fade: 0.01 }); hero.setBase('neutral');
  hero.setHeadOnly(true);                 // la tête seule, comme demandé
  // cadrage : buste, tête au tiers supérieur
  hero.update(0.5, 0.5);
  const head = hero.wp('Head');
  camera.position.set(0, head.y - 0.01, 4.2);
  camera.lookAt(0, head.y - 0.01, 0);

  const resize = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); const aspect = w / h; const v = 0.82; camera.top = v; camera.bottom = -v; camera.left = -v * aspect; camera.right = v * aspect; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();

  let held = false;
  const point = (e) => {
    const r = host.getBoundingClientRect();
    const x = Math.max(-1.25, Math.min(1.25, ((e.clientX - r.left) / r.width) * 2 - 1));
    const y = Math.max(-1.15, Math.min(1.15, ((e.clientY - r.top) / r.height) * 2 - 1));
    hero.lookAtPointer(x * (held ? 1.12 : 1), y * (held ? 1.08 : 1));
  };
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') point(e); }, { passive: true });
  host.addEventListener('pointerenter', () => hero.setHoverExpression(true));
  host.addEventListener('pointerleave', () => { if (!held) { hero.setHoverExpression(false); hero.resetLook(); } });
  host.addEventListener('pointerdown', (e) => {
    held = true; host.setPointerCapture?.(e.pointerId); point(e); hero.flash('amazed', 0.55);
  });
  const release = (e) => {
    held = false; try { host.releasePointerCapture?.(e.pointerId); } catch {}
    hero.setHoverExpression(host.matches(':hover')); if (!host.matches(':hover')) hero.resetLook();
  };
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);

  const clock = new THREE.Clock(); let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) clock.getDelta(); }).observe(host);
  (function loop() { requestAnimationFrame(loop); if (!visible || document.hidden) return; const dt = Math.min(clock.getDelta(), 0.05); hero.update(dt, clock.elapsedTime); renderer.render(scene, camera); })();
}
