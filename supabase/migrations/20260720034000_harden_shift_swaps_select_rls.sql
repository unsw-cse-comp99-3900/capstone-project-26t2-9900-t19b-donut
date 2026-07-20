-- shift_swaps visibility follows swap participation and related shift scope.
-- Participants and assigned employees may read their swaps.
-- Other users require shift.view in one of the related shift scopes.
-- Existing INSERT, UPDATE, and DELETE policies remain unchanged.

DROP POLICY IF EXISTS
  "swaps_select_all"
  ON public.shift_swaps;

CREATE POLICY
  "swaps_select_all"
  ON public.shift_swaps
  FOR SELECT
  TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR target_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id IN (
        shift_swaps.requester_shift_id,
        shift_swaps.target_shift_id
      )
        AND (
          shift.assigned_employee_id = (SELECT auth.uid())
          OR public.user_has_action_in_scope(
            'shift.view',
            shift.organization_id,
            shift.department_id,
            shift.sub_department_id
          )
        )
    )
  );

COMMENT ON POLICY
  "swaps_select_all"
  ON public.shift_swaps
  IS 'Participants and assigned employees can view their swaps; other users require shift.view in a related shift scope.';