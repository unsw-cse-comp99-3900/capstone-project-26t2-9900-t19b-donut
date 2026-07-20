-- licenses is a global reference dictionary without organization,
-- department, or sub-department scope columns.
-- Authenticated reads require an active contract.
-- Direct authenticated inserts require global admin access.

DROP POLICY IF EXISTS "Authenticated users can create licenses"
ON public.licenses;

CREATE POLICY "Authenticated users can create licenses"
ON public.licenses
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

DROP POLICY IF EXISTS "Authenticated users can view licenses"
ON public.licenses;

CREATE POLICY "Authenticated users can view licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);