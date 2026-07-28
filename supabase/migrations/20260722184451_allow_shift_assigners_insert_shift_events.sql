-- Fix the assignment regression introduced by
-- 20260720031000_harden_shift_events_insert_rls.sql.
--
-- Assigning a shift updates public.shifts and fn_capture_shift_event() then
-- records the change in public.shift_events. A caller may legitimately have
-- shift.assign without shift.edit, so requiring only shift.edit causes the
-- trigger insert (and therefore the whole assignment) to be rolled back.
--
-- Keep direct inserts scoped to the related shift; add only the permission
-- required by the assignment workflow.

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

