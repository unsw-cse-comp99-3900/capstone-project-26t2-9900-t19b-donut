-- skills is a global reference dictionary without organization,
-- department, or sub-department scope columns.
-- Authenticated reads require an active contract.
-- Direct authenticated writes require global admin access.

DROP POLICY IF EXISTS "Authenticated users can create skills"
ON public.skills;

CREATE POLICY "Authenticated users can create skills"
ON public.skills
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

DROP POLICY IF EXISTS "Authenticated users can update skills"
ON public.skills;

CREATE POLICY "Authenticated users can update skills"
ON public.skills
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

DROP POLICY IF EXISTS "Authenticated users can view skills"
ON public.skills;

CREATE POLICY "Authenticated users can view skills"
ON public.skills
FOR SELECT
TO authenticated
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);