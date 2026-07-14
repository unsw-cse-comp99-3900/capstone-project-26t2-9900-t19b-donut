import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const appSource = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

describe('app shell install prompt', () => {
  it('does not render a global PWA install banner', () => {
    expect(appSource).not.toContain('InstallBanner');
    expect(appSource).not.toContain('Install Shiftopia for quick access');
    expect(appSource).not.toContain('useInstallPrompt');
  });
});
