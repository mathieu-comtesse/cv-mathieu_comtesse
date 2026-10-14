/* Houle analytique d’Atlas : approximation, distincte des calculs GPU natifs.
 * Les caustiques utilisent maintenant le volume original Sandcastle #932. */
export const GLSL_HOULE = `
// x = hauteur ; yz = pente analytique, cohérente avec la géométrie.
vec3 houleAtlas(vec2 p, float t) {
  vec2 a = vec2(.86, .51), b = vec2(-.42, .91), c = vec2(.97, -.24);
  float u = dot(p,a) * 1.65 - t * 1.18;
  float v = dot(p,b) * 2.8 - t * 1.56;
  float w = dot(p,c) * 5.2 - t * 2.06;
  vec2 pente = a * .035 * 1.65 * cos(u) + b * .019 * 2.8 * cos(v) + c * .008 * 5.2 * cos(w);
  return vec3(.035 * sin(u) + .019 * sin(v) + .008 * sin(w), pente);
}
`;

// Original Caustics #932 volume, packed losslessly into a bordered atlas.
// Spatial/time mapping is a browser adaptation; full source lighting differs.
export const GLSL_CAUSTIQUES = `
uniform sampler2D uOriginalCaustics;
float trancheCaustique(vec2 p,float frame){
 float f=mod(frame+64.,64.);vec2 tile=vec2(mod(f,8.),floor(f/8.));
 return texture2D(uOriginalCaustics,(tile*258.+1.+fract(p)*256.)/2064.).r;
}
float caustiqueAtlas(vec2 p,float t){
 float z=fract(t*.2)*64.-.5,f=floor(z);
 return mix(trancheCaustique(p*.25,f),trancheCaustique(p*.25,f+1.),fract(z));
}
`;
