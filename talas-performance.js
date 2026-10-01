/* Cadence mobile et résolution adaptative. Les simulations restent pilotées par dt. */
(function () {
  'use strict';
  function frameGate(mobile, fps = 30) {
    const interval = 1000 / fps;
    let next = null;
    return {
      accept(now, hidden = false) {
        if (hidden) { next = null; return false; }
        if (!mobile) return true;
        if (next === null) next = now;
        if (now + .5 < next) return false;
        next += interval;
        // Repartir proprement après une interruption, sans rafale de rattrapage.
        if (next <= now) next = now + interval;
        return true;
      }
    };
  }
  function resolution() {
    let ratio = .8, last = null, start = null, total = 0, count = 0, healthy = 0, warmUntil = 0;
    function reset(now = 0) { last = start = null; total = count = healthy = 0; warmUntil = now + 2000; }
    return {
      get ratio() { return ratio; }, reset,
      sample(now) {
        if (last === null) { last = now; return null; }
        const elapsed = now - last; last = now;
        if (elapsed <= 0 || elapsed > 200) { reset(now); return null; }
        if (now < warmUntil) return null;
        if (start === null) start = now;
        total += elapsed; count++;
        if (now - start < 3000) return null;
        const average = total / count;
        start = now; total = count = 0;
        let next = ratio;
        if (average > 42) { next = Math.max(.6, ratio - .1); healthy = 0; }
        else if (average < 36) { healthy++; if (healthy >= 3) { next = Math.min(.8, ratio + .1); healthy = 0; } }
        else healthy = 0;
        next = Math.round(next * 10) / 10;
        if (next === ratio) return null;
        ratio = next; return ratio;
      }
    };
  }
  window.TalasPerformance = { frameGate, resolution };
})();
