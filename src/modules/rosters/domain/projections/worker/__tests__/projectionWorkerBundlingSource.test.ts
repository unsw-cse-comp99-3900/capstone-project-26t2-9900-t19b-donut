import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const poolSource = readFileSync(resolve(testDir, '../projection.worker.pool.ts'), 'utf8');
const clientSource = readFileSync(resolve(testDir, '../projection.worker.client.ts'), 'utf8');
const hookSource = readFileSync(
  resolve(testDir, '../../../../hooks/useRosterProjections.ts'),
  'utf8',
);

describe('projection worker production bundling', () => {
  it('uses Vite worker imports instead of treating the TypeScript worker as an asset', () => {
    for (const source of [poolSource, clientSource]) {
      expect(source).toContain("import ProjectionWorker from './projection.worker?worker'");
      expect(source).toContain('new ProjectionWorker()');
      expect(source).not.toContain("new URL('./projection.worker.ts', import.meta.url)");
    }
  });

  it('falls back to the synchronous projection pipeline when a worker fails', () => {
    expect(hookSource).toContain('pool.onError = (error)');
    expect(hookSource).toContain('runProjectionPipeline({');
    expect(hookSource).toContain('setWorkerStats(syncStats)');
  });
});
