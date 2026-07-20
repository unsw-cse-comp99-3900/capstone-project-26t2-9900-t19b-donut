-- Organization-owned event tags inherit organization-level shift scope.
-- Global tags may be read by active contractors and managed by admins.
-- Existing duplicate policies are retained but all true expressions
-- are replaced so no permissive policy bypass remains.

DROP POLICY IF EXISTS
  "Allow authenticated users to manage event tags"
  ON public.event_tags;

CREATE POLICY
  "Allow authenticated users to manage event tags"
  ON public.event_tags
  FOR ALL
  TO authenticated
  USING (
    (
      organization_id IS NULL
      AND public.is_admin()
    )
    OR (
      organization_id IS NOT NULL
      AND public.user_has_action_in_scope(
        'shift.edit',
        organization_id,
        NULL,
        NULL
      )
    )
  )
  WITH CHECK (
    (
      organization_id IS NULL
      AND public.is_admin()
    )
    OR (
      organization_id IS NOT NULL
      AND public.user_has_action_in_scope(
        'shift.edit',
        organization_id,
        NULL,
        NULL
      )
    )
  );

DROP POLICY IF EXISTS
  "Allow authenticated users to view event tags"
  ON public.event_tags;

CREATE POLICY
  "Allow authenticated users to view event tags"
  ON public.event_tags
  FOR SELECT
  TO authenticated
  USING (
    (
      organization_id IS NULL
      AND public.user_has_any_contract((SELECT auth.uid()))
    )
    OR (
      organization_id IS NOT NULL
      AND public.user_has_action_in_scope(
        'shift.view',
        organization_id,
        NULL,
        NULL
      )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can create event tags"
  ON public.event_tags;

CREATE POLICY
  "Authenticated users can create event tags"
  ON public.event_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      organization_id IS NULL
      AND public.is_admin()
    )
    OR (
      organization_id IS NOT NULL
      AND public.user_has_action_in_scope(
        'shift.edit',
        organization_id,
        NULL,
        NULL
      )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can view event tags"
  ON public.event_tags;

CREATE POLICY
  "Authenticated users can view event tags"
  ON public.event_tags
  FOR SELECT
  TO authenticated
  USING (
    (
      organization_id IS NULL
      AND public.user_has_any_contract((SELECT auth.uid()))
    )
    OR (
      organization_id IS NOT NULL
      AND public.user_has_action_in_scope(
        'shift.view',
        organization_id,
        NULL,
        NULL
      )
    )
  );