// The page colour changing from one section's to the next's, opaque, drawn
// under the graph. Colours arrive as Display P3, as the canvas draws, and mix
// in the chosen space the way CSS's color-mix() would.
// page-colour-at.ts paints the same for the header: change both together.

struct PageColour {
  previous: vec4f,
  next: vec4f,
  // CSS px.
  origin: vec2f,
  mix: f32,
  softness: f32,
  reach: f32,
  // Indices into PAGE_COLOUR_STYLES and PAGE_COLOUR_SPACES.
  style: f32,
  space: f32,
  // How far OKLCH and HSL turn round the hue wheel, 0 straight across as
  // OKLab does, 1 the whole way round.
  hueTravel: f32,
}

@group(0) @binding(0) var<uniform> viewport: vec4f;
@group(0) @binding(1) var<uniform> colour: PageColour;

const TAU = 6.283185307;
// Below this chroma or saturation a hue is powerless, as CSS treats it.
const ACHROMATIC = 1e-4;

// Rows, so `colour * matrix` applies them as written.
const P3_TO_SRGB = mat3x3f(
  1.2249401, -0.2249404, 0.0,
  -0.0420569, 1.0420571, 0.0,
  -0.0196376, -0.0786361, 1.0982735,
);
const SRGB_TO_P3 = mat3x3f(
  0.8224621, 0.1775380, 0.0,
  0.0331941, 0.9668058, 0.0,
  0.0170827, 0.0723974, 0.9105199,
);
const SRGB_TO_LMS = mat3x3f(
  0.4122214708, 0.5363325363, 0.0514459929,
  0.2119034982, 0.6806995451, 0.1073969566,
  0.0883024619, 0.2817188376, 0.6299787005,
);
const LMS_TO_OKLAB = mat3x3f(
  0.2104542553, 0.7936177850, -0.0040720468,
  1.9779984951, -2.4285922050, 0.4505937099,
  0.0259040371, 0.7827717662, -0.8086757660,
);
const OKLAB_TO_LMS = mat3x3f(
  1.0, 0.3963377774, 0.2158037573,
  1.0, -0.1055613458, -0.0638541728,
  1.0, -0.0894841775, -1.2914855480,
);
const LMS_TO_SRGB = mat3x3f(
  4.0767416621, -3.3077115913, 0.2309699292,
  -1.2684380046, 2.6097574011, -0.3413193965,
  -0.0041960863, -0.7034186147, 1.7076147010,
);

// sRGB and Display P3 share a transfer curve; extended past 0 to 1, as the
// palette sits partly outside sRGB.
fn toLinear(encoded: vec3f) -> vec3f {
  let magnitude = abs(encoded);
  return sign(encoded) * select(
    magnitude / 12.92,
    pow((magnitude + 0.055) / 1.055, vec3f(2.4)),
    magnitude > vec3f(0.04045),
  );
}

fn toEncoded(light: vec3f) -> vec3f {
  let magnitude = abs(light);
  return sign(light) * select(
    magnitude * 12.92,
    1.055 * pow(magnitude, vec3f(1.0 / 2.4)) - 0.055,
    magnitude > vec3f(0.0031308),
  );
}

fn linearToOklab(light: vec3f) -> vec3f {
  let lms = light * SRGB_TO_LMS;
  return (sign(lms) * pow(abs(lms), vec3f(1.0 / 3.0))) * LMS_TO_OKLAB;
}

fn oklabToLinear(lab: vec3f) -> vec3f {
  let lms = lab * OKLAB_TO_LMS;
  return (lms * lms * lms) * LMS_TO_SRGB;
}

// Hue in turns, 0 to 1.
fn encodedToHsl(rgb: vec3f) -> vec3f {
  let high = max(rgb.r, max(rgb.g, rgb.b));
  let low = min(rgb.r, min(rgb.g, rgb.b));
  let lightness = (high + low) * 0.5;
  let delta = high - low;
  let room = min(lightness, 1.0 - lightness);
  if (delta < ACHROMATIC || abs(room) < ACHROMATIC) {
    return vec3f(0.0, 0.0, lightness);
  }
  var hue: f32;
  if (high == rgb.r) {
    hue = (rgb.g - rgb.b) / delta;
  } else if (high == rgb.g) {
    hue = (rgb.b - rgb.r) / delta + 2.0;
  } else {
    hue = (rgb.r - rgb.g) / delta + 4.0;
  }
  return vec3f(fract(hue / 6.0), (high - lightness) / room, lightness);
}

fn hslToEncoded(hsl: vec3f) -> vec3f {
  let k = (vec3f(0.0, 8.0, 4.0) + hsl.x * 12.0) % 12.0;
  let amount = hsl.y * min(hsl.z, 1.0 - hsl.z);
  return hsl.z - amount * clamp(min(k - 3.0, 9.0 - k), vec3f(-1.0), vec3f(1.0));
}

// The shorter way round, in turns; a powerless hue takes the other's.
fn mixHue(startHue: f32, endHue: f32, startChroma: f32, endChroma: f32, amount: f32) -> f32 {
  let start = select(startHue, endHue, startChroma < ACHROMATIC);
  let end = select(endHue, start, endChroma < ACHROMATIC);
  let turn = end - start - round(end - start);
  return fract(start + turn * amount);
}

// Linear sRGB in and out.
fn mixIn(space: u32, previous: vec3f, next: vec3f, amount: f32) -> vec3f {
  switch space {
    case 0u {
      return toLinear(mix(toEncoded(previous), toEncoded(next), amount));
    }
    case 1u {
      return mix(previous, next, amount);
    }
    case 2u {
      return oklabToLinear(mix(linearToOklab(previous), linearToOklab(next), amount));
    }
    case 3u {
      let start = linearToOklab(previous);
      let end = linearToOklab(next);
      let startChroma = length(start.yz);
      let endChroma = length(end.yz);
      let hue = mixHue(
        atan2(start.z, start.y) / TAU,
        atan2(end.z, end.y) / TAU,
        startChroma,
        endChroma,
        amount,
      ) * TAU;
      let chroma = mix(startChroma, endChroma, amount);
      let lightness = mix(start.x, end.x, amount);
      return oklabToLinear(vec3f(lightness, chroma * cos(hue), chroma * sin(hue)));
    }
    default {
      let start = encodedToHsl(toEncoded(previous));
      let end = encodedToHsl(toEncoded(next));
      let hue = mixHue(start.x, end.x, start.y, end.y, amount);
      return toLinear(hslToEncoded(vec3f(hue, mix(start.yz, end.yz, amount))));
    }
  }
}

// Linear sRGB in, linear Display P3 out, clipped to the canvas's 0 to 1: an
// HDR surface would show the rest, and an SDR one clips it anyway.
fn toP3(light: vec3f) -> vec3f {
  return clamp(light * SRGB_TO_P3, vec3f(0.0), vec3f(1.0));
}

// How far into the new colour this pixel is, 0 to 1.
fn coverage(pixel: vec2f, size: vec2f) -> f32 {
  let amount = colour.mix;
  switch u32(colour.style) {
    case 0u {
      return amount;
    }
    case 1u {
      // Rises from the bottom edge, its soft band below the screen at 0 and
      // above it at 1.
      let band = max(colour.softness * size.y, 1.0);
      let front = amount * (size.y + band);
      return 1.0 - smoothstep(front - band, front, size.y - pixel.y);
    }
    default {
      let corners = max(abs(colour.origin), abs(size - colour.origin));
      let farthest = length(corners);
      let band = max(colour.softness * farthest, 1.0);
      let radius = amount * (max(colour.reach, 1.0) * farthest + band);
      return 1.0 - smoothstep(radius - band, radius, distance(pixel, colour.origin));
    }
  }
}

// Under half a step of 8-bit colour, so a soft gradient doesn't band.
fn dither(position: vec2f) -> f32 {
  let noise = fract(52.9829189 * fract(dot(position, vec2f(0.06711056, 0.00583715))));
  return (noise - 0.5) / 255.0;
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let corner = vec2f(f32((vertexIndex << 1u) & 2u), f32(vertexIndex & 2u));
  return vec4f(corner * 2.0 - 1.0, 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let amount = clamp(coverage(position.xy / viewport.zw, viewport.xy), 0.0, 1.0);
  // The ends exactly, so the page's own colour takes over without a seam.
  if (amount <= 0.0) {
    return vec4f(colour.previous.rgb, 1.0);
  }
  if (amount >= 1.0) {
    return vec4f(colour.next.rgb, 1.0);
  }
  let previous = toLinear(colour.previous.rgb) * P3_TO_SRGB;
  let next = toLinear(colour.next.rgb) * P3_TO_SRGB;
  let space = u32(colour.space);
  var mixed = mixIn(space, previous, next, amount);
  // Pulled back towards OKLab's straight line, so a change between hues far
  // apart need not pass through every hue between them. The ends agree, so
  // nothing pops.
  // OKLab only holds for real colours, and turning between far hues leaves
  // the gamut, where its cube root swings steeply and rings the gradient; so
  // the turned colour is clipped into the gamut first.
  if (space >= 3u && colour.hueTravel < 1.0) {
    let straight = mix(linearToOklab(previous), linearToOklab(next), amount);
    let turned = linearToOklab(toP3(mixed) * P3_TO_SRGB);
    mixed = oklabToLinear(mix(straight, turned, colour.hueTravel));
  }
  let encoded = toEncoded(toP3(mixed));
  return vec4f(encoded + dither(position.xy), 1.0);
}
