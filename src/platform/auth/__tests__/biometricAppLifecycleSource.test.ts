import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const authProviderSource = readFileSync(
  resolve(process.cwd(), 'src/platform/auth/AuthProvider.tsx'),
  'utf8',
);

describe('Face ID app lifecycle locking', () => {
  it('locks a signed-in native session when the app enters the background', () => {
    expect(authProviderSource).toContain("import { App as CapacitorApp } from '@capacitor/app'");
    expect(authProviderSource).toContain("CapacitorApp.addListener('pause'");
    expect(authProviderSource).toContain('if (!user || !isNativeMobile()) return');
    expect(authProviderSource).toContain('if (isBiometricEnabled())');
    expect(authProviderSource).toContain('setIsBiometricLockRequired(true)');
  });

  it('removes the pause listener when the authenticated user changes or unmounts', () => {
    expect(authProviderSource).toContain('void pauseListener?.remove()');
    expect(authProviderSource).toContain('void listener.remove()');
    expect(authProviderSource).toContain('}, [user]);');
  });

  it('uses pause rather than inactive state changes to avoid locking on system UI', () => {
    expect(authProviderSource).not.toContain("CapacitorApp.addListener('appStateChange'");
  });
});
