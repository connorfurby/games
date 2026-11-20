-- Social v2: names first, real leaderboards, competitions (weekly cup, head-to-head
-- challenges, leagues), friend discovery, and privacy settings.
-- Apply after 20261119194830. Safe to run once; every object is new or `if not exists`.

-- ── Profiles: onboarding, look, settings ───────────────────────────────────────
alter table public.profiles
  add column if not exists onboarded_at timestamptz,
  add column if not exists accent text not null default 'tomato',
  add column if not exists favorite_game text,
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.profiles
  add constraint profiles_display_name_len check (char_length(display_name) <= 64) not valid;
alter table public.profiles
  add constraint profiles_accent_check check (accent in ('tomato', 'tag', 'mint', 'sky', 'plum', 'rose', 'sand', 'ink')) not valid;
alter table public.profiles
  add constraint profiles_favorite_game_check check (favorite_game is null or favorite_game in ('grocery-empire', 'signal-decay')) not valid;

create index if not exists profiles_display_name_lower_idx on public.profiles (lower(display_name));
create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);

-- Settings keys (all optional, defaults in the client):
--   discoverable  bool  show up in search and suggestions        (default true)
--   public_boards bool  show on global boards (friends always see) (default true)
--   show_presence bool  show online / playing to friends          (default true)
--   default_visibility 'friends' | 'public'                         (default 'friends')
--   notify_* bool       per-kind notification switches
create or replace function public.setting_on(s jsonb, k text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce((s ->> k)::boolean, true);
$$;

-- ── Stats: numbers you can sort, weekly gain, last week kept for the cup ───────
alter table public.public_stats
  add column if not exists revenue_num double precision not null default 0,
  add column if not exists week_gain double precision not null default 0,
  add column if not exists prev_week_key text,
  add column if not exists prev_week_gain double precision not null default 0,
  add column if not exists achievements integer not null default 0;

create index if not exists public_stats_game_revenue_idx on public.public_stats (game_id, revenue_num desc);
create index if not exists public_stats_game_week_idx on public.public_stats (game_id, week_key, week_gain desc);

-- ── Notifications: more kinds ──────────────────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (
    kind in (
      'friend_request', 'friend_accept', 'comment', 'reaction',
      'challenge', 'challenge_accept', 'challenge_result', 'league_join', 'cup_result'
    )
  );
alter table public.notifications add column if not exists ref_id uuid;

-- ── Head-to-head challenges ────────────────────────────────────────────────────
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  game_id text not null check (game_id in ('grocery-empire', 'signal-decay')),
  metric text not null check (metric in ('revenue', 'baskets', 'play')),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'declined', 'cancelled', 'done')),
  hours integer not null default 24 check (hours in (24, 72, 168)),
  message text not null default '' check (char_length(message) <= 140),
  starts_at timestamptz,
  ends_at timestamptz,
  creator_start double precision,
  opponent_start double precision,
  creator_final double precision,
  opponent_final double precision,
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint challenges_not_self check (creator_id <> opponent_id)
);

create index if not exists challenges_creator_idx on public.challenges (creator_id, status);
create index if not exists challenges_opponent_idx on public.challenges (opponent_id, status);

alter table public.challenges enable row level security;

create policy challenges_select_involved on public.challenges for select to authenticated
  using (auth.uid() in (creator_id, opponent_id));

create policy challenges_insert_creator on public.challenges for insert to authenticated
  with check (
    auth.uid() = creator_id
    and status = 'pending'
    and public.are_friends(creator_id, opponent_id)
  );

-- Status moves go through the functions below; only cancel/decline are plain updates.
create policy challenges_update_involved on public.challenges for update to authenticated
  using (auth.uid() in (creator_id, opponent_id) and status = 'pending')
  with check (status in ('declined', 'cancelled'));

create or replace function public.challenge_value(p_user uuid, p_game text, p_metric text)
returns double precision
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case p_metric
      when 'revenue' then ps.revenue_num
      when 'baskets' then ps.headline_count
      when 'play' then ps.play_seconds
    end, 0)
  from public.public_stats ps
  where ps.user_id = p_user and ps.game_id = p_game;
$$;

create or replace function public.accept_challenge(p_id uuid)
returns public.challenges
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.challenges;
begin
  select * into c from public.challenges where id = p_id for update;
  if c.id is null or c.opponent_id <> auth.uid() or c.status <> 'pending' then
    raise exception 'challenge not open';
  end if;
  update public.challenges
     set status = 'active',
         starts_at = now(),
         ends_at = now() + make_interval(hours => c.hours),
         creator_start = coalesce(public.challenge_value(c.creator_id, c.game_id, c.metric), 0),
         opponent_start = coalesce(public.challenge_value(c.opponent_id, c.game_id, c.metric), 0)
   where id = p_id
   returning * into c;
  insert into public.notifications (recipient_id, actor_id, kind, body, ref_id)
  values (c.creator_id, c.opponent_id, 'challenge_accept', 'accepted your challenge', c.id);
  return c;
end;
$$;

-- Close every ended challenge the caller is in. Idempotent.
create or replace function public.settle_challenges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.challenges;
  a double precision;
  b double precision;
  n integer := 0;
  w uuid;
begin
  for c in
    select * from public.challenges
     where status = 'active' and ends_at <= now()
       and auth.uid() in (creator_id, opponent_id)
     for update
  loop
    a := coalesce(public.challenge_value(c.creator_id, c.game_id, c.metric), 0) - coalesce(c.creator_start, 0);
    b := coalesce(public.challenge_value(c.opponent_id, c.game_id, c.metric), 0) - coalesce(c.opponent_start, 0);
    w := case when a > b then c.creator_id when b > a then c.opponent_id else null end;
    update public.challenges
       set status = 'done', creator_final = a, opponent_final = b, winner_id = w
     where id = c.id;
    insert into public.notifications (recipient_id, actor_id, kind, body, ref_id)
    values
      (c.creator_id, c.opponent_id, 'challenge_result', case when w = c.creator_id then 'you won the challenge' when w is null then 'the challenge was a draw' else 'you lost the challenge' end, c.id),
      (c.opponent_id, c.creator_id, 'challenge_result', case when w = c.opponent_id then 'you won the challenge' when w is null then 'the challenge was a draw' else 'you lost the challenge' end, c.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ── Leagues (private boards with an invite code) ───────────────────────────────
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  motto text not null default '' check (char_length(motto) <= 80),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  game_id text not null check (game_id in ('grocery-empire', 'signal-decay')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists league_members_user_idx on public.league_members (user_id);

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

create or replace function public.in_league(p_league uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.league_members m where m.league_id = p_league and m.user_id = p_user);
$$;

create policy leagues_select_member on public.leagues for select to authenticated
  using (public.in_league(id, auth.uid()));
create policy leagues_update_owner on public.leagues for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy leagues_delete_owner on public.leagues for delete to authenticated
  using (owner_id = auth.uid());

create policy league_members_select_member on public.league_members for select to authenticated
  using (public.in_league(league_id, auth.uid()));
create policy league_members_leave on public.league_members for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.create_league(p_name text, p_game text, p_motto text default '')
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.leagues;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
  i int;
begin
  if (select count(*) from public.leagues where owner_id = auth.uid()) >= 5 then
    raise exception 'you can run five leagues at most';
  end if;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.leagues where code = c);
  end loop;
  insert into public.leagues (name, motto, code, game_id, owner_id)
  values (trim(p_name), coalesce(trim(p_motto), ''), c, p_game, auth.uid())
  returning * into l;
  insert into public.league_members (league_id, user_id) values (l.id, auth.uid());
  return l;
end;
$$;

create or replace function public.join_league(p_code text)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.leagues;
begin
  select * into l from public.leagues where code = upper(trim(p_code));
  if l.id is null then
    raise exception 'no league with that code';
  end if;
  if (select count(*) from public.league_members where league_id = l.id) >= 50 then
    raise exception 'that league is full';
  end if;
  insert into public.league_members (league_id, user_id) values (l.id, auth.uid())
  on conflict do nothing;
  if l.owner_id <> auth.uid() then
    insert into public.notifications (recipient_id, actor_id, kind, body, ref_id)
    values (l.owner_id, auth.uid(), 'league_join', 'joined ' || l.name, l.id);
  end if;
  return l;
end;
$$;

-- ── Weekly cup results (top three per game per ISO week) ───────────────────────
create table if not exists public.cup_results (
  game_id text not null check (game_id in ('grocery-empire', 'signal-decay')),
  week_key text not null,
  place integer not null check (place between 1 and 3),
  user_id uuid not null references public.profiles (id) on delete cascade,
  score double precision not null,
  created_at timestamptz not null default now(),
  primary key (game_id, week_key, place)
);

alter table public.cup_results enable row level security;
create policy cup_results_select_all on public.cup_results for select to authenticated using (true);

-- Record the top three of a finished week. Anyone may call it; it only writes once.
create or replace function public.settle_cup(p_game text, p_week text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if exists (select 1 from public.cup_results where game_id = p_game and week_key = p_week) then
    return 0;
  end if;
  insert into public.cup_results (game_id, week_key, place, user_id, score)
  select p_game, p_week, rn, user_id, gain
  from (
    select user_id, gain, row_number() over (order by gain desc) as rn
    from (
      select ps.user_id,
             case when ps.week_key = p_week then ps.week_gain
                  when ps.prev_week_key = p_week then ps.prev_week_gain
                  else 0 end as gain
      from public.public_stats ps
      join public.profiles p on p.id = ps.user_id
      where ps.game_id = p_game and public.setting_on(p.settings, 'public_boards')
    ) g
    where gain > 0
  ) r
  where rn <= 3;
  get diagnostics n = row_count;
  insert into public.notifications (recipient_id, kind, body, ref_id)
  select user_id, 'cup_result', 'you placed #' || place || ' in the ' || p_week || ' cup', null
  from public.cup_results where game_id = p_game and week_key = p_week;
  return n;
end;
$$;

-- ── Leaderboards ───────────────────────────────────────────────────────────────
-- Metric: revenue | week | era | baskets | play | daily | awards
-- Scope:  global | friends | league
create or replace function public.leaderboard(
  p_game text,
  p_metric text,
  p_scope text default 'global',
  p_league uuid default null,
  p_limit integer default 50,
  p_week text default null
)
returns table (rank bigint, user_id uuid, value double precision, era integer, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  with pool as (
    select ps.*,
      case p_metric
        when 'revenue' then ps.revenue_num
        when 'week' then case when ps.week_key = p_week then ps.week_gain else 0 end
        when 'era' then ps.era::double precision
        when 'baskets' then ps.headline_count
        when 'play' then ps.play_seconds
        when 'daily' then coalesce(ps.daily_challenge_baskets, 0)
        when 'awards' then ps.achievements::double precision
        else ps.revenue_num
      end as v
    from public.public_stats ps
    join public.profiles p on p.id = ps.user_id
    where ps.game_id = p_game
      and (
        case p_scope
          when 'friends' then ps.user_id = auth.uid() or public.are_friends(auth.uid(), ps.user_id)
          when 'league' then public.in_league(p_league, auth.uid()) and public.in_league(p_league, ps.user_id)
          else ps.user_id = auth.uid()
               or public.are_friends(auth.uid(), ps.user_id)
               or public.setting_on(p.settings, 'public_boards')
        end
      )
  ),
  ranked as (
    select row_number() over (order by v desc, updated_at asc) as rank, pool.user_id, v as value, pool.era,
           count(*) over () as total
    from pool
    where v > 0 or pool.user_id = auth.uid()
  )
  select * from ranked
  where rank <= greatest(1, least(p_limit, 200))
     or ranked.user_id = auth.uid()
  order by rank;
$$;

-- ── Finding people ─────────────────────────────────────────────────────────────
create or replace function public.search_players(p_q text, p_limit integer default 12)
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.* from public.profiles p
  where p.id <> auth.uid()
    and (
      -- A friend code always finds its owner (that's what sharing it is for).
      p.friend_code = upper(trim(p_q))
      or (
        p.onboarded_at is not null
        and (public.setting_on(p.settings, 'discoverable') or public.are_friends(auth.uid(), p.id))
        and (
          lower(p.handle) like lower(regexp_replace(trim(p_q), '^@', '')) || '%'
          or lower(p.display_name) like '%' || lower(trim(p_q)) || '%'
        )
      )
    )
  order by (lower(p.handle) = lower(regexp_replace(trim(p_q), '^@', ''))) desc, p.last_seen_at desc nulls last
  limit least(p_limit, 30);
$$;

-- Friends of friends first (with how many you share), then recently active players
-- near your era who have discovery on.
create or replace function public.suggest_friends(p_limit integer default 12)
returns table (profile public.profiles, mutual integer, reason text)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as id
    from public.friendships
    where auth.uid() in (requester_id, addressee_id)
  ),
  accepted as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as id
    from public.friendships
    where status = 'accepted' and auth.uid() in (requester_id, addressee_id)
  ),
  fof as (
    select case when f.requester_id = a.id then f.addressee_id else f.requester_id end as id, count(*)::int as mutual
    from accepted a
    join public.friendships f on f.status = 'accepted' and a.id in (f.requester_id, f.addressee_id)
    group by 1
  ),
  my_era as (
    select coalesce(max(era), 0) as era from public.public_stats where user_id = auth.uid()
  ),
  near as (
    select ps.user_id as id, 0 as mutual
    from public.public_stats ps, my_era
    where abs(ps.era - my_era.era) <= 1
    group by ps.user_id
  ),
  pool as (
    select id, max(mutual) as mutual from (select * from fof union all select * from near) u group by id
  )
  select p, pool.mutual, case when pool.mutual > 0 then 'mutual' else 'near' end
  from pool
  join public.profiles p on p.id = pool.id
  where p.id <> auth.uid()
    and p.id not in (select id from mine)
    and p.onboarded_at is not null
    and public.setting_on(p.settings, 'discoverable')
  order by pool.mutual desc, p.last_seen_at desc nulls last
  limit least(p_limit, 30);
$$;

create or replace function public.handle_available(p_handle text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles p where lower(p.handle) = lower(p_handle) and p.id <> auth.uid()
  );
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────────
revoke all on function public.challenge_value(uuid, text, text) from public, anon;
grant execute on function public.accept_challenge(uuid) to authenticated;
grant execute on function public.settle_challenges() to authenticated;
grant execute on function public.create_league(text, text, text) to authenticated;
grant execute on function public.join_league(text) to authenticated;
grant execute on function public.settle_cup(text, text) to authenticated;
grant execute on function public.leaderboard(text, text, text, uuid, integer, text) to authenticated;
grant execute on function public.search_players(text, integer) to authenticated;
grant execute on function public.suggest_friends(integer) to authenticated;
grant execute on function public.handle_available(text) to authenticated;
revoke all on function public.accept_challenge(uuid) from anon;
revoke all on function public.settle_challenges() from anon;
revoke all on function public.create_league(text, text, text) from anon;
revoke all on function public.join_league(text) from anon;
revoke all on function public.settle_cup(text, text) from anon;
revoke all on function public.leaderboard(text, text, text, uuid, integer, text) from anon;
revoke all on function public.search_players(text, integer) from anon;
revoke all on function public.suggest_friends(integer) from anon;
revoke all on function public.handle_available(text) from anon;

alter publication supabase_realtime add table public.challenges;
alter publication supabase_realtime add table public.notifications;
