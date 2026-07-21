# Shiftopia User Guide

This guide explains the user-facing workflows currently available in Shiftopia. It covers system administration, roster management, and the main employee self-service tasks.

> The menus and actions shown to a user depend on their active employment contract, access certificate, feature permissions, and organizational scope. If an item in this guide is not visible, the user may not have permission to use it.

## 1. Access and roles

Users need an active account and at least one active employment contract or active access certificate to enter the workspace. Users with neither are redirected to **Pending Access**.

Access certificates control which records and management tools a user can see.

| Level | Typical role | Scope |
|---|---|---|
| Alpha | Employee | Own records only |
| Beta | Team Lead | Employee self-service plus read-only Timesheets; record visibility remains subject to scope and RLS |
| Gamma | Sub-department Manager | One assigned sub-department |
| Delta | Department Manager | One assigned department |
| Epsilon | Organization Admin | One assigned organization |
| Zeta | Super Admin | All organizations |

Type X certificates are intended for employee-level access. Type Y certificates provide managerial access within an organization, department, or sub-department. Always grant the smallest scope required for the user's work.

## 2. Getting started

1. Sign in from the **Login** page.
2. Use the left navigation to open a workspace module.
3. Where a scope selector is shown, choose the organization, department, or sub-department you want to work with.
4. Open **Settings** to update your profile, request a password-reset email, or change appearance preferences.

Employee and management pages are available on mobile, although complex roster-management tasks are easier to perform on desktop. **My Roster**, **My Broadcasts**, and **My Notifications** can display cached information while offline; actions that change data require a connection.

## 3. Administrator and manager guide

### 3.1 Onboard and manage an employee

New employees currently create their own account through **Sign Up**. An administrator then completes the employee record:

1. Open **Users**.
2. Search for and select the employee.
3. Review the employee's skills, licences, work rights, contracts, and access certificates.

#### Record skills, licences, and work rights

- In **Skills**, select **Add Skill**, choose the skill, enter the issue and expiry dates when applicable, and save.
- In **Licenses**, select **Add License**, choose a licence, enter the issue date and any required expiry date, and save.
- In **Work Rights**, select **Add Work Rights**, choose the visa or work-right record, enter its dates, and save.
- Use the remove action only when a qualification is no longer valid or was added incorrectly.

Only skills, licences, and visa types already present in the system reference lists can be assigned from this page.

#### Add an employment contract

1. In **Employment Contracts**, select **Add Contract**.
2. Select the organization, department, sub-department, and role.
3. Select the employment type and enter contracted weekly hours or annual guaranteed hours, as applicable.
4. Complete remuneration, apprenticeship, traineeship, or supported-wage fields when they apply.
5. Select **Add Contract**.

Use the edit action on an existing contract to correct it. Removing a contract can prevent the employee from entering the workspace, so confirm that the employee no longer requires it first.

#### Grant system access

1. In **System Access Certificates**, select **Add Certificate**.
2. Choose **Type X** for employee access or **Type Y** for managerial access.
3. Select the access level.
4. For a scoped level, select the required organization, department, and sub-department.
5. Review the scope and select **Grant Access**.

Contracts and access certificates are different: a contract records where and how the employee works, while an access certificate controls what the employee can view and manage. Edit or revoke a certificate when responsibilities change. Zeta access should be reserved for users who genuinely require unrestricted global administration.

> Current limitation: the **New User**, **Edit Profile**, **Filters**, and **Export** controls on the User Management page are displayed but are not connected to working actions in the current interface. Permanent account deletion is a separate high-privilege operation and should only be performed by an authorized Zeta administrator.

### 3.2 Configure reusable roster templates

1. Open **Templates** and select the required management scope.
2. Select **New Template**.
3. Enter a template name and optional description, then confirm the organization hierarchy.
4. Add subgroups and shifts to the appropriate template groups.
5. Save the draft after making changes.
6. Select **Ready** when the template is complete. A ready template is read-only until **Unlock** is selected.

The template menu also supports duplicate, rename, archive, restore, and delete actions. Archive templates that may be needed again; delete only records that are no longer required.

### 3.3 Build and publish a roster

1. Open **Rosters** and select the required scope and date range.
2. Choose **Day**, **3D**, **Week**, or **Month**, and switch between **Group**, **People**, **Events**, and **Roles** modes as needed.
3. Create a shift from the roster and enter its date, time, role, breaks, and organizational placement.
4. Assign an eligible employee, or leave the shift available for the configured bidding process.
5. Review any compliance warnings before continuing.
6. Select one or more draft shifts and choose **Publish**.
7. Review the pre-publish validation and select **Confirm Publish**.

Publishing makes eligible shifts visible to employees. An assigned shift may be sent to the employee as an offer. Use **Unpublish** to return eligible published shifts to Draft; this hides them from employees. Bulk mode also provides **Assign** and **Delete** actions.

Use **Apply Template** to populate a roster from a ready template. Use **Snap** to capture a selected roster date range as a reusable template.

### 3.4 Review open-shift bids

1. Open **Open Bids**.
2. Select an urgent or normal open shift.
3. Select a bidder to review eligibility and compliance information.
4. Choose **Finalize Assignment** to assign a compliant bidder.
5. If a bid must be removed, choose **Reject & withdraw bid**, enter the reason, and confirm.

**Auto-Assign Safe Bids** evaluates open shifts and assigns candidates that pass the automated checks. Review its completion summary and manually handle any skipped shifts or warnings.

### 3.5 Review swap requests

1. Open **Swap Requests**.
2. Start with requests in **Pending Manager** status.
3. Compare the requester's original shift with the selected employee's offered shift.
4. Review hours, pay differences, qualifications, and compliance results.
5. Select **Approve** to complete the exchange, or **Reject**, enter a reason, and confirm.

Bulk approve and reject actions are available when several requests are selected. Do not approve a request if either employee is no longer eligible for the resulting shift.

### 3.6 Review timesheets

1. Open **Timesheets** and select the organization scope and date range.
2. Filter by **Pending**, **Approved**, **Rejected**, or **No-Show**.
3. Review scheduled times, clock-in and clock-out times, adjusted times, and breaks.
4. Once the shift has ended with a clock-out, automatic clock-out, or no-show state, correct billable times if required.
5. Approve or reject the entry. Use **Mark No-Show** when an ended shift has no attendance record.

Timesheet review actions remain locked while a shift is still in progress. Bulk approval and rejection are available to users with the `timesheet-edit` permission.

### 3.7 Send team broadcasts

1. Open **Broadcast**.
2. Create a broadcast group, or open an existing group.
3. Add participants and assign appropriate member, broadcaster, or admin roles.
4. Select a channel and open **Compose Broadcast**.
5. Enter the subject and message, then choose **Normal**, **High**, or **Urgent** priority.
6. Add supported attachments if required.
7. Check the participant count, select **Send Broadcast**, review the confirmation, and send.

Employees receive these messages in **My Broadcasts**. Broadcast channels are read-only for ordinary employee members.

### 3.8 Configure available settings

The current **Settings** page provides:

- **Profile**: first name, last name, and phone number; the account email is read-only.
- **Security**: request a password-reset email.
- **Appearance**: theme, organization brand colour, chart style, language, cookie-banner preference, and group colouring.

Notification settings, billing, integrations, and two-factor authentication are currently marked as under development. Organization, department, role, skill, and licence master records are not created from the current Settings interface.

## 4. Employee guide

### 4.1 View your roster and shift details

1. Open **My Roster**.
2. Switch between **Day**, **3D**, **Week**, and **Month** views.
3. Use the arrows or **Today** to move to the required date.
4. Select a shift to view its date, time, role, location hierarchy, breaks, and current status.
5. Use **Share link** when you need to share the authenticated shift link.

If the **Offers** button shows a pending count, open it and review each offer. Select **Accept** to take the shift or **Decline** to reject it. Accepted and declined offers remain available in their history tabs.

### 4.2 Apply for an open shift

In Shiftopia, applying for an open shift is called placing a bid.

1. Open **My Bids**.
2. Review the open shifts and their closing countdowns.
3. Check the role, time, location, and eligibility status.
4. Select **Bid Now** or **Bid**.
5. Review any compliance warning and confirm when the system allows the bid to continue.

A pending bid can be withdrawn before the bidding window closes. The current interface closes bidding four hours before the shift starts. Use bulk selection to bid on, or withdraw from, several eligible shifts at once. The final outcome appears on the bid and in **My Notifications**.

### 4.3 Set your availability

1. Open **My Availabilities**.
2. Select **Add Availability**.
3. Enter the start date and the time range when you are available.
4. To create a recurring rule, enable repeat, choose daily, weekly, or fortnightly, select the required weekdays, and set **Repeat until**.
5. Select **Create Rule**.

Existing rules appear in **Availability Rules** and can be edited or deleted. The calendar shows available, partial, assigned, and unset days. Assigned intervals are shown as locked and take priority over declared availability.

### 4.4 Request a shift swap

1. Open **My Roster** and select the assigned shift you want to exchange.
2. Select **Swap**.
3. Enter the reason and select **Create Request**.
4. Open **My Swaps** to monitor the request.
5. When offers arrive, open **My Swaps**, view the received offers, and compare both shifts.
6. Select **Approve & Send to Manager** for the preferred offer, or reject an unsuitable offer.
7. Wait for final manager approval.

Swap requests must be created at least four hours before the shift. Both employees must be qualified, and a swap is not complete until the manager approves it.

### 4.5 Offer one of your shifts in exchange

1. Open **My Swaps** and select the **Available** tab.
2. Choose a colleague's request and select **Offer Swap**.
3. Select one of your eligible future shifts.
4. Review the compliance result and submit the offer.
5. Use **My Offers** to track or withdraw the offer while it remains pending.

An offered shift cannot be in the past, within four hours of starting, or already committed to another active offer.

### 4.6 Drop a shift

Dropping a shift is different from swapping it: the shift is returned to the open-shift process rather than exchanged directly with a colleague.

1. Open the shift in **My Roster**.
2. Select **Drop**.
3. Enter the cancellation reason.
4. Select **Confirm Drop**.

A shift cannot be dropped within four hours of its start, after it has commenced, after check-in, while it is part of an active swap or offer, or while offline. A successful drop makes the shift available for bidding.

### 4.7 Clock in, clock out, and view attendance

1. Open **My Attendance**.
2. Find today's shift. **Clock In** becomes available one hour before the scheduled start.
3. Allow location access and wait for a GPS fix.
4. Select **Clock In** at the start of work.
5. Select **Clock Out** when the shift ends.
6. Use the date controls and status filter to review previous attendance records.

Clock-in is blocked when the browser cannot obtain a GPS location. If a clock-out is missed, the record may be automatically closed and must be reviewed by a manager in Timesheets.

### 4.8 Read broadcasts and notifications

- Open **My Broadcasts**, select a group and channel, and open a message to read its content or download attachments.
- Open **My Notifications** to review roster, bid, swap, offer, and timesheet updates.
- Mark a notification as read after reviewing it. Actionable offers and swaps should be completed from their related roster or request page.

## 5. Common problems

| Problem | What to check |
|---|---|
| Redirected to Pending Access | Ask an administrator to confirm that the user has an active employment contract or active access certificate. |
| A menu item is missing | Confirm the user's access certificate, scope, and feature permission. |
| A bid is unavailable | Check eligibility, compliance messages, and the bidding countdown. |
| Swap or drop is disabled | The shift may be within four hours, in progress, checked in, offline, or already involved in another request. |
| Clock In is disabled | Confirm the shift is within its clock-in window and allow GPS access. |
| A management action is denied | Confirm that the selected record is inside the manager's certificate scope. |
| Changes are not visible | Refresh the page and verify the current organization and date filters. |
