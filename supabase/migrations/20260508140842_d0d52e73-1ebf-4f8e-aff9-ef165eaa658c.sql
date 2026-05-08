
-- =========================================================
-- PR1: Phonara Viral Pack — Compliance Foundation
-- =========================================================

-- 1) viral_settings (singleton row, id=1)
CREATE TABLE IF NOT EXISTS public.viral_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  revenue_recognition_enabled boolean NOT NULL DEFAULT true,
  rrm_no_retroactive_payout boolean NOT NULL DEFAULT true,
  rrm_disabled_reason text,
  rrm_last_toggled_at timestamptz,
  rrm_last_toggled_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Hard lock: rrm_no_retroactive_payout cannot be flipped to false
CREATE OR REPLACE FUNCTION public.guard_viral_settings_retroactive_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rrm_no_retroactive_payout = false THEN
    RAISE EXCEPTION 'rrm_no_retroactive_payout is permanently locked to true (compliance requirement)';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_viral_settings_lock ON public.viral_settings;
CREATE TRIGGER trg_viral_settings_lock
BEFORE INSERT OR UPDATE ON public.viral_settings
FOR EACH ROW
EXECUTE FUNCTION public.guard_viral_settings_retroactive_lock();

-- Seed singleton
INSERT INTO public.viral_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.viral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY vs_public_read
ON public.viral_settings FOR SELECT
USING (true);

CREATE POLICY vs_admin_update
ON public.viral_settings FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 2) viral_attribution_chain (depth=1 enforced)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.viral_attribution_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id text NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_id uuid,
  depth smallint NOT NULL DEFAULT 1 CHECK (depth = 1),
  status text NOT NULL DEFAULT 'clicked'
    CHECK (status IN ('clicked','signed_up','activated','paying','churned')),
  milestones_reached jsonb NOT NULL DEFAULT '{}'::jsonb,
  window_expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vac_inviter ON public.viral_attribution_chain(inviter_id);
CREATE INDEX IF NOT EXISTS idx_vac_invitee ON public.viral_attribution_chain(invitee_id);
CREATE INDEX IF NOT EXISTS idx_vac_anon    ON public.viral_attribution_chain(anon_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vac_invitee_inviter
  ON public.viral_attribution_chain(invitee_id, inviter_id)
  WHERE invitee_id IS NOT NULL;

-- MLM firewall: prevent inviter from being someone else's invitee (depth>1 attempt)
CREATE OR REPLACE FUNCTION public.guard_attribution_depth_one()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_exists boolean;
BEGIN
  -- inviter cannot themselves be an invitee in another chain
  SELECT EXISTS (
    SELECT 1 FROM public.viral_attribution_chain
    WHERE invitee_id = NEW.inviter_id
  ) INTO parent_exists;

  IF parent_exists THEN
    NEW.blocked_reason := 'mlm_depth_violation';
    RAISE EXCEPTION 'attribution depth>1 not allowed (inviter % is already an invitee elsewhere)', NEW.inviter_id;
  END IF;

  -- self-attribution block
  IF NEW.inviter_id = NEW.invitee_id THEN
    NEW.blocked_reason := 'self_attribution';
    RAISE EXCEPTION 'self attribution not allowed';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vac_depth_guard ON public.viral_attribution_chain;
CREATE TRIGGER trg_vac_depth_guard
BEFORE INSERT OR UPDATE ON public.viral_attribution_chain
FOR EACH ROW
EXECUTE FUNCTION public.guard_attribution_depth_one();

ALTER TABLE public.viral_attribution_chain ENABLE ROW LEVEL SECURITY;

-- inviter or invitee or admin can read; nobody can directly write (server-side only)
CREATE POLICY vac_self_select
ON public.viral_attribution_chain FOR SELECT
USING (
  auth.uid() = inviter_id
  OR auth.uid() = invitee_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY vac_admin_write
ON public.viral_attribution_chain FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 3) viral_proof_dedupe
-- =========================================================
CREATE TABLE IF NOT EXISTS public.viral_proof_dedupe (
  proof_hash text PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  proof_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vpd_user ON public.viral_proof_dedupe(user_id);

ALTER TABLE public.viral_proof_dedupe ENABLE ROW LEVEL SECURITY;

CREATE POLICY vpd_admin_read
ON public.viral_proof_dedupe FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY vpd_self_read
ON public.viral_proof_dedupe FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
