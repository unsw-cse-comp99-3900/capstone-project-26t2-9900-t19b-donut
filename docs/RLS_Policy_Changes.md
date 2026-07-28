# RLS Policy Changes and Business-Rule Rationale

## 1. Scope and baseline

This document records the row-level security (RLS) changes that can be reconstructed from the files in the `main` branch at commit `56e4d902c277a3b379ca3f3f6988f86d5609383c`.

The review replayed every `CREATE POLICY`, `ALTER POLICY`, `DROP POLICY`, and table-level RLS statement under `supabase/migrations/` in filename order. Draft SQL under `docs/implementation/migrations-draft/` and notes under `scratch/` were reviewed for context but are not treated as deployed migrations.

Repository-derived totals:

- 81 migration files contain RLS policy operations.
- 79 tables have 156 effective named policies reconstructable from those files.
- `swap_review_queue` and `push_notification_deliveries` have RLS enabled with no authenticated policy, so browser clients are denied by default.
- No final reconstructable policy contains `USING (true)` or `WITH CHECK (true)`.
- No migration in the reviewed set enables `FORCE ROW LEVEL SECURITY`.

The original production-readiness note recorded 74 broad policies across 46 tables. The current totals are larger because later feature migrations added policy-protected audit, swap, ML, broadcast, scheduling, and native-push tables, and because multiple permissive policies can exist on one table.

### Important repository limitation

The repository itself records legacy schema drift: the production database contains historical migrations that are not present under `supabase/migrations/`. Therefore this is complete for the SQL files currently in `main`, but it is not a substitute for exporting `pg_policies` from the connected production database. Policies explicitly described by a hardening migration as “left unchanged” may exist in production even when their original `CREATE POLICY` statement is absent from the repository.

## 2. How the business rules are represented

The hardening uses four main access patterns:

1. **Employee owns row** — a user ID column such as `employee_id`, `profile_id`, or `actor_id` must equal `auth.uid()`.
2. **Manager owns scope** — `user_has_action_in_scope(action, organization_id, department_id, sub_department_id)` checks an RBAC action at the row's organization, department, or sub-department.
3. **Organization-scoped access** — a current contract, organization-matched certificate, or organization-management helper establishes tenant membership.
4. **Administrative/global access** — `is_admin()`, `auth_can_manage_users()`, or an explicit Zeta/legacy-admin branch permits system-wide administration.

PostgreSQL combines applicable permissive policies with OR. A stricter policy does not override another broader policy with the same command and role. This matters for `remuneration_levels`, where retained manager policies still broaden the effective write rule.

`USING` controls which existing rows can be selected, updated, or deleted. `WITH CHECK` controls which rows may be inserted or become the result of an update. Both are required when an update must prevent ownership or scope transfer.

### Shared helpers and assumptions

| Helper | Meaning in the reviewed policies | Security note |
| --- | --- | --- |
| `auth.uid()` | The authenticated Supabase user's UUID. | SQL tests must use a valid UUID claim; strings such as `"111"` fail before RLS evaluation. |
| `is_admin()` | Legacy/global administrator check used by many retained policies. | It is a broader override and should be used only where global administration is intended. |
| `is_manager_or_above()` | Legacy manager/admin or active Gamma–Zeta certificate. The function was repaired to use `legacy_system_role`. | It is not row-scoped by itself. Pair it with an organization/department condition when tenant isolation is required. |
| `user_has_action_in_scope(...)` | Resolves an RBAC action against organization, department, and sub-department IDs. `shift.assign` maps Gamma→sub-department, Delta→department, Epsilon→organization; Zeta receives the helper's global override. | Policies must pass IDs derived from the protected row or a trusted FK, not caller-supplied scope alone. |
| `user_has_any_contract(auth.uid())` | Confirms that the caller has a contract and is used for global/legacy tables without tenant columns. | This is an authenticated-user gate, not row-level organization isolation. |
| `auth_can_manage_users()` | Active Type-Y Epsilon/Zeta certificate or legacy admin. | Defined as `SECURITY DEFINER`; execute is restricted to authenticated and service roles. |
| `auth_can_manage_certificates()` | Existing certificate-domain administration helper. | Policies add row organization scope where an organization ID exists. |
| `auth_can_create_template(...)` | Existing template helper evaluated with organization/department/sub-department derived through FKs. | Template rows validate department/sub-department consistency before calling it. |
| `can_view_related_swap_shift(...)` | Security-definer helper introduced to read related shifts without re-entering `shifts` RLS. | The final `shift_swaps` SELECT policy no longer calls it; the function remains defined but unused by that final policy. |
| `register_push_device(...)` / `unregister_push_device(...)` | Security-definer RPCs register or remove a device token for the authenticated caller. | The functions derive ownership from `auth.uid()`; direct authenticated INSERT and UPDATE grants are intentionally absent. |
| `service_role` | Trusted backend/worker role. | Supabase service role bypasses RLS and must never be exposed to the browser. |

## 3. Policy changes by business domain


### Core tenancy, identity and reference data

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `organizations` | Authenticated users can read only organizations linked by active contract, active legacy profile, or active access certificate; Zeta/legacy admin has global visibility. Create/update is admin-only; anonymous read is explicitly denied. | The organization is the tenant boundary. A global authenticated read would expose tenant names and identifiers. | `20260627001000_harden_organizations_rls.sql` |
| `departments` | Read requires `roster.view` at the organization/department scope or admin. Insert/update is admin-only; the former public policy is deny-by-default. | Departments are tenant-owned resources and must follow the caller's managed scope. | `20260628000000_harden_departments_rls.sql` |
| `profiles` | A user can always read their own profile. Any user with a contract can read the staff directory. All mutations require `auth_can_manage_users()` (active Type-Y Epsilon/Zeta certificate or legacy admin). | Self-read is needed during authentication; directory read supports rostering; user administration is not a Delta/department-manager function. | `20260717000000_restrict_user_management_to_admins.sql`; `20260720010000_harden_profiles_select_rls.sql` |
| `user_contracts` | All direct operations require `auth_can_manage_users()`. | Contracts control organization membership and therefore must be administered only by organization/system administrators. | `20260717000000_restrict_user_management_to_admins.sql` |
| `pay_periods` | Active contractors, active certificate holders and admins may read. Insert/update is admin-only. | Pay periods are shared configuration, but changing them affects payroll boundaries. | `20260628001000_harden_pay_periods_rls.sql` |
| `work_rules` | Active contractors/admins may read; insert/update is admin-only. | Work rules are needed for scheduling and compliance, while changes have organization-wide consequences. | `20260628002000_harden_work_rules_rls.sql` |
| `system_config` | Active contractors/admins may read; insert/update is admin-only. | Runtime configuration must be available to the application but not writable by ordinary employees. | `20260628003000_harden_system_config_rls.sql` |
| `public_holidays` | Read requires an active contract; management requires admin. | Holiday data is global reference data used in rostering and payroll; anonymous exposure and employee writes are unnecessary. | `20260721020000_harden_public_holidays_rls.sql` |
| `remuneration_levels` | Active contractors may read. The new broad policies are admin-only, but retained permissive `remuneration_levels_mgr_*` policies still allow `is_manager_or_above()` to insert/update/delete. | Pay bands are sensitive reference data. The retained manager policies preserve existing operations, but also mean the effective write rule is manager-or-above, not admin-only. | `20260615233629_tighten_remuneration_levels_rls.sql`; `20260721021000_harden_remuneration_levels_rls.sql` |
| `skills` | Active contractors may read; create/update is admin-only. | Skills are a shared catalogue; employees should select from it rather than redefine it. | `20260720018000_harden_skills_rls.sql` |
| `licenses` | Active contractors may read; create is admin-only. | Licences are a shared qualification catalogue whose definition is centrally governed. | `20260720020000_harden_licenses_rls.sql` |
| `certifications` | Global certificates are readable by active contractors; organization-owned certificates require `shift.view` in that organization. Management requires the certificate-management helper and, for organization-owned rows, organization-level `shift.edit`. | Certificate definitions can be global or tenant-owned, so access must respect that ownership boundary. | `20260720025000_harden_certifications_rls.sql` |
| `event_tags` | Global tags are readable by active contractors and managed by admins; organization tags require `shift.view` to read and `shift.edit` to manage in the same organization. | Tags attached to shifts must not leak organization-specific event vocabulary across tenants. | `20260720023000_harden_event_tags_rls.sql` |
| `fairness_ledger` | Legacy admins have global access; Gamma–Zeta certificate holders have access only when the certificate organization equals the row organization. | Fairness history influences optimizer decisions and contains employee-level workforce data, so the former unscoped manager rule was replaced with tenant scoping. | `20260615225309_fairness_ledger_org_scoped_rls.sql` |

### Employee-owned and sensitive records

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `timesheets` | Employees may select and insert only rows whose `profile_id = auth.uid()`. They may update only their own `draft` or `rejected` rows, and cannot transfer ownership. | Timesheets are personal payroll records; submitted/approved records must not be silently rewritten by the employee. | `20260629082631_harden_timesheets_rls.sql` |
| `availability_rules` | Direct SELECT is limited to the user's own `profile_id`. No authenticated write policy is created by this hardening migration. | Availability is personal workforce data. Writes must use another existing authorized path or remain denied by default. | `20260629114649_harden_availability_rls.sql` |
| `availability_slots` | Direct SELECT is limited to the user's own `profile_id`. No authenticated write policy is created by this hardening migration. | The slot records inherit the same personal-data boundary as availability rules. | `20260629114649_harden_availability_rls.sql` |
| `employee_skills` | Employees may select/insert/update/delete their own rows; admins may perform the same operations for any employee. Update checks preserve the self/admin boundary on the new row. | Employees maintain their own qualifications while administrators retain correction/verification capability. Department managers are intentionally not granted direct access. | `20260715092517_harden_employee_skills_rls.sql` |
| `employee_licenses` | Employees may select/insert/update/delete their own rows; admins may perform the same operations for any employee. | Licence evidence is employee-owned and potentially sensitive; only the employee and an administrator receive direct table access. | `20260720022000_harden_employee_licenses_rls.sql` |
| `leave_requests` | Employees may select only their own requests. | The table has no reliable organization/department scope in the policy, so self-ownership is the safe boundary. Manager workflow must use a separately authorized path. | `20260720006000_harden_leave_requests_rls.sql` |
| `employee_leave_balances` | Employees may select only their own balance. | Leave balances are payroll-sensitive personal data and should not be globally visible to authenticated users. | `20260720007000_harden_employee_leave_balances_rls.sql` |
| `employee_performance_metrics` | Employees read their own metrics. Admins insert; admins update only unlocked rows. No employee mutation is allowed. | Performance information is sensitive and computed/managed data; the lock flag protects finalized results. | `20260720012000_harden_employee_performance_metrics_rls.sql` |
| `employee_reliability_metrics` | Employees read their own metrics; admins insert/update. | Reliability scores can affect assignments and must not be visible or editable by peers. | `20260720013000_harden_employee_reliability_metrics_rls.sql` |
| `employee_suitability_scores` | Employees read their own scores; admins insert/update. | Suitability results are sensitive decision-support data and are not a public employee directory field. | `20260720016000_harden_employee_suitability_scores_rls.sql` |
| `supervisor_feedback` | A supervisor may read feedback rows where they are the recorded supervisor. Existing insertion behavior is not changed here. | The table records a supervisor's submitted assessment; the hardening removes broad authenticated read without changing the submission workflow. | `20260720014000_harden_supervisor_feedback_select_rls.sql` |
| `actual_labor_attendance` | Any active contractor may read the global attendance/ML input; only admins may insert through authenticated access. | The table lacks a reliable tenant scope column. The selected fallback supports workforce analytics while closing anonymous/unrestricted writes. | `20260720011000_harden_actual_labor_attendance_rls.sql` |
| `rest_period_violations` | An employee reads their own violation; a manager needs `shift.view` on both related shifts. Insert requires `shift.edit` on both shifts and the same employee assigned to both. | A rest violation joins two shifts, so authorizing only one shift would leak or create cross-scope compliance data. | `20260720015000_harden_rest_period_violations_rls.sql` |
| `bulk_operations` | A user may select only operations whose `actor_id` is their own user ID. | Bulk-operation status and error details belong to the initiating user; existing owned insert/update rules remain unchanged. | `20260720017000_harden_bulk_operations_select_rls.sql` |

### Shift, bidding and roster data

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `shift_bid_windows` | Scoped managers create with `shift.edit`/`shift.publish`, update with `shift.edit`/`shift.assign`/`shift.publish`, and delete with `shift.delete`. Reads require `shift.view`, except active employees in the same organization may see a currently open bidding window. | Employees need to discover open bids, while management actions must follow the related shift's scope. | `20260720002000_harden_shift_bid_windows_rls.sql` |
| `shift_offers` | Employees read their own offers and may accept/decline only their own pending offer for a shift assigned to them. Managers need related `shift.view` to read and `shift.edit`/`shift.assign` to update; creation requires `shift.assign`/`shift.publish` and a matching assignee. | The offer row cannot be authorized independently of its shift, and employee updates must be limited to the intended response transition. | `20260720003000_harden_shift_offers_rls.sql` |
| `shift_bids` | Employees read their own bids. Legacy admins read all. Other managers require `shift.assign` in the bid's shift scope. | Bid applications contain employee decisions; reviewing them is an assignment function, not a generic authenticated read. | `20260720033000_harden_shift_bids_select_rls.sql`; `20260721004000_fix_shift_bids_admin_select_rls.sql` |
| `shift_skills` | The assigned employee or a user with `shift.view` may read. Insert/delete requires `shift.edit` on the related shift. | Required skills inherit authorization from the shift rather than from the global skill dictionary. | `20260720019000_harden_shift_skills_rls.sql` |
| `shift_licenses` | The assigned employee or a user with `shift.view` may read. Insert/delete requires `shift.edit` on the related shift. | Required licences are shift-owned data and must use the shift's organization/department/sub-department scope. | `20260720021000_harden_shift_licenses_rls.sql` |
| `shift_event_tags` | Read requires assignment to the shift or `shift.view`; insert/delete requires `shift.edit`. The tag must be global or belong to the shift's organization. | This prevents attaching another organization's tag and makes the join table inherit both parent boundaries. | `20260720024000_harden_shift_event_tags_rls.sql` |
| `shift_events` | Insert requires `shift.edit` or `shift.assign` on the related shift. | Assignment flows write audit events, so the final rule includes assigners while still denying unrelated users. | `20260720031000_harden_shift_events_insert_rls.sql`; `20260721003000_fix_shift_events_assign_insert_rls.sql`; `20260722184451_allow_shift_assigners_insert_shift_events.sql` |
| `shift_flags` | The assigned employee or `shift.view` holders may read. All mutations require `shift.edit` for both old and new rows. | Flags affect shift management and should not be moved between scopes during update. | `20260720032000_harden_shift_flags_rls.sql` |
| `shift_subgroups` | Active contractors may read; admins insert/update. | No reliable foreign-key path to an organization/department existed for row-level scoping, so the hardening uses a global-reference fallback and admin-only writes. | `20260720030000_harden_shift_subgroups_rls.sql` |
| `roster_shift_assignments` | Employees may directly select only their own assignments. | The table lacks a reliable manager scope path in this policy; self-read supports My Roster while avoiding cross-employee exposure. | `20260720008000_harden_roster_shift_assignments_select_rls.sql` |

### Templates, rosters and scheduling runs

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `shift_templates` | Create/read resolves the template's department and optional sub-department, validates their relationship, then calls `auth_can_create_template(...)`. Existing draft-update and owner-draft-delete policies are left unchanged. | Template authorization must follow the organizational scope encoded by the referenced department rather than trusting submitted IDs. | `20260720026000_harden_shift_templates_select_insert_rls.sql` |
| `roster_template_applications` | Read requires `roster.view` on the referenced roster. Existing `applied_by` insertion behavior is unchanged. | An application record inherits tenant and manager scope from its roster. | `20260720027000_harden_roster_template_applications_select_rls.sql` |
| `roster_groups` | Read inherits `roster.view`; every write inherits `roster.edit` from the parent roster. | Groups have no independent security boundary and must remain within the roster's scope. | `20260720028000_harden_roster_groups_rls.sql` |
| `roster_subgroups` | Read/write resolves subgroup → group → roster and requires `roster.view`/`roster.edit`. | The nested resource must inherit authorization through its complete parent chain. | `20260720029000_harden_roster_subgroups_rls.sql` |
| `department_budgets` | Admin or `roster.view` may read; admin or `roster.edit` may insert/update/delete through the referenced department. | Budget access follows department ownership, with a stronger action for mutation than viewing. | `20260720038000_harden_department_budgets_rls.sql` |
| `autoschedule_sessions` | All operations require `shift.assign` at the session's organization/department/sub-department scope. | An auto-scheduling session can change assignments at scale, so it uses assignment rather than generic roster visibility. | `20260721006000_harden_autoschedule_sessions_rls.sql` |
| `autoschedule_assignments` | All operations inherit `shift.assign` from the parent auto-scheduling session. | Generated assignments must not be accessible outside the scope of the run that produced them. | `20260721007000_harden_autoschedule_assignments_rls.sql` |

### Swap workflow

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `swap_requests` | Participants and employees assigned to either related shift may read. Employees create only for their own assigned original shift. Participant updates are limited to pending/cancel/reject transitions; managers require related `shift.edit` or `shift.assign`. | Swap requests combine employee ownership with manager approval over the affected shift scope. | `20260627000000_harden_swap_requests_rls.sql` |
| `shift_swaps` | The final SELECT policy allows only requester, target, or `is_admin()`. | This final simple predicate removes the `shifts` ↔ `shift_swaps` RLS recursion. It also intentionally/incidentally removes scoped-manager read unless that manager satisfies `is_admin()`. | `20260720034000_harden_shift_swaps_select_rls.sql`; `20260720133232_fix_shift_swap.sql`; final override `20260721125310_fix_shift_swap_select_policy.sql` |
| `swap_approvals` | Read is available only when the parent `swap_requests` row is itself visible. Insert requires `approver_id = auth.uid()` plus `shift.edit` or `shift.assign` on a related shift. | Approval records inherit swap visibility and cannot impersonate another approver. | `20260719000000_harden_swap_approvals_rls.sql` |
| `swap_notifications` | Authenticated insert is allowed only for a real participant/assignee recipient and only when the caller manages a related shift with `shift.edit`/`shift.assign`. | Prevents arbitrary notification injection or sending swap messages to unrelated users. | `20260719002000_harden_swap_notifications_rls.sql` |
| `swap_validations` | Employees read their own validations; scoped managers use related `shift.view`. Insert must name a real participant and be either self-created or created by a related `shift.edit`/`shift.assign` manager. | Validation results are tied to both a participant and the manager scope of the underlying shifts. | `20260720001000_harden_swap_validations_rls.sql` |
| `swap_approval_rules` | Legacy admin or an active Gamma–Zeta certificate holder may manage rules only for the certificate's organization. | Auto-approval configuration is tenant-owned and can change workforce decisions, so it is organization-scoped. | `20260623140946_swap_auto_approve_shadow.sql` |
| `swap_decisions` | Read requires legacy admin or any active Gamma–Zeta certificate. | Decision history is restricted to management users, but the current predicate is not tied to the decision's organization. | `20260623140946_swap_auto_approve_shadow.sql` |
| `swap_audit_log` | Read requires legacy admin or any active Gamma–Zeta certificate; trigger logic makes the table append-only. | Audit evidence must not be editable. The current read predicate is management-only but not row-organization-scoped. | `20260623140946_swap_auto_approve_shadow.sql` |
| `swap_review_queue` | RLS is enabled and no authenticated policy exists; the service-role worker is expected to access it. | The internal job queue is implementation data and should be invisible to browser clients. | `20260623140946_swap_auto_approve_shadow.sql` |

### Demand, ML and forecasting

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `demand_forecasts` | Role-scoped rows are readable with `roster.view` and writable with `shift.create`; admins may manage all. Legacy rows without `role_id` are readable by active contractors. | Forecasts should follow the role's department/sub-department; the active-contract fallback preserves access to unscoped legacy rows. | `20260720004000_harden_demand_forecasts_rls.sql` |
| `predicted_labor_demand` | Active contractors read; admins insert. | The legacy ML output has no dependable tenant column, so the hardening removes anonymous access and centralizes writes. | `20260720005000_harden_predicted_labor_demand_rls.sql` |
| `demand_rules` | Admins and active contractors read; no new authenticated write rule. | Rules are a global read-only scheduling library for employees/managers; administration remains separate. | `20260721000000_harden_demand_rules_select_rls.sql` |
| `demand_templates` | Admins and active contractors read; existing manager mutation rules are retained. | Templates are shared reference material, while this migration only removes broad SELECT. | `20260721001000_harden_demand_templates_select_rls.sql` |
| `demand_tensor` | Rows with a synthesis run require `shift.create` at that run's scope; legacy runless rows require admin or an active contract. | The synthesis run is the trustworthy scope owner. A fallback is required for old rows without that relationship. | `20260721002000_harden_demand_tensor_select_rls.sql` |
| `labor_correction_factors` | Admins/active contractors read; admins update. The misleading old policy name mentioning anon now targets `authenticated`. | Correction factors are global ML configuration, not public data, and changes can affect demand calculations. | `20260720039000_harden_labor_correction_factors_rls.sql` |
| `venueops_ml_features` | Active contractors read. | The table is a global ML feature source without tenant columns; anonymous access is removed. | `20260720009000_harden_venueops_ml_features_rls.sql` |
| `model_manifests` | The existing authenticated SELECT policy is altered to require an active contract; service-role behavior remains. | Model metadata is internal application data, not anonymous reference content. | `20260721008000_harden_model_manifests_select_rls.sql` |
| `ml_prediction_log` | The existing authenticated SELECT policy is altered to require an active contract; service-role behavior remains. | Prediction logs may expose operational details and should be limited to active users. | `20260721009000_harden_ml_prediction_log_select_rls.sql` |
| `ml_prediction_outcomes` | Role-linked rows require `roster.view` through the role's scope; legacy rows without a role require an active contract. | Outcomes should inherit the target role's tenant scope while retaining a safe fallback for legacy data. | `20260721010000_harden_ml_prediction_outcomes_select_rls.sql` |
| `role_ml_class_map` | Read resolves the role's department/sub-department and requires `roster.view`. | ML classification mappings inherit authorization from the role they describe. | `20260721011000_harden_role_ml_class_map_select_rls.sql` |

### VenueOps global operational tables

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `venueops_event_types` | Authenticated SELECT requires an active contract. | This is a global/legacy reference table without tenant columns; active-contract gating replaces broad access. | `20260721012000_harden_venueops_event_types_select_rls.sql` |
| `venueops_function_types` | Authenticated SELECT requires an active contract. | Same global-reference fallback. | `20260721013000_harden_venueops_function_types_select_rls.sql` |
| `venueops_rooms` | Authenticated SELECT requires an active contract. | The current schema has no reliable organization scope for rooms. | `20260721014000_harden_venueops_rooms_select_rls.sql` |
| `venueops_series` | Authenticated SELECT requires an active contract. | The current schema has no reliable organization scope for series. | `20260721015000_harden_venueops_series_select_rls.sql` |
| `venueops_events` | Authenticated SELECT requires an active contract. | The current schema has no reliable organization scope for events. | `20260721016000_harden_venueops_events_select_rls.sql` |
| `venueops_functions` | Authenticated SELECT requires an active contract. | The current schema has no reliable organization scope for functions. | `20260721017000_harden_venueops_functions_select_rls.sql` |
| `venueops_booked_spaces` | Authenticated SELECT requires an active contract. | The current schema has no reliable organization scope for booked spaces. | `20260721018000_harden_venueops_booked_spaces_select_rls.sql` |
| `venueops_tasks` | Authenticated SELECT requires an active contract. | The current schema has no reliable organization scope for tasks. | `20260721019000_harden_venueops_tasks_select_rls.sql` |

### Assignment audit and broadcasts

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `assignment_runs` | Read requires `aa_user_manages_org(auth.uid(), organization_id)`. | Auto-assignment runs contain organization-level decision evidence and must be visible only to managers of that organization. | `20260623134031_aa_p0_assignment_audit_and_hardened_winner.sql` |
| `assignment_decisions` | Read inherits managed-organization access through the parent assignment run. | Individual optimizer decisions share the parent run's tenant boundary. | `20260623134031_aa_p0_assignment_audit_and_hardened_winner.sql` |
| `assignment_events` | Read inherits managed-organization access through the parent assignment run. | Assignment audit events share the parent run's tenant boundary. | `20260623134031_aa_p0_assignment_audit_and_hardened_winner.sql` |
| `broadcast_group_members` | Employees read their own membership; group members and system managers can see relevant membership; only group admins/system managers add, update or remove members. | Membership is group-owned and management must follow broadcast roles rather than generic authentication. | `20260720035000_harden_broadcast_group_members_rls.sql` |
| `broadcast_acknowledgements` | Employees manage their own acknowledgement only for an accessible broadcast that requires acknowledgement. Group admins/system managers may read related records. | Acknowledgements must prove the acting employee and must not be fabricated for unrelated broadcasts. | `20260720036000_harden_broadcast_acknowledgements_rls.sql` |
| `broadcast_read_status` | Employees manage their own read state only for an accessible broadcast. Group admins/system managers may read related records. | Read receipts are user-owned and must remain within broadcast group membership. | `20260720037000_harden_broadcast_read_status_rls.sql` |

### Native push delivery

| Table | Effective rule after reviewed migrations | Business-rule rationale | Main source migration(s) |
| --- | --- | --- | --- |
| `push_device_tokens` | Authenticated users may directly select and delete only rows whose `profile_id = auth.uid()`. Direct INSERT and UPDATE are not granted; registration and unregistration use authenticated security-definer RPCs that derive the owner from `auth.uid()`. Anonymous access is revoked, while the service role retains full access. | Direct table access prevents users from reading or deleting tokens owned by other employees. Registration may rebind an existing (token, app_id) to the current authenticated profile, supporting account changes on the same device; this ownership-transfer behaviour is an explicit trust assumption. | `20260724010000_add_apns_push_delivery.sql` |
| `push_notification_deliveries` | RLS is enabled, no browser policy exists, and all privileges are revoked from `anon` and `authenticated`; only `service_role` has table access. | Delivery attempts, retry state, and provider errors are internal queue data processed by the push worker and should not be exposed to browser clients. | `20260724010000_add_apns_push_delivery.sql` |

## 4. Superseded and corrective policy changes

These changes must be read in chronological order:

- **Fairness ledger:** the initial `fairness_ledger_manager_all` policy used a global manager check. `20260615225309_fairness_ledger_org_scoped_rls.sql` dropped it and replaced it with organization-matched certificate access.
- **User management:** `profiles_manage_delta` and `contracts_manage_delta` were removed. `20260717000000_restrict_user_management_to_admins.sql` replaced them with Epsilon/Zeta Type-Y or legacy-admin access.
- **Shift swaps:** `20260720034000` first allowed participants, assigned employees and scoped `shift.view` managers. `20260720133232` moved the related-shift lookup into a security-definer helper to break RLS recursion. `20260721125310` then replaced the policy again with the final requester/target/admin predicate.
- **Shift events:** the first hardening allowed only `shift.edit`. Two follow-up migrations added `shift.assign` because assignment and bid flows insert audit events. The final predicate is edit OR assign. The last migration was later renamed to `20260722184451_allow_shift_assigners_insert_shift_events.sql` to remove a duplicate migration timestamp; its policy behavior did not change.
- **Shift bids:** the first hardening allowed the bidder and scoped assigners. The follow-up added legacy global admin visibility.
- **Remuneration levels:** the June migration removed public/unrestricted access and added manager policies. The July migration replaced four remaining broad true predicates with contract/admin checks, but did not remove the manager policies. Because policies are permissive, manager writes remain effective.
- **Policy names versus behavior:** several legacy names still say “all,” “everyone,” “public,” or “anon.” The effective command, target role, and predicate—not the name—determine access. Examples include availability, labor correction factors, leave requests, and employee leave balances.

## 5. Known limitations and review decisions

1. **Repository/live-database drift:** the current repository is not a complete historical database baseline. Run the verification queries below against the target Supabase database before claiming production completeness.
2. **No FORCE RLS:** table owners can bypass RLS because `FORCE ROW LEVEL SECURITY` is not enabled. This is normal for migrations and trusted backend functions, but owner-context tests do not prove client behavior.
3. **Service role bypass:** internal workers and Edge Functions using the service-role key bypass these rules. Each such handler requires its own authentication and scope validation.
4. **Global fallback tables:** attendance, legacy ML, VenueOps, shift subgroups, and some reference tables lack reliable tenant columns. Their replacement rule is “active contract” rather than true organization row scope.
5. **Employee-only workflow tables:** availability, leave balances/requests, roster assignments, timesheets, employee skills, and employee licences do not grant ordinary department managers direct table access in the reviewed final policies. Any manager workflow must be handled by another scoped policy/RPC or it will be denied.
6. **`shift_swaps` final manager access:** the final fix removes scoped-manager visibility and permits only participants or `is_admin()`. This solves the recursion but should be confirmed against the product requirement.
7. **Swap decision/audit scope:** `swap_decisions_read` and `swap_audit_read` accept any active Gamma–Zeta certificate without matching the row to that certificate's organization. If cross-organization manager visibility is not intended, these need a parent-swap organization predicate.
8. **Remuneration policy overlap:** retained `remuneration_levels_mgr_insert/update/delete` policies mean manager-or-above remains an effective writer even though newer policies are admin-only.
9. **Helper definitions:** several policies depend on pre-existing helpers whose original creation may be part of the missing legacy migration history. A clean database built only from the visible migration subset must verify those functions exist before applying the hardening chain.
10. **Push-token ownership transfer:** `register_push_device(...)` reassigns an existing token to the authenticated caller on conflict. Confirm that this is intended for account switching; otherwise ownership transfer should require additional trusted validation.


## Appendix A — repository-reconstructable effective policy inventory

The entries below are the latest definition of each policy name after replaying the reviewed migration files. Policies from missing legacy migrations that were never recreated or altered in this repository cannot appear in this appendix.


### `actual_labor_attendance`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_insert_actual_labor_attendance` | INSERT | authenticated | `20260720011000_harden_actual_labor_attendance_rls.sql` |
| `authenticated_read_actual_labor_attendance` | SELECT | authenticated | `20260720011000_harden_actual_labor_attendance_rls.sql` |

### `assignment_decisions`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `p_assignment_decisions_read` | SELECT | authenticated | `20260623134031_aa_p0_assignment_audit_and_hardened_winner.sql` |

### `assignment_events`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `p_assignment_events_read` | SELECT | authenticated | `20260623134031_aa_p0_assignment_audit_and_hardened_winner.sql` |

### `assignment_runs`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `p_assignment_runs_read` | SELECT | authenticated | `20260623134031_aa_p0_assignment_audit_and_hardened_winner.sql` |

### `autoschedule_assignments`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `autoschedule_assignments_authenticated` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721007000_harden_autoschedule_assignments_rls.sql` |

### `autoschedule_sessions`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `autoschedule_sessions_authenticated` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721006000_harden_autoschedule_sessions_rls.sql` |

### `availability_rules`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Enable read access for all` | SELECT | authenticated | `20260629114649_harden_availability_rls.sql` |

### `availability_slots`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Enable read access for all` | SELECT | authenticated | `20260629114649_harden_availability_rls.sql` |

### `broadcast_acknowledgements`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Enable all access for authenticated users on acks` | ALL | authenticated | `20260720036000_harden_broadcast_acknowledgements_rls.sql` |

### `broadcast_group_members`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can add group members` | INSERT | authenticated | `20260720035000_harden_broadcast_group_members_rls.sql` |
| `Authenticated users can remove group members` | DELETE | authenticated | `20260720035000_harden_broadcast_group_members_rls.sql` |
| `Authenticated users can update group members` | UPDATE | authenticated | `20260720035000_harden_broadcast_group_members_rls.sql` |
| `Authenticated users can view group members` | SELECT | authenticated | `20260720035000_harden_broadcast_group_members_rls.sql` |

### `broadcast_read_status`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Enable all access for authenticated users on read status` | ALL | authenticated | `20260720037000_harden_broadcast_read_status_rls.sql` |

### `bulk_operations`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Users can view bulk operations` | SELECT | authenticated | `20260720017000_harden_bulk_operations_select_rls.sql` |

### `certifications`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Allow authenticated users to manage certifications` | ALL | authenticated | `20260720025000_harden_certifications_rls.sql` |
| `Allow authenticated users to view certifications` | SELECT | authenticated | `20260720025000_harden_certifications_rls.sql` |
| `Authenticated users can create certifications` | INSERT | authenticated | `20260720025000_harden_certifications_rls.sql` |
| `Authenticated users can view certifications` | SELECT | authenticated | `20260720025000_harden_certifications_rls.sql` |

### `demand_forecasts`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_all_demand_forecasts` | ALL | authenticated | `20260720004000_harden_demand_forecasts_rls.sql` |
| `authenticated_read_demand_forecasts` | SELECT | authenticated | `20260720004000_harden_demand_forecasts_rls.sql` |

### `demand_rules`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_demand_rules` | SELECT | authenticated | `20260721000000_harden_demand_rules_select_rls.sql` |

### `demand_templates`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_demand_templates` | SELECT | authenticated | `20260721001000_harden_demand_templates_select_rls.sql` |

### `demand_tensor`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_demand_tensor` | SELECT | authenticated | `20260721002000_harden_demand_tensor_select_rls.sql` |

### `department_budgets`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view budgets` | SELECT | authenticated | `20260720038000_harden_department_budgets_rls.sql` |
| `Managers can manage budgets` | ALL | authenticated | `20260720038000_harden_department_budgets_rls.sql` |

### `departments`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can manage departments` | INSERT | authenticated | `20260628000000_harden_departments_rls.sql` |
| `Authenticated users can update departments` | UPDATE | authenticated | `20260628000000_harden_departments_rls.sql` |
| `Authenticated users can view all departments` | SELECT | authenticated | `20260628000000_harden_departments_rls.sql` |
| `departments_select` | SELECT | authenticated | `20260628000000_harden_departments_rls.sql` |
| `public_read` | SELECT | public | `20260628000000_harden_departments_rls.sql` |

### `employee_leave_balances`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Public read for employee_leave_balances` | SELECT | authenticated | `20260720007000_harden_employee_leave_balances_rls.sql` |

### `employee_licenses`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can delete employee licenses` | DELETE | authenticated | `20260720022000_harden_employee_licenses_rls.sql` |
| `Authenticated users can manage employee licenses` | INSERT | authenticated | `20260720022000_harden_employee_licenses_rls.sql` |
| `Authenticated users can update employee licenses` | UPDATE | authenticated | `20260720022000_harden_employee_licenses_rls.sql` |
| `Authenticated users can view employee licenses` | SELECT | authenticated | `20260720022000_harden_employee_licenses_rls.sql` |

### `employee_performance_metrics`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view performance metrics` | SELECT | authenticated | `20260720012000_harden_employee_performance_metrics_rls.sql` |
| `System can manage performance metrics` | INSERT | authenticated | `20260720012000_harden_employee_performance_metrics_rls.sql` |
| `System can update unlocked performance metrics` | UPDATE | authenticated | `20260720012000_harden_employee_performance_metrics_rls.sql` |

### `employee_reliability_metrics`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view reliability metrics` | SELECT | authenticated | `20260720013000_harden_employee_reliability_metrics_rls.sql` |
| `System can manage reliability metrics` | INSERT | authenticated | `20260720013000_harden_employee_reliability_metrics_rls.sql` |
| `System can update reliability metrics` | UPDATE | authenticated | `20260720013000_harden_employee_reliability_metrics_rls.sql` |

### `employee_skills`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can delete employee skills` | DELETE | authenticated | `20260715092517_harden_employee_skills_rls.sql` |
| `Authenticated users can manage employee skills` | INSERT | authenticated | `20260715092517_harden_employee_skills_rls.sql` |
| `Authenticated users can update employee skills` | UPDATE | authenticated | `20260715092517_harden_employee_skills_rls.sql` |
| `Authenticated users can view employee skills` | SELECT | authenticated | `20260715092517_harden_employee_skills_rls.sql` |

### `employee_suitability_scores`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view all suitability scores` | SELECT | authenticated | `20260720016000_harden_employee_suitability_scores_rls.sql` |
| `System can manage suitability scores` | INSERT | authenticated | `20260720016000_harden_employee_suitability_scores_rls.sql` |
| `System can update suitability scores` | UPDATE | authenticated | `20260720016000_harden_employee_suitability_scores_rls.sql` |

### `event_tags`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Allow authenticated users to manage event tags` | ALL | authenticated | `20260720023000_harden_event_tags_rls.sql` |
| `Allow authenticated users to view event tags` | SELECT | authenticated | `20260720023000_harden_event_tags_rls.sql` |
| `Authenticated users can create event tags` | INSERT | authenticated | `20260720023000_harden_event_tags_rls.sql` |
| `Authenticated users can view event tags` | SELECT | authenticated | `20260720023000_harden_event_tags_rls.sql` |

### `fairness_ledger`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `fairness_ledger_org_scoped` | ALL | authenticated | `20260615225309_fairness_ledger_org_scoped_rls.sql` |

### `labor_correction_factors`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Allow anon select on labor_correction_factors` | SELECT | authenticated | `20260720039000_harden_labor_correction_factors_rls.sql` |
| `authenticated_read_labor_correction_factors` | SELECT | authenticated | `20260720039000_harden_labor_correction_factors_rls.sql` |
| `authenticated_update_labor_correction_factors` | UPDATE | authenticated | `20260720039000_harden_labor_correction_factors_rls.sql` |

### `leave_requests`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Public read for leave_requests` | SELECT | authenticated | `20260720006000_harden_leave_requests_rls.sql` |

### `licenses`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can create licenses` | INSERT | authenticated | `20260720020000_harden_licenses_rls.sql` |
| `Authenticated users can view licenses` | SELECT | authenticated | `20260720020000_harden_licenses_rls.sql` |

### `ml_prediction_log`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `ml_prediction_log_authenticated_select` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721009000_harden_ml_prediction_log_select_rls.sql` |

### `ml_prediction_outcomes`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `ml_prediction_outcomes_authenticated_select` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721010000_harden_ml_prediction_outcomes_select_rls.sql` |

### `model_manifests`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `model_manifests_authenticated_select` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721008000_harden_model_manifests_select_rls.sql` |

### `organizations`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can create organizations` | INSERT | authenticated | `20260627001000_harden_organizations_rls.sql` |
| `Authenticated users can update organizations` | UPDATE | authenticated | `20260627001000_harden_organizations_rls.sql` |
| `Authenticated users can view organizations` | SELECT | authenticated | `20260627001000_harden_organizations_rls.sql` |
| `organizations_select` | SELECT | authenticated | `20260627001000_harden_organizations_rls.sql` |
| `public_read` | SELECT | public | `20260627001000_harden_organizations_rls.sql` |

### `pay_periods`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Admins can manage pay periods` | INSERT | authenticated | `20260628001000_harden_pay_periods_rls.sql` |
| `Admins can update pay periods` | UPDATE | authenticated | `20260628001000_harden_pay_periods_rls.sql` |
| `Everyone can view pay periods` | SELECT | authenticated | `20260628001000_harden_pay_periods_rls.sql` |

### `predicted_labor_demand`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_insert_predicted_labor_demand` | INSERT | authenticated | `20260720005000_harden_predicted_labor_demand_rls.sql` |
| `authenticated_read_predicted_labor_demand` | SELECT | authenticated | `20260720005000_harden_predicted_labor_demand_rls.sql` |

### `profiles`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `profiles_manage_admin` | ALL | authenticated | `20260717000000_restrict_user_management_to_admins.sql` |
| `profiles_select_all` | SELECT | authenticated | `20260720010000_harden_profiles_select_rls.sql` |

### `public_holidays`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Admins can manage public holidays` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721020000_harden_public_holidays_rls.sql` |
| `Everyone can view public holidays` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721020000_harden_public_holidays_rls.sql` |

### `push_device_tokens`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `push_device_tokens_delete_own` | DELETE | authenticated | `20260724010000_add_apns_push_delivery.sql` |
| `push_device_tokens_select_own` | SELECT | authenticated | `20260724010000_add_apns_push_delivery.sql` |

### `push_notification_deliveries`

RLS is enabled, but no named policy grants access to `anon` or `authenticated`. Direct browser access is denied and the table is granted only to `service_role`.

### `remuneration_levels`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can manage remuneration_levels` | INSERT | authenticated | `20260721021000_harden_remuneration_levels_rls.sql` |
| `Authenticated users can update remuneration_levels` | UPDATE | authenticated | `20260721021000_harden_remuneration_levels_rls.sql` |
| `Authenticated users can view remuneration_levels` | SELECT | authenticated | `20260721021000_harden_remuneration_levels_rls.sql` |
| `public_read` | SELECT | public | `20260721021000_harden_remuneration_levels_rls.sql` |
| `remuneration_levels_mgr_delete` | DELETE | authenticated | `20260615233629_tighten_remuneration_levels_rls.sql` |
| `remuneration_levels_mgr_insert` | INSERT | authenticated | `20260615233629_tighten_remuneration_levels_rls.sql` |
| `remuneration_levels_mgr_update` | UPDATE | authenticated | `20260615233629_tighten_remuneration_levels_rls.sql` |

### `rest_period_violations`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view rest violations` | SELECT | authenticated | `20260720015000_harden_rest_period_violations_rls.sql` |
| `System can create rest violations` | INSERT | authenticated | `20260720015000_harden_rest_period_violations_rls.sql` |

### `role_ml_class_map`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_role_ml_class_map` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721011000_harden_role_ml_class_map_select_rls.sql` |

### `roster_groups`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Enable read access for authenticated users` | SELECT | authenticated | `20260720028000_harden_roster_groups_rls.sql` |
| `Enable write access for authenticated users` | ALL | authenticated | `20260720028000_harden_roster_groups_rls.sql` |

### `roster_shift_assignments`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `roster_assignments_select` | SELECT | authenticated | `20260720008000_harden_roster_shift_assignments_select_rls.sql` |

### `roster_subgroups`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Enable read access for authenticated users` | SELECT | authenticated | `20260720029000_harden_roster_subgroups_rls.sql` |
| `Enable write access for authenticated users` | ALL | authenticated | `20260720029000_harden_roster_subgroups_rls.sql` |

### `roster_template_applications`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Allow authenticated users to view template applications` | SELECT | authenticated | `20260720027000_harden_roster_template_applications_select_rls.sql` |

### `shift_bid_windows`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view scoped bid windows` | SELECT | authenticated | `20260720002000_harden_shift_bid_windows_rls.sql` |
| `Managers can create scoped bid windows` | INSERT | authenticated | `20260720002000_harden_shift_bid_windows_rls.sql` |
| `Managers can delete scoped bid windows` | DELETE | authenticated | `20260720002000_harden_shift_bid_windows_rls.sql` |
| `Managers can update scoped bid windows` | UPDATE | authenticated | `20260720002000_harden_shift_bid_windows_rls.sql` |

### `shift_bids`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `bids_select_all` | SELECT | authenticated | `20260721004000_fix_shift_bids_admin_select_rls.sql` |

### `shift_event_tags`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can delete shift event tags` | DELETE | authenticated | `20260720024000_harden_shift_event_tags_rls.sql` |
| `Authenticated users can manage shift event tags` | INSERT | authenticated | `20260720024000_harden_shift_event_tags_rls.sql` |
| `Authenticated users can view shift event tags` | SELECT | authenticated | `20260720024000_harden_shift_event_tags_rls.sql` |

### `shift_events`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can insert shift events` | INSERT | authenticated | `20260722184451_allow_shift_assigners_insert_shift_events.sql` |

### `shift_flags`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can manage shift flags` | ALL | authenticated | `20260720032000_harden_shift_flags_rls.sql` |
| `Authenticated users can view shift flags` | SELECT | authenticated | `20260720032000_harden_shift_flags_rls.sql` |

### `shift_licenses`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can delete shift licenses` | DELETE | authenticated | `20260720021000_harden_shift_licenses_rls.sql` |
| `Authenticated users can manage shift licenses` | INSERT | authenticated | `20260720021000_harden_shift_licenses_rls.sql` |
| `Authenticated users can view shift licenses` | SELECT | authenticated | `20260720021000_harden_shift_licenses_rls.sql` |

### `shift_offers`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Enable insert for all users` | INSERT | authenticated | `20260720003000_harden_shift_offers_rls.sql` |
| `Enable read access for all users` | SELECT | authenticated | `20260720003000_harden_shift_offers_rls.sql` |
| `Enable update for all users` | UPDATE | authenticated | `20260720003000_harden_shift_offers_rls.sql` |

### `shift_skills`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can delete shift_skills` | DELETE | authenticated | `20260720019000_harden_shift_skills_rls.sql` |
| `Authenticated users can manage shift_skills` | INSERT | authenticated | `20260720019000_harden_shift_skills_rls.sql` |
| `Authenticated users can view shift_skills` | SELECT | authenticated | `20260720019000_harden_shift_skills_rls.sql` |

### `shift_subgroups`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can manage shift_subgroups` | INSERT | authenticated | `20260720030000_harden_shift_subgroups_rls.sql` |
| `Authenticated users can update shift_subgroups` | UPDATE | authenticated | `20260720030000_harden_shift_subgroups_rls.sql` |
| `Authenticated users can view shift_subgroups` | SELECT | authenticated | `20260720030000_harden_shift_subgroups_rls.sql` |

### `shift_swaps`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `swaps_select_all` | SELECT | authenticated | `20260721125310_fix_shift_swap_select_policy.sql` |

### `shift_templates`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can create templates` | INSERT | authenticated | `20260720026000_harden_shift_templates_select_insert_rls.sql` |
| `Authenticated users can view templates` | SELECT | authenticated | `20260720026000_harden_shift_templates_select_insert_rls.sql` |

### `skills`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can create skills` | INSERT | authenticated | `20260720018000_harden_skills_rls.sql` |
| `Authenticated users can update skills` | UPDATE | authenticated | `20260720018000_harden_skills_rls.sql` |
| `Authenticated users can view skills` | SELECT | authenticated | `20260720018000_harden_skills_rls.sql` |

### `supervisor_feedback`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_supervisor_feedback` | SELECT | authenticated | `20260720014000_harden_supervisor_feedback_select_rls.sql` |

### `swap_approval_rules`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `swap_rules_admin_all` | ALL | PUBLIC (default) | `20260623140946_swap_auto_approve_shadow.sql` |

### `swap_approvals`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view approvals` | SELECT | authenticated | `20260719000000_harden_swap_approvals_rls.sql` |
| `Managers can create approvals` | INSERT | authenticated | `20260719000000_harden_swap_approvals_rls.sql` |

### `swap_audit_log`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `swap_audit_read` | SELECT | PUBLIC (default) | `20260623140946_swap_auto_approve_shadow.sql` |

### `swap_decisions`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `swap_decisions_read` | SELECT | PUBLIC (default) | `20260623140946_swap_auto_approve_shadow.sql` |

### `swap_notifications`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `System can create notifications` | INSERT | authenticated | `20260719002000_harden_swap_notifications_rls.sql` |

### `swap_requests`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can create swap requests` | INSERT | authenticated | `20260627000000_harden_swap_requests_rls.sql` |
| `Authenticated users can update swap requests` | UPDATE | authenticated | `20260627000000_harden_swap_requests_rls.sql` |
| `Authenticated users can view swaps` | SELECT | authenticated | `20260627000000_harden_swap_requests_rls.sql` |

### `swap_validations`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view validations` | SELECT | authenticated | `20260720001000_harden_swap_validations_rls.sql` |
| `System can create validations` | INSERT | authenticated | `20260720001000_harden_swap_validations_rls.sql` |

### `system_config`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Admins can manage system config` | INSERT | authenticated | `20260628003000_harden_system_config_rls.sql` |
| `Admins can update system config` | UPDATE | authenticated | `20260628003000_harden_system_config_rls.sql` |
| `Everyone can view system config` | SELECT | authenticated | `20260628003000_harden_system_config_rls.sql` |

### `timesheets`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Authenticated users can view timesheets` | SELECT | authenticated | `20260629082631_harden_timesheets_rls.sql` |
| `Employees can create timesheets` | INSERT | authenticated | `20260629082631_harden_timesheets_rls.sql` |
| `Employees can update their timesheets` | UPDATE | authenticated | `20260629082631_harden_timesheets_rls.sql` |

### `user_contracts`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `contracts_manage_admin` | ALL | authenticated | `20260717000000_restrict_user_management_to_admins.sql` |

### `venueops_booked_spaces`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_booked_spaces` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721018000_harden_venueops_booked_spaces_select_rls.sql` |

### `venueops_event_types`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_event_types` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721012000_harden_venueops_event_types_select_rls.sql` |

### `venueops_events`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_events` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721016000_harden_venueops_events_select_rls.sql` |

### `venueops_function_types`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_function_types` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721013000_harden_venueops_function_types_select_rls.sql` |

### `venueops_functions`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_functions` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721017000_harden_venueops_functions_select_rls.sql` |

### `venueops_ml_features`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_ml_features` | SELECT | authenticated | `20260720009000_harden_venueops_ml_features_rls.sql` |

### `venueops_rooms`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_rooms` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721014000_harden_venueops_rooms_select_rls.sql` |

### `venueops_series`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_series` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721015000_harden_venueops_series_select_rls.sql` |

### `venueops_tasks`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `authenticated_read_venueops_tasks` | Retained by `ALTER POLICY` | Retained by `ALTER POLICY` | `20260721019000_harden_venueops_tasks_select_rls.sql` |

### `work_rules`

| Policy | Command | Role | Latest defining migration |
| --- | --- | --- | --- |
| `Admins can manage work rules` | INSERT | authenticated | `20260628002000_harden_work_rules_rls.sql` |
| `Admins can update work rules` | UPDATE | authenticated | `20260628002000_harden_work_rules_rls.sql` |
| `Everyone can view work rules` | SELECT | authenticated | `20260628002000_harden_work_rules_rls.sql` |

## Appendix B — RLS migration files reviewed

- `supabase/migrations/20260615022410_fairness_ledger.sql`
- `supabase/migrations/20260615225309_fairness_ledger_org_scoped_rls.sql`
- `supabase/migrations/20260615233629_tighten_remuneration_levels_rls.sql`
- `supabase/migrations/20260623134031_aa_p0_assignment_audit_and_hardened_winner.sql`
- `supabase/migrations/20260623140946_swap_auto_approve_shadow.sql`
- `supabase/migrations/20260627000000_harden_swap_requests_rls.sql`
- `supabase/migrations/20260627001000_harden_organizations_rls.sql`
- `supabase/migrations/20260628000000_harden_departments_rls.sql`
- `supabase/migrations/20260628001000_harden_pay_periods_rls.sql`
- `supabase/migrations/20260628002000_harden_work_rules_rls.sql`
- `supabase/migrations/20260628003000_harden_system_config_rls.sql`
- `supabase/migrations/20260629082631_harden_timesheets_rls.sql`
- `supabase/migrations/20260629114649_harden_availability_rls.sql`
- `supabase/migrations/20260715092517_harden_employee_skills_rls.sql`
- `supabase/migrations/20260717000000_restrict_user_management_to_admins.sql`
- `supabase/migrations/20260719000000_harden_swap_approvals_rls.sql`
- `supabase/migrations/20260719002000_harden_swap_notifications_rls.sql`
- `supabase/migrations/20260720001000_harden_swap_validations_rls.sql`
- `supabase/migrations/20260720002000_harden_shift_bid_windows_rls.sql`
- `supabase/migrations/20260720003000_harden_shift_offers_rls.sql`
- `supabase/migrations/20260720004000_harden_demand_forecasts_rls.sql`
- `supabase/migrations/20260720005000_harden_predicted_labor_demand_rls.sql`
- `supabase/migrations/20260720006000_harden_leave_requests_rls.sql`
- `supabase/migrations/20260720007000_harden_employee_leave_balances_rls.sql`
- `supabase/migrations/20260720008000_harden_roster_shift_assignments_select_rls.sql`
- `supabase/migrations/20260720009000_harden_venueops_ml_features_rls.sql`
- `supabase/migrations/20260720010000_harden_profiles_select_rls.sql`
- `supabase/migrations/20260720011000_harden_actual_labor_attendance_rls.sql`
- `supabase/migrations/20260720012000_harden_employee_performance_metrics_rls.sql`
- `supabase/migrations/20260720013000_harden_employee_reliability_metrics_rls.sql`
- `supabase/migrations/20260720014000_harden_supervisor_feedback_select_rls.sql`
- `supabase/migrations/20260720015000_harden_rest_period_violations_rls.sql`
- `supabase/migrations/20260720016000_harden_employee_suitability_scores_rls.sql`
- `supabase/migrations/20260720017000_harden_bulk_operations_select_rls.sql`
- `supabase/migrations/20260720018000_harden_skills_rls.sql`
- `supabase/migrations/20260720019000_harden_shift_skills_rls.sql`
- `supabase/migrations/20260720020000_harden_licenses_rls.sql`
- `supabase/migrations/20260720021000_harden_shift_licenses_rls.sql`
- `supabase/migrations/20260720022000_harden_employee_licenses_rls.sql`
- `supabase/migrations/20260720023000_harden_event_tags_rls.sql`
- `supabase/migrations/20260720024000_harden_shift_event_tags_rls.sql`
- `supabase/migrations/20260720025000_harden_certifications_rls.sql`
- `supabase/migrations/20260720026000_harden_shift_templates_select_insert_rls.sql`
- `supabase/migrations/20260720027000_harden_roster_template_applications_select_rls.sql`
- `supabase/migrations/20260720028000_harden_roster_groups_rls.sql`
- `supabase/migrations/20260720029000_harden_roster_subgroups_rls.sql`
- `supabase/migrations/20260720030000_harden_shift_subgroups_rls.sql`
- `supabase/migrations/20260720031000_harden_shift_events_insert_rls.sql`
- `supabase/migrations/20260720032000_harden_shift_flags_rls.sql`
- `supabase/migrations/20260720033000_harden_shift_bids_select_rls.sql`
- `supabase/migrations/20260720034000_harden_shift_swaps_select_rls.sql`
- `supabase/migrations/20260720035000_harden_broadcast_group_members_rls.sql`
- `supabase/migrations/20260720036000_harden_broadcast_acknowledgements_rls.sql`
- `supabase/migrations/20260720037000_harden_broadcast_read_status_rls.sql`
- `supabase/migrations/20260720038000_harden_department_budgets_rls.sql`
- `supabase/migrations/20260720039000_harden_labor_correction_factors_rls.sql`
- `supabase/migrations/20260720133232_fix_shift_swap.sql`
- `supabase/migrations/20260721000000_harden_demand_rules_select_rls.sql`
- `supabase/migrations/20260721001000_harden_demand_templates_select_rls.sql`
- `supabase/migrations/20260721002000_harden_demand_tensor_select_rls.sql`
- `supabase/migrations/20260721003000_fix_shift_events_assign_insert_rls.sql`
- `supabase/migrations/20260721004000_fix_shift_bids_admin_select_rls.sql`
- `supabase/migrations/20260721006000_harden_autoschedule_sessions_rls.sql`
- `supabase/migrations/20260721007000_harden_autoschedule_assignments_rls.sql`
- `supabase/migrations/20260721008000_harden_model_manifests_select_rls.sql`
- `supabase/migrations/20260721009000_harden_ml_prediction_log_select_rls.sql`
- `supabase/migrations/20260721010000_harden_ml_prediction_outcomes_select_rls.sql`
- `supabase/migrations/20260721011000_harden_role_ml_class_map_select_rls.sql`
- `supabase/migrations/20260721012000_harden_venueops_event_types_select_rls.sql`
- `supabase/migrations/20260721013000_harden_venueops_function_types_select_rls.sql`
- `supabase/migrations/20260721014000_harden_venueops_rooms_select_rls.sql`
- `supabase/migrations/20260721015000_harden_venueops_series_select_rls.sql`
- `supabase/migrations/20260721016000_harden_venueops_events_select_rls.sql`
- `supabase/migrations/20260721017000_harden_venueops_functions_select_rls.sql`
- `supabase/migrations/20260721018000_harden_venueops_booked_spaces_select_rls.sql`
- `supabase/migrations/20260721019000_harden_venueops_tasks_select_rls.sql`
- `supabase/migrations/20260721020000_harden_public_holidays_rls.sql`
- `supabase/migrations/20260721021000_harden_remuneration_levels_rls.sql`
- `supabase/migrations/20260721125310_fix_shift_swap_select_policy.sql`
- `supabase/migrations/20260722184451_allow_shift_assigners_insert_shift_events.sql`
- `supabase/migrations/20260724010000_add_apns_push_delivery.sql`

---
