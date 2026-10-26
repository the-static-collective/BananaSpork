-- FIELD-SPECIMEN-002 · READ-ONLY preflight for the deliberately selected BananaSpork project.
-- This DOES NOT insert sample users, apply a migration, prove RLS, or certify delivery.
-- Do not run against the Garden pantry-gate project merely because it is active.
WITH target AS (
 SELECT to_regclass('public.circle_messages') AS messages
), metadata AS (
 SELECT c.relrowsecurity AS rls
 FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname='circle_messages'
), policies AS (
 SELECT
  count(*) FILTER (
   WHERE cmd='SELECT' AND 'authenticated'=ANY(roles)
    AND (qual LIKE '%is_member_of_circle%')
  ) AS member_select,
  count(*) FILTER (
   WHERE cmd='INSERT' AND 'authenticated'=ANY(roles)
    AND (with_check LIKE '%is_member_of_circle%')
    AND (with_check LIKE '%auth.uid%')
  ) AS member_insert
 FROM pg_policies WHERE schemaname='public' AND tablename='circle_messages'
)
SELECT
 current_database() AS current_database_name,
 target.messages IS NOT NULL AS table_exists,
 COALESCE(metadata.rls,false) AS rls_enabled,
 (policies.member_select=1) AS member_select_policy_present,
 (policies.member_insert=1) AS member_insert_policy_present,
 CASE WHEN target.messages IS NOT NULL
  THEN has_table_privilege('anon', target.messages, 'SELECT')
  ELSE NULL END AS anon_has_select_privilege,
 CASE WHEN target.messages IS NOT NULL
  THEN has_table_privilege('anon', target.messages, 'INSERT')
  ELSE NULL END AS anon_has_insert_privilege,
 EXISTS(SELECT 1 FROM pg_publication_tables
  WHERE pubname='supabase_realtime'
    AND schemaname='public' AND tablename='circle_messages') AS realtime_publication_present
FROM target
CROSS JOIN policies
LEFT JOIN metadata ON true;
