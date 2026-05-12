create or replace function public.generate_beta_invite(
  _prefix text default 'BETA',
  _max_uses int default 1,
  _expires_in_days int default 30,
  _note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_code text;
  attempts int := 0;
begin
  if not has_role(uid, 'admin'::app_role) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if _max_uses < 1 or _max_uses > 10000 then raise exception 'invalid_max_uses'; end if;

  loop
    new_code := upper(coalesce(nullif(trim(_prefix),''),'BETA')) || '-' ||
      upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.beta_invites where code = new_code);
    attempts := attempts + 1;
    if attempts > 10 then raise exception 'code_collision'; end if;
  end loop;

  insert into public.beta_invites (code, max_uses, expires_at, note, created_by)
  values (
    new_code,
    _max_uses,
    case when _expires_in_days is null or _expires_in_days <= 0 then null
         else now() + make_interval(days => _expires_in_days) end,
    nullif(trim(coalesce(_note,'')),''),
    uid
  );

  return jsonb_build_object('ok', true, 'code', new_code);
end; $$;
revoke all on function public.generate_beta_invite(text, int, int, text) from public;
grant execute on function public.generate_beta_invite(text, int, int, text) to authenticated;

create or replace function public.admin_list_beta_invites()
returns table(
  id uuid, code text, max_uses int, uses int,
  expires_at timestamptz, note text,
  created_at timestamptz, created_by uuid
) language sql stable security definer set search_path = public as $$
  select id, code, max_uses, uses, expires_at, note, created_at, created_by
  from public.beta_invites
  where has_role(auth.uid(), 'admin'::app_role)
  order by created_at desc
  limit 500;
$$;
revoke all on function public.admin_list_beta_invites() from public;
grant execute on function public.admin_list_beta_invites() to authenticated;

insert into public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) values
  ('generate_beta_invite', '_prefix text, _max_uses integer, _expires_in_days integer, _note text', array['authenticated'], 'admin_action', 'Admin issues new beta code'),
  ('admin_list_beta_invites', '', array['authenticated'], 'admin_read', 'Admin lists beta codes')
on conflict (function_name, function_args) do update
set allowed_roles = excluded.allowed_roles, category = excluded.category, note = excluded.note, updated_at = now();