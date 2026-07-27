import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type PluginListenerHandle,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';
import { supabase } from '@/platform/supabase/client';

const PUSH_TOKEN_STORAGE_KEY = 'shiftopia.apns-token';
const SAFE_APP_PATH = /^\/[a-zA-Z0-9/_?&=#.%+-]*$/;

type PushData = {
  link?: unknown;
  notification_id?: unknown;
};

const apnsEnvironment =
  import.meta.env.VITE_APNS_ENVIRONMENT === 'production'
    ? 'production'
    : 'development';

export const isApplePushAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const routePushNotification = (notification: PushNotificationSchema) => {
  const data = notification.data as PushData | undefined;
  const link = typeof data?.link === 'string' ? data.link : '/my-notifications';
  const safePath = SAFE_APP_PATH.test(link) ? link : '/my-notifications';

  window.history.pushState({}, '', safePath);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

async function saveDeviceToken(token: string) {
  const { error } = await supabase.rpc('register_push_device', {
    p_token: token,
    p_platform: 'ios',
    p_app_id: 'com.shiftopia.app',
    p_environment: apnsEnvironment,
  });

  if (error) throw error;
  localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}

/**
 * Register this iPhone with APNs after authentication.
 *
 * Listener registration deliberately happens before `register()` so a fast
 * native callback cannot be missed. The returned cleanup function removes only
 * listeners; it does not unregister the device when React remounts.
 */
export async function registerApplePushNotifications(): Promise<() => void> {
  if (!isApplePushAvailable()) return () => undefined;

  const listeners: PluginListenerHandle[] = [];
  let active = true;

  listeners.push(
    await PushNotifications.addListener('registration', ({ value }) => {
      if (!active) return;
      void saveDeviceToken(value).catch((error) => {
        console.error('[Push] Could not save APNs device token', error);
      });
    }),
  );

  listeners.push(
    await PushNotifications.addListener('registrationError', ({ error }) => {
      console.error('[Push] APNs registration failed', error);
    }),
  );

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  return () => {
    active = false;
    listeners.forEach((listener) => void listener.remove());
  };
}

export const initApplePushNotificationRouting = () => {
  if (!isApplePushAvailable()) return;

  void PushNotifications.addListener(
    'pushNotificationActionPerformed',
    ({ notification }) => routePushNotification(notification),
  );
};

/**
 * Remove the current APNs token while the Supabase session is still valid.
 * This prevents a signed-out device from receiving the previous user's pushes.
 */
export async function unregisterApplePushNotifications() {
  if (!isApplePushAvailable()) return;

  const token = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (token) {
    const { error } = await supabase.rpc('unregister_push_device', {
      p_token: token,
      p_app_id: 'com.shiftopia.app',
    });
    if (error) {
      console.warn('[Push] Could not remove APNs token from this account', error);
    } else {
      localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  }

  try {
    await PushNotifications.unregister();
  } catch (error) {
    console.warn('[Push] Could not unregister this device from APNs', error);
  }
}
