-- Harden autoschedule_sessions access.
-- The existing ALL policy requires shift assignment permission in the
-- row's organization/department/sub-department scope.

ALTER POLICY "autoschedule_sessions_authenticated"
ON public.autoschedule_sessions
USING (
  public.user_has_action_in_scope(
    'shift.assign',
    organization_id,
    department_id,
    sub_department_id
  )
)
WITH CHECK (
  public.user_has_action_in_scope(
    'shift.assign',
    organization_id,
    department_id,
    sub_department_id
  )
);