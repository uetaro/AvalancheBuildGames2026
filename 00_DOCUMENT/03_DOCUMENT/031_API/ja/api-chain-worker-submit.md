# API: chain-worker-submit

## 概要
キューまたは失敗状態の chain_receipt レコードを処理する。Avalanche C-Chain ReceiptRegistry.recordReceipt() に送信する。pg_cron から呼び出される。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/chain-worker-submit`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer SUPABASE_SERVICE_ROLE_KEY または CHAIN_WORKER_SECRET |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| processed | number | 処理したレコード数 |
| submitted | number | 送信/確認に成功した数 |
| failed | number | 失敗数（リトライ予定） |

## 処理説明

1. Bearer（サービスロールまたはワーカーシークレット）で認証する。
2. receipt_status が (queued, failed) かつ next_attempt_at <= now の chain_receipt を最大5件取得する。
3. 各件について isRecorded(anchor_hash) をチェック；既に記録済みの場合は confirmed にマークする。
4. それ以外：recordReceipt(anchor_hash, points) を呼び出す；submitted に更新し、tx_hash を設定する。
5. エラー時：failed に更新し、next_attempt_at（指数バックオフ）を設定する。
6. processed, submitted, failed を返す。
