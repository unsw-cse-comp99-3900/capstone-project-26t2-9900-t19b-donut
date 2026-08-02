import { describe, it, expect, beforeEach } from 'vitest';
import { useRosterStore } from '../useRosterStore';

describe('useRosterStore', () => {
    beforeEach(() => {
        useRosterStore.setState({
            viewType: 'DAY',
            activeMode: 'roles',
            selectedOrganizationId: null,
            selectedDepartmentId: null,
            selectedSubDepartmentId: null
        });
    });

    it('setViewType updates viewType', () => {
        const store = useRosterStore.getState();
        store.setViewType('WEEK');
        expect(useRosterStore.getState().viewType).toBe('WEEK');
    });

    it('setActiveMode updates mode', () => {
        const store = useRosterStore.getState();
        store.setActiveMode('people');
        expect(useRosterStore.getState().activeMode).toBe('people');
    });

    it('setSelectedOrganizationId updates state', () => {
        const store = useRosterStore.getState();
        store.setSelectedOrganizationId('org1');
        expect(useRosterStore.getState().selectedOrganizationId).toBe('org1');
    });

    it('setSelectedDepartmentId updates state', () => {
        const store = useRosterStore.getState();
        store.setSelectedDepartmentId('dept1');
        expect(useRosterStore.getState().selectedDepartmentIds).toEqual(['dept1']);
    });

    it('setSelectedSubDepartmentId updates state', () => {
        const store = useRosterStore.getState();
        store.setSelectedSubDepartmentId('sub1');
        expect(useRosterStore.getState().selectedSubDepartmentIds).toEqual(['sub1']);
    });

    it('setAdvancedFilters works', () => {
        const store = useRosterStore.getState();
        store.setAdvancedFilters({ roles: ['r1'] });
        expect(useRosterStore.getState().advancedFilters.roles).toEqual(['r1']);
        
        // it merges filters
        useRosterStore.getState().setAdvancedFilters({ locations: ['loc1'] });
        expect(useRosterStore.getState().advancedFilters.roles).toEqual(['r1']);
        expect(useRosterStore.getState().advancedFilters.locations).toEqual(['loc1']);
    });
});
