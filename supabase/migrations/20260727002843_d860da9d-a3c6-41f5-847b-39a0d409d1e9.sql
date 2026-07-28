-- Schema + helpers + RLS. RPCs land in a follow-up migration.

CREATE SCHEMA IF NOT EXISTS bananagram_core;
CREATE SCHEMA IF NOT EXISTS bananagram_private;

REVOKE ALL ON SCHEMA bananagram_core FROM PUBLIC;
REVOKE ALL ON SCHEMA bananagram_private FROM PUBLIC;

-- ============ Tables ============

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households ON DELETE RESTRICT,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.circle_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('household','neighbor','steward')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);
CREATE INDEX circle_memberships_user_circle_idx ON public.circle_memberships (user_id, circle_id);

CREATE TABLE bananagram_private.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  redeemed_by uuid REFERENCES auth.users ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitations_active_by_circle_idx
  ON bananagram_private.invitations (circle_id, expires_at)
  WHERE redeemed_by IS NULL;

CREATE TABLE public.ledger_heads (
  circle_id uuid PRIMARY KEY REFERENCES public.circles ON DELETE CASCADE,
  head_hash text NOT NULL,
  sequence bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.witness_events (
  event_id uuid PRIMARY KEY,
  circle_id uuid NOT NULL REFERENCES public.circles ON DELETE RESTRICT,
  sequence bigint NOT NULL,
  kind text NOT NULL,
  occurred_at timestamptz NOT NULL,
  occurred_at_text text NOT NULL, -- exact ISO used inside the hashed envelope
  actor_user_id uuid NOT NULL,
  actor_label text NOT NULL,
  actor_role text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  previous_hash text NOT NULL,
  event_hash text NOT NULL,
  UNIQUE (circle_id, sequence),
  UNIQUE (circle_id, event_hash)
);
CREATE INDEX witness_events_circle_seq_idx ON public.witness_events (circle_id, sequence);
CREATE INDEX witness_events_aggregate_idx ON public.witness_events (circle_id, aggregate_id, sequence);

CREATE TABLE public.command_idempotency (
  actor_user_id uuid NOT NULL,
  scope text NOT NULL,
  idempotency_key text NOT NULL,
  command_kind text NOT NULL,
  command_hash text NOT NULL,
  receipt jsonb NOT NULL,
  event_id uuid,
  committed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_user_id, scope, idempotency_key)
);

-- ============ Grants ============
-- Direct client reads only via RLS policies below. No client writes on canonical tables.
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;

GRANT SELECT ON public.circles TO authenticated;
GRANT ALL ON public.circles TO service_role;

GRANT SELECT ON public.circle_memberships TO authenticated;
GRANT ALL ON public.circle_memberships TO service_role;

GRANT SELECT ON public.ledger_heads TO authenticated;
GRANT ALL ON public.ledger_heads TO service_role;

GRANT SELECT ON public.witness_events TO authenticated;
GRANT ALL ON public.witness_events TO service_role;

-- No client grants on command_idempotency or bananagram_private.invitations.
GRANT ALL ON public.command_idempotency TO service_role;
GRANT ALL ON bananagram_private.invitations TO service_role;

-- ============ Membership helper (non-recursive) ============
CREATE OR REPLACE FUNCTION bananagram_core.is_member_of_circle(_circle uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_memberships m
    WHERE m.circle_id = _circle AND m.user_id = auth.uid()
  );
$$;
ALTER FUNCTION bananagram_core.is_member_of_circle(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.is_member_of_circle(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION bananagram_core.is_member_of_household(_hh uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_memberships m
    JOIN public.circles c ON c.id = m.circle_id
    WHERE c.household_id = _hh AND m.user_id = auth.uid()
  );
$$;
ALTER FUNCTION bananagram_core.is_member_of_household(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.is_member_of_household(uuid) FROM PUBLIC;

-- Grant execute + schema usage only for these two helpers, to authenticated (used by RLS).
GRANT USAGE ON SCHEMA bananagram_core TO authenticated;
GRANT EXECUTE ON FUNCTION bananagram_core.is_member_of_circle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bananagram_core.is_member_of_household(uuid) TO authenticated;

-- ============ RLS ============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
-- Members of a shared circle can read each other's display names.
CREATE POLICY profiles_select_circle ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.circle_memberships mine
    JOIN public.circle_memberships theirs ON theirs.circle_id = mine.circle_id
    WHERE mine.user_id = auth.uid() AND theirs.user_id = profiles.user_id
  ));
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY households_select_member ON public.households FOR SELECT TO authenticated
  USING (bananagram_core.is_member_of_household(id));

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY circles_select_member ON public.circles FOR SELECT TO authenticated
  USING (bananagram_core.is_member_of_circle(id));

ALTER TABLE public.circle_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_select_shared ON public.circle_memberships FOR SELECT TO authenticated
  USING (bananagram_core.is_member_of_circle(circle_id));

ALTER TABLE public.ledger_heads ENABLE ROW LEVEL SECURITY;
CREATE POLICY heads_select_member ON public.ledger_heads FOR SELECT TO authenticated
  USING (bananagram_core.is_member_of_circle(circle_id));

ALTER TABLE public.witness_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_select_member ON public.witness_events FOR SELECT TO authenticated
  USING (bananagram_core.is_member_of_circle(circle_id));

-- No policies for invitations or command_idempotency: default deny for anon and authenticated.
ALTER TABLE bananagram_private.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_idempotency ENABLE ROW LEVEL SECURITY;

-- ============ Canonical JSON (matches JS canonicalJson) ============
CREATE OR REPLACE FUNCTION bananagram_core.canonical_json_text(v jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  t text;
  keys text[];
  k text;
  parts text[] := ARRAY[]::text[];
  item jsonb;
BEGIN
  IF v IS NULL THEN RETURN 'null'; END IF;
  t := jsonb_typeof(v);
  IF t = 'null' THEN RETURN 'null'; END IF;
  IF t = 'boolean' THEN
    RETURN CASE WHEN (v#>>'{}')::boolean THEN 'true' ELSE 'false' END;
  END IF;
  IF t = 'number' THEN
    RETURN v#>>'{}';
  END IF;
  IF t = 'string' THEN
    RETURN v::text;
  END IF;
  IF t = 'array' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(v) LOOP
      parts := parts || bananagram_core.canonical_json_text(item);
    END LOOP;
    RETURN '[' || array_to_string(parts, ',') || ']';
  END IF;
  IF t = 'object' THEN
    SELECT array_agg(kk ORDER BY kk) INTO keys FROM jsonb_object_keys(v) kk;
    IF keys IS NULL THEN RETURN '{}'; END IF;
    FOREACH k IN ARRAY keys LOOP
      parts := parts || (to_jsonb(k)::text || ':' || bananagram_core.canonical_json_text(v -> k));
    END LOOP;
    RETURN '{' || array_to_string(parts, ',') || '}';
  END IF;
  RAISE EXCEPTION 'canonical_json_text: unsupported jsonb type %', t;
END;
$$;
ALTER FUNCTION bananagram_core.canonical_json_text(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.canonical_json_text(jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION bananagram_core.sha256_hex(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(extensions.digest(s, 'sha256'), 'hex')
$$;
ALTER FUNCTION bananagram_core.sha256_hex(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION bananagram_core.sha256_hex(text) FROM PUBLIC;

-- Test-only helper used by cross-runtime fixture tests to prove SQL/JS parity.
-- Grant to authenticated so tests can call it; it returns only computed strings.
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
