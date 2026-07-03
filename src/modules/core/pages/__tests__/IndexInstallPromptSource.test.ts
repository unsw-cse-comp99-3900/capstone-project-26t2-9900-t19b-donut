import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexSource = readFileSync(resolve(__dirname, '../Index.tsx'), 'utf8');

describe('temporary iOS home screen guide entry', () => {
  it('keeps the homepage guide button visibly marked for removal', () => {
    expect(indexSource).toContain('TEMP_PWA_INSTALL_TEST_BUTTON');
    expect(indexSource).toContain('TEMP IOS GUIDE');
    expect(indexSource).toContain('Add to Home Screen Guide');
    expect(indexSource).toContain('Capacitor.isNativePlatform()');
  });

  it('shows iOS-specific manual install steps instead of a PWA prompt', () => {
    expect(indexSource).toContain('Open this page in Safari');
    expect(indexSource).toContain('Tap the Share button');
    expect(indexSource).toContain('Choose "Add to Home Screen"');
    expect(indexSource).not.toContain('triggerInstall()');
    expect(indexSource).toContain('px-4 py-2.5');
  });
});
