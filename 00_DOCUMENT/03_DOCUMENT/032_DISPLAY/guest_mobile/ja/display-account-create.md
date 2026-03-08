# ゲストモバイル: アカウント作成画面

## 画面概要
2ステップでアカウント作成。Step 1: 連絡先（メール or 電話）、Step 2: プロフィール情報。

## パス
`/account/create`

## 表示項目

### Step 1（contact）
| 項目 | 説明 |
|------|------|
| 戻る | / へ |
| "Create Account" | タイトル |
| "Step 1/2 • Grand Hotel" | サブタイトル |
| 説明文 | メールまたは電話番号で登録 |
| Email (Optional) | メール入力 |
| or | 区切り |
| Phone Number (Optional) | 電話番号入力 |
| Continue | 次へ |

### Step 2（profile）
| 項目 | 説明 |
|------|------|
| 戻る | Step 1 へ |
| "Step 2/2 • Grand Hotel" | サブタイトル |
| Display Name | 表示名 |
| Gender | 性別選択 |
| Birth Date | 生年月日 |
| Bio | 自己紹介 |
| Profile Visibility | public / staff-only / private |
| Complete | 完了 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| Continue | email または phone があれば Step 2 へ |
| Complete | /my-page へ遷移（現状はシミュレート） |
| 戻る | Step 2→1 または 1→トップ |

## 備考
- 現状は Supabase Auth 連携なし。将来は signUp / プロフィール API と連携予定。

## 遷移先
- `/` — Step 1 の戻る
- `/my-page` — 完了時
