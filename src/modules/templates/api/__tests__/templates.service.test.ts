import { describe, it, expect, vi, beforeEach } from 'vitest';
import { templatesService, captureRosterAsTemplate } from '../templates.service';
import { supabase } from '@/platform/supabase/client';
import type { Template } from '../../model/templates.types';

vi.mock('@/platform/supabase/client', () => {
    const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
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

describe('templates.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getAllTemplates', () => {
        it('should return mapped templates', async () => {
            const dbData = [{ id: 't-1', name: 'T1', status: 'published', groups: '[]' }];
            const queryBuilder = supabase.from('roster_templates') as any;
            queryBuilder.order.mockResolvedValueOnce({ data: dbData, error: null });

            const result = await templatesService.getAllTemplates();
            expect(result.length).toBe(1);
            expect(result[0].id).toBe('t-1');
            expect(result[0].status).toBe('published');
            expect(result[0].groups).toEqual([]);
        });

        it('should handle malformed groups JSON', async () => {
            const dbData = [{ id: 't-1', groups: 'invalid-json' }];
            const queryBuilder = supabase.from('roster_templates') as any;
            queryBuilder.order.mockResolvedValueOnce({ data: dbData, error: null });

            const result = await templatesService.getAllTemplates();
            expect(result[0].groups).toEqual([]);
        });
    });

    describe('getTemplateById', () => {
        it('should return mapped template', async () => {
            const dbData = { id: 't-1', name: 'T1', groups: [{ id: 1, name: 'G1', subGroups: [] }] };
            const queryBuilder = supabase.from('roster_templates') as any;
            queryBuilder.single.mockResolvedValueOnce({ data: dbData, error: null });

            const result = await templatesService.getTemplateById('t-1');
            expect(result.id).toBe('t-1');
            expect(result.groups[0].name).toBe('G1');
        });
    });

    describe('createTemplate', () => {
        it('should insert and return new template', async () => {
            const newTpl = { name: 'NewT', description: 'desc', departmentId: 'd1', subDepartmentId: 's1', groups: [], organizationId: 'o1', appliedCount: 0, status: 'draft' as const };
            const dbData = { id: 't-new', ...newTpl };
            const queryBuilder = supabase.from('roster_templates') as any;
            queryBuilder.single.mockResolvedValueOnce({ data: dbData, error: null });

            const result = await templatesService.createTemplate(newTpl);
            expect(supabase.from).toHaveBeenCalledWith('roster_templates');
            expect(result.id).toBe('t-new');
        });
    });

    describe('updateTemplate', () => {
        it('should update specific fields', async () => {
            const updates = { name: 'Updated' };
            const dbData = { id: 't-1', name: 'Updated' };
            const queryBuilder = supabase.from('roster_templates') as any;
            queryBuilder.single.mockResolvedValueOnce({ data: dbData, error: null });

            const result = await templatesService.updateTemplate('t-1', updates);
            expect(result.name).toBe('Updated');
        });
    });

    describe('deleteTemplate', () => {
        it('should call cascade rpc and then delete', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ data: 10, error: null });
            const queryBuilder = supabase.from('roster_templates') as any;
            queryBuilder.eq.mockResolvedValueOnce({ error: null }); // For delete

            await templatesService.deleteTemplate('t-1');
            
            expect(supabase.rpc).toHaveBeenCalledWith('delete_template_shifts_cascade', { p_template_id: 't-1' });
            expect(supabase.from).toHaveBeenCalledWith('roster_templates');
        });
    });

    describe('publishTemplateRange', () => {
        it('should return error if not authenticated', async () => {
            (supabase.auth.getUser as any).mockResolvedValueOnce({ data: { user: null } });
            
            const result = await templatesService.publishTemplateRange('t-1', '2026-01-01', '2026-01-07');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Not authenticated');
        });

        it('should call rpc and return success data', async () => {
            const rpcResponse = { success: true, template_id: 't-1' };
            (supabase.rpc as any).mockResolvedValueOnce({ data: rpcResponse, error: null });

            const result = await templatesService.publishTemplateRange('t-1', '2026-01-01', '2026-01-07');
            expect(result.success).toBe(true);
            expect(result.template_id).toBe('t-1');
        });
    });

    describe('captureRosterAsTemplate', () => {
        it('should handle RPC success', async () => {
            const rpcResponse = { template_id: 't-new', shifts_captured: 5 };
            (supabase.rpc as any).mockResolvedValueOnce({ data: rpcResponse, error: null });

            const result = await captureRosterAsTemplate({
                startDate: '2026-01-01', endDate: '2026-01-07', subDepartmentId: 's1', templateName: 'Captured'
            });
            expect(result.templateId).toBe('t-new');
            expect(result.shiftsCaptured).toBe(5);
        });

        it('should throw mapped errors for known issues', async () => {
            (supabase.rpc as any).mockResolvedValueOnce({ error: { message: 'UNAUTHORIZED' } });
            await expect(captureRosterAsTemplate({ startDate: '', endDate: '', subDepartmentId: '', templateName: '' }))
                .rejects.toThrow('You do not have permission to access this subdepartment.');

            (supabase.rpc as any).mockResolvedValueOnce({ error: { message: 'DUPLICATE_TEMPLATE_NAME' } });
            await expect(captureRosterAsTemplate({ startDate: '', endDate: '', subDepartmentId: '', templateName: '' }))
                .rejects.toThrow('A template with this name already exists in this subdepartment.');
        });
    });
});
