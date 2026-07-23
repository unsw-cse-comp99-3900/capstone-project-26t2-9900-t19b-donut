import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/router/AppRouter.tsx'), 'utf8');
const pageSource = readFileSync(resolve(process.cwd(), 'src/modules/rosters/pages/AttendancePage.tsx'), 'utf8');

describe('attendance route layout', () => {
  it('uses the same app shell and page shell as My Roster', () => {
    const noPaddingRoutes = source.match(/const NO_PADDING_ROUTES = new Set\(\[(.*?)\]\)/s)?.[1];
    expect(noPaddingRoutes).not.toContain('/my-attendance');
    expect(pageSource).toContain('<GoldStandardHeader');
    expect(pageSource).toContain('overflow-hidden px-2 lg:px-6 pb-4 lg:pb-6');
  });
});
