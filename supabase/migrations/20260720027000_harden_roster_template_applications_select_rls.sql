-- roster_template_applications inherits scope from the related roster.
-- Reads require roster.view in that roster's organization, department,
-- and sub-department scope.
-- The existing applied_by ownership INSERT policy remains unchanged.

DROP POLICY IF EXISTS
  "Allow authenticated users to view template applications"
  ON public.roster_template_applications;

CREATE POLICY
  "Allow authenticated users to view template applications"
  ON public.roster_template_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rosters AS roster
      WHERE roster.id = roster_template_applications.roster_id
        AND public.user_has_action_in_scope(
          'roster.view',
          roster.organization_id,
          roster.department_id,
          roster.sub_department_id
        )
    )
  );