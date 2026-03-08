# ゲストモバイル: スタッフ選択画面

## 画面概要
オン・デューティのスタッフ一覧を表示し、Kudos 送信先を選択する。

## パス
`/staff`

## 表示項目

| 状態 | 項目 | 説明 |
|------|------|------|
| 共通 | 戻るボタン | /home へ |
| 共通 | "Select Staff" | タイトル |
| 成功時 | 検索バー | スタッフ名・役職で検索 |
| 成功時 | 役職フィルタ | All + ユニーク job_title のチップ |
| 成功時 | スタッフ一覧 | アバター、名前、役職、On duty since |
| 成功時 | 残数0時 | "You've used all your Kudos for this stay." |
| ローディング | スピナー | "Loading staff..." |
| エラー | エラーメッセージ + Retry | |
| セッション期限切れ | メッセージ + Re-scan Card | |
| 空 | "No staff currently on duty" | Refresh ボタン |
| 検索0件 | "No staff members match your search" | |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| スタッフ行タップ | quotaExhausted でなければ /kudos/:staffId へ遷移（state でスタッフ情報を渡す） |
| 戻る | /home へ |
| Retry | fetchStaffList 再実行 |
| Re-scan Card | / へ遷移 |
| Refresh | fetchStaffList 再実行 |

## API
- GET public-staff-list（X-Guest-Session-Token 必須）

## 遷移先
- `/home` — 戻る
- `/kudos/:staffId` — Kudos 送信画面
