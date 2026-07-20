-- Managers selecting a bid winner write an audit event through the shift
-- assignment flow. Allow either shift editors or scoped shift assigners
-- to insert events for the related shift.
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
        AND (
          public.user_has_action_in_scope(
            'shift.edit',
            shift.organization_id,
            shift.department_id,
            shift.sub_department_id
          )
          OR public.user_has_action_in_scope(
            'shift.assign',
            shift.organization_id,
            shift.department_id,
            shift.sub_department_id
          )
        )
    )
  );

COMMENT ON POLICY
  "Authenticated users can insert shift events"
  ON public.shift_events
  IS 'Scoped shift editors or shift assigners can write audit events for the related shift.';