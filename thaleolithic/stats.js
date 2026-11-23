// THALEOLITHIC papier : le connecteur de statistiques (Supabase, comme le Village Talas). Une session par partie, un
// événement par étape : quête terminée, preuve vérifiée, erreur, mort (accident, type, victime), reprise de Dylan,
// duel gagné ou perdu, fin de campagne. Écriture seule (la clé « anon » ne peut rien lire) ; rien n'est envoyé si la
// configuration est vide, en capture (?capture) ou si le réseau échoue : le jeu n'attend jamais la base.
// Schéma : supabase/schema.sql ; lecture des agrégats : stats.html (fonction thaleo_stats()).

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16)));

export function createStats(campaign, { touch = false, off = false } = {}) {
  const SB = window.THALEO_SB || window.TALAS_SB;
  const on = !off && !!(SB && SB.url && SB.key);
  const post = (table, row) => on ? fetch(SB.url.replace(/\/+$/, '') + '/rest/v1/' + table, { method: 'POST', keepalive: true,
    headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(() => {}) : Promise.resolve();
  let ready = null;
  const session = () => {   // the session id lives with the save: a reload goes on with the same game
    const st = campaign.state;
    if (!st.statsId) { st.statsId = uuid(); ready = null; }
    if (!ready) { const id = st.statsId; ready = post('thaleo_sessions', { id, touch }).then(() => post('thaleo_events', { session_id: id, kind: 'start', game_seconds: Math.round(st.wallSeconds), data: {} })); }
    return st.statsId;
  };
  const send = (kind, o = {}) => { if (!on) return; const id = session(), st = campaign.state;
    ready.then(() => post('thaleo_events', { session_id: id, kind, chapter: o.chapter ?? campaign.frontier()?.id ?? null, accident: o.accident ?? null, accident_kind: o.accident_kind ?? null, victim: o.victim ?? null, ok: o.ok ?? null, game_seconds: Math.round(st.wallSeconds), data: o.data || {} })); };
  // what changed since the last look: compared on each campaign change
  const look = () => { const st = campaign.state; return { quests: campaign.data.quests.filter((q) => campaign.questDone(q)).map((q) => q.id), proofs: st.evidence.filter((e) => e.stage === 3).length,
    mistakes: Object.values(st.progress).reduce((n, p) => n + (p.mistakes || 0), 0), deaths: (st.deathLog || []).length, acc: st.accident, duel: st.menhir?.phase, ending: !!st.ending, id: st.statsId }; };
  let was = look();
  campaign.on(() => {
    const now = look(), st = campaign.state;
    if (now.id !== was.id && !now.id) { was = now; return; }   // a new game: a new session on its first event
    for (const q of now.quests) if (!was.quests.includes(q)) send('quest', { chapter: q });
    if (now.proofs > was.proofs) send('proof', { data: { proofs: now.proofs } });
    if (now.mistakes > was.mistakes) send('mistake', { data: { n: now.mistakes - was.mistakes } });
    for (const d of (st.deathLog || []).slice(was.deaths)) send('death', { chapter: d.quest, accident: d.id, accident_kind: d.kind, victim: d.victim });
    if (was.acc && !now.acc && was.acc.victim === 'dylan') send('retry', { accident: was.acc.id, victim: 'dylan' });
    if (now.duel !== was.duel && (now.duel === 'victory' || now.duel === 'defeat')) send('duel', { ok: now.duel === 'victory' });
    if (now.ending && !was.ending) send('end', { data: { dead: st.dead.length, dylan: st.dylanDeaths || 0, minutes: Math.round(st.wallSeconds / 60) } });
    was = now;
  });
  return { on };
}
