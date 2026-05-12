create or replace function public.get_payout_ops_stats_24h()
returns jsonb language sql stable security definer set search_path = public as $$
  with c24 as (
    select * from public.withdrawal_requests
    where status = 'completed' and completed_at >= now() - interval '24 hours'
  ),
  w24 as (
    select * from public.withdrawal_requests where created_at >= now() - interval '24 hours'
  )
  select jsonb_build_object(
    'window','24h',
    'generated_at', now(),
    'requested_count',  (select count(*) from w24),
    'requested_amount', (select coalesce(sum(amount),0) from w24),
    'completed_count',  (select count(*) from c24),
    'completed_amount', (select coalesce(sum(amount),0) from c24),
    'pending_count',    (select count(*) from public.withdrawal_requests where status='pending'),
    'median_minutes',   coalesce(round((
        select percentile_cont(0.5) within group (order by extract(epoch from (completed_at - created_at)))
        from c24 where completed_at is not null)/60.0)::int, 0),
    'p95_minutes',      coalesce(round((
        select percentile_cont(0.95) within group (order by extract(epoch from (completed_at - created_at)))
        from c24 where completed_at is not null)/60.0)::int, 0)
  );
$$;
revoke all on function public.get_payout_ops_stats_24h() from public;
grant execute on function public.get_payout_ops_stats_24h() to anon, authenticated;

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  doc_key text not null,
  version text not null,
  locale text not null default 'ko',
  title text not null,
  body_md text not null,
  effective_at timestamptz not null default now(),
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (doc_key, version, locale)
);
create index if not exists idx_legal_documents_current
  on public.legal_documents (doc_key, locale) where is_current;
alter table public.legal_documents enable row level security;
drop policy if exists "legal_public_read" on public.legal_documents;
create policy "legal_public_read" on public.legal_documents for select to anon, authenticated using (true);
drop policy if exists "legal_admin_write" on public.legal_documents;
create policy "legal_admin_write" on public.legal_documents for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create table if not exists public.user_legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_key text not null,
  version text not null,
  locale text not null default 'ko',
  consented_at timestamptz not null default now(),
  user_agent text,
  ip_hash text,
  unique (user_id, doc_key, version)
);
create index if not exists idx_ulc_user on public.user_legal_consents (user_id, consented_at desc);
alter table public.user_legal_consents enable row level security;
drop policy if exists "ulc_self_read" on public.user_legal_consents;
create policy "ulc_self_read" on public.user_legal_consents for select to authenticated using (auth.uid() = user_id);
drop policy if exists "ulc_admin_read" on public.user_legal_consents;
create policy "ulc_admin_read" on public.user_legal_consents for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));

create or replace function public.record_legal_consent(_doc_keys text[], _user_agent text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); k text; doc record; cnt int := 0;
begin
  if uid is null then raise exception 'auth_required' using errcode = '42501'; end if;
  if _doc_keys is null or array_length(_doc_keys,1) is null then raise exception 'doc_keys_required'; end if;
  foreach k in array _doc_keys loop
    select doc_key, version, locale into doc from public.legal_documents
      where doc_key = k and is_current = true order by effective_at desc limit 1;
    if not found then continue; end if;
    insert into public.user_legal_consents (user_id, doc_key, version, locale, user_agent)
      values (uid, doc.doc_key, doc.version, doc.locale, left(coalesce(_user_agent,''), 512))
      on conflict (user_id, doc_key, version) do nothing;
    if found then cnt := cnt + 1; end if;
  end loop;
  return jsonb_build_object('ok', true, 'recorded', cnt);
end; $$;
revoke all on function public.record_legal_consent(text[], text) from public;
grant execute on function public.record_legal_consent(text[], text) to authenticated;

create or replace function public.get_my_legal_consent_status()
returns jsonb language sql stable security definer set search_path = public as $$
  with cur as (select doc_key, version, locale, title from public.legal_documents where is_current = true),
  mine as (select doc_key, version from public.user_legal_consents where user_id = auth.uid())
  select jsonb_build_object(
    'authenticated', auth.uid() is not null,
    'documents', coalesce((select jsonb_agg(jsonb_build_object(
      'doc_key', cur.doc_key, 'version', cur.version, 'title', cur.title,
      'consented', exists (select 1 from mine where mine.doc_key = cur.doc_key and mine.version = cur.version)
    )) from cur), '[]'::jsonb)
  );
$$;
revoke all on function public.get_my_legal_consent_status() from public;
grant execute on function public.get_my_legal_consent_status() to authenticated;

insert into public.legal_documents (doc_key, version, locale, title, body_md, is_current) values
  ('terms', 'v1', 'ko', 'Phonara 이용약관 v1',
$md$# Phonara 이용약관 v1

본 서비스(Phonara.world)는 행동경제학 기반 시뮬레이션·보상 플랫폼입니다.

## 1. 서비스 성격
- 가상 자산/시뮬레이션 토큰 기반의 게임형 학습·엔터테인먼트 플랫폼.
- 보상은 **현금 등가물이 아닌 시스템 내 자산**.

## 2. 사용자 의무
- 만 19세 이상만 이용 가능.
- 어뷰징·다중 계정·자동화 봇 금지.

## 3. 출금 및 정산
- 본인 인증(TOTP 또는 OTP) 후 출금 가능.
- 이상 거래 감지 시 24시간 자동 동결될 수 있음.

## 4. 책임 한계
- 변동성 손실은 본인 책임.
- 본 서비스는 **금융 자문/투자 권유가 아님**.$md$, true),
  ('privacy', 'v1', 'ko', 'Phonara 개인정보 처리방침 v1',
$md$# 개인정보 처리방침 v1

## 수집 항목
- 이메일, 닉네임, 휴대전화(선택), 디바이스 핑거프린트(보안 목적)
- 출금 정보(은행/지갑 주소) — 출금 신청 시에만 사용

## 보유 기간
- 회원 탈퇴 시 즉시 파기. 단, 법령상 보존 의무가 있는 거래 기록은 5년 보관.

## 제3자 제공
- 제3자에게 제공하지 않습니다. 외부 결제/송금 처리 시 필요한 최소 정보만 위탁됩니다.

## 보안
- 모든 민감 컬럼은 RLS + SECURITY DEFINER 함수로 보호.
- 출금은 강제 다단계 인증(AAL2 / OTP) 적용.$md$, true),
  ('risk', 'v1', 'ko', '리스크 고지 v1',
$md$# 리스크 고지 v1

## 변동성 리스크
- 트레이딩 시뮬레이션은 **고변동성** 환경. 단기간에 보유 자산이 크게 감소할 수 있음.

## 도파민 루프 고지
- 본 서비스는 행동경제학 기반의 가변 비율 강화 메커니즘을 사용합니다.
- 과몰입 위험이 있으니 1일 이용 시간을 스스로 관리하세요.

## 자가진단
- 일상 생활에 지장이 있다면 즉시 이용을 중단하고 한국도박문제예방치유원(1336)에 상담하세요.

## 책임 한계
- 본 서비스는 **금융 투자 상품이 아닙니다**. 손실에 대한 보상 책임이 없습니다.$md$, true)
on conflict (doc_key, version, locale) do nothing;

insert into public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) values
  ('get_payout_ops_stats_24h', '', array['anon','authenticated'], 'public_read', 'Trust center payout snapshot'),
  ('record_legal_consent',     '_doc_keys text[], _user_agent text', array['authenticated'], 'user_action', 'User records legal consent'),
  ('get_my_legal_consent_status', '', array['authenticated'], 'user_read', 'User checks legal consent status')
on conflict (function_name, function_args) do update
set allowed_roles = excluded.allowed_roles,
    category = excluded.category,
    note = excluded.note,
    updated_at = now();