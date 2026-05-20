
create table if not exists public.apex_randomness_requests (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  round_ref text not null,
  drand_round bigint,
  drand_randomness text,
  server_signature text,
  server_pubkey text,
  client_seed text,
  composed_seed text,
  created_at timestamptz not null default now(),
  unique (game, round_ref)
);

create index if not exists idx_apex_randomness_created on public.apex_randomness_requests (created_at desc);
create index if not exists idx_apex_randomness_game on public.apex_randomness_requests (game, created_at desc);

alter table public.apex_randomness_requests enable row level security;

drop policy if exists "apex_randomness_public_read" on public.apex_randomness_requests;
create policy "apex_randomness_public_read"
  on public.apex_randomness_requests for select
  using (true);

-- No INSERT/UPDATE/DELETE policy → only SECURITY DEFINER RPC can write.

create or replace function public.apex_record_randomness(
  _game text,
  _round_ref text,
  _drand_round bigint,
  _drand_randomness text,
  _server_signature text,
  _server_pubkey text,
  _client_seed text,
  _composed_seed text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
  _is_admin boolean;
begin
  -- Allow service role (auth.uid() is null in edge cron) OR admin user.
  if auth.uid() is not null then
    select public.has_role(auth.uid(), 'admin'::public.app_role) into _is_admin;
    if coalesce(_is_admin, false) is not true then
      raise exception 'apex_record_randomness: forbidden';
    end if;
  end if;

  insert into public.apex_randomness_requests(
    game, round_ref, drand_round, drand_randomness,
    server_signature, server_pubkey, client_seed, composed_seed
  ) values (
    _game, _round_ref, _drand_round, _drand_randomness,
    _server_signature, _server_pubkey, _client_seed, _composed_seed
  )
  on conflict (game, round_ref) do update
    set drand_round = excluded.drand_round,
        drand_randomness = excluded.drand_randomness,
        server_signature = excluded.server_signature,
        server_pubkey = excluded.server_pubkey,
        composed_seed = excluded.composed_seed
  returning id into _id;

  return _id;
end;
$$;

revoke all on function public.apex_record_randomness(text,text,bigint,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.apex_record_randomness(text,text,bigint,text,text,text,text,text) to service_role;
