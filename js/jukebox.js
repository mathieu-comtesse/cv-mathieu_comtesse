import { TRACKS } from './music.js?v=c08daaf';

/* Juke-box : le lecteur intégré Spotify (iFrame API) joue un titre choisi ou tiré au hasard dans TRACKS, puis enchaîne tout seul au hasard, sans limite.
 * Sans connexion, Spotify ne donne que des extraits de 30 s ; connecté dans le navigateur, les titres entiers. Seule une pause demandée par le visiteur arrête l'enchaînement.
 * Détection de fin, trois filets : (1) pause avec position remise à zéro ou proche de la durée, (2) pause à ~30 s (fin d'extrait, quelle que soit la durée annoncée),
 * (3) chien de garde : plus aucun signe de lecture pendant 6 s alors que la lecture n'a pas été mise en pause. Si un titre chargé ne démarre pas, on relance play() (3 essais). */
export function createJukebox({ onTrack, onState } = {}) {
  let bag = [], last = -1, ctrl = null, loading = false, on = false, want = null, paused = false, userPause = false, started = false, tries = 0, lastPos = 0, lastPlayAt = 0, endAt = 0;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;width:min(320px,calc(100vw - 32px));z-index:30;display:none;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.25)';
  const slot = document.createElement('div'); box.append(slot); document.body.append(box);
  const emit = () => onState && onState({ on, paused });
  const nextRandom = () => {
    if (!bag.length) { bag = TRACKS.map((_, i) => i).sort(() => Math.random() - 0.5); if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop()); }
    return bag.pop();
  };
  const uri = (i) => `spotify:track:${TRACKS[i].id}`;
  const now = () => performance.now();
  function go(i) {
    last = i; bag = bag.filter((k) => k !== i); want = i; lastPos = 0; paused = false; userPause = false; started = false; tries = 0; endAt = lastPlayAt = now();
    onTrack && onTrack(i); emit();
    if (ctrl) { ctrl.loadUri(uri(i)); setTimeout(() => { if (on && want === i && ctrl) ctrl.play(); }, 350); }
  }
  const advance = () => go(nextRandom());
  function init() {
    if (ctrl || loading) return; loading = true;
    window.onSpotifyIframeApiReady = (A) => {
      A.createController(slot, { uri: uri(want ?? 0), width: '100%', height: 80 }, (c) => {
        ctrl = c; loading = false;
        c.addListener('ready', () => { if (on) c.play(); });
        c.addListener('playback_update', (e) => {
          const d = e.data; if (!on || !d) return;
          if (!d.isPaused) { if (d.position > 300) { started = true; lastPos = d.position; lastPlayAt = now(); } paused = false; userPause = false; emit(); return; }
          if (userPause) { if (!paused) { paused = true; emit(); } return; }
          const dur = d.duration || 0;
          const ended = started && now() - endAt > 2500 && (d.position < 1200 || (dur && d.position >= dur - 2500) || (lastPos >= 27000 && lastPos <= 32500) || lastPos > 2500 && lastPos >= dur - 2500);
          if (ended) { advance(); return; }
          if (!started && tries < 3 && now() - endAt > 1500) { tries++; ctrl.play(); return; }   // titre chargé mais pas démarré
          if (!paused && d.position > 1200) { paused = true; emit(); }
        });
      });
    };
    const sc = document.createElement('script'); sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true; document.body.append(sc);
  }
  // chien de garde : une lecture qui s'arrête sans pause demandée (fin d'extrait, événement manqué) enchaîne le titre suivant
  setInterval(() => { if (on && ctrl && started && !paused && !userPause && !document.hidden && now() - lastPlayAt > 6000 && now() - endAt > 3000) advance(); }, 1500);
  const api = {
    get playing() { return on ? want : -1; },
    get isOn() { return on; },
    random() { on = true; box.style.display = 'block'; go(nextRandom()); init(); },
    next() { this.random(); },
    play(i) { on = true; box.style.display = 'block'; go(i); init(); },
    toggle() { if (!on) { this.random(); return; } if (ctrl) { ctrl.togglePlay(); paused = !paused; userPause = paused; if (!paused) lastPlayAt = now(); emit(); } },
    stop() { on = false; box.style.display = 'none'; paused = false; if (ctrl) ctrl.pause(); emit(); },
  };
  return api;
}
