-- Restrict global VenueOps series reference-data reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_series"
ON public.venueops_series
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);