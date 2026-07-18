import { Capacitor } from '@capacitor/core';
import {
    NativeBiometric,
    BiometryType,
} from '@capgo/capacitor-native-biometric';

export const isNativeMobile = () => Capacitor.isNativePlatform();

export async function canUseFaceId() {
    if (!isNativeMobile()) return { available: false, faceId: false };

    const result = await NativeBiometric.isAvailable({ useFallback: false });

    return {
        available: result.isAvailable,
        faceId:
            result.isAvailable &&
            (result.biometryType === BiometryType.FACE_ID ||
                result.biometryType === BiometryType.FACE_AUTHENTICATION),
    };
}

export async function verifyFaceId() {
    await NativeBiometric.verifyIdentity({
        reason: 'Unlock your Shiftopia session',
        title: 'Face ID Login',
        subtitle: 'Authenticate to continue',
        description: 'Use Face ID to open the app',
        negativeButtonText: 'Use password instead',
        useFallback: false,
        allowedBiometryTypes: [BiometryType.FACE_ID],
    });
}
