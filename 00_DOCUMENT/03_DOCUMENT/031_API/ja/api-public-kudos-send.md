# API: public-kudos-send

## 概要
ゲストがスタッフにKudosを送信する。有効なゲストセッションが必要。クォータ、クールダウン、AIモデレーションを適用し、chain_receipt（キュー）を作成する。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-14a1e5b0/public-kudos-send`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| X-Guest-Session-Token | header | ○ | ゲストセッショントークン |
| receiver_company_member_id | string | ○ | Kudosを受け取るスタッフ |
| category | string | ○ | カテゴリ（空でないこと） |
| message_text | string | ○ | メッセージ（1–500文字） |

## 出力（成功: 201）

| 項目 | 型 | 説明 |
|------|------|-------------|
| kudos_id | string | 作成されたKudos ID |
| kudos_status | string | pending または rejected |
| remaining_quota | number | 滞在の残Kudos数 |
| cooldown_sec | number | クールダウン秒数 |
| next_available_at | string \| null | 次回送信可能時刻 |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| INVALID_GUEST_SESSION | 401 | トークン無効/期限切れ |
| POST_CHECKOUT_WINDOW_EXPIRED | 409 | チェックアウト後の送信期限を過ぎている |
| RECEIVER_NOT_FOUND | 404 | スタッフが見つからない/非アクティブ |
| RECEIVER_NOT_ON_DUTY | 409 | スタッフが勤務中ではない |
| QUOTA_EXCEEDED | 409 | 滞在Kudosクォータ超過 |
| COOLDOWN_ACTIVE | 409 | クールダウンが経過していない |
| CONTENT_MODERATION_FAILED | 400 | AIスコアが閾値未満 |

## 処理説明

1. ゲストセッションを検証し、stay_id、company_id を取得する。
2. 受信者を検証（同一会社、アクティブ、許可されたロール）。
3. 受信者が勤務中であることを確認する。
4. 滞在ルールをチェック：クォータ、クールダウン、post_checkout_window。
5. AIコンテンツスコアリング；閾値未満の場合は却下する。
6. kudos を挿入（ステータス pending または rejected）。
7. anchor_hash を計算し、chain_receipt（queued）を挿入する。
8. kudos_moderation レコードを挿入する。
9. kudos_id、remaining_quota 等を返す。
