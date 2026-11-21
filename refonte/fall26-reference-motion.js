// Motion terms measured in the Fall ’26 renderer. The fixed-step model
// runs against the reconstructed home geometry in the graph's own plane.
const STEP = 1 / 120;
const ORBIT_SPEED = .02;
const ORBIT_GAIN = .5;
const HOVER_SPEED = .2;
const REPULSE_INNER = 24;
const REPULSE_OUTER = 265;
const DAMPING = Math.exp(-2.5 * STEP);
const HOVER_IN = 1 - Math.exp(-15 * STEP);
const HOVER_OUT = 1 - Math.exp(-3 * STEP);
const LENGTH_RETURN = 1 - Math.exp(-12 * STEP);
const CALM_RESPONSE = 1 - Math.exp(-10 * STEP);
const POINTER_DECAY = Math.exp(-STEP / .04);
const ORIGIN = Object.freeze({x:0, y:0, vx:0, vy:0, grip:0, length:0, baseLength:0});

export function pointerRepulsion(dx, dy, vx, vy, unit, pace, section = false) {
  const speed = Math.hypot(vx, vy);
  const distance = Math.hypot(dx, dy);
  const inner = REPULSE_INNER * unit;
  const outer = REPULSE_OUTER * unit;
  if (speed <= 24 * unit || distance <= inner || distance >= outer) return null;
  const magnitude = Math.min(speed, 1800 * unit);
  const px = dx / distance, py = dy / distance;
  const sx = vx / speed, sy = vy / speed;
  const shield = 1 - Math.max(0, px * sx + py * sy);
  const proximity = (outer - distance) / (outer - inner);
  const strength = 2 * proximity ** 2 * shield * pace * (section ? .6 : 1) * magnitude;
  return [strength * (px + 1.45 * sx), strength * (py + 1.45 * sy)];
}

function clampSpeed(body, maximum) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed <= maximum) return;
  body.vx *= maximum / speed;
  body.vy *= maximum / speed;
}

function screenOrder(angle) {
  const turns = (angle + Math.PI / 2) / (2 * Math.PI);
  return (turns - Math.floor(turns)) * .15;
}

export class ReferenceMotion {
  #remainder = 0;
  #orbit = 0;
  #calm = 0;
  #pointer = null;
  #pointerAge = 0;
  #vx = 0;
  #vy = 0;
  #hover = null;
  #hoverAge = 0;
  #active = false;

  get phase() { return this.#orbit; }

  step(hubs, {dt, pointer, viewport, leafHover = false, grabbed = false, enabled = true}) {
    if (!enabled) {
      if (this.#active) this.#reset(hubs);
      return;
    }
    this.#active = true;
    const elapsed = Math.max(0, Math.min(.05, dt));
    const unit = Math.max(.4, Math.min(3, Math.min(...viewport) / 741));
    this.#setPointer(pointer, elapsed);

    const hover = grabbed || leafHover ? null : this.#hitHub(hubs, pointer, unit);
    if (hover !== this.#hover) {
      this.#hover = hover;
      this.#hoverAge = 0;
      if (hover) for (const leaf of hover.noeuds) {
        const state = leaf.referenceMotion;
        leaf.referenceHoverDelay = screenOrder(state ? Math.atan2(state.y,state.x) : leaf.a);
      }
    }

    this.#remainder += elapsed;
    while (this.#remainder + 1e-9 >= STEP) {
      this.#remainder -= STEP;
      this.#hoverAge += STEP;
      this.#calm += ((leafHover ? 1 : 0) - this.#calm) * CALM_RESPONSE;
      const pace = 1 - (1 - HOVER_SPEED) * this.#calm;
      this.#orbit += ORBIT_SPEED * pace * STEP;
      this.#integrate(hubs, unit, pace, grabbed);
      this.#vx *= POINTER_DECAY;
      this.#vy *= POINTER_DECAY;
    }
  }

  #setPointer(point, elapsed) {
    if (!point) {
      this.#pointer = null;
      this.#pointerAge = this.#vx = this.#vy = 0;
      return;
    }
    this.#pointerAge += elapsed;
    const [x, y] = point;
    const previous = this.#pointer;
    if (previous && x === previous[0] && y === previous[1]) return;
    if (previous) {
      const duration = Math.max(STEP, this.#pointerAge);
      this.#vx = (x - previous[0]) / duration;
      this.#vy = (y - previous[1]) / duration;
    }
    this.#pointer = [x, y];
    this.#pointerAge = 0;
  }

  #hitHub(hubs, pointer, unit) {
    if (!pointer) return null;
    let closest = null;
    let distance = 15 * unit;
    for (const hub of hubs) {
      if (!hub.centre) continue;
      const x = hub.centre[0] + (hub.referenceMotion?.x ?? 0) - pointer[0];
      const y = hub.centre[1] + (hub.referenceMotion?.y ?? 0) - pointer[1];
      const hit = Math.hypot(x, y);
      if (hit < distance) { closest = hub; distance = hit; }
    }
    return closest;
  }

  #reset(hubs) {
    for (const hub of hubs) {
      hub.referenceMotion = null;
      for (const leaf of hub.noeuds) leaf.referenceMotion = null;
    }
    this.#remainder = this.#orbit = this.#calm = 0;
    this.#hover = this.#pointer = null;
    this.#hoverAge = this.#pointerAge = this.#vx = this.#vy = 0;
    this.#active = false;
  }

  #integrate(hubs, unit, pace, grabbed) {
    const cosine = Math.cos(this.#orbit), sine = Math.sin(this.#orbit);
    const pointer = grabbed || Math.hypot(this.#vx,this.#vy) <= 24 * unit ? null : this.#pointer;
    for (const hub of hubs) {
      if (!hub.centre) continue;
      const hubState = hub.referenceMotion ??= {...ORIGIN};
      const baseX = hub.centre[0], baseY = hub.centre[1];
      const hubForce = this.#hover ? null : this.#force(baseX+hubState.x,baseY+hubState.y,unit,pace,true,pointer);
      // Keep the calibrated trunk's root fixed while allowing its visible end
      // to respond to a sweep. The source additionally repels other hubs.
      hubState.vx = (hubState.vx + ((hubForce?.[0] ?? 0) - 12 * hubState.x) * STEP) * DAMPING;
      hubState.vy = (hubState.vy + ((hubForce?.[1] ?? 0) - 12 * hubState.y) * STEP) * DAMPING;
      clampSpeed(hubState, 1400 * unit);
      hubState.x += hubState.vx * STEP;
      hubState.y += hubState.vy * STEP;
      const x = baseX + hubState.x, y = baseY + hubState.y;
      const direction = hub.referenceOrbitOrder % 2 ? -1 : 1;
      const angular = ORBIT_SPEED * pace * direction;
      const sin = sine * direction;
      for (const leaf of hub.noeuds) {
        const length = hub.rayon * leaf.r;
        const baseLeafX = leaf.referenceCos * length, baseLeafY = leaf.referenceSin * length;
        const state = leaf.referenceMotion ??= {...ORIGIN, x:baseLeafX, y:baseLeafY, length, baseLength:length};
        if (state.baseLength !== length && state.baseLength > 0) {
          const ratio = length / state.baseLength;
          state.x *= ratio;
          state.y *= ratio;
          state.length *= ratio;
          state.baseLength = length;
        }
        const hover = hub === this.#hover && this.#hoverAge >= leaf.referenceHoverDelay;
        state.grip += ((hover ? 1 : 0) - state.grip) * (hover ? HOVER_IN : HOVER_OUT);
        const scale = 1 - .25 * state.grip;
        const homeX = (baseLeafX * cosine - baseLeafY * sin) * scale;
        const homeY = (baseLeafX * sin + baseLeafY * cosine) * scale;
        const force = this.#hover || grabbed === leaf ? null : this.#force(x+state.x,y+state.y,unit,pace,false,pointer);
        const ax = homeX - state.x + ORBIT_GAIN * (-angular * state.y - state.vx) + (force?.[0] ?? 0);
        const ay = homeY - state.y + ORBIT_GAIN * ( angular * state.x - state.vy) + (force?.[1] ?? 0);
        state.vx = (state.vx + ax * STEP) * DAMPING;
        state.vy = (state.vy + ay * STEP) * DAMPING;
        clampSpeed(state, 1400 * unit);
        state.x += state.vx * STEP;
        state.y += state.vy * STEP;
        state.length += (length * scale - state.length) * (state.grip > .001 ? HOVER_IN : LENGTH_RETURN);
        const distance = Math.hypot(state.x,state.y);
        const ux = distance > .001 ? state.x / distance : leaf.referenceCos;
        const uy = distance > .001 ? state.y / distance : leaf.referenceSin;
        const radial = state.vx*ux + state.vy*uy;
        state.x = ux * state.length;
        state.y = uy * state.length;
        state.vx -= radial * ux;
        state.vy -= radial * uy;
      }
    }
  }

  #force(x, y, unit, pace, section, pointer) {
    return pointer && pointerRepulsion(x-pointer[0], y-pointer[1], this.#vx, this.#vy, unit, pace, section);
  }
}
