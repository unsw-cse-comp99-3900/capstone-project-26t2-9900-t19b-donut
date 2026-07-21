-- Harden only the four currently true remuneration-level policies.
-- Existing remuneration_levels_admin and remuneration_levels_select
-- policies remain unchanged.

DROP POLICY IF EXISTS
  "Authenticated users can manage remuneration_levels"
ON public.remuneration_levels;

CREATE POLICY
  "Authenticated users can manage remuneration_levels"
ON public.remuneration_levels
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);


DROP POLICY IF EXISTS
  "Authenticated users can update remuneration_levels"
ON public.remuneration_levels;

CREATE POLICY
  "Authenticated users can update remuneration_levels"
ON public.remuneration_levels
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);


DROP POLICY IF EXISTS
  "Authenticated users can view remuneration_levels"
ON public.remuneration_levels;

CREATE POLICY
  "Authenticated users can view remuneration_levels"
ON public.remuneration_levels
FOR SELECT
TO authenticated
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);


DROP POLICY IF EXISTS "public_read"
ON public.remuneration_levels;

CREATE POLICY "public_read"
ON public.remuneration_levels
FOR SELECT
TO public
USING (
  public.user_has_any_contract((SELECT auth.uid()))
);