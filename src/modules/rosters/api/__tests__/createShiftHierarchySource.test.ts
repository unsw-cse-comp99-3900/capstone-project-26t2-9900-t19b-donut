import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const queriesSource = readFileSync(resolve(testDir, '../shifts.queries.ts'), 'utf8');
const commandsSource = readFileSync(resolve(testDir, '../shifts.commands.ts'), 'utf8');
const orchestratorSource = readFileSync(
  resolve(testDir, '../../ui/dialogs/EnhancedAddShiftModal/hooks/useShiftFormOrchestrator.ts'),
  'utf8',
);

describe('create-shift roster hierarchy contract', () => {
  it('preserves roster group and subgroup UUIDs in the structure lookup', () => {
    expect(queriesSource).toContain('groupId: group.id');
    expect(queriesSource).toContain('subGroupId: sub.id');
    expect(queriesSource).toContain('external_id');
  });

  it('resolves hierarchy IDs from the dedicated structure lookup', () => {
    expect(orchestratorSource).toContain('rosterStructure.find(slot =>');
    expect(orchestratorSource).toContain('groupId = structureGroup.groupId');
    expect(orchestratorSource).toContain('subGroupId = structureSubGroup.subGroupId');
    expect(orchestratorSource).toContain(
      'roster_subgroup_id: resolvedContext.subGroupId || null',
    );
    expect(orchestratorSource).toContain("title: 'Missing Roster Hierarchy'");
    expect(orchestratorSource).toContain(
      "operation: 'createShift.resolveRosterHierarchy'",
    );
  });

  it('sends the database RPC its canonical roster_subgroup_id key', () => {
    expect(commandsSource).toContain(
      'shiftData.roster_subgroup_id ?? shiftData.shift_subgroup_id',
    );
    expect(commandsSource).toContain('roster_subgroup_id: safeUuid(');
  });
});
