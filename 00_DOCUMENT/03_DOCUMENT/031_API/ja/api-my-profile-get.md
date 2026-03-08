# API: my-profile (GET)

## 概要
会社メンバーシップとアバターを含む現在のユーザープロファイルを取得する。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/my-profile`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| user_id | string | ユーザーID |
| email | string | メールアドレス |
| display_name | string | 表示名 |
| auth_name | string \| null | 認証メタデータの名前 |
| avatar_url | string \| null | アバター署名付きURL |
| has_company | boolean | アクティブなメンバーシップがあるか |
| company_member | object \| null | { company_member_id, company_id, company_name, member_role, display_name_override, job_title, public_profile_json, visibility_scope, version, updated_at } |

## 処理説明

1. 認証し、user_id を取得する。
2. 認証ユーザー（email, metadata）を取得する。
3. アクティブな company_member を取得し、会社名のため company と結合する。
4. Storage からアバターを取得し、署名付きURLを作成する。
5. プロファイルを返す。
