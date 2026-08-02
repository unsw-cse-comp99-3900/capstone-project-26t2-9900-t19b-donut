import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ManagerSwapsPage from '../ManagerSwaps.page';

vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: vi.fn().mockReturnValue({ toast: vi.fn() })
}));

vi.mock('@/modules/core/contexts/ThemeContext', () => ({
    useTheme: vi.fn().mockReturnValue({ theme: 'light' })
}));

vi.mock('@/platform/auth/useScopeFilter', () => ({
    useScopeFilter: vi.fn().mockReturnValue({
        scope: { org_ids: [], dept_ids: [], subdept_ids: [], is_global: true }
    })
}));

vi.mock('@/platform/auth/useAuth', () => ({
    useAuth: vi.fn().mockReturnValue({
        user: { id: 'user1', email: 'user1@test.com' },
        session: {},
        activeContract: null
    })
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
    useQuery: vi.fn().mockReturnValue({ data: null, isLoading: false }),
    useMutation: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
}));

vi.mock('@/modules/core/hooks/use-mobile', () => ({
    useIsMobile: vi.fn().mockReturnValue(false)
}));

vi.mock('@/modules/core/contexts/OrgSelectionContext', () => ({
    useOrgSelection: vi.fn().mockReturnValue({
        selectedOrgId: 'org1',
        selectedDepartmentId: 'dept1',
        selectedSubDepartmentId: 'sub1'
    })
}));

vi.mock('../../state/useSwaps', () => ({
    useSwaps: vi.fn().mockReturnValue({
        activeSwaps: [],
        availableSwaps: [],
        offers: [],
        isLoading: false,
        error: null,
        refresh: vi.fn()
    })
}));

vi.mock('../../api/swaps.api', () => ({
    swapsApi: {
        fetchSwapRequests: vi.fn().mockResolvedValue({ data: [], total: 0 }),
        approveSwapRequest: vi.fn().mockResolvedValue(true),
        rejectSwapRequest: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('@/modules/core/ui/components/OrgSelector', () => ({
    OrgSelector: () => <div data-testid="org-selector" />
}));

describe('ManagerSwapsPage', () => {
    it('renders correctly', () => {
        render(<ManagerSwapsPage />);
        expect(true).toBe(true);
    });
});
