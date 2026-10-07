import { TRACKS } from './music.js?v=068a541';

/* Juke-box : le lecteur intégré Spotify (iFrame API) joue un titre choisi ou tiré au hasard dans TRACKS, puis enchaîne tout seul au hasard.
 * Sans connexion, Spotify donne des extraits de 30 s ; connecté dans le navigateur, les titres entiers. */
const MAX_AUTO = 3;   // après 3 titres enchaînés seuls, la musique s'arrête si personne ne la relance

export function createJukebox({ onTrack, onState } = {}) {
  let auto = 0, bag = [], last = -1, ctrl = null, loading = false, on = false, want = null, paused = false, lastPos = 0, endAt = 0;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;width:min(320px,calc(100vw - 32px));z-index:30;display:none;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.25)';
  const slot = document.createElement('div'); box.append(slot); document.body.append(box);
  const emit = () => onState && onState({ on, paused });
  const nextRandom = () => {
    if (!bag.length) { bag = TRACKS.map((_, i) => i).sort(() => Math.random() - 0.5); if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop()); }
    return bag.pop();
  };
  const uri = (i) => `spotify:track:${TRACKS[i].id}`;
  function go(i) {
    last = i; bag = bag.filter((k) => k !== i); want = i; lastPos = 0; paused = false; endAt = performance.now();
    onTrack && onTrack(i); emit();
    if (ctrl) { ctrl.loadUri(uri(i)); ctrl.play(); }
  }
  function init() {
    if (ctrl || loading) return; loading = true;
    window.onSpotifyIframeApiReady = (A) => {
      A.createController(slot, { uri: uri(want ?? 0), width: '100%', height: 80 }, (c) => {
        ctrl = c; loading = false;
        c.addListener('ready', () => { if (on) c.play(); });
        c.addListener('playback_update', (e) => {
          const d = e.data; if (!on || !d) return;
          // fin de morceau : le lecteur se remet à 0 en pause (ou s'arrête tout près de la durée) -> on enchaîne un autre titre au hasard
          if (!d.isPaused) { lastPos = d.position; paused = false; emit(); return; }
          const ended = lastPos > 4000 && (d.position < 1200 || (d.duration && d.position >= d.duration - 1500));
          if (ended && performance.now() - endAt > 3000) { if (++auto >= MAX_AUTO) { api.stop(); return; } go(nextRandom()); return; }
          if (!paused && d.position > 1200) { paused = true; emit(); }
        });
      });
    };
    const sc = document.createElement('script'); sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true; document.body.append(sc);
  }
  const api = {
    get playing() { return on ? want : -1; },
    get isOn() { return on; },
    random() { auto = 0; on = true; box.style.display = 'block'; go(nextRandom()); init(); },
    next() { this.random(); },
    play(i) { auto = 0; on = true; box.style.display = 'block'; go(i); init(); },
    toggle() { auto = 0; if (!on) { this.random(); return; } if (ctrl) { ctrl.togglePlay(); paused = !paused; emit(); } },
    stop() { on = false; box.style.display = 'none'; paused = false; if (ctrl) ctrl.pause(); emit(); },
  };
  return api;
}
