# ゲストモバイル: Kudos 履歴画面

## 画面概要
ゲストが送信した Kudos の一覧を表示する。検索で絞り込み可能。

## パス
`/my-page/kudos`

## 表示項目

| 項目 | 説明 |
|------|------|
| 戻る | /my-page へ |
| "Kudos History" | タイトル |
| 件数・会社名 | 例: "5 Kudos • Grand Hotel" |
| 検索バー | スタッフ名・役職・カテゴリ・メッセージで検索 |
| 検索結果数 | 検索時のみ "X results found" |
| Kudos カード | アバター、スタッフ名、役職、会社名、カテゴリバッジ、メッセージ、日付 |
| 検索0件 | "No results found" |
| 空状態 | "No Kudos sent yet" + Select Staff ボタン |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 戻る | /my-page へ |
| 検索入力 | filteredKudos でフィルタ |
| Select Staff | /staff へ遷移（空状態時） |

## データ
- 現状: mockKudosHistory（モックデータ）
- 将来: ログイン連携後、API から送信履歴取得

## 遷移先
- `/my-page` — 戻る
- `/staff` — 空状態時
