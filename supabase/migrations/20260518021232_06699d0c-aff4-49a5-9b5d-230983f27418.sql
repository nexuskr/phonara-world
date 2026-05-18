INSERT INTO public.phon_balances(user_id, balance, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 0, now())
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.platform_kill_switches(key, enabled, reason)
VALUES ('phon_betting_enabled', false, 'Initial deployment')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.imperial_duel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked','settled','cancelled')),
  house_edge_bps integer NOT NULL DEFAULT 620 CHECK (house_edge_bps BETWEEN 0 AND 2000),
  min_bet numeric NOT NULL DEFAULT 100 CHECK (min_bet > 0),
  max_bet numeric NOT NULL DEFAULT 100000 CHECK (max_bet >= min_bet),
  lock_at timestamptz NOT NULL DEFAULT (now() + interval '90 seconds'),
  settle_at timestamptz,
  server_seed_hash text NOT NULL,
  server_seed text,
  winner_side text CHECK (winner_side IN ('left','right')),
  settle_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_duel_rooms_status_lock ON public.imperial_duel_rooms(status, lock_at);

CREATE TABLE IF NOT EXISTS public.imperial_duel_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.imperial_duel_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('left','right')),
  amount_phon numeric NOT NULL CHECK (amount_phon > 0),
  odds_at_place numeric NOT NULL DEFAULT 2.0 CHECK (odds_at_place > 0),
  idem_key text NOT NULL,
  placed_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  payout_phon numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','won','lost','refunded')),
  CONSTRAINT imperial_duel_bets_user_idem_key UNIQUE (user_id, idem_key)
);
CREATE INDEX IF NOT EXISTS idx_duel_bets_room_side ON public.imperial_duel_bets(room_id, side);
CREATE INDEX IF NOT EXISTS idx_duel_bets_user_placed ON public.imperial_duel_bets(user_id, placed_at DESC);

CREATE TABLE IF NOT EXISTS public.imperial_duel_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.imperial_duel_rooms(id) ON DELETE SET NULL,
  user_id uuid,
  event text NOT NULL CHECK (event IN ('bet_placed','settled','cancelled','near_miss','refunded')),
  amount_phon numeric,
  balance_before numeric,
  balance_after numeric,
  near_miss_intensity numeric CHECK (near_miss_intensity IS NULL OR (near_miss_intensity BETWEEN 0 AND 1)),
  cinematic_level integer CHECK (cinematic_level IS NULL OR cinematic_level BETWEEN 1 AND 3),
  display_random numeric,
  actual_roll numeric,
  perceived_win_rate numeric,
  server_seed_revealed text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_duel_audit_user_created ON public.imperial_duel_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_duel_audit_room_event ON public.imperial_duel_audit(room_id, event);

CREATE TABLE IF NOT EXISTS public.imperial_house_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.imperial_duel_rooms(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('edge','pot_in','pot_out','refund')),
  amount_phon numeric NOT NULL,
  balance_after numeric NOT NULL,
  operator_isolation_flag boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_house_ledger_created ON public.imperial_house_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_house_ledger_room_kind ON public.imperial_house_ledger(room_id, kind);

ALTER TABLE public.imperial_duel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imperial_duel_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imperial_duel_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imperial_house_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY duel_rooms_read_authn ON public.imperial_duel_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY duel_rooms_admin_all ON public.imperial_duel_rooms FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY duel_bets_select_own ON public.imperial_duel_bets FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY duel_bets_admin_all ON public.imperial_duel_bets FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY duel_audit_select_own ON public.imperial_duel_audit FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY duel_audit_admin_all ON public.imperial_duel_audit FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY house_ledger_admin_all ON public.imperial_house_ledger FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));