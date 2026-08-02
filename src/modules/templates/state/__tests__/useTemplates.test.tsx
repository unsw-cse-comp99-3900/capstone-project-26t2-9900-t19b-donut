import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTemplates from '../useTemplates';
import { supabase } from '@/platform/supabase/client';
import { useToast } from '@/modules/core/hooks/use-toast';

vi.mock('@/platform/supabase/client', () => {
    const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null })
    };
    return {
        supabase: {
            from: vi.fn(() => mockQueryBuilder),
            rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
            }
        }
    };
});

const mockToast = vi.fn();
vi.mock('@/modules/core/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast })
}));

describe('useTemplates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useTemplates());
        expect(result.current.templates).toEqual([]);
        expect(result.current.currentTemplate).toBeNull();
        expect(result.current.isLoading).toBe(false);
    });

    it('fetchTemplates should load templates and update state', async () => {
        const dbData = [{ id: 't-1', name: 'Template 1', groups: [] }];
        const queryBuilder = supabase.from('v_template_full') as any;
        queryBuilder.order.mockResolvedValueOnce({ data: dbData, error: null });

        const { result } = renderHook(() => useTemplates());
        
        await act(async () => {
            await result.current.fetchTemplates();
        });

        expect(result.current.templates).toHaveLength(1);
        expect(result.current.templates[0].id).toBe('t-1');
    });

    it('createTemplate should handle validation failure', async () => {
        const { result } = renderHook(() => useTemplates());
        
        await act(async () => {
            const res = await result.current.createTemplate({ name: 'A', description: '' });
            expect(res).toBeNull(); // 'A' is too short
        });

        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Invalid template name'
        }));
    });

    it('createTemplate should insert and update state on success', async () => {
        const newDbData = { id: 't-new', name: 'Valid Name', groups: [] };
        
        // Mock validate_template_name RPC
        (supabase.rpc as any).mockResolvedValueOnce({ data: { valid: true }, error: null });
        
        // Mock insert
        const queryBuilderInsert = supabase.from('roster_templates') as any;
        queryBuilderInsert.single.mockResolvedValueOnce({ data: newDbData, error: null });

        // Mock fetchTemplate
        const queryBuilderSelect = supabase.from('v_template_full') as any;
        queryBuilderSelect.single.mockResolvedValueOnce({ data: newDbData, error: null });

        const { result } = renderHook(() => useTemplates());

        await act(async () => {
            await result.current.createTemplate({ name: 'Valid Name', description: 'test' });
        });

        expect(result.current.templates).toHaveLength(1);
        expect(result.current.currentTemplate?.id).toBe('t-new');
    });

    it('setCurrentTemplate should update local and current templates', () => {
        const { result } = renderHook(() => useTemplates());
        const template = { id: 't-1', name: 'T1', groups: [], version: 1 } as any;

        act(() => {
            result.current.setCurrentTemplate(template);
        });

        expect(result.current.currentTemplate).toEqual(template);
        expect(result.current.localTemplate).toEqual(template);
        expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('updateLocalTemplate should modify localTemplate and set hasUnsavedChanges', () => {
        const { result } = renderHook(() => useTemplates());
        const template = { id: 't-1', name: 'T1', groups: [], version: 1 } as any;

        act(() => {
            result.current.setCurrentTemplate(template);
        });

        act(() => {
            result.current.updateLocalTemplate({ name: 'T2' });
        });

        expect(result.current.localTemplate?.name).toBe('T2');
        expect(result.current.currentTemplate?.name).toBe('T1');
        expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('discardChanges should revert localTemplate to currentTemplate', () => {
        const { result } = renderHook(() => useTemplates());
        const template = { id: 't-1', name: 'T1', groups: [], version: 1 } as any;

        act(() => {
            result.current.setCurrentTemplate(template);
        });

        act(() => {
            result.current.updateLocalTemplate({ name: 'T2' });
        });

        act(() => {
            result.current.discardChanges();
        });

        expect(result.current.localTemplate?.name).toBe('T1');
        expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('deleteTemplate should remove template from state', async () => {
        const { result } = renderHook(() => useTemplates());
        
        // Mock fetch first
        const dbData = [{ id: 't-1', name: 'Template 1', groups: [] }];
        const queryBuilder = supabase.from('v_template_full') as any;
        queryBuilder.order.mockResolvedValueOnce({ data: dbData, error: null });
        
        await act(async () => {
            await result.current.fetchTemplates();
        });
        
        expect(result.current.templates).toHaveLength(1);

        // Mock the select part of delete
        const mockSingle = vi.fn().mockResolvedValueOnce({ data: { status: 'draft', name: 'T1' }, error: null });
        const mockEqSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });
        
        // Mock delete part
        const mockEqDelete = vi.fn().mockResolvedValueOnce({ error: null });
        const mockDelete = vi.fn().mockReturnValue({ eq: mockEqDelete });

        (supabase.from as any).mockReturnValue({
            select: mockSelect,
            delete: mockDelete
        });

        await act(async () => {
            await result.current.deleteTemplate('t-1');
        });

        expect(result.current.templates).toHaveLength(0);
    });
});
