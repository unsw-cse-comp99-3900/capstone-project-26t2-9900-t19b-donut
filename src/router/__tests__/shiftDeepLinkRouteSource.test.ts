import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../AppRouter.tsx'), 'utf8');

describe('shift deep link route source', () => {
  it('registers shared shift links as protected workspace routes', () => {
    expect(source).toContain('ShiftDeepLinkPage');
    expect(source).toContain('path="/shifts/:shiftId"');
  });
});
