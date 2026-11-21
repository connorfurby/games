-- Closed beta for Signal Decay.
-- Only the profile with handle connorfurby can grant a key, and only to an accepted friend.
-- Play is still a client check; this table is the record the client asks the server for.

create table if not exists public.beta_grants (
  id uuid primary key default gen_random_uuid(),
  game_id text not null check (game_id = 'signal-decay'),
  grantee_id uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, grantee_id)
);

create index if not exists beta_grants_granted_by_idx on public.beta_grants (granted_by);

alter table public.beta_grants enable row level security;

drop policy if exists beta_grants_select_party on public.beta_grants;
create policy beta_grants_select_party on public.beta_grants
  for select to authenticated
  using (auth.uid() = grantee_id or auth.uid() = granted_by);

revoke all on table public.beta_grants from anon, authenticated;
grant select on table public.beta_grants to authenticated;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (
    kind in (
      'friend_request', 'friend_accept', 'comment', 'reaction',
      'challenge', 'challenge_accept', 'challenge_result', 'league_join', 'cup_result',
      'beta_key'
    )
  );

-- Games the signed-in player may open. The issuer is included without a row.
create or replace function public.my_beta_games()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select 'signal-decay'::text
  where exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.handle) = 'connorfurby'
  )
  or exists (
    select 1 from public.beta_grants g
    where g.game_id = 'signal-decay' and g.grantee_id = auth.uid()
  );
$$;

create or replace function public.grant_beta_key(p_friend uuid)
returns public.beta_grants
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.beta_grants;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if p_friend is null or p_friend = auth.uid() then
    raise exception 'Pick a friend.';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.handle) = 'connorfurby'
  ) then
    raise exception 'Only @connorfurby can send a beta key.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_friend) then
    raise exception 'No such player.';
  end if;
  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = p_friend)
        or (f.requester_id = p_friend and f.addressee_id = auth.uid())
      )
  ) then
    raise exception 'Beta keys go only to friends.';
  end if;

  insert into public.beta_grants (game_id, grantee_id, granted_by)
  values ('signal-decay', p_friend, auth.uid())
  on conflict (game_id, grantee_id) do nothing
  returning * into g;

  if not found then
    select * into g from public.beta_grants
    where game_id = 'signal-decay' and grantee_id = p_friend;
    return g;
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, body)
  values (p_friend, auth.uid(), 'beta_key', 'sent you a Signal Decay beta key');

  return g;
end;
$$;

revoke all on function public.my_beta_games() from public, anon;
revoke all on function public.grant_beta_key(uuid) from public, anon;
grant execute on function public.my_beta_games() to authenticated;
grant execute on function public.grant_beta_key(uuid) to authenticated;
