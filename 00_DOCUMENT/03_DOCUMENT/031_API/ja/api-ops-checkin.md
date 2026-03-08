# API: ops-checkin

## 概要
チェックインAPI。ゲストがカードで部屋にチェックインした際にアクティブな滞在レコードを作成する。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-checkin`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| room_id | string (uuid) | ○ | 部屋ID |
| card_id | string (uuid) | ○ | カードID |
| checkin_at | string (ISO8601) | - | チェックイン時刻（省略時: 現在） |
| client_request_id | string | - | トレース用クライアントリクエストID |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| stay_id | string (uuid) | 作成された滞在ID |
| checkin_at | string | チェックインタイムスタンプ |
| rules_snapshot | object | Kudosルール（quota, cooldown, points等） |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| UNAUTHORIZED | 401 | トークン無効または欠落 |
| VALIDATION_ERROR | 400 | room_id/card_id欠落、部屋未検出、カード失効、カード未紐付け |
| CONFLICT | 409 | 部屋またはカードに既にアクティブ滞在あり |

## 処理説明

1. access_tokenで認証し、呼び出し元が会社のアクティブスタッフ/マネージャーであることを確認する。
2. 部屋が会社に属しアクティブであることを検証する。
3. カードが会社に属し失効していないことを検証する。
4. card_room_bindingが存在する（カードが部屋に紐付いている）ことを検証する。
5. 二重チェックインを防止：部屋またはカードにアクティブ滞在がないこと。
6. stay_status=active、rules_snapshotで滞在レコードを挿入する。
7. stay_idとcheckin_atを返す。
