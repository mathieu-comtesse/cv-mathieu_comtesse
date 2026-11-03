/* Rendu « peint » de la DA : trois bandes de lumière dont l'ombre vire au violet (jamais un simple assombrissement), et un pointillé de grain
 * fixé sur l'objet (lumineux dans l'ombre, sombre dans la lumière), comme les aplats peints des références. S'ajoute à n'importe quel matériau
 * Standard, Toon ou Lambert sans changer ses propriétés : les animations qui le pilotent continuent de fonctionner. */
const FRAG = `
{
  float daBase = dot(diffuseColor.rgb, vec3(0.3333)) + 0.002;
  float daK = clamp(dot(outgoingLight, vec3(0.3333)) / daBase, 0.0, 2.5);
  float daLit = smoothstep(0.46, 0.52, daK) * 0.5 + smoothstep(0.86, 0.92, daK) * 0.5;
  vec3 daSh = diffuseColor.rgb * vec3(0.72, 0.46, 0.70) + vec3(0.030, 0.000, 0.070);
  vec3 daMd = diffuseColor.rgb * vec3(0.93, 0.80, 0.90);
  vec3 daHi = diffuseColor.rgb * vec3(1.08, 1.00, 0.92);
  vec3 daC = daLit < 0.5 ? mix(daSh, daMd, daLit * 2.0) : mix(daMd, daHi, (daLit - 0.5) * 2.0);
  vec3 daQ = floor(vDaPos * uDaGrain);
  float daN = fract(sin(dot(daQ, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  daC += vec3(0.07, 0.05, 0.03) * step(0.90, daN) * (1.0 - daLit) * 0.9;
  daC *= 1.0 - step(0.93, fract(daN * 7.7)) * daLit * 0.10;
  daC = mix(vec3(dot(daC, vec3(0.3333))), daC, 1.12);
  outgoingLight = daC;
}
`;
export const daGrain = { value: 36 };
export function daLook(material) {
  if (!material || material.userData.daLook) return material;
  material.userData.daLook = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    shader.uniforms.uDaGrain = daGrain;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDaPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDaPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDaPos;\nuniform float uDaGrain;')
      .replace('#include <opaque_fragment>', FRAG + '\n#include <opaque_fragment>');
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = function () { return (key ? key.call(this) : '') + '|da2'; };
  material.needsUpdate = true;
  return material;
}
