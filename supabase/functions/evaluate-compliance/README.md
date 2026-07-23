# evaluate-compliance

Authoritative server-side compliance adapter used by roster publishing, bidding,
and swaps. It runs the existing database checks with service-role visibility and
returns the shared `ComplianceResult` contract consumed by the frontend.

## Checks

- Shift overlap (`check_shift_overlap`)
- Projected Monday-to-Sunday hours, capped at 48 hours (`calculate_weekly_hours`)
- Minimum 11-hour rest period (`validate_rest_period`)
- Role, skill, and licence requirements (`check_shift_compliance`)

`calculate_weekly_hours` currently returns minutes despite its name. This
function converts that value to hours and adjusts it for the candidate and any
shift being replaced, preventing double-counting during publish and swaps.

The function is fail-closed when every attempted database check is unavailable.
Individual check failures are reported through `warnings` and `checksSkipped`.

## Test

```bash
npx vitest run --config supabase/functions/evaluate-compliance/vitest.config.ts
```

## Deploy

JWT verification is enabled in `supabase/config.toml`.

```bash
npx supabase functions deploy evaluate-compliance --project-ref <project-ref>
```
