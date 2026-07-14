import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const SHIFT_LINK_PATTERN = /^\/shifts\/([^/?#]+)/;
const SHIFTOPIA_CUSTOM_SCHEME = 'shiftopia:';

export const isShiftDeepLinkPath = (pathname: string) => SHIFT_LINK_PATTERN.test(pathname);

const getShiftDeepLinkPath = (url: URL) => {
  if (url.protocol === SHIFTOPIA_CUSTOM_SCHEME) {
    return url.hostname === 'shifts'
      ? `/shifts${url.pathname}`
      : url.pathname;
  }

  return url.pathname;
};

export const routeNativeDeepLink = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const shiftPath = getShiftDeepLinkPath(parsedUrl);

    if (!isShiftDeepLinkPath(shiftPath)) {
      return false;
    }

    const nextPath = `${shiftPath}${parsedUrl.search}${parsedUrl.hash}`;
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return true;
  } catch {
    return false;
  }
};

export const initNativeDeepLinks = () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    routeNativeDeepLink(url);
  });
};
