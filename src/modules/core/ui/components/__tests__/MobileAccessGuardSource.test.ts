import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../MobileAccessGuard.tsx'), 'utf8');

describe('MobileAccessGuard source', () => {
  it('allows shared shift deep links on mobile', () => {
    expect(source).toContain("pathname.startsWith('/shifts/')");
    expect(source).toContain('DesktopOnlyScreen');
  });

  it('allows the roster shift editor on mobile', () => {
    expect(source).toContain("pathname.startsWith('/rosters/shift/')");
  });
});
