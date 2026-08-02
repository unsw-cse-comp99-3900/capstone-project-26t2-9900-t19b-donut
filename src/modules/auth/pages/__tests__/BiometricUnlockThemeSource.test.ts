import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/modules/auth/pages/BiometricUnlockPage.tsx'),
  'utf8',
);

describe('biometric unlock theme compatibility', () => {
  it('uses theme tokens instead of a hard-coded dark palette', () => {
    for (const token of [
      'bg-background',
      'bg-card',
      'text-card-foreground',
      'border-border',
      'text-foreground',
      'text-muted-foreground',
      'bg-primary/10',
      'text-primary',
      'bg-destructive/10',
      'text-destructive',
    ]) {
      expect(source).toContain(token);
    }

    expect(source).not.toMatch(
      /(?:bg|border|text)-(?:black|white|gray|purple|red|\[#[\da-f]{3,8}\])/i,
    );
  });
});
