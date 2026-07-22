# Production environment variables

This inventory covers the web application, deployment pipeline, optimizer, ML
service, and Supabase Edge Functions. Do not commit production values. Variables
whose names begin with `VITE_` are embedded in the browser bundle and must never
contain secrets.

## Web application (Vercel)

| Variable | Required | Purpose / production value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL. Public browser configuration. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase publishable/anon key. Public; RLS remains the security boundary. |
| `VITE_OPTIMIZER_URL` | When optimizer features are enabled | Public base URL of the optimizer service. |
| `VITE_ML_URL` | When forecasting features are enabled | Public base URL of the ML demand service. |
| `VITE_LOG_LEVEL` | No | Client log threshold. Defaults to `info`; `warn` is recommended in production. |
| `VITE_COMPLIANCE_REJECTION_PERSIST` | No | Persist compliance rejection records. Defaults to `true`. |
| `VITE_COMPLIANCE_BLOCKING_ENABLED` | No | Block actions on compliance failure. Defaults to `true`. |
| `VITE_DEMAND_ENGINE_MODE` | No | Demand engine mode. Current default is `ml_only`. |
| `VITE_DEMAND_SERVICE_LEVEL` | No | Demand forecast service level. Current default is `0.5`. |
| `VITE_SENTRY_DSN` | Yes | Public Sentry project DSN used by the browser SDK. |
| `VITE_SENTRY_ENVIRONMENT` | Yes | Sentry environment name, normally `production` or `preview`. The deploy workflow sets it. |
| `VITE_SENTRY_RELEASE` | Yes | Release identifier. The deploy workflow uses the Git commit SHA. |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | No | Trace sampling ratio from `0` to `1`; defaults to `0.1`. |
| `VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | No | Session replay sampling ratio; defaults to `0`. |
| `VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | No | Error-session replay sampling ratio; defaults to `1`. |

Configure Supabase URLs, service URLs, and optional Sentry sampling values in the
corresponding Vercel Production and Preview environments. The deployment workflow
injects `VITE_SENTRY_DSN` from a GitHub Actions variable and generates
`VITE_SENTRY_ENVIRONMENT` and `VITE_SENTRY_RELEASE`.

## GitHub Actions and source maps

| Variable | Storage | Required | Purpose |
| --- | --- | --- | --- |
| `VERCEL_TOKEN` | GitHub Actions secret | Yes | Authorizes the gated Vercel deployment. |
| `VERCEL_ORG_ID` | GitHub Actions variable | Yes | Selects the Vercel team/account. |
| `VERCEL_PROJECT_ID` | GitHub Actions variable | Yes | Selects the Vercel project. |
| `VITE_SENTRY_DSN` | GitHub Actions variable | Yes | Injected into the deployed browser build. |
| `SENTRY_AUTH_TOKEN` | GitHub Actions secret | Yes | Uploads source maps. Use a narrowly scoped organization token intended for CI. |
| `SENTRY_ORG` | GitHub Actions secret | Yes | Sentry organization slug used by the Vite plugin. |
| `SENTRY_PROJECT` | GitHub Actions secret | Yes | Sentry project slug used by the Vite plugin. |
| `VITE_SENTRY_RELEASE` | Workflow-generated | Yes | Set automatically to `${{ github.sha }}`. Do not configure manually. |
| `CAPACITOR_BUILD` | Build environment | Mobile builds only | Disables web-only compression and Sentry source-map upload for Capacitor builds. |

Source maps are generated during the same `vercel build` that produces the
deployed artifact, uploaded under the matching release, and deleted from `dist`
after upload. A production deploy fails early if its monitoring configuration is
incomplete. Builds without complete upload credentials do not emit source maps.

## Optimizer service

| Variable | Required | Purpose / default |
| --- | --- | --- |
| `OPTIMIZER_AUTH_DISABLED` | No | Local-development bypass. Must be unset or `false` in production. |
| `SUPABASE_JWT_SECRET` | Yes | Secret used to verify Supabase access tokens. Server-only. |
| `SUPABASE_JWT_AUDIENCE` | No | Expected JWT audience; defaults to `authenticated`. |
| `OPTIMIZER_CORS_ORIGINS` | Yes | Comma-separated allowed web origins. Do not use a wildcard in production. |
| `OPTIMIZER_RATE_OPTIMIZE` | No | Optimize endpoint rate limit; defaults to `30/minute`. |
| `OPTIMIZER_RATE_AUDIT` | No | Audit endpoint rate limit; defaults to `60/minute`. |
| `OPTIMIZER_MAX_CONCURRENT_SOLVES` | No | Concurrent solver limit; defaults to `2`. |
| `PORT` | No | HTTP port; current container default is `8080`. |
| `WEB_CONCURRENCY` | No | Worker count; current container default is `2`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | OpenTelemetry collector endpoint. Leave unset when OTLP export is disabled. |
| `OTEL_SERVICE_NAME` | No | Telemetry service name; defaults to `superman-optimizer`. |

## ML service

| Variable | Required | Purpose / production value |
| --- | --- | --- |
| `ML_AUTH_DISABLED` | No | Local-development bypass. Must be unset or `false` in production. |
| `ML_JWT_SECRET` | Yes* | JWT verification secret. If unset, the service falls back to `SUPABASE_JWT_SECRET`. |
| `SUPABASE_JWT_SECRET` | Yes* | Fallback JWT verification secret. At least one JWT secret is required. |
| `ML_ALLOWED_ORIGINS` | Yes | Comma-separated allowed web origins. Use explicit production origins. |
| `ML_VERIFY_MANIFEST_HASHES` | No | Verifies model artifact hashes. Set to `true` in production. |
| `VITE_SUPABASE_URL` | Yes | Supabase URL consumed by the current ML service implementation. Despite the prefix, this is server configuration here. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for privileged operations | Privileged Supabase server key used for model registration, manifest verification, and correction-data access. Never expose it to the browser. |
| `VITE_SUPABASE_ANON_KEY` | Conditional | Used by training and as the current ML runtime fallback when `SUPABASE_SERVICE_ROLE_KEY` is unavailable. It cannot replace the service-role key for privileged operations. |

## Supabase Edge Functions

| Variable | Managed by | Required | Purpose |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Supabase | Yes | Built-in project URL. |
| `SUPABASE_ANON_KEY` | Supabase | Yes | Built-in anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Yes | Built-in privileged key for server-side Edge Function operations. |
| `WORKER_SECRET` | Supabase secret | Conditional | Required when the scheduled/internal caller uses `X-Worker-Secret`; a valid service-role bearer token is the alternative. |
| `SWAP_WORKER_BATCH_SIZE` | Supabase secret/config | No | Maximum swaps processed per worker run; defaults to `10`. |

Set custom Edge Function secrets without committing their values:

```bash
supabase secrets set WORKER_SECRET="<generated-secret>" SWAP_WORKER_BATCH_SIZE=10
```

## Production release checklist

1. Configure the Vercel Production variables and the GitHub Actions variables
   and secrets listed above.
2. Confirm authentication bypass flags are absent or `false`, and configure
   explicit CORS origins for both backend services.
3. Deploy through `.github/workflows/ci.yml`; do not upload source maps from a
   separate local build.
4. Trigger a controlled test error after deployment and confirm that Sentry
   shows the `production` environment, Git SHA release, readable stack trace,
   and authenticated user ID/email.
5. Check the deployed static assets and confirm no `.map` files are public.
