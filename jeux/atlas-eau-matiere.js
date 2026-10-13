/* Effets originaux pour Atlas. Les ressources de Sandcastle ont guidé la
 * séparation sable sec/humide, eau, écume et caustiques ; aucun shader ou
 * bitmap du jeu n'est utilisé. La houle ci-dessous est une approximation
 * visuelle analytique, pas la simulation GPU hauteur/vitesse du jeu. */
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

export const GLSL_CAUSTIQUES = `
// Réseau cellulaire animé, indépendant des 64 tranches de texture du jeu.
float caustiqueAtlas(vec2 p, float t) {
  p += vec2(sin(p.y * .65 + t * .4), cos(p.x * .7 - t * .32)) * .22;
  vec2 cellule = floor(p), f = fract(p);
  float premier = 9., second = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 q = vec2(float(x), float(y));
    vec2 h = vec2(h21(cellule + q), h21(cellule + q + 19.));
    vec2 centre = q + .5 + .3 * sin(h * 6.283 + t * .38);
    float d = length(centre - f);
    if (d < premier) { second = premier; premier = d; }
    else second = min(second, d);
  }
  float ecart = second - premier, aa = max(fwidth(ecart), .012);
  return (1. - smoothstep(.015, .055 + aa, ecart)) * .65;
}
`;
