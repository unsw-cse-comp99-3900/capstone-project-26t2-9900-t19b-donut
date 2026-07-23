import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/router/AppRouter.tsx'), 'utf8');

describe('settings route layout', () => {
  it('keeps settings sub-routes on the same no-padding shell', () => {
    expect(source).toContain("location.pathname.startsWith('/settings/')");
  });
});
