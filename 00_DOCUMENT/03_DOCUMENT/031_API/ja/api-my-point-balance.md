# API: my-point-balance

## 概要
ポイント残高、今月獲得分、確認済みKudosの6ヶ月トレンド。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/my-point-balance`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| balance | number | 確認済みポイント合計 |
| this_month | number | 今月獲得ポイント |
| monthly_trend | array | [{ month, points }] 過去6ヶ月 |

## 処理説明

1. 認証し、アクティブな company_member を取得する。
2. 確認済みKudosの points_awarded を合計（総残高）。
3. 今月分のポイントを合計する。
4. 過去6ヶ月の monthly_trend を構築する。
5. balance, this_month, monthly_trend を返す。
