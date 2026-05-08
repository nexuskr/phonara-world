
DO $$
DECLARE
  r1 jsonb; r2 jsonb; r3 jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  r1 := settle_viral_milestone('aaaaaaaa-0000-0000-0000-000000000001'::uuid,'M1','kakao_friend_share_1');
  r2 := settle_viral_milestone('aaaaaaaa-0000-0000-0000-000000000001'::uuid,'M1','kakao_openchat_post_1');
  r3 := settle_viral_milestone('aaaaaaaa-0000-0000-0000-000000000001'::uuid,'M1','kakao_friend_share_1');
  RAISE NOTICE 'PR3_SMOKE valid=%', r1;
  RAISE NOTICE 'PR3_SMOKE invalid=%', r2;
  RAISE NOTICE 'PR3_SMOKE retry=%', r3;
END $$;
