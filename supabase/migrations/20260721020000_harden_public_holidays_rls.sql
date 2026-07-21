-- Restrict global public-holiday writes to administrators
-- and reads to users with an active contract.

ALTER POLICY "Admins can manage public holidays"
ON public.public_holidays
WITH CHECK (
  public.is_admin()
);

ALTER POLICY "Everyone can view public holidays"
ON public.public_holidays
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);