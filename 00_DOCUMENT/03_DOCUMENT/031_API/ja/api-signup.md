# API: signup

## 概要
スタッフ登録。スタッフプロファイルを作成し、アフィリエーション経由で会社に紐付ける。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-20781d19/signup`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| access_token | string | ○ | Supabase Auth JWT |
| company_id | string (uuid) | ○ | 会社ID |
| display_name | string | ○ | 表示名 |
| email | string | - | メールアドレス |
| avatar_url | string | - | アバターURL |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| staff_id | string | 作成されたスタッフID |
| affiliation_id | string | アフィリエーションID |
| display_name | string | 表示名 |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| UNAUTHORIZED | 401 | トークン無効 |
| VALIDATION_ERROR | 400 | company_id/display_name 欠落 |
| CONFLICT | 409 | 既に登録済み（ユーザーにスタッフが存在） |

## 処理説明

1. 認証し、JWTから user_id を取得する。
2. 会社が存在しアクティブであることを検証する。
3. ユーザーにスタッフが既に存在するか確認し、存在する場合はコンフリクトを返す。
4. スタッフレコードを作成（display_name, email, avatar_url）。
5. アフィリエーションを作成（staff, company, role=staff）。
6. staff_id, affiliation_id, display_name を返す。
