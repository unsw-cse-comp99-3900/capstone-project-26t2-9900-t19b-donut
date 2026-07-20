-- Harden autoschedule_assignments by inheriting scope from its parent session.

ALTER POLICY "autoschedule_assignments_authenticated"
ON public.autoschedule_assignments
USING (
  EXISTS (
    SELECT 1
    FROM public.autoschedule_sessions AS autoschedule_session
    WHERE autoschedule_session.id =
          autoschedule_assignments.session_id
      AND public.user_has_action_in_scope(
        'shift.assign',
        autoschedule_session.organization_id,
        autoschedule_session.department_id,
        autoschedule_session.sub_department_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.autoschedule_sessions AS autoschedule_session
    WHERE autoschedule_session.id =
          autoschedule_assignments.session_id
      AND public.user_has_action_in_scope(
        'shift.assign',
        autoschedule_session.organization_id,
        autoschedule_session.department_id,
        autoschedule_session.sub_department_id
      )
  )
);