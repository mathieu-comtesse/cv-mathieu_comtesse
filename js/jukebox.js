import { TRACKS } from './music.js?v=bf01a16';

// Keep the visitor's pause intent separate from Spotify's end/buffering state.
export function createJukebox({ onTrack, onState } = {}) {
  let bag = [], last = -1, ctrl = null, loading = false, ready = false, loadedUri = null;
  let on = false, want = null, userPause = false, started = false, providerPaused = true, buffering = false;
  let generation = 0, lastPos = 0, duration = 0, progressAt = 0, requestedAt = 0, tries = 0, recoveryAt = 0, pendingEnd = false;
  const now = () => performance.now();
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:320px;height:80px;opacity:0;pointer-events:none';
  box.setAttribute('aria-hidden', 'true');
  box.id = 'spotify-player';
  const eagerFrame = () => { const frame = box.querySelector('iframe'); if (frame) frame.loading = 'eager'; };
  new MutationObserver(eagerFrame).observe(box, { childList:true, subtree:true });
  const slot = document.createElement('div'); box.append(slot); document.body.append(box);
  const uri = i => 'spotify:track:' + TRACKS[i].id;
  const emit = () => {
    box.dataset.state = !on ? 'off' : userPause ? 'paused' : buffering ? 'buffering' : started && !providerPaused ? 'playing' : 'loading';
    onState?.({ on, paused:userPause, playing:on && !userPause && started && !providerPaused && !buffering });
  };
  const nextRandom = () => {
    if (!bag.length) {
      bag = TRACKS.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop());
    }
    return bag.pop();
  };
  const requestPlay = () => {
    if (!on || userPause || !ctrl || !ready) return;
    ctrl.play();
  };
  function load() {
    if (!ctrl || want === null) return;
    loadedUri = uri(want);
    (ctrl.loadEntity || ctrl.loadUri).call(ctrl, loadedUri);
    const token = generation;
    setTimeout(() => { if (token === generation) requestPlay(); }, 350);
  }
  function go(i) {
    generation++;
    last = want = i; bag = bag.filter(k => k !== i);
    lastPos = duration = tries = recoveryAt = 0; pendingEnd = false;
    userPause = started = buffering = false; providerPaused = true;
    requestedAt = progressAt = now();
    box.dataset.track = String(i); box.dataset.uri = uri(i);
    box.dataset.position = '0'; box.dataset.duration = '0';
    box.dataset.generation = String(generation);
    onTrack?.(i); emit(); load();
  }
  const advance = () => go(nextRandom());
  const belongsToCurrent = d => !d.playingURI || d.playingURI === uri(want);
  function init() {
    if (ctrl || loading) return;
    loading = true;
    window.onSpotifyIframeApiReady = A => {
      const initialUri = uri(want ?? 0);
      A.createController(slot, { uri:initialUri, width:'100%', height:80 }, c => {
        ctrl = c; loadedUri = initialUri; loading = false; eagerFrame();
        c.addListener('ready', () => {
          ready = true; box.dataset.ready = 'true';
          if (want !== null && loadedUri !== uri(want)) load();
          else { requestedAt = progressAt = now(); requestPlay(); }
        });
        c.addListener('playback_started', e => {
          if (!on || !e.data || !belongsToCurrent(e.data) || userPause) return;
          started = true; providerPaused = buffering = false; progressAt = now(); emit();
        });
        c.addListener('playback_update', e => {
          const d = e.data;
          if (!on || !d || !belongsToCurrent(d)) return;
          const pos = Math.max(0, Number(d.position) || 0);
          duration = Math.max(0, Number(d.duration) || duration);
          providerPaused = !!d.isPaused; buffering = !!d.isBuffering;
          box.dataset.position = String(pos); box.dataset.duration = String(duration);
          box.dataset.paused = String(providerPaused); box.dataset.buffering = String(buffering);
          // Late playing events must never undo an explicit visitor pause.
          if (userPause) { emit(); return; }
          // Spotify may report the exact final position while isPaused is still false.
          if (started && !buffering && duration > 0 && pos >= duration && now() - requestedAt > 2500) { advance(); return; }
          if (!providerPaused && !buffering) {
            if (pos > 300) started = true;
            if (pos > lastPos + 20) { progressAt = now(); recoveryAt = 0; }
            pendingEnd = false; lastPos = pos; emit(); return;
          }
          const atEnd = started && !buffering && now() - requestedAt > 2500 &&
            ((duration > 0 && pos >= duration - 750) ||
             (pos < 1200 && lastPos > 2500) ||
             (lastPos >= 27500 && lastPos <= 32500));
          if (providerPaused && atEnd) { advance(); return; }
          // Preview boundaries may differ from the full track duration. Allow a
          // transient pause to clear, then continue unless the visitor paused.
          if (providerPaused && started && !buffering && !pendingEnd) {
            pendingEnd = true; const token = generation;
            setTimeout(() => {
              if (token === generation && on && !userPause && pendingEnd && providerPaused && !buffering) advance();
            }, 1000);
          }
          emit();
        });
      });
    };
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true; document.body.append(script);
  }
  // Some players stop at the preview boundary without a final paused event.
  // Only actual position progress resets this watchdog; duplicate events do not.
  setInterval(() => {
    if (!on || userPause || !ctrl || !ready) return;
    const elapsed = now() - progressAt;
    if (!started) {
      if (now() - requestedAt > 18000) { advance(); return; }
      if (now() - requestedAt > [2000, 5000, 10000][tries]) { tries++; requestPlay(); }
      return;
    }
    const wait = buffering ? 30000 : 10000;
    if (elapsed <= wait) return;
    if (!buffering && ((duration > 0 && lastPos >= duration - 750) || (lastPos >= 27500 && lastPos <= 32500))) { advance(); return; }
    if (!recoveryAt) { recoveryAt = now(); requestPlay(); }
    else if (now() - recoveryAt > (buffering ? 30000 : 6000)) advance();
  }, 1000);
  return {
    get playing() { return on ? want : -1; },
    get isOn() { return on; },
    random() { on = true; advance(); init(); },
    next() { this.random(); },
    play(i) { if (!TRACKS[i]) return; on = true; go(i); init(); },
    toggle() {
      if (!on) { this.random(); return; }
      userPause = !userPause;
      if (userPause) ctrl?.pause();
      else { progressAt = now(); recoveryAt = 0; requestedAt = now(); requestPlay(); }
      emit();
    },
    stop() { on = false; userPause = false; generation++; ctrl?.pause(); emit(); },
  };
}
