# スタッフモバイル: ログイン画面

## 画面概要
メール/パスワードでログイン、またはサインアップ。セッションがあれば /app へリダイレクト。

## パス
`/`

## 表示項目

| 項目 | 説明 |
|------|------|
| ロゴ | Heartel ロゴ |
| メール入力 | email |
| パスワード入力 | password |
| ログインボタン | mode=login 時 |
| サインアップボタン | mode=signup 時 |
| モード切替 | Login / Sign Up リンク |
| エラーメッセージ | 認証失敗時 |
| ローディング | 処理中 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| ログイン | signInWithPassword → 成功時 /app へ |
| サインアップ | signup API (POST) → 成功時 /app へ |
| モード切替 | login ⇔ signup |

## API
- Supabase Auth: signInWithPassword
- POST signup（serverUrl）

## 遷移先
- `/app` — ログイン/サインアップ成功時、または既存セッション時
