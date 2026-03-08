# API: public-entry-verify

## 概要
NFCカードを検証し、ゲストセッションを作成する。認証不要。ゲストが部屋でカードをタップした際に使用。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-14a1e5b0/public-entry-verify`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| card_public_id | string | ○ | カード公開ID |
| company_public_id | string | - | オプションの会社一致チェック |
| client_request_id | string | - | クライアントリクエストID |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| guest_session_token | string | 不透明トークン（Kudos用に保存） |
| expires_at | string | セッション有効期限 |
| stay | object | { stay_id, company_id, company_name, checkin_at, room_code, room_label, card_uid } |
| rules_snapshot | object | Kudosルール（quota, cooldown等） |
| remaining_quota | number | 滞在の残Kudos数 |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| CARD_NOT_FOUND | 404 | カードが見つからない |
| CARD_REVOKED | 409 | カード失効 |
| CARD_NOT_ACTIVE | 409 | カードが非アクティブ |
| CARD_NOT_BOUND | 409 | カードが部屋に紐付いていない |
| NO_ACTIVE_STAY | 409 | カードにアクティブ滞在なし |
| COMPANY_SUSPENDED | 423 | 会社が非アクティブ |
| COMPANY_MISMATCH | 409 | company_public_id の不一致 |

## 処理説明

1. card_public_id でカードを取得し、アクティブかつ失効していないことを確認する。
2. card_room_binding を取得し、紐付いていることを確認する。
3. カードのアクティブ滞在を取得する。
4. 会社を取得し、アクティブであることを確認する。
5. 滞在のKudosをカウントし、remaining_quota を計算する。
6. guest_session を作成し、不透明トークンを生成する。
7. token、stay、rules_snapshot、remaining_quota を返す。
