CREATE OR REPLACE FUNCTION public._slot_mulberry32(_seed BIGINT, _index INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  mask NUMERIC := 4294967295;
  s NUMERIC;
  t NUMERIC;
BEGIN
  s := mod((_seed::NUMERIC + (_index::NUMERIC * 1831565813)), 4294967296);
  t := mod(s + x'6D2B79F5'::BIGINT::NUMERIC, 4294967296);
  t := mod(((t # ((floor(t / 32768))::BIGINT)::NUMERIC) * mod(t + 1, 4294967296)), 4294967296);
  t := mod((t # mod(t + (((t # ((floor(t / 128))::BIGINT)::NUMERIC) * mod(t + 61, 4294967296)), 4294967296), 4294967296)), 4294967296);
  RETURN mod((t # ((floor(t / 16384))::BIGINT)::NUMERIC), 4294967296) / 4294967296::NUMERIC;
END;
$$;