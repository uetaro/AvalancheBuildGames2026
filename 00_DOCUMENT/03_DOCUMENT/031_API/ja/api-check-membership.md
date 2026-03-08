# API: check-membership

## 概要
認証済みユーザーが指定会社のメンバー（スタッフ/マネージャー）かどうかをチェックする。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/check-membership`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| is_member | boolean | ユーザーがスタッフ/マネージャーかどうか |
| affiliation_id | string \| null | メンバーの場合のアフィリエーションID |
| role | string \| null | メンバーの場合 "staff" または "manager" |

## 処理説明

1. 認証し、user_id を取得する。
2. (user, company) のアフィリエーションをアクティブ状態で検索する。
3. is_member, affiliation_id, role を返す。
