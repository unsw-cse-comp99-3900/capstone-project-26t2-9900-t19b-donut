-- roster_subgroups inherits scope through roster_groups and rosters.
-- Reads require roster.view; writes require roster.edit.

DROP POLICY IF EXISTS
  "Enable read access for authenticated users"
  ON public.roster_subgroups;

CREATE POLICY
  "Enable read access for authenticated users"
  ON public.roster_subgroups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_groups AS roster_group
      JOIN public.rosters AS roster
        ON roster.id = roster_group.roster_id
      WHERE roster_group.id = roster_subgroups.roster_group_id
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
  ON public.roster_subgroups;

CREATE POLICY
  "Enable write access for authenticated users"
  ON public.roster_subgroups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.roster_groups AS roster_group
      JOIN public.rosters AS roster
        ON roster.id = roster_group.roster_id
      WHERE roster_group.id = roster_subgroups.roster_group_id
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
      FROM public.roster_groups AS roster_group
      JOIN public.rosters AS roster
        ON roster.id = roster_group.roster_id
      WHERE roster_group.id = roster_subgroups.roster_group_id
        AND public.user_has_action_in_scope(
          'roster.edit',
          roster.organization_id,
          roster.department_id,
          roster.sub_department_id
        )
    )
  );