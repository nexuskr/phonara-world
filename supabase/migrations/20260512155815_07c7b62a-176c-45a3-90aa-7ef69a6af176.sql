-- PR-1: Bot strength 50% cap + SIM_ prefix enforcement

-- 1) Clamp bot_settings.strength_pct to ≤ 50 via trigger (existing CHECK ≤ 100 stays for compat)
CREATE OR REPLACE FUNCTION public.clamp_bot_strength()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.strength_pct IS NULL OR NEW.strength_pct < 0 THEN
    NEW.strength_pct := 0;
  ELSIF NEW.strength_pct > 50 THEN
    NEW.strength_pct := 50;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clamp_bot_strength ON public.bot_settings;
CREATE TRIGGER trg_clamp_bot_strength
BEFORE INSERT OR UPDATE ON public.bot_settings
FOR EACH ROW
EXECUTE FUNCTION public.clamp_bot_strength();

-- Apply clamp to current row
UPDATE public.bot_settings
SET strength_pct = LEAST(strength_pct, 50)
WHERE id = 1;

-- 2) Force SIM_ prefix on all bot_personas nicknames + enforce on future inserts
UPDATE public.bot_personas
SET nickname = 'SIM_' || nickname
WHERE nickname NOT LIKE 'SIM\_%' ESCAPE '\'
  AND nickname NOT LIKE 'DEMO\_%' ESCAPE '\';

CREATE OR REPLACE FUNCTION public.enforce_bot_persona_sim_prefix()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_synthetic IS TRUE
     AND NEW.nickname IS NOT NULL
     AND NEW.nickname NOT LIKE 'SIM\_%' ESCAPE '\'
     AND NEW.nickname NOT LIKE 'DEMO\_%' ESCAPE '\' THEN
    NEW.nickname := 'SIM_' || NEW.nickname;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_bot_persona_sim_prefix ON public.bot_personas;
CREATE TRIGGER trg_enforce_bot_persona_sim_prefix
BEFORE INSERT OR UPDATE ON public.bot_personas
FOR EACH ROW
EXECUTE FUNCTION public.enforce_bot_persona_sim_prefix();