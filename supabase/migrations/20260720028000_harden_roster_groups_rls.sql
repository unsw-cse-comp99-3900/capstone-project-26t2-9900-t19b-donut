-- roster_groups inherits organization, department, and sub-department
-- scope from its related roster.
-- Reads require roster.view; writes require roster.edit.

DROP POLICY IF EXISTS
  "Enable read access for authenticated users"
  ON public.roster_groups;

CREATE POLICY
  "Enable read access for authenticated users"
  ON public.roster_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rosters AS roster
      WHERE roster.id = roster_groups.roster_id
        AND public.user_has_action_in_scope(
          'roster.view',
          roster.organization_id,
          roster.department_id,
          roster.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "Enable write access for authenticated users"
  ON public.roster_groups;

CREATE POLICY
  "Enable write access for authenticated users"
  ON public.roster_groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rosters AS roster
      WHERE roster.id = roster_groups.roster_id
        AND public.user_has_action_in_scope(
          'roster.edit',
          roster.organization_id,
          roster.department_id,
          roster.sub_department_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.rosters AS roster
      WHERE roster.id = roster_groups.roster_id
        AND public.user_has_action_in_scope(
          'roster.edit',
          roster.organization_id,
          roster.department_id,
          roster.sub_department_id
        )
    )
  );