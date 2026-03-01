````md id="a7v3yq"
# Heartel 詳細設計書（MVP）
# Guest：Kudos送信（G-04 / Send Kudos）※Guestは匿名・guest_session必須

- ドキュメントID: DD-GUEST-KUDOS-SEND
- 版数: v1.0
- 作成日: 2026-03-01
- 対象画面: Guest (Mobile Web) G-04 Kudos投稿 / G-05 投稿完了
- Backend: Supabase（Postgres + Edge Functions + RPC）
- 目的: ゲストが勤務中スタッフにKudosを送信し、（MVPでは）AI判定を付与した上で `pending` として記録する。確定はチェックアウト時（別設計）。

---

## 1. 概要

### 1.1 目的
ゲストが滞在中に勤務中スタッフを選択し、カテゴリ＋本文を入力してKudosを送る。  
送信されたKudosは **原則 pending** として保存し、チェックアウト時に confirmed/rejected を確定する。

### 1.2 MVP完了条件
- `guest_session_token` を持つゲストがKudosを作成できる
- “実滞在者のみ”を維持：対象滞在（stay）に紐づけて保存される
- 対象スタッフは「同一会社所属」「勤務中（on_duty active）」のみ許可
- 回数上限・クールダウン・期限（post-checkout window）をサーバで強制する
- 本文はオフチェーン（DB）に保持し、オンチェーンに載せない設計である
- モデレーション（最小）を実施し、`kudos_moderation` を作成する（MVPはルールベースでも可）

---

## 2. 前提・スコープ

### 2.1 Guestは匿名（Supabase Authなし）
- Guestは `guest_session_token`（DD-GUEST-ENTRY）でのみ認証する

### 2.2 対象滞在の決定
- クライアントから `stay_id` / `company_id` を受け取らない（IDOR対策）
- サーバが `guest_session -> stay_id -> stay.company_id` を確定する

### 2.3 対象外（MVP）
- 画像添付、複数スタッフ同時送信
- ゲストアカウント登録（別設計）
- 高度な言語フィルタ/翻訳

---

## 3. 画面仕様（G-04 / G-05）

### 3.1 入力（G-04）
- 送信先スタッフ（`receiver_company_member_id`）※スタッフ一覧で選択
- カテゴリ（`category`）
- 本文（`message_text`）

### 3.2 表示（G-04）
- 選択中スタッフ名
- 付与ポイント説明（`rules_snapshot.points_award`）
- 投稿制限の説明（残り回数、クールダウン、受付期限）

### 3.3 完了（G-05）
- 送信完了
- 残り回数
- 注意書き：「確定はチェックアウト時（pending → confirmed）」

---

## 4. API設計（Edge Function）

### 4.1 Endpoint
- Method: `POST`
- Path: `/functions/v1/public-kudos-send`
- Auth: `guest_session_token`（Bearer）

### 4.2 Headers
- `Authorization: Bearer <GUEST_SESSION_TOKEN>`
- `Content-Type: application/json`

### 4.3 Request Body
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| receiver_company_member_id | uuid | YES | 受領スタッフ（所属ID） |
| category | text | YES | Kudosカテゴリ |
| message_text | text | YES | 本文（オフチェーン） |
| client_request_id | text | NO | 相関ID |
| submitted_at | timestamptz | NO | 未指定は now()（基本はサーバ時刻優先） |

入力例:
```json
{
  "receiver_company_member_id": "0f08a7b1-2a7c-4b23-8d11-8a9c11c1a111",
  "category": "Hospitality",
  "message_text": "Thank you for your amazing support!",
  "client_request_id": "guest-kudos-20260301-0101"
}
````

### 4.4 Response（成功）

| 項目                | 型                | 説明               |
| ----------------- | ---------------- | ---------------- |
| kudos_id          | uuid             | 作成されたKudos       |
| kudos_status      | text             | `pending`（MVP原則） |
| remaining_quota   | int              | 残り回数             |
| cooldown_sec      | int              | クールダウン秒（ルール）     |
| next_available_at | timestamptz/null | 次に送れる時刻（計算できるなら） |

成功例:

```json id="xv3b3e"
{
  "kudos_id": "5b1c1d1a-aaaa-bbbb-cccc-111122223333",
  "kudos_status": "pending",
  "remaining_quota": 1,
  "cooldown_sec": 600,
  "next_available_at": "2026-03-01T13:10:00+09:00"
}
```

---

## 5. 認証（guest_session_token）

### 5.1 検証

* token を sha256 等でハッシュ化し、`guest_session.session_token_hash` と照合する
* 条件:

  * `expires_at > now()`
  * `revoked_at is null`
* NGは 401

---

## 6. 対象コンテキストの確定（必須）

サーバ側で確定する値

* `stay_id`：`guest_session.stay_id`
* `company_id`：`stay.company_id`
* `rules_snapshot`：`stay.rules_snapshot`
* `checkout_at`：`stay.checkout_at`（closed時に必要）
* `stay_status`：`active/closed`

クライアント入力は「送信先スタッフ」「カテゴリ」「本文」のみ。

---

## 7. バリデーション（業務ルール：必須）

### 7.1 送信先スタッフの妥当性

* `company_member.company_member_id = receiver_company_member_id`
* `company_member.company_id = stay.company_id`（同じ会社）
* `company_member.member_status = 'active'`
* 対象ロール（MVP推奨）

  * `company_member.member_role = 'employee'` のみ許可（必要なら staff/manager も許可）

### 7.2 勤務中であること（必須）

* `on_duty_session` に以下が存在

  * `company_id = stay.company_id`
  * `company_member_id = receiver_company_member_id`
  * `duty_status='active'`

※これにより “勤務中のみ一覧に出す” と同じ制約をサーバで再強制する。

### 7.3 回数上限（必須）

* `quota = stay.rules_snapshot.kudos_quota`
* `used = count(kudos) where stay_id=stay_id and kudos_status in ('pending','confirmed')`
* `used < quota` であること（満たさない場合 409 `QUOTA_EXCEEDED`）

### 7.4 クールダウン（必須）

* `cooldown_sec = stay.rules_snapshot.cooldown_sec`
* `last = max(kudos.created_at) where stay_id=stay_id and kudos_status in ('pending','confirmed')`
* `now() >= last + cooldown_sec` を満たすこと（満たさない場合 409 `COOLDOWN_ACTIVE`）
* `next_available_at = last + cooldown_sec` を返す

### 7.5 受付期限（必須）

* `stay_status='active'` の場合：OK（滞在中）
* `stay_status='closed'` の場合：

  * `deadline = stay.checkout_at + stay.rules_snapshot.post_checkout_window_sec`
  * `now() <= deadline` を満たすこと（満たさない場合 409 `POST_CHECKOUT_WINDOW_EXPIRED`）

---

## 8. データ作成（kudos / kudos_moderation）

### 8.1 kudos（作成）

* `kudos_status`：原則 `pending`
* `points_awarded`：`stay.rules_snapshot.points_award`
* `message_text`：本文（オンチェーンに載せない）
* `guest_session_id`：追跡用に保存（任意だが推奨）
* `message_is_masked`：default false

### 8.2 kudos_moderation（作成 / MVP）

MVPは「簡易ルールベース」でOK。例：

* NGワード含む → `moderation_decision='block'`
* それ以外 → `moderation_decision='allow'`

（将来）外部AI APIで判定してもよいが、ハッカソンMVPでは実装負荷が高い場合がある。

設計上の扱い

* `block` の場合でも `kudos` は作る（kudos_statusはpendingのままでも良いが、MVPでは即 `rejected` に落とす運用も可能）
* 本提案（MVP推奨）：

  * `block` の場合：`kudos_status='rejected'` に即時遷移（チェックアウト確定対象から除外）
  * `allow/review`：`pending` のまま（チェックアウトで確定）

---

## 9. DB更新方式（RPC推奨：トランザクション必須）

Kudos送信は検証が多く競合も起きやすい（連打/複数端末）ため、RPCでまとめる。

### 9.1 RPC名

* `public_create_kudos`

### 9.2 引数（案）

| 引数                           | 型           | 必須  | 説明                 |
| ---------------------------- | ----------- | --- | ------------------ |
| p_guest_session_id           | uuid        | YES | guest_sessionの内部ID |
| p_receiver_company_member_id | uuid        | YES | 受領者                |
| p_category                   | text        | YES | カテゴリ               |
| p_message_text               | text        | YES | 本文                 |
| p_submitted_at               | timestamptz | NO  | nullならnow          |

戻り値

* `kudos_id uuid`
* `kudos_status text`
* `remaining_quota int`
* `cooldown_sec int`
* `next_available_at timestamptz`

### 9.3 排他（推奨）

* `stay` を `FOR UPDATE`（quota計算/期限チェックの整合）
* `kudos` のカウント対象条件が競合するので、必要なら `kudos` の挿入を制約で補助する（MVPではロックで十分）

---

## 10. エラー設計

エラー形式:

```json id="2o9h7z"
{
  "error_code": "QUOTA_EXCEEDED",
  "message": "Kudos quota exceeded for this stay.",
  "details": { "remaining_quota": 0 }
}
```

| HTTP | error_code                   | 条件                      |
| ---- | ---------------------------- | ----------------------- |
| 401  | UNAUTHORIZED                 | guest_session不正         |
| 401  | GUEST_SESSION_EXPIRED        | expires_at <= now       |
| 409  | QUOTA_EXCEEDED               | 回数上限超過                  |
| 409  | COOLDOWN_ACTIVE              | クールダウン中                 |
| 409  | POST_CHECKOUT_WINDOW_EXPIRED | checkout後受付期限切れ         |
| 404  | RECEIVER_NOT_FOUND           | 受領者が存在しない/自社でない         |
| 409  | RECEIVER_NOT_ON_DUTY         | 勤務中ではない                 |
| 400  | VALIDATION_ERROR             | category/message欠落、長さ不正 |
| 500  | INTERNAL_ERROR               | 予期しない例外                 |

---

## 11. インデックス（推奨）

* `kudos(stay_id, created_at desc)`
* `kudos(stay_id, kudos_status)`
* `on_duty_session(company_id, company_member_id) where duty_status='active'`
* `guest_session(session_token_hash)` unique
* `stay(stay_id)` PK

---

## 12. RPC SQL雛形（MVP）

前提:

* `pgcrypto`（gen_random_uuid）
* `stay.rules_snapshot` に `kudos_quota/cooldown_sec/post_checkout_window_sec/points_award` がある
* `kudos_status` の値は `pending/confirmed/rejected`

```sql id="wq1v6m"
create or replace function public_create_kudos(
  p_guest_session_id uuid,
  p_receiver_company_member_id uuid,
  p_category text,
  p_message_text text,
  p_submitted_at timestamptz default null
)
returns table (
  kudos_id uuid,
  kudos_status text,
  remaining_quota int,
  cooldown_sec int,
  next_available_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := coalesce(p_submitted_at, now());
  v_stay_id uuid;
  v_company_id uuid;
  v_stay_status text;
  v_checkout_at timestamptz;
  v_rules jsonb;

  v_quota int;
  v_cooldown int;
  v_post_window int;
  v_points int;

  v_used int;
  v_last_at timestamptz;
  v_deadline timestamptz;

  v_receiver_company_id uuid;
  v_receiver_status text;
  v_receiver_role text;

  v_on_duty_exists boolean;
  v_decision text := 'allow';
begin
  -- 0) basic validation
  if p_category is null or length(trim(p_category)) = 0 then
    raise exception 'VALIDATION_ERROR: category' using errcode='P0001';
  end if;
  if p_message_text is null or length(trim(p_message_text)) = 0 then
    raise exception 'VALIDATION_ERROR: message' using errcode='P0001';
  end if;
  if length(p_message_text) > 500 then
    raise exception 'VALIDATION_ERROR: message too long' using errcode='P0001';
  end if;

  -- 1) resolve stay from guest_session (and lock stay for consistency)
  select s.stay_id, s.company_id, s.stay_status, s.checkout_at, s.rules_snapshot
    into v_stay_id, v_company_id, v_stay_status, v_checkout_at, v_rules
  from guest_session gs
  join stay s on s.stay_id = gs.stay_id
  where gs.guest_session_id = p_guest_session_id
    and gs.revoked_at is null
    and gs.expires_at > now()
  for update;

  if not found then
    raise exception 'UNAUTHORIZED: invalid guest_session' using errcode='P0001';
  end if;

  -- 2) rules
  v_quota := coalesce((v_rules->>'kudos_quota')::int, 0);
  v_cooldown := coalesce((v_rules->>'cooldown_sec')::int, 0);
  v_post_window := coalesce((v_rules->>'post_checkout_window_sec')::int, 0);
  v_points := coalesce((v_rules->>'points_award')::int, 0);

  -- 3) post-checkout window check
  if v_stay_status = 'closed' then
    if v_checkout_at is null then
      raise exception 'INTERNAL_ERROR: closed stay missing checkout_at' using errcode='P0001';
    end if;
    v_deadline := v_checkout_at + make_interval(secs => v_post_window);
    if v_now > v_deadline then
      raise exception 'POST_CHECKOUT_WINDOW_EXPIRED' using errcode='P0001';
    end if;
  end if;

  -- 4) receiver validation (same company, active, role)
  select cm.company_id, cm.member_status, cm.member_role
    into v_receiver_company_id, v_receiver_status, v_receiver_role
  from company_member cm
  where cm.company_member_id = p_receiver_company_member_id
  limit 1;

  if not found then
    raise exception 'RECEIVER_NOT_FOUND' using errcode='P0001';
  end if;

  if v_receiver_company_id <> v_company_id then
    raise exception 'RECEIVER_NOT_FOUND' using errcode='P0001';
  end if;

  if v_receiver_status <> 'active' then
    raise exception 'RECEIVER_NOT_FOUND' using errcode='P0001';
  end if;

  if v_receiver_role <> 'employee' then
    raise exception 'RECEIVER_NOT_FOUND' using errcode='P0001';
  end if;

  -- 5) on-duty validation
  select exists (
    select 1
    from on_duty_session ods
    where ods.company_id = v_company_id
      and ods.company_member_id = p_receiver_company_member_id
      and ods.duty_status = 'active'
  ) into v_on_duty_exists;

  if v_on_duty_exists is distinct from true then
    raise exception 'RECEIVER_NOT_ON_DUTY' using errcode='P0001';
  end if;

  -- 6) quota check (pending+confirmed count)
  select count(*) into v_used
  from kudos k
  where k.stay_id = v_stay_id
    and k.kudos_status in ('pending','confirmed');

  remaining_quota := greatest(0, v_quota - v_used);
  if v_used >= v_quota then
    raise exception 'QUOTA_EXCEEDED' using errcode='P0001';
  end if;

  -- 7) cooldown check
  select max(k.created_at) into v_last_at
  from kudos k
  where k.stay_id = v_stay_id
    and k.kudos_status in ('pending','confirmed');

  cooldown_sec := v_cooldown;

  if v_last_at is not null then
    next_available_at := v_last_at + make_interval(secs => v_cooldown);
    if v_now < next_available_at then
      raise exception 'COOLDOWN_ACTIVE' using errcode='P0001';
    end if;
  else
    next_available_at := null;
  end if;

  -- 8) minimal moderation (MVP placeholder)
  -- Example: if message contains banned patterns, block
  if position('http://' in lower(p_message_text)) > 0 or position('https://' in lower(p_message_text)) > 0 then
    v_decision := 'review';
  end if;

  -- 9) insert kudos (default pending)
  insert into kudos (
    kudos_id,
    company_id,
    stay_id,
    receiver_company_member_id,
    category,
    message_text,
    message_is_masked,
    kudos_status,
    points_awarded,
    guest_session_id,
    version,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_company_id,
    v_stay_id,
    p_receiver_company_member_id,
    p_category,
    p_message_text,
    false,
    'pending',
    v_points,
    p_guest_session_id,
    1,
    v_now,
    v_now
  )
  returning kudos.kudos_id, kudos.kudos_status
  into kudos_id, kudos_status;

  -- 10) insert moderation
  insert into kudos_moderation (
    kudos_moderation_id,
    kudos_id,
    moderation_decision,
    reason_codes,
    score_json,
    model_name,
    reviewed_by_user_id,
    reviewed_at,
    version,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    kudos_id,
    v_decision,
    null,
    null,
    'mvp-rule',
    null,
    null,
    1,
    now(),
    now()
  );

  -- 11) remaining quota after insert
  remaining_quota := greatest(0, v_quota - (v_used + 1));
  return;
end;
$$;
```

---

## 13. Edge Function 実装仕様（要点）

### 13.1 処理フロー

1. `guest_session_token` をsha256 → `guest_session` を特定（expires/revokedチェック）
2. RPC `public_create_kudos` を呼ぶ（引数: guest_session_id + body）
3. 成功レスポンス整形（kudos_id, remaining_quota 等）
4. エラーを error_code にマップ

### 13.2 エラー・HTTPマップ（例）

* `QUOTA_EXCEEDED` → 409
* `COOLDOWN_ACTIVE` → 409（next_available_atをdetailsに入れるのは追加実装）
* `RECEIVER_NOT_ON_DUTY` → 409
* `UNAUTHORIZED` → 401
* `POST_CHECKOUT_WINDOW_EXPIRED` → 409

---

## 14. Open Items（次に詰めると良い）

* カテゴリを固定リストにするか（enum/別テーブル）
* moderationを `block` のとき即 `kudos_status='rejected'` に落とすか（今はpendingのまま）
* 連投対策（IPレート制限、guest_session端末バインド）
* message_textのPII対策（電話/メール/住所等の検出→mask/review）

---

```
```
