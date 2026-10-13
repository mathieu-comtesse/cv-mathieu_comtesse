/* ATLAS · FOND MARIN ORIGINAL.
 * Silhouettes procédurales pour le fond virtuel du shader d'eau opaque.
 * Aucun bitmap, maillage, code ni shader de Sandcastle n'est réutilisé.
 * Dépend de h21 / n2 (GLSL_BRUIT dans atlas-ciel.js).
 * p : coordonnées XZ monde en mètres, profondeur : mètres positifs,
 * temps : secondes. Appeler sur la couleur du fond avant écume / reflets.
 * La limite eau / terre reste à appliquer par le shader appelant.
 * Pas de drawcall ni texture supplémentaire ; une seule cellule consultée.
 */
export const GLSL_FOND_MARIN = `
float atlasDistanceBranche(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  return length(p - a - ab * clamp(dot(p - a, ab) / max(dot(ab, ab), .00001), 0., 1.));
}

float atlasBordMarin(float distance, float largeur, float aa) {
  return 1. - smoothstep(largeur - aa, largeur + aa, distance);
}

vec3 fondMarinAtlas(vec3 base, vec2 p, float profondeur, float temps) {
  // L'espace vide entre cellules évite coupures et grandes nappes uniformes.
  vec2 cellule = floor(p / 1.45);
  float graine = h21(cellule + vec2(76.13, 13.76));
  float presence = step(.69, graine);
  float visibilite = smoothstep(.08, .40, profondeur) * exp(-max(profondeur, 0.) * .55);
  vec2 q = fract(p / 1.45) - .5;
  q -= vec2(h21(cellule + 7.2), h21(cellule + 19.4)) * .16 - .08;
  float angle = h21(cellule + 34.7) * 6.283185;
  q = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * q;
  float taille = mix(.75, 1.12, h21(cellule + 22.1));
  q /= taille;
  // Le filtre se mesure avant les branches de sélection de l'espèce.
  float aa = max(length(fwidth(p)) / (1.45 * taille), .0015);
  float espece = h21(cellule + 48.6);
  float masque = 0.;
  vec3 teinte = vec3(.15, .235, .13);
  float courant = sin(temps * .64 + graine * 9.) * .014;

  if (espece < .66) {
    // Touffe d'herbes : cinq rubans étroits, éventail enraciné.
    for (int i = 0; i < 5; i++) {
      float k = float(i) - 2.;
      float hauteur = .19 + .06 * sin(float(i) * 1.7 + graine * 6.);
      float y = (q.y + .16) / hauteur;
      float t = clamp(y, 0., 1.);
      float centre = k * .035 * t + k * .009 + courant * t * t;
      centre += sin(t * 3.1 + graine * 5.) * .012 * t;
      float largeur = mix(.010, .002, t);
      float ruban = atlasBordMarin(abs(q.x - centre), largeur, aa);
      float bouts = smoothstep(-aa, aa, q.y + .16) *
        (1. - smoothstep(hauteur - aa, hauteur + aa, q.y + .16));
      masque = max(masque, ruban * bouts);
    }
    teinte += vec3(.05, .055, .018) * smoothstep(-.15, .08, q.y);
  } else if (espece < .88) {
    // Kelp fin : rachis sinueux et quatre petites frondes latérales.
    float t = clamp((q.y + .17) / .36, 0., 1.);
    float rachis = sin(t * 5. + graine * 4.) * .027 * t + courant * t;
    masque = atlasBordMarin(abs(q.x - rachis), .007, aa) *
      smoothstep(-.17 - aa, -.17 + aa, q.y) *
      (1. - smoothstep(.19 - aa, .19 + aa, q.y));
    for (int i = 0; i < 4; i++) {
      float y = -.10 + float(i) * .072;
      float ty = (y + .17) / .36;
      float x = sin(ty * 5. + graine * 4.) * .027 * ty + courant * ty;
      float sens = mod(float(i), 2.) * 2. - 1.;
      vec2 a = vec2(x, y), b = a + vec2(sens * .068, .046);
      float feuille = atlasBordMarin(atlasDistanceBranche(q, a, b), .012, aa);
      masque = max(masque, feuille);
    }
    teinte = vec3(.17, .22, .105);
  } else {
    // Petit corail ramifié : une base commune et des branches arrondies.
    masque = atlasBordMarin(atlasDistanceBranche(q, vec2(0., -.12), vec2(0., .10)), .013, aa);
    for (int i = 0; i < 4; i++) {
      float k = float(i);
      float sens = mod(k, 2.) * 2. - 1.;
      float y = -.07 + k * .036;
      vec2 a = vec2(0., y), b = vec2(sens * (.064 + .014 * k), y + .055);
      masque = max(masque, atlasBordMarin(atlasDistanceBranche(q, a, b), .013, aa));
      vec2 bout = b + vec2(sens * .012, .040);
      masque = max(masque, atlasBordMarin(atlasDistanceBranche(q, b, bout), .009, aa));
    }
    teinte = vec3(.34, .255, .205);
  }

  // Filtrage mobile / vue lointaine : les petits traits disparaissent sans scintiller.
  float detail = 1. - smoothstep(.011, .042, aa);
  float variation = .90 + .14 * n2(p * 4.3 + 3.);
  // La teinte du milieu revient avec la profondeur (absorption / diffusion).
  vec3 immergee = mix(teinte * variation, base * .82, 1. - exp(-max(profondeur, 0.) * .34));
  return mix(base, immergee, clamp(masque * presence * visibilite * detail * .72, 0., .70));
}
`;
