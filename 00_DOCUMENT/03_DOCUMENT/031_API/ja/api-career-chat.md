# API: career-chat

## 概要
AIキャリア相談。ステートレス、履歴なし。OpenAI gpt-4o-mini を使用。

## エンドポイント
- **メソッド:** POST
- **パス:** `/api/make-server-c253248c/career-chat`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |
| message | string | ○ | ユーザーメッセージ |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| reply | string | AI の返答 |

## 出力（エラー）

| error_code | HTTP | 説明 |
|------------|------|-------------|
| CONFIG_ERROR | 503 | OPENAI_API_KEY が未設定 |
| AI_ERROR | 502 | OpenAI API エラー |

## 処理説明

1. 認証する。
2. メッセージが空でないことを検証する。
3. OpenAI chat/completions を呼び出す（system: キャリアアドバイザー、user: message）。
4. reply を返す。
