# ゲストモバイル: マイページ

## 画面概要
ゲストのプロフィール概要とメニュー（Kudos履歴、プロフィール設定、通知設定）を表示する。

## パス
`/my-page`

## 表示項目

| 項目 | 説明 |
|------|------|
| 戻る | /home へ |
| "My Page" | タイトル |
| 会社名 | サブタイトル（例: Grand Hotel） |
| プロフィールカード | アバター、名前（Guest）、Anonymous User |
| 統計 | Total Sent, This Stay, Remaining（現状はモック値） |
| Kudos History | 送信履歴へのリンク |
| Profile Settings | プロフィール編集へのリンク |
| Notification Settings | 設定画面へのリンク |
| Logout | ログアウト |
| Footer | Terms of Service, Privacy Policy, Help & Contact |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 戻る | /home へ |
| Kudos History | /my-page/kudos へ |
| Profile Settings | /my-page/profile へ |
| Notification Settings | /my-page/settings へ |
| Logout | / へ遷移 |

## 備考
- 現状はログイン未連携のため、統計はモック。ログイン連携後に API から取得予定。

## 遷移先
- `/home` — 戻る
- `/my-page/kudos` — Kudos 履歴
- `/my-page/profile` — プロフィール編集
- `/my-page/settings` — 設定
- `/` — ログアウト
