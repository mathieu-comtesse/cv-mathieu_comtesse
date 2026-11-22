// THALEOLITHIC papier : la parole. Une réplique s'écrit lettre après lettre, chaque lettre découpée qui se pose sur la
// pierre ; à chaque syllabe qui apparaît, la personne qui parle grogne ou marmonne cette syllabe, avec sa voix (hauteur,
// taille, rugosité, chevrotement), sa voyelle, et la mélodie de la phrase (qui tombe, ou monte à la question).
// Lettres et grognements partent de la même horloge (le pas du jeu) : le son d'une syllabe est lancé à l'image même où
// sa première lettre se pose, pour la durée exacte de ses lettres. Un clic ou une touche termine la réplique.

const VOICES = {   // f0 (Hz), size (formant scale: <1 a big body, >1 a small one), rough (growl), trem (the old's waver), pace (s per letter)
  aurelien: { f0: 96, size: 0.86, rough: 0.55, pace: 0.05 },        // the chief: deep, chesty, sure of himself
  mathieu: { f0: 118, size: 0.95, rough: 0.1, pace: 0.046 },       // the prevention man: calm, even
  lorette: { f0: 205, size: 1.12, rough: 0, pace: 0.043 },          // the needs: clear, quick
  alban: { f0: 108, size: 0.92, rough: 0.2, trem: 0.06, pace: 0.06 },   // the elder: slow, wavering
  milena: { f0: 220, size: 1.15, rough: 0, pace: 0.042 },
  nork: { f0: 135, size: 1.0, rough: 0.15, pace: 0.048 },           // Ouways: nasal, dreamy
  georges: { f0: 92, size: 0.84, rough: 0.7, pace: 0.052 },        // the quarryman: a growl
  eliott: { f0: 128, size: 0.96, rough: 0.3, pace: 0.044 },
  mathilde: { f0: 195, size: 1.1, rough: 0.05, pace: 0.044 },
  neila: { f0: 185, size: 1.08, rough: 0.1, pace: 0.045 },
  orok: { f0: 88, size: 0.82, rough: 0.8, pace: 0.055 },
  brok: { f0: 100, size: 0.86, rough: 0.6, pace: 0.05 }, tarek: { f0: 112, size: 0.9, rough: 0.4, pace: 0.048 },
  uma: { f0: 200, size: 1.1, rough: 0.15, pace: 0.045 }, kora: { f0: 190, size: 1.08, rough: 0.2, pace: 0.045 }, sila: { f0: 215, size: 1.12, rough: 0, pace: 0.043 },
  varg: { f0: 98, size: 0.85, rough: 0.65, pace: 0.05 }, grumb: { f0: 82, size: 0.8, rough: 0.9, trem: 0.04, pace: 0.06 },
  petit_os: { f0: 290, size: 1.3, rough: 0, pace: 0.038 },          // the mascot: squeaky
  dylan: { f0: 140, size: 0.98, rough: 0.15, pace: 0.045 },
  narrator: { f0: 104, size: 0.9, rough: 0.05, pace: 0.047, v: 0.13 },   // the storyteller hums low under his breath
  alert: { f0: 160, size: 1.0, rough: 0.4, pace: 0.04 },
};
const VOWEL = { a: 'a', à: 'a', â: 'a', e: 'e', é: 'e', è: 'e', ê: 'e', ë: 'e', i: 'i', î: 'i', ï: 'i', o: 'o', ô: 'o', u: 'u', ù: 'u', û: 'u', y: 'y', œ: 'e' };
const isV = (c) => !!VOWEL[c.toLowerCase()];
const isL = (c) => /[a-zà-ÿœ]/i.test(c);
const PAUSE = { ',': 0.16, ';': 0.2, ':': 0.2, '.': 0.32, '!': 0.32, '?': 0.32, '…': 0.4, '\n': 0.3 };

// who is speaking: a name as the data gives it ("Aurélien", "Le narrateur", "Alerte", "5.1 ...") -> a voice
export function voiceOf(name, characters = []) {
  const n = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!n || n.includes('narrateur') || /^\d/.test(n)) return { id: null, ...VOICES.narrator };
  if (n.includes('alerte')) return { id: null, ...VOICES.alert };
  const c = characters.find((x) => n.includes(String(x.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
  const id = c ? c.id : Object.keys(VOICES).find((k) => n.includes(k)) || null;
  if (id && VOICES[id]) return { id, ...VOICES[id] };
  let h = 0; for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % 997;   // anyone else: a voice from the name
  return { id, f0: 100 + (h % 120), size: 0.85 + (h % 30) / 100, rough: (h % 5) / 10, pace: 0.046 };
}

export function createTalk({ sfx, onSyllable = null }) {
  const runs = new Set();
  // lay the text out as words of letters (each a span that pops in), and its timeline: when each letter lands, the
  // syllables (a run of consonants and its vowels, cut before the next consonant that leads a vowel)
  function say(el, text, { voice, fit = null } = {}) {
    stop(el);
    text = String(text ?? '');
    el.textContent = ''; el.classList.add('talking');
    const letters = [], frag = document.createDocumentFragment();
    let word = null;
    for (const ch of text) {
      if (ch === ' ' || ch === '\n') { word = null; frag.append(ch === '\n' ? document.createElement('br') : ' '); letters.push({ ch, el: null }); continue; }
      if (!word) { word = document.createElement('span'); word.className = 'w'; frag.append(word); }
      const s = document.createElement('span'); s.className = 'l'; s.textContent = ch; s.style.setProperty('--r', ((letters.length * 37) % 13 - 6) + 'deg'); word.append(s); letters.push({ ch, el: s });
    }
    el.append(frag);
    // timing: a pace per letter, pauses after punctuation; squeezed if it must fit a shot
    const v = voice || VOICES.narrator; let pace = v.pace || 0.046;
    const count = letters.filter((l) => l.el).length, pauses = letters.reduce((m, l) => m + (PAUSE[l.ch] || 0), 0);
    if (fit && count) pace = Math.min(pace, Math.max(0.018, (fit - pauses * 0.6) / count));
    const k = fit && count * pace + pauses > fit ? 0.6 : 1;
    let t = 0; for (const l of letters) { l.at = t; t += l.el ? pace : 0.02; t += (PAUSE[l.ch] || 0) * k; }
    // syllables: start index, letter count, vowel, closed (ends on m/n), the sentence's end (a question rises)
    const syl = []; let i = 0;
    while (i < letters.length) {
      while (i < letters.length && !isL(letters[i].ch)) i++;
      if (i >= letters.length) break;
      const s0 = i; let vw = null; while (i < letters.length && isL(letters[i].ch) && !isV(letters[i].ch)) i++;
      while (i < letters.length && isL(letters[i].ch) && isV(letters[i].ch)) { vw ??= VOWEL[letters[i].ch.toLowerCase()]; i++; }
      while (i < letters.length && isL(letters[i].ch) && !isV(letters[i].ch) && !(i + 1 < letters.length && isV(letters[i + 1].ch))) i++;
      const n = i - s0, last = letters[i - 1].ch.toLowerCase();
      let j = i; while (j < letters.length && !/[.!?…]/.test(letters[j].ch)) j++;
      syl.push({ at: letters[s0].at, dur: Math.max(0.07, letters[i - 1].at + pace - letters[s0].at), vowel: vw || 'e', closed: last === 'm' || last === 'n', q: letters[j]?.ch === '?', endish: j - i < 4 });
    }
    const run = { el, letters, syl, t: 0, li: 0, si: 0, v, end: t, done: false, cb: null };
    runs.add(run); return run;
  }
  function step(dt) {
    for (const r of runs) {
      r.t += dt;
      while (r.li < r.letters.length && r.letters[r.li].at <= r.t) { r.letters[r.li].el?.classList.add('on'); r.li++; }
      while (r.si < r.syl.length && r.syl[r.si].at <= r.t) {
        const s = r.syl[r.si++], v = r.v, k = r.si;
        // the melody: a little rise and fall along the phrase, a drop at its end, a lift for a question
        const lilt = 1 + 0.08 * Math.sin(k * 1.9) + (s.q && s.endish ? 0.18 : 0) - (s.endish && !s.q ? 0.06 : 0);
        sfx?.play('grunt', { f0: v.f0 * lilt * (0.97 + Math.random() * 0.06), dur: s.dur, vowel: s.vowel, closed: s.closed, rough: v.rough || 0, trem: v.trem || 0, size: v.size || 1, bend: s.q && s.endish ? 0.25 : s.endish ? -0.22 : -0.08, v: v.v ?? 0.17, breath: 0.15 });
        onSyllable?.(v.id, s.dur);
      }
      if (r.li >= r.letters.length && r.si >= r.syl.length) finish(r);
    }
  }
  function finish(r) { for (const l of r.letters) l.el?.classList.add('on'); r.li = r.letters.length; r.si = r.syl.length; r.done = true; r.el.classList.remove('talking'); runs.delete(r); r.cb?.(); }
  function stop(el) { for (const r of runs) if (r.el === el) { runs.delete(r); r.el.classList.remove('talking'); } }
  const skip = () => { const had = runs.size > 0; for (const r of [...runs]) finish(r); return had; };
  return { say, step, skip, stop, get busy() { return runs.size > 0; } };
}
