import { createClient } from '@supabase/supabase-js';

const APNS_AUTH_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const encoder = new TextEncoder();

type Delivery = {
  id: string;
  notification_id: string;
  device_token_id: string;
  attempts: number;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  entity_id: string | null;
  entity_type: string | null;
};

type DeviceToken = {
  id: string;
  token: string;
  active: boolean;
  environment: 'development' | 'production';
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const base64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
};

const encodeJson = (value: unknown) =>
  base64Url(encoder.encode(JSON.stringify(value)));

const decodePem = (pem: string) => {
  const normalized = pem.replaceAll('\\n', '\n');
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/gu, '')
    .replace(/-----END PRIVATE KEY-----/gu, '')
    .replace(/\s/gu, '');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

async function createProviderToken(
  keyId: string,
  teamId: string,
  privateKeyPem: string,
) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodePem(privateKeyPem),
    APNS_AUTH_ALGORITHM,
    false,
    ['sign'],
  );
  const issuedAt = Math.floor(Date.now() / 1000);
  const unsignedToken = `${encodeJson({ alg: 'ES256', kid: keyId })}.${encodeJson({
    iss: teamId,
    iat: issuedAt,
  })}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(unsignedToken),
  );
  return `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;
}

const permanentTokenErrors = new Set([
  'BadDeviceToken',
  'DeviceTokenNotForTopic',
  'MissingDeviceToken',
  'Unregistered',
]);

const permanentPayloadErrors = new Set([
  'BadCollapseId',
  'BadMessageId',
  'BadPriority',
  'BadTopic',
  'DuplicateHeaders',
  'PayloadEmpty',
  'PayloadTooLarge',
]);

const retryDelayMilliseconds = (attempt: number) =>
  Math.min(60 * 60_000, 2 ** Math.max(0, attempt) * 30_000);

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const workerSecret = Deno.env.get('PUSH_WORKER_SECRET');
  if (!workerSecret || request.headers.get('x-push-worker-secret') !== workerSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const privateKey = Deno.env.get('APNS_PRIVATE_KEY');
  const configuredBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.shiftopia.app';

  if (!supabaseUrl || !serviceRoleKey || !keyId || !teamId || !privateKey) {
    return json({ error: 'APNs server secrets are incomplete' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();

  // Recover work abandoned by a terminated invocation. APNs accepts the same
  // apns-id on retry, so replay remains safe.
  await supabase
    .from('push_notification_deliveries')
    .update({
      status: 'pending',
      last_error: 'Recovered stale delivery lease',
      updated_at: now,
    })
    .eq('status', 'processing')
    .lt('updated_at', new Date(Date.now() - 5 * 60_000).toISOString());

  const { data: pending, error: pendingError } = await supabase
    .from('push_notification_deliveries')
    .select('id, notification_id, device_token_id, attempts')
    .eq('status', 'pending')
    .lte('next_attempt_at', now)
    .order('created_at', { ascending: true })
    .limit(50);

  if (pendingError) return json({ error: pendingError.message }, 500);
  if (!pending?.length) return json({ processed: 0, delivered: 0, failed: 0 });

  let providerToken: string;
  try {
    providerToken = await createProviderToken(keyId, teamId, privateKey);
  } catch (error) {
    return json({
      error: `Could not load APNs signing key: ${error instanceof Error ? error.message : String(error)}`,
    }, 500);
  }

  const results = { processed: 0, delivered: 0, failed: 0, retried: 0, skipped: 0 };

  for (const candidate of pending as Delivery[]) {
    const { data: claimed } = await supabase
      .from('push_notification_deliveries')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (!claimed) continue;
    results.processed += 1;

    const [{ data: notification }, { data: device }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, message, link, entity_id, entity_type')
        .eq('id', candidate.notification_id)
        .maybeSingle(),
      supabase
        .from('push_device_tokens')
        .select('id, token, active, environment')
        .eq('id', candidate.device_token_id)
        .maybeSingle(),
    ]);

    if (!notification || !device || !(device as DeviceToken).active) {
      await supabase
        .from('push_notification_deliveries')
        .update({
          status: 'skipped',
          last_error: 'Notification or active device token no longer exists',
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);
      results.skipped += 1;
      continue;
    }

    const push = notification as Notification;
    const target = device as DeviceToken;
    const bundleId = configuredBundleId;
    const apnsHost = target.environment === 'production'
      ? 'https://api.push.apple.com'
      : 'https://api.sandbox.push.apple.com';
    const payload = {
      aps: {
        alert: {
          title: push.title,
          body: push.message ?? '',
        },
        sound: 'default',
        'thread-id': push.type,
      },
      notification_id: push.id,
      type: push.type,
      link: push.link ?? '/my-notifications',
      entity_id: push.entity_id,
      entity_type: push.entity_type,
    };

    let response: Response;
    try {
      response = await fetch(`${apnsHost}/3/device/${encodeURIComponent(target.token)}`, {
        method: 'POST',
        headers: {
          authorization: `bearer ${providerToken}`,
          'apns-topic': bundleId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'apns-id': push.id,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const attempts = candidate.attempts + 1;
      await supabase
        .from('push_notification_deliveries')
        .update({
          status: attempts >= 5 ? 'failed' : 'pending',
          attempts,
          next_attempt_at: new Date(Date.now() + retryDelayMilliseconds(attempts)).toISOString(),
          last_error: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);
      if (attempts >= 5) results.failed += 1;
      else results.retried += 1;
      continue;
    }

    if (response.ok) {
      await supabase
        .from('push_notification_deliveries')
        .update({
          status: 'delivered',
          attempts: candidate.attempts + 1,
          delivered_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);
      results.delivered += 1;
      continue;
    }

    const apnsError = await response.json().catch(() => ({ reason: `HTTP ${response.status}` }));
    const reason = typeof apnsError?.reason === 'string'
      ? apnsError.reason
      : `HTTP ${response.status}`;
    const attempts = candidate.attempts + 1;

    if (permanentTokenErrors.has(reason)) {
      await Promise.all([
        supabase
          .from('push_device_tokens')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', target.id),
        supabase
          .from('push_notification_deliveries')
          .update({
            status: 'skipped',
            attempts,
            last_error: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', candidate.id),
      ]);
      results.skipped += 1;
    } else if (permanentPayloadErrors.has(reason) || attempts >= 5) {
      await supabase
        .from('push_notification_deliveries')
        .update({
          status: 'failed',
          attempts,
          last_error: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);
      results.failed += 1;
    } else {
      await supabase
        .from('push_notification_deliveries')
        .update({
          status: 'pending',
          attempts,
          next_attempt_at: new Date(Date.now() + retryDelayMilliseconds(attempts)).toISOString(),
          last_error: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.id);
      results.retried += 1;
    }
  }

  return json(results);
});
