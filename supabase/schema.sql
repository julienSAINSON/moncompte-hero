-- ============================================================
-- MonCompteHero - Schema Supabase
-- A executer dans le SQL Editor du projet Supabase.
-- Idempotent : peut etre rejoue sans erreur (drop/create).
-- ============================================================

-- ------------------------------------------------------------
-- Classement solo (fin de chanson reussie)
-- ------------------------------------------------------------

create table if not exists public.scores (
    id bigint generated always as identity primary key,
    song_id text not null,
    player_name text not null,
    score integer not null,
    accuracy numeric(5,2) not null,
    best_combo integer not null,
    created_at timestamptz not null default now()
);

create index if not exists scores_song_id_score_idx
    on public.scores (song_id, score desc);

alter table public.scores enable row level security;

drop policy if exists "Anyone can read scores" on public.scores;
create policy "Anyone can read scores"
    on public.scores for select
    using (true);

drop policy if exists "Anyone can insert their own score" on public.scores;
create policy "Anyone can insert their own score"
    on public.scores for insert
    with check (true);

-- ------------------------------------------------------------
-- Battle Arena (salle multijoueur en ligne)
-- ------------------------------------------------------------

create table if not exists public.battle_rooms (
    id text primary key,
    song_id text,
    status text not null default 'waiting', -- waiting | playing | finished
    started_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.battle_live_scores (
    room_id text not null references public.battle_rooms(id) on delete cascade,
    player_name text not null,
    score integer not null default 0,
    combo integer not null default 0,
    accuracy numeric(5,2) not null default 100,
    updated_at timestamptz not null default now(),
    primary key (room_id, player_name)
);

alter table public.battle_rooms enable row level security;
alter table public.battle_live_scores enable row level security;

drop policy if exists "public read/write rooms" on public.battle_rooms;
create policy "public read/write rooms"
    on public.battle_rooms for all
    using (true)
    with check (true);

drop policy if exists "public read/write live scores" on public.battle_live_scores;
create policy "public read/write live scores"
    on public.battle_live_scores for all
    using (true)
    with check (true);

-- ------------------------------------------------------------
-- Privileges (RLS ne suffit pas : Supabase exige aussi les GRANT
-- explicites quand les tables sont creees hors de l'UI Table Editor)
-- ------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert on public.scores to anon, authenticated;
grant usage, select on sequence public.scores_id_seq to anon, authenticated;

grant select, insert, update, delete on public.battle_rooms to anon, authenticated;
grant select, insert, update, delete on public.battle_live_scores to anon, authenticated;
