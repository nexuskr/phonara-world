
-- ═══════════════════════════════════════════════════════════════════
-- Day 2 — Admin Mission Control
-- ═══════════════════════════════════════════════════════════════════

-- 1. User 360
create or replace function public.admin_get_user_360(_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _profile jsonb;
  _balance numeric;
  _deposits jsonb;
  _withdrawals jsonb;
  _anomalies jsonb;
  _crown jsonb;
  _positions jsonb;
begin
  perform require_admin();
  perform log_admin_action('user.view_360', 'user', _uid::text, '{}'::jsonb);

  select to_jsonb(p) into _profile from public.profiles p where p.id = _uid;
  select coalesce(balance, 0) into _balance from public.phon_balances where user_id = _uid;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc), '[]'::jsonb)
    into _deposits
    from (select id, amount, status, method, created_at, approved_at
            from public.deposit_requests where user_id = _uid
            order by created_at desc limit 20) d;

  select coalesce(jsonb_agg(to_jsonb(w) order by w.created_at desc), '[]'::jsonb)
    into _withdrawals
    from (select id, amount, status, method, created_at, approved_at, completed_at
            from public.withdrawal_requests where user_id = _uid
            order by created_at desc limit 20) w;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
    into _anomalies
    from (select id, rule, severity, evidence, acknowledged, created_at
            from public.anomaly_events where user_id = _uid
            order by created_at desc limit 20) a;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
    into _crown
    from (select id, event_type, awarded_amount, base_amount, created_at
            from public.crown_events where user_id = _uid
            order by created_at desc limit 20) c;

  select coalesce(jsonb_agg(to_jsonb(lp) order by lp.opened_at desc nulls last), '[]'::jsonb)
    into _positions
    from (select * from public.live_positions where user_id = _uid limit 10) lp;

  return jsonb_build_object(
    'profile', _profile,
    'phon_balance', _balance,
    'deposits', _deposits,
    'withdrawals', _withdrawals,
    'anomalies', _anomalies,
    'crown_events', _crown,
    'positions', _positions
  );
end;
$$;

-- 2. Manual Crown Trigger (idempotent: manual:admin:uid:ts)
create or replace function public.admin_trigger_crown(
  _uid uuid,
  _multiplier numeric default 1.0,
  _base int default 100,
  _reason text default 'manual_admin_trigger'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin uuid := auth.uid();
  _dedupe text;
  _awarded int;
  _level int;
  _id bigint;
begin
  perform require_admin();
  if _uid is null then raise exception 'target_required'; end if;
  if _base < 0 or _base > 100000 then raise exception 'base_out_of_range'; end if;
  if _multiplier < 0.1 or _multiplier > 10 then raise exception 'multiplier_out_of_range'; end if;

  _dedupe := format('manual:%s:%s:%s', _admin, _uid, extract(epoch from now())::bigint);
  _awarded := floor(_base * _multiplier)::int;

  select coalesce(empire_level, 1) into _level from public.profiles where id = _uid;

  insert into public.crown_events (
    user_id, event_type, base_amount, awarded_amount, variance,
    level_mult, streak_mult, type_mult, expected_amount, rpe, meta, dedupe_key
  ) values (
    _uid, 'manual_trigger', _base, _awarded, _multiplier,
    1, 1, _multiplier, _base, 1.0,
    jsonb_build_object('admin', _admin, 'reason', _reason),
    _dedupe
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into _id;

  perform log_admin_action(
    'crown.manual_trigger', 'user', _uid::text,
    jsonb_build_object('base', _base, 'multiplier', _multiplier, 'awarded', _awarded, 'dedupe', _dedupe, 'reason', _reason)
  );

  return jsonb_build_object(
    'event_id', _id,
    'awarded', _awarded,
    'idempotency_key', _dedupe,
    'duplicate', _id is null
  );
end;
$$;

-- 3. Withdrawal bulk
create or replace function public.admin_bulk_approve_withdrawals(_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare _n int;
begin
  perform require_admin();
  update public.withdrawal_requests
    set status = 'approved'::withdrawal_status,
        approved_at = now(),
        admin_id = auth.uid()
    where id = any(_ids) and status = 'pending'::withdrawal_status;
  get diagnostics _n = row_count;
  perform log_admin_action(
    'withdrawal.bulk_approve', 'withdrawal_requests', null,
    jsonb_build_object('ids', _ids, 'count', _n)
  );
  return _n;
end;
$$;

create or replace function public.admin_bulk_reject_withdrawals(_ids uuid[], _reason text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare _n int;
begin
  perform require_admin();
  if _reason is null or length(trim(_reason)) < 3 then
    raise exception 'reason_required';
  end if;
  update public.withdrawal_requests
    set status = 'rejected'::withdrawal_status,
        rejected_reason = _reason,
        admin_id = auth.uid()
    where id = any(_ids) and status = 'pending'::withdrawal_status;
  get diagnostics _n = row_count;
  perform log_admin_action(
    'withdrawal.bulk_reject', 'withdrawal_requests', null,
    jsonb_build_object('ids', _ids, 'count', _n, 'reason', _reason)
  );
  return _n;
end;
$$;

-- 4. Risk Center
create or replace function public.admin_get_risk_feed(_only_unack boolean default true, _limit int default 100)
returns setof public.anomaly_events
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_admin();
  return query
    select * from public.anomaly_events
    where (not _only_unack or acknowledged = false)
    order by created_at desc
    limit greatest(1, least(_limit, 500));
end;
$$;

create or replace function public.admin_resolve_anomaly(_id uuid, _note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_admin();
  update public.anomaly_events
    set acknowledged = true,
        acknowledged_by = auth.uid(),
        acknowledged_at = now(),
        ack_note = _note
    where id = _id;
  perform log_admin_action(
    'anomaly.resolve', 'anomaly', _id::text,
    jsonb_build_object('note', _note)
  );
end;
$$;

-- 5. Audit log feed
create or replace function public.admin_get_audit_log(
  _action text default null,
  _admin uuid default null,
  _limit int default 100
)
returns setof public.admin_audit_log
language plpgsql
security definer
set search_path = public
as $$
begin
  perform require_admin();
  return query
    select * from public.admin_audit_log
    where (_action is null or action ilike _action || '%')
      and (_admin is null or admin_id = _admin)
    order by created_at desc
    limit greatest(1, least(_limit, 500));
end;
$$;

-- 6. Grants
grant execute on function public.admin_get_user_360(uuid) to authenticated;
grant execute on function public.admin_trigger_crown(uuid, numeric, int, text) to authenticated;
grant execute on function public.admin_bulk_approve_withdrawals(uuid[]) to authenticated;
grant execute on function public.admin_bulk_reject_withdrawals(uuid[], text) to authenticated;
grant execute on function public.admin_get_risk_feed(boolean, int) to authenticated;
grant execute on function public.admin_resolve_anomaly(uuid, text) to authenticated;
grant execute on function public.admin_get_audit_log(text, uuid, int) to authenticated;
