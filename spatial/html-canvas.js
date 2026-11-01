// HTMLCanvasAdapter : HTML-in-Canvas (THREE.HTMLTexture, Three.js r184 du dépôt) pour une surface unique, la légende au sol du projet actif.
// L'API est détectée par ses fonctionnalités réelles (texElementImage2D, requestPaint, THREE.HTMLTexture), jamais par le nom du navigateur.
// Quand elle manque, la légende DOM flottante (annotations.js) porte déjà la même information : rien n'est masqué.
import * as THREE from 'three';

export function htmlInCanvasSupport(canvas) {
  try {
    const gl = canvas.getContext('webgl2');
    return !!(gl && 'texElementImage2D' in gl && 'requestPaint' in canvas && typeof THREE.HTMLTexture === 'function');
  } catch { return false; }
}

export class HTMLCanvasAdapter {
  constructor(world) { this.world = world; this.active = false; this.mesh = null; this.el = null; this.tex = null; this.lastKey = ''; }
  /** Crée l'unique surface. Retourne false si l'API n'est pas disponible. */
  init() {
    if (!htmlInCanvasSupport(this.world.canvas)) return false;
    try {
      const el = document.createElement('div'); el.className = 'sp-hic'; el.setAttribute('aria-hidden', 'true');    // doublon visuel : l'information accessible est dans le DOM de la page
      el.style.cssText = 'width:640px;height:160px';
      el.innerHTML = '<p class="sp-hic-k"></p><p class="sp-hic-t"></p><p class="sp-hic-s"></p>';
      this.el = el; this.tex = new THREE.HTMLTexture(el);
      const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, toneMapped: false });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), mat); this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.y = .06; this.mesh.visible = false; this.mesh.renderOrder = 2;
      this.world.scene.add(this.mesh); this.active = true; return true;
    } catch (e) { console.warn('HTML-in-Canvas indisponible', e); this.active = false; return false; }
  }
  /** Pose la légende au sol devant le projet actif. Le texte n'est repeint que s'il change. */
  show(entry) {
    if (!this.active) return;
    if (!entry || entry.kind === 'hub') { this.mesh.visible = false; return; }
    const key = entry.id; this.mesh.visible = true;
    this.mesh.position.set(entry.pos[0] + (entry.cam?.shift >= 0 ? 1 : -1) * 2, .06, entry.pos[2] + 9.5);
    this.mesh.rotation.z = 0;
    if (key === this.lastKey) return; this.lastKey = key;
    this.el.querySelector('.sp-hic-k').textContent = String(entry.index).padStart(2, '0') + ' · ' + (entry.domainLabel || '');
    this.el.querySelector('.sp-hic-t').textContent = entry.title; this.el.querySelector('.sp-hic-s').textContent = entry.sub || '';
    this.tex.needsUpdate = true;
  }
}
