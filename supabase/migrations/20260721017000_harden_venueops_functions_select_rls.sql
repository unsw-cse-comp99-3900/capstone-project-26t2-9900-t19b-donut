-- Restrict global VenueOps function reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_functions"
ON public.venueops_functions
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);