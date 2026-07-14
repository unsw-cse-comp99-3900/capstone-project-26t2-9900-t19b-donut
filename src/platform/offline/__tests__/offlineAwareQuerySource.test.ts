import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const useOnlineStatusPath = resolve(root, 'src/platform/offline/useOnlineStatus.ts');
const useOfflineAwareQueryPath = resolve(root, 'src/platform/offline/useOfflineAwareQuery.ts');
const offlineDataBannerPath = resolve(root, 'src/platform/offline/OfflineDataBanner.tsx');
const myRosterHookSource = readFileSync(resolve(root, 'src/modules/rosters/hooks/useMyRoster.ts'), 'utf8');
const myRosterPageSource = readFileSync(resolve(root, 'src/modules/rosters/pages/MyRosterPage.tsx'), 'utf8');

describe('offline aware query abstraction', () => {
  it('centralizes browser online status and cached-query fallback logic', () => {
    expect(existsSync(useOnlineStatusPath)).toBe(true);
    expect(existsSync(useOfflineAwareQueryPath)).toBe(true);
    expect(existsSync(offlineDataBannerPath)).toBe(true);

    const useOnlineStatusSource = readFileSync(useOnlineStatusPath, 'utf8');
    const useOfflineAwareQuerySource = readFileSync(useOfflineAwareQueryPath, 'utf8');
    const offlineDataBannerSource = readFileSync(offlineDataBannerPath, 'utf8');

    expect(useOnlineStatusSource).toContain("addEventListener('online'");
    expect(useOnlineStatusSource).toContain("addEventListener('offline'");
    expect(useOfflineAwareQuerySource).toContain('useQueryClient');
    expect(useOfflineAwareQuerySource).toContain('getQueryData');
    expect(useOfflineAwareQuerySource).toContain('enabled: resolvedEnabled && !isOffline');
    expect(useOfflineAwareQuerySource).toContain('initialData: isOffline');
    expect(useOfflineAwareQuerySource).toContain('offline-with-cache');
    expect(useOfflineAwareQuerySource).toContain('offline-empty');
    expect(offlineDataBannerSource).toContain('OfflineQueryState');
  });

  it('uses the shared abstraction for My Roster offline cached data states', () => {
    expect(myRosterHookSource).toContain('useOfflineAwareQuery');
    expect(myRosterHookSource).toContain('offlineState');
    expect(myRosterPageSource).toContain('OfflineDataBanner');
    expect(myRosterPageSource).toContain("offlineState === 'offline-empty'");
    expect(myRosterPageSource).toContain('No cached roster available');
  });
});
