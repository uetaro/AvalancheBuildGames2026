# スタッフモバイル: ポイント残高

## 画面概要
ポイント残高、今月獲得、6ヶ月トレンドを表示する。

## パス
`/app/point`

## 表示項目

| 項目 | 説明 |
|------|------|
| balance | 総ポイント残高 |
| this_month | 今月獲得ポイント |
| monthly_trend | 過去6ヶ月のポイント推移 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| 履歴 | /app/point/history へ |
| 交換 | /app/point/exchange または /app/point/exchange-list へ |

## API
- GET my-point-balance

## 遷移先
- /app/point/history — 履歴
- /app/point/exchange-list — 交換一覧
- /app/point/exchange — 交換
