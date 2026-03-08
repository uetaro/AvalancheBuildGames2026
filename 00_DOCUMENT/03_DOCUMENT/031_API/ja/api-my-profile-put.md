# API: my-profile (PUT)

## 概要
会社メンバープロファイルを更新する。楽観的ロック（expected_version）を使用。

## エンドポイント
- **メソッド:** PUT
- **パス:** `/api/make-server-c253248c/my-profile`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| expected_version | number | ○ | 楽観的ロック用の現在のバージョン |
| display_name_override | string | - | 表示名（最大50文字） |
| job_title | string | - | 役職（最大50文字） |
| public_profile_json | object | - | 公開プロファイルJSON |
| visibility_scope | string | - | company, group, platform |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| company_member_id | string | メンバーID |
| version | number | 新しいバージョン |
| updated_at | string | 更新タイムスタンプ |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| VERSION_CONFLICT | 409 | expected_version の不一致 |

## 処理説明

1. 認証し、アクティブな company_member を取得する。
2. expected_version を検証し、更新オブジェクトを構築する。
3. バージョンチェック付きで company_member を更新する。
4. 更新された version, updated_at を返す。
