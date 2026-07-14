import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../toast.tsx'), 'utf8');

describe('toast viewport source', () => {
  it('keeps toasts above drawers and dialogs', () => {
    expect(source).toContain('z-[300]');
    expect(source).toContain('ToastViewport');
  });
});
