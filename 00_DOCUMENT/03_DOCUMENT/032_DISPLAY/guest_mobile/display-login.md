# ゲストモバイル: ログイン / トップ画面

## 画面概要
ゲストアプリの入口。ゲストとして続行、ログイン、サインアップの選択を行う。

## パス
`/`

## 表示項目

| 項目 | 説明 |
|------|------|
| ロゴ | Heartel ロゴ |
| 会社名 | 前回滞在の company_name（localStorage から） |
| HEARTEL | ブランド表記 |
| デバッグトグル | Avalanche Test (Room 401) の ON/OFF |
| Continue as Guest | ゲストとして続行ボタン（ON時: デバッグURLへ遷移 / OFF時: NFCタップ案内） |
| Login | ログイン画面へ遷移 |
| Sign Up | アカウント作成画面へ遷移 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| Continue as Guest タップ | デバッグON時: /entry?c=...&co=... へ遷移。OFF時: NFCタップ待ち |
| Login タップ | /login へ遷移 |
| Sign Up タップ | /account/create へ遷移 |
| デバッグトグル | テスト用カードURLの有効/無効を切り替え |

## 遷移先
- `/entry` — ゲスト入室検証
- `/login` — ログイン
- `/account/create` — アカウント作成
