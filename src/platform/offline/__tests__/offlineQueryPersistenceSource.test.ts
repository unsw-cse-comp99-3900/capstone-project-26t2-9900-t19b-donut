import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldPersistOfflineQuery } from '../offlineQueryPersistence';

const root = process.cwd();
const providerWrapperSource = readFileSync(resolve(root, 'src/modules/core/providers/ProviderWrapper.tsx'), 'utf8');
const offlinePersistencePath = resolve(root, 'src/platform/offline/offlineQueryPersistence.ts');

describe('offline query cache wiring', () => {
  it('boots query persistence without allowing profile queries to be restored offline', () => {
    expect(existsSync(offlinePersistencePath)).toBe(true);

    const offlinePersistenceSource = readFileSync(offlinePersistencePath, 'utf8');

    expect(offlinePersistenceSource).toContain('@tanstack/react-query-persist-client');
    expect(offlinePersistenceSource).toContain('idb-keyval');
    expect(offlinePersistenceSource).toContain('shouldPersistOfflineQuery');
    expect(providerWrapperSource).toContain('setupOfflineQueryPersistence(queryClient)');
    expect(offlinePersistenceSource).not.toContain("['user-profile']");
    expect(offlinePersistenceSource).not.toContain('profile-cache-v1');
  });
});

describe('offline query persistence allow-list', () => {
  it('persists only read-only employee roster queries', () => {
    expect(shouldPersistOfflineQuery(['user-profile', 'user-1'])).toBe(false);
    expect(shouldPersistOfflineQuery(['shifts', 'list', 'byEmployee', 'user-1', '2026-06-01', '2026-06-30'])).toBe(true);

    expect(shouldPersistOfflineQuery(['shifts', 'list', 'byRange', 'org-1', '2026-06-01', '2026-06-30', null])).toBe(false);
    expect(shouldPersistOfflineQuery(['shifts', 'list', 'byDate', 'org-1', '2026-06-01', null])).toBe(false);
    expect(shouldPersistOfflineQuery(['shifts', 'list', 'attendance', 'user-1', '2026-06-01', '2026-06-30'])).toBe(false);
    expect(shouldPersistOfflineQuery(['shifts', 'detail', 'shift-1'])).toBe(false);
    expect(shouldPersistOfflineQuery(['profiles', 'all'])).toBe(false);
  });
});
