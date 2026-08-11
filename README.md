# Shiftopia — Workforce Scheduling and Shift Management

Shiftopia is a cross-platform workforce scheduling platform for hospitality,
retail, and event teams. Managers can build and publish rosters, while employees
can manage availability, bid for open shifts, request swaps, and track attendance.
Scheduling actions are checked by the compliance engine before they are committed.

## Features

- Shift creation, publishing, and drag-and-drop rostering
- Employee availability, shift bidding, and shift swaps
- Australian labour-rule compliance validation
- OR-Tools-based automatic scheduling
- ML-assisted labour-demand forecasting
- Timesheets and payroll support
- Broadcasts, notifications, and real-time updates
- Workforce analytics and reusable roster templates
- Admin, manager, and employee access levels
- Responsive web UI, dark mode, PWA, and iOS support through Capacitor

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, Radix UI, shadcn/ui |
| Client state | TanStack Query, Zustand |
| Backend | Supabase PostgreSQL, Auth, Storage, and Realtime |
| Edge Functions | Supabase Edge Functions on Deno |
| Optimizer | Python and OR-Tools CP-SAT |
| ML service | Python and FastAPI |
| Monitoring | Sentry |
| CI/CD | GitHub Actions and Vercel |
| Internationalization | i18next |

## Architecture

```text
React web app
├── Supabase ───────── Auth, PostgreSQL, Storage, Realtime, Edge Functions
├── Optimizer ──────── OR-Tools scheduling proposals
└── ML service ─────── Labour-demand forecasts
```

The optimizer proposes assignments but does not write to the database. The web
application validates proposed assignments with the compliance engine before
committing them through Supabase.

Main business modules are located under `src/modules/`:

```text
auth             authentication and authorization
availability     employee availability
broadcasts       announcements and notifications
compliance       labour-rule validation
core             shared layout and application components
insights         analytics and reporting
planning         shift bidding and swaps
rosters          roster and shift management
scheduling       automatic scheduling
settings         organization settings
templates        reusable shift templates
timesheets       attendance and payroll
users            users, profiles, and performance
```

See [Architecture Overview](docs/architecture-overview.md) for module boundaries,
data flow, and ownership.

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop, when running the optimizer and ML services locally
- Supabase CLI, only when applying database changes or deploying Edge Functions

## Local Development

### 1. Clone and install

```sh
git clone https://github.com/unsw-cse-comp99-3900/capstone-project-26t2-9900-t19b-donut.git Shiftopia-Donut
cd Shiftopia-Donut
npm ci
```

### 2. Configure the environment

```sh
cp .env.example .env
```

Set the two required Supabase values in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional local service configuration:

```env
VITE_OPTIMIZER_URL=http://localhost:5005
VITE_ML_URL=http://localhost:8000
```

Do not commit `.env`. Never expose a Supabase service-role key through a
`VITE_` variable; Vite includes these variables in the browser bundle.

### 3. Start the application

Start the optimizer and ML services:

```sh
docker compose up -d optimizer ml
```

Then start the frontend:

```sh
npm run dev
```

Open <http://localhost:5173>. To stop the supporting services, run:

```sh
docker compose stop optimizer ml
```

## Docker Stack

To build and run the frontend, optimizer, and ML service together:

```sh
docker compose up --build -d
```

The web image receives all `VITE_*` values as build arguments because Vite
embeds public configuration in the static bundle during `npm run build`.
Create `.env` from `.env.example` before building. Changing one of these values
requires rebuilding the `web-app` image.

| Service | Local URL |
|---|---|
| Web application | <http://localhost:8080> |
| Optimizer | <http://localhost:5005> |
| ML service | <http://localhost:8000> |
| Web health check | <http://localhost:8080/healthz> |

Useful commands:

```sh
docker compose ps
docker compose logs -f
docker compose down
```

The CI workflow type-checks, lints, tests, and builds the frontend and ML
service, then validates the Compose file, builds all Docker images, and runs
the optimizer test suite inside its image. It does not publish the images to a
container registry.

The Docker web application uses port 8080, while `npm run dev` uses port 5173,
so both can run at the same time when needed.

## Environment Variables

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public Supabase browser key |
| `VITE_OPTIMIZER_URL` | No | Optimizer base URL; defaults to `http://localhost:5005` |
| `VITE_ML_URL` | No | ML service base URL; defaults to `http://localhost:8000` |
| `VITE_SENTRY_DSN` | No | Sentry browser-error reporting |
| `VITE_SENTRY_ENVIRONMENT` | No | Sentry environment label |
| `VITE_SENTRY_RELEASE` | No | Sentry release identifier |

See [.env.example](.env.example) for Sentry sampling and build-time source-map
settings.

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server on port 5173 |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |
| `npm run type-check` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests once |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Generate a unit-test coverage report |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run arch:validate` | Validate module dependency rules |
| `npm run arch:graph` | Regenerate the dependency graph |
| `npm run verify` | Run type-checking, unit tests, and a production build |

Before submitting a change, run:

```sh
npm run verify
```

## Production Deployment

### Frontend on Vercel

The repository deploys through `.github/workflows/ci.yml`. Pull requests receive
a preview deployment, and pushes to `main` deploy to production after type-checks,
tests, and the production build pass.

Configure the following in GitHub before enabling deployment:

| Location | Name |
|---|---|
| Repository secret | `VERCEL_TOKEN` |
| Repository variable | `VERCEL_ORG_ID` |
| Repository variable | `VERCEL_PROJECT_ID` |

Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and any optional service
URLs in the corresponding Vercel project environments. `vercel.json` provides the
single-page application rewrite to `index.html`.

### Supabase changes

Database migrations and Edge Functions are deployed separately from the frontend:

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy <function-name>
```

Apply changes to a staging project first, verify authentication and key scheduling
flows, and then repeat against production. Supabase provides `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions; do not add the service-role
key to the frontend configuration.

### Post-deployment checks

1. Confirm the application loads and authentication succeeds.
2. Test one manager workflow and one employee workflow.
3. Check Supabase Edge Function and database logs for errors.
4. Confirm optimizer and ML health endpoints are reachable if those features are enabled.
5. Check Sentry for new production errors.

See the [Release Checklist](docs/release-checklist.md) and
[Operational Runbook](docs/operational-runbook.md) for release and incident steps.

## Troubleshooting

| Problem | Check |
|---|---|
| Blank page or Supabase connection error | Confirm the two required `VITE_SUPABASE_*` values and restart Vite |
| Port 8080 is already in use | Stop either the Docker web service or the Vite development server |
| Optimizer is unavailable | Run `docker compose ps` and check the optimizer logs |
| ML forecasting is unavailable | Confirm the ML container is healthy and `VITE_ML_URL` is correct |
| A route returns 404 after deployment | Confirm the Vercel SPA rewrite from `vercel.json` is active |

## Documentation

| Document | Description |
|---|---|
| [Architecture Overview](docs/architecture-overview.md) | System architecture and module ownership |
| [DDD Module Standards](docs/ddd-module-standards.md) | Domain-module conventions |
| [Autoscheduler Guide](docs/autoscheduler.md) | OR-Tools optimizer design and usage |
| [Operational Runbook](docs/operational-runbook.md) | Production troubleshooting and operations |
| [Disaster Recovery Runbook](docs/disaster-recovery.md) | Backup, restoration, rollback, and credential recovery procedures |
| [Release Checklist](docs/release-checklist.md) | Pre-release and rollback checks |
| [Hardening Report](docs/HARDENING_2026-04-29.md) | Security and performance hardening |

## License

Proprietary — all rights reserved.
