# Apple push notification worker

This Edge Function drains the durable `push_notification_deliveries` outbox and
sends alert pushes directly to APNs. The normal `notifications` table remains
the source of truth, so shifts, bids, swaps, broadcasts, and timesheets all use
the same delivery path.

## Required secrets

Set these as Supabase Edge Function secrets. Never add the `.p8` file to Git.

```bash
supabase secrets set \
  APNS_KEY_ID="<10-character key id>" \
  APNS_TEAM_ID="<10-character Apple team id>" \
  APNS_BUNDLE_ID="com.shiftopia.app" \
  PUSH_WORKER_SECRET="<random high-entropy value>"
```

Set the private key without pasting it into shell history:

```bash
supabase secrets set APNS_PRIVATE_KEY --env-file /path/to/private-apns.env
```

The env file should contain one entry whose value preserves the PEM newlines:

```dotenv
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically.

## Deploy

```bash
supabase db push
supabase functions deploy send-apns-notifications --no-verify-jwt
```

## Invoke

Schedule a POST once per minute in Supabase Scheduled Functions:

```text
POST /functions/v1/send-apns-notifications
X-Push-Worker-Secret: <PUSH_WORKER_SECRET>
```

The worker claims at most 50 jobs, retries transient APNs failures with
exponential backoff, recovers stale claims, and disables tokens rejected by
APNs. It is safe for the schedule to invoke it again while no work is pending.

For lower latency, a Supabase Database Webhook may additionally invoke the same
endpoint when a row is inserted into `push_notification_deliveries`; keep the
minute schedule as recovery for transient failures.

## Development and production tokens

Xcode/debug builds must set `VITE_APNS_ENVIRONMENT=development`; TestFlight and
App Store builds must set it to `production`. Each device token records its
gateway environment so both build types can coexist.
