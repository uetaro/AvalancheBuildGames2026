# API: my-kudos

## 概要
現在のスタッフメンバーが受け取ったKudosを一覧表示する。ステータスフィルター、日付範囲、ページネーションに対応。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/my-kudos`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| status | query | - | カンマ区切り: pending, confirmed, rejected |
| from | query | - | 開始日（ISO8601） |
| to | query | - | 終了日（ISO8601） |
| limit | query | - | ページサイズ（1–100、デフォルト: 30） |
| cursor | query | - | ページネーションカーソル（created_at） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | Kudosリスト |
| items[].kudos_id | string | Kudos ID |
| items[].kudos_status | string | pending, confirmed, rejected |
| items[].category | string | カテゴリ |
| items[].message_preview | string | メッセージの先頭80文字 |
| items[].points_awarded | number | ポイント |
| items[].created_at | string | 作成タイムスタンプ |
| items[].confirmed_at | string \| null | 確認タイムスタンプ |
| items[].stay_id | string | Stay ID |
| items[].company_name | string \| null | 会社名 |
| next_cursor | string \| null | 次ページカーソル |
| summary | object | { pending, confirmed, rejected: 件数 } |

## 処理説明

1. 認証し、user_id を取得する。
2. ユーザーのアクティブな company_member を取得する。
3. receiver_company_member_id = member の kudos をクエリする。
4. status, from, to, cursor フィルターを適用する。
5. 会社名のため company と結合する。
6. ステータス別の summary 件数を計算する。
7. items, next_cursor, summary を返す。
