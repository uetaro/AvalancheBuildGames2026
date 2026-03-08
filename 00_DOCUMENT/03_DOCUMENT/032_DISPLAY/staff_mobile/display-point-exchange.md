# スタッフモバイル: ポイント交換

## 画面概要
ポイントを景品・ギフトと交換する。

## パス
`/app/point/exchange`, `/app/point/exchange-list`

## 表示項目

| 画面 | 項目 |
|------|------|
| exchange-list | 交換可能リスト（gift_name, points_used 等） |
| exchange | 交換フォーム、確認 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 交換実行 | point_exchange 作成（API 連携） |

## API
- GET my-exchange-history（履歴）
- 交換用 API（実装に応じて）

## 遷移先
- /app/point — 戻る
