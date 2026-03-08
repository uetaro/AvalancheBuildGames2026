# API: ops-cards

## 概要
利用可能なカードを返す（アクティブ滞在があるものを除く）。チェックイン時のカード選択に使用。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-cards`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| status | string | - | カンマ区切りステータスフィルター（デフォルト: "active,issued"） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | 利用可能なカード |
| items[].card_id | string | カードID |
| items[].card_uid | string | カードUID |
| items[].card_status | string | カードステータス |
| items[].current_room | object \| null | 紐付き部屋（room_id, room_code, room_label）または null |

## 処理説明

1. 認証し、スタッフ/マネージャーであることを確認する。
2. ステータスフィルター付きで会社のカードを取得する。
3. アクティブ滞在があるカードを除外する。
4. 各カードの現在の card_room_binding を取得する。
5. items を返す。
