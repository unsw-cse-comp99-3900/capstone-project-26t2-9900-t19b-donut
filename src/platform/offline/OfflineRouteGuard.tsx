import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

interface OfflineRouteGuardProps {
  offlinePaths: string[];
}

export function OfflineRouteGuard({ offlinePaths }: OfflineRouteGuardProps) {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const canUseOffline = offlinePaths.includes(location.pathname);

  if (isOnline || canUseOffline) {
    return <Outlet />;
  }

  return (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <WifiOff className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Offline data is not available</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This page has not been enabled for offline use yet. Reconnect to load it,
          or return to the saved roster view.
        </p>
        <button
          type="button"
          onClick={() => navigate('/my-roster')}
          className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Back to My Roster
        </button>
      </div>
    </div>
  );
}
