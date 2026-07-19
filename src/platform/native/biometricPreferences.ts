const ENABLED_KEY = 'biometric_enabled';
const PROMPTED_KEY = 'biometric_prompted';

function getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
}

export function isBiometricEnabled() {
    return getStorage()?.getItem(ENABLED_KEY) === 'true';
}

export function setBiometricEnabled(enabled: boolean) {
    getStorage()?.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

export function clearBiometricEnabled() {
    getStorage()?.removeItem(ENABLED_KEY);
}

export function hasPromptedForBiometrics() {
    return getStorage()?.getItem(PROMPTED_KEY) === 'true';
}

export function markBiometricPrompted() {
    getStorage()?.setItem(PROMPTED_KEY, 'true');
}
