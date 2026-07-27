import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../ShiftDetailsDialog.tsx'), 'utf8');

describe('shift detail share link source', () => {
  it('builds stable shared shift links', () => {
    expect(source).toContain('buildShiftShareUrl');
    expect(source).toContain('buildShiftUniversalLink(shiftId)');
    expect(source).not.toContain('shiftopia:///shifts/');
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

  it('exports the shift as an ICS calendar file on web and native platforms', () => {
    expect(source).toContain("from '@capacitor/filesystem'");
    expect(source).toContain('buildShiftCalendarFile');
    expect(source).toContain('Filesystem.writeFile');
    expect(source).toContain("type: 'text/calendar;charset=utf-8'");
    expect(source).toContain('Add to calendar');
    expect(source).toContain('Calendar file ready');
  });
});
