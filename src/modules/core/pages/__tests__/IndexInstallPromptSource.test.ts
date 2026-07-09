import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexSource = readFileSync(resolve(__dirname, '../Index.tsx'), 'utf8');

describe('temporary iOS home screen guide entry', () => {
  it('keeps the homepage guide button visibly marked for removal', () => {
    expect(indexSource).toContain('TEMP_PWA_INSTALL_TEST_BUTTON');
    expect(indexSource).toContain('IOS GUIDE');
    expect(indexSource).toContain('PWA install');
    expect(indexSource).toContain('Capacitor.isNativePlatform()');
    expect(indexSource).toContain('isIosWebSafari()');
    expect(indexSource).toContain('isStandalonePwa()');
  });

  it('shows iOS-specific manual install steps instead of a PWA prompt', () => {
    expect(indexSource).toContain('Open this page in Safari');
    expect(indexSource).toContain('Tap the Share button');
    expect(indexSource).toContain('Choose "Add to Home Screen"');
    expect(indexSource).not.toContain('triggerInstall()');
    expect(indexSource).toContain('px-4 py-2.5');
  });

  it('limits the temporary guide to iOS Safari web mode only', () => {
    expect(indexSource).toContain('const isIosWebSafari');
    expect(indexSource).toContain('iPad|iPhone|iPod');
    expect(indexSource).toContain('CriOS|FxiOS|EdgiOS|OPiOS');
    expect(indexSource).toContain("matchMedia('(display-mode: standalone)')");
    expect(indexSource).toContain('if (Capacitor.isNativePlatform() || isStandalonePwa() || !isIosWebSafari()) return null;');
  });
});
