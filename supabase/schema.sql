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
    user_id uuid not null references auth.users(id),
    song_id text not null,
    player_name text not null,
    score integer not null,
    accuracy numeric(5,2) not null,
    best_combo integer not null,
    created_at timestamptz not null default now()
);

alter table public.scores
    add column if not exists user_id uuid references auth.users(id);

create index if not exists scores_song_id_score_idx
    on public.scores (song_id, score desc);

alter table public.scores enable row level security;

drop policy if exists "Anyone can read scores" on public.scores;
create policy "Anyone can read scores"
    on public.scores for select
    using (true);

drop policy if exists "Anyone can insert their own score" on public.scores;

-- ------------------------------------------------------------
-- Battle Arena (salle multijoueur en ligne)
-- ------------------------------------------------------------

create table if not exists public.battle_rooms (
    id text primary key,
    host_user_id uuid references auth.users(id),
    song_id text,
    difficulty text not null default 'normal',
    status text not null default 'waiting', -- waiting | playing | finished
    started_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.battle_rooms
    add column if not exists difficulty text not null default 'normal';

alter table public.battle_rooms
    add column if not exists host_user_id uuid references auth.users(id);

create table if not exists public.battle_live_scores (
    room_id text not null references public.battle_rooms(id) on delete cascade,
    user_id uuid not null references auth.users(id),
    player_name text not null,
    score integer not null default 0,
    combo integer not null default 0,
    accuracy numeric(5,2) not null default 100,
    updated_at timestamptz not null default now(),
    primary key (room_id, player_name)
);

alter table public.battle_live_scores
    add column if not exists user_id uuid references auth.users(id);

create unique index if not exists battle_live_scores_room_user_idx
    on public.battle_live_scores (room_id, user_id);

create or replace function public.create_battle_room(p_room_id text)
returns table(error_message text)
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        return query select 'Authentification requise.'::text;
        return;
    end if;

    if p_room_id !~ '^[A-Z2-9]{5}$' then
        return query select 'Code de salle invalide.'::text;
        return;
    end if;

    insert into public.battle_rooms (id, host_user_id)
    values (p_room_id, auth.uid());

    return query select null::text;
exception
    when unique_violation then
        return query select 'Ce code de salle existe deja.'::text;
end;
$$;

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
    if auth.uid() is null then
        return query select 'Authentification requise.'::text;
        return;
    end if;

    select * into v_room
    from public.battle_rooms
    where id = p_room_id
    for update;

    if not found then
        return query select 'Cette salle n''existe pas.'::text;
        return;
    end if;

    if v_room.status <> 'waiting' then
        return query select 'La partie est deja commencee.'::text;
        return;
    end if;

    if v_room.created_at < now() - interval '30 minutes' then
        return query select 'Cette salle a expire (duree de vie : 30 minutes).'::text;
        return;
    end if;

    insert into public.battle_live_scores (
        room_id, user_id, player_name, score, combo, accuracy
    ) values (
        p_room_id, auth.uid(), p_player_name, 0, 0, 100
    ) on conflict (room_id, player_name) do nothing;

    if not found then
        return query select 'Ce pseudo est deja pris dans cette salle.'::text;
        return;
    end if;

    return query select null::text;
end;
$$;

create or replace function public.start_battle_room(
    p_room_id text,
    p_song_id text,
    p_difficulty text
)
returns table(error_message text)
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        return query select 'Authentification requise.'::text;
        return;
    end if;

    update public.battle_rooms
    set status = 'playing',
        song_id = p_song_id,
        difficulty = p_difficulty,
        started_at = now()
    where id = p_room_id
        and host_user_id = auth.uid()
        and status = 'waiting';

    if not found then
        return query select 'Seul le createur peut lancer cette salle.'::text;
        return;
    end if;

    return query select null::text;
end;
$$;

create or replace function public.update_battle_score(
    p_room_id text,
    p_score integer,
    p_combo integer,
    p_accuracy numeric
)
returns table(error_message text)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_live_score public.battle_live_scores%rowtype;
    v_room public.battle_rooms%rowtype;
    v_elapsed_seconds numeric;
    v_max_score_delta integer;
    v_max_combo_delta integer;
    v_max_score_per_second constant integer := 3000;
    v_score_margin constant integer := 600;
    v_max_combo_per_second constant integer := 10;
    v_combo_margin constant integer := 3;
begin
    if auth.uid() is null then
        return query select 'Authentification requise.'::text;
        return;
    end if;

    if p_score < 0 or p_score > 1000000
        or p_combo < 0 or p_combo > 100000
        or p_accuracy < 0 or p_accuracy > 100 then
        return query select 'Score invalide.'::text;
        return;
    end if;

    select * into v_live_score
    from public.battle_live_scores
    where room_id = p_room_id
        and user_id = auth.uid()
    for update;

    select * into v_room
    from public.battle_rooms
    where id = p_room_id;

    if not found or v_room.status <> 'playing' then
        return query select 'Inscription Arena invalide ou partie non lancee.'::text;
        return;
    end if;

    if v_live_score.room_id is null then
        return query select 'Inscription Arena invalide ou partie non lancee.'::text;
        return;
    end if;

    v_elapsed_seconds := greatest(
        0,
        extract(epoch from now() - greatest(v_live_score.updated_at, v_room.started_at))
    );
    v_max_score_delta := floor(
        v_score_margin + v_max_score_per_second * v_elapsed_seconds
    );
    v_max_combo_delta := floor(
        v_combo_margin + v_max_combo_per_second * v_elapsed_seconds
    );

    if p_score - v_live_score.score > v_max_score_delta
        or p_combo - v_live_score.combo > v_max_combo_delta then
        return query select 'Mise a jour refusee.'::text;
        return;
    end if;

    update public.battle_live_scores as live_score
    set score = p_score,
        combo = p_combo,
        accuracy = p_accuracy,
        updated_at = now()
    where live_score.room_id = p_room_id
        and live_score.user_id = auth.uid();

    return query select null::text;
end;
$$;

create or replace function public.submit_solo_score(
    p_song_id text,
    p_player_name text,
    p_score integer,
    p_accuracy numeric,
    p_best_combo integer
)
returns table(error_message text)
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        return query select 'Authentification requise.'::text;
        return;
    end if;

    if p_song_id !~ '^[a-z0-9-]{1,80}$'
        or length(trim(p_player_name)) not between 1 and 24
        or p_score < 0 or p_score > 1000000
        or p_best_combo < 0 or p_best_combo > 100000
        or p_accuracy < 0 or p_accuracy > 100 then
        return query select 'Score invalide.'::text;
        return;
    end if;

    insert into public.scores (
        user_id, song_id, player_name, score, accuracy, best_combo
    ) values (
        auth.uid(), p_song_id, trim(p_player_name), p_score, p_accuracy, p_best_combo
    );

    return query select null::text;
end;
$$;

alter table public.battle_rooms enable row level security;
alter table public.battle_live_scores enable row level security;

drop policy if exists "public read/write rooms" on public.battle_rooms;
drop policy if exists "public read rooms" on public.battle_rooms;
create policy "public read rooms"
    on public.battle_rooms for select
    using (true);

drop policy if exists "public read/write live scores" on public.battle_live_scores;
drop policy if exists "public read live scores" on public.battle_live_scores;
create policy "public read live scores"
    on public.battle_live_scores for select
    using (true)
;

drop policy if exists "public update live scores" on public.battle_live_scores;

-- ------------------------------------------------------------
-- Privileges (RLS ne suffit pas : Supabase exige aussi les GRANT
-- explicites quand les tables sont creees hors de l'UI Table Editor)
-- ------------------------------------------------------------

grant usage on schema public to anon, authenticated;

revoke all on public.scores from anon, authenticated;
grant select on public.scores to anon, authenticated;

revoke all on public.battle_rooms from anon, authenticated;
revoke all on public.battle_live_scores from anon, authenticated;
grant select on public.battle_rooms to anon, authenticated;
grant select on public.battle_live_scores to anon, authenticated;
grant execute on function public.create_battle_room(text) to authenticated;
grant execute on function public.join_battle_room(text, text) to anon, authenticated;
grant execute on function public.start_battle_room(text, text, text) to authenticated;
grant execute on function public.update_battle_score(text, integer, integer, numeric) to authenticated;
grant execute on function public.submit_solo_score(text, text, integer, numeric, integer) to authenticated;
