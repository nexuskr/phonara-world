
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.join_guild(_guild_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _count int; _max int; _seed boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF EXISTS(SELECT 1 FROM public.guild_members WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'already_in_guild';
  END IF;
  SELECT member_count, max_members, is_seed INTO _count, _max, _seed
    FROM public.guilds WHERE id = _guild_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'guild_not_found'; END IF;
  IF _seed THEN RAISE EXCEPTION 'seed_guild_not_joinable'; END IF;
  IF _count >= _max THEN RAISE EXCEPTION 'guild_full'; END IF;
  INSERT INTO public.guild_members(guild_id, user_id) VALUES(_guild_id, _uid);
  UPDATE public.guilds SET member_count = member_count + 1, updated_at = now() WHERE id = _guild_id;
  RETURN true;
END $$;

INSERT INTO public.guilds (name, emblem, leader_id, total_power, member_count, max_members, description, is_seed, created_at)
SELECT n.gname, n.gemblem, '00000000-0000-0000-0000-000000000000'::uuid,
  (1500000 + floor(random() * 12000000))::bigint,
  (120 + floor(random() * 9680))::int,
  10000,
  n.gdesc,
  true,
  now() - (random() * interval '180 days')
FROM (VALUES
  ('강남제국','👑','강남 출신 코인 정복자들의 본거지'),
  ('부산정복단','⚓','광안리에서 출발한 항해사 길드'),
  ('대구레전드','🔥','경상도 최강 트레이더 연합'),
  ('인천파이오니어','🚀','인천공항처럼 빠른 입출금'),
  ('광주황제단','🌟','호남 코인 황제들의 결사체'),
  ('대전과학단','🧪','데이터 기반 진영'),
  ('울산정유소','🛢️','블루칼라 출신 단기 매매 그룹'),
  ('수원성단','🏯','정조의 후예들 — 장기 보유'),
  ('성남판교군단','💻','IT 종사자 길드'),
  ('일산호수단','🌊','30대 직장인 모임'),
  ('분당프리미엄','💎','강남 다음은 분당'),
  ('제주도황금단','🌴','한라산 정상까지'),
  ('홍대언더','🎸','20대 인디 트레이더'),
  ('이태원글로벌','🌍','외국인 동료들과 함께'),
  ('명동VIP','💼','패션업 종사자 다수'),
  ('잠실타워','🗼','월급 외 수익 5천 클럽'),
  ('동대문새벽','🌙','새벽 시장 사장님들'),
  ('마포한강','🌉','한강뷰 아파트 단톡방'),
  ('압구정로데오','💄','강남 사모님 길드'),
  ('청담럭셔리','🥂','외제차 오너 전용'),
  ('서초법정','⚖️','법조계 종사자'),
  ('용산미군부대','🪖','퇴역 군인 모임'),
  ('노원공무원','📑','공무원 부수입 클럽'),
  ('관악고시촌','📚','준비생들의 마지막 희망'),
  ('신촌청춘단','🎓','대학생 자유로운 영혼'),
  ('역삼테헤란','🏢','스타트업 직원 연합'),
  ('을지로힙스터','☕','3040 카페 사장 모임'),
  ('충무로영화단','🎬','영화업 종사자'),
  ('가락시장단','🐟','새벽 도매상 사장님'),
  ('남대문상인회','🛍️','패션 도매 사장 모임'),
  ('판교개발자','⌨️','네카라쿠배 출신'),
  ('여의도증권가','📊','전직 증권맨 다수'),
  ('한남동재벌','💎','상위 1% 클럽'),
  ('성수동크리에이터','🎨','크리에이터 + 디자이너'),
  ('망원동힙','🍷','와인바 단골 모임'),
  ('연남동프리','🦋','프리랜서 연대'),
  ('합정MZ','📱','20대 후반 길드'),
  ('압구정중년','🎩','40대 자산가 모임'),
  ('일산킨텍스','🏟️','경기 북부 거점'),
  ('파주출판단','📖','출판업 종사자'),
  ('안양주민','🏘️','경기 남부 평범한 직장인'),
  ('수원화성수비대','🛡️','보수적 장기 투자자'),
  ('의정부방어선','🛟','월 50만원 부수입 보장'),
  ('하남스타필드','🛒','육아맘 길드'),
  ('남양주별빛','✨','퇴직 후 인생 2막'),
  ('포항제철단','🏭','산업단지 출신'),
  ('전주한옥마을','🏡','전북 호남 보수파'),
  ('강릉바다단','🏖️','강원도 디지털 노마드'),
  ('속초오징어단','🦑','동해 어업 종사자'),
  ('세종행정도시','🏛️','공공기관 직원')
) AS n(gname, gemblem, gdesc)
ON CONFLICT (name) DO NOTHING;
