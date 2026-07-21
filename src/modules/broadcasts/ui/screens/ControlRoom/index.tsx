import React, { useState, useMemo, useEffect } from 'react';
import {
    Hash,
    Users,
    MessageSquare,
    Loader2,
    Search,
    ChevronLeft,
    Megaphone,
} from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';
import { Input } from '@/modules/core/ui/primitives/input';
import { ScrollArea } from '@/modules/core/ui/primitives/scroll-area';
import { Dialog, DialogContent } from '@/modules/core/ui/primitives/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/modules/core/ui/primitives/select';
import { cn } from '@/modules/core/lib/utils';
import { useBroadcastGroup, useBroadcasts } from '../../../state/useBroadcasts';
import { BroadcastItem } from '../../components/BroadcastItem';
import { ComposeSection } from '../../components/ComposeSection';
import { ControlRoomChannels } from './Channels';
import { ControlRoomParticipants } from './Participants';
import { CreateBroadcastRequest } from '../../../model/broadcast.types';

interface ControlRoomProps {
    groupId: string;
    onBack: () => void;
}

type FilterOption = 'all' | 'urgent' | 'pinned';

export const ControlRoom: React.FC<ControlRoomProps> = ({ groupId, onBack }) => {
    const {
        group,
        isLoading: groupLoading,
        canManage,
        createChannel,
        deleteChannel,
        addParticipant,
        removeParticipant,
        refetch: refreshGroup,
    } = useBroadcastGroup(groupId);

    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterOption>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isParticipantsOpen, setIsParticipantsOpen] = useState(true);
    const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);

    const {
        isLoading: broadcastsLoading,
        pinnedBroadcasts,
        activeBroadcasts,
        createBroadcast,
        deleteBroadcast,
        togglePin,
    } = useBroadcasts(selectedChannelId);

    // Auto-select first channel
    useEffect(() => {
        if (group?.channels && group.channels.length > 0 && !selectedChannelId) {
            setSelectedChannelId(group.channels[0].id);
        }
    }, [group, selectedChannelId]);

    const filteredBroadcasts = useMemo(() => {
        let result = [...pinnedBroadcasts, ...activeBroadcasts];

        if (filter === 'urgent') {
            result = result.filter((b) => b.priority === 'urgent');
        } else if (filter === 'pinned') {
            result = result.filter((b) => b.isPinned);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (b) =>
                    b.content.toLowerCase().includes(q) ||
                    b.subject?.toLowerCase().includes(q) ||
                    b.author?.name?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [pinnedBroadcasts, activeBroadcasts, filter, searchQuery]);

    const handleSendBroadcast = async (data: Omit<CreateBroadcastRequest, 'channelId'>) => {
        await createBroadcast(data);
    };

    const handleMobileSendBroadcast = async (data: Omit<CreateBroadcastRequest, 'channelId'>) => {
        await handleSendBroadcast(data);
        setIsMobileComposerOpen(false);
    };

    const selectedChannel = group?.channels?.find((c) => c.id === selectedChannelId);

    if (groupLoading) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-muted-foreground">Loading group...</p>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground text-lg mb-4">Group not found</p>
                    <Button onClick={onBack}>Back to Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-background md:gap-4 md:p-4">
            {/* Left Sidebar - Channels */}
            <div className="hidden w-80 flex-col overflow-hidden rounded-3xl border border-border bg-card/30 shadow-sm backdrop-blur-md md:flex">
                <ControlRoomChannels
                    group={group}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={setSelectedChannelId}
                    canManage={canManage}
                    onBack={onBack}
                    onCreateChannel={createChannel}
                    onDeleteChannel={deleteChannel}
                    onSendBroadcast={handleSendBroadcast}
                    isSending={broadcastsLoading}
                    totalRecipients={group.participantCount}
                />
            </div>

            {/* Middle - Main Content */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card/30 shadow-sm backdrop-blur-md transition-all duration-300 md:min-w-[500px] md:rounded-3xl md:border md:border-border">
                {selectedChannel ? (
                    <>
                        <div className="border-b border-border bg-card/50 px-3 py-3 backdrop-blur-sm md:px-6 md:py-4">
                            <div className="flex min-w-0 items-center justify-between gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onBack}
                                    aria-label="Back to broadcast groups"
                                    className="h-11 w-11 shrink-0 md:hidden"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="min-w-0 flex-1">
                                    <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-foreground md:text-xl">
                                        <Hash className="h-5 w-5 text-primary" />
                                        <span className="truncate">{selectedChannel.name}</span>
                                    </h2>
                                    <p className="truncate text-xs text-muted-foreground md:text-sm">
                                        {selectedChannel.description}
                                    </p>
                                </div>

                                <Select value={selectedChannelId ?? undefined} onValueChange={setSelectedChannelId}>
                                    <SelectTrigger aria-label="Select channel" className="h-11 w-[42vw] max-w-44 shrink-0 md:hidden">
                                        <SelectValue placeholder="Channel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {group.channels?.map((channel) => (
                                            <SelectItem key={channel.id} value={channel.id}>
                                                #{channel.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
                                    className={cn("hidden bg-muted/50 hover:bg-muted md:inline-flex", isParticipantsOpen && "text-primary bg-primary/10")}
                                    title={isParticipantsOpen ? "Hide Participants" : "Show Participants"}
                                >
                                    <Users className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Search + Filter pill bar */}
                        <div className="flex flex-col gap-2 border-b border-border/50 bg-card/30 px-3 py-3 md:flex-row md:items-center md:gap-3 md:px-6">
                            <div className="relative min-w-0 flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search broadcasts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-8 bg-muted/50 rounded-full text-sm"
                                />
                            </div>
                            <div className="flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {(['all', 'urgent', 'pinned'] as FilterOption[]).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setFilter(opt)}
                                        className={cn(
                                            'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                                            filter === opt
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <ScrollArea className="relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-50" />

                            <div className="relative z-10 w-full space-y-4 px-3 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-3 md:p-6">
                                {broadcastsLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredBroadcasts.length === 0 ? (
                                    <div className="text-center py-16">
                                        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <p className="text-muted-foreground">
                                            No broadcasts match your filter.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredBroadcasts.map((bc) => (
                                            <BroadcastItem
                                                key={bc.id}
                                                broadcast={bc}
                                                onTogglePin={() => togglePin(bc.id, !bc.isPinned)}
                                                onDelete={() => deleteBroadcast(bc.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {canManage && (
                            <div className="pointer-events-none absolute inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-30 md:hidden">
                                <Button
                                    type="button"
                                    onClick={() => setIsMobileComposerOpen(true)}
                                    className="pointer-events-auto h-12 w-full gap-2 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25"
                                >
                                    <Megaphone className="h-4 w-4" />
                                    Compose Broadcast
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Hash className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground text-lg">
                                Select a channel to manage broadcasts
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Sidebar - Participants */}
            <div className={cn(
                "hidden flex-col rounded-3xl border border-border bg-card/30 shadow-sm overflow-hidden backdrop-blur-md transition-all duration-300 md:flex",
                isParticipantsOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-none"
            )}>
                <ControlRoomParticipants
                    group={group}
                    isOpen={isParticipantsOpen}
                    canManage={canManage}
                    addParticipant={addParticipant}
                    onRemoveParticipant={removeParticipant}
                    onRefresh={refreshGroup}
                />
            </div>

            <Dialog open={isMobileComposerOpen} onOpenChange={setIsMobileComposerOpen}>
                <DialogContent className="bottom-0 left-0 top-auto max-h-[calc(100dvh-env(safe-area-inset-top,0px))] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-3xl border-x-0 border-b-0 bg-background p-0 pb-[env(safe-area-inset-bottom,0px)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:left-1/2 sm:top-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
                    {selectedChannel && (
                        <ComposeSection
                            channelId={selectedChannel.id}
                            channelName={selectedChannel.name}
                            groupName={group.name}
                            totalRecipients={group.participantCount}
                            onSend={handleMobileSendBroadcast}
                            isLoading={broadcastsLoading}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
