-- Native push notification delivery for Shiftopia iOS.
--
-- APNs credentials remain in Edge Function secrets. This migration stores only
-- opaque device tokens and creates one durable delivery job per active device
-- whenever the existing application notification pipeline inserts a row.

CREATE TABLE public.push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_id text NOT NULL DEFAULT 'com.shiftopia.app',
  environment text NOT NULL DEFAULT 'development'
    CHECK (environment IN ('development', 'production')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_device_tokens_token_not_blank CHECK (length(btrim(token)) > 0),
  CONSTRAINT push_device_tokens_token_app_unique UNIQUE (token, app_id)
);

CREATE INDEX push_device_tokens_profile_active_idx
  ON public.push_device_tokens (profile_id)
  WHERE active;

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_device_tokens_select_own
  ON public.push_device_tokens
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE POLICY push_device_tokens_delete_own
  ON public.push_device_tokens
  FOR DELETE
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

REVOKE ALL ON public.push_device_tokens FROM anon;
GRANT SELECT, DELETE ON public.push_device_tokens TO authenticated;
GRANT ALL ON public.push_device_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.register_push_device(
  p_token text,
  p_platform text DEFAULT 'ios',
  p_app_id text DEFAULT 'com.shiftopia.app',
  p_environment text DEFAULT 'development'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'Unsupported push platform';
  END IF;

  IF p_environment NOT IN ('development', 'production') THEN
    RAISE EXCEPTION 'Unsupported push environment';
  END IF;

  IF p_token IS NULL OR length(btrim(p_token)) = 0 THEN
    RAISE EXCEPTION 'Push token is required';
  END IF;

  INSERT INTO public.push_device_tokens (
    profile_id,
    token,
    platform,
    app_id,
    environment,
    active,
    updated_at,
    last_seen_at
  )
  VALUES (
    v_profile_id,
    btrim(p_token),
    p_platform,
    p_app_id,
    p_environment,
    true,
    now(),
    now()
  )
  ON CONFLICT (token, app_id) DO UPDATE
  SET profile_id = EXCLUDED.profile_id,
      platform = EXCLUDED.platform,
      environment = EXCLUDED.environment,
      active = true,
      updated_at = now(),
      last_seen_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_device(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_device(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_push_device(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.unregister_push_device(
  p_token text,
  p_app_id text DEFAULT 'com.shiftopia.app'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.push_device_tokens
  WHERE profile_id = auth.uid()
    AND token = btrim(p_token)
    AND app_id = p_app_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.unregister_push_device(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unregister_push_device(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_device(text, text) TO service_role;

CREATE TABLE public.push_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  device_token_id uuid NOT NULL REFERENCES public.push_device_tokens(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'delivered', 'skipped', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_notification_delivery_unique UNIQUE (notification_id, device_token_id)
);

CREATE INDEX push_notification_deliveries_pending_idx
  ON public.push_notification_deliveries (next_attempt_at, created_at)
  WHERE status = 'pending';

ALTER TABLE public.push_notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_notification_deliveries FROM anon, authenticated;
GRANT ALL ON public.push_notification_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_native_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.push_notification_deliveries (notification_id, device_token_id)
  SELECT NEW.id, token.id
  FROM public.push_device_tokens AS token
  WHERE token.profile_id = NEW.profile_id
    AND token.platform = 'ios'
    AND token.active
  ON CONFLICT (notification_id, device_token_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_native_push_notification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_native_push_notification() TO service_role;

CREATE TRIGGER notifications_enqueue_native_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_native_push_notification();

COMMENT ON TABLE public.push_device_tokens IS
  'Opaque APNs/FCM registration tokens. Private keys are stored only as Edge Function secrets.';
COMMENT ON TABLE public.push_notification_deliveries IS
  'Durable per-device native push outbox populated from public.notifications.';
