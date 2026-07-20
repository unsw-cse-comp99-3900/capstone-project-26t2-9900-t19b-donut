-- Employees may read their own bids.
-- Scoped shift assigners may read all bids for shifts they can manage.
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
  IS 'Employees can view their own bids; scoped shift assigners can view bids for managed shifts.';