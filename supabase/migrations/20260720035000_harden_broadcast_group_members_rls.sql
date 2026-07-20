-- broadcast_group_members inherits access from the broadcast group.
-- Group admins and broadcast system managers may manage membership.
-- Employees may read their own membership; users with a broadcast group role
-- may read the membership directory for that group.

DROP POLICY IF EXISTS
  "Authenticated users can add group members"
  ON public.broadcast_group_members;

CREATE POLICY
  "Authenticated users can add group members"
  ON public.broadcast_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_broadcast_system_manager()
    OR public.get_broadcast_group_role(group_id) = 'admin'
  );

DROP POLICY IF EXISTS
  "Authenticated users can remove group members"
  ON public.broadcast_group_members;

CREATE POLICY
  "Authenticated users can remove group members"
  ON public.broadcast_group_members
  FOR DELETE
  TO authenticated
  USING (
    public.is_broadcast_system_manager()
    OR public.get_broadcast_group_role(group_id) = 'admin'
  );

DROP POLICY IF EXISTS
  "Authenticated users can update group members"
  ON public.broadcast_group_members;

CREATE POLICY
  "Authenticated users can update group members"
  ON public.broadcast_group_members
  FOR UPDATE
  TO authenticated
  USING (
    public.is_broadcast_system_manager()
    OR public.get_broadcast_group_role(group_id) = 'admin'
  )
  WITH CHECK (
    public.is_broadcast_system_manager()
    OR public.get_broadcast_group_role(group_id) = 'admin'
  );

DROP POLICY IF EXISTS
  "Authenticated users can view group members"
  ON public.broadcast_group_members;

CREATE POLICY
  "Authenticated users can view group members"
  ON public.broadcast_group_members
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR public.is_broadcast_system_manager()
    OR public.get_broadcast_group_role(group_id) IS NOT NULL
  );