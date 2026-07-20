-- demand_templates is a global demand-engine template library.
-- Administrators and authenticated users with an active contract may read it.
-- Existing manager INSERT, UPDATE, and DELETE policies remain unchanged.

DROP POLICY IF EXISTS
  "authenticated_read_demand_templates"
  ON public.demand_templates;

CREATE POLICY
  "authenticated_read_demand_templates"
  ON public.demand_templates
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.user_has_any_contract((SELECT auth.uid()))
  );