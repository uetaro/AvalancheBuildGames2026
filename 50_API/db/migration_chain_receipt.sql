-- =============================================================================
-- migration_chain_receipt.sql
-- chain_receipt テーブルに On-chain Worker 運用列を追加する
-- DD-OPS-CHECKOUT-ONCHAIN §3.2 準拠
--
-- 実行場所: Supabase ダッシュボード → SQL Editor
-- 実行順序: 既存の chain_receipt テーブルが存在することが前提
-- =============================================================================

-- chain_id: ネットワーク識別（43113=Fuji Testnet / 43114=C-Chain Mainnet）
ALTER TABLE chain_receipt
  ADD COLUMN IF NOT EXISTS chain_id          INT          NOT NULL DEFAULT 43113;

-- contract_address: ReceiptRegistry コントラクトアドレス（デプロイ後に設定）
ALTER TABLE chain_receipt
  ADD COLUMN IF NOT EXISTS contract_address  TEXT         NULL;

-- hash_alg: anchor_hash のアルゴリズム識別（混在事故防止）
ALTER TABLE chain_receipt
  ADD COLUMN IF NOT EXISTS hash_alg          TEXT         NOT NULL DEFAULT 'keccak256';

-- retry_count: 失敗時のリトライ回数（バックオフ計算に使用）
ALTER TABLE chain_receipt
  ADD COLUMN IF NOT EXISTS retry_count       INT          NOT NULL DEFAULT 0;

-- next_attempt_at: 指数バックオフによる次回試行予定時刻（NULL=即時試行可）
ALTER TABLE chain_receipt
  ADD COLUMN IF NOT EXISTS next_attempt_at   TIMESTAMPTZ  NULL;

-- last_attempt_at: 最終試行時刻（デバッグ・監視用）
ALTER TABLE chain_receipt
  ADD COLUMN IF NOT EXISTS last_attempt_at   TIMESTAMPTZ  NULL;

-- tx_error: 直近のエラー概要（最大 500 文字）
ALTER TABLE chain_receipt
  ADD COLUMN IF NOT EXISTS tx_error          TEXT         NULL;

-- =============================================================================
-- インデックス（Worker のクエリを高速化）
-- =============================================================================

-- queued/failed かつ next_attempt_at が過去のものを素早く取得
CREATE INDEX IF NOT EXISTS idx_chain_receipt_worker_submit
  ON chain_receipt (receipt_status, next_attempt_at, created_at)
  WHERE receipt_status IN ('queued', 'failed');

-- submitted かつ confirmed_at が NULL のものを確認フェーズで高速取得
CREATE INDEX IF NOT EXISTS idx_chain_receipt_worker_confirm
  ON chain_receipt (receipt_status, confirmed_at)
  WHERE receipt_status = 'submitted';

-- =============================================================================
-- 既存レコードの chain_id / hash_alg を埋める（既存データがある場合）
-- =============================================================================
UPDATE chain_receipt
  SET chain_id = 43113,
      hash_alg = 'keccak256'
  WHERE chain_id IS NULL OR hash_alg IS NULL;
