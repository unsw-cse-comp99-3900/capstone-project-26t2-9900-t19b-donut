import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './modules/core/styles/theme.css';
import './platform/i18n';
import { initSentry } from './platform/observability/sentry';
import { initNativeDeepLinks } from './platform/native/deepLinks';
import { initApplePushNotificationRouting } from './platform/native/pushNotifications';
import { SplashScreen } from '@capacitor/splash-screen';

initSentry();
initNativeDeepLinks();
initApplePushNotificationRouting();

createRoot(document.getElementById('root')!).render(<App />);

SplashScreen.hide();
