-- Search path + revoke public execute on auth trigger helpers.
-- Already applied via MCP; kept here for repo history.

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
