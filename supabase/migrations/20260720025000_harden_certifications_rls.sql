-- Certification management reuses the existing certificate domain helper.
-- Organization-owned certifications additionally require organization-level
-- shift scope. Global certifications may be read by active contractors.
-- Existing duplicate policies are retained, but every true expression
-- is replaced so no permissive bypass remains.

DROP POLICY IF EXISTS
  "Allow authenticated users to manage certifications"
  ON public.certifications;

CREATE POLICY
  "Allow authenticated users to manage certifications"
  ON public.certifications
  FOR ALL
  TO authenticated
  USING (
    public.auth_can_manage_certificates()
    AND (
      organization_id IS NULL
      OR public.user_has_action_in_scope(
        'shift.edit',
        organization_id,
        NULL,
        NULL
      )
    )
  )
  WITH CHECK (
    public.auth_can_manage_certificates()
    AND (
      organization_id IS NULL
      OR public.user_has_action_in_scope(
        'shift.edit',
        organization_id,
        NULL,
        NULL
      )
    )
  );

DROP POLICY IF EXISTS
  "Allow authenticated users to view certifications"
  ON public.certifications;

CREATE POLICY
  "Allow authenticated users to view certifications"
  ON public.certifications
  FOR SELECT
  TO authenticated
  USING (
    (
      organization_id IS NULL
      AND public.user_has_any_contract((SELECT auth.uid()))
    )
    OR (
      organization_id IS NOT NULL
      AND public.user_has_action_in_scope(
        'shift.view',
        organization_id,
        NULL,
        NULL
      )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can create certifications"
  ON public.certifications;

CREATE POLICY
  "Authenticated users can create certifications"
  ON public.certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.auth_can_manage_certificates()
    AND (
      organization_id IS NULL
      OR public.user_has_action_in_scope(
        'shift.edit',
        organization_id,
        NULL,
        NULL
      )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can view certifications"
  ON public.certifications;

CREATE POLICY
  "Authenticated users can view certifications"
  ON public.certifications
  FOR SELECT
  TO authenticated
  USING (
    (
      organization_id IS NULL
      AND public.user_has_any_contract((SELECT auth.uid()))
    )
    OR (
      organization_id IS NOT NULL
      AND public.user_has_action_in_scope(
        'shift.view',
        organization_id,
        NULL,
        NULL
      )
    )
  );