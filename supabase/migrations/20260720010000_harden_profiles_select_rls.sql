-- Users must be able to load their own profile during authentication.
-- Cross-profile directory reads require an active contract.
-- Existing admin-management and self-update policies remain unchanged.

DROP POLICY IF EXISTS "profiles_select_all"
ON public.profiles;

CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
  OR public.user_has_any_contract((SELECT auth.uid()))
);

COMMENT ON POLICY "profiles_select_all"
ON public.profiles
IS 'Users may read their own profile; cross-profile reads require an active contract.';