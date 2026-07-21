-- Restrict global ML prediction log reads to users with an active contract.
-- Preserve service-role access for ML backend operations.

ALTER POLICY "ml_prediction_log_authenticated_select"
ON public.ml_prediction_log
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);