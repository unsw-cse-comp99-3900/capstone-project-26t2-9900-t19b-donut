-- Employees may read their own bids.
-- Platform admins may perform global bid oversight.
-- Managers may read bids only for shifts where they hold shift.assign
-- in the corresponding organization/department/sub-department scope.
-- Existing INSERT, UPDATE, and DELETE policies remain unchanged.

DROP POLICY IF EXISTS
  "bids_select_all"
  ON public.shift_bids;

CREATE POLICY
  "bids_select_all"
  ON public.shift_bids
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())

    OR EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.legacy_system_role = 'admin'
    )

    OR EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_bids.shift_id
        AND public.user_has_action_in_scope(
          'shift.assign',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  );

COMMENT ON POLICY
  "bids_select_all"
  ON public.shift_bids
  IS 'Employees see their own bids; platform admins have global oversight; scoped shift assigners see bids for managed shifts.';