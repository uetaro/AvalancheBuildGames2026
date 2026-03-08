# スタッフWeb: Stays（滞在管理）

## 画面概要
部屋一覧とカードのドラッグ&ドロップでチェックイン/チェックアウトを行う。スタッフ・マネージャー共通。

## パス
`/staff/stays`, `/manager/stays`

## 表示項目

| 項目 | 説明 |
|------|------|
| 部屋一覧 | フロア別、部屋番号、ステータス（occupied/vacant/cleaning）、滞在情報 |
| カード一覧 | ドラッグ可能なカード（card_uid, current_room） |
| 部屋ドロップゾーン | カードをドロップでチェックイン |
| チェックアウト | 滞在中の部屋からチェックアウト |
| 滞在詳細 | チェックイン日時、カード、Kudos 一覧、確認/却下 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| カード→部屋 D&D | ops-checkin |
| チェックアウト | ops-checkout（kudos_decisions 含む） |
| 滞在詳細 | モーダル表示 |
| リフレッシュ | ops-rooms, ops-cards 再取得 |

## API
- POST ops-rooms
- POST ops-cards
- POST ops-checkin
- POST ops-checkout
