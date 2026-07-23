import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const navbarSource = readFileSync(resolve(root, 'src/modules/core/ui/layout/BottomNavbar.tsx'), 'utf8');
const routerSource = readFileSync(resolve(root, 'src/router/AppRouter.tsx'), 'utf8');

describe('mobile navigation permissions', () => {
  it('filters management links with the shared permission model', () => {
    expect(navbarSource).toContain("feature: 'management'");
    expect(navbarSource).toContain("feature: 'users'");
    expect(navbarSource).toContain('.filter((item) => hasPermission(item.feature))');
  });

  it('keeps personal settings available to every authenticated profile', () => {
    expect(navbarSource).toContain("path: '/settings', feature: 'profile'");
    expect(routerSource).toContain('<Route element={<FeatureGate feature="profile" />}>');
  });

  it('exposes labor demand to users with roster permission', () => {
    expect(navbarSource).toContain("path: '/labor-demand', feature: 'rosters'");
  });
});
