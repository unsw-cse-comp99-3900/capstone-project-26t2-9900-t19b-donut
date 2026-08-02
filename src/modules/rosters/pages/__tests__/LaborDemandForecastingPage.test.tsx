import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LaborDemandForecastingPage from '../LaborDemandForecastingPage';

global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn().mockReturnValue({ data: [], isLoading: false, isError: false }),
    useMutation: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() })
}));

vi.mock('../../state/useRosterShifts', () => ({
    useShiftsByDate: vi.fn().mockReturnValue({ data: [], isLoading: false })
}));

vi.mock('@/platform/auth/useScopeFilter', () => ({
    useScopeFilter: vi.fn().mockReturnValue({
        scope: {
            org_ids: ['org1'],
            dept_ids: ['dept1'],
            subdept_ids: ['sub1'],
            is_global: false
        },
        setScope: vi.fn(),
        scopeKey: 'key',
        isGammaLocked: false,
        isLoading: false
    })
}));

vi.mock('../../state/useShiftSynthesis', () => ({
    useGenerateShifts: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useRollbackSynthesisRun: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
    useShiftSynthesisPreview: vi.fn().mockReturnValue({ data: null, isLoading: false })
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
        h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

vi.mock('./components/ConfirmGenerationModal', () => ({
    ConfirmGenerationModal: () => <div data-testid="confirm-modal"></div>
}));

vi.mock('../ui/components/SupervisorFeedbackPromptModal', () => ({
    SupervisorFeedbackPromptModal: () => <div data-testid="feedback-modal"></div>
}));

vi.mock('@/modules/core/ui/layout/PageLayout', () => {
    const MockPageLayout: any = ({ children }: any) => <div data-testid="page-layout">{children}</div>;
    MockPageLayout.Header = ({ children }: any) => <div data-testid="page-header">{children}</div>;
    MockPageLayout.Content = ({ children }: any) => <div data-testid="page-content">{children}</div>;
    MockPageLayout.Body = ({ children }: any) => <div data-testid="page-body">{children}</div>;
    return { PageLayout: MockPageLayout };
});

vi.mock('@/modules/core/ui/components/PersonalPageHeader', () => ({
    PersonalPageHeader: () => <div data-testid="personal-header"></div>
}));

vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    ComposedChart: () => <div data-testid="composed-chart"></div>,
    Area: () => null,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ReferenceLine: () => null
}));

vi.mock('@/modules/core/ui/primitives/tooltip', () => ({
    Tooltip: ({ children }: any) => <>{children}</>,
    TooltipTrigger: ({ children }: any) => <>{children}</>,
    TooltipContent: ({ children }: any) => <>{children}</>,
    TooltipProvider: ({ children }: any) => <>{children}</>
}));

describe('LaborDemandForecastingPage', () => {
    it('renders the forecasting page correctly', () => {
        render(<LaborDemandForecastingPage />);
        expect(screen.getByTestId('page-layout')).toBeInTheDocument();
    });
});
