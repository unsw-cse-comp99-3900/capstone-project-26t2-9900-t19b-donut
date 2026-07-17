-- User administration is reserved for Epsilon (organization admin) and
-- Zeta (system admin). Delta is a department manager, not an administrator.

CREATE OR REPLACE FUNCTION public.auth_can_manage_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_access_certificates AS certificate
    WHERE certificate.user_id = auth.uid()
      AND certificate.certificate_type = 'Y'
      AND certificate.access_level IN ('epsilon', 'zeta')
      AND certificate.is_active = true
  ) OR EXISTS (
    -- Preserve access for installations that still use the legacy admin role.
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.legacy_system_role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.auth_can_manage_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_users() TO service_role;

DROP POLICY IF EXISTS "profiles_manage_delta" ON public.profiles;
CREATE POLICY "profiles_manage_admin"
ON public.profiles
TO authenticated
USING (public.auth_can_manage_users())
WITH CHECK (public.auth_can_manage_users());

DROP POLICY IF EXISTS "contracts_manage_delta" ON public.user_contracts;
CREATE POLICY "contracts_manage_admin"
ON public.user_contracts
TO authenticated
USING (public.auth_can_manage_users())
WITH CHECK (public.auth_can_manage_users());

COMMENT ON FUNCTION public.auth_can_manage_users() IS
  'True only for active Epsilon/Zeta Type-Y certificate holders or legacy admins.';
