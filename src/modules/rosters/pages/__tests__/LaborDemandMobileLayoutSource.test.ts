import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/modules/rosters/pages/LaborDemandForecastingPage.tsx'),
  'utf8',
);

describe('labor demand mobile layout', () => {
  it('uses the compact page title and a non-overflowing mobile function bar', () => {
    expect(source).toContain('title="Labor Demand"');
    expect(source).toContain('grid-cols-[minmax(0,1fr)_auto]');
    expect(source).toContain('min-w-0 w-full bg-transparent');
  });
});
