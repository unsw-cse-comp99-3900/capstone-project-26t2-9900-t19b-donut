# Shiftopia API Documentation

**Document version:** 1.0  
**Last verified against repository:** `main` at `4cfd52d` on 20 July 2026  
**Scope:** Supabase RPCs and Edge Functions

## 1. Calling conventions

```text
Supabase project: https://<project-ref>.supabase.co
RPC endpoint:     https://<project-ref>.supabase.co/rest/v1/rpc/<function-name>
Edge Function:    https://<project-ref>.supabase.co/functions/v1/<function-name>
```

Standard authenticated headers:

```http
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <USER_ACCESS_TOKEN>
Content-Type: application/json
```

Only server-side code, scheduled jobs, and Edge Functions may use the service-role key.

Standard JavaScript RPC call:

```ts
const { data, error } = await supabase.rpc('function_name', {
  parameter_name: value,
});

if (error) throw error;
```

Permission labels:

| Label | Meaning |
|---|---|
| `A` | `PUBLIC` revoked; execution explicitly granted to `authenticated` and `service_role` |
| `S` | Execution restricted to `service_role` |
| `D` | No interface-specific revoke was found. The baseline default privileges grant functions to `anon`, `authenticated`, and `service_role` |
| `Self` | Caller is checked with `auth.uid()` |
| `Scoped manager` | Caller is checked against the target organization/department scope |
| `Zeta` | Zeta-level access required |
| `RLS` | Underlying table RLS applies |

`authenticated` confirms only that the caller has a valid Supabase session. Business permission is listed separately for each interface.

## 2. Supabase RPC interfaces

## 2.1 Authentication, users, and performance

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `resolve_user_permissions` | None | `{ typeX, typeY, allowed_scope_tree }` | `A`; `Self` | `supabase.rpc('resolve_user_permissions')` |
| `delete_user_entirely` | `user_uuid` | `void` | `A`; `Zeta`; deletes the user and related records | `supabase.rpc('delete_user_entirely', { user_uuid: userId })` |
| `compute_employee_quarter_metrics` | `p_employee_id`, `p_quarter_year` | `void` | `A`; `SECURITY DEFINER`; no caller/scope check | `supabase.rpc('compute_employee_quarter_metrics', { p_employee_id: employeeId, p_quarter_year: 'Q3_2026' })` |
| `refresh_all_performance_metrics` | None | `void` | `A`; `SECURITY DEFINER`; no caller/scope check | `supabase.rpc('refresh_all_performance_metrics')` |
| `get_quarterly_performance_report` | `p_year`, `p_quarter`; optional `p_org_ids`, `p_dept_ids`, `p_subdept_ids` | Employee performance rows | `A`; `SECURITY DEFINER`; requested scope is not checked against caller scope | `supabase.rpc('get_quarterly_performance_report', { p_year: 2026, p_quarter: 3, p_org_ids: [orgId] })` |

## 2.2 Rosters, shifts, and attendance

### Roster read and structure RPCs

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `get_roster_summary` | `p_organization_id: uuid`, `p_start_date: date`, `p_end_date: date`, optional `p_department_ids: uuid[]`, `p_sub_department_ids: uuid[]` | Rows: date, group/subgroup, shift counts, minutes, unique employees | `D`; `SECURITY INVOKER`, so underlying `shifts` RLS applies | `supabase.rpc('get_roster_summary', { p_organization_id: orgId, p_start_date: '2026-07-01', p_end_date: '2026-07-31' })` |
| `get_shift_delta` | `p_org_id: uuid`, `p_since: timestamptz`; optional department IDs and date range | Up to 500 changed shift rows ordered by `updated_at`, including soft-deleted rows | `A`; `SECURITY DEFINER`; requested organization/department scope is not validated against the caller | `supabase.rpc('get_shift_delta', { p_org_id: orgId, p_since: cursor, p_dept_ids: deptIds, p_start_date: from, p_end_date: to })` |
| `get_employee_shift_window` | `p_employee_id: uuid`, `p_start_date`, `p_end_date`; optional `p_exclude_id` | Rows: `id`, date, start/end time and unpaid-break minutes | `A`; `SECURITY DEFINER`; intentionally bypasses shift RLS but has no caller, employee-ownership, or manager-scope guard | `supabase.rpc('get_employee_shift_window', { p_employee_id: employeeId, p_start_date: from, p_end_date: to, p_exclude_id: null })` |
| `get_employees_shift_window_bulk` | `p_employee_ids: uuid[]`, `p_start_date`, `p_end_date` | Same shift-window fields plus `assigned_employee_id` | Explicitly executable by `anon`, `authenticated`, and `service_role`; `SECURITY DEFINER`; no caller/scope guard | `supabase.rpc('get_employees_shift_window_bulk', { p_employee_ids: employeeIds, p_start_date: from, p_end_date: to })` |
| `add_roster_subgroup_range` | `p_org_id`, `p_dept_id`, `p_sub_dept_id: uuid`; `p_group_external_id`, `p_name: text`; `p_start_date`, `p_end_date: date` | `void` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('add_roster_subgroup_range', { p_org_id: orgId, p_dept_id: deptId, p_sub_dept_id: subDeptId, p_group_external_id: 'FRONT', p_name: 'Team A', p_start_date: '2026-07-01', p_end_date: '2026-07-31' })` |
| `clone_roster_subgroup_v2` | Org/dept IDs, `p_group_external_id`, `p_source_name`, `p_new_name`, start/end dates | `void` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('clone_roster_subgroup_v2', { p_org_id: orgId, p_dept_id: deptId, p_group_external_id: 'FRONT', p_source_name: 'Team A', p_new_name: 'Team B', p_start_date: from, p_end_date: to })` |
| `rename_roster_subgroup_v2` | Org/dept IDs, `p_group_external_id`, `p_old_name`, `p_new_name`, start/end dates | `void` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('rename_roster_subgroup_v2', { p_org_id: orgId, p_dept_id: deptId, p_group_external_id: 'FRONT', p_old_name: 'Team A', p_new_name: 'Team Alpha', p_start_date: from, p_end_date: to })` |
| `delete_roster_subgroup_v2` | Org/dept IDs, `p_group_external_id`, `p_name`, start/end dates | `void` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('delete_roster_subgroup_v2', { p_org_id: orgId, p_dept_id: deptId, p_group_external_id: 'FRONT', p_name: 'Team A', p_start_date: from, p_end_date: to })` |
| `toggle_roster_lock_for_range` | Org/dept/subdept IDs, start/end dates, `p_lock_status: boolean` | One row: `{ updated_count: integer }` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('toggle_roster_lock_for_range', { p_org_id: orgId, p_dept_id: deptId, p_sub_dept_id: subDeptId, p_start_date: from, p_end_date: to, p_lock_status: true })` |

### Roster lifecycle RPCs

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `activate_roster_for_range` | Organization, department and optional sub-department IDs; start/end dates | `{ success: true, days_activated: number }` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('activate_roster_for_range', { p_org_id: orgId, p_dept_id: deptId, p_sub_dept_id: subDeptId, p_start_date: from, p_end_date: to })` |
| `create_planning_period` | Org/dept IDs, `p_sub_dept_ids: uuid[]`, date range; optional template, auto-seed, auto-publish and past-date flags | `{ success, period_id, days_created, seed_results, publish_result }`; may raise validation/duplicate exceptions | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('create_planning_period', { p_org_id: orgId, p_dept_id: deptId, p_sub_dept_ids: subDeptIds, p_start_date: from, p_end_date: to, p_template_id: null, p_auto_seed: true, p_auto_publish: false, p_override_past: false })` |
| `publish_roster_for_range` | Org/dept/subdept IDs, date range; optional `p_user_id` | `{ rosters_published, shifts_published, shift_results }` | `A`; `SECURITY DEFINER`; no caller/scope guard; optional audit actor is caller-controlled | `supabase.rpc('publish_roster_for_range', { p_org_id: orgId, p_dept_id: deptId, p_sub_dept_id: subDeptId, p_start_date: from, p_end_date: to })` |

### Shift creation and editing RPCs

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `sm_create_shift` | `p_shift_data: jsonb`; `p_user_id: uuid` | Created shift UUID | `A`; `SECURITY DEFINER`; parameter-trust warning | `supabase.rpc('sm_create_shift', { p_shift_data: shiftPayload, p_user_id: user.id })` |
| `sm_move_shift` | `p_shift_id`; optional group, subgroup, date and `p_user_id` fields | `{ success: boolean, error?: string }` | `A`; `SECURITY DEFINER`; no scope guard found; parameter-trust warning | `supabase.rpc('sm_move_shift', { p_shift_id: shiftId, p_group_type: 'Front', p_shift_date: '2026-07-21', p_user_id: user.id })` |
| `sm_publish_shift` | `p_shift_id: uuid`; optional `p_user_id` | `{ success, from_state?, to_state?, error? }` | `A`; state checks; no explicit caller/scope guard found | `supabase.rpc('sm_publish_shift', { p_shift_id: shiftId, p_user_id: user.id })` |
| `sm_bulk_publish_shifts` | `p_shift_ids: uuid[]`; optional `p_actor_id` | `{ success?, total_requested?, success_count?, failure_count?, errors? }` | `A`; no explicit caller/scope guard found | `supabase.rpc('sm_bulk_publish_shifts', { p_shift_ids: shiftIds, p_actor_id: user.id })` |
| `sm_unpublish_shift` | `p_shift_id`; optional `p_user_id`, `p_reason` | `{ success, from_state?, to_state?, error? }` | `A`; state checks; no explicit caller/scope guard found | `supabase.rpc('sm_unpublish_shift', { p_shift_id: shiftId, p_user_id: user.id, p_reason: 'Schedule changed' })` |
| `sm_close_bidding` | `p_shift_id`; optional `p_user_id`, `p_reason` | `{ success, from_state?, to_state?, error? }` | `A`; state checks; no explicit caller/scope guard found | `supabase.rpc('sm_close_bidding', { p_shift_id: shiftId, p_user_id: user.id, p_reason: 'No suitable bidder' })` |
| `sm_manager_cancel` | `p_shift_id`; optional `p_user_id`, `p_reason` | `{ success, from_state?, to_state?, error? }` | `A`; intended manager action; no reliable scope binding found in current body | `supabase.rpc('sm_manager_cancel', { p_shift_id: shiftId, p_user_id: user.id, p_reason: 'Event cancelled' })` |
| `sm_delete_shift` | `p_shift_id`; optional `p_user_id`, `p_reason` | `{ success, shift_id?, error?, message?, code? }` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('sm_delete_shift', { p_shift_id: shiftId, p_user_id: user.id, p_reason: 'Manual deletion' })` |
| `sm_bulk_delete_shifts` | `p_shift_ids: uuid[]`; optional `p_deleted_by`, `p_reason` | `{ success, total_requested?, success_count, failure_count?, error? }` | `A`; `SECURITY DEFINER`; no caller/scope guard found | `supabase.rpc('sm_bulk_delete_shifts', { p_shift_ids: shiftIds, p_deleted_by: user.id, p_reason: 'Bulk deletion' })` |
| `delete_shift_cascade` | Caller uses `p_shift_id`, `p_deleted_by` | Caller expects a truthy success result | Cannot be verified: the frontend invokes this RPC, but no defining migration exists in `main` | `supabase.rpc('delete_shift_cascade', { p_shift_id: shiftId, p_deleted_by: user.id })` |

### Shift assignment RPCs

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `sm_bulk_assign` | `p_shift_ids: uuid[]`, `p_employee_id: uuid`, optional `p_user_id` | `{ success, total_requested, success_count, failure_count, message?, error? }` | `A`; requires manager/admin or active Gamma–Zeta certificate, but does not match that certificate to each target shift's scope | `supabase.rpc('sm_bulk_assign', { p_shift_ids: shiftIds, p_employee_id: employeeId, p_user_id: user.id })` |
| `sm_bulk_assign_atomic` | `p_assignments: [{ employee_id, shift_ids }]`, optional `p_user_id`, `p_idempotency_key` | `{ success, total_requested, success_count, conflict_count, conflicts, per_employee }` | `A`; same broad manager/certificate check as `sm_bulk_assign` | `supabase.rpc('sm_bulk_assign_atomic', { p_assignments: [{ employee_id: employeeId, shift_ids: shiftIds }], p_user_id: user.id, p_idempotency_key: crypto.randomUUID() })` |
| `sm_emergency_assign` | `p_shift_id`, `p_employee_id`, optional `p_reason`, `p_user_id` | `{ success, from_state?, to_state?, assigned_to?, error? }` | `A`; `SECURITY DEFINER`; state-only check, no caller/scope authorization found | `supabase.rpc('sm_emergency_assign', { p_shift_id: shiftId, p_employee_id: employeeId, p_reason: 'Emergency cover', p_user_id: user.id })` |
| `sm_unassign_shift` | `p_shift_id`; optional `p_user_id` | `{ success, from_state?, to_state?, error? }` | `A`; `SECURITY DEFINER`; state-only check, no caller/scope authorization found | `supabase.rpc('sm_unassign_shift', { p_shift_id: shiftId, p_user_id: user.id })` |

### Attendance RPCs

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `check_in_shift` | `p_shift_id: uuid`, `p_lat: float`, `p_lon: float` | `{ success, attendance_status?, actual_start?, distance_m?, error? }` | `A`; time/geofence/state checks, but the body does not verify `assigned_employee_id = auth.uid()` | `supabase.rpc('check_in_shift', { p_shift_id: shiftId, p_lat: -33.8688, p_lon: 151.2093 })` |
| `sm_clock_out_shift` | `p_shift_id`, `p_user_id`, optional latitude/longitude | `{ success, actual_end?, actual_net_minutes?, early_out?, distance_m?, error? }` | `A`; geofence/state checks; parameter-trust warning and no ownership binding found | `supabase.rpc('sm_clock_out_shift', { p_shift_id: shiftId, p_user_id: user.id, p_lat: -33.8688, p_lon: 151.2093 })` |

## 2.3 Bidding, offers, planning, and swaps

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `withdraw_bid_rpc` | `p_bid_id`, `p_employee_id` | JSON success result; SQL exceptions for missing/non-pending/started shift | `A`; intended `Self`, but ownership is compared to caller-supplied `p_employee_id`, not directly to `auth.uid()` | `supabase.rpc('withdraw_bid_rpc', { p_bid_id: bidId, p_employee_id: user.id })` |
| `admin_reject_shift_bid` | `p_bid_id`, `p_reason` | Success: `{ success: true, bid_id, shift_id, employee_id }`; failure: `{ success: false, error }` | `A`; `Scoped manager`: Gamma subdepartment, Delta department, Epsilon organization, Zeta global; legacy admin/manager also accepted | `supabase.rpc('admin_reject_shift_bid', { p_bid_id: bidId, p_reason: 'Qualification requirement not met' })` |
| `sm_select_bid_winner` | `p_shift_id`, `p_winner_id`, optional `p_user_id` | `{ success, version? }` or `{ success: false, error, detail? }` | `A`; validates FSM, pending bid and 4-hour lock; delegates authorization/write to missing `sm_apply_shift_op` definition | `supabase.rpc('sm_select_bid_winner', { p_shift_id: shiftId, p_winner_id: employeeId })` |
| `sm_accept_offer` | `p_shift_id`, optional `p_user_id` | `{ success, from_state?, to_state?, error? }` | `A`; state-only; parameter-trust warning, no assigned-employee/auth binding found | `supabase.rpc('sm_accept_offer', { p_shift_id: shiftId, p_user_id: user.id })` |
| `sm_reject_offer` | `p_shift_id`, `p_user_id`, `p_reason` | `{ success, from_state?, to_state?, error? }` | `A`; confirms the shift is assigned to `p_user_id`, but does not bind `p_user_id` to `auth.uid()` | `supabase.rpc('sm_reject_offer', { p_shift_id: shiftId, p_user_id: user.id, p_reason: 'Unavailable' })` |
| `sm_decline_offer` | `p_shift_id`, `p_user_id` | `{ success, from_state?, to_state?, error? }` | `A`; state-only; parameter-trust warning | `supabase.rpc('sm_decline_offer', { p_shift_id: shiftId, p_user_id: user.id })` |
| `sm_expire_offer_now` | `p_shift_id` | `{ success, from_state?, to_state?, error? }` | `A`; intended timer/client transition; state-only, no caller authorization | `supabase.rpc('sm_expire_offer_now', { p_shift_id: shiftId })` |
| `sm_employee_drop_shift` | `p_shift_id`, optional `p_employee_id`, `p_reason` | `{ success, from_state?, to_state?, error? }` | `A`; verifies assignment against `p_employee_id`, but does not bind that value to `auth.uid()` | `supabase.rpc('sm_employee_drop_shift', { p_shift_id: shiftId, p_employee_id: user.id, p_reason: 'Cannot attend' })` |
| `sm_request_trade` | `p_shift_id`, `p_user_id`, optional `p_target_employee_id` | `{ success, trade_id?, error? }` | `A`; verifies assigned employee equals `p_user_id`, but does not bind it to `auth.uid()` | `supabase.rpc('sm_request_trade', { p_shift_id: shiftId, p_user_id: user.id, p_target_employee_id: null })` |
| `sm_accept_trade` | `p_swap_id`, `p_offer_id`, `p_offerer_id`, optional `p_offer_shift_id`, `p_compliance_snapshot` | JSON success/error result | `A`; verifies swap/offer state, but caller identity is represented by parameters rather than bound to `auth.uid()` | `supabase.rpc('sm_accept_trade', { p_swap_id: swapId, p_offer_id: offerId, p_offerer_id: user.id, p_offer_shift_id: offeredShiftId, p_compliance_snapshot: snapshot })` |
| `sm_approve_peer_swap` | Requester/offered shift IDs and requester/offerer user IDs | `void`; raises SQL exceptions on invalid data | `A`; intended manager approval; current body does not implement scoped manager authorization | `supabase.rpc('sm_approve_peer_swap', { p_requester_shift_id: shiftA, p_offered_shift_id: shiftB, p_requester_id: employeeA, p_offerer_id: employeeB })` |
| `sm_finalize_planning_request` | Request/offer/manager IDs, manager notes, source and target `updated_at` snapshots | `void`; raises `WRONG_STATE`, `NO_SELECTED_OFFER`, `SHIFT_MUTATED`, or `MISSING_TARGET_SHIFT_TIMESTAMP` | `D`; the migration grants `authenticated` but does not revoke `PUBLIC`/`anon`; `SECURITY DEFINER`; `p_manager_id` is not bound to `auth.uid()` and no manager-scope guard is present | `supabase.rpc('sm_finalize_planning_request', { p_request_id: requestId, p_offer_id: offerId, p_manager_id: user.id, p_manager_notes: 'Approved', p_shift_updated_at: sourceUpdatedAt, p_target_shift_updated_at: targetUpdatedAt })` |
| `expire_locked_swaps` | None | Rows: `{ expired_id, requester_id, recipient_id }` | `A`; intended scheduled/internal call; no caller authorization | `supabase.rpc('expire_locked_swaps')` |

## 2.4 Template management

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `validate_template_name` | Name and organization/department/subdepartment IDs; optional excluded template ID | `{ valid/is_valid, message/error_message }` | `A`; read-only `SECURITY DEFINER`; no scope guard | `supabase.rpc('validate_template_name', { p_name: 'Weekend Template', p_organization_id: orgId, p_department_id: deptId, p_sub_department_id: subDeptId, p_exclude_id: null })` |
| `check_template_version` | `p_template_id`, `p_expected_version` | Row: `{ version_match, current_version, last_edited_by, last_edited_at }` | `A`; read-only `SECURITY DEFINER`; no scope guard | `supabase.rpc('check_template_version', { p_template_id: templateId, p_expected_version: 3 })` |
| `save_template_full` | Template ID/version/name/description, `p_groups: jsonb`, `p_user_id` | Row: `{ success, new_version, error_message }` | `A`; `SECURITY DEFINER`; no scope guard; parameter-trust warning | `supabase.rpc('save_template_full', { p_template_id: templateId, p_expected_version: 3, p_name: 'Weekend', p_description: '', p_groups: groups, p_user_id: user.id })` |
| `capture_roster_as_template` | Current client: `p_start_date`, `p_end_date`, `p_sub_department_id`, `p_template_name` | `{ template_id, shifts_captured }` | `A`; the current 4-parameter overload uses `auth.uid()` and requires an active certificate covering the target sub-department. A legacy 5-parameter overload with caller-supplied `p_user_id` also remains in the baseline migration and should not be used. | `supabase.rpc('capture_roster_as_template', { p_start_date: from, p_end_date: to, p_sub_department_id: subDeptId, p_template_name: 'July Pattern' })` |
| `publish_template_range` | Template ID, date range, `p_user_id`, optional force override and expected version | JSON including success/error and created/published counts | `A`; `SECURITY DEFINER`; no scope guard; parameter-trust warning | `supabase.rpc('publish_template_range', { p_template_id: templateId, p_start_date: from, p_end_date: to, p_user_id: user.id, p_force_override: false, p_expected_version: 3 })` |
| `apply_template_to_date_range_v2` | Template ID, date range, `p_user_id`; optional source, target dept/subdept and `p_force_stack` | `{ success, shifts_created, shifts_skipped, batch_id, roster_id }` or `{ success: false, error }` | `A`; `SECURITY DEFINER`; no caller/scope guard; parameter-trust warning | `supabase.rpc('apply_template_to_date_range_v2', { p_template_id: templateId, p_start_date: from, p_end_date: to, p_user_id: user.id, p_source: 'roster_modal', p_target_department_id: deptId, p_target_sub_department_id: subDeptId, p_force_stack: false })` |
| `sm_clear_template_application` | `p_roster_id`, `p_template_id`, `p_user_id` | `{ success: true, shifts_deleted: number }` | `A`; `SECURITY DEFINER`; no caller/scope guard; `p_user_id` is trusted and currently unused by the function body | `supabase.rpc('sm_clear_template_application', { p_roster_id: rosterId, p_template_id: templateId, p_user_id: user.id })` |
| `undo_template_batch` | `p_batch_id`, optional `p_user_id` | JSON including success and deleted/restored counts | `A`; `SECURITY DEFINER`; no scope guard | `supabase.rpc('undo_template_batch', { p_batch_id: batchId, p_user_id: user.id })` |
| `delete_template_shifts_cascade` | `p_template_id` | Number of deleted shifts; `-1` on caught SQL error | `A`; `SECURITY DEFINER`; no caller/scope guard | `supabase.rpc('delete_template_shifts_cascade', { p_template_id: templateId })` |

## 2.5 Insights and broadcasts

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `get_insights_summary` | Date range; optional organization, department, subdepartment UUID arrays | JSON KPI summary including fill rate, cost, no-show and reliability metrics | `A`; `SECURITY DEFINER`; requested scopes are not validated against caller scope | `supabase.rpc('get_insights_summary', { p_start_date: from, p_end_date: to, p_org_ids: [orgId], p_dept_ids: null, p_subdept_ids: null })` |
| `get_insights_trend` | Date range; optional organization and department UUID arrays | Rows: `{ period_date, dept_id, dept_name, shifts_total, shifts_assigned, fill_rate, estimated_cost }` | `A`; `SECURITY DEFINER`; no caller-scope validation | `supabase.rpc('get_insights_trend', { p_start_date: from, p_end_date: to, p_org_ids: [orgId], p_dept_ids: null })` |
| `get_dept_insights_breakdown` | Date range; optional organization and department UUID arrays | Rows: department totals, fill rate, cost, no-show and emergency counts | `A`; `SECURITY DEFINER`; no caller-scope validation | `supabase.rpc('get_dept_insights_breakdown', { p_start_date: from, p_end_date: to, p_org_ids: [orgId], p_dept_ids: null })` |
| `get_metric_detailed_analysis` | Metric ID, date range, optional org/dept arrays | JSON: `{ title, summary, details, metrics, chartData, chartType, recommendations }` | `A`; `SECURITY DEFINER`; no caller-scope validation | `supabase.rpc('get_metric_detailed_analysis', { p_metric_id: 'shift-fill-rate', p_start_date: from, p_end_date: to, p_org_ids: [orgId], p_dept_ids: null })` |
| `get_broadcast_analytics` | None | `{ totalGroups, totalBroadcasts, totalMembers, recentBroadcasts }` | `A`; uses `auth.uid()` and limits results to groups where caller is an admin participant | `supabase.rpc('get_broadcast_analytics')` |
| `get_broadcast_ack_stats` | `broadcast_uuid` | One row: `{ total_recipients, acknowledged_count, pending_count, ack_percentage }` | `A`; `SECURITY DEFINER`; no caller/group authorization | `supabase.rpc('get_broadcast_ack_stats', { broadcast_uuid: broadcastId })` |
| `get_broadcast_group_role` | `p_group_id` | `'admin'`, explicit participant role, `'member'`, or `null` | `A`; uses `auth.uid()`; legacy admin/manager becomes `admin`; otherwise checks participation or active-contract hierarchy | `supabase.rpc('get_broadcast_group_role', { p_group_id: groupId })` |

## 2.6 Edge-worker and automation RPCs

These RPCs should normally be called by trusted Edge Functions rather than directly by the browser.

| RPC | Parameters | Return | Permission | Caller/example |
|---|---|---|---|---|
| `sm_assignment_run_start` | `p_scope: jsonb`, `p_engine_version`, optional policy version/options/dry run | `{ ok, run_id?, status?, code?, error? }` | `A`; organization management checked with `aa_user_manages_org`; `NULL auth.uid()` is treated as system/service context | `service.rpc('sm_assignment_run_start', { p_scope: scope, p_engine_version: 'auto-assign@1.0.0', p_policy_version: 1, p_options: {}, p_dry_run: false })` |
| `sm_assignment_run_finish` | Run ID, terminal status, optional summary/error | `{ ok, run_id?, status?, code?, error? }` | `A`; validates caller manages the run organization; service context bypasses caller check | `service.rpc('sm_assignment_run_finish', { p_run_id: runId, p_status: 'COMPLETED', p_summary: summary, p_error: null })` |
| `sm_assignment_run_rollback` | `p_run_id` | `{ ok, run_id, status, reverted, skipped }` or error code | `A`; validates caller manages run organization; service context bypasses caller check | `service.rpc('sm_assignment_run_rollback', { p_run_id: runId })` |
| `sm_swap_auto_decide` | Swap ID, idempotency key, decision payload | `{ ok, code, decision?, decision_id?, gateway? }` | `A`; Gamma–Zeta/admin check for user calls, but no target-scope match; service context allowed | `service.rpc('sm_swap_auto_decide', { p_swap_id: swapId, p_idempotency_key: key, p_payload: payload })` |
| `sm_swap_auto_revert` | `p_decision_id`, `p_actor` | `{ ok, code, decision_id? }` | `A`; Gamma–Zeta/admin check, but no target-scope match; parameter-trust warning for audit actor | `supabase.rpc('sm_swap_auto_revert', { p_decision_id: decisionId, p_actor: user.id })` |
| `sm_swap_queue_claim` | `p_worker: text`, optional `p_limit` | Rows from `swap_review_queue` | `S` | `service.rpc('sm_swap_queue_claim', { p_worker: workerId, p_limit: 10 })` |
| `sm_swap_queue_complete` | Queue ID, status `DONE \| RETRY \| DLQ`, optional error | `{ ok, code }` | `S` | `service.rpc('sm_swap_queue_complete', { p_id: queueId, p_status: 'DONE', p_error: null })` |
| `sm_apply_shift_op` | Referenced contract: shift ID, expected version, operation, payload, optional idempotency UUID | Expected JSON `{ ok, code, state?, version?, ... }` | Cannot be verified: defining migration is absent from `main` | Called internally by auto-assignment and swap automation |
| `ensure_shift_events_partitions` | None | Not verifiable from repository source | Cannot be verified: defining migration is absent from `main` | `service.rpc('ensure_shift_events_partitions')` |

## 2.7 Compliance dependency RPCs

The missing `evaluate-compliance` Edge Function is described as coordinating these database functions:

| RPC | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `check_shift_overlap` | `p_employee_id`, `p_shift_date`, `p_start_time`, `p_end_time`; optional `p_exclude_shift_id` | Boolean | `A`; `SECURITY DEFINER`; no caller/employee/scope guard | `supabase.rpc('check_shift_overlap', { p_employee_id: employeeId, p_shift_date: date, p_start_time: start, p_end_time: end, p_exclude_shift_id: shiftId })` |
| `calculate_weekly_hours` | `p_employee_id`, `p_week_start_date` | Numeric sum of `net_length_minutes`—the current SQL returns minutes despite the function name | `A`; `SECURITY DEFINER`; no caller/employee/scope guard | `supabase.rpc('calculate_weekly_hours', { p_employee_id: employeeId, p_week_start_date: weekStart })` |
| `validate_rest_period` | Employee ID, shift date/start/end; optional `p_minimum_hours` (default `10`) | Boolean | `A`; `SECURITY DEFINER`; no caller/employee/scope guard | `supabase.rpc('validate_rest_period', { p_employee_id: employeeId, p_shift_date: date, p_start_time: start, p_end_time: end, p_minimum_hours: 10 })` |
| `check_shift_compliance` | `p_roster_shift_id`, `p_employee_id`; optional role/skill/license overrides | Row: `{ is_compliant, compliance_status, violations, eligibility_snapshot }` | `A`; `SECURITY DEFINER`; no caller/employee/scope guard | `supabase.rpc('check_shift_compliance', { p_roster_shift_id: shiftId, p_employee_id: employeeId, p_role_id_override: null, p_skill_ids_override: null, p_license_ids_override: null })` |

These functions are dependencies of `evaluate-compliance`; the frontend normally calls the Edge Function instead.

## 3. Supabase Edge Functions

### 3.1 `get-roster-view`

| Item | Value |
|---|---|
| Method | `POST /functions/v1/get-roster-view` |
| Parameters | `organization_id` (required), `start_date` (required), `end_date` (required), optional `department_ids`, `sub_department_ids` |
| Return | `{ shifts, employees, roles, remuneration_levels, events }` |
| Permission | Requires an authorization header. Queries use the caller's JWT and remain subject to table RLS. |
| Example | `supabase.functions.invoke('get-roster-view', { body: { organization_id: orgId, department_ids: [deptId], sub_department_ids: [], start_date: from, end_date: to } })` |

### 3.2 `auto-assign-bids`

Assigns open shifts to the first eligible bidder in the requested scope.

| Route | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `POST /functions/v1/auto-assign-bids` | `scope.organization_id` (required); optional department, sub-department and date range; optional `dry_run` and `options.reject_warnings` | Committed run: `202 { run_id, status, summary }`; dry run: `200 { run_id, status, dry_run, preview, summary }` | Valid user JWT and active Gamma–Zeta certificate covering the requested scope | `fetch(url, { method: 'POST', headers, body: JSON.stringify({ scope: { organization_id: orgId }, dry_run: true }) })` |
| `GET /functions/v1/auto-assign-bids/run/<run_id>` | Run ID in URL | `{ run, decisions }` | Caller must manage the stored run scope | `fetch(url + '/run/' + runId, { headers })` |
| `POST /functions/v1/auto-assign-bids/run/<run_id>/rollback` | Run ID in URL | `{ run_id, status, reverted, skipped }` | Caller must manage the stored run scope | `fetch(url + '/run/' + runId + '/rollback', { method: 'POST', headers })` |

### 3.3 Worker functions

| Edge Function | Parameters | Return | Permission | Invocation example |
|---|---|---|---|---|
| `auto-approve-swaps` | `POST`; no body | `{ claimed, committed, shadow, manual_review, rejected, retried, done, errors }` | Matching `X-Worker-Secret` or service-role bearer; README marks it as not deployed | `fetch(url, { method: 'POST', headers: { 'X-Worker-Secret': workerSecret } })` |
| `partition-manager` | No body | `{ success, message/error, duration_ms, timestamp }` | No handler-level authorization; intended for a protected scheduled/internal call | `fetch(url, { method: 'POST', headers: { Authorization: serviceBearer } })` |
| `shift-lifecycle-updater` | No body | `{ success, updatedCount, totalChecked, logs, timestamp }` | No handler-level authorization; intended for a protected scheduled/internal call | `fetch(url, { method: 'POST', headers: { Authorization: serviceBearer } })` |
| `shift-state-processor` | No body | `{ success, timestamp, finalCalls, expiredOffers, expiredBidding, expiredSwaps, logs }` | No handler-level authorization; intended for a protected scheduled/internal call | `fetch(url, { method: 'POST', headers: { Authorization: serviceBearer } })` |

### 3.4 Caller contracts without repository implementation

The current frontend or workers call the following functions, but `main` has no corresponding `supabase/functions/<name>/index.ts`. Parameters and returns below come from the TypeScript callers. Gateway and handler authorization beyond the stated evidence cannot be verified without the missing server implementations.

| Edge Function | Parameters observed in caller | Expected return | Permission evidence | Invocation example |
|---|---|---|---|---|
| `evaluate-compliance` | `employee_id`, `shift_date`, `start_time`, `end_time`, `net_length_minutes`; optional `exclude_shift_id`, `shift_id`, `override_role_id`, `override_skill_ids`, `override_license_ids` | `{ status, violations, warnings, weeklyHours, maxWeeklyHours, checksPerformed, checksSkipped, qualificationViolations }` | Browser calls use the current Supabase session; `auto-assign-bids` and `auto-approve-swaps` call it with service-role credentials. Handler-level scope checks are unverified. | `supabase.functions.invoke('evaluate-compliance', { body: { employee_id: employeeId, shift_date: date, start_time: start, end_time: end, net_length_minutes: minutes } })` |
| `autoschedule-simulate` | `organizationId`, `dateStart`, `dateEnd`; optional `departmentId`, `subDepartmentId`; `scope`, optional `selectedV8ShiftIds`, `strategy`, `softConstraints`, `snapshotVersion` | `{ sessionId, snapshotVersion, solverHash, assignments, conflicts, summary }` | Called with the current Supabase session; handler-level scope checks are unverified. | `supabase.functions.invoke('autoschedule-simulate', { body: { organizationId: orgId, dateStart: from, dateEnd: to, scope: 'ALL_ELIGIBLE', strategy: 'BALANCED', softConstraints, snapshotVersion } })` |
| `autoschedule-save-draft` | `sessionId`, `snapshotVersion` | `{ success, draftCount }` | Called with the current Supabase session; session ownership and scope checks are unverified. | `supabase.functions.invoke('autoschedule-save-draft', { body: { sessionId, snapshotVersion } })` |
| `autoschedule-commit` | `sessionId`, `snapshotVersion` | `{ success, updatedCount }` | Called with the current Supabase session; session ownership and scope checks are unverified. | `supabase.functions.invoke('autoschedule-commit', { body: { sessionId, snapshotVersion } })` |
