CREATE OR REPLACE FUNCTION public._slot_mulberry32(_seed bigint, _index integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_hex text;
  v_value bigint;
BEGIN
  v_hex := substr(encode(extensions.digest(_seed::text || ':' || _index::text, 'sha256'), 'hex'), 1, 15);
  v_value := ('x' || v_hex)::bit(60)::bigint;
  RETURN v_value::numeric / 1152921504606846976::numeric;
END;
$$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';