import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const rosterViewSource = readFileSync(
  resolve(testDir, '../../../../../supabase/functions/get-roster-view/index.ts'),
  'utf8',
);

describe('get-roster-view schema contract', () => {
  it('selects the canonical roster subgroup foreign key from shifts', () => {
    expect(rosterViewSource).toMatch(/^\s*roster_subgroup_id,\s*$/m);
    expect(rosterViewSource).not.toMatch(/^\s*shift_subgroup_id,\s*$/m);
  });
});
