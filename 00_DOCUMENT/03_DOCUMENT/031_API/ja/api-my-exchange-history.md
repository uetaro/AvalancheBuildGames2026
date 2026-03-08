# API: my-exchange-history

## 概要
現在のスタッフメンバーのポイント交換履歴。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/my-exchange-history`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| limit | query | - | ページサイズ（1–100、デフォルト: 50） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | 交換リスト |
| items[].exchange_id | string | 交換ID |
| items[].gift_name | string | ギフト名 |
| items[].points_used | number | 使用ポイント |
| items[].status | string | ステータス |
| items[].created_at | string | 作成タイムスタンプ |
| items[].completed_at | string \| null | 完了タイムスタンプ |
| total_used | number | 合計使用ポイント |

## 処理説明

1. 認証し、アクティブな company_member を取得する。
2. メンバーの point_exchange をクエリする。
3. created_at 降順でソートし、limit を適用する。
4. points_used を合計し、items, total_used を返す。
