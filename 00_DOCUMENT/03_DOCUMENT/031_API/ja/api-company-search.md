# API: company-search

## 概要
会社名で会社を検索する。アフィリエーションリクエストフローで使用。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/company-search`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| q | query string | ○ | 検索クエリ（1文字以上） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| companies | array | 会社リスト |
| companies[].company_id | string | 会社ID |
| companies[].company_name | string | 会社名 |
| companies[].company_status | string | 会社ステータス |

## 処理説明

1. Bearer トークンで認証する。
2. q が空の場合は空配列を返す。
3. company_status=active かつ company_name ILIKE %q% で company をクエリする。
4. company_name でソートし、20件に制限する。
5. companies を返す。
