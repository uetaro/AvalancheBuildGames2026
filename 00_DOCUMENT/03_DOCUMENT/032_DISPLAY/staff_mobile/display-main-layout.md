# スタッフモバイル: メインレイアウト

## 画面概要
/app 配下の共通レイアウト。Outlet で子画面を表示し、下部タブで Kudos / Work / Point / Account を切り替える。

## パス
`/app`（子ルートの親）

## 表示項目

| 項目 | 説明 |
|------|------|
| メインエリア | Outlet（子画面） |
| 下部タブ | Kudos, Work, Point, Account |
| アクティブインジケーター | 選択中タブの色付きバー |
| アバター | プロフィール画像（my-profile から取得） |

## タブ構成

| タブ | パス | 色 |
|------|------|-----|
| Kudos | /app/kudos | #FF6B6B |
| Work | /app/work | #5BA5A5 |
| Point | /app/point | #C9A227 |
| Account | /app/account | #D4A574 |

## 操作・アクション
- タブタップ: 対応パスへ遷移
- セッションなし: / へリダイレクト
