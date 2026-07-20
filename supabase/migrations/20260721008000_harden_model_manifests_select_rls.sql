-- Restrict global model manifest reads to users with an active contract.
-- The service_role policy remains unchanged for ML backend operations.

ALTER POLICY "model_manifests_authenticated_select"
ON public.model_manifests
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);