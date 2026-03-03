-- =============================================================================
-- cron_setup.sql
-- pg_cron + pg_net で On-chain Worker を毎分自動実行する設定
-- DD-OPS-CHECKOUT-ONCHAIN §10 準拠
--
-- 実行場所: Supabase ダッシュボード → SQL Editor
-- 前提: pg_cron と pg_net 拡張が有効であること
--        （Supabase Pro 以上のプランで利用可能）
-- =============================================================================

-- 拡張が未インストールの場合は有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================================================
-- 環境変数（実際の値に置き換えてから実行すること）
-- =============================================================================
-- PROJECT_URL   : https://<your-project-ref>.supabase.co
-- SERVICE_KEY   : Supabase ダッシュボード → Settings → API → service_role key
-- =============================================================================

DO $$
DECLARE
  v_project_url  TEXT := 'https://<your-project-ref>.supabase.co';  -- ← 要変更
  v_service_key  TEXT := '<your-service-role-key>';                  -- ← 要変更
  v_submit_url   TEXT;
  v_confirm_url  TEXT;
BEGIN
  v_submit_url  := v_project_url || '/functions/v1/api/chain-worker-submit';
  v_confirm_url := v_project_url || '/functions/v1/api/chain-worker-confirm';

  -- ── chain-worker-submit: 毎分実行 ─────────────────────────────────────────
  -- queued/failed のレシートを Avalanche に送信する
  PERFORM cron.schedule(
    'heartel-chain-worker-submit',    -- ジョブ名（重複登録防止）
    '* * * * *',                      -- cron 式: 毎分
    format(
      $$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body    := '{}'::jsonb
      );
      $$,
      v_submit_url,
      v_service_key
    )
  );

  -- ── chain-worker-confirm: 毎分実行 ────────────────────────────────────────
  -- submitted 済み Tx のブロック確認を行う
  PERFORM cron.schedule(
    'heartel-chain-worker-confirm',   -- ジョブ名
    '* * * * *',                      -- cron 式: 毎分
    format(
      $$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body    := '{}'::jsonb
      );
      $$,
      v_confirm_url,
      v_service_key
    )
  );

  RAISE NOTICE 'Cron jobs registered: heartel-chain-worker-submit / heartel-chain-worker-confirm';
END;
$$;

-- =============================================================================
-- 登録確認クエリ
-- =============================================================================
-- SELECT jobid, jobname, schedule, command FROM cron.job
-- WHERE jobname LIKE 'heartel-%';

-- =============================================================================
-- 削除する場合
-- =============================================================================
-- SELECT cron.unschedule('heartel-chain-worker-submit');
-- SELECT cron.unschedule('heartel-chain-worker-confirm');
