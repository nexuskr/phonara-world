
create or replace function public.record_chaos_run(
  _source text, _total int, _passed int, _failed int, _duration_ms int, _results jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  insert into public.chaos_runs(source, total_probes, passed, failed, duration_ms, results)
  values (_source, _total, _passed, _failed, _duration_ms, coalesce(_results,'[]'::jsonb))
  returning id into _id;
  if _failed > 0 then
    insert into public.anomaly_events(rule, severity, evidence, dedupe_key)
    values ('chaos_probe_failed','critical',
      jsonb_build_object('chaos_run_id',_id,'source',_source,'failed',_failed,'total',_total,'results',_results),
      'chaos:' || to_char(now(),'YYYY-MM-DD-HH24'))
    on conflict do nothing;
  end if;
  delete from public.chaos_runs where ran_at < now() - interval '90 days';
  return _id;
end; $$;
revoke all on function public.record_chaos_run(text,int,int,int,int,jsonb) from public, anon, authenticated;
grant execute on function public.record_chaos_run(text,int,int,int,int,jsonb) to service_role;

create or replace function public.my_active_freeze()
returns table(id uuid, reason text, severity text, frozen_at timestamptz, expires_at timestamptz, source text)
language sql stable security definer set search_path = public as $$
  select id, reason, severity, frozen_at, expires_at, source
  from public.account_freezes
  where user_id = auth.uid() and released_at is null
    and (expires_at is null or expires_at > now())
  order by frozen_at desc limit 1
$$;
grant execute on function public.my_active_freeze() to authenticated;

create or replace function public.admin_release_freeze(_freeze_id uuid, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then raise exception 'forbidden'; end if;
  update public.account_freezes
    set released_at = now(), released_by = auth.uid()
  where id = _freeze_id and released_at is null;
  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values (auth.uid(),'release_freeze','account_freeze',_freeze_id, jsonb_build_object('note',_note));
end; $$;
grant execute on function public.admin_release_freeze(uuid,text) to authenticated;

insert into public.policy_assertions (key, table_name, op, role, expected, test_sql, description, active) values
  ('anon_select_account_freezes_deny','account_freezes','select','anon','deny','select count(*) from public.account_freezes','anon은 freeze 정보를 읽을 수 없어야 한다',true),
  ('anon_select_webhook_subs_deny','webhook_subscriptions','select','anon','deny','select count(*) from public.webhook_subscriptions','anon은 webhook 구독을 읽을 수 없어야 한다',true),
  ('anon_select_webhook_deliveries_deny','webhook_deliveries','select','anon','deny','select count(*) from public.webhook_deliveries','anon은 webhook 전송 로그를 읽을 수 없어야 한다',true),
  ('anon_select_spans_deny','spans','select','anon','deny','select count(*) from public.spans','anon은 span 트레이스를 읽을 수 없어야 한다',true),
  ('anon_select_chaos_runs_deny','chaos_runs','select','anon','deny','select count(*) from public.chaos_runs','anon은 chaos 결과를 직접 읽을 수 없어야 한다',true),
  ('anon_select_idempotency_deny','idempotency_keys','select','anon','deny','select count(*) from public.idempotency_keys','anon은 idempotency 키를 읽을 수 없어야 한다',true),
  ('anon_select_uptime_pings_deny','uptime_pings','select','anon','deny','select count(*) from public.uptime_pings','anon은 uptime ping 원본을 읽을 수 없어야 한다',true)
on conflict (key) do update set table_name=excluded.table_name, op=excluded.op, role=excluded.role,
  expected=excluded.expected, test_sql=excluded.test_sql, description=excluded.description, active=true;
