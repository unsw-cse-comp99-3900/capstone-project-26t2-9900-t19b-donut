/* global Deno */
// @ts-expect-error Supabase Edge Functions resolve npm specifiers in the Deno runtime.
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import {
  evaluateCompliance,
  validateRequestBody,
  type RpcInvoker,
} from './logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL) throw new Error('[FATAL] Missing SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('[FATAL] Missing SUPABASE_ANON_KEY');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('[FATAL] Missing SUPABASE_SERVICE_ROLE_KEY');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function isAuthorized(req: Request): Promise<boolean> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return false;

  const token = authorization.slice('Bearer '.length);
  if (token === SUPABASE_SERVICE_ROLE_KEY) return true;

  const authClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  return !error && !!data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!(await isAuthorized(req))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400);
  }

  if (!validateRequestBody(body)) {
    return json({ error: 'Invalid compliance request' }, 400);
  }

  const service = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rpc: RpcInvoker = async (functionName, args) => {
    const { data, error } = await service.rpc(functionName, args);
    return {
      data,
      error: error ? { message: error.message } : null,
    };
  };

  const result = await evaluateCompliance(body, rpc);
  return json(result);
});
