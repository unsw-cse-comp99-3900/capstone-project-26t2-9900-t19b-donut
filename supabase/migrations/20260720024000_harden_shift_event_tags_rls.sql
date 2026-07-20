-- shift_event_tags inherits access scope from the related shift.
-- Assigned employees and scoped shift viewers may read tag associations.
-- Direct INSERT and DELETE operations require shift.edit access.
-- New associations must use a global tag or a tag from the shift organization.

DROP POLICY IF EXISTS
  "Authenticated users can delete shift event tags"
  ON public.shift_event_tags;

CREATE POLICY
  "Authenticated users can delete shift event tags"
  ON public.shift_event_tags
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      WHERE shift.id = shift_event_tags.shift_id
        AND public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can manage shift event tags"
  ON public.shift_event_tags;

CREATE POLICY
  "Authenticated users can manage shift event tags"
  ON public.shift_event_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      JOIN public.event_tags AS event_tag
        ON event_tag.id = shift_event_tags.event_tag_id
      WHERE shift.id = shift_event_tags.shift_id
        AND (
          event_tag.organization_id IS NULL
          OR event_tag.organization_id = shift.organization_id
        )
        AND public.user_has_action_in_scope(
          'shift.edit',
          shift.organization_id,
          shift.department_id,
          shift.sub_department_id
        )
    )
  );

DROP POLICY IF EXISTS
  "Authenticated users can view shift event tags"
  ON public.shift_event_tags;

CREATE POLICY
  "Authenticated users can view shift event tags"
  ON public.shift_event_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shifts AS shift
      JOIN public.event_tags AS event_tag
        ON event_tag.id = shift_event_tags.event_tag_id
      WHERE shift.id = shift_event_tags.shift_id
        AND (
          event_tag.organization_id IS NULL
          OR event_tag.organization_id = shift.organization_id
        )
        AND (
          shift.assigned_employee_id = (SELECT auth.uid())
          OR public.user_has_action_in_scope(
            'shift.view',
            shift.organization_id,
            shift.department_id,
            shift.sub_department_id
          )
        )
    )
  );