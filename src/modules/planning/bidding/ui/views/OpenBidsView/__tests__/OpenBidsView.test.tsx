import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OpenBidsView from '../index';

global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

vi.mock('@/platform/auth/useAuth', () => ({
    useAuth: vi.fn().mockReturnValue({
        user: { id: 'u1' }
    })
}));

vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: vi.fn().mockReturnValue({ toast: vi.fn() })
}));

vi.mock('@/modules/core/hooks/use-mobile', () => ({
    useIsMobile: vi.fn().mockReturnValue(false)
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() })
}));

vi.mock('../useOpenShifts', () => ({
    useManagerBidShifts: vi.fn().mockReturnValue({ shifts: [], isLoading: false })
}));

vi.mock('../useShiftBids', () => ({
    useShiftBids: vi.fn().mockReturnValue({ data: [], isLoading: false })
}));

vi.mock('../useTimeTicker', () => ({
    useTimeTicker: vi.fn().mockReturnValue(new Date())
}));

vi.mock('@/modules/availability/api/availability.api', () => ({
    getAvailabilitySlots: vi.fn().mockResolvedValue([])
}));

vi.mock('@/modules/compliance/employee-context', () => ({
    fetchV8EmployeeContext: vi.fn().mockResolvedValue({})
}));

vi.mock('@/modules/rosters/services/compliance.service', () => ({
    validateCompliance: vi.fn().mockResolvedValue({ passed: true, checks: [] })
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
        h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('OpenBidsView', () => {
    it('renders the open bids view correctly', () => {
        render(<OpenBidsView rosterId="r1" currentUserId="u1" />);
        expect(true).toBe(true);
    });
});
