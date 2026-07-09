import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { shouldPersistOfflineQuery } from '@/platform/offline/offlineQueryPersistence';

const repoRoot = process.cwd();

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('My Notifications offline cache wiring', () => {
  it('persists only the read-only user notification list', () => {
    expect(shouldPersistOfflineQuery(['notifications', 'forUser', 'user-1'])).toBe(true);
    expect(shouldPersistOfflineQuery(['notifications', 'markRead', 'notification-1'])).toBe(false);
    expect(shouldPersistOfflineQuery(['notifications', 'dismiss', 'notification-1'])).toBe(false);
  });

  it('uses the shared offline-aware query and guards notification writes offline', () => {
    const hookSource = readSource('src/modules/core/hooks/useNotifications.ts');

    expect(hookSource).toContain("from '@/platform/offline/useOfflineAwareQuery'");
    expect(hookSource).toContain('useOfflineAwareQuery<AppNotification[]>');
    expect(hookSource).toContain('offlineState');
    expect(hookSource).toContain('if (error) throw error;');
    expect(hookSource).toContain('if (isOffline) return;');
  });

  it('allows My Notifications offline and keeps cached UI unobtrusive', () => {
    const routerSource = readSource('src/router/AppRouter.tsx');
    const pageSource = readSource('src/modules/core/pages/MyNotificationsPage.tsx');
    const popoverSource = readSource('src/modules/core/ui/components/broadcast/BroadcastNotifications.tsx');

    expect(routerSource).toContain("offlinePaths={['/my-roster', '/my-broadcasts', '/my-notifications']}");
    expect(pageSource).toContain('Offline - showing saved notifications');
    expect(pageSource).not.toContain('Read-only while offline');
    expect(pageSource).toContain('!isOffline && unreadCount > 0');
    expect(popoverSource).toContain('Offline - saved notifications');
    expect(popoverSource).toContain('!isOffline && unreadCount > 0');
  });
});
