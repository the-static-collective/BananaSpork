-- CAMPFIRE-CONVERSATION-PLANE-001
--
-- Ordinary Campfire conversation is durable shared data, but it is not Jubilee
-- witness history. Sender identity is derived from the authenticated database
-- session, never accepted from the browser.
--
-- Merging this file does not prove any live project has been changed. Apply it
-- only to the intentionally selected BananaSpork Supabase project, then run the
-- two-account / hostile-nonmember isolation proof.

CREATE TABLE public.circle_messages (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT circle_messages_body_trimmed CHECK (body = btrim(body)),
  CONSTRAINT circle_messages_body_length CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX circle_messages_circle_created_idx
  ON public.circle_messages (circle_id, created_at, id);

ALTER TABLE public.circle_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.circle_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.circle_messages TO authenticated;
GRANT ALL ON TABLE public.circle_messages TO service_role;

CREATE POLICY circle_messages_select_member
  ON public.circle_messages
  FOR SELECT
  TO authenticated
  USING (bananagram_core.is_member_of_circle(circle_id));

CREATE POLICY circle_messages_insert_member
  ON public.circle_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bananagram_core.is_member_of_circle(circle_id)
    AND sender_user_id = (SELECT auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.circle_messages;
