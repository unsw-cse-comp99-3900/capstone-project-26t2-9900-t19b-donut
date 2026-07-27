import { useEffect } from 'react';
import { useAuth } from '@/platform/auth/useAuth';
import { registerApplePushNotifications } from './pushNotifications';

export const PushNotificationBootstrap = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let cleanup: (() => void) | undefined;
    let disposed = false;

    void registerApplePushNotifications()
      .then((removeListeners) => {
        if (disposed) {
          removeListeners();
        } else {
          cleanup = removeListeners;
        }
      })
      .catch((error) => {
        console.error('[Push] Notification setup failed', error);
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [user?.id]);

  return null;
};
