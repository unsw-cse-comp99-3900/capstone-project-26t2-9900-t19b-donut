import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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
    expect(source).toContain('getShiftDeepLinkPath');
    expect(source).toContain('window.history.pushState');
    expect(source).toContain("new PopStateEvent('popstate')");
  });
});
