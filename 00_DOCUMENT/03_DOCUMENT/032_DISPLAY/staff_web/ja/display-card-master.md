# スタッフWeb: Card Master（カードマスタ）

## 画面概要
カード一覧、部屋への紐付け・解除。スタッフ・マネージャー共通。

## パス
`/staff/card-master`, `/manager/card-master`

## 表示項目

| 項目 | 説明 |
|------|------|
| 検索 | カード番号で検索 |
| フィルタ | all / active / issued / revoked |
| カード一覧 | card_uid, card_status, current_room, active_stay |
| 紐付け編集 | 部屋選択で binding 更新 |
| 紐付け解除 | Unbound に変更 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 紐付け変更 | POST ops-update-card-binding |
| リフレッシュ | ops-cards-all, ops-rooms 再取得 |

## API
- POST ops-cards-all
- POST ops-rooms
- POST ops-update-card-binding
