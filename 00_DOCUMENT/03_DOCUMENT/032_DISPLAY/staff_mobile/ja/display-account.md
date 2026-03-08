# スタッフモバイル: アカウント

## 画面概要
プロフィール表示・編集、公開範囲、共有URL、所属申請の入り口。

## パス
`/app/account`, `/app/account/profile`, `/app/account/profile/edit`

## 表示項目

| 項目 | 説明 |
|------|------|
| プロフィール | アバター、表示名、メール、会社、役職 |
| 編集リンク | /app/account/profile/edit へ |
| 公開範囲 | /app/account/publication |
| 共有URL | /app/account/shared-url |
| 所属申請 | /app/account/affiliation |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| プロフィール編集 | PUT my-profile |
| アバター | POST/DELETE my-profile/avatar |

## API
- GET my-profile
- PUT my-profile
- POST my-profile/avatar
- DELETE my-profile/avatar

## 遷移先
- /app/account/profile/edit — プロフィール編集
- /app/account/publication — 公開範囲
- /app/account/shared-url — 共有URL
- /app/account/affiliation — 所属申請
