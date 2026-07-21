-- Restrict global VenueOps function-type lookup reads
-- to users with an active contract.

ALTER POLICY "authenticated_read_venueops_function_types"
ON public.venueops_function_types
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);