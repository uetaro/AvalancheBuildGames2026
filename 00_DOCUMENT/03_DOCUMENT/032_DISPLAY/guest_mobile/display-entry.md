# ゲストモバイル: 入室検証画面

## 画面概要
URLパラメータ（c=card_public_id, co=company_public_id）でカードを検証し、ゲストセッションを作成する。

## パス
`/entry`

## 表示項目

| 状態 | 項目 | 説明 |
|------|------|------|
| 検証中 | Kudosバッジ | アニメーション表示 |
| 検証中 | "Verifying your card…" | ローディング文言 |
| エラー時 | エラーアイコン | 赤色 |
| エラー時 | "Unable to Verify Card" | タイトル |
| エラー時 | エラーメッセージ | error_code に応じた文言 |
| エラー時 | Try Again | canRetry=true の場合のみ表示 |
| エラー時 | Back to Start | トップへ戻る |
| エラー時 | Error Code | canRetry=false の場合のみ表示 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| Try Again | public-entry-verify API を再実行 |
| Back to Start | / へ遷移 |

## 処理フロー
1. URL から c (card_public_id), co (company_public_id) を取得
2. public-entry-verify API を POST
3. 成功時: guest_session_token, stay_data, rules_snapshot, remaining_quota を localStorage に保存し /home へ遷移
4. 失敗時: エラー表示（error_code に応じたメッセージ）

## 遷移先
- `/home` — 成功時
- `/` — Back to Start 時
