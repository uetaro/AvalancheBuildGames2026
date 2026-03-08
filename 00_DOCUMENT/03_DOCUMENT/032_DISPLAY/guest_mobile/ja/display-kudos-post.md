# ゲストモバイル: Kudos 送信画面

## 画面概要
スタッフへの Kudos を、カテゴリとメッセージで送信する。

## パス
`/kudos/:staffId`

## 表示項目

| 項目 | 説明 |
|------|------|
| 戻る | /staff へ |
| "Send Kudos" | タイトル |
| To | スタッフカード（アバター、名前、役職） |
| Category * | 6カテゴリ（Hospitality, Professionalism, Kindness, Quick Response, Friendly, Other） |
| Message * | テキストエリア（最大500文字）、カウンタ表示 |
| モデレーションエラー | CONTENT_MODERATION_FAILED 時、suggestion 表示 |
| 注意文 | "Your Kudos will be recorded as staff evaluation..." |
| 送信ボタン | カテゴリ・メッセージ未入力で無効 |
| 確認ダイアログ | "Send Kudos?" / Send / Cancel |
| 送信中オーバーレイ | Lottie アニメーション + "Checking your post..." |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| カテゴリ選択 | selectedCategory 更新 |
| メッセージ入力 | message 更新、moderationSuggestion クリア |
| 送信ボタン | 確認ダイアログ表示 |
| 確認ダイアログ Send | public-kudos-send API を POST |
| 確認ダイアログ Cancel | ダイアログ閉じる |
| 戻る | /staff へ |

## API
- POST public-kudos-send（receiver_company_member_id, category, message_text）

## エラー表示
- QUOTA_EXCEEDED, COOLDOWN_ACTIVE, POST_CHECKOUT_WINDOW_EXPIRED, RECEIVER_NOT_FOUND, RECEIVER_NOT_ON_DUTY, UNAUTHORIZED, GUEST_SESSION_EXPIRED など

## 遷移先
- `/staff` — 戻る
- `/kudos/complete` — 送信成功時（state で結果を渡す）
