import React from 'react';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';
import { cn } from '@/modules/core/lib/utils';

export interface PageStateProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  loadingMsg?: string;
  errorTitle?: string;
  errorMsg?: string;
  emptyTitle?: string;
  emptyDesc?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageState: React.FC<PageStateProps> = ({
  isLoading,
  isError,
  isEmpty,
  loadingMsg = 'Loading data...',
  errorTitle = 'Error Loading Data',
  errorMsg = 'An error occurred while loading data.',
  emptyTitle = 'No Data Found',
  emptyDesc = 'There is currently no data to display at this time.',
  onRetry,
  retryLabel = 'Retry',
  children,
  className,
}) => {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn('flex h-full w-full min-h-[250px] flex-col items-center justify-center p-8 text-muted-foreground animate-in fade-in duration-300', className)}
      >
        <Loader2 aria-hidden="true" className="mb-4 h-8 w-8 animate-spin opacity-80" />
        <p className="text-sm font-medium tracking-wide">{loadingMsg}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className={cn('flex h-full w-full min-h-[250px] flex-col items-center justify-center p-8 text-center text-destructive animate-in fade-in zoom-in-95 duration-300', className)}
      >
        <AlertTriangle aria-hidden="true" className="mb-4 h-10 w-10 opacity-90" />
        <h3 className="mb-2 text-lg font-bold">{errorTitle}</h3>
        <p className="mb-6 max-w-md text-sm opacity-80">{errorMsg}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="min-w-[120px]">
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        role="status"
        className={cn('flex h-full w-full min-h-[250px] flex-col items-center justify-center p-8 text-center text-muted-foreground animate-in fade-in zoom-in-95 duration-300', className)}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted/20 shadow-inner">
          <Inbox aria-hidden="true" className="h-10 w-10 text-foreground opacity-40" />
        </div>
        <h3 className="mb-2 text-lg font-bold tracking-wide text-foreground/80">{emptyTitle}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{emptyDesc}</p>
      </div>
    );
  }

  return <>{children}</>;
};
