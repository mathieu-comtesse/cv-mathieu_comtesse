const clamp = value => Math.max(0, Math.min(1, value));
const range = (value, start, end) => clamp((value - start) / (end - start));
const smooth = value => value * value * (3 - 2 * value);
const mix = (from, to, amount) => from + (to - from) * amount;

// Shopify build 5090151: menu, landing, shrink, and opacity are distinct curves.
export function flightPhases(open, cardTop, height) {
  const menu = smooth(range(open, .03, .76));
  return {
    menu,
    travel: smooth(range(menu, 0, .97)),
    shrink: smooth(range(cardTop, 1.4 * height, height)),
    frameAlpha: 1 - smooth(range(menu, .8, .97)),
  };
}

export function flightRectangle(source, marker, phase) {
  const size = {
    width: mix(source.width, marker.width, phase.shrink),
    height: mix(source.height, marker.height, phase.shrink),
  };
  const width = Math.max(1, mix(size.width, marker.width, phase.travel));
  const height = Math.max(1, mix(size.height, marker.height, phase.travel));
  return {
    left: mix(source.x, marker.left + marker.width / 2, phase.travel) - width / 2,
    top: mix(source.y, marker.top + marker.height / 2, phase.travel) - height / 2,
    width,
    height,
  };
}

export function createHeroFlight(chapter, canvas) {
  // Match the reference's first image-backed card with a real DOM marker.
  const entry = chapter?.cards.find(card => card.image &&
    document.getElementById(card.handle)?.querySelector('[data-card-marker]'));
  if (!entry) return;
  const card = document.getElementById(entry.handle);
  const marker = card.querySelector('[data-card-marker]');
  const desktop = matchMedia('(min-width: 940px)');
  const frame = document.createElement('span');
  frame.className = 'cv-hero-card-flight';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;top:0;left:0;z-index:7;pointer-events:none;overflow:hidden;outline:1px solid rgba(255,255,255,.9)';
  const artwork = new Image();
  artwork.alt = '';
  artwork.style.cssText = 'display:block;width:100%;height:100%;object-fit:fill';
  artwork.src = entry.image;
  frame.append(artwork);

  let departure, pending, hasTakenOff = false;
  const disconnect = () => {
    departure = undefined;
    hasTakenOff = false;
    frame.remove();
  };
  return {
    sample({ enabled, heroExit, node }) {
      pending = undefined;
      if (!enabled || !desktop.matches || !artwork.complete || !artwork.naturalWidth) {
        disconnect();
        return;
      }
      const viewportHeight = innerHeight;
      const bounds = marker.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        disconnect();
        return;
      }
      const cardTop = card.getBoundingClientRect().top;
      const landingScroll = scrollY + cardTop - viewportHeight;
      // The portfolio has a longer first section. Leave the hero before its
      // graph fades and land as the actual first project enters the viewport.
      const departureScroll = Math.max(0, Math.min(.45 * heroExit, landingScroll - .4 * viewportHeight));
      if (scrollY <= departureScroll) {
        hasTakenOff = false;
        frame.remove();
        return;
      }
      if (scrollY >= landingScroll || !node) {
        frame.remove();
        return;
      }
      const phase = flightPhases(range(scrollY, departureScroll, landingScroll), cardTop, viewportHeight);
      if (phase.frameAlpha <= 0) {
        frame.remove();
        return;
      }
      pending = { bounds, phase };
    },
    draw(endpoint) {
      if (endpoint && (!pending || !departure)) {
        const panel = canvas.getBoundingClientRect();
        departure = { x: endpoint.x + panel.left, y: endpoint.y + panel.top, width: endpoint.w, height: endpoint.h };
      }
      if (!departure || !pending) return;
      const { bounds, phase } = pending;
      const box = flightRectangle(departure, bounds, phase);
      const { style } = frame;
      style.width = `${box.width}px`;
      style.height = `${box.height}px`;
      style.translate = `${box.left}px ${box.top}px`;
      style.opacity = String(phase.frameAlpha * .62);
      style.outlineOffset = `${mix(1, -1, phase.shrink)}px`;
      style.outlineColor = `color-mix(in srgb, ${getComputedStyle(marker).borderTopColor} ${phase.shrink * 100}%, rgba(255,255,255,.9))`;
      artwork.style.opacity = String(1 - smooth(range(phase.shrink, .5, 1)));
      hasTakenOff = true;
      if (!frame.isConnected) document.body.append(frame);
    },
    get handle() { return entry.handle; },
    get hidesThumbnail() { return pending !== undefined || hasTakenOff; },
  };
}
