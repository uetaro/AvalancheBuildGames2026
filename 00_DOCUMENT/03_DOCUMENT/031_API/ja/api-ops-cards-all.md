# API: ops-cards-all

## 概要
会社の全カードを返す（アクティブ滞在があるものを含む）。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-cards-all`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| status | string | - | カンマ区切りステータスフィルター（デフォルト: "active,issued"） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | 全カード |
| items[].card_id | string | カードID |
| items[].card_uid | string | カードUID |
| items[].card_status | string | カードステータス |
| items[].current_room | object \| null | 紐付き部屋または null |
| items[].active_stay | object \| null | アクティブ滞在（stay_id, checkin_at）または null |

## 処理説明

1. 認証し、スタッフ/マネージャーであることを確認する。
2. 会社の全カードを取得する。
3. 紐付けとアクティブ滞在を取得する。
4. マージして items を返す。
