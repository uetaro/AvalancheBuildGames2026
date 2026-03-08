# API: ops-update-card-binding

## 概要
カードを部屋に紐付ける、または紐付けを解除する。card_room_binding を更新する。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-update-card-binding`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| card_id | string (uuid) | ○ | カードID |
| room_id | string (uuid) | - | 紐付ける部屋ID（省略で解除） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| card_room_binding_id | string | 紐付けID |
| card_id | string | カードID |
| room_id | string \| null | 部屋ID（解除時は null） |
| action | string | "bound" または "unbound" |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| VALIDATION_ERROR | 400 | カード/部屋が見つからない、カードにアクティブ滞在あり（紐付け時） |
| CONFLICT | 409 | カード失効、部屋非アクティブ |

## 処理説明

1. 認証し、スタッフ/マネージャーであることを確認する。
2. カードと部屋が会社に属することを検証する。
3. 紐付け時：現在の紐付けを解除し、新しい紐付けを作成する。
4. 解除時：現在の紐付けに unbound_at を設定する。
5. 結果を返す。
