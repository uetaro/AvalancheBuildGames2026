# Heartel 詳細設計書（MVP）
# Staff/Hotel（Company Web）ログイン（AUTH-01）※Supabase Auth 前提

- ドキュメントID: DD-OPS-AUTH-LOGIN
- 版数: v1.0
- 対象: MVP
- 作成日: 2026-02-28
- 対象画面: Company Web（staff / manager が利用する運用画面）
- 目的: チェックイン/チェックアウト等の運用操作を行うための認証・認可の入口を提供する

---

## 1. 概要

### 1.1 目的
Company Web（ホテル運用画面）の利用者（staff/manager）がログインし、認証済みユーザーとして運用API（Edge Functions）を実行できる状態にする。

### 1.2 MVPの完了条件
- Supabase Auth によるログインが成功し、`session`（access_token/refresh_token）が取得できる
- ログイン後、当該ユーザーが `company_member` 上で staff/manager として `active` である会社にアクセスできる
- 認可NG（所属なし/権限なし/停止中）をUIで判別して案内できる

---

## 2. スコープ

### 2.1 対象ロール
- staff / manager（Company Web）
- operator / employee / guest は本設計の対象外（別画面・別導線）

### 2.2 対象プラットフォーム
- Web（PCブラウザを想定）
- Supabase Auth を使用（Cognitoは使用しない）

---

## 3. 前提・方式

### 3.1 認証方式（MVP）
- Supabase Auth: Email + Password を採用（最短で実装）
- サインアップ（新規登録）はMVPでは提供しない（運営/管理者が事前作成）
- 2FA/OTP、SSO（SAML/OAuth）は対象外

### 3.2 セッション管理
- Supabase JS が `access_token` / `refresh_token` を管理（LocalStorage/Cookie等はフレームワーク設定に従う）
- `access_token` は Edge Function 呼び出し時に `Authorization: Bearer <token>` として付与される

### 3.3 認可の考え方（MVP）
- 認証（Supabase Auth）＝本人確認
- 認可（業務利用可否）＝ `company_member` による判定
  - userがstaff/managerとして所属し、かつ `member_status='active'` の会社が1つ以上あること
  - 会社が複数ある場合は「会社選択」画面/ドロップダウンで選ぶ（MVPは選択UIを置くか、1社前提でも可）

---

## 4. 画面仕様

### 4.1 画面一覧
- AUTH-01-UI: ログイン画面
- AUTH-01-POST: ログイン後チェック（所属/ロール判定）＋遷移制御

### 4.2 ログイン画面（AUTH-01-UI）

入力項目
- email（必須）
- password（必須）

UI要件（MVP）
- ログインボタン
- エラー表示領域（ユーザーに原因を明確に）
- パスワード表示切替（任意）
- 「パスワードを忘れた」リンク（MVPは非表示でも可。出すならSupabaseのreset導線へ）

バリデーション（クライアント）
- email形式チェック（簡易）
- password空チェック

### 4.3 ログイン後チェック（AUTH-01-POST）
ログイン成功後、以下を実施して遷移する
1) `company_member` を検索（`user_id = auth_user_id`）
2) `member_role in ('staff','manager')` かつ `member_status='active'` の所属があるか
3) 所属がない場合：エラー画面/ダイアログ（※ここは「ダイアログ」ではなくページ内メッセージでOK）で案内し、ログアウト or 再試行
4) 所属が1つの場合：その `company_id` を選択済みとして滞在一覧（W-01）へ遷移
5) 所属が複数の場合：会社選択へ遷移（MVPで省略するなら「最後に使った会社」を保存して自動選択）

---

## 5. データ設計（認可用）

### 5.1 利用テーブル
- `company_member`
  - `user_id`（Supabase auth uid）
  - `company_id`
  - `member_role`（staff/manager）
  - `member_status`（active/pending/ended）
- `company`
  - `company_name`（選択UI表示用）
  - `company_status`（active/suspended など）

### 5.2 判定ルール（MVP）
- `company_member.member_status='active'`
- `company_member.member_role in ('staff','manager')`
- `company.company_status='active'`（suspendedならログイン後に利用不可として案内）

---

## 6. クライアントI/F（Supabase Auth）

### 6.1 ログイン（Email/Password）
- `supabase.auth.signInWithPassword({ email, password })`

成功時
- `session.access_token` が取得できる
- `auth_user_id = session.user.id`

失敗時
- Supabase Auth エラー（invalid credentials等）を画面に表示

### 6.2 セッション復元（ページリロード対応）
- `supabase.auth.getSession()` でセッション確認
- 取得できる場合はログイン画面をスキップして AUTH-01-POST（所属チェック）へ

### 6.3 ログアウト（参考）
- `supabase.auth.signOut()`
- 端末に残るトークンを破棄

---

## 7. サーバサイドI/F（ログイン後の業務API利用）

### 7.1 Edge Function 呼び出し
- `Authorization: Bearer <access_token>` を必ず付与
- Edge Function 内で `auth.getUser()` によりトークン検証を行う

### 7.2 認可情報の伝搬
- **MVPでは** クライアントにroleを持たせず、サーバ側で `company_member` を引いて判定する
- クライアントは「選択した company_id」をリクエストに付与するだけ
  - 例：`ops-checkin` の `company_id`

---

## 8. フロー（シーケンス）

### 8.1 初回ログイン
1) ユーザーが email/password 入力 → ログイン
2) Auth成功 → `auth_user_id` 取得
3) `company_member` を検索 → staff/manager active が存在するか
4) 会社確定（単一 or 選択）→ W-01（滞在一覧）へ

### 8.2 セッションあり（再訪）
1) `getSession()` で session を復元
2) あれば所属チェック→W-01へ

### 8.3 認可NG
- 所属なし / pending / ended / company suspended
  - UIで「権限がありません」「管理者に連絡してください」等の案内
  - 必要ならログアウトを促す

---

## 9. エラー設計（画面表示）

### 9.1 ログイン失敗（Auth）
- 例：`INVALID_LOGIN_CREDENTIALS`
  - 表示：メール/パスワードが正しいか確認してください
  - 連続失敗時のロックはMVP外（Supabase側設定に依存）

### 9.2 所属なし（認可）
- `NO_MEMBERSHIP`
  - 表示：このアカウントはホテル運用権限がありません。管理者に連絡してください。

### 9.3 所属はあるが停止中
- `COMPANY_SUSPENDED`
  - 表示：このホテルは現在利用停止中です。管理者に連絡してください。

### 9.4 ネットワーク/予期せぬエラー
- `NETWORK_ERROR` / `INTERNAL_ERROR`
  - 表示：通信に失敗しました。時間をおいて再試行してください。

---

## 10. セキュリティ要件（MVP）

- ログイン後の操作はすべて `access_token` により認証する
- 業務API（Edge Functions）は必ず `auth.getUser()` でトークン検証する
- `company_id` はクライアントから渡されるが、サーバ側で `company_member` と突合して不正を防ぐ（IDOR対策）
- エラー文は過度に内部情報を出さない（存在有無等の推測を防ぐ）

---

## 11. 監査ログ（ログイン周辺）

MVPではログイン自体の監査ログは必須ではない（運用操作の監査が優先）。  
必要なら以下を `audit_log` に記録する（P1）。
- `action='LOGIN_SUCCESS'`（actor_user_idのみ）
- `action='LOGIN_FAILED'`（回数制御に利用する場合）

---

## 12. 実装方針（フロント）

### 12.1 ページ/ルーティング例
- `/login`：AUTH-01-UI
- `/select-company`：AUTH-01-POST（複数所属時）
- `/ops/stays`：W-01

### 12.2 ルートガード
- sessionなし → `/login`
- sessionあり → 所属チェック
  - OK → `/ops/stays`
  - NG → `/login?reason=no_membership` 等

---

## 13. テスト観点（MVP）

### 13.1 正常系
- 正しいemail/password → ログイン成功 → 所属チェックOK → W-01へ遷移

### 13.2 異常系
- パスワード誤り → ログイン失敗 → エラー表示
- staff/manager所属が存在しない → NO_MEMBERSHIP 表示
- 所属はあるが member_status != active → NO_MEMBERSHIP 表示（または専用文言）
- company_status = suspended → COMPANY_SUSPENDED 表示
- セッション切れ → API呼び出しで401 → ログインへ戻す

---

## 14. 付録：会社選択（複数所属時）の最小仕様（MVPオプション）

- `company_member` から active staff/manager の company_id を列挙
- `company` を join して `company_name` を表示
- 選択した `company_id` を local storage 等に保存し、以後のデフォルトにする
- 選択後 `/ops/stays` へ

---

## 15. Open Items（未決定）
- 認証方式（Email/Password以外）をいつ導入するか（OTP/SSO等）
- ログイン失敗のレート制限やアカウントロック方針
- 会社選択をMVPに含めるか（単一所属前提にするか）

---