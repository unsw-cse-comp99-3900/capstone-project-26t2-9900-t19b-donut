import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const appRouterSource = readFileSync(resolve(root, 'src/router/AppRouter.tsx'), 'utf8');
const offlineRouteGuardPath = resolve(root, 'src/platform/offline/OfflineRouteGuard.tsx');

describe('offline route guard wiring', () => {
  it('resets the protected ErrorBoundary when the route changes', () => {
    expect(appRouterSource).toContain('<ErrorBoundary key={location.pathname} module="AuthLayout">');
  });

  it('blocks protected routes that do not have offline cached data', () => {
    expect(existsSync(offlineRouteGuardPath)).toBe(true);

    const offlineRouteGuardSource = readFileSync(offlineRouteGuardPath, 'utf8');

    expect(appRouterSource).toContain('OfflineRouteGuard');
    expect(appRouterSource).toContain("offlinePaths={['/my-roster', '/my-broadcasts']}");
    expect(offlineRouteGuardSource).toContain('useOnlineStatus');
    expect(offlineRouteGuardSource).toContain('Offline data is not available');
    expect(offlineRouteGuardSource).toContain('Outlet');
  });
});
