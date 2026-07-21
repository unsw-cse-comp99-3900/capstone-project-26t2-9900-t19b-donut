import React, { useMemo } from 'react';
import { Hash, Search, X, Loader2, Shield } from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';
import { Input } from '@/modules/core/ui/primitives/input';
import { ScrollArea } from '@/modules/core/ui/primitives/scroll-area';
import { cn } from '@/modules/core/lib/utils';
import { useEmployeeBroadcasts } from '../../state/useBroadcasts';
import { MessageItem } from '../components/MessageItem';
import { EmptyMessages } from '../components/EmptyStates';
import { OfflineDataBanner } from '@/platform/offline/OfflineDataBanner';

export interface ChannelViewProps {
  channelId: string;
  channelName: string;
  channelDescription?: string;
  onSearch: (query: string) => void;
  searchQuery: string;
  compact?: boolean;
  mobile?: boolean;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channelId,
  channelName,
  channelDescription,
  onSearch,
  searchQuery,
  compact,
  mobile,
}) => {
  const { broadcasts, isLoading, loadMore, hasMore, isLoadingMore, offlineState } =
    useEmployeeBroadcasts(channelId);

  const filteredBroadcasts = useMemo(() => {
    if (!searchQuery.trim()) return broadcasts;
    const query = searchQuery.toLowerCase();
    return broadcasts.filter(
      (m) =>
        m.content.toLowerCase().includes(query) ||
        m.subject?.toLowerCase().includes(query) ||
        m.author?.name?.toLowerCase().includes(query)
    );
  }, [broadcasts, searchQuery]);

  const sortedBroadcasts = useMemo(() => {
    return [...filteredBroadcasts].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredBroadcasts]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 md:h-12 md:w-12 text-primary animate-spin" />
          <p className="text-blue-200/60 font-medium animate-pulse text-sm md:text-base">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Channel Header */}
      <div className={cn(
        'sticky top-0 z-20 border-b border-slate-200 bg-white/10 backdrop-blur-xl dark:border-white/5 dark:bg-black/5',
        mobile ? 'px-3 py-3' : 'px-6 py-5 md:px-8 md:py-6'
      )}>
        <div className={cn(
          'flex gap-4 md:gap-6',
          mobile ? 'flex-col items-stretch gap-3' : 'items-center justify-between'
        )}>
          <div className="flex min-w-0 items-center gap-3 md:gap-5">
            <div className={cn(
              'shrink-0 bg-primary/20 text-primary shadow-xl shadow-primary/5 dark:text-white',
              mobile ? 'rounded-xl p-2' : 'rounded-2xl p-3 md:rounded-[20px] md:p-3.5'
            )}>
              <Hash className={cn(mobile ? 'h-5 w-5' : 'h-6 w-6 md:h-7 md:w-7')} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 md:gap-3">
                <h2 className={cn(
                  'truncate font-black tracking-tighter text-slate-900 dark:text-white',
                  mobile ? 'text-lg' : 'text-xl md:text-2xl'
                )}>
                  {channelName}
                </h2>
              </div>
              <p className="text-xs md:text-[13px] font-medium text-slate-500 dark:text-blue-200/40 truncate mt-0.5">
                {channelDescription || 'Company broadcast channel'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className={cn('relative min-w-0', mobile ? 'block w-full' : 'hidden w-48 sm:block md:w-72')}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-white/30" />
            <Input
              placeholder="Search conversation..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-11 md:pl-12 bg-slate-100/50 dark:bg-black/20 border-slate-200/50 dark:border-white/5 text-slate-900 dark:text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 h-10 md:h-12 rounded-2xl md:rounded-3xl text-sm font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear broadcast search"
                onClick={() => onSearch('')}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <OfflineDataBanner
        state={offlineState}
        cachedLabel="Offline - showing saved messages"
        emptyLabel="Offline - saved messages are not available yet"
      />

      {/* Messages */}
      <ScrollArea className="flex-1 bg-transparent">
        <div className={cn(
          'min-h-full p-4 md:p-6 lg:p-8',
          mobile && 'px-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-3'
        )}>
          {sortedBroadcasts.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-16 md:py-20">
                <p className="text-slate-500 dark:text-blue-200/60 text-base md:text-lg">No messages match your search.</p>
              </div>
            ) : (
              <EmptyMessages />
            )
          ) : (
            <div className="space-y-4 md:space-y-6 w-full">
              {sortedBroadcasts.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  compact={compact}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => loadMore()}
                    disabled={isLoadingMore}
                    className="text-slate-500 dark:text-blue-200/60 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 bg-white dark:bg-black/20"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Older Messages'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Read-only notice */}
          <div className="mt-8 md:mt-12 mb-4 md:mb-6 flex justify-center">
            <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] md:text-xs font-medium text-slate-400 dark:text-white/40 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              <span>Broadcast Channel - Read Only Access</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </>
  );
};

export default ChannelView;
