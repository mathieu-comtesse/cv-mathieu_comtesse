-- THALEOLITHIC papier : statistiques des parties (Supabase, le projet du Village Talas).
-- Une session par partie, un événement par étape (quête, preuve, erreur, mort, reprise, duel, fin).
-- Sécurité : les joueurs (clé « anon ») peuvent seulement AJOUTER des lignes, jamais les lire ;
-- la page de statistiques lit uniquement des agrégats anonymes, par la fonction thaleo_stats().
-- À exécuter une fois dans l'éditeur SQL du projet (ou en migration).

create table if not exists public.thaleo_sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  touch boolean not null default false,
  version text not null default 'papier-1'
);

create table if not exists public.thaleo_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.thaleo_sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('start', 'quest', 'proof', 'mistake', 'death', 'retry', 'duel', 'end')),
  chapter text,            -- the quest at the frontier (V17_RISKS, M_V_ABRI...)
  accident text,           -- D01 à D08, NPC_*
  accident_kind text,      -- tree, rock, mammoth, hut, fire, stock, river, workshop
  victim text,             -- dylan or the villager's id
  ok boolean,
  game_seconds integer,    -- time played when it happened
  data jsonb not null default '{}'::jsonb
);
create index if not exists thaleo_events_kind on public.thaleo_events (kind);
create index if not exists thaleo_events_session on public.thaleo_events (session_id);

alter table public.thaleo_sessions enable row level security;
alter table public.thaleo_events enable row level security;
drop policy if exists thaleo_sessions_insert on public.thaleo_sessions;
drop policy if exists thaleo_events_insert on public.thaleo_events;
create policy thaleo_sessions_insert on public.thaleo_sessions for insert to anon with check (true);
create policy thaleo_events_insert on public.thaleo_events for insert to anon with check (char_length(coalesce(data::text, '')) < 4000);
revoke select, update, delete on public.thaleo_sessions, public.thaleo_events from anon;
grant insert on public.thaleo_sessions, public.thaleo_events to anon;

-- the aggregates the stats page reads: counts only, nothing that identifies a player
create or replace function public.thaleo_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'sessions', (select count(*) from thaleo_sessions),
    'sessions_touch', (select count(*) from thaleo_sessions where touch),
    'endings', (select count(distinct session_id) from thaleo_events where kind = 'end'),
    'deaths', (select count(*) from thaleo_events where kind = 'death'),
    'dylan_deaths', (select count(*) from thaleo_events where kind = 'death' and victim = 'dylan'),
    'retries', (select count(*) from thaleo_events where kind = 'retry'),
    'mistakes', (select count(*) from thaleo_events where kind = 'mistake'),
    'by_accident', coalesce((select jsonb_agg(jsonb_build_object('accident', accident, 'kind', accident_kind, 'victim', victim, 'n', n) order by n desc)
      from (select accident, accident_kind, victim, count(*) n from thaleo_events where kind = 'death' group by 1, 2, 3) a), '[]'::jsonb),
    'by_kind', coalesce((select jsonb_agg(jsonb_build_object('kind', accident_kind, 'n', n) order by n desc)
      from (select accident_kind, count(*) n from thaleo_events where kind = 'death' group by 1) k), '[]'::jsonb),
    'by_victim', coalesce((select jsonb_agg(jsonb_build_object('victim', victim, 'n', n) order by n desc)
      from (select victim, count(*) n from thaleo_events where kind = 'death' group by 1) v), '[]'::jsonb),
    'quests', coalesce((select jsonb_agg(jsonb_build_object('chapter', chapter, 'sessions', n, 'minutes', m) order by m nulls last)
      from (select chapter, count(distinct session_id) n, round(avg(game_seconds) / 60.0, 1) m from thaleo_events where kind = 'quest' group by 1) q), '[]'::jsonb),
    'mistakes_by_chapter', coalesce((select jsonb_agg(jsonb_build_object('chapter', chapter, 'n', n) order by n desc)
      from (select chapter, count(*) n from thaleo_events where kind = 'mistake' group by 1) e), '[]'::jsonb),
    'duel', jsonb_build_object('won', (select count(*) from thaleo_events where kind = 'duel' and ok), 'lost', (select count(*) from thaleo_events where kind = 'duel' and not ok)),
    'updated', now()
  );
$$;
revoke all on function public.thaleo_stats() from public;
grant execute on function public.thaleo_stats() to anon;
revoke execute on function public.thaleo_stats() from authenticated;
