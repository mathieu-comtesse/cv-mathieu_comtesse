# Sound: paper foley, calm mixing and a felt-piano score

How to make a papercraft world sound like paper: synthesised flaps and footsteps, the mixing rules that keep a busy
scene calm, rewards played as notes of the music, a composed felt-piano score, and deterministic renders for video.

Read this when: adding sound to a paper game, scene, web UI or video; using or extending `assets/lib/paper-sound.js`;
or when a listener says the paper is too loud, too sharp or too busy.

Contents: 1 Taste first; 2 Why paper is impulsive noise; 3 The flap recipe; 4 Footsteps; 5 The kit; 6 Mixing rules;
7 Rewards are notes of the music; 8 Music; 9 Determinism, offline render, video; 10 Verify without ears, then
listen; 11 Map your events to sounds

## 1. Taste first

The target is **soft, dry, low, quiet, sparse: music leads, paper punctuates.** A shipped pop-up game reached it by
ear after four listening rounds, and every round asked for less.

- Synthesise every paper sound per event from seeded noise. Use no oscillators (they sound like toys) and no samples
  (they repeat, and the synthesis does not need them).
- Give each gesture one sound, then silence. A world that moves all the time must not rustle all the time.
- Expect every round of feedback to say "quieter, lower, duller, fewer". Start near the approved values, not at the
  first build's:

| Lever | First build | Approved | Change |
|---|---|---|---|
| Flap gain | 0.76 | 0.13 | -15 dB |
| Band limit | 11.5 kHz | 2.6 kHz | about -2 octaves |
| Pitch factor range | 0.75-1.35 | 0.5-0.82 | centre about -8 st |
| Onset tick | 0.62 | 0.04 | nearly gone |
| Gap between flaps | 0.14 s | 0.55 s | 4x sparser |
| Footstep gain | 0.12 | 0.02 | -15.6 dB |

## 2. Why paper is impulsive noise

A card swinging on a crease makes no tone and no smooth hiss. It makes many tiny events:

| What happens | What you hear | How to synthesise it |
|---|---|---|
| Fibres in the crease let go in clusters | crackle | sub-millisecond noise grains: a 3-sample fade-in, then an exponential decay of 0.1-1.3 ms |
| The card body rings briefly | "card", not "foil" | the grains through 3 short band-passes (Q 1.5-2) |
| Paper brushes paper and air | a brush bed | noise x decay x random lumps x a heavy-tailed gate |
| The card meets its stop, or lands | a tick (rising) or a pat (closing) | 3-5 crisp grains, or 2-3 soft grains inside the bed band |
| The card pushes air | a soft swell just after the onset | band-passed noise x an alpha envelope peaking at 16-30 ms |
| A big card has mass | a low thump | 1-2 grains through a ~350 Hz band-pass, plus a ~170 Hz body |

- **Smoothly enveloped noise sounds like a snare or a hiss**, however you filter it. Let impulses carry the texture.
  Gate the bed with a heavy-tailed random level: target `0.35 + 3.25 * r^4`, with r uniform in -1..1 and a new target
  every ~0.35 ms, smoothed with a one-pole. It idles near 0.35 and spikes towards 3.6 now and then.
- **Make the sound impulsive before you tune its colour.** The fix order that worked: grains plus a gated bed; a
  one-pole tilt with some unfiltered grains mixed in; a two-stage decay (a release burst, then a slow tail); a soft
  onset of several grains.
- **Paper has a size, not a pitch.** Move every filter centre with one factor, `fs = pitch * brightness(size)`, and
  stretch the grain decays by `1/sqrt(fs)`.

## 3. The flap recipe

`synthFlap` implements this signal flow. It renders one mono buffer per event at 48 kHz, lasting the duration plus
12 ms:

```
params  flapParams(size, up, seed, lastSt)  ->  pitch p, duration T, level, synthSeed
scale   fs = p * bright(size); every filter centre x fs; grain decays x 1/sqrt(fs)
bed     noise * twoStageDecay * lumps * heavyTailedGate               (closing: swells in, tau 22 ms)
grains  onset (5 grains in ~4 ms) + crackle clusters (16-38, 30 % near the stop) + micro fizz (50-130)
        + stop tick (rising) or a landing pat into the bed (closing) + 2-5 quiver grains
filter  y = HP( LP( LP( tilt( 0.45*BP(bed) + sum_k g_k*BP_k(grains) + 0.7*grains ) ) ) ) + BP_thump(thump grains)
add     whoosh = alphaEnv(peak 16 ms) * LP( BP(noise) )   +   low body (size > 0.4)
finish  smoothstep attack 2.2 ms, smoothstep tail from 82 %, later samples held under 0.59x the onset peak, normalise
```

These are the approved values. Re-tune them by ear, and expect to go lower and duller, not back up:

| Stage | Value | Follows |
|---|---|---|
| Duration | 96 ms (size 0) to 230 ms (size 1) on a size^1.4 curve, x pitch^-0.3, +-3.5 % | size, pitch |
| Pitch factor | 0.5-0.82; random spread +-4.3 st; 0.8 st lower across the size range | seed, size |
| Brightness | 0.95 (small) to 0.72 (large) over size 0.25-0.75; closing x 0.9 | size, direction |
| Bed band-pass | 2500 Hz x fs, Q 0.4, gain 0.45 | fs |
| Card-body modes | 1350 / 2750 / 4900 Hz x fs; Q 1.5 / 1.8 / 2.0; gains 0.30 / 0.15 / 0.05; each card +-6 % frequency, +-18 % gain | fs, card |
| Tilt (one-pole low-pass) | 4200 Hz (small) to 1700 Hz (large); closing 3400 to 1700; x pitch^0.5 | size, pitch, distance |
| Band limit | two biquad low-passes at 2600 Hz, Q 0.6. Ignores pitch. The strongest "dull it" lever | distance |
| Low cut | high-pass 520 Hz x sqrt(fs), Q 0.7; closing x 0.78 | fs |
| Onset tick | 5 grains between 0.8 and 4.2 ms, amplitude 0.04 | |
| Crackle | grain amplitude 0.1 (micro fizz 0.025); clusters of 1-7 grains, mostly 1-3 | size |
| Thump | band-pass 430 Hz x pitch / (0.8 + 0.4 size), Q 1.6; only above size 0.3 | size, pitch |
| Whoosh | band-pass 1100 Hz x sqrt(pitch), Q 0.75, then low-pass 2400 Hz x sqrt(pitch); gain 0.55 | size, pitch |
| Low body | band-pass 190 Hz x sqrt(pitch) / (0.8 + 0.4 size), Q 1.1, 14 ms decay; only above size 0.4 | size, pitch |
| Level | 0.13 x (0.85 + 0.15 size): the smallest flap is only 1.4 dB quieter | size |

The three inputs map onto it like this:

| Input | Effect |
|---|---|
| size 0 to 1 (a tab to a page-sized flap) | Lower (brightness scales every filter), longer, duller (tilt 4200 to 1700 Hz), more crackle; a thump above 0.3 and a low body above 0.4. Barely louder |
| up / down (rising / closing) | The same card: same seed, so the same pitch and timbre. Closing is -9 dB and 10 % duller. It has a 4.8 ms attack and a bed that swells in, half the crackle, a dull landing pat instead of the stop tick, thump x 0.4, low body x 0.1 and a whoosh of 0.3 rising over 30 ms. It also loses priority (score x 0.7) |
| distance d | Gain `1 / (1 + (d / falloff)^4)`, which halves at `falloff`. `air = min(1, d / (2 x falloff))` lowers the tilt by (1 - 0.45 air) and the band limit by (1 - 0.35 air). Beyond ~2.4 x falloff (distance gain under 0.03), create nothing |

**Pitch sequence.** Centre the random spread inside [pitchMin, pitchMax] and clamp it; then push a flap that lands
within 0.7 st of the previous one 1.05 st away. Clamping a spread centred elsewhere piles flaps onto the edge as soon
as the range narrows ("make it lower"): one build played 84 % of its flaps at the same pitch. `flapParams` gets this
right (2000 simulated flaps: no identical neighbours, 1.5 % at each edge).

**Finish rules.** The loudest sample must sit in the first 5.5 ms, so the attack stays at or under 8 ms after the room
adds its reflections: later samples above 0.42 x the early peak are soft-clipped towards 0.59 x (knees of 0.52 and 0.7
failed). Both fades end at exactly 0 (no clicks). Normalising by `(crest / 8)^0.85`, clamped to 0.8-1.25, keeps dense
and sparse flaps equally loud.

Each of these pitfalls cost a listening round:
- A compressor on the bus flattened the 2-4 ms onset, even at a -8 dB threshold. Use none.
- More low thump makes the peak late. Gain 3 with a 20 ms decay put peaks 9-16 ms late, so stay at 2.2 / 14 ms.
- A noise layer without its own low-pass leaked 6-8 % of its energy above 9 kHz. Give every layer its own band limit.
- A swell before the tick breaks the attack rule. Put the air just behind the onset.

## 4. Footsteps

Footsteps are a separate, much quieter family: a dull tap of about 70 ms. `synthStep` filters a short bed (-40 dB at
the end), two tap grains in the first 3.5 ms and 2-3 scuffs through the surface's bed band and two body modes, a 4-pole
low-pass at 1.6-2.1 kHz and a 300 Hz high-pass, with no tilt. The two feet sit 1 st apart (-0.5 / +0.5 st, plus
+-1.6 st random) and pan -0.07 / +0.07 (before the kit halves every pan).

- **Keep footsteps about 16 dB under a flap** (gain 0.02 against 0.13). At 12 dB under they still sounded too loud and
  too sharp. A sound that repeats 2-6 times per second needs far more attenuation than a single-event measure suggests.
- Never rate-limit or group footsteps. They are quiet enough already.

| `SURFACES` key | Bed Hz / Q | Modes Hz | Low-pass Hz | Scuffs | Knock | Gain |
|---|---|---|---|---|---|---|
| grass | 1100 / 0.6 | 700, 1300 | 1700 | 3 | 0 | 0.9 |
| path | 1400 / 0.6 | 900, 1700 | 2100 | 2 | 0 | 1.0 |
| wood (a hollow card deck) | 800 / 0.7 | 420, 950 | 1600 | 2 | 0.5 | 1.0 |
| water | 900 / 0.6 | 650, 1300 | 1700 | 3 | 0 | 0.6 |

To add a surface, copy the nearest one: lower bands give softer ground, `knock > 0` makes it hollow (a ring at 560 Hz,
Q 2.6), `gain < 1` makes it quieter. The rejected first versions had bands near 2-3 kHz, Q up to 3.2 and low-passes of
4-8 kHz.

## 5. The kit: `assets/lib/paper-sound.js`

| Export | What it does |
|---|---|
| `new PaperSound({ spacing = 0.55, spacingJitter = 0.2, maxVoices = 8, falloff = 9, volume = 1, groupWindow = 0.5 })` | The live player. It builds nothing until `unlock()`. Flap onsets sit `spacing +- spacingJitter` apart (0.35-0.75 s by default); `groupWindow` is the gesture window of `key` |
| `sfx.unlock()` | Call it inside both a pointerdown and a keydown handler. It creates the 48 kHz context and the room + limiter chain, then resumes the context |
| `sfx.flap({ size = 0.5, up = true, pan = 0, distance = 0, seed, key })` | Plays one flap. `pan` is -1..1 (the kit halves it). `key`: a string or number per piece (an object stringifies to "[object Object]" and merges every piece into one); a flap with the same key and direction as one in the last `groupWindow` seconds stays silent, so the 6-8 fold events of one tile give at most one flap. Returns `false` when it stayed silent: locked, muted, a repeat of its key, too soon, beyond ~2.4 x falloff, or at the voice cap |
| `sfx.step({ surface = 'grass', foot = 0, pan = 0, seed })` | Plays one footstep. Ignores spacing |
| `sfx.setMuted(bool)` | Mutes or unmutes with a 15 ms fade on the master |
| `sfx.ctx`, `sfx.chain.bus`, `sfx.chain.master` | Route extra paper sounds into `bus`. Route music to `ctx.destination`, never into `bus` |
| `flapParams({ size, up, seed, lastSt }, F = FLAP)` | Returns `{ st, pitch, dur, level, synthSeed }` |
| `synthFlap({ size, up, pitch, dur, seed, air, sr }, F = FLAP)` | Pure. Returns a mono `Float32Array` peaking near 1; multiply it by `level` |
| `synthStep({ surface, foot, seed, sr })` | Pure. Returns `{ buf, level }` |
| `FLAP`, `SURFACES` | The voicing tables above |
| `hashSeed(...parts)` | Hashes any ids (FNV-1a) into a uint32 seed |
| `noiseGen(seed)`, `grain(...)`, `Biquad`, `finish(...)` | The synths' building blocks (seeded noise, one crackle grain, an RBJ biquad, the fades + onset rule + normalisation), exported for new paper sounds |
| `renderOffline(events, duration, { sampleRate = 48000, spacing = 0.55, spacingJitter = 0.2, falloff = 9 })` | Renders `[{ t, kind: 'flap' or 'step', ...the same options }]` through the same room and limiter in an OfflineAudioContext, with the live player's distance law and cutoff, spacing and jitter, pitch-step rule and footstep pan. It does not group by `key`, cap voices or apply `volume`. Resolves to an AudioBuffer |

```js
import { PaperSound, hashSeed } from './paper-sound.js';           // copied from assets/lib/
const sfx = new PaperSound({ falloff: 9 });                        // falloff = half-gain distance, in world units
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => sfx.unlock()); // keydown alone failed once
const h = hinge(card, { at, size });                               // paperkit-3d.js; onStart: as it starts to move
h.onStart = (h) => sfx.flap({ size, up: h.open > 0.5, pan, distance, seed: hashSeed(piece.id), key: piece.id });
player.onFootfall = (foot) => sfx.step({ surface: groundUnder(player), foot });
```

**The live player** keeps 0.55 s +- 0.2 s between flap onsets (0.35-0.75 s; a flap up to 80 ms early waits for its
slot, an earlier one stays silent), drops a repeat of a `key` and direction within `groupWindow`, applies the
distance gain, the air and the pitch-step rule, caps the voices (refusing new ones when full) and runs everything
through the room and limiter. It groups by `key`, but **it does not rank**: the first flap in a window wins, wherever
it is. For "nearest and largest wins", collect a frame's events and voice only the best:

```js
// Collect one frame's fold events, keep one per piece, voice only the best (nearest and largest wins).
const pending = new Map(), voicedAt = new Map();
function onFold(e) { const p = pending.get(e.id); if (!p || e.size > p.size) pending.set(e.id, e); }
function flushSounds(now) {                                   // once per frame
  let best = null, bestScore = 0;
  for (const e of pending.values()) {
    if (now - (voicedAt.get(e.id) ?? -9) < 0.5) continue;     // one sound per gesture: 0.5 s window per piece
    const score = ((0.85 + 0.15 * e.size) * (e.up ? 1 : 0.7)) / (1 + (e.distance / 9) ** 4);
    if (score > bestScore) { best = e; bestScore = score; }
  }
  pending.clear();
  if (best && sfx.flap({ ...best, seed: hashSeed(best.id) })) voicedAt.set(best.id, now);
}
```

**Extend it:**
- **Re-voice** at start-up with `Object.assign(FLAP, { lpHz: 2200, gain: 0.1 })` (the live player reads the shared
  `FLAP`); to audition variants offline, pass a copy as the last argument of `flapParams` and `synthFlap`. Change one
  key per listening round. The levers, strongest first: `lpHz`, `gain`, `pitchMin`/`pitchMax`,
  `tiltSmall`/`tiltLarge`, `tick`, `grainAmp`.
- **New ground:** `SURFACES.snow = { ...SURFACES.grass, bedHz: 900, lpHz: 1400, gain: 0.7 }` (an untested start).
- **New paper sounds** (a sheet sliding, a tear, a crumple): write `synthX` next to `synthStep` (in paper-sound.js
  or your own module), reuse the exported `noiseGen()`, `grain()`, `Biquad` and `finish()`, seed it, and end with
  `finish()` so the attack, tail and normalisation rules hold. Untested starts: a slide = the gated bed alone,
  150-400 ms, band 1.5-2.5 kHz, no tick; a tear = crackle clusters whose rate rises over 0.2-0.6 s, little bed; a
  crumple = 0.3-1 s of dense clusters in a wider band. Anything that repeats sits 12-16 dB under a flap.
- **Cost:** about 1 ms of main-thread synthesis per flap (measured in Node), and each call allocates its buffers: fine
  at 2 per second. For more, pre-render a few seeded variants per object or synthesise in a worker.

## 6. Mixing rules

These rules made a dense paper world bearable. Constant popping was tiring; "a soft flap now and then" was approved.

| Rule | Value | Why |
|---|---|---|
| One sound per gesture | Group a piece's events within 0.5 s (key: piece + direction; the kit's `key` and `groupWindow`) and voice one | A pop-up tile fires 6-8 fold events; one flap speaks for all of them |
| Air between onsets | About 0.55 s with seeded jitter: the kit's default +-0.2 s gives 0.35-0.75 s, about 2 flaps per second at most | At 0.14 s the world was a ripple of separate pops |
| Nearest and largest win | score = (0.85 + 0.15 size) x distance gain x (0.7 if closing). Queue one candidate; it may start up to 80 ms late, else drop it (the shipped game also took 3.5 dB off a late one; the kit does not) | The rising ring in front of the player is the story; pieces folding away behind are background |
| Silence, not quiet | Drop the losers. Create no voice under ~0.004 gain (the kit: none beyond ~2.4 x falloff, where the distance gain falls under 0.03) | Quiet duplicates still add rustle |
| Voice cap | 8-12 voices. When full, fade the quietest out over 8 ms if the new one is louder (the kit refuses the new one instead) | A stolen voice must not click |
| Distance | Exponent 4: 0.5 f -0.5 dB, 0.75 f -2.4 dB, f -6 dB, 1.25 f -10.7 dB, 1.5 f -15.6 dB | Near events stay present; far ones fall away fast |
| Pan | Half the panner range: about 7.7 dB between channels at the extremes | Wide panning of tiny sounds distracts |
| Frame grid (not in the kit) | 16-28 ms of seeded onset jitter, if several events per second arrive on 60 Hz frames | Otherwise the onsets rattle |
| Room | A 50 ms "book on a small table" IR. Taps: direct sound; a table bounce at 1.3 ms (0.26); six early taps from 4.9 to 23 ms (0.13 down to 0.045, alternating sides, each smeared over 3 samples). A 9 ms diffuse tail at 0.03. Convolver `normalize = false` | A place, without a reverb wash |
| Limiter | A tanh soft knee: linear to 0.6, then `k + (1 - k) tanh((a - k) / (1 - k))`; master 0.855, so peaks stay <= -1.4 dBFS by construction | Safe, and leaves the onset intact |
| No compressor | | It flattens the 2-4 ms onset |
| Room tone (optional, not in the kit) | A 3 s loop of noise low-passed at 240 Hz (rumble removed), about -63 dBFS RMS, 1.5 s fade-in | The silence between flaps is not digital black |
| Footsteps | Exempt from spacing, grouping and priority | Already 16 dB down |

**Approved output peaks:** piano bass about -8.5 dBFS, piano melody -10 to -14, rising flap about -19, closing flap
about -28, footsteps -35 to -38, room tone about -63 dBFS RMS.

**Never set coverage targets** such as "a sound for every fold" or "no silent gap over 3 s". Automated critics and
checklists asked for more density. The listener wanted the opposite, and the listener was right.

## 7. Rewards are notes of the music

Feedback joins the music instead of cutting across it.

- Give pickups and rewards no new sound effect. Play one quiet felt-piano note that is a chord tone of the bar sounding
  now. Send it through the music bus, so the music toggle and mute silence it too.
- Let the register tell the kind: a small pickup gets a high note (MIDI 76-84, velocity 0.15); lighting a lamp or
  reaching a place gets a low, warm note (43-57, velocity 0.2); a rare big discovery can get two rising notes 0.17 s
  apart, the second 10 % louder.
- Escalate visually, not louder: every 10th pickup gets a paper flourish (`paper-ui.md`).
- Arm rewards only after the player's first real action. A reward that fires while the scene is still opening is
  neither felt nor earned.
- With no music running (for example in a web UI), use nothing, or a rising flap at size 0.2 (untested).

```js
// A reward is one quiet note of the piano: a chord tone of the bar that is sounding now (music bus, never the SFX bus).
const CHIME = { pickup: { lo: 76, hi: 84, vel: 0.15 }, lamp: { lo: 43, hi: 57, vel: 0.2 } };
let chimeAt = -1, turn = 0;
function chime(kind, now, chord /* MIDI notes of the current bar */) {
  const k = CHIME[kind];
  if (!k || !musicReady || now - chimeAt < 0.25) return false;   // silent before unlock; rate limit
  const pool = [];
  for (let m = k.lo; m <= k.hi; m++) if (noteCache.has(m) && chord.some((c) => (m - c) % 12 === 0)) pool.push(m);
  if (!pool.length) return false;
  chimeAt = now;
  playNote(pool[(turn++ * 2) % pool.length], k.vel, now + 0.02); // rotate, so repeats differ
  return true;
}
```

## 8. Music: a composed felt piano

- **Compose; don't noodle.** A generative random-walk melody on a pentatonic scale, voiced by detuned oscillator pairs
  with a falling low-pass, was rejected as cheap. A written 16-bar progression played by an additive "felt piano" was
  approved.
- **Slow and calm:** 60-66 bpm in 4/4. The approved piece: C major, 63 bpm (a bar lasts 3.81 s), 16 bars.
- **Darker is better.** "Too shrill" was fixed by a partial roll-off of k^-2.4 instead of k^-1.75, partials only up to
  2.8 kHz (at most 12) instead of 5.2 kHz, a per-note low-pass capped at 1.9 kHz instead of 5.5 kHz, half the hammer
  thump, a darker reverb tail, the melody an octave lower and no octave bells.

Composition recipe:
- **Left hand:** one chord per bar as `[bass, t1, t2, t3]`, played as a broken chord at beats 0, 0.5, 1, 1.5, 2.5, 3.5
  on chord tones 0, 1, 2, 3, 2, 1 (up and back). A descending bass suits it, e.g. C, G/B, Am, Fmaj7 =
  `[36,43,52,55] [35,43,50,55] [33,40,48,52] [29,41,45,52]`.
- **Right hand:** 1-3 notes per bar around MIDI 55-69 (write the melody, then drop it an octave).
- **Velocity:** bass 0.3, other left-hand notes 0.15-0.18, right hand 0.24 x (0.65-1).
- **Humanise:** left hand +-1.75 % of a beat, right hand 1.5 % late +-2 %, velocity +-10 %; stretch the last beats of
  each 8-bar phrase by up to 5 % (a breath).
- **Vary each 16-bar cycle:** thin the left hand every third cycle; drop each of the last two left-hand notes with
  p 0.3; from the second cycle on, drop right-hand notes after the first with p 0.22; play the right hand quieter on
  odd cycles.

```js
// One felt-piano note, synthesised once per MIDI pitch and cached. rng: any seeded () => [0, 1), e.g. rng() from
// assets/lib/paperkit-2d.js. 24 kHz is plenty: nothing sits above ~2.8 kHz.
function feltPiano(midi, rng, sr = 24000) {
  const f = 440 * 2 ** ((midi - 69) / 12);
  const n = Math.ceil(Math.max(3.2, Math.min(7.5, 7.5 - (midi - 36) * 0.075)) * sr), out = new Float32Array(n);
  const B = 0.00008 * 2 ** ((midi - 40) / 12);                    // string stiffness: partials stretch sharp
  const d0 = 0.55 + Math.max(0, midi - 40) * 0.022;               // decay rate (1/s): high notes die sooner
  const K = Math.max(2, Math.min(12, Math.floor(2800 / f)));      // no partial above ~2.8 kHz
  for (let k = 1; k <= K; k++) {
    const amp = (k ** -2.4 * Math.abs(Math.sin((Math.PI * k) / 8.3))) / Math.sin(Math.PI / 8.3); // felt, struck near 1/8
    const dk = d0 * (1 + 0.42 * (k - 1)), rF = Math.exp((-dk * 3.2) / sr), rS = Math.exp((-dk * 0.7) / sr);
    for (const s of [-1, 1]) {                                     // two strings a cent apart beat slowly
      const w = (2 * Math.PI * f * k * Math.sqrt(1 + B * k * k) * 2 ** ((s * (0.5 + 0.12 * k)) / 1200)) / sr;
      const c = 2 * Math.cos(w), ph = rng() * 2 * Math.PI;
      let y1 = Math.sin(ph - w), y2 = Math.sin(ph - 2 * w), eF = 0.6 * amp, eS = 0.4 * amp;
      for (let i = 0; i < n; i++) { const y = c * y1 - y2; y2 = y1; y1 = y; out[i] += y * (eF + eS); eF *= rF; eS *= rS; }
    }
  }
  let lp = 0, e = 0.025 * Math.min(1, 200 / f + 0.3); const kT = Math.exp(-1 / (0.008 * sr)); // hammer thump
  for (let i = 0; i < 0.04 * sr; i++) { lp += 0.12 * (rng() * 2 - 1 - lp); out[i] += lp * e; e *= kT; }
  let pk = 1e-9;
  for (let i = 0; i < n; i++) { out[i] *= Math.min(1, i / (0.006 * sr), (n - 1 - i) / (0.5 * sr)); pk = Math.max(pk, Math.abs(out[i])); }
  for (let i = 0; i < n; i++) out[i] /= pk;                        // 6 ms attack, 0.5 s release, peak 1
  return out;
}
```

- **Playback per note:** low-pass Q 0.5 at `clamp(f * (1.3 + 5 * vel), 350, 1900)` (softer = darker), gain `vel`, pan
  `clamp((midi - 60) / 55, -0.45, 0.45)`, then dry plus a hall at 0.4 wet. The hall: a 4 s stereo noise IR, 22 ms
  pre-delay, amplitude `exp(-1.7 t)`, through a one-pole whose coefficient falls as `0.03 + 0.12 exp(-2.2 t)` so the
  tail darkens.
- **Scheduler:** a 60 ms timer with 1.2 s look-ahead; synthesise one pitch per tick into the cache (about 20 ms each)
  so frames never hitch; fade in over 4 s; toggle with a key (0.25 s fade), not an on-screen button. Share the
  AudioContext but bypass the paper limiter.
- **Level:** the music peaks 5-10 dB above the flaps (approved output peaks, section 6).

## 9. Determinism, offline render, video

- **Seed from identity:** `hashSeed(piece.id)`, or its position, layer and size. Leave direction out so a piece's open
  and close share a timbre; seed footsteps with `hashSeed('step', stepIndex)`; derive every jitter from the same
  seeds; never call `Math.random` in the audio path. Without an explicit seed the kit falls back to a call counter,
  which drifts as soon as the live and offline event lists differ.
- **Same engine live and offline.** During a frame-stepped capture, record events as
  `{ t, kind, size, up, pan, distance, seed }` (footsteps: `surface`, `foot`), render them with
  `renderOffline(events, duration, { spacing, spacingJitter, falloff })` (the live player's values) in a browser page
  (headless works) and write the AudioBuffer to a 16-bit WAV. It applies the live distance law and cutoff, spacing
  and jitter, pitch-step rule and footstep pan, but no `key` grouping and no voice cap: record one event per gesture
  (a piece's first fold per direction in 0.5 s), or the video rustles where the game did not.
- **No browser:** `synthFlap` and `synthStep` are pure, so Node can mix them into a Float32Array with the Web Audio
  equal-power pan (`x = (pan * 0.5 + 1) / 2`, left `cos(x * PI / 2)`, right `sin(x * PI / 2)`), convolve with the room
  IR (or skip it) and apply the limiter curve.
- **Stems:** render the paper sounds and the music separately. Use one shared paper gain for every clip in a project
  (the loudest clip peaks at -6 dBFS) so cuts never jump, and cut edits on music bars.
- **Final mix:** paper +4 dB, music -4 dB, no automatic normalising, a 2 s fade-out, and two-pass loudnorm to -16 LUFS /
  -1.5 dBTP. Music-only vertical reels go to -14 LUFS.

```sh
# single-pass version; set st to the clip length minus 2 s
ffmpeg -i paper.wav -i music.wav -filter_complex "[0]volume=4dB[p];[1]volume=-4dB[m];[p][m]amix=inputs=2:normalize=0,afade=t=out:st=28:d=2,loudnorm=I=-16:TP=-1.5" mix.wav
```

## 10. Verify without ears, then listen

Automate these checks. They cover hygiene, not taste:

| Check | Pass |
|---|---|
| Attack (time to the loudest sample) | at most 8 ms (the kit measures at most 5.5 ms) |
| Clicks | first sample under 0.02 x the peak; the last 1 ms at least 40 dB under the peak |
| Clipping | the synth output peaks near 1 before `level`; the whole mix never above -1 dBFS |
| Determinism | the same seed gives a bitwise-identical buffer, live and offline |
| Impulsiveness (while building) | kurtosis of the bed + grains alone around 15 or more; smooth enveloped noise measures ~7. Measure without the whoosh, which is smooth and lowers it |
| Density | at most ~2 flaps per second during continuous motion; footsteps 12-16 dB under the flaps |
| Pitch | no two consecutive flaps under 0.5 st apart; few at the edges of the range |
| Cost | about 1 ms of synthesis per sound; no allocation in the per-frame path |

```js
// Hygiene checks for one rendered sound (Float32Array at sample rate sr); pass values in the table above.
function checkSound(buf, sr, level = 1) {
  let peak = 0, at = 0, s2 = 0, s4 = 0, tail = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i], a = Math.abs(v);
    if (a > peak) { peak = a; at = i; }
    s2 += v * v; s4 += v ** 4;
    if (i >= buf.length - sr / 1000) tail = Math.max(tail, a);
  }
  const n = buf.length, dB = (x) => 20 * Math.log10(x + 1e-12);
  return { attackMs: (at / sr) * 1000, firstRel: Math.abs(buf[0]) / peak, tailDb: dB(tail / peak),
           peakDbfs: dB(peak * level), kurtosis: s4 / n / (s2 / n) ** 2 };   // a kit flap: ~-17.5 dBFS with level
}
```

**Metrics cannot measure taste.** The listener moved the spectrum far below the 1.5-5.5 kHz centroid window the
checks first enforced (93 % of the approved energy sits below 2.5 kHz), and every density target pointed the wrong
way. Use the numbers for hygiene only, and get a human listen:
1. Render 20-30 s of real use (a walk, a scroll through the UI) at the final levels, with the music.
2. Ask one person to listen on ordinary speakers or headphones. Ask three narrow questions: too loud? too bright?
   too frequent?
3. Change one lever per round, in big steps: -6 dB, pitch x 0.8, band limit x 0.7, spacing x 1.5.
4. Expect "quieter, lower, fewer". If no listener is available, ship the quieter, lower, sparser option.

## 11. Map your events to sounds

Rows marked * are untested starting points.

| Medium | Event | Sound | Notes |
|---|---|---|---|
| Game | a piece pops up | `flap` up; size relative to the largest piece | seed from the piece id |
| Game | the same piece folds away or falls | `flap` down, same seed and size | -9 dB and duller, automatically |
| Game | a whole tile or group rises (6-8 layers) | one `flap` for its largest layer | everything else stays silent |
| Game | a page turns, a scene opens, a sheet (map, journal) slides in * | `flap` up, size 0.8-1 | make it the only flap that second |
| Game | footfalls | `step` per footfall; surface from the ground | alternate `foot` |
| Game | pickup / lamp lit / place found | chime: a high / low chord tone, on the music bus | no new SFX |
| Game | camera moves, idle sway, wind, hover | nothing | |
| Web UI * | a panel, card, menu or `<details>` opens | `flap` up, size 0.2-0.4 | unlock on the first pointerdown/keydown |
| Web UI * | it closes | `flap` down, same seed | |
| Web UI * | a modal or a page transition | `flap` up, size 0.8-1 | |
| Web UI * | success, completion | a chime if music plays; otherwise nothing | |
| Web UI | hover, scroll, focus, typing, a drag in progress, repeating toasts | never | the spacing rule applies to everything else |
| Video | every fold that matters on screen | the game rules, applied to the recorded event list | render with `renderOffline` |
| Video | music | its own stem; cut on its bars | -16 LUFS mix, -14 LUFS music-only |

On web pages, keep music optional, toggled by the user and off by default, and respect a mute preference.
