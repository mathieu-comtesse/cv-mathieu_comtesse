/* Sillage de glyphes sous le graphe de l'accueil, calculé par la carte graphique (WebGL2).
   Port des lois du fluide de la référence (shaders fluid, fluid-ambient et glyph-glitch, réglages par défaut du renderer) :
   petite grille de fluide stable, une cellule par glyphe (4 × 6 px), que le pointeur remue ; advection, tourbillon calé sur huit directions,
   poussées par blocs, divergence, 16 itérations de Jacobi, projection ; la teinte est dessinée en marques du graphe (cercles et carrés,
   pleins ou creux, deux tailles), plus claires sur les bords, 95 % des cellules laissées vides, masque de bruit mouvant, glyphes qui
   basculent d'un quart de tour, scintillement ; sur la page nue, 100 marques isolées apparaissent et disparaissent chacune à son rythme.
   Réglages : rayon 6, force 0,6, teinte 0,15, effacement 4/s, turbulence 200, glitch 3, opacité 0,4 × 0,4 (sillage) et 0,6 (marques isolées). */
const R = { taille: 6, rayon: 6, force: 0.6, teinte: 0.15, efface: 4, turbulence: 200, leveTon: 0.2, leveBord: 0.6, glitch: 3, bascule: 1,
  isoles: 100, isolesVitesse: 0.5, isolesFondu: 0.4, isolesLeve: 0.2, isolesTaille: 4, isolesVariete: 0.05, brillance: 0.2, gain: 5,
  opacite: 0.4, fondu: 0.15, intensite: 0.4, intensiteIsoles: 0.6, air: 0.95, masque: 0.1, masqueGrain: 0.15, rampe: 22 };
const TON = [0x08 / 255, 0x22 / 255, 0xb5 / 255];                               // surface bleue de la palette de la référence (#0822B5)
const cellule = (a) => { const h = Math.max(4, Math.round(a)); return { w: Math.round(h * 30 / 48), h }; };

const COMMUN = `#version 300 es
precision highp float; precision highp int;
uniform vec2 cells, cellSize, ambientCells, ambientCellSize; uniform vec3 tone;
uniform float dt, time, pixelRatio, radius, force, dye, fade, turbulence, toneLift, edgeLift, glitch, tumble, ambient, intensity, air, mask, maskGrain,
  hdrShare, hdrIntensity, opacity, ambientOpacity, ambientPhase, ambientVariety, ambientFade, ambientToneLift, ambientIntensity, ambientBeat, ambientBase, glyphFade, rampLength, viewH;
uniform int splatCount; uniform vec4 splats[16];
uniform sampler2D state, pressure, divergence, cellsTex, atlas;
const float GRAPH_MARKS = 8.0; const float DYE_SPEED = 400.0; const float MAX_SPEED = 2500.0; const float VELOCITY_FADE = 1.2;
const float TURBULENCE_SCALE = 0.004; const float EDGE_START = 0.06; const float EDGE_END = 0.22;
out vec4 sortie;
float hash(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 v) { vec2 c = floor(v), o = fract(v), b = o * o * (3.0 - 2.0 * o);
  return mix(mix(hash(c), hash(c + vec2(1, 0)), b.x), mix(hash(c + vec2(0, 1)), hash(c + vec2(1, 1)), b.x), b.y); }
ivec2 texel(vec2 c, ivec2 o) { return clamp(ivec2(c) + o, ivec2(0), ivec2(cells) - 1); }
vec2 tearCell(vec2 c, float t, float a) { float m = floor(t * 9.0), b = floor(c.y / 3.0); if (hash(vec2(b, m)) < 1.0 - 0.035 * a) return c;
  return vec2(c.x + floor((hash(vec2(m, b + 17.0)) - 0.5) * 24.0), c.y); }
uint varyMark(uint g, float s) { if (g < 1u || g > 8u) return g; uint f = g <= 4u ? 1u : 5u; return f + uint(s * 4.0); }
uint randomGlyph(float s, float n) { if (fract(s * 7.13) < 0.35) return 1u + uint(fract(s * 13.7) * GRAPH_MARKS); return 1u + uint(s * (n - 1.0)); }
uint glitchGlyph(uint g, vec2 c, float t, float n, float share) { float m = floor(t * 12.0); if (hash(c * 0.93 + m * 0.137) >= share) return g; return randomGlyph(hash(c + m * 0.711), n); }
vec2 turnLocal(vec2 l, vec2 s, float q) { float a = q * 1.5707963; vec2 p = (l - 0.5) * s; return vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a)) / s + 0.5; }
float idleQuarters(float st, float t, float share) { if (st > share) return 0.0; return floor(fract(t * 0.23 + st * 7.3) * 4.0); }
float glyphAt(uint g, vec2 l) { if (any(lessThan(l, vec2(0))) || any(greaterThan(l, vec2(1)))) return 0.0;
  vec2 slot = vec2(float(g % 3u), float(g / 3u)); return texture(atlas, (slot + clamp(l, vec2(0.03), vec2(0.97))) / vec2(3.0, 3.0)).r; }
float fadeIn(float p, float w) { return clamp(p / max(w, 1e-4), 0.0, 1.0); }
float evolving(vec2 p, float t) { float b = floor(t), m = smoothstep(0.0, 1.0, fract(t));
  vec2 a = vec2(hash(vec2(b, 3.1)), hash(vec2(b, 8.7))) * 97.0, n = vec2(hash(vec2(b + 1.0, 3.1)), hash(vec2(b + 1.0, 8.7))) * 97.0; return mix(noise(p + a), noise(p + n), m); }
float masked(vec2 p) { float t = time; vec2 d = vec2(t * 0.04, -t * 0.03), sq = p * vec2(cellSize.x / cellSize.y, 1.0);
  float f = (0.55 * evolving(sq * 0.06 + d, t * 0.25) + 0.3 * evolving(sq * 0.17 - d * 1.7, t * 0.4 + 0.5)) / 0.85; return mix(f, hash(floor(p) * 4.13 + 1.9), maskGrain); }
float sparkle(vec2 c, float share, float k) { float st = hash(c * 7.77 + 3.3), b = floor(time * 0.8 + st * 9.0); if (hash(c * 1.91 + b * 0.613) >= share) return 1.0; return k; }
vec3 toLin(vec3 e) { return mix(pow((e + 0.055) / 1.055, vec3(2.4)), e / 12.92, vec3(lessThanEqual(e, vec3(0.04045)))); }
vec3 toEnc(vec3 l) { return mix(1.055 * pow(l, vec3(1.0 / 2.4)) - 0.055, l * 12.92, vec3(lessThanEqual(l, vec3(0.0031308)))); }
vec3 lit(vec3 c, float g) { if (g <= 1.0) return c; vec3 l = toLin(c) * g; return toEnc(l / max(max(max(l.r, l.g), l.b), 1.0)); }
`;
const SOMMET = `#version 300 es
void main() { vec2 c = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(c * 2.0 - 1.0, 0.0, 1.0); }`;
const ADVECTE = `
float stream(vec2 p) { vec2 d = vec2(time * 0.07, -time * 0.05); return noise(p * TURBULENCE_SCALE + d) + 0.5 * noise(p * TURBULENCE_SCALE * 2.3 - d); }
vec2 curl(vec2 p) { float s = 8.0, dx = stream(p + vec2(s, 0)) - stream(p - vec2(s, 0)), dy = stream(p + vec2(0, s)) - stream(p - vec2(0, s));
  vec2 f = vec2(dy, -dx) / (2.0 * s * TURBULENCE_SCALE); float v = length(f); if (v < 1e-4) return vec2(0); float a = round(atan(f.y, f.x) / 0.7853982) * 0.7853982; return vec2(cos(a), sin(a)) * v; }
vec2 shove(vec2 p) { float m = floor(time * 3.0); vec2 b = floor(p / vec2(220.0, 90.0)); if (hash(b + m * 0.371) < 0.97) return vec2(0);
  float d = floor(hash(b * 1.7 + m) * 4.0); vec2 ax = d >= 2.0 ? vec2(0, 1) : vec2(1, 0); return ax * (mod(d, 2.0) >= 1.0 ? -1.0 : 1.0) * 500.0; }
void main() { vec2 pos = gl_FragCoord.xy; vec4 cur = texelFetch(state, texel(pos, ivec2(0)), 0); vec2 o = pos - cur.xy * dt / cellSize;
  float band = floor(pos.y / 4.0), fr = floor(time * 60.0); if (hash(vec2(band, fr)) > 1.0 - 0.003 * glitch) o.x += floor((hash(vec2(fr, band)) - 0.5) * 8.0);
  vec4 n = texture(state, o / cells); n.xy *= exp(-dt * VELOCITY_FADE); n.z *= exp(-dt * fade);
  vec2 px = pos * cellSize; n.xy += (curl(px) * turbulence + shove(px) * glitch) * dt * n.z;
  float r = max(radius, 0.5) * cellSize.y;
  for (int i = 0; i < 16; i++) { if (i >= splatCount) break; vec4 s = splats[i]; vec2 d = px - s.xy; float reach = exp(-dot(d, d) / (r * r));
    n.xy += s.zw * reach * force; n.z += reach * dye * clamp(length(s.zw) / DYE_SPEED, 0.0, 1.0); }
  float v = length(n.xy); if (v > MAX_SPEED) n.xy *= MAX_SPEED / v; sortie = vec4(n.xy, min(n.z, 1.0), 1.0); }`;
const DIVERGE = `void main() { vec2 p = gl_FragCoord.xy; float l = texelFetch(state, texel(p, ivec2(-1, 0)), 0).x, r = texelFetch(state, texel(p, ivec2(1, 0)), 0).x,
  u = texelFetch(state, texel(p, ivec2(0, -1)), 0).y, d = texelFetch(state, texel(p, ivec2(0, 1)), 0).y;
  sortie = vec4((r - l) / (2.0 * cellSize.x) + (d - u) / (2.0 * cellSize.y), 0, 0, 1); }`;
const PRESSION = `void main() { vec2 p = gl_FragCoord.xy; float l = texelFetch(pressure, texel(p, ivec2(-1, 0)), 0).x, r = texelFetch(pressure, texel(p, ivec2(1, 0)), 0).x,
  u = texelFetch(pressure, texel(p, ivec2(0, -1)), 0).x, d = texelFetch(pressure, texel(p, ivec2(0, 1)), 0).x, s = texelFetch(divergence, texel(p, ivec2(0)), 0).x;
  float ac = cellSize.x * cellSize.x, al = cellSize.y * cellSize.y; sortie = vec4(((l + r) * al + (u + d) * ac - s * ac * al) / (2.0 * (ac + al)), 0, 0, 1); }`;
const PROJETTE = `void main() { vec2 p = gl_FragCoord.xy; float l = texelFetch(pressure, texel(p, ivec2(-1, 0)), 0).x, r = texelFetch(pressure, texel(p, ivec2(1, 0)), 0).x,
  u = texelFetch(pressure, texel(p, ivec2(0, -1)), 0).x, d = texelFetch(pressure, texel(p, ivec2(0, 1)), 0).x; vec4 c = texelFetch(state, texel(p, ivec2(0)), 0);
  sortie = vec4(c.xy - vec2(r - l, d - u) / (2.0 * cellSize), c.z, 1); }`;
const CELLULES = `void main() { vec2 cell = tearCell(floor(gl_FragCoord.xy), time, glitch); vec4 cur = texelFetch(state, texel(cell, ivec2(0)), 0); float dy = cur.z;
  float l = texelFetch(state, texel(cell, ivec2(-1, 0)), 0).z, r = texelFetch(state, texel(cell, ivec2(1, 0)), 0).z, u = texelFetch(state, texel(cell, ivec2(0, -1)), 0).z, d = texelFetch(state, texel(cell, ivec2(0, 1)), 0).z;
  float grain = noise(cell * 0.35 + vec2(time * 0.6, -time * 0.4)), st = hash(cell * 1.37 + 0.11), still = 1.0 - smoothstep(20.0, 200.0, length(cur.xy));
  float q = idleQuarters(st, time, tumble * still), share = 0.035 * glitch, op = masked(cell); bool airy = hash(cell * 2.31 + 4.7) < air || op < mask;
  float opening = fadeIn(op - mask, glyphFade * 0.15), edge = smoothstep(EDGE_START, EDGE_END, length(vec2(r - l, d - u)) * (0.6 + 0.8 * grain));
  if (!airy && st < edge * 0.8) { uint g = glitchGlyph(randomGlyph(hash(vec2(floor(cell.x + time * 3.0 * (mod(cell.y, 2.0) < 1.0 ? 1.0 : -1.0)), cell.y)), GRAPH_MARKS + 1.0), cell, time, GRAPH_MARKS + 1.0, share);
    sortie = vec4(float(g), 2.0 + opening * fadeIn(edge * 0.8 - st, glyphFade * 0.3) * 0.9, q, sparkle(cell, hdrShare, hdrIntensity)); return; }
  float den = clamp(dy * (0.55 + 0.9 * grain), 0.0, 1.0), steps = rampLength - 2.0; uint lv = uint(floor(den * steps + 0.5));
  if (lv == 0u || airy) { sortie = vec4(0); return; }
  float beat = floor(time * 0.7 + st * 3.0); int wob = int(round((hash(cell * 3.7 + beat * 0.41) - 0.5) * 4.0));
  uint rung = uint(clamp(1 + abs(int(lv) - 1 + wob), 1, int(steps))); uint ramp = 1u + min(7u, uint(float(rung - 1u) / steps * GRAPH_MARKS));
  uint g = glitchGlyph(varyMark(ramp, hash(cell * 5.3 + beat * 0.67)), cell, time, GRAPH_MARKS + 1.0, share);
  sortie = vec4(float(g), 1.0 + opening * fadeIn(den * steps - 0.5, glyphFade * 4.0) * 0.9, q, sparkle(cell, hdrShare, hdrIntensity)); }`;
const COMPOSE = `
uint mixBits(uint v) { uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
int fls(uint v) { int n = -1; for (int i = 0; i < 32; i++) if ((v >> uint(i)) != 0u) n = i; return n; }
uint shuffle(uint index, uint total) { if (total <= 1u) return 0u; uint half_ = (uint(fls(total - 1u)) + 2u) / 2u, m = (1u << half_) - 1u, v = index;
  for (uint w = 0u; w < 64u; w++) { uint l = v >> half_, r = v & m; for (uint s = 0u; s < 4u; s++) { uint n = l ^ (mixBits(r ^ (s * 0x85ebca6bu)) & m); l = r; r = n; }
    v = (l << half_) | r; if (v < total) return v; } return v % total; }
vec2 ambientTurn(vec2 c) { uint col = uint(ambientCells.x), tot = col * uint(ambientCells.y), cnt = uint(ambient); uint sl = shuffle(uint(c.y) * col + uint(c.x), tot);
  uint cur = (uint(ambientBase) + tot - sl) % tot, nx = (cur + cnt) % tot;
  if (cur < cnt) { float t = ambientPhase + float(cur) / float(cnt); if (t < 1.0) return vec2(t, ambientBeat); }
  if (nx < cnt) { float t = ambientPhase + float(nx) / float(cnt); if (t >= 1.0) return vec2(t - 1.0, ambientBeat + 1.0); } return vec2(0, -1); }
float tap(uint g, vec2 px, vec2 o, float sc, float q) { vec2 l = ((px - o) / ambientCellSize - 0.5) / max(sc, 0.05) + 0.5; return glyphAt(g, turnLocal(l, ambientCellSize, q)); }
vec4 ambientGlyph(vec2 px) { if (ambient < 1.0) return vec4(0); vec2 c = floor(px / ambientCellSize), h = ambientTurn(c); if (h.y < 0.0) return vec4(0);
  float st = hash(c * 1.37 + 0.11), sh = min(fadeIn(h.x, ambientFade * 0.5), fadeIn(1.0 - h.x, ambientFade * 0.5)); uint g = randomGlyph(hash(c + h.y * 0.517), GRAPH_MARKS + 1.0);
  float q = idleQuarters(st, time, 1.0), sc = 1.0 - ambientVariety * hash(c * 2.9 + h.y * 0.37), s = 0.125 / pixelRatio; vec2 o = c * ambientCellSize;
  float cov = 0.25 * (tap(g, px + vec2(-1, -3) * s, o, sc, q) + tap(g, px + vec2(3, -1) * s, o, sc, q) + tap(g, px + vec2(1, 3) * s, o, sc, q) + tap(g, px + vec2(-3, 1) * s, o, sc, q));
  if (cov <= 0.0) return vec4(0); return vec4(lit(mix(tone, vec3(1), ambientToneLift), sparkle(c, hdrShare, hdrIntensity)), 1.0) * cov * sh * ambientIntensity * ambientOpacity; }
void main() { vec2 px = vec2(gl_FragCoord.x, viewH - gl_FragCoord.y) / pixelRatio, cell = floor(px / cellSize); vec4 ch = texelFetch(cellsTex, texel(cell, ivec2(0)), 0);
  if (ch.x < 0.5) { sortie = ambientGlyph(px); return; }
  float cov = glyphAt(uint(ch.x + 0.5), turnLocal(fract(px / cellSize), cellSize, ch.z)); vec3 t = mix(tone, vec3(1), toneLift); bool edge = ch.y >= 2.0;
  sortie = vec4(lit(edge ? mix(t, vec3(1), edgeLift) : t, ch.w), 1.0) * cov * (fract(ch.y) / 0.9) * intensity * opacity; }`;

/* atlas des marques : 3 × 3 cases (0 vide, 1 à 4 petites, 5 à 8 grandes), cercle ou carré, plein ou creux, comme les marques du graphe */
function atlasMarques(w, h) {
  const c = document.createElement('canvas'); c.width = w * 3; c.height = h * 3; const x = c.getContext('2d'), k = h / 48;
  const M = [[0, 0, 1], [1, 0, 1], [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 1, 1], [1, 1, 1]];   // carré, grand, plein
  x.fillStyle = x.strokeStyle = '#fff';
  M.forEach(([car, gr, plein], i) => { const s = i + 1, cx = (s % 3) * w + w / 2, cy = Math.floor(s / 3) * h + h / 2, o = (gr ? 22 : 13) * k, l = (gr ? 3.5 : 2.5) * k, f = plein ? o : o - l;
    x.save(); x.beginPath(); x.rect((s % 3) * w, Math.floor(s / 3) * h, w, h); x.clip(); x.beginPath(); car ? x.rect(cx - f / 2, cy - f / 2, f, f) : x.arc(cx, cy, f / 2, 0, 6.2832);
    if (plein) x.fill(); else { x.lineWidth = l; x.stroke(); } x.restore(); });
  return c;
}

export function monteSillage(hote, { avant = null } = {}) {
  const fin = matchMedia('(hover: hover) and (pointer: fine)'), reduit = matchMedia('(prefers-reduced-motion: reduce)');
  if (!fin.matches || reduit.matches) return null;
  const cv = document.createElement('canvas'); cv.className = 'cv-sillage'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block';
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  hote.insertBefore(cv, avant);
  const prog = (fs) => { const p = gl.createProgram(); for (const [t, s] of [[gl.VERTEX_SHADER, SOMMET], [gl.FRAGMENT_SHADER, COMMUN + fs]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh); } gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  let P; try { P = { advecte: prog(ADVECTE), diverge: prog(DIVERGE), pression: prog(PRESSION), projette: prog(PROJETTE), cellules: prog(CELLULES), compose: prog(COMPOSE) }; }
  catch (e) { console.warn('sillage : shaders refusés', e); cv.remove(); return null; }
  const vao = gl.createVertexArray();
  const tex = (w, h, data = null, filtre = gl.NEAREST, f = gl.RGBA16F, ty = gl.HALF_FLOAT, fo = gl.RGBA) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, f, w, h, 0, fo, ty, data); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filtre], [gl.TEXTURE_MAG_FILTER, filtre], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  const cible = (t) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; };
  let W = 0, H = 0, dpr = 1, G = null, atlas = null, cel = cellule(R.taille), amb = cellule(R.isolesTaille), splats = [], prec = null, energie = 0, dernier = 0, raf = 0, fini = false;
  function grilles() {
    const r = hote.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)), d = Math.min(2, devicePixelRatio || 1);
    if (w === W && h === H && d === dpr && G) return; W = w; H = h; dpr = d; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const cx = Math.ceil(W / cel.w), cy = Math.ceil(H / cel.h), t = () => tex(cx, cy);
    const etat = t(), advecte = t(), div = t(), p0 = t(), p1 = t(), cells = t();
    G = { cx, cy, etat, advecte, div, p: [p0, p1], cells, f: { etat: cible(etat), advecte: cible(advecte), div: cible(div), p: [cible(p0), cible(p1)], cells: cible(cells) } };
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const a = atlasMarques(Math.max(1, Math.round(cel.w * dpr * 4)), Math.max(1, Math.round(cel.h * dpr * 4)));   // atlas suréchantillonné, lissé à l'affichage
    atlas = tex(a.width, a.height, null, gl.LINEAR, gl.RGBA8, gl.UNSIGNED_BYTE); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, a);
  }
  const loc = new Map(); const U = (p, n) => { const k = p; let m = loc.get(k); if (!m) loc.set(k, m = new Map()); if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n)); return m.get(n); };
  function uniformes(p, t, d, amb4) {
    gl.useProgram(p); const f = (n, ...v) => { const l = U(p, n); if (l) gl['uniform' + v.length + 'f'](l, ...v); };
    f('cells', G.cx, G.cy); f('cellSize', cel.w, cel.h); f('tone', ...TON); f('dt', d); f('time', t); f('pixelRatio', dpr); f('viewH', cv.height);
    f('radius', R.rayon); f('force', R.force); f('dye', R.teinte); f('fade', R.efface); f('turbulence', R.turbulence); f('toneLift', R.leveTon); f('edgeLift', R.leveBord);
    f('glitch', R.glitch); f('tumble', R.bascule); f('intensity', R.intensite); f('air', R.air); f('mask', R.masque); f('maskGrain', R.masqueGrain);
    f('hdrShare', R.brillance); f('hdrIntensity', R.gain); f('opacity', R.opacite); f('glyphFade', R.fondu); f('rampLength', R.rampe);
    f('ambient', amb4.n); f('ambientCells', amb4.c, amb4.r); f('ambientCellSize', amb.w, amb.h); f('ambientPhase', amb4.phase); f('ambientBeat', amb4.beat); f('ambientBase', amb4.base);
    f('ambientOpacity', 1); f('ambientVariety', R.isolesVariete); f('ambientFade', R.isolesFondu); f('ambientToneLift', R.isolesLeve); f('ambientIntensity', R.intensiteIsoles);
    const ls = U(p, 'splatCount'); if (ls) gl.uniform1i(ls, Math.min(16, splats.length));
    const lv = U(p, 'splats'); if (lv && splats.length) gl.uniform4fv(lv, new Float32Array(splats.slice(0, 16).flat()));
  }
  function lie(p, noms) { noms.forEach(([n, t], i) => { const l = U(p, n); if (!l) return; gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(l, i); }); }
  function passe(p, fbo, w, h, noms) { gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, w, h); lie(p, noms); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function image(ms) {
    raf = 0; if (fini) return; grilles();
    const t = (ms / 1000) % 1000, d = Math.min((ms - (dernier || ms)) / 1000, 1 / 30); dernier = ms;
    energie *= Math.exp(-R.efface * d); const vivant = energie >= 0.015 || splats.length > 0;   // décroît au pas de la simulation, comme la teinte elle-même
    const c = Math.ceil(W / amb.w), r = Math.ceil(H / amb.h), tot = c * r, n = Math.floor(Math.min(R.isoles, tot)), B = t * R.isolesVitesse, T = Math.floor(B);
    const a4 = { n, c, r, phase: B - T, beat: T, base: (T * n) % tot };
    gl.bindVertexArray(vao); gl.disable(gl.BLEND);
    if (vivant) {
      uniformes(P.advecte, t, d, a4); passe(P.advecte, G.f.advecte, G.cx, G.cy, [['state', G.etat]]);
      uniformes(P.diverge, t, d, a4); passe(P.diverge, G.f.div, G.cx, G.cy, [['state', G.advecte]]);
      uniformes(P.pression, t, d, a4); for (let i = 0; i < 16; i++) passe(P.pression, G.f.p[(i + 1) % 2], G.cx, G.cy, [['pressure', G.p[i % 2]], ['divergence', G.div]]);
      uniformes(P.projette, t, d, a4); passe(P.projette, G.f.etat, G.cx, G.cy, [['state', G.advecte], ['pressure', G.p[0]]]);
    }
    splats = [];
    uniformes(P.cellules, t, d, a4); passe(P.cellules, G.f.cells, G.cx, G.cy, [['state', G.etat]]);
    uniformes(P.compose, t, d, a4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    lie(P.compose, [['cellsTex', G.cells], ['atlas', atlas]]); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (R.mesure) { const b = new Uint8Array(cv.width * cv.height * 4); gl.readPixels(0, 0, cv.width, cv.height, gl.RGBA, gl.UNSIGNED_BYTE, b); let n = 0, m = 0; for (let i = 3; i < b.length; i += 4) if (b[i] > 0) { n++; m = Math.max(m, b[i]); } hote.dataset.pixels = n + '/' + m; }   // test seulement
    hote.dataset.sillage = vivant ? 'vivant' : 'repos';
    if (visible && !document.hidden) raf = requestAnimationFrame(image);
  }
  /* le pointeur remue le fluide : une poussée par mouvement (au plus 16 par image), vitesse = déplacement / temps écoulé, ignorée après 0,25 s d'arrêt */
  const bouge = (ev) => { const r = hote.getBoundingClientRect(), p = { x: ev.clientX - r.left, y: ev.clientY - r.top }, q = prec, dt = q ? (ev.timeStamp - q.t) / 1000 : 0; prec = { ...p, t: ev.timeStamp };
    if (!q || dt >= 0.25 || dt <= 0 || p.x < 0 || p.y < 0 || p.x > r.width || p.y > r.height) return;
    const vx = (p.x - q.x) / dt, vy = (p.y - q.y) / dt; if (splats.length < 16) splats.push([p.x, p.y, vx, vy]);
    energie = Math.min(1, energie + R.teinte * Math.min(1, Math.hypot(vx, vy) / 400)); };
  addEventListener('pointermove', bouge, { passive: true });
  let visible = true; const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; if (visible && !raf) raf = requestAnimationFrame(image); }); io.observe(hote);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(image); });
  raf = requestAnimationFrame(image);
  const api = { regle: (o) => Object.assign(R, o), arrete: () => { fini = true; removeEventListener('pointermove', bouge); io.disconnect(); cancelAnimationFrame(raf); cv.remove(); }, etat: () => ({ W, H, cx: G?.cx, cy: G?.cy, energie, vivant: hote.dataset.sillage }),
    lit: () => { if (!G) return null; gl.bindFramebuffer(gl.FRAMEBUFFER, G.f.etat); const px = new Float32Array(G.cx * G.cy * 4); gl.readPixels(0, 0, G.cx, G.cy, gl.RGBA, gl.FLOAT, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      let teinte = 0, max = 0; for (let i = 2; i < px.length; i += 4) { teinte += px[i]; max = Math.max(max, px[i]); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, G.f.cells); gl.readPixels(0, 0, G.cx, G.cy, gl.RGBA, gl.FLOAT, px); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      let glyphes = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 0.5) glyphes++; return { teinte, max, glyphes }; } };
  return api;
}
