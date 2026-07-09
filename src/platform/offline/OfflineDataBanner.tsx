import { WifiOff } from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';
import type { OfflineQueryState } from './useOfflineAwareQuery';

interface OfflineDataBannerProps {
  state: OfflineQueryState;
  className?: string;
  cachedLabel?: string;
  emptyLabel?: string;
}

export function OfflineDataBanner({
  state,
  className,
  cachedLabel = 'Offline - showing saved data',
  emptyLabel = 'Offline - saved data is not available yet',
}: OfflineDataBannerProps) {
  if (state === 'online') return null;

  const isShowingCache = state === 'offline-with-cache';

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-4 py-2 text-xs font-bold tracking-wide',
        isShowingCache
          ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200'
          : 'border-slate-500/20 bg-slate-500/10 text-muted-foreground',
        className,
      )}
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>{isShowingCache ? cachedLabel : emptyLabel}</span>
    </div>
  );
}
