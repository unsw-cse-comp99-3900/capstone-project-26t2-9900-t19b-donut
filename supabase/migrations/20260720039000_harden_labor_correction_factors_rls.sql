-- labor_correction_factors is a global ML configuration table.
-- Authenticated users with an active contract may read it.
-- Only global administrators may update correction factors.
-- Anonymous access is denied because user_has_any_contract() returns false
-- without an authenticated auth.uid().
DROP POLICY IF EXISTS
  "Allow anon select on labor_correction_factors"
  ON public.labor_correction_factors;

CREATE POLICY
  "Allow anon select on labor_correction_factors"
  ON public.labor_correction_factors
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.user_has_any_contract((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS
  "authenticated_read_labor_correction_factors"
  ON public.labor_correction_factors;

CREATE POLICY
  "authenticated_read_labor_correction_factors"
  ON public.labor_correction_factors
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.user_has_any_contract((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS
  "authenticated_update_labor_correction_factors"
  ON public.labor_correction_factors;

CREATE POLICY
  "authenticated_update_labor_correction_factors"
  ON public.labor_correction_factors
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );