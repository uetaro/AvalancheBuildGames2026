# ゲストモバイル: Kudos 送信完了画面

## 画面概要
Kudos 送信成功後のサンクス画面。残数表示と次のアクションを案内する。

## パス
`/kudos/complete`

## 表示項目

| 項目 | 説明 |
|------|------|
| 成功アイコン | Kudos バッジ + チェックマーク |
| "Kudos Sent Successfully" | タイトル |
| "Your appreciation has been delivered" | サブタイトル |
| Kudos Remaining | remaining_quota（state から） |
| Pending Notice | "Your Kudos is currently pending and will be confirmed at checkout." |
| Send Another Kudos | remaining_quota > 0 の場合のみ表示 |
| Return to Home | ホームへ |
| Support Staff Careers | アカウント作成への導線（Create ボタン） |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| Send Another Kudos | /staff へ遷移 |
| Return to Home | /home へ遷移 |
| Create | /account/create へ遷移 |

## データ
- location.state: kudos_id, kudos_status, remaining_quota, staff_display_name, category など
- remaining_quota を localStorage に保存

## 遷移先
- `/staff` — もう一度送信
- `/home` — ホーム
- `/account/create` — アカウント作成
