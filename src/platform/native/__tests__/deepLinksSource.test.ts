import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  buildShiftUniversalLink,
  routeNativeDeepLink,
} from '../deepLinks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../deepLinks.ts'), 'utf8');

describe('native deep link source', () => {
  it('listens for Capacitor app URL opens only on native platforms', () => {
    expect(source).toContain("@capacitor/app");
    expect(source).toContain('Capacitor.isNativePlatform()');
    expect(source).toContain("addListener('appUrlOpen'");
  });

  it('routes shift links into the React router history stack', () => {
    expect(source).toContain('/^\\/shifts\\/');
    expect(source).toContain("SHIFTOPIA_CUSTOM_SCHEME = 'shiftopia:'");
    expect(source).toContain("SHIFTOPIA_WEB_ORIGIN = 'https://capstone-project-26t2-9900-t19b-don.vercel.app'");
    expect(source).toContain('url.origin === SHIFTOPIA_WEB_ORIGIN');
    expect(source).toContain('getShiftDeepLinkPath');
    expect(source).toContain('window.history.pushState');
    expect(source).toContain("new PopStateEvent('popstate')");
  });

  it('builds HTTPS universal links for shared shifts', () => {
    expect(source).toContain('buildShiftUniversalLink');
    expect(source).toContain('`${SHIFTOPIA_WEB_ORIGIN}/shifts/${encodeURIComponent(shiftId)}`');
    expect(buildShiftUniversalLink('shift/id')).toBe(
      'https://capstone-project-26t2-9900-t19b-don.vercel.app/shifts/shift%2Fid',
    );
  });

  it('accepts only the production HTTPS host or the legacy custom scheme', () => {
    window.history.replaceState({}, '', '/');

    expect(routeNativeDeepLink(
      'https://capstone-project-26t2-9900-t19b-don.vercel.app/shifts/shift-123',
    )).toBe(true);
    expect(window.location.pathname).toBe('/shifts/shift-123');

    expect(routeNativeDeepLink('https://example.com/shifts/untrusted')).toBe(false);
    expect(window.location.pathname).toBe('/shifts/shift-123');

    expect(routeNativeDeepLink('shiftopia:///shifts/legacy-shift')).toBe(true);
    expect(window.location.pathname).toBe('/shifts/legacy-shift');
  });
});
