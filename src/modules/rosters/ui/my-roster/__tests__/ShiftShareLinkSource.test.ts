import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../ShiftDetailsDialog.tsx'), 'utf8');

describe('shift detail share link source', () => {
  it('builds stable shared shift links', () => {
    expect(source).toContain('buildShiftShareUrl');
    expect(source).toContain('shiftopia:///shifts/');
    expect(source).toContain('/shifts/');
    expect(source).toContain('encodeURIComponent(shiftId)');
  });

  it('uses native sharing first, then web share, then clipboard', () => {
    expect(source).toContain("from '@capacitor/share'");
    expect(source).toContain("from '@capacitor/core'");
    expect(source).toContain('Capacitor.isNativePlatform()');
    expect(source).toContain('Share.share');
    expect(source).toContain('navigator.share');
    expect(source).toContain('navigator.clipboard.writeText');
    expect(source).toContain('Share link');
  });

  it('shows share feedback inside the shift details drawer', () => {
    expect(source).toContain('shareStatus');
    expect(source).toContain('Link copied');
    expect(source).toContain('Share failed');
    expect(source).toContain('aria-live="polite"');
  });
});
