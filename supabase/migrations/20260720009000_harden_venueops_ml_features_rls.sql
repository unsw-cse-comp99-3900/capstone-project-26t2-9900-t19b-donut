-- venueops_ml_features is a global ML training-feature table.
-- It has no organization, department, or sub-department scope columns.
-- Anonymous reads are removed; authenticated reads require an active contract.

DROP POLICY IF EXISTS "anon_read_venueops_ml_features"
ON public.venueops_ml_features;

DROP POLICY IF EXISTS "authenticated_read_venueops_ml_features"
ON public.venueops_ml_features;

CREATE POLICY "authenticated_read_venueops_ml_features"
ON public.venueops_ml_features
FOR SELECT
TO authenticated
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);