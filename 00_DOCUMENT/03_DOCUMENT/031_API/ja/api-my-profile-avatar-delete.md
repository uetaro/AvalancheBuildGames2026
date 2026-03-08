# API: my-profile/avatar (DELETE)

## 概要
アバター画像を削除する。

## エンドポイント
- **メソッド:** DELETE
- **パス:** `/api/make-server-c253248c/my-profile/avatar`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| success | boolean | true |

## 処理説明

1. 認証し、user_id を取得する。
2. Storage 内のアバターファイルを一覧する。
3. アバターファイルを削除する。
4. success を返す。
