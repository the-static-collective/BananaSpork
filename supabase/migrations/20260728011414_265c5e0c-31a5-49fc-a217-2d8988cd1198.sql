-- Cross-runtime parity helper: exposes canonical_json_text + sha256_hex
-- through a single SECURITY DEFINER function granted to authenticated only.
-- Returns computed strings only; no privileged data is reachable.
CREATE OR REPLACE FUNCTION public.debug_canonical_hash(v jsonb)
RETURNS TABLE(canonical text, hash text)
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT bananagram_core.canonical_json_text(v),
         bananagram_core.sha256_hex(bananagram_core.canonical_json_text(v));
$$;
ALTER FUNCTION public.debug_canonical_hash(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.debug_canonical_hash(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debug_canonical_hash(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
