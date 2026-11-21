# Paper motion

How cut paper moves: one hinge per card driven by a latched spring, choreographed in sequence, quietly alive at rest,
plus paper puppets, small-object "paper verbs", a calm miniature camera, frame timings for video and a living world
(weather, flyers, creatures).

Read this when: animating anything that should read as paper (pop-up rises and folds, a paper character, wind, UI
cards, the camera, a rendered clip), giving a world its life (weather, flyers, smoke, creatures: section 12), or when
motion looks floaty, rubbery, busy or CG.

Contents: 1 Laws; 2 The flap model; 3 Keyframes and acceptance bands; 4 Size response and variety;
5 Choreography; 6 Deterministic integration; 7 Idle life; 8 Paper puppets; 9 Small things and the allowed
exceptions; 10 Camera language; 11 Animation and video; 12 A living world: weather, flyers, creatures

Units: **H** = hero (figure) height, **F** = frame height at the focus distance, **p** = fold progress (0 flat on the
page, 1 upright, above 1 past upright). Seconds stay seconds. *(opt)* marks a flourish; everything else is required
for the look.

## 1. Laws of paper motion

1. **Hinges only.** Every moving part is a rigid card turning about a crease, one scalar p per hinge. No scaling,
   stretching, bending, fading in or morphing (the few exceptions are in section 9).
2. **Author the upright pose.** `pose(p) = rest * Rot(hingeAxis, foldAngle * (1 - p))` with foldAngle about +-90 deg
   minus the card's lean, so flat is exactly flat. Model and print everything standing; the fold finds the flat state,
   and the authoring tool, the runtime and an offline render all agree.
3. **Rise: snap, whip, quiver, stop.** Arrive at upright WITH speed in 0.18-0.32 s, whip 8-15 % past it (7-13 deg),
   quiver 2-3 cycles at 4-6 Hz with every swing smaller than the last, dead still by about 1 s.
4. **Fall: softer.** A ~2 deg outward twitch (the strut unlatching), a soft accelerating fall, one slap-bounce of
   1-3 % on the page, stick. Done in 0.5-0.85 s.
5. **Children ride their parent.** Struts, cross halves, box walls and roof panels follow the parent's progress
   through a stiff linkage. Independent springs make the crossed planes of one piece scissor.
6. **Big is slow, small is snappy.** Same curve shape, different speed (small:large frequency 1.2-1.6); big cards
   whip a little more.
7. **Never in unison.** Stagger cards inside a piece, ripple pieces across the scene, jitter every card +-3 %.
8. **Deterministic.** The same input gives the same frames at 20, 60 or 144 fps and on every run.
9. **Idle is a whisper.** At most 2.5 deg of sway on the card's own hinge, a pure function of time and place.
   Walls, roofs and rocks never sway.
10. **Bold once, subtle always.** A one-shot fold may be bold; anything seen every frame for minutes (gait, idle,
    camera) must be quiet. Critics judging stills pushed bob and wobble up; the owner, playing for minutes, cut them
    2-3x. Start at the low end.

Rejected by the owner as gimmicks: scenery bending aside for the hero, a see-through hole cut around the hero, props
or animals following the hero, cards growing in by scale, a camera that never stops moving.

## 2. The flap model: rise, latch, quiver, fall, nested

A linear spring tuned to 8-15 % overshoot has a damping ratio of 0.52-0.63, and its next swing is the square of the
overshoot (0.6-2 %): one bounce, no quiver. Lower the damping to get a quiver and the overshoot jumps to 25-40 %. A
pop-up flap is a stiff card stopped at upright by a taut strut, so it needs two regimes: a soft rise spring that
arrives with speed, then a stiff, lossy quiver about upright.

```
RISE    p'' = k (1 - p) - c p'                                    until p first reaches 1, then LATCH
LATCHED p'' = -w^2 (p - 1) - (2 z w + drag |p'| + fric / (|p'| + 0.05)) p'
NESTED  p'' = clamp(kN (p_parent - p) + cN (p'_parent - p'), +-aN)     a child, while its parent moves
FALL    p'' = -kD p - cD p' - pull          at p = 0: bounce once (restitution 0.25), then stick
```

Each latched loss has one job: `2zw` is the base decay; `drag|v|` (quadratic air drag) eats the big first swing and
spares the small quiver; `fric/(|v|+0.05)` (smoothed dry friction in the crease) ends the tail after 2-3 cycles
instead of ringing. The latch is force-continuous (the rise force is 0 at p = 1), so there is no kink.

| Regime | Value (p units per second, for a 90 deg fold) | Gives |
|---|---|---|
| Rise | k 62 x fs^2, c 5.0 x fs | 1.25 Hz, damping ratio 0.32 |
| Rise, large cards | c x (1 - 0.5 sizeT) | ratio 0.16: arrives faster, whips more |
| Latched | w = 2 pi x 4.5 Hz, +-3 % per card, the SAME for every size | extrema every 0.10-0.12 s |
| Latched | z 0.04/sqrt(wob), drag 3.5/sqrt(wob); wob = (1 + sizeT) x per-card wobble | swing ratio 0.55-0.65 per half cycle |
| Latched | fric 2.2 x fs x (1 + 0.8 sizeT), not divided by wob | the tail ends at 2-3 cycles |
| Fall | kD 10 x fs^2, cD 4.5 x fs, pull 5 x fs^2 | 0.5 Hz, ratio 0.71, plus a constant pull so it LANDS with speed |
| Fall start | outward velocity +1.2 x fs when resting upright | the 1.8-1.9 deg unlatch twitch |
| Page | restitution 0.25 above 0.5 x fs /s, else stick | one 1.4 % slap |
| Nested | kN 1500, cN 62 (ratio 0.8), aN 125 /s^2; child starts >= 0.02 s after its parent | 6.2 Hz; child within 2-6 deg of the parent, never a jerk |
| Rest | snap when abs(p - 1) < 0.002 and abs(v) < 0.024 /s | tails stop "moving" forever |
| Step | fixed 1/240 s, semi-implicit Euler | ~50 steps per quiver cycle |

**Kit.** `FlapSpring` in `assets/lib/paper-motion.js` (re-exported by `paperkit-3d.js`) implements RISE, LATCHED and
FALL and is the default spring of `hinge(child, { at, yaw, open, size, flat, rest, delay })` (`h.set(open, delay)`,
`h.update(dt)`, `h.p`, `h.onStart`, `h.sway`), with the shipped values (4.5 Hz quiver for every size). It has no
NESTED regime. `Spring` is the single-regime spring: fine for blocking, not for anything watched. Replays and
scrubbing: `FlapSpring.reset(p)`, `Spring.reset(x)` and `h.reset(p)` jump to a value at rest with nothing pending.
Linked parts (box walls, cross planes, a level deck) follow their parent through `child.userData.follow(p)`, which
`hinge()` calls with the parent's p every update (`crossCard()`, `boxFold()` and `platform()` use it): what the
stiff linkage converges to.

**Reference implementation** (plain JS, allocation-free, with nesting and a fixed-step clock; it reproduces the tables
in section 3 to the third decimal once the per-card jitter matches). Works the same under three.js, Canvas or CSS.

```js
const F = { k: 62, c: 5, cLarge: 0.5, hz: 4.5, z: 0.04, drag: 3.5, fric: 2.2, fricLarge: 1.8,
            kDn: 10, cDn: 4.5, pull: 5, antic: 1.2, bounce: 0.25, minBounce: 0.5,
            kN: 1500, cN: 62, aN: 125, eps: 0.002, veps: 0.024, H: 1 / 240 };

// size: card height / (3.3 H), as in FlapSpring. j, jw: seeded jitter in [-1, 1]. wobble: per-card multiplier.
export function makeFlap({ size = 0.4, j = 0, jw = 0, wobble = 1, parent = null, p = 0 } = {}) {
  const t = Math.min(1, Math.max(0, (size - 0.12) / 0.58));               // sizeT
  const fs = (1.14 - 0.26 * t) * (1 + 0.03 * j), wob = (1 + t) * wobble;
  const w = 2 * Math.PI * F.hz * (1 + 0.03 * jw);
  return { fs, t, parent, m: p, mPrev: p, p, v: 0, tgt: p >= 1 ? 1 : 0, locked: false, still: true,
    wait: -1, next: 0, kUp: F.k * fs * fs, cUp: F.c * fs * (1 - (1 - F.cLarge) * t),
    w2: w * w, cL: 2 * w * F.z / Math.sqrt(wob), dragL: F.drag / Math.sqrt(wob),
    fricL: F.fric * fs * (1 + (F.fricLarge - 1) * t),
    kDn: F.kDn * fs * fs, cDn: F.cDn * fs, gDn: F.pull * fs * fs };
}
function start(f, t, onFold) {
  f.wait = -1;
  if (t === f.tgt) return;                                    // already there or going there: no event
  if (t === 0 && f.still && f.m >= 1) f.v = F.antic * f.fs;   // unlatch twitch past upright
  f.tgt = t; f.locked = false; f.still = false;
  if (onFold) onFold(f, t);                                   // one event per card: sound, dust
}
const link = (f, q) => Math.max(-F.aN, Math.min(F.aN, F.kN * (q.m - f.m) + F.cN * (q.v - f.v)));
function step(f, h) {
  if (f.still) { f.mPrev = f.m; return; }
  const q = f.parent, av = Math.abs(f.v);
  let a;
  if (f.tgt === 1) {
    if (!f.locked && f.m >= 1) f.locked = true;               // strut taut: switch regime
    a = f.locked ? -f.w2 * (f.m - 1) - (f.cL + f.dragL * av + f.fricL / (av + 0.05)) * f.v
      : q && q.tgt === 1 && !q.still ? link(f, q)
      : f.kUp * (1 - f.m) - f.cUp * f.v;
  } else if (q && q.tgt === 0 && !q.still && f.m <= 1 && q.m <= 1) a = link(f, q);
  else {
    a = -f.kDn * f.m - f.cDn * f.v - f.gDn;                   // soft fall + constant closing pull
    if (f.v > 0) a -= f.cUp * f.v * Math.min(f.m, 1);         // reversed while rising: brake, no velocity reset
    if (f.m > 1) a -= f.w2 * (f.m - 1) + f.cL * f.v;          // the end stop still exists past upright
  }
  f.mPrev = f.m; f.v += a * h; f.m += f.v * h;                // semi-implicit Euler
  if (f.m <= 0 && f.tgt === 0) {                              // the page: one slap, then stick
    f.m = 0; f.v = f.v < -F.minBounce * f.fs ? -f.v * F.bounce : 0; f.still = f.v === 0;
  } else if (f.m < 0) { f.m = 0; if (f.v < 0) f.v = 0; }
  if (f.tgt === 1 && Math.abs(f.m - 1) < F.eps && Math.abs(f.v) < F.veps) { f.m = 1; f.v = 0; f.still = true; }
}
export class FlapSystem {                                     // list parents before their children
  constructor(onFold) { this.flaps = []; this.acc = 0; this.onFold = onFold; }
  set(f, t, delay = 0) { f.next = t; f.wait = Math.max(0, delay); }
  update(dt) {
    this.acc += Math.min(dt, 1 / 20);
    for (let n = 0; this.acc >= F.H && n < 30; n++, this.acc -= F.H)
      for (const f of this.flaps) {                           // steps outside, cards inside: same step for all
        if (f.wait >= 0 && (f.wait -= F.H) < 0) start(f, f.next, this.onFold);
        step(f, F.H);
      }
    const al = this.acc / F.H;
    for (const f of this.flaps) f.p = f.mPrev + (f.m - f.mPrev) * al;   // draw this
  }
}
```

Drawing it (three.js with the kit's hinge groups; in 2D use the projection in `mechanisms.md` section 2):
```js
h.pivot.rotation.x = FLAT * (1 - f.p) + sway;        // FLAT = -PI/2 + lean (the kit: falls back, face up); sway: section 7
card.rotation.y = (f.locked && f.p !== 1 ? twist * (f.p - 1) : 0) + 0.5 * sway;   // twist about the long axis: section 4
```

Pitfalls
- A retarget mid-move must be continuous: never reset velocity (the FALL branch brakes a card that is still rising
  and keeps the end stop past upright). A card that never left for the old target simply stays put, with no event.
- Twist only while latched; at rest and while folded it is exactly 0, or settled cards keep a skew.
- Other fold angles: keep p as the variable and every timing holds; degree amplitudes scale with the angle (roof
  panels ~40 and ~78 deg, ramps ~25 deg, water slivers ~20 deg).
- The pose write must cost less than the physics: write rotations directly, touch only moving cards, update matrices
  once more when a card comes to rest, then leave it alone.

## 3. Keyframes and acceptance bands

p at 30 fps from the trigger (first row frames 0-15, second row 16-30), sampled from the shipped runtime. Use them as
CSS or Web Animations keyframes, in a video or motion tool, or to test your own spring. Size 0.30 is a
card about 1 H tall, size 0.70 about 2.3 H.

```
rise 0.30: 0.000 0.031 0.126 0.269 0.442 0.631 0.820 0.995 1.108 1.105 1.024 0.951 0.934 0.973 1.022 1.043
           1.026 0.993 0.973 0.979 0.999 1.015 1.015 1.004 0.994 0.991 0.996 1.001 1.003 1.002 1.001
rise 0.70: 0.000 0.022 0.091 0.201 0.343 0.507 0.685 0.866 1.039 1.130 1.097 1.000 0.930 0.931 0.985 1.038
           1.049 1.020 0.982 0.966 0.980 1.006 1.021 1.016 1.001 0.990 0.990 0.997 1.003 1.004 1.002
fall 0.30: 1.000 1.020 1.008 0.974 0.929 0.874 0.812 0.744 0.672 0.598 0.521 0.445 0.369 0.294 0.222 0.151
           0.084 0.020 0.008 0.014 0.013 0.007 0.000 (rest)
fall 0.70: 1.000 1.019 1.012 0.985 0.949 0.907 0.858 0.805 0.748 0.689 0.627 0.564 0.500 0.437 0.373 0.311
           0.250 0.191 0.133 0.077 0.024 0.005 0.012 0.014 0.012 0.006 0.000 (rest)
```

The same model at 24 fps (film and most video), frames 0-25:
```
rise 0.30: 0.000 0.050 0.193 0.398 0.633 0.867 1.068 1.116 1.024 0.940 0.948 1.010 1.043 1.019 0.981 0.975
           0.998 1.016 1.011 0.996 0.991 0.997 1.003 1.003 1.001 1.000
rise 0.70: 0.000 0.035 0.142 0.306 0.509 0.732 0.957 1.115 1.094 0.978 0.924 0.969 1.036 1.044 1.001 0.968
           0.980 1.010 1.020 1.006 0.991 0.991 1.000 1.004 1.002 1.000
fall 0.30: 1.000 1.020 0.993 0.942 0.874 0.796 0.708 0.616 0.521 0.425 0.331 0.239 0.150 0.067 0.002 0.013
           0.013 0.004 0.000 (rest)
fall 0.70: 1.000 1.020 1.000 0.959 0.907 0.846 0.777 0.704 0.627 0.548 0.468 0.389 0.310 0.234 0.161 0.090
           0.023 0.008 0.014 0.013 0.006 0.000 (rest)
```

Acceptance bands (measure your implementation; shipped results in the last column):

| Check | Band | Shipped |
|---|---|---|
| Overshoot | 8-15 % (7-13.5 deg) | 11.6-13.9 % |
| Rise to first upright | 0.18-0.32 s | 0.20-0.26 s |
| Quiver | 4-6 reversals >= 0.5 deg, monotonic decay, < 0.3 deg by settle | 5-6 at 4.4-4.55 Hz |
| Rise settle | 0.6-1.1 s; a whole piece with stagger <= 1.5 s | within 1 % by 0.75-0.88 s, snapped still ~1.0 s |
| Fall settle | 0.4-0.85 s, never below the page, rebound <= 3 % | 0.52-0.84 s, 1.4 % |
| Stagger across one piece | 0.2-0.35 s | 0.34 s |
| Small:large frequency | 1.2-1.6 | 1.30 |
| Frame rate | identical from dt 0 to 1/20 s | bit-identical |
| Retarget mid-move | continuous | continuous |

## 4. Size response and per-card variety

`size` = card height / (3.3 H), or / (0.38 F) with no hero; sizeT = clamp01((size - 0.12) / 0.58), so sizeT is 0
up to ~0.4 H (5 % of F) and 1 from ~2.3 H (27 % of F).

- `fs = (1.14 - 0.26 sizeT) x (1 + 0.03 j) x sqrt(stiffness)`. Scale every k by fs^2 and every c by fs: the damping
  ratio and curve shape stay, only the speed changes.
- Then whip on purpose: rise damping x (1 - 0.5 sizeT), quiver wobble x (1 + sizeT), crease friction x
  (1 + 0.8 sizeT) so the bigger quiver still ends in 2-3 cycles. This took large cards from 9.5 % to 13.9 %
  overshoot and their first quiver swing from 4.0 to 5.9 deg.
- Per-card multipliers: `wobble` (watery slivers 1.6, ramps and decks 0.6); `stiffness` (frequency follows its
  square root, floor 0.25).
- **Twist** (the only cue that a card is not a plank): while latched, turn the card about its own long axis by
  `twist * (p - 1)`, twist = 1.1 rad x alternating sign per card x seeded 0.55-1.0 x (0.6 + 0.4 sizeT): 5-8 deg at the
  overshoot peak, 0 at rest. Raising it from 0.35 to 1.1 cured "the card moves like a rigid board".
- Every variation comes from integer hashes of (piece id, card index, salt). No unseeded random in anything that moves.

## 5. Choreography

**Inside one piece** (a house, a tree, one spread):
- Order comes from the flat stack: whatever lies on top when folded leaves first; folding down is the film run
  backward. List cards bottom-to-top, `delay_i = 1 - i/(n-1)`, `tUp = delay * 0.34 s`, every child at least 0.02 s
  after its parent, `tDown = span - tUp` (children fold before their parents).
- Check the direction. In 3D the kit folds every card back, away from the camera (face up): front cards lie on top
  of the cards behind them wherever their flat footprints overlap, so the nearest rises first and the piece rises
  front to back. In a pitched 2D view cards fold TOWARD the viewer, so the farthest lies on top and rises first
  (`web-2d.md`). For the other order, flip the fold direction, or space cards so their flat footprints never overlap.
  Any other order swings cards through each other.
- When a card starts: emit one event (sound: `sound.md`, `PaperSound.flap({ size, up })`); a falling card lands
  0.5-0.7 s after its event. A 4-card piece is still 1.3-1.4 s after its trigger.
- Money shot: 0.42-0.55 s after the trigger most cards stand between 20 and 70 deg. Aim stills and thumbnails there;
  re-measure after any retune.

**Across a scene:**
- Ripple outward from the cause (the hero, the cursor): extra delay 0.04-0.07 s per module of distance (0.055
  shipped in the streaming world, ~0.017 s per H) plus a seeded +-0.035 s. Start at most ~6 pieces per frame; the
  rest wait.
- An opening shot of a whole diorama follows the flat stack: in 3D the nearest pieces rise first and the wave runs
  away from the lens, ~0.02 s per unit of distance in the template's units (hero 3.6 units tall) plus a fixed seeded
  jitter per piece; closing runs the other way (the template closes at half that stagger). A streaming world opens
  as a ring spreading from the hero.
- Streaming worlds (rise ahead, fold behind, hysteresis, grace): `worlds.md`. Mechanism-specific order: `mechanisms.md`.

## 6. Deterministic, frame-rate-independent integration

Paper motion is tuned in slow motion and side-by-side captures; if it drifts with frame rate it cannot be tuned.
Make every moving thing one of three kinds:

1. **Fixed step + interpolation** (flaps): consume dt in exact 1/240 s steps (clamp dt to [0, 1/20] s), draw
   `prev + (cur - prev) * acc/h`, step outside and cards inside so a child reads its parent at the same step
   (`FlapSystem` above). Choose the step for your highest frequency (~50 steps per cycle). Kit: `FixedClock` in
   `paper-motion.js` is this accumulator (`advance(dt, update)` returns the interpolation alpha; its default step is
   1/120 s, so pass `new FixedClock(1 / 240)` for the steps above); the kit's springs sub-step `dt / ceil(240 dt)`,
   so inside a fixed clock they are exact, outside it very close.
2. **Exact closed-form steps** (followers, the camera):
   ```js
   function damp(s, goal, prevGoal, smoothTime, dt) {              // critically damped, exact for any dt
     const w = 2 / smoothTime, e = Math.exp(-w * dt), g = (goal + prevGoal) * 0.5;   // chase the MID-STEP goal
     const d = s.x - g, k = (s.v + w * d) * dt;
     s.v = (s.v - w * k) * e; s.x = g + (d + k) * e;
   }
   ```
   Secondary springs (lean, roll, a dangling carried item) sub-step `n = ceil(dt * 240)` (h <= 1/240 s, as `Spring`
   and the harness do; section 8): `v += (w^2 (target - x) - 2 z w v) h; x += v h`. Movement uses the mean of old and
   new velocity, so a path is the same at 30, 60 or 144 Hz. Weights that ramp in over time (a camera lead) are also
   taken at mid-step.
3. **Pure functions of time and place** (wind, sails, weather, birds, idle rocking): `f(t, x, z, hash)`, no state.

Also: a `settle()` that snaps every spring to its target and finishes every one-shot, so stills are exact; hard
rest epsilons; nothing at rest is updated or re-uploaded.

**Clamp the real-time step to [0, 0.05] s** before anything consumes it. A slow build (seconds of texture printing)
can make the first animation-frame timestamp older than the clock you read before it; a negative step runs every
spring backwards and the world never opens (two test agents hit this).

## 7. Idle life: wind and spinners

A settled paper landscape that is perfectly still reads as a render. Sell "air in the room" with a sub-3 deg rock
about each card's OWN hinge, carried across the page by gust fronts so neighbours move one after another.

```js
function gust(x, z, t) {                       // pure function; D1/D2 unit wind directions, K = 2pi/wavelength, W = 2pi/period
  const a = (x * D1x + z * D1z) * K1 - t * W1 + 1.7 * Math.sin((z * D1x - x * D1z) * K1 * 0.6);   // warped front
  const b = (x * D2x + z * D2z) * K2 - t * W2;
  return 0.5 + 0.32 * Math.sin(a) + 0.18 * Math.sin(b);                                          // ~0..1
}
// per card, added to the fold angle on the SAME hinge (plus 0.5 x as much twist about the long axis)
const g = gust(x, z, t), ph = 2 * Math.PI * (rate * t - along / (8 * H)) + seedPhase;
sway = amp * fade * (0.5 * (g - 0.3) * windOnFace + (0.35 + 0.65 * g) * (0.55 * Math.sin(ph) + 0.1 * Math.sin(2.31 * ph + 1.7)));
```
`windOnFace` = dot(wind direction, card normal): a gust leans the cards whose face it meets; the second term is a
flutter whose strength follows the gust. `along` = position along the wind, so the phase travels.

| Key | Value |
|---|---|
| Amplitude | 0.6-2.2 deg from shape: `min + (max - min)(0.55 tall + 0.45 thin)`, tall = clamp01((h/H - 0.4)/1.7), thin = clamp01((h/w - 0.7)/1.2); cap 2.5 deg |
| Kind | loose (grass, reeds, flowers, flags) x1.3; stiff (fences, lamps, signs) x0.35; rigid (walls, roofs, rocks, houses, and anything walked on: bridges, decks, stairs) 0 |
| Rate | 0.8 Hz short cards to 0.42 Hz tall ones, +-15 % per card |
| Gust fronts | wind ~30 deg off the world axes; front 1 wavelength ~23 H passing in 9 s, front 2 ~13 H in 5.3 s on another direction (they never line up); flutter phase wavelength ~8 H |
| Fade | in over 1.2 s after the piece settles; out with tau 0.22 s when it starts to fold (no pop) |
| Mood strength | still air 0.3-0.6, normal 1, breezy 1.35 |
| Measured | trees 2.2 deg, pines 2.0, reeds 1.7, flowers 0.8, posts 0.55, fences 0.24, houses 0 |

- Kit: `windSway(t, x, z, { amp, hz, phase, dir, heroHeight })` in `paper-motion.js` is this field (amp in degrees,
  without the wind-on-face lean; `heroHeight` in your units sets the wavelengths). Write it to `h.sway` every frame;
  `hinge()` turns it about the fold line, scaled by p so a folded card stays flat (the template:
  `h.sway = windSway(time, h.x, h.z, { amp: 1.6 * h.swayAmp, heroHeight: 3.6 })`).
- Sway about the hinge, never in the card's own plane: an in-plane rock lifts one end of the foot off the page (a
  walking card's roll about its planted foot is the exception, section 8).
- Classify by piece kind with a per-card override; a renamed rock must not sway like a tree.
- Only near the subject (~1.8x the reveal radius); update only swaying cards.

**Spinners** *(opt)*: sails and pinwheels turn about the card normal by the closed-form integral of a gusting speed,
`angle = phase + speed * (t + gustAmt * (0.64/W1 * cos(a) + 0.36/W2 * cos(b)))`, ~0.5 rad/s +-35 %; they keep turning
while folding.

## 8. Paper puppets

**Rig.** `group (position, heading) -> rig (hop, lean, roll, twist) -> parts on pivots at their joints` (the legs at
the hip, the head at the neck); the cards themselves: `mechanisms.md` section 12. Trust an authored origin in the top
40 % of a part as its joint, else use its top edge. No pale base disc under the figure (it read as "a weird white
circle").

**Movement** (the source game's player; the 3D harness does all of it): the velocity approaches the wanted one at a
constant rate (~28 H/s^2: 90 % of top speed in ~0.06 s, a clean stop); top speed ~1.9 H/s; the HEADING turns
smoothly toward the input direction (or the coasting velocity) at ~13 /s, the whole model yawing; a forward lean of
~3.5 deg at full speed on an under-damped spring (~3.4 Hz, damping 0.75: it rocks once, ~1-2 deg, when he stops); a
roll into turns of ~0.035 rad per rad/s of yaw rate, at most ~4 deg; on a deck the ground height is followed fast
(~45 /s) so the feet never lag a ramp. Rotation only: nothing is ever scaled or stretched.
Sub-step every spring (h <= 1/240 s, as `paper-motion.js`'s `Spring` does): a single explicit step per frame of
this lean spring flips its sign every frame below ~32 fps, and the hero flaps forward and back (two blind builds).

**Gait from distance, never from time** (feet cannot skate):
```js
phase += moved / stepLength * Math.PI;                   // moved = distance really covered, after collision
const s = Math.sin(phase), c = Math.cos(phase);
rig.y = hop * gait * Math.abs(s);                         // high when passing, low at footfall
rig.roll = waddle * gait * s;  rig.yaw = twist * gait * s;
const leg = (ph, legLength) => {                          // one stride = 2 pi: swing (u 0-1), then stance (u 1-2)
  const u = (ph / Math.PI) % 2, A = gait * stepLength / (2 * legLength);   // rad: one stance covers one step
  if (u >= 1) return [A * (3 - 2 * u), 0];                // stance: angle LINEAR in distance, the foot stays put
  const e = u * u * (3 - 2 * u);                          // swing: smoothstep back to front, foot lifted
  return [A * (2 * e - 1), gait * lift * Math.sin(Math.PI * u)];
};
[legL, liftL] = leg(phase, legLength);  [legR, liftR] = leg(phase + Math.PI, legLength);   // angle (+ forward), lift
armL = armSwing * gait * c * armKL;  armR = -armSwing * gait * c * armKR;    // arms opposite the legs
torso = torsoLag * gait * Math.sin(2 * phase - 1.2);  head = headNod * gait * Math.sin(2 * phase - 1.9);
```
Never swing a leg by `cos(phase)`: phase runs linearly with distance, a cosine angle does not, so the planted foot
slides back and forth under the hip. With the stance linear and swing = stepLength / (2 x legLength) rad, the hip
travels exactly one step while a foot is down; `lift` raises the swinging leg on its pivot. That is the small-angle
form: for wide swings use `Math.asin(R * (3 - 2 * u))` in the stance and +-`Math.asin(R)` as the swing's ends (R =
the same ratio), and the foot holds exactly still.
A footfall event (step sound) fires when the phase crosses k x pi. On stop, ease the phase to the nearest k x pi at
14 /s WITHOUT a footfall ("feet together under the body"). `gait` eases at 16 /s toward min(1, speed / (0.55 x top
speed)).

| Key | Final | Earlier value (critics or scaffold) |
|---|---|---|
| Walk speed | ~1.9 H/s (calm) | 3.8 H/s, halved by the owner |
| Step length | 0.58 H (3.3 footfalls/s) | 0.7 H |
| Leg / arm swing | legs from the step (above; shipped +-34 deg as a cosine) / arms +-22 deg; an arm carrying something swings less (x0.2-0.4) | legs 30 |
| Hop | 3.3 % of H | 12 % |
| Waddle roll / yaw twist | 1.6 / 2.2 deg | 5 / 6 |
| Torso lag / head nod | 1.8 / 1.8 deg, twice per stride | 5 / 5 |
| Forward lean | 3.5 deg on a 3.4 Hz spring, ratio 0.75: rocks back once on stopping, like a settling standee | 6 |
| Roll into turns | <= 4 deg (yaw rate x 0.035) on 3.4 Hz, ratio 0.6 | 8 |
| Idle breathing | 0.9 deg at 0.32 Hz, two incommensurate sines (x1, x0.63) | |
| Start / stop | 0 to 90 % speed in 0.06 s; heading follows input at 13 /s; ground height followed at 45 /s | ground at 18 /s lagged ramps |
| Carried item *(opt, only if the design has one)* | a 2-axis pendulum 1.5 Hz, ratio 0.22, ~1 deg per H/s^2 of acceleration, +5 deg of gait, clamp 28 deg | |

Motion read every frame for minutes must be subtle; a fold that happens once can be bold. Halve the bob again after
the critics are happy.

**Quadruped walk.** Diagonal pairs move together: left fore + right hind, then right fore + left hind, from the same
distance phase and the same `leg()`, each leg with its own length, so long and short legs both plant without
skating (stepLength = the distance covered while one pair is down):
```js
[foreL, liftFL] = leg(phase, fore);            [hindR, liftHR] = leg(phase, hind);              // pair A
[foreR, liftFR] = leg(phase + Math.PI, fore);  [hindL, liftHL] = leg(phase + Math.PI, hind);    // pair B
```
Walk speed scales with the creature: ~1.9 H/s is the hero's calm walk; a giant (a tortoise carrying a village) walks
slower in hero heights per second, on long steps at a low cadence (law 6: big is slow).

**The doll walking in 2D.** In 2D the hero is still the doll of `mechanisms.md` section 12, never one card: the body
card carries the walk and the other cards ride it at small offsets (x offsets mirror when he turns; the 2D
template's `setHero(body, { parts })`). From the same distance phase:
- the legs step as x offsets from the hip, never turned in the picture plane (that lifts a foot off the page): the
  same `leg()` with its angle read as an offset (offset = legLength x angle), linear in distance while a foot is down
  so it holds still on the page, eased forward while it swings;
- the body card rolls about the PLANTED foot, +-1.5 deg: the pivot is the base corner that stays down, switching at
  each footfall. The one in-plane rock allowed (section 7 bans it for sway), because the planted foot never leaves
  the page;
- a small hop, 1-2 % of its height, `abs(sin(phase))`;
- a rock about its hinge of at most ~1 deg: in a pitched 2D view a hinge angle changes the card's screen height
  (`k = cos(phi + pitch)`), and more reads as squash;
- on a turn, the flip of section 9 with a cut at the midpoint: never a visible edge-on sliver, one sliver frame is
  the limit.

## 9. Small things, and the allowed exceptions to "nothing scales"

Authored pieces only ever rotate. Four runtime systems break the rule on purpose, each disguised as a paper verb;
copy them as verbs, never as generic tweens:

| Verb | Use for | Recipe |
|---|---|---|
| Pop | a small card appearing on an already risen surface (animal, collectible), never scenery | scale `k = 1 + 2.4(u-1)^3 + 1.4(u-1)^2`, u 0 to 1 in 0.22 s (peak 1.07 at u 0.61); hide in 0.1 s |
| Flip | a flat card turning round (an animal or a 2D hero changing direction) | width x abs(f), f eased to +-1 at 11 /s, art mirrored while f < 0: reads as a spin about its vertical axis; cut at the midpoint (f jumps across the thin middle), so the card is never seen edge-on, one sliver frame at most |
| Shrink away | a collected scrap at the end of its flight; a leaf after resting on the page; bits near the lens | scale `1 - e^2` at the end of the motion |
| Grow in | life only (paper-life, section 12), never a card: puffs scale up from nothing as they leave the emitter and down to nothing at their end; fallers appear above the frame, out of view, and shrink away on the page | never by opacity |

Secondary motion and small life:
- **Lag**: hats, packs and tassels trail by a phase offset (about one frame at 30 fps) or a sub-stepped spring.
- **Creased bits**: every falling leaf, petal, flake or bird is two halves folded on a centre crease (depth ~0.16 of
  the width, ~18 deg per half) with a darker lip for thickness; a flat quad reads as a sprite. Fallers rock about
  face-up so they always catch the key, sway more the higher they are, then rest on the page before shrinking away
  (fall speeds and rest times: section 12).
- **Flyers, creatures and smoke**: section 12.
- **A light that "catches"** *(opt)*: a lantern level behaves like a sprung flap:
  `u < 1: smoothstep(u) + 0.35 sin(pi u) u` over 0.6 s, then `1 + 0.16 exp(-3.5 t) sin(26 t)`.
- **Never in the way**: ambient bits shrink to nothing within 0.4-0.7 H of the camera-to-hero line and within 4-8 H
  of the lens. Thin density by rank (piece j shows only if density > (j + 0.5)/count), never by opacity.

## 10. Camera language

A miniature reads through a long lens looking down into the world, the printed ground past every frame edge (no
horizon, sky, table or book edge), a sharp band across the subject (~36-45 % of the frame, `look.md` section 6) and a
calm camera that never chases. A follow camera keeps the hero a little below centre so the world unfolding ahead
stays in frame; a composed still puts him off-centre (`worlds.md` section 9).

| Key | Value | Note |
|---|---|---|
| Lens | 24-32 deg vertical FOV (template 26, shipped game 27) | long-lens compression = miniature |
| Pitch | 40-55 deg down (template 47 from 66 units, shipped game 42) | the template clamps drag to 40-55: lower, the far edge shows; at 53 deg the shipped game's hero read as a hat disc (check the hero at the steep end); above 60 every card reads thin |
| Yaw | 20-35 deg off the main building axis (or turn the buildings 26-40 deg) | two faces of every box show |
| Distance | hero 6-10 % of F (template ~8 %) | |
| Aim | hero's chest (0.6 H) plus 1 H up-screen | the hero sits ~1 H (6-10 % of F) below centre |
| Look-ahead | 1.7 H in the walking direction, 4 H when walking toward the camera | near ground is foreshortened away |
| Follow | exact critically damped (section 6), smoothTime 0.28 s (the template's camera window), mid-step goal | |
| Drift *(opt)* | lens position 0.06 H (0.7 % of F in the shipped framing) at 0.07 Hz, second axis 0.6x at 1.37x frequency; aim fixed | "a hand-set tripod head" |
| Focus | depth-of-field focus at the hero's chest (`PaperPost.focus`) | band, blur: `look.md` section 6 |
| View change | glide 0.9 s, smoothstep on every key (distance, pitch, yaw, FOV, aim) | never cut |

**Lag-compensated lead.** A critically damped follower lags a steady walker by `v * smoothTime`; add it to the lead
so the on-screen lead is exactly the look-ahead:
```js
const toward = Math.max(0, -dot(vel, upScreen)) / topSpeed;              // share of motion running down-screen
want = hero + vel * (lookAhead / topSpeed + smoothTime) - upScreen * (leadToward - lookAhead) * toward + upScreen * aimUp;
```

**The window** (the owner's request after "the camera moves always"):
- Still zone: no camera motion while the hero is within 1.7 H sideways, 0.7 H up-screen, 1 H down-screen of centre.
- Soft zone: beyond it the camera picks up his step gradually, `step * smoothstep(still, hard, offset)`, only while
  he moves outward.
- Hard edge: 3.7 H sideways, 1.8 H up, 2.3 H down; never crossed. Tight up-screen edges keep him away from the top
  of the frame, where things rise.
- After 0.35-1.1 s of steady walking one way (direction low-passed over 0.35 s, so a wiggle does not reset it) the
  window travels with him and slides ahead to the lead, exponentially (tau 0.7 s) but never faster than 1.2x his
  speed. Stopping does not swing the camera back. Scale the zones with camera distance; turn the window off for
  steep views.

**Sight assist instead of holes.** If 2 of 3 rays (thigh, chest, hat) to the hero are blocked by a large piece for
0.4 s, ease the camera through the gentlest offset that clears them (pitch +5, yaw +-7, pitch +10, yaw +-14 deg, then
x1.3; under a roof, down toward 40 deg), critically damped with tau 0.8 s, and back after 0.6 s clear. Never cut
holes or bend scenery (the source game's owner turned off both a see-through circle and pieces that tipped aside).
The 3D harness does this: blockers are the constructions at least 0.9 H tall (houses, roofs, towers, stalls), not the
cards and crosses (trees, bushes, props), as in the source game; popup's `sight: true / false` overrides it per piece,
and `__papercraft.sight()` reports the rays blocked where he stands (walk a route with `place()` and read it). The
first step from the authored overview starts the window from the frame as it is (no swoop to re-centre him), and the
lens eases from the overview's `focus` to him over ~0.6 s.

## 11. Animation and video (non-interactive)

**Timing in frames.** Either key the tables in section 3 directly, or run the same simulation with `dt = 1/fps` per
rendered frame (never wall time) and `settle()` for stills. Both templates expose `window.__papercraft` with `step`,
`restart`, `resume`, `toggle` and `ready` for exactly this (`resume()` hands back to the real-time loop; `place`,
`walkPath` and `look` add scripted walks and close review frames): every review frame is `restart(); step(T)`, where
`restart()` = `h.reset(0)` on every hinge, then `setOpen(true)`. Event frames at 24 fps: rise upright f6-7, peak f7,
first dip f9-10, still f25-26; fall twitch f1, first page contact f14 (small) to f17 (large), still f18-21. At 30 fps:
upright f8, peak f8-9, still f31-32.

**Shot structure** (4-8 s):
1. 0.5-1 s of the flat print (it must already show what will rise; `worlds.md`).
2. Ink-in 0.45 s, then the ripple and the rises (1-1.5 s, the money shot ~0.5 s after each trigger).
3. At least 2 s of idle life: sway, drift, a walking figure, the world's own life (section 12).

Rules from a batch of demo clips:
- Reveal once. Only the first shot rises from fully flat; later shots open already risen and alive.
- At most one camera move per shot: locked with drift, a slow truck beside the walking hero, or a slow pull-back
  while the reveal grows at the frame edges. Glides between framings take ~0.9 s.
- Overlays and edit graphics slide or fold in like paper; a slow scale-up of cards was rejected as "slow and bad
  looking".
- Hook clips 3-4 s, longer clips 5-8 s. Capture clips with world sound but no music, so the joined edit can carry
  one continuous music track.
- Sound: one fold event per card start; render it offline at the event times (`renderOffline` in
  `assets/lib/paper-sound.js`).
- Motion blur: smooth style may use a light 180-degree shutter (average 4-8 sub-frames); keep the quiver crisp.

**Stop-motion option** *(opt)*:
- Shoot on twos: hold every pose 2 frames at 24 fps (take every second value of the 24 fps table); quick rises may go
  on ones. No motion blur.
- Boil: per pose, give each card a seeded tiny error, a rotation about its own hinge of +-0.2-0.5 deg and a slide
  along the page of +-0.1-0.3 % of its size. Never lift a foot off the page; re-seed per pose, not per frame.
- Exposure flicker +-0.5-1.5 % per pose; grain re-rolled per pose; camera locked off or moved in per-pose steps.
- Halve the idle sway: at stop-motion rates it already reads as boil.

## 12. A living world: weather, flyers, creatures

A place is alive in the source game: leaves come down and rest on the page, smoke curls from chimneys, birds cross
above the trees, sheep graze, hens scatter, a fox bounds off when the hero comes near. Choose that life from the
brief's ENVIRONMENT and time of day, never one list for every world. Use 3-5 kinds per world, small, slow and paper,
moving while the hero stands still. `assets/lib/paper-life.js` is the plumbing (bottom of this section); the
colours, cuts, counts and places come from your brief.

**What lives where** (the source game's five biomes, then the same thinking for others; numbers are its densities,
1 = the full pool below):

| Environment | Weather and air | Flyers | Creatures | Wind (sway x) |
|---|---|---|---|---|
| autumn farmland | leaves 0.8, chimney smoke, cloud shadows | butterflies 0.5, birds 1, fireflies at night 0.3 | sheep graze, hens peck, cats by the doors, a fox shy | 1 |
| desert oasis | dust motes 1, sand gusts 1 | birds 0.5 | camels graze, lizards and a night fox shy | 1.35 (gusty) |
| snow hamlet | snowfall 1, chimney smoke, a little mist | birds 0.5 | deer, arctic foxes and hares shy; a dog and a cat by the cabin | 0.6 |
| spring gardens | petals 1 | butterflies 1, songbirds, fireflies at dusk 0.75 | lambs graze, songbirds peck | 0.85 |
| pine forest | rain 1, mist 1, a few leaves | fireflies 1 (over water, at night), birds 0.6 | deer, foxes and squirrels shy; a cat on the bench | 0.3 (still) |
| others: examples of the thinking, take only what the brief implies | reef: bubbles rising, drifting specks; volcanic: ash falling, ember motes; city: paper litter and leaves, steam from vents; station: dust in the light, steam | fish schools as a `flock`, gulls, bats, drones | crabs (peck), boats and ducks (float), pigeons (peck), robots on rounds (pet) | from the place |

**Sizes and speeds** (H = hero height; from the shipped config at H = 0.6):

| Kind | Size | Motion | Pool in a box ~2x the frame |
|---|---|---|---|
| leaves | 0.22-0.33 H | fall 0.7-1.2 H/s, sway 0.55 H, tumble 1.5 rad/s, drift 0.9 H/s with the wind; rest on the page ~9 s while shrinking away | 40-60 |
| snow | 0.07-0.12 H (star flakes, or discs when tiny) | fall 0.8-1.4 H/s, sway 0.27 H, rest 2.6 s | 460 |
| petals | 0.14-0.22 H | fall 0.55-1 H/s, sway 0.65 H, rest 4.5 s | 110 |
| rain | thin slanted streaks 0.18-0.32 H long, ~1/20 as wide, in the mist colour (never fat white bars) | fall 11-13 H/s, wind 2.8 H/s | 700 |
| dust, pollen | 0.04-0.06 H | 0.2-0.5 H/s at 0.25-2.5 H up; shrink away within ~4 H of the lens (never a fat blur at the lens) | 60 |
| butterflies | ~0.22 H | roam ~1.8 H round flowers, 0.5-1.25 H up, flap 11 Hz | 18 |
| birds | wing ~0.33 H | a flock of 5 crosses every ~30 s, in ~15 s, just ABOVE the tallest common pieces (~2.5-3.5 H; higher they leave the focal band and blur into dark slashes) | 1-5 flocks |
| smoke | 0.15-0.45 H cream paper discs, each with a thin spiral cut printed on it (`cut: 'puff'`, the default; a bare spiral band reads as an @ sign) | rise ~0.45 H/s over ~4.5 s, drift with the wind, a slow turn; chimneys rest at night (puffs read as dark dots); a volcano, a factory or incense keeps going (`night: 1`) | 3-4 per chimney |
| fireflies | 0.2 H glowing dots, pulsing | roam ~0.9 H, gather over water; night only | 64 |
| mist | sheets 5-8 H wide, opacity ~0.1 | drift 0.25 H/s, low (~0.8 H) | 7-9 |
| cloud shadows | 13-22 H soft blots, opacity ~0.15 | slide 0.6 H/s with the wind; by day only | 4-5 |

**Creatures** move with a behaviour, never at random:
- **graze:** slow herd drift round home with long pauses; it stops and faces the hero as he passes (sheep, cows,
  camels, deer).
- **peck:** short quick moves and turns; it scatters a hop away when he comes within ~1.25 H (hens, chicks, pigeons).
- **shy:** sits still; within ~2.5 H it freezes for a beat, bounds 3-5 H away, then peeks back at him (rabbits,
  foxes, lizards, squirrels).
- **float:** slow arcs on water (ducks, swans, boats).
- **perch:** stays put, turns now and then (an owl on a stump, a cat on a fence).
- **pet:** wanders, sits and naps near home (cats, dogs). Nothing follows the hero unless the brief asks: the source
  game's owner turned following off.

Place them in small scenes (a cat on a fence, a dog by a cart, hens in a yard, camels by the palms, ducks on the
water and on the bank); about ten in frame, small animals ~1/3 of the hero and sheep ~1/2 (the shipped sizes). A
creature is a card that FLIPS to face the way it goes, with |scale| jumping across 0.3 so it is never edge-on. It
hops a little per step (~0.03 H) and rocks (~3 deg); it never slides.

**Day and night:** butterflies sleep, birds fall to ~1/3, fireflies come out, mist thickens (x1.25), and chimneys
rest. The same light change re-lights the life: nothing is repainted.

**Rules that keep it paper:** every bit of life is a matte cut card lit by the scene (leaf, star flake, petal, curl,
streak); only fireflies and embers glow. Keep it subtle (the owner of the source game kept asking for calmer). Never
fill the air: on most frames you should count only a few falling things in the sharp band. Nothing pops in: fallers
spawn above the frame and shrink away on the page, and puffs grow from nothing and shrink to nothing.

**Plumbing:** `assets/lib/paper-life.js` (three.js; every size and speed in H):

```js
import { createLife } from 'papercraft/lib/paper-life.js';
const life = createLife({ scene: H.scene, camera: H.camera, heroHeight: H.heroHeight, seed: 7, wind: [0.94, 0.34] });
life.fallers({ count: 460, cut: 'flake', colors: ['#ffffff', '#fbf6ee'], size: [0.07, 0.12], fall: [0.8, 1.4], sway: 0.27, land: 2.6 });
life.puffs({ at: [house.userData.chimneyTop], rise: 0.45, life: 4.5 });   // cut 'puff': a disc with a cut spiral
life.flock({ height: 3.4, colors: ['#f6f1e6'] });
life.critter(deer.group, { behaviour: 'shy', hero: H.hero.group.position, walk: H.walk });
life.setNight({ night: 1, dusk: 0.5 }[H.flags.MOOD] ?? 0);
H.onStep((t, dt) => life.update(dt, H.target));            // the weather box follows the view
H.onRestart(() => life.reset(H.target));                    // captures repeat: restart(); step(T)
```

Kinds: `fallers` (cuts `leaf`, `petal`, `flake`, `disc`, `confetti`, `streak` with `streak: true` for rain, or your
own outline), `motes` (`rise` for bubbles and embers, `glow` for embers), `flyers` (wings, or `glow` for fireflies;
`anchors` = where they gather), `flock`, `puffs` (`at`: points or `{ object, offset }`; an object puffs only while it
stands upright), `mist`, `cloudShadows`, `critter(node, { behaviour, home, roam, hero, walk, solid })` (`solid`: a
radius in H that makes a big creature, a yak or a person, a moving solid the hero walks round; a tester's hero walked
straight through monks and yaks). Each kind takes
`day` / `night` factors. Life draws with a plain matte material on purpose (too small for fibre; it takes the scene's
light). The 3D example scene's section 6 wires one world's set. In 2D, draw the same kinds as small
cut shapes in the air and on the page, with the same numbers.
