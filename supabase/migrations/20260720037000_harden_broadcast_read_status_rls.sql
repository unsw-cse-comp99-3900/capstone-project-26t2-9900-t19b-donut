-- Employees may record read status only for themselves and for broadcasts
-- they can access. Broadcast group admins and system managers may inspect
-- and manage read-status records in their broadcast scope.
--
-- broadcast_read_status has no broadcast_id foreign key, so WITH CHECK
-- explicitly verifies that the referenced broadcast exists.

DROP POLICY IF EXISTS
  "Enable all access for authenticated users on read status"
  ON public.broadcast_read_status;

CREATE POLICY
  "Enable all access for authenticated users on read status"
  ON public.broadcast_read_status
  FOR ALL
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.broadcasts AS broadcast
      WHERE broadcast.id = broadcast_read_status.broadcast_id
        AND (
          public.is_broadcast_system_manager()
          OR public.get_broadcast_group_role(
            public.get_broadcast_channel_group_id(broadcast.channel_id)
          ) = 'admin'
        )
    )
  )
  WITH CHECK (
    employee_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.broadcasts AS broadcast
      WHERE broadcast.id = broadcast_read_status.broadcast_id
        AND (
          public.is_broadcast_system_manager()
          OR public.get_broadcast_group_role(
            public.get_broadcast_channel_group_id(broadcast.channel_id)
          ) IS NOT NULL
        )
    )
  );