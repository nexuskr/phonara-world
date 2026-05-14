
-- ═══════════════════════════════════════════════════════════════════
-- Day 1 — Admin Mission Control 골격
-- ═══════════════════════════════════════════════════════════════════

-- 1. require_admin 가드
create or replace function public.require_admin()
returns void
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
end;
$$;

-- 2. admin_audit_log
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_type text,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_audit_log_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_admin on public.admin_audit_log (admin_id, created_at desc);
create index if not exists idx_admin_audit_log_action on public.admin_audit_log (action, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "audit: admin select" on public.admin_audit_log;
create policy "audit: admin select" on public.admin_audit_log
  for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));

-- INSERT only via SECURITY DEFINER helper (no direct inserts)
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;

create or replace function public.log_admin_action(
  _action text,
  _target_type text default null,
  _target_id text default null,
  _payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, payload)
  values (coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid), _action, _target_type, _target_id, coalesce(_payload, '{}'::jsonb));
end;
$$;

-- 3. game_config (singleton)
create table if not exists public.game_config (
  id int primary key default 1 check (id = 1),
  demo_bias jsonb not null default '{}'::jsonb,
  nearmiss_prob jsonb not null default '{}'::jsonb,
  crown_particle_intensity int not null default 50 check (crown_particle_intensity between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.game_config (id) values (1) on conflict (id) do nothing;

alter table public.game_config enable row level security;

drop policy if exists "game_config: admin all" on public.game_config;
create policy "game_config: admin all" on public.game_config
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Public-safe view of game_config (only particle intensity is exposed)
create or replace function public.get_game_config_public()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'crown_particle_intensity', coalesce(crown_particle_intensity, 50)
  )
  from public.game_config where id = 1;
$$;

create or replace function public.admin_update_game_config(_patch jsonb)
returns public.game_config
language plpgsql
security definer
set search_path = public
as $$
declare _row public.game_config;
begin
  perform require_admin();
  perform log_admin_action('game_config.update', 'game_config', '1', _patch);
  update public.game_config set
    demo_bias = case when _patch ? 'demo_bias' then _patch->'demo_bias' else demo_bias end,
    nearmiss_prob = case when _patch ? 'nearmiss_prob' then _patch->'nearmiss_prob' else nearmiss_prob end,
    crown_particle_intensity = case when _patch ? 'crown_particle_intensity'
      then greatest(0, least(100, (_patch->>'crown_particle_intensity')::int))
      else crown_particle_intensity end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1
  returning * into _row;
  return _row;
end;
$$;

-- 4. Empire Overview RPCs
-- 4a. 월 500억 달성률
create or replace function public.admin_get_monthly_revenue_progress()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _start timestamptz := date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  _total numeric;
  _goal numeric := 50000000000; -- 500억 KRW
begin
  perform require_admin();
  select coalesce(sum(amount_krw), 0) into _total
    from public.revenue_events where created_at >= _start;
  return jsonb_build_object(
    'period_start', _start,
    'goal_krw', _goal,
    'total_krw', _total,
    'progress_pct', round(least(100, _total / _goal * 100)::numeric, 2)
  );
end;
$$;

-- 4b. 오늘 Crown Explosion Total
create or replace function public.admin_get_today_crown_total()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  _count int;
  _total bigint;
  _explosions int;
begin
  perform require_admin();
  select count(*), coalesce(sum(awarded_amount), 0),
         count(*) filter (where awarded_amount >= base_amount * 2)
    into _count, _total, _explosions
    from public.crown_events where created_at >= _start;
  return jsonb_build_object(
    'period_start', _start,
    'count', _count,
    'total_awarded', _total,
    'explosions', _explosions
  );
end;
$$;

-- 4c. Empire realtime snapshot
create or replace function public.admin_get_empire_realtime()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _online int;
  _open_positions int;
  _total_phon bigint;
  _last_crown timestamptz;
begin
  perform require_admin();
  select count(distinct user_id) into _open_positions from public.live_positions;
  select coalesce(sum(balance), 0) into _total_phon from public.phon_balances;
  select max(created_at) into _last_crown from public.crown_events;
  select coalesce(active_now, 0) into _online from public.ghost_pulse_state where id = 1;
  return jsonb_build_object(
    'online_now', _online,
    'open_positions', _open_positions,
    'total_phon', _total_phon,
    'last_crown_at', _last_crown
  );
end;
$$;

-- 5. Bot Console RPCs
-- 5a. Ghost Empire stats
create or replace function public.get_ghost_empire_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _row public.ghost_pulse_state%rowtype;
begin
  perform require_admin();
  select * into _row from public.ghost_pulse_state where id = 1;
  return jsonb_build_object(
    'live_users', coalesce(_row.live_users, 0),
    'active_now', coalesce(_row.active_now, 0),
    'region_pulses', coalesce(_row.region_pulses, '{}'::jsonb),
    'last_whale_at', _row.last_whale_at,
    'last_moment_at', _row.last_moment_at,
    'updated_at', _row.updated_at
  );
end;
$$;

-- 5b. Hot users (1h deposits Top 10)
create or replace function public.admin_get_hot_users_1h()
returns table(user_id uuid, total_amount bigint, deposit_count int)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_admin();
  return query
    select dr.user_id, sum(dr.amount)::bigint as total_amount, count(*)::int as deposit_count
    from public.deposit_requests dr
    where dr.status = 'approved'::deposit_status
      and dr.created_at >= now() - interval '1 hour'
    group by dr.user_id
    order by total_amount desc
    limit 10;
end;
$$;

-- 5c. Demo bias performance (placeholder aggregation)
create or replace function public.admin_get_demo_bias_perf()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_admin();
  return jsonb_build_object(
    'config', (select demo_bias from public.game_config where id = 1),
    'note', 'Detailed conversion tracking lands in Day 3 (SIM→Real)'
  );
end;
$$;

-- 5d. Telegram bot status (best-effort, returns nulls if no telegram_* tables)
create or replace function public.admin_get_telegram_bot_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _runs jsonb;
begin
  perform require_admin();
  select jsonb_build_object(
    'recent_runs_24h', count(*),
    'last_run_at', max(created_at)
  ) into _runs from public.ai_bot_runs where created_at >= now() - interval '24 hours';
  return jsonb_build_object(
    'bot_runs', coalesce(_runs, '{}'::jsonb),
    'channels_connected', null,
    'today_signups', (select count(*) from public.profiles where created_at >= date_trunc('day', now()))
  );
end;
$$;

-- 6. Grants — only authenticated may call admin_* (require_admin raises for non-admins)
grant execute on function public.require_admin() to authenticated;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;
grant execute on function public.admin_update_game_config(jsonb) to authenticated;
grant execute on function public.admin_get_monthly_revenue_progress() to authenticated;
grant execute on function public.admin_get_today_crown_total() to authenticated;
grant execute on function public.admin_get_empire_realtime() to authenticated;
grant execute on function public.get_ghost_empire_stats() to authenticated;
grant execute on function public.admin_get_hot_users_1h() to authenticated;
grant execute on function public.admin_get_demo_bias_perf() to authenticated;
grant execute on function public.admin_get_telegram_bot_status() to authenticated;
grant execute on function public.get_game_config_public() to anon, authenticated;
