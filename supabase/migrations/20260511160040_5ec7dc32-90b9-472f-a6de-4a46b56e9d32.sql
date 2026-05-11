
-- Phase 4: 일일 + 주간 퀘스트 18개 추가 (총 24개)
-- 기존 metrics: mission_win, attendance, bot_claim, roulette_spin

INSERT INTO public.quests_catalog (key, name, description, period, target, metric, xp_reward, credit_reward, active) VALUES
-- 일일 (9개 추가, 기존 3개 + 신규 9개 = 12개)
('d_mission_1',   '첫 미션 시작',     '오늘 첫 미션 1회 성공',           'daily',   1, 'mission_win',   50,   500, true),
('d_mission_3',   '미션 3연속',       '오늘 미션 3회 성공',               'daily',   3, 'mission_win',  120,  2000, true),
('d_mission_10',  '미션 10번 도전',    '오늘 미션 10회 성공 — 1.5× 보상',  'daily',  10, 'mission_win',  300,  6000, true),
('d_mission_20',  '미션 마라톤 20',    '오늘 미션 20회 성공 — 황금 보너스', 'daily',  20, 'mission_win',  600, 12000, true),
('d_attend_1',    '오늘의 출석',       '오늘 출석 도장 1회',                'daily',   1, 'attendance',    60,  1000, true),
('d_roulette_3',  '럭키 3회 돌리기',   '오늘 룰렛 3회 — 잭팟 도전',          'daily',   3, 'roulette_spin', 80,  1800, true),
('d_roulette_5',  '럭키 5회 돌리기',   '오늘 룰렛 5회 — 운빨 풀스윙',        'daily',   5, 'roulette_spin',180,  4000, true),
('d_bot_3',       'AI 봇 3건 수확',    '오늘 AI 봇 보상 3건 수령',          'daily',   3, 'bot_claim',    150,  3500, true),
('d_bot_5',       'AI 봇 자동수익 5',  '오늘 AI 봇 보상 5건 수령',          'daily',   5, 'bot_claim',    280,  7000, true),
-- 주간 (6개 추가, 기존 3개 + 신규 6개 = 9개로 24 도달)
('w_mission_100', '주간 미션 마스터',   '이번 주 미션 100회 성공',           'weekly', 100, 'mission_win', 2000,  80000, true),
('w_mission_200', '주간 미션 챔피언',   '이번 주 미션 200회 성공',           'weekly', 200, 'mission_win', 4000, 180000, true),
('w_mission_500', '주간 미션 황제',     '이번 주 미션 500회 성공 — EMPIRE급', 'weekly', 500, 'mission_win', 8000, 500000, true),
('w_roulette_20', '주간 럭키 20',      '이번 주 룰렛 20회',                  'weekly',  20, 'roulette_spin', 800, 18000, true),
('w_roulette_50', '주간 럭키 50',      '이번 주 룰렛 50회',                  'weekly',  50, 'roulette_spin',1800, 50000, true),
('w_bot_30',      '주간 봇 자동화 30', '이번 주 AI 봇 보상 30건',            'weekly',  30, 'bot_claim',    1500, 45000, true),
('w_bot_50',      '주간 봇 마스터 50', '이번 주 AI 봇 보상 50건',            'weekly',  50, 'bot_claim',    2500, 85000, true)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      target = EXCLUDED.target,
      xp_reward = EXCLUDED.xp_reward,
      credit_reward = EXCLUDED.credit_reward,
      active = EXCLUDED.active;
