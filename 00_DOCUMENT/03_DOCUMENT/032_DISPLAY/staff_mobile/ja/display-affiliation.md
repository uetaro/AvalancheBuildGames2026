# スタッフモバイル: 所属申請

## 画面概要
会社検索、所属申請の作成・一覧・キャンセルを行う。

## パス
`/app/account/affiliation`

## 表示項目

| 項目 | 説明 |
|------|------|
| 会社検索 | company-search API、検索バー |
| 申請作成 | company_id, request_note, job_title |
| 申請一覧 | my-affiliation-requests、ステータス表示 |
| キャンセル | 保留中の申請を削除 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 検索 | GET company-search?q= |
| 申請作成 | POST affiliation-request |
| キャンセル | DELETE affiliation-request/:id |

## API
- GET company-search
- POST affiliation-request
- GET my-affiliation-requests
- DELETE affiliation-request/:id

## 遷移先
- /app/account — 戻る
