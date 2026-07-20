-- shift_events is an event/audit ledger.
-- Direct inserts require shift.edit permission in the related shift scope.
-- Existing SELECT policies remain unchanged.

DROP POLICY IF EXISTS
  "Authenticated users can insert shift events"
  ON public.shift_events;

CREATE POLICY
  "Authenticated users can insert shift events"
  ON public.shift_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_events.shift_id
        AND public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  );