import React from 'react';

const STORAGE_KEY = 'shiftopia-accessible-view';

interface AccessibilityContextValue {
  accessibleView: boolean;
  setAccessibleView: (enabled: boolean) => void;
  toggleAccessibleView: () => void;
}

const AccessibilityContext = React.createContext<AccessibilityContextValue | undefined>(undefined);

export const AccessibilityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [accessibleView, setAccessibleViewState] = React.useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setAccessibleView = React.useCallback((enabled: boolean) => {
    setAccessibleViewState(enabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Storage can be unavailable in private WebViews; state still works for this session.
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.accessibleView = accessibleView ? 'true' : 'false';
    return () => delete document.documentElement.dataset.accessibleView;
  }, [accessibleView]);

  const value = React.useMemo(() => ({
    accessibleView,
    setAccessibleView,
    toggleAccessibleView: () => setAccessibleView(!accessibleView),
  }), [accessibleView, setAccessibleView]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibility = () => {
  const context = React.useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
};
