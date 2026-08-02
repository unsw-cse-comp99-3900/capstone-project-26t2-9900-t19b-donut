import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplateEditor } from '../useTemplateEditor';
import { useToast } from '@/modules/core/hooks/use-toast';
import type { Template } from '../../model/templates.types';

const mockToast = vi.fn();
vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast })
}));

describe('useTemplateEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockTemplate = (): Template => ({
        id: 't-1',
        name: 'T1',
        description: 'desc',
        departmentId: 'd1',
        subDepartmentId: 's1',
        organizationId: 'o1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        status: 'draft',
        appliedCount: 0,
        version: 1,
        groups: [
            {
                id: 1,
                name: 'Group 1',
                color: '#fff',
                icon: 'icon',
                sortOrder: 0,
                subGroups: [
                    {
                        id: 1,
                        name: 'Subgroup 1',
                        sortOrder: 0,
                        shifts: [
                            {
                                id: 1,
                                name: 'Shift 1',
                                startTime: '09:00',
                                endTime: '17:00',
                                paidBreakDuration: 30,
                                unpaidBreakDuration: 30,
                                sortOrder: 0,
                                skills: [],
                                licenses: [],
                                siteTags: [],
                                eventTags: []
                            } as any
                        ]
                    }
                ]
            }
        ]
    });

    it('should initialize and reset editor', () => {
        const { result } = renderHook(() => useTemplateEditor());
        const template = createMockTemplate();

        act(() => {
            result.current.initializeEditor(template);
        });

        expect(result.current.localTemplate).toEqual(template);
        expect(result.current.hasUnsavedChanges).toBe(false);

        act(() => {
            result.current.resetEditor();
        });

        expect(result.current.localTemplate).toBeNull();
    });

    it('updateLocalTemplate should track unsaved changes and history', () => {
        const { result } = renderHook(() => useTemplateEditor());
        const template = createMockTemplate();

        act(() => {
            result.current.initializeEditor(template);
        });

        act(() => {
            result.current.updateLocalTemplate({ name: 'New Name' });
        });

        expect(result.current.localTemplate?.name).toBe('New Name');
        expect(result.current.hasUnsavedChanges).toBe(true);
        expect(result.current.canUndo).toBe(true);
    });

    it('updateLocalGroup should update group properties', () => {
        const { result } = renderHook(() => useTemplateEditor());
        const template = createMockTemplate();

        act(() => {
            result.current.initializeEditor(template);
        });

        act(() => {
            result.current.updateLocalGroup(1, { name: 'Updated Group 1' });
        });

        expect(result.current.localTemplate?.groups[0].name).toBe('Updated Group 1');
        expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('subgroup CRUD operations should work properly', () => {
        const { result } = renderHook(() => useTemplateEditor());
        const template = createMockTemplate();

        act(() => {
            result.current.initializeEditor(template);
        });

        // Add
        act(() => {
            result.current.addLocalSubgroup(1, 'New Subgroup');
        });
        expect(result.current.localTemplate?.groups[0].subGroups).toHaveLength(2);

        // Add duplicate should show toast
        act(() => {
            result.current.addLocalSubgroup(1, 'New Subgroup');
        });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Duplicate name' }));

        // Update
        const newSubgroupId = result.current.localTemplate?.groups[0].subGroups[1].id as number;
        act(() => {
            result.current.updateLocalSubgroup(1, newSubgroupId, { name: 'Updated Subgroup' });
        });
        expect(result.current.localTemplate?.groups[0].subGroups[1].name).toBe('Updated Subgroup');

        // Clone
        act(() => {
            result.current.cloneLocalSubgroup(1, 1);
        });
        expect(result.current.localTemplate?.groups[0].subGroups).toHaveLength(3);
        expect(result.current.localTemplate?.groups[0].subGroups[2].name).toBe('Subgroup 1 (Copy)');

        // Delete
        act(() => {
            result.current.deleteLocalSubgroup(1, newSubgroupId);
        });
        expect(result.current.localTemplate?.groups[0].subGroups).toHaveLength(2);
    });

    it('shift CRUD operations should work properly', () => {
        const { result } = renderHook(() => useTemplateEditor());
        const template = createMockTemplate();

        act(() => {
            result.current.initializeEditor(template);
        });

        // Add
        act(() => {
            result.current.addLocalShift(1, 1, { name: 'New Shift' });
        });
        expect(result.current.localTemplate?.groups[0].subGroups[0].shifts).toHaveLength(2);

        // Update
        const newShiftId = result.current.localTemplate?.groups[0].subGroups[0].shifts[1].id as number;
        act(() => {
            result.current.updateLocalShift(1, 1, newShiftId, { name: 'Updated Shift' });
        });
        expect(result.current.localTemplate?.groups[0].subGroups[0].shifts[1].name).toBe('Updated Shift');

        // Delete
        act(() => {
            result.current.deleteLocalShift(1, 1, newShiftId);
        });
        expect(result.current.localTemplate?.groups[0].subGroups[0].shifts).toHaveLength(1);
    });

    it('undo/redo should traverse history correctly', () => {
        const { result } = renderHook(() => useTemplateEditor());
        const template = createMockTemplate();

        act(() => {
            result.current.initializeEditor(template);
        });

        act(() => {
            result.current.updateLocalTemplate({ name: 'State 2' });
        });

        act(() => {
            result.current.updateLocalTemplate({ name: 'State 3' });
        });

        expect(result.current.localTemplate?.name).toBe('State 3');
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(false);

        act(() => {
            result.current.undo();
        });

        expect(result.current.localTemplate?.name).toBe('State 2');
        expect(result.current.canUndo).toBe(true);
        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.undo();
        });

        expect(result.current.localTemplate?.name).toBe('T1');
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.redo();
        });

        expect(result.current.localTemplate?.name).toBe('State 2');
    });

    it('discardChanges should revert to original state', () => {
        const { result } = renderHook(() => useTemplateEditor());
        const template = createMockTemplate();

        act(() => {
            result.current.initializeEditor(template);
        });

        act(() => {
            result.current.updateLocalTemplate({ name: 'Temp Name' });
        });

        expect(result.current.localTemplate?.name).toBe('Temp Name');
        expect(result.current.hasUnsavedChanges).toBe(true);

        act(() => {
            result.current.discardChanges();
        });

        expect(result.current.localTemplate?.name).toBe('T1');
        expect(result.current.hasUnsavedChanges).toBe(false);
        expect(result.current.canUndo).toBe(false);
    });
});
