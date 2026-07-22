// @ts-ignore - Supabase Deno Edge Functions support npm specifiers at runtime.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import { createHandler, type ComplianceDependencies, type ShiftFacts } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL) throw new Error('[FATAL] Missing SUPABASE_URL');
if (!SERVICE_ROLE_KEY) throw new Error('[FATAL] Missing SUPABASE_SERVICE_ROLE_KEY');

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const dependencies: ComplianceDependencies = {
  async rpc<T>(name: string, args: Record<string, unknown>) {
    const { data, error } = await service.rpc(name, args);
    return {
      data: data as T | null,
      error: error ? { message: error.message } : null,
    };
  },

  async getShiftFacts(ids: string[]) {
    const { data, error } = await service
      .from('shifts')
      .select('id, assigned_employee_id, shift_date, net_length_minutes, lifecycle_status, deleted_at')
      .in('id', ids);
    return {
      data: data as ShiftFacts[] | null,
      error: error ? { message: error.message } : null,
    };
  },
};

Deno.serve(createHandler(dependencies));
