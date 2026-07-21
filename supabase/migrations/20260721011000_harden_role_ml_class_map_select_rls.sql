-- Scope role-to-ML-class mapping reads through the associated role.

ALTER POLICY "authenticated_read_role_ml_class_map"
ON public.role_ml_class_map
USING (
  EXISTS (
    SELECT 1
    FROM public.roles AS role
    LEFT JOIN public.sub_departments AS sub_department
      ON sub_department.id = role.sub_department_id
    JOIN public.departments AS department
      ON department.id = COALESCE(
        role.department_id,
        sub_department.department_id
      )
    WHERE role.id = role_ml_class_map.role_id
      AND public.user_has_action_in_scope(
        'roster.view',
        department.organization_id,
        department.id,
        role.sub_department_id
      )
  )
);