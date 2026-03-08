# スタッフWeb: Affiliation（所属申請管理）

## 画面概要
マネージャー向け。所属申請の一覧、承認・却下。

## パス
`/manager/affiliation`

## 表示項目

| 項目 | 説明 |
|------|------|
| ステータスフィルタ | pending, approved, rejected, cancelled |
| 検索 | 申請者名・メールで検索 |
| 申請一覧 | app_display_name, email, requested_role, request_status, request_note, job_title, created_at |
| 承認/却下 | 各申請に Approve / Reject ボタン |
| AI チャット | 申請レビュー支援（任意） |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 承認 | ops-affiliation-requests-decide (decision=approve) |
| 却下 | ops-affiliation-requests-decide (decision=reject) |
| リフレッシュ | ops-affiliation-requests 再取得 |

## API
- POST ops-affiliation-requests
- POST ops-affiliation-requests-decide
