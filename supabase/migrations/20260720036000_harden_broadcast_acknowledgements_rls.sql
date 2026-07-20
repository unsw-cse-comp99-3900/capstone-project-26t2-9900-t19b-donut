-- Employees may acknowledge only broadcasts they can access and only as
-- themselves. Broadcast group admins and system managers may inspect and
-- manage acknowledgement records in their broadcast scope.
--
-- broadcast_acknowledgements has no broadcast_id foreign key, so WITH CHECK
-- also verifies that the referenced broadcast exists.

DROP POLICY IF EXISTS
  "Enable all access for authenticated users on acks"
  ON public.broadcast_acknowledgements;

CREATE POLICY
  "Enable all access for authenticated users on acks"
  ON public.broadcast_acknowledgements
  FOR ALL
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.broadcasts AS broadcast
      WHERE broadcast.id = broadcast_acknowledgements.broadcast_id
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
      WHERE broadcast.id = broadcast_acknowledgements.broadcast_id
        AND broadcast.requires_acknowledgement = true
        AND (
          public.is_broadcast_system_manager()
          OR public.get_broadcast_group_role(
            public.get_broadcast_channel_group_id(broadcast.channel_id)
          ) IS NOT NULL
        )
    )
  );