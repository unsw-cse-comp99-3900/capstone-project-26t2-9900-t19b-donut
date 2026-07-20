-- Restrict ML prediction outcomes to the associated role scope.
-- Outcomes without a role remain available only to active contract users.
-- Preserve service-role access for backend outcome computation.

ALTER POLICY "ml_prediction_outcomes_authenticated_select"
ON public.ml_prediction_outcomes
USING (
  (
    ml_prediction_outcomes.role_id IS NULL
    AND public.user_has_any_contract((SELECT auth.uid()))
  )
  OR EXISTS (
    SELECT 1
    FROM public.roles AS role
    LEFT JOIN public.sub_departments AS sub_department
      ON sub_department.id = role.sub_department_id
    JOIN public.departments AS department
      ON department.id = COALESCE(
        role.department_id,
        sub_department.department_id
      )
    WHERE role.id = ml_prediction_outcomes.role_id
      AND public.user_has_action_in_scope(
        'roster.view',
        department.organization_id,
        department.id,
        role.sub_department_id
      )
  )
);