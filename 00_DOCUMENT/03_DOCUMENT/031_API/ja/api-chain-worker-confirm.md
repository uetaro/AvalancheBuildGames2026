# API: chain-worker-confirm

## 概要
送信済み chain_receipt トランザクションを確認する。eth_getTransactionReceipt をチェック；status=1 → 確認済み、status=0 → 失敗+リトライ。pg_cron から呼び出される。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/chain-worker-confirm`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer SUPABASE_SERVICE_ROLE_KEY または CHAIN_WORKER_SECRET |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| processed | number | 処理したレコード数 |
| confirmed | number | 確認されたトランザクション数 |
| failed | number | リバートされたトランザクション数（リトライ予定） |

## 処理説明

1. Bearer で認証する。
2. receipt_status=submitted かつ tx_hash が null でない chain_receipt を最大10件取得する。
3. 各件について getTransactionReceipt(tx_hash) を実行する。
4. pending の場合：スキップ（次回スキャン）。
5. status=1 の場合：confirmed に更新し、confirmed_at を設定する。
6. status=0 の場合：failed に更新し、next_attempt_at（バックオフ）を設定する。
7. processed, confirmed, failed を返す。
