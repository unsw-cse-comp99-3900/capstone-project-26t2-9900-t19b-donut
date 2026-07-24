import React from 'react';
import { Badge } from '@/modules/core/ui/primitives/badge';
import { TimesheetStatus } from '../../model/timesheet.types';
import { cn } from '@/modules/core/lib/utils';

interface TimesheetStatusBadgeProps {
    status: TimesheetStatus | string;
    className?: string;
}

export const TimesheetStatusBadge: React.FC<TimesheetStatusBadgeProps> = ({ status, className }) => {
    const s = (status as string).toUpperCase();

    const variants: Record<string, string> = {
        'DRAFT': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/10',
        'SUBMITTED': 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/10',
        'APPROVED': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/10',
        'REJECTED': 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/10',
        'NO_SHOW': 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-600/10 font-bold',
        'ACTIVE': 'bg-primary/20 text-indigo-700 dark:text-indigo-300 border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]',
        'COMPLETED': 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/10',
        'UPCOMING': 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/10',
    };

    const variant = variants[s] || 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';

    return (
        <Badge 
            variant="outline" 
            className={cn(
                "rounded-full border px-3 py-1 text-[9px] font-black tracking-[0.15em] uppercase transition-all duration-500",
                "backdrop-blur-md",
                variant,
                className
            )}
        >
            <span className="relative z-10">{s.replace('_', ' ')}</span>
        </Badge>
    );
};
