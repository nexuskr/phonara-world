
-- Day 3: A/B events + Marketing + Notifications + Audit/Conversion RPCs

create table if not exists public.ab_events (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null,
  variant text not null,
  user_id uuid,
  event text not null,
  value numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ab_events_exp on public.ab_events(experiment_key, created_at desc);
create index if not exists idx_ab_events_user on public.ab_events(user_id);
alter table public.ab_events enable row level security;
drop policy if exists ab_events_admin_read on public.ab_events;
create policy ab_events_admin_read on public.ab_events for select to authenticated
  using (has_role(auth.uid(),'admin'::app_role));
drop policy if exists ab_events_self_insert on public.ab_events;
create policy ab_events_self_insert on public.ab_events for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('push','telegram','inapp')),
  title text not null,
  body text not null,
  audience jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count int not null default 0,
  status text not null default 'draft' check (status in ('draft','scheduled','sent','failed','canceled')),
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_broadcasts_created on public.admin_broadcasts(created_at desc);
alter table public.admin_broadcasts enable row level security;
drop policy if exists admin_broadcasts_admin_all on public.admin_broadcasts;
create policy admin_broadcasts_admin_all on public.admin_broadcasts for all to authenticated
  using (has_role(auth.uid(),'admin'::app_role)) with check (has_role(auth.uid(),'admin'::app_role));

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('influencer','telegram_blast','push','email','other')),
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  budget_krw bigint not null default 0,
  status text not null default 'planned' check (status in ('planned','running','paused','done','canceled')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.marketing_campaigns enable row level security;
drop policy if exists marketing_campaigns_admin_all on public.marketing_campaigns;
create policy marketing_campaigns_admin_all on public.marketing_campaigns for all to authenticated
  using (has_role(auth.uid(),'admin'::app_role)) with check (has_role(auth.uid(),'admin'::app_role));

-- ─── RPCs ──────────────────────────────────────────────────────────────

create or replace function public.admin_create_experiment(
  _key text, _label text, _description text, _variants jsonb, _activate boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  insert into public.ab_experiments(experiment_key,label,description,variants,is_active)
    values (_key,_label,_description,coalesce(_variants,'[]'::jsonb), coalesce(_activate,false))
    returning id into _id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
    values (auth.uid(),'ab.create','experiment',_id, jsonb_build_object('key',_key,'activate',_activate));
  return _id;
end $$;

create or replace function public.admin_stop_experiment(_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  update public.ab_experiments set is_active = false, updated_at = now() where experiment_key = _key;
  insert into public.admin_audit_log(admin_id,action,target_type,metadata)
    values (auth.uid(),'ab.stop','experiment', jsonb_build_object('key',_key));
end $$;

create or replace function public.admin_get_ab_summary(_key text)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare _out jsonb;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  select jsonb_build_object(
    'experiment', (select to_jsonb(e) from public.ab_experiments e where e.experiment_key=_key),
    'assignments_by_variant', (
      select coalesce(jsonb_object_agg(variant, c), '{}'::jsonb)
      from (select variant, count(*) c from public.ab_assignments where experiment_key=_key group by variant) s
    ),
    'events_by_variant', (
      select coalesce(jsonb_object_agg(variant||'::'||event, jsonb_build_object('count',c,'sum_value',sv)), '{}'::jsonb)
      from (
        select variant, event, count(*) c, coalesce(sum(value),0) sv
        from public.ab_events where experiment_key=_key
        group by variant,event
      ) s
    )
  ) into _out;
  return _out;
end $$;

create or replace function public.admin_get_sim_real_conversion(_days int default 30)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare _out jsonb;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  with sim_users as (
    select distinct p.user_id
    from public.phon_balances p
    where p.updated_at >= now() - (_days || ' days')::interval
  ),
  real_dep as (
    select distinct user_id from public.deposit_requests
    where status='approved' and created_at >= now() - (_days || ' days')::interval
  )
  select jsonb_build_object(
    'days', _days,
    'sim_active_users', (select count(*) from sim_users),
    'real_depositors', (select count(*) from real_dep),
    'converted', (select count(*) from sim_users s join real_dep r on r.user_id=s.user_id),
    'total_deposit_krw', coalesce((
      select sum(amount_krw)::bigint from public.deposit_requests
      where status='approved' and created_at >= now() - (_days || ' days')::interval
    ),0)
  ) into _out;
  return _out;
end $$;

create or replace function public.admin_broadcast_send(
  _channel text, _title text, _body text, _audience jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  if _channel not in ('push','telegram','inapp') then raise exception 'bad_channel'; end if;
  insert into public.admin_broadcasts(channel,title,body,audience,status,sent_at,created_by)
    values (_channel,_title,_body,coalesce(_audience,'{}'::jsonb),'sent',now(),auth.uid())
    returning id into _id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
    values (auth.uid(),'broadcast.send','broadcast',_id,jsonb_build_object('channel',_channel,'title',_title));
  return _id;
end $$;

create or replace function public.admin_list_broadcasts(_limit int default 50)
returns setof public.admin_broadcasts
language plpgsql security definer set search_path = public stable as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  return query select * from public.admin_broadcasts order by created_at desc limit greatest(1,least(_limit,200));
end $$;

create or replace function public.admin_create_campaign(
  _kind text, _name text, _payload jsonb default '{}'::jsonb, _budget_krw bigint default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  insert into public.marketing_campaigns(kind,name,payload,budget_krw,created_by)
    values (_kind,_name,coalesce(_payload,'{}'::jsonb),coalesce(_budget_krw,0),auth.uid())
    returning id into _id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
    values (auth.uid(),'campaign.create','campaign',_id,jsonb_build_object('kind',_kind,'name',_name));
  return _id;
end $$;

create or replace function public.admin_update_campaign_status(_id uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  if _status not in ('planned','running','paused','done','canceled') then raise exception 'bad_status'; end if;
  update public.marketing_campaigns set status=_status, updated_at=now() where id=_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
    values (auth.uid(),'campaign.status','campaign',_id,jsonb_build_object('status',_status));
end $$;

create or replace function public.admin_list_campaigns(_limit int default 50)
returns setof public.marketing_campaigns
language plpgsql security definer set search_path = public stable as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if;
  return query select * from public.marketing_campaigns order by created_at desc limit greatest(1,least(_limit,200));
end $$;
