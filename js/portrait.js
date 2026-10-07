import { THREE } from './kit.js?v=f7dc458';
import { createCharacter } from './character.js?v=f7dc458';

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
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);

  const hero = await createCharacter();
  hero.group.rotation.y = 0.18;
  scene.add(hero.group);
  hero.play('Idle_Loop', { fade: 0.01 }); hero.setBase('neutral');
  hero.setHeadOnly(true);                 // la tête seule, comme demandé
  // cadrage : buste, tête au tiers supérieur
  hero.update(0.5, 0.5);
  const head = hero.wp('Head');
  camera.position.set(0, head.y - 0.02, 1.9);
  camera.lookAt(0, head.y - 0.02, 0);

  const resize = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(host); resize();

  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = host.getBoundingClientRect();
    hero.lookAtPointer(Math.max(-1.4, Math.min(1.4, ((e.clientX - r.left) / r.width) * 2 - 1)), Math.max(-1.4, Math.min(1.4, ((e.clientY - r.top) / r.height) * 2 - 1)));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => hero.resetLook());
  host.addEventListener('pointerdown', () => { hero.setHoverExpression(true); hero.flash('amazed', 0.9); setTimeout(() => hero.setHoverExpression(false), 900); });

  const clock = new THREE.Clock(); let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) clock.getDelta(); }).observe(host);
  (function loop() { requestAnimationFrame(loop); if (!visible || document.hidden) return; const dt = Math.min(clock.getDelta(), 0.05); hero.update(dt, clock.elapsedTime); renderer.render(scene, camera); })();
}
