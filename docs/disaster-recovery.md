# Disaster Recovery Runbook

## 1. Purpose

This runbook describes how to recover Shiftopia after data loss, database
corruption, a failed deployment, a service outage, or lost or compromised
credentials. It is written for customer-managed production deployments.

The customer owns the production Supabase and hosting accounts. Backup
availability, retention, Point-in-Time Recovery (PITR), Recovery Point Objective
(RPO), and Recovery Time Objective (RTO) therefore depend on the customer's
selected plans, configuration, and operational requirements.

## 2. Scope

This runbook covers:

- Supabase PostgreSQL, Auth, Storage, Realtime, and Edge Functions
- the Shiftopia frontend hosted on Vercel
- the OR-Tools optimizer service
- the ML forecasting service and model files
- deployment configuration and secrets

It does not replace the customer's business-continuity, legal, privacy, or
incident-notification procedures.

## 3. Customer Recovery Profile

The customer must complete and approve this table before production go-live.
Review it after hosting changes and at least once every six months.

| Item | Customer configuration |
|---|---|
| Production owner | TBD before go-live |
| Incident lead | TBD before go-live |
| Supabase organization and project reference | TBD before go-live |
| Supabase plan | TBD before go-live |
| Managed database backup type | Daily backup / PITR / none / other |
| Backup retention | TBD before go-live |
| Independent logical backup schedule | TBD before go-live |
| Storage object backup schedule | TBD before go-live |
| Off-site backup location | TBD before go-live |
| RPO | TBD before go-live |
| RTO | TBD before go-live |
| Vercel project owner | TBD before go-live |
| Optimizer and ML hosting owner | TBD before go-live |
| Internal escalation channel | TBD before go-live |
| Supabase/Vercel support route | TBD before go-live |

If the selected Supabase plan and configuration do not meet the approved RPO or
retention requirement, the customer must schedule independent logical database
exports and store them in an encrypted, access-controlled, off-site location.

## 4. Responsibilities

| Role | Responsibility |
|---|---|
| Incident lead | Declares the incident, coordinates recovery, and approves return to service |
| Supabase owner | Manages database, Auth, Storage, Edge Functions, backups, and restores |
| Deployment owner | Rolls back or redeploys the frontend and application services |
| Security owner | Rotates credentials and reviews access and audit evidence |
| Business owner | Confirms business impact and validates recovered roster data |

One person may hold multiple roles, but a second authorized person should review
any production database restore or destructive repair.

## 5. Recovery Priority

Restore services in this order:

1. Supabase database and Auth
2. critical Edge Functions and Realtime updates
3. Shiftopia frontend
4. Supabase Storage attachments
5. optimizer service
6. ML forecasting service
7. monitoring and non-critical integrations

The optimizer and ML service must never be treated as the authoritative source
of roster data. Core manual scheduling should be validated before these optional
services are returned to operation.

## 6. Backup Policy

### 6.1 Database

Before go-live, the Supabase owner must confirm the project's available restore
points in **Supabase Dashboard → Database → Backups**. Managed daily backups and
PITR availability vary by plan and project configuration. Do not assume that
either feature is enabled.

Supabase documents the current managed-backup and PITR behavior in its
[Database Backups guide](https://supabase.com/docs/guides/platform/backups).
PITR must be enabled before an incident to be usable.

For independent logical backups, follow Supabase's current
[CLI backup and restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
A typical export separates roles, schema, and data:

```sh
supabase db dump --db-url "$SHIFTOPIA_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$SHIFTOPIA_DB_URL" -f schema.sql
supabase db dump --db-url "$SHIFTOPIA_DB_URL" -f data.sql --use-copy --data-only
```

`SHIFTOPIA_DB_URL` must be obtained securely from the customer project at backup
time. Do not save the connection string in this repository or shell history.
Confirm the current Supabase instructions before running a production backup,
because exclusions and restore requirements may change.

Every backup set must record:

- production project reference
- UTC creation time
- database and CLI versions
- included files and checksums
- encryption and storage location
- retention or deletion date
- person or automation that created it
- most recent restore-test result

### 6.2 Storage Objects

Supabase database backups contain Storage metadata, not the actual objects stored
through the Storage API. Broadcast attachments and other uploaded files therefore
require a separate export or replication process.

Maintain an inventory of production buckets, access policies, object counts, and
the approved backup destination. A recovery test must verify both the objects and
their database metadata.

### 6.3 Source Code, Configuration, and Models

Keep the following in version control:

- application source code and lockfiles
- `supabase/migrations/`
- `supabase/functions/`
- Docker and deployment configuration
- optimizer and ML source code
- reproducible ML training scripts and approved model artifacts

Keep an inventory of environment-variable names and their owners, but never put
secret values in Git or this document. Store secrets in the customer-approved
secret manager and test the emergency-access process.

### 6.4 Restore Testing

Test restoration into an isolated non-production project:

- before initial production launch
- after a material schema, Auth, Storage, or hosting change
- at the interval agreed with the customer
- after changing the backup method

A backup is not considered verified until the post-recovery checklist in this
document passes.

## 7. Incident Response

For every suspected disaster:

1. Record the detection time in UTC, reporter, symptoms, and affected services.
2. Appoint the incident lead and open the customer escalation channel.
3. Preserve relevant Supabase, Vercel, application, container, and security logs.
4. Stop deployments, migrations, automated repair jobs, and other risky writes.
5. If integrity is uncertain, prevent further business writes where operationally possible.
6. Determine the last known-good time and the maximum acceptable data-loss window.
7. Choose the least destructive recovery method that meets the approved RPO and RTO.
8. Obtain the customer's required approval before restoring or repairing production data.

Do not delete a Supabase project as a recovery step. Project deletion also removes
associated platform data and backups and is not reversible.

## 8. Recovery Procedures

### 8.1 Supabase Platform Outage

1. Check [Supabase Status](https://status.supabase.com/) and the project health page.
2. Confirm the incident is not caused by an expired credential, quota, paused project, or recent migration.
3. Pause deployments and data repairs while the platform incident is active.
4. Inform users of affected functions and record the outage window.
5. After recovery, review Database, Auth, Realtime, and Edge Function logs.
6. Run the post-recovery checklist before closing the incident.

Do not restore a database merely because the hosted platform is temporarily
unavailable; restoration cannot correct an external availability incident.

### 8.2 Database Loss or Corruption

1. Identify the last known-good time using audit evidence and application logs.
2. Record the current project reference, available restore points, backup timestamps, and estimated data loss.
3. Prefer validating the selected backup in an isolated project before changing production.
4. Select one approved path:
   - managed daily-backup restore, if available;
   - PITR to a time immediately before the incident, if already enabled; or
   - manual logical restore into a replacement project.
5. Announce the expected downtime. A managed restore makes the project unavailable while it runs.
6. Complete the selected restore using the current Supabase instructions.
7. For a replacement project, reconfigure Auth URLs, API keys, secrets, Edge Functions, Storage buckets, RLS policies, Realtime publications, and application environment variables.
8. Restore Storage objects separately.
9. Run the post-recovery checklist and obtain business-owner approval.
10. Reopen access and monitor errors and business events closely.

Use a point before the first corrupting write, not merely the latest available
point. Any records written after that point must be reconciled from approved
evidence where possible.

### 8.3 Storage Object Loss

1. Identify affected buckets, object paths, and the loss window.
2. Stop the operation responsible for deletion or corruption.
3. Restore objects from the independent Storage backup into an isolated bucket first.
4. Verify object checksums, MIME types, access policies, and metadata mappings.
5. Restore approved objects to production.
6. Confirm users can access only objects permitted by the applicable policies.

A database restore alone does not restore deleted Storage objects.

### 8.4 Frontend Deployment Failure

1. Check GitHub Actions, Vercel deployment logs, and recent environment changes.
2. In Vercel, select the most recent known-good deployment and use the platform rollback action.
3. Confirm production environment variables are attached to the restored deployment.
4. Test login, manager roster access, and an employee workflow.
5. Fix the faulty change through the normal pull-request process before redeploying.

See Vercel's current [deployment rollback guidance](https://vercel.com/academy/vercel-foundations/deployments).
A frontend rollback does not reverse database migrations or data changes.

### 8.5 Edge Function Failure

1. Identify the affected function from Supabase logs.
2. Confirm whether the failure is code, configuration, secret, permission, or upstream-service related.
3. Redeploy the last known-good function version from Git if code caused the incident.
4. Rotate or restore required server-side secrets through the approved secret manager.
5. Invoke the function in a safe test scenario and verify its database effects.
6. Review failed events for manual replay or reconciliation.

### 8.6 Optimizer or ML Service Failure

1. Check the service health endpoint and container or hosting logs.
2. Confirm configuration, model files, CPU/memory capacity, and upstream connectivity.
3. Restart the unhealthy service once; do not create an uncontrolled restart loop.
4. If necessary, redeploy the last known-good image or commit.
5. Keep automatic optimization or forecasting unavailable until validation passes.
6. Confirm managers can continue with approved manual scheduling workflows.

Optimizer proposals must pass the compliance engine before database commit after
the service is restored.

## 9. Rollback Procedure

Use rollback when a deployment is faulty but the authoritative production data
remains trustworthy.

1. Record the faulty commit, deployment, migration, and incident time.
2. Roll back the frontend or service to the last known-good deployment.
3. Redeploy the previous Edge Function version when required.
4. Treat database rollback separately:
   - use a previously tested corrective migration when data remains valid; or
   - use an approved backup/PITR restore when integrity cannot be safely repaired.
5. Never improvise a production `DELETE` or `UPDATE` to imitate rollback.
6. Run the post-recovery checklist and document the outcome.

Restoring the database can discard valid writes made after the selected recovery
point. The incident lead and business owner must explicitly accept that impact.

## 10. Lost or Compromised Credentials

Treat a missing, exposed, accidentally committed, or unexpectedly used credential
as compromised.

1. Identify the credential, owner, permissions, and possible exposure window.
2. Revoke or rotate it at the issuing provider.
3. Update every authorized consumer, including Vercel, GitHub Actions, Edge Function secrets, and service hosting.
4. Redeploy or restart affected services so they use the new value.
5. Review provider, authentication, database, deployment, and audit logs.
6. Remove leaked values from current files and coordinate Git-history remediation if applicable.
7. Confirm the old credential no longer works.
8. Record affected systems, evidence, customer notifications, and follow-up controls.

Prioritize rotation of database passwords, Supabase server-side keys, Vercel and
GitHub tokens, Sentry tokens, and third-party integration secrets. Never place a
Supabase service-role key in a `VITE_` variable or browser code.

## 11. Database Anomaly Procedure

Examples include missing shifts, duplicate assignments, impossible state
transitions, incorrect RLS access, or an unintended bulk update.

1. Stop the suspected code path, job, function, or user access without destroying evidence.
2. Record organization, user, shift, bid, swap, and timesheet identifiers affected.
3. Preserve logs and take a fresh logical snapshot when safe.
4. Determine whether the issue is display-only, isolated data corruption, or systemic corruption.
5. Reproduce and test the correction against a restored non-production copy.
6. Prefer a reviewed, transactional, auditable repair migration over manual edits.
7. Back up affected rows before applying the repair.
8. Re-run compliance validation for affected assignments.
9. Verify related bids, swaps, availability, timesheets, notifications, and audit records.
10. Use full restore only when a bounded repair cannot reliably restore integrity.

## 12. Post-Recovery Checklist

- [ ] Users can sign in and sign out.
- [ ] Admin, manager, and employee access controls work.
- [ ] Organizations, profiles, contracts, and roles are present.
- [ ] Rosters and shifts match the accepted recovery point.
- [ ] Availability can be read and updated.
- [ ] Bids and swaps follow their expected workflows.
- [ ] Compliance validation blocks invalid assignments.
- [ ] Timesheet records are present and accessible to authorized users.
- [ ] Required Edge Functions execute successfully.
- [ ] Realtime updates reach authorized clients.
- [ ] Storage attachments open and access policies are enforced.
- [ ] Optimizer and ML health checks pass, if enabled.
- [ ] Supabase, Vercel, container, and Sentry logs show no new critical errors.
- [ ] The business owner accepts the restored data and any documented loss window.
- [ ] Monitoring is increased for the agreed observation period.

## 13. Incident Record

Record the following for every disaster-recovery event:

| Field | Value |
|---|---|
| Incident ID | |
| Detected at (UTC) | |
| Resolved at (UTC) | |
| Incident lead | |
| Affected services and customers | |
| Root cause | |
| Last known-good time | |
| Actual recovery point and data-loss window | |
| Backup or deployment restored | |
| Actions and approvals | |
| Validation result | |
| Follow-up owner and due date | |

## 14. Document Maintenance

The customer production owner must review this runbook after every recovery event,
material architecture change, hosting-plan change, or failed restore test. Update
the customer recovery profile, commands, provider links, and contact routes before
the next production release.
