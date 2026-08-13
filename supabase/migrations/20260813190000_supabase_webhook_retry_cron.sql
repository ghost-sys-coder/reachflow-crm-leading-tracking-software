-- REQUIRED IN SUPABASE SQL EDITOR: move webhook retries from Vercel Hobby to Supabase Cron.
-- PREREQUISITE: create these two Vault secrets in the Supabase Dashboard before running:
--   reachflow_app_url     = https://your-production-domain.com (no trailing slash)
--   reachflow_cron_secret = the same CRON_SECRET configured in Vercel
-- Never paste either secret into this migration file.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'reachflow_app_url') THEN
    RAISE EXCEPTION 'Missing Vault secret: reachflow_app_url';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'reachflow_cron_secret') THEN
    RAISE EXCEPTION 'Missing Vault secret: reachflow_cron_secret';
  END IF;
END $$;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'reachflow-webhook-retries';

SELECT cron.schedule(
  'reachflow-webhook-retries',
  '*/5 * * * *',
  $job$
    SELECT net.http_get(
      url := rtrim((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reachflow_app_url'), '/') || '/api/cron/webhook-retries',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reachflow_cron_secret'),
        'User-Agent', 'Supabase-Cron/ReachFlow'
      ),
      timeout_milliseconds := 55000
    ) AS request_id;
  $job$
);

-- Verification query (run separately after setup if desired):
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'reachflow-webhook-retries';
