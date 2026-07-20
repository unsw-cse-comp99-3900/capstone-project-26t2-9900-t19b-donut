-- shift_subgroups has no organization, department, or sub-department columns.
-- group_id currently has no foreign key from which scope can be derived.
-- Authenticated reads require an active contract.
-- Direct authenticated writes require global admin access.

DROP POLICY IF EXISTS
  "Authenticated users can manage shift_subgroups"
  ON public.shift_subgroups;

CREATE POLICY
  "Authenticated users can manage shift_subgroups"
  ON public.shift_subgroups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS
  "Authenticated users can update shift_subgroups"
  ON public.shift_subgroups;

CREATE POLICY
  "Authenticated users can update shift_subgroups"
  ON public.shift_subgroups
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS
  "Authenticated users can view shift_subgroups"
  ON public.shift_subgroups;

CREATE POLICY
  "Authenticated users can view shift_subgroups"
  ON public.shift_subgroups
  FOR SELECT
  TO authenticated
  USING (
    public.user_has_any_contract((SELECT auth.uid()))
  );