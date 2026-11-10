import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

export function createRoomLighting(scene, renderer, mobile) {
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  let environmentTarget;
  const restoreEnvironment = () => {
    const generator = new THREE.PMREMGenerator(renderer);
    const environment = new RoomEnvironment();
    environmentTarget?.dispose();
    environmentTarget = generator.fromScene(environment, .07);
    scene.environment = environmentTarget.texture;
    environment.dispose();
    generator.dispose();
  };
  restoreEnvironment();
  scene.environmentIntensity = .27;

  const hemi = new THREE.HemisphereLight('#bfcaff', '#786486', 1.37);
  const key = new THREE.DirectionalLight('#ffe0b7', 2.05);
  key.position.set(-3.8, 6.6, 2.8);
  key.castShadow = true;
  const resolution = mobile ? 512 : 1024;
  key.shadow.mapSize.set(resolution, resolution);
  Object.assign(key.shadow.camera, { left: -6.8, right: 6.8, top: 7.4, bottom: -7.4, near: .5, far: 22 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.radius = 2;
  key.shadow.bias = -.00022;
  key.shadow.normalBias = .024;
  const fill = new THREE.DirectionalLight('#899cff', .64);
  fill.name = 'Contre-jour froid';
  fill.position.set(4.2, 3, -3.2);
  scene.add(hemi, key, fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: .17, color: '#4c4378', depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.y = -.34;
  scene.add(ground);

  const day = new THREE.Color('#ffe0b7');
  const overcast = new THREE.Color('#cfcefa');
  const update = weather => {
    key.intensity = 2.05 - weather.cloud * .92;
    key.color.copy(day).lerp(overcast, weather.cloud * .8);
    hemi.intensity = 1.37 + weather.cloud * .18;
    fill.intensity = .64 + weather.rain * .14;
  };
  return { update, restoreEnvironment };
}

// Finish families describe surfaces in the existing models. Their textures,
// glTF nodes, interaction anchors, glass, displays and animated emissives stay authored.
const finishes = {
  desk: { roughness: .69, metal: .58, tint: '#c0c9d9', mix: .06, facet: /(?:pad|frame|shell|handle|speaker|ceramic)/i },
  enamel: { roughness: .65, metal: .56, tint: '#8dbb8a', mix: .13, facet: /(?:blech|tuerel|front|drawer|paint)/i },
  audio: { roughness: .74, metal: .60, tint: '#a2a8b7', mix: .06, facet: /(?:body|cabinet|plastic|amp)/i },
  electronics: { roughness: .69, metal: .43, tint: '#a8a9c3', mix: .07, facet: /(?:mainbody|case|outer|plastic)/i },
  textile: { roughness: .91, metal: .62, tint: '#655e7a', mix: .10, facet: /.*/ },
  plant: { roughness: .84, metal: .35, tint: '#76a682', mix: .12, facet: /(?:wood|leaf|foliage)/i },
  tea: { roughness: .88, metal: .49, tint: '#b49272', mix: .07, facet: /(?:wood|clay|stone)/i },
  personal: { roughness: .73, metal: .66, tint: '#aea0b8', mix: .07, facet: /(?:body|plastic|wood|stone)/i },
  character: { roughness: .83, metal: .60, tint: '#8e94c1', mix: .02, facet: /^(?:jacket|hair|legs|shirt)/i },
};

export function createRoomFinishes() {
  const versions = new WeakMap();
  const cloth = new WeakMap();
  return (root, family) => {
    const finish = finishes[family];
    const tint = new THREE.Color(finish.tint);
    root.traverse(object => {
      if (!object.isMesh) return;
      if (object.userData.isInk) {
        if (family !== 'character') object.visible = false;
        return;
      }
      const style = material => {
        if (family === 'character' && object.isSkinnedMesh && /^(jacket|legs|shirt)$/.test(object.parent?.name)
            && material.isMeshBasicMaterial && !material.map && !material.transparent) {
          if (!cloth.has(material)) {
            cloth.set(material, new THREE.MeshStandardMaterial({
              name: material.name, color: material.color, side: material.side,
              roughness: .87, flatShading: true, emissive: material.color, emissiveIntensity: .13,
            }));
          }
          return cloth.get(material);
        }
        if (!material.isMeshStandardMaterial || material.transparent || material.alphaTest ||
            material.userData.unique || material.transmission || material.emissiveMap ||
            material.map?.isCanvasTexture || material.map?.isVideoTexture ||
            material.emissive.getHex() !== 0 || material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return material;

        const facet = finish.facet.test(object.name + ' ' + material.name) && !material.normalMap;
        const signature = family + (facet ? ':facets' : ':smooth');
        let variants = versions.get(material);
        if (!variants) versions.set(material, variants = new Map());
        if (variants.has(signature)) return variants.get(signature);

        const result = material.clone();
        result.roughness = Math.min(.96, THREE.MathUtils.lerp(result.roughness, finish.roughness, .72));
        result.metalness *= finish.metal;
        if (result.isMeshPhysicalMaterial) result.clearcoat *= .48;
        const strength = result.map || result.vertexColors ? finish.mix * .38 : finish.mix;
        // Multiply in linear space so an ivory case never turns lavender and an
        // obsidian surface doesn't lose its base value.
        result.color.lerp(result.color.clone().multiply(tint), strength);
        result.flatShading ||= facet;
        variants.set(signature, result);
        return result;
      };
      object.material = Array.isArray(object.material) ? object.material.map(style) : style(object.material);
    });
  };
}
