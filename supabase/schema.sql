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
    difficulty text not null default 'normal',
    status text not null default 'waiting', -- waiting | playing | finished
    started_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.battle_rooms
    add column if not exists difficulty text not null default 'normal';

create table if not exists public.battle_live_scores (
    room_id text not null references public.battle_rooms(id) on delete cascade,
    player_name text not null,
    score integer not null default 0,
    combo integer not null default 0,
    accuracy numeric(5,2) not null default 100,
    updated_at timestamptz not null default now(),
    primary key (room_id, player_name)
);

-- Inscription atomique: verrouille la salle et interdit les arrivées apres Start.
create or replace function public.join_battle_room(
    p_room_id text,
    p_player_name text
)
returns table(error_message text)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_room public.battle_rooms%rowtype;
begin
    insert into public.battle_rooms (id)
    values (p_room_id)
    on conflict (id) do nothing;

    select * into v_room
    from public.battle_rooms
    where id = p_room_id
    for update;

    if v_room.status <> 'waiting' then
        return query select 'La partie est deja commencee.'::text;
        return;
    end if;

    if v_room.created_at < now() - interval '30 minutes' then
        return query select 'Cette salle a expire (duree de vie : 30 minutes).'::text;
        return;
    end if;

    insert into public.battle_live_scores (
        room_id, player_name, score, combo, accuracy
    ) values (
        p_room_id, p_player_name, 0, 0, 100
    ) on conflict (room_id, player_name) do nothing;

    if not found then
        return query select 'Ce pseudo est deja pris dans cette salle.'::text;
        return;
    end if;

    return query select null::text;
end;
$$;

alter table public.battle_rooms enable row level security;
alter table public.battle_live_scores enable row level security;

drop policy if exists "public read/write rooms" on public.battle_rooms;
create policy "public read/write rooms"
    on public.battle_rooms for all
    using (true)
    with check (true);

drop policy if exists "public read/write live scores" on public.battle_live_scores;
drop policy if exists "public read live scores" on public.battle_live_scores;
create policy "public read live scores"
    on public.battle_live_scores for select
    using (true)
;

drop policy if exists "public update live scores" on public.battle_live_scores;
create policy "public update live scores"
    on public.battle_live_scores for update
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
grant select, update on public.battle_live_scores to anon, authenticated;
grant execute on function public.join_battle_room(text, text) to anon, authenticated;
