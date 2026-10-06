/* Windows/Lively adapter. Original simulation is kept in src/. */
(() => {
  const params = new URLSearchParams(location.search);
  const preview = params.get('preview') === '1';
  const artistic = document.documentElement.dataset.theme !== 'original';
  const config = { pause: false, fps: 1, clickfeed: artistic, grain: 55, motion: 55 };
  let ready = false, hostPaused = false;
  const rates = [20,30,60];
  function apply() {
    if (!ready) return;
    window.habitatPause(config.pause || hostPaused);
    window.habitatRate(rates[config.fps] || 30);
    window.habitatOptions.clickToFeed = config.clickfeed;
    window.habitatOptions.grain = artistic ? config.grain/1000 : 0;
    window.habitatOptions.motion = config.motion/100;
    window.habitatInvalidate();
    const button = document.getElementById('pause');
    if (button) button.textContent = config.pause ? 'Reprendre' : 'Pause';
  }
  window.livelyPropertyListener = (name,value) => {
    if (name === 'feed') { if (ready) window.habitatFeed(); return; }
    if (!(name in config)) return;
    if (name === 'pause' || name === 'clickfeed') config[name] = value === true || value === 'true';
    else if (Number.isFinite(Number(value))) config[name] = Number(value);
    apply();
  };
  // Lively can suspend the renderer itself; this also supports its playback callback.
  window.livelyWallpaperPlaybackChanged = data => {
    try {
      const state = typeof data === 'string' ? JSON.parse(data) : data;
      if (typeof state?.IsPaused === 'boolean') { hostPaused=state.IsPaused; apply(); }
    } catch { /* Ignore unknown host messages. */ }
  };
  window.addEventListener('habitat-ready', () => { ready=true; apply(); });
  if (preview) window.addEventListener('DOMContentLoaded', () => {
    const bar=document.createElement('nav');
    bar.setAttribute('aria-label','Commandes de prévisualisation');
    bar.innerHTML='<span>'+ (document.documentElement.dataset.theme==='reef' ? 'RÉCIF GOUACHE' : document.documentElement.dataset.theme==='cobalt' ? 'ABYSSES COBALT' : 'RIVERSCAPE') +'</span><button id="feed">Nourrir</button><button id="pause">Pause</button><a href="../../index.html">Les fonds</a>';
    bar.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:12px;align-items:center;padding:12px 18px;background:#071511dc;border:1px solid #ffffff25;border-radius:10px;color:#eee;font:13px system-ui;backdrop-filter:blur(16px);z-index:5;white-space:nowrap';
    document.body.append(bar);
    const style=document.createElement('style');
    style.textContent='nav span{font-size:10px;letter-spacing:.17em;margin-right:12px}nav button,nav a{color:#f3f3ec;background:#ffffff10;border:1px solid #ffffff22;border-radius:5px;padding:8px 12px;text-decoration:none;font:inherit;cursor:pointer}nav button:hover,nav a:hover{background:#ffffff25}';
    document.head.append(style);
    bar.querySelector('#feed').onclick=()=>window.habitatFeed?.();
    bar.querySelector('#pause').onclick=()=>{ config.pause=!config.pause; apply(); };
  });
})();
