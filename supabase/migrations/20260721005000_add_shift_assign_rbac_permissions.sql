-- Add the missing scoped RBAC mappings for shift assignment.
--
-- Gamma managers assign within a sub-department.
-- Delta managers assign within a department.
-- Epsilon managers/admins assign within an organization.
-- Zeta receives a global bypass through user_has_action_in_scope().

INSERT INTO public.rbac_actions (
  code,
  description
)
VALUES (
  'shift.assign',
  'Assign employees and manage bids within the authorized shift scope'
)
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.rbac_permissions (
  access_level,
  action_code,
  scope
)
VALUES
  ('gamma',   'shift.assign', 'SUB_DEPT'),
  ('delta',   'shift.assign', 'DEPT'),
  ('epsilon', 'shift.assign', 'ORG'),
  ('zeta',    'shift.assign', 'ORG')
ON CONFLICT (access_level, action_code) DO UPDATE
SET scope = EXCLUDED.scope;