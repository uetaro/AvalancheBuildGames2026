# API: ops-members

## 概要
会社のスタッフ一覧を返す（運用/管理用）。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/ops-members`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | スタッフリスト |
| items[].staff_id | string | スタッフID |
| items[].display_name | string | 表示名 |
| items[].email | string \| null | メールアドレス |
| items[].avatar_url | string \| null | アバターURL |
| items[].role | string | "staff" または "manager" |
| items[].affiliation_id | string | アフィリエーションID |

## 処理説明

1. 認証し、呼び出し元が会社のマネージャーであることを確認する。
2. 会社のアフィリエーションをスタッフ詳細付きで取得する。
3. items を返す。
