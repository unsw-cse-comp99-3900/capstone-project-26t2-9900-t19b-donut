import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexSource = readFileSync(resolve(__dirname, '../Index.tsx'), 'utf8');

describe('iOS home screen guide entry', () => {
  it('limits the homepage guide to iOS Safari web installs', () => {
    expect(indexSource).toContain('isIosWebSafari');
    expect(indexSource).toContain('isStandaloneDisplay');
    expect(indexSource).toContain('IOS GUIDE');
    expect(indexSource).toContain('Add to Home Screen');
    expect(indexSource).toContain('Capacitor.isNativePlatform()');
    expect(indexSource).toContain('display-mode: standalone');
    expect(indexSource).toContain('nav.standalone === true');
  });

  it('shows iOS-specific manual install steps instead of a PWA prompt', () => {
    expect(indexSource).toContain('Open this page in Safari');
    expect(indexSource).toContain('Tap the Share button');
    expect(indexSource).toContain('Choose "Add to Home Screen"');
    expect(indexSource).not.toContain('triggerInstall()');
    expect(indexSource).toContain('px-3.5 py-2');
  });
});
