-- Accounts, cloud saves, and social (project games).
-- Applied via Supabase MCP; this file is the repo source of truth.

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null,
  friend_code text not null,
  display_name text not null default '',
  avatar_url text,
  bio text not null default '',
  pinned_awards text[] not null default '{}',
  last_seen_at timestamptz,
  playing_game text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_len check (char_length(handle) between 3 and 24),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]+$'),
  constraint profiles_friend_code_format check (friend_code ~ '^[A-Z0-9]{8}$'),
  constraint profiles_bio_len check (char_length(bio) <= 280),
  constraint profiles_pinned_awards_len check (cardinality(pinned_awards) <= 3)
);

create unique index profiles_handle_unique on public.profiles (lower(handle));
create unique index profiles_friend_code_unique on public.profiles (friend_code);

create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot_id text not null,
  payload text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot_id),
  constraint saves_slot_id_len check (char_length(slot_id) between 1 and 64)
);

create index saves_user_updated_idx on public.saves (user_id, updated_at desc);

create table public.public_stats (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  era integer not null default 0,
  lifetime_revenue text not null default '0',
  headline_count double precision not null default 0,
  play_seconds double precision not null default 0,
  daily_challenge_baskets double precision,
  week_key text,
  week_start_score text not null default '0',
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id),
  constraint public_stats_game_id check (game_id in ('grocery-empire', 'signal-decay'))
);

create index public_stats_game_era_idx on public.public_stats (game_id, era desc);
create index public_stats_game_play_idx on public.public_stats (game_id, play_seconds desc);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_pair_unique unique (requester_id, addressee_id)
);

create index friendships_addressee_status_idx on public.friendships (addressee_id, status);
create index friendships_requester_status_idx on public.friendships (requester_id, status);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  visibility text not null default 'friends' check (visibility in ('public', 'friends')),
  run_card jsonb,
  created_at timestamptz not null default now(),
  constraint posts_body_len check (char_length(body) <= 500)
);

create index posts_author_created_idx on public.posts (author_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_len check (char_length(body) between 1 and 280)
);

create index comments_post_created_idx on public.comments (post_id, created_at);

create table public.reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('stamp', 'basket', 'static')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create table public.milestones (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  era integer not null,
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id, era),
  constraint milestones_game_id check (game_id in ('grocery-empire', 'signal-decay'))
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('friend_request', 'friend_accept', 'comment', 'reaction')),
  actor_id uuid references public.profiles (id) on delete set null,
  post_id uuid references public.posts (id) on delete set null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

create trigger saves_set_updated_at
before update on public.saves
for each row execute function public.set_updated_at();

create trigger public_stats_set_updated_at
before update on public.public_stats
for each row execute function public.set_updated_at();

create or replace function public.generate_friend_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.slug_handle(raw text)
returns text
language plpgsql
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(coalesce(raw, ''), '[^a-zA-Z0-9_]+', '_', 'g'));
  base := trim(both '_' from base);
  if char_length(base) < 3 then
    base := 'player';
  end if;
  if char_length(base) > 20 then
    base := substr(base, 1, 20);
  end if;
  candidate := base;
  while exists (select 1 from public.profiles p where lower(p.handle) = candidate) loop
    n := n + 1;
    candidate := substr(base, 1, 20 - char_length(n::text)) || n::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := coalesce(meta->>'full_name', meta->>'name', meta->>'preferred_username', 'Player');
  avatar text := meta->>'avatar_url';
  code text;
  tries int := 0;
begin
  loop
    code := public.generate_friend_code();
    exit when not exists (select 1 from public.profiles p where p.friend_code = code);
    tries := tries + 1;
    exit when tries > 20;
  end loop;

  insert into public.profiles (id, handle, friend_code, display_name, avatar_url)
  values (
    new.id,
    public.slug_handle(name),
    code,
    left(name, 64),
    avatar
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.public_stats enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.milestones enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select_authenticated
  on public.profiles for select to authenticated
  using (true);

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy saves_select_own
  on public.saves for select to authenticated
  using (auth.uid() = user_id);

create policy saves_insert_own
  on public.saves for insert to authenticated
  with check (auth.uid() = user_id);

create policy saves_update_own
  on public.saves for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy saves_delete_own
  on public.saves for delete to authenticated
  using (auth.uid() = user_id);

create policy public_stats_select_authenticated
  on public.public_stats for select to authenticated
  using (true);

create policy public_stats_insert_own
  on public.public_stats for insert to authenticated
  with check (auth.uid() = user_id);

create policy public_stats_update_own
  on public.public_stats for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy public_stats_delete_own
  on public.public_stats for delete to authenticated
  using (auth.uid() = user_id);

create policy friendships_select_involved
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy friendships_insert_requester
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

create policy friendships_update_involved
  on public.friendships for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy friendships_delete_involved
  on public.friendships for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy posts_select_visible
  on public.posts for select to authenticated
  using (
    visibility = 'public'
    or author_id = auth.uid()
    or public.are_friends(auth.uid(), author_id)
  );

create policy posts_insert_own
  on public.posts for insert to authenticated
  with check (auth.uid() = author_id);

create policy posts_update_own
  on public.posts for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy posts_delete_own
  on public.posts for delete to authenticated
  using (auth.uid() = author_id);

create policy comments_select_visible
  on public.comments for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.visibility = 'public'
          or p.author_id = auth.uid()
          or public.are_friends(auth.uid(), p.author_id)
        )
    )
  );

create policy comments_insert_authenticated
  on public.comments for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.visibility = 'public'
          or p.author_id = auth.uid()
          or public.are_friends(auth.uid(), p.author_id)
        )
    )
  );

create policy comments_delete_own
  on public.comments for delete to authenticated
  using (auth.uid() = author_id);

create policy reactions_select_visible
  on public.reactions for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.visibility = 'public'
          or p.author_id = auth.uid()
          or public.are_friends(auth.uid(), p.author_id)
        )
    )
  );

create policy reactions_insert_own
  on public.reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.visibility = 'public'
          or p.author_id = auth.uid()
          or public.are_friends(auth.uid(), p.author_id)
        )
    )
  );

create policy reactions_delete_own
  on public.reactions for delete to authenticated
  using (auth.uid() = user_id);

create policy milestones_select_own_or_friends
  on public.milestones for select to authenticated
  using (auth.uid() = user_id or public.are_friends(auth.uid(), user_id));

create policy milestones_insert_own
  on public.milestones for insert to authenticated
  with check (auth.uid() = user_id);

create policy milestones_update_own
  on public.milestones for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy notifications_select_own
  on public.notifications for select to authenticated
  using (auth.uid() = recipient_id);

create policy notifications_update_own
  on public.notifications for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy notifications_insert_authenticated
  on public.notifications for insert to authenticated
  with check (auth.uid() = actor_id);

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.public_stats;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

revoke all on function public.generate_friend_code() from public;
revoke all on function public.generate_friend_code() from anon;
revoke all on function public.generate_friend_code() from authenticated;

revoke all on function public.slug_handle(text) from public;
revoke all on function public.slug_handle(text) from anon;
revoke all on function public.slug_handle(text) from authenticated;
