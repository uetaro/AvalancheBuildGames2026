# API: ops-rooms

## 概要
会社の部屋一覧をアクティブ滞在情報付きで返す。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-rooms`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| include_inactive | boolean | - | 非アクティブな部屋を含む（デフォルト: false） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | 部屋リスト |
| items[].room_id | string | 部屋ID |
| items[].room_code | string | 部屋コード |
| items[].room_label | string | 部屋ラベル |
| items[].is_active | boolean | アクティブフラグ |
| items[].created_at | string | 作成タイムスタンプ |
| items[].active_stay | object \| null | アクティブ滞在情報（stay_id, card_id, card_uid, checkin_at）または null |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| UNAUTHORIZED | 401 | トークン無効 |
| FORBIDDEN | 403 | 会社のスタッフ/マネージャーではない |
| INTERNAL_ERROR | 500 | DBエラー |

## 処理説明

1. 認証し、呼び出し元が会社のスタッフ/マネージャーであることを確認する。
2. 会社の部屋を取得する（オプションで is_active=true でフィルター）。
3. 会社のアクティブ滞在を取得する。
4. 滞在のカードUIDを取得する。
5. 部屋に滞在情報をマージして items を返す。
