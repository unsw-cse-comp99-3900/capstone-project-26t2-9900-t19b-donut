import React from 'react';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';

export interface PageStateProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  errorMsg?: string;
  emptyTitle?: string;
  emptyDesc?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const PageState: React.FC<PageStateProps> = ({
  isLoading,
  isError,
  isEmpty,
  errorMsg = 'An error occurred while loading data.',
  emptyTitle = 'No Data Found',
  emptyDesc = 'There is currently no data to display at this time.',
  onRetry,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="flex h-full w-full min-h-[250px] flex-col items-center justify-center text-muted-foreground p-8 animate-in fade-in duration-300">
        <Loader2 className="h-8 w-8 animate-spin mb-4 opacity-80" />
        <p className="text-sm font-medium tracking-wide">Loading data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full w-full min-h-[250px] flex-col items-center justify-center text-destructive p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <AlertTriangle className="h-10 w-10 mb-4 opacity-90" />
        <h3 className="font-bold text-lg mb-2">Error Loading Data</h3>
        <p className="text-sm opacity-80 mb-6 max-w-md">{errorMsg}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="min-w-[120px]">
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-full w-full min-h-[250px] flex-col items-center justify-center text-muted-foreground p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center shadow-inner mb-6">
          <Inbox className="h-10 w-10 opacity-40 text-foreground" />
        </div>
        <h3 className="font-bold text-lg mb-2 tracking-wide text-foreground/80">{emptyTitle}</h3>
        <p className="text-sm opacity-60 max-w-sm">{emptyDesc}</p>
      </div>
    );
  }

  return <>{children}</>;
};
