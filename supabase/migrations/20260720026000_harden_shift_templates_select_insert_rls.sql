-- shift_templates derives organization scope through department_id.
-- Template creation and reads reuse the existing scoped template helper.
-- Existing draft UPDATE and owner-draft DELETE policies remain unchanged.

DROP POLICY IF EXISTS
  "Authenticated users can create templates"
  ON public.shift_templates;

CREATE POLICY
  "Authenticated users can create templates"
  ON public.shift_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.departments AS department
      LEFT JOIN public.sub_departments AS sub_department
        ON sub_department.id = shift_templates.sub_department_id
      WHERE department.id = shift_templates.department_id
        AND (
          shift_templates.sub_department_id IS NULL
          OR sub_department.department_id = department.id
        )
        AND public.auth_can_create_template(
          department.organization_id,
          department.id,
          shift_templates.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can view templates"
  ON public.shift_templates;

CREATE POLICY
  "Authenticated users can view templates"
  ON public.shift_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.departments AS department
      LEFT JOIN public.sub_departments AS sub_department
        ON sub_department.id = shift_templates.sub_department_id
      WHERE department.id = shift_templates.department_id
        AND (
          shift_templates.sub_department_id IS NULL
          OR sub_department.department_id = department.id
        )
        AND public.auth_can_create_template(
          department.organization_id,
          department.id,
          shift_templates.sub_department_id
        )
    )
  );