import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260721010000_allow_shift_assigners_insert_shift_events.sql',
  ),
  'utf8',
);

describe('shift event insert policy', () => {
  it('allows scoped shift assigners to write the audit event created by the assignment trigger', () => {
    expect(migration).toContain('shift.id = shift_events.shift_id');
    expect(migration).toContain("'shift.edit'");
    expect(migration).toContain("'shift.assign'");
    expect(migration).toMatch(
      /user_has_action_in_scope\(\s*'shift\.edit'[\s\S]+?\)\s+OR\s+public\.user_has_action_in_scope\(\s*'shift\.assign'/,
    );
  });
});

