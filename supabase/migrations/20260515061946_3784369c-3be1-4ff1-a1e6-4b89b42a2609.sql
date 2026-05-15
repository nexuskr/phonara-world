CREATE OR REPLACE FUNCTION public._slot_mulberry32(_seed bigint, _index integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s bigint;
  t bigint;
BEGIN
  s := ((_seed + (_index::bigint * 1831565813)) & x'FFFFFFFF'::bigint);
  t := (s + x'6D2B79F5'::bigint) & x'FFFFFFFF'::bigint;
  t := ((t # (t >> 15)) * (t | 1)) & x'FFFFFFFF'::bigint;
  t := (t # (t + ((t # (t >> 7)) * (t | 61)))) & x'FFFFFFFF'::bigint;
  RETURN ((t # (t >> 14)) & x'FFFFFFFF'::bigint)::numeric / 4294967296::numeric;
END;
$$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';