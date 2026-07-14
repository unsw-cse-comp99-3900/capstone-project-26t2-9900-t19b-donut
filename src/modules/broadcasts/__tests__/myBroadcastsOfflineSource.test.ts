import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { shouldPersistOfflineQuery } from '@/platform/offline/offlineQueryPersistence';

const repoRoot = process.cwd();

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('My Broadcasts offline cache wiring', () => {
  it('persists only employee-facing broadcast group and message queries', () => {
    expect(shouldPersistOfflineQuery(['broadcasts', 'groups', 'employee', null, null, null])).toBe(true);
    expect(shouldPersistOfflineQuery(['broadcasts', 'messages', 'byChannel', 'channel-1', 'employee', 'user-1', 1])).toBe(true);

    expect(shouldPersistOfflineQuery(['broadcasts', 'groups', 'manager', null, null, null])).toBe(false);
    expect(shouldPersistOfflineQuery(['broadcasts', 'messages', 'byChannel', 'channel-1'])).toBe(false);
    expect(shouldPersistOfflineQuery(['broadcasts', 'notifications', 'forUser', 'user-1'])).toBe(false);
  });

  it('uses the shared offline-aware query abstraction for employee broadcasts', () => {
    const hookSource = readSource('src/modules/broadcasts/state/useBroadcasts.ts');

    expect(hookSource).toContain("from '@/platform/offline/useOfflineAwareQuery'");
    expect(hookSource).toContain('useOfflineAwareQuery<EmployeeBroadcastGroup[]>');
    expect(hookSource).toContain('useOfflineAwareQuery<');
    expect(hookSource).toContain('offlineState');
    expect(hookSource).toContain('isShowingCachedData');
  });

  it('allows My Broadcasts through the offline route guard and shows cached-state UI', () => {
    const routerSource = readSource('src/router/AppRouter.tsx');
    const screenSource = readSource('src/modules/broadcasts/ui/screens/MyBroadcastsScreen.tsx');
    const channelViewSource = readSource('src/modules/broadcasts/ui/views/ChannelView.view.tsx');

    expect(routerSource).toContain("offlinePaths={['/my-roster', '/my-broadcasts', '/my-notifications']}");
    expect(screenSource).toContain('Offline - showing saved broadcasts');
    expect(screenSource).toContain("offlineState === 'offline-empty'");
    expect(channelViewSource).toContain('Offline - showing saved messages');
  });
});
