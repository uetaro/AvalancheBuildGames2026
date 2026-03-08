# API: my-profile/avatar (POST)

## 概要
アバター画像をアップロードする。既存のアバターを置き換える。JPEG、PNG、WebP、GIF、最大5MB。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-c253248c/my-profile/avatar`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| avatar | file | ○ | 画像ファイル（multipart/form-data） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| avatar_url | string \| null | 署名付きURL |
| path | string | Storage パス |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| VALIDATION_ERROR | 400 | 無効なファイル形式またはサイズ > 5MB |

## 処理説明

1. 認証し、user_id を取得する。
2. ファイル形式（jpeg, png, webp, gif）、サイズ ≤ 5MB を検証する。
3. 既存のアバターファイルを削除する。
4. Storage にアップロード（userId/avatar.{ext}）。
5. 署名付きURLを作成し、avatar_url, path を返す。
