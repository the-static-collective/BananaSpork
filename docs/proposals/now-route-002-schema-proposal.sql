-- PROPOSAL ONLY. DO NOT APPLY TO pantry-gate, production, or any unverified project.
-- This file is intentionally outside supabase/migrations until a BananaSpork
-- source owner chooses the matching project and a two-account isolation plan.
-- NOW-ROUTE-002 — authenticated, member-scoped discovery, NOT a handoff ledger.
--
-- Public posts reveal only an approximate *chosen area center* (0.01 degree precision)
-- to other authorized Campfire members. Never insert exact home/pickup coordinates.
-- A single rural cell can still be sensitive. Explicit opt-in is required.
CREATE TABLE public.circle_now_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('food','transport','tools','other')),
  description text NOT NULL CHECK (description=btrim(description) AND char_length(description) BETWEEN 3 AND 240),
  approx_lat numeric(4,2) NOT NULL CHECK (approx_lat BETWEEN -90 AND 90),
  approx_lon numeric(5,2) NOT NULL CHECK (approx_lon BETWEEN -180 AND 180),
  radius_miles smallint NOT NULL DEFAULT 5 CHECK (radius_miles BETWEEN 1 AND 10),
  cold_chain_required boolean NOT NULL DEFAULT false,
  cold_chain_attested boolean NOT NULL DEFAULT false,
  share_with_circle boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (NOT cold_chain_required OR kind='food'),
  CHECK (expires_at > created_at + interval '4 minutes' AND expires_at <= created_at + interval '4 hours')
);
CREATE TABLE public.circle_now_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('food','transport','tools','other')),
  description text NOT NULL CHECK (description=btrim(description) AND char_length(description) BETWEEN 3 AND 240),
  approx_lat numeric(4,2) NOT NULL CHECK (approx_lat BETWEEN -90 AND 90),
  approx_lon numeric(5,2) NOT NULL CHECK (approx_lon BETWEEN -180 AND 180),
  max_miles smallint NOT NULL DEFAULT 5 CHECK (max_miles BETWEEN 1 AND 10),
  allow_matching boolean NOT NULL DEFAULT false,
  can_pickup boolean NOT NULL DEFAULT false,
  travel_minutes smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK ((can_pickup AND travel_minutes BETWEEN 0 AND 180) OR (NOT can_pickup AND travel_minutes IS NULL)),
  CHECK (expires_at > created_at + interval '4 minutes' AND expires_at <= created_at + interval '4 hours')
);

CREATE INDEX circle_now_offers_active_idx ON public.circle_now_offers(circle_id,expires_at);
CREATE INDEX circle_now_needs_active_idx ON public.circle_now_needs(circle_id,expires_at);
CREATE INDEX circle_now_offers_owner_idx ON public.circle_now_offers(owner_user_id);
CREATE INDEX circle_now_needs_owner_idx ON public.circle_now_needs(owner_user_id);

ALTER TABLE public.circle_now_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_now_needs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.circle_now_offers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.circle_now_needs FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.circle_now_offers TO authenticated;
GRANT SELECT, DELETE ON TABLE public.circle_now_needs TO authenticated;
-- Deliberately NO client INSERT permission for owner_user_id, id or created_at.
GRANT INSERT (circle_id,kind,description,approx_lat,approx_lon,radius_miles,
  cold_chain_required,cold_chain_attested,share_with_circle,expires_at)
  ON public.circle_now_offers TO authenticated;
GRANT INSERT (circle_id,kind,description,approx_lat,approx_lon,max_miles,
  allow_matching,can_pickup,travel_minutes,expires_at)
  ON public.circle_now_needs TO authenticated;

-- A signed-in member may read their own post; shared active offers/needs are
-- visible ONLY to other members of the SAME Campfire.
CREATE POLICY now_offers_select_circle ON public.circle_now_offers FOR SELECT TO authenticated
  USING (
    bananagram_core.is_member_of_circle(circle_id)
    AND (owner_user_id=(SELECT auth.uid()) OR
      (share_with_circle AND expires_at>now() AND
      (NOT cold_chain_required OR cold_chain_attested)))
  );
CREATE POLICY now_needs_select_circle ON public.circle_now_needs FOR SELECT TO authenticated
  USING (
    bananagram_core.is_member_of_circle(circle_id)
    AND (owner_user_id=(SELECT auth.uid()) OR (allow_matching AND expires_at>now()))
  );
CREATE POLICY now_offers_insert_member ON public.circle_now_offers FOR INSERT TO authenticated
  WITH CHECK (
    bananagram_core.is_member_of_circle(circle_id)
    AND owner_user_id=(SELECT auth.uid())
    AND share_with_circle
  );
CREATE POLICY now_needs_insert_member ON public.circle_now_needs FOR INSERT TO authenticated
  WITH CHECK (
    bananagram_core.is_member_of_circle(circle_id)
    AND owner_user_id=(SELECT auth.uid())
    AND allow_matching
  );
-- Withdraw by deleting your own ephemeral availability; no UPDATE grants.
CREATE POLICY now_offers_delete_owner ON public.circle_now_offers FOR DELETE TO authenticated
  USING (owner_user_id=(SELECT auth.uid()) AND bananagram_core.is_member_of_circle(circle_id));
CREATE POLICY now_needs_delete_owner ON public.circle_now_needs FOR DELETE TO authenticated
  USING (owner_user_id=(SELECT auth.uid()) AND bananagram_core.is_member_of_circle(circle_id));

-- Postgres Changes can invalidate an in-app member-scoped list. This does NOT
-- send push notifications, email/SMS or expose pickup addresses.
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_now_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_now_needs;
NOTIFY pgrst, 'reload schema';
