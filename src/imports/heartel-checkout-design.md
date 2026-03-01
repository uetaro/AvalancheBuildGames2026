````md id="4k90w2"
# Heartel 詳細設計書（MVP）
# チェックアウト（W-03 / Company Web）※Supabase Auth 前提

- ドキュメントID: DD-OPS-CHECKOUT
- 版数: v1.0
- 対象: MVP
- 作成日: 2026-02-28
- 対象画面: W-01 滞在一覧・運用（主画面内でチェックアウト）
- 目的: 滞在をクローズし、当該滞在に紐づくKudosを確定（confirmed/rejected）し、オンチェーン受領証（chain_receipt）を発行キューへ積む

---

## 1. 概要

### 1.1 目的
Company Web（staff/manager）がチェックアウトを実行すると、対象 `stay` を `closed` にし、滞在中に投稿されたKudos（`kudos.stay_id=stay_id`）を確定させる。

確定の結果として、確定Kudosに対してオンチェーン受領証（`chain_receipt`）の作成（status=queued）を行い、後続のアンカー書き込み処理（非同期）へ引き渡す。

### 1.2 MVPの完了条件
- `stay_status` が `active` → `closed` に遷移する
- 対象stay配下の `kudos` が `pending` → `confirmed`（または `rejected`）へ遷移する
- confirmedになったKudosごとに `chain_receipt` が作成され `receipt_status='queued'` となる
- `audit_log` に CHECKOUT が記録される

---

## 2. スコープ

### 2.1 対象ロール
- staff / manager（Company Web）
  - `company_member.member_role in ('staff','manager')`
  - `company_member.member_status='active'`

### 2.2 対象画面
- W-01 滞在一覧・運用（主画面）
  - 対象滞在の詳細/行アクションからチェックアウト実行
※ダイアログ非使用。主画面内の「確認パネル」または「行内ボタン＋確認テキスト」で実施。

### 2.3 対象外（MVP）
- チェックアウト時にKudos個別承認/却下をUIで操作する（将来）
- 返金/取消などの巻き戻しフロー（将来）
- オンチェーン書き込みの同期実行（MVPは queued まで）

---

## 3. 状態遷移

### 3.1 stay
- `stay_status: active -> closed`
- `checkout_at` をセット
- `closed_by_company_member_id` をセット

### 3.2 kudos（対象stay配下）
- `kudos_status: pending -> confirmed`（基本）
- ただし以下は `rejected` にする（MVPルール）
  - `kudos_moderation.moderation_decision='block'` のもの
  - （任意）チェックアウト時点で受付期限外のもの（通常は投稿時に弾く想定なのでMVPでは不要）

### 3.3 chain_receipt（confirmed分のみ作成）
- 作成時:
  - `receipt_status='queued'`
  - `anchor_hash` は **後続ジョブで計算しても良い** が、MVPは作成時に計算して格納しても良い
  - `points_awarded` を格納（`kudos.points_awarded` と一致させる）

---

## 4. I/F設計（Edge Function）

### 4.1 Endpoint
- Method: `POST`
- Path: `/functions/v1/ops-checkout`

### 4.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
- `Content-Type: application/json`

### 4.3 Request Body（入力）
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| company_id | uuid | YES | 操作対象会社 |
| stay_id | uuid | YES | チェックアウト対象滞在 |
| checkout_at | timestamptz | NO | 未指定は now() |
| client_request_id | text | NO | ログ相関用 |

入力例:
```json
{
  "company_id": "7bb7d2d4-2bb2-4bf0-a5e1-8c4f4e6e2f8d",
  "stay_id": "4a2b7a9b-7b07-4a06-9c7c-9fb3c2f8a92d",
  "checkout_at": "2026-02-28T15:00:00+09:00",
  "client_request_id": "ui-req-20260228-000456"
}
````

### 4.4 Response（出力）

| 項目          | 型           | 説明         |
| ----------- | ----------- | ---------- |
| stay_id     | uuid        | 滞在ID       |
| stay_status | text        | `"closed"` |
| checkout_at | timestamptz | チェックアウト日時  |
| finalized   | object      | 確定結果サマリ    |

finalized:

* `confirmed_count`（int）
* `rejected_count`（int）
* `queued_receipt_count`（int）

出力例:

```json
{
  "stay_id": "4a2b7a9b-7b07-4a06-9c7c-9fb3c2f8a92d",
  "stay_status": "closed",
  "checkout_at": "2026-02-28T15:00:00+09:00",
  "finalized": {
    "confirmed_count": 3,
    "rejected_count": 1,
    "queued_receipt_count": 3
  }
}
```

---

## 5. 認証・認可（Edge Function内）

### 5.1 認証

* `auth.getUser()` でトークン検証し `auth_user_id` を取得できる
* 失敗は 401

### 5.2 認可

以下を満たす `company_member` が存在する（満たさない場合 403）

* `company_id = request.company_id`
* `user_id = auth_user_id`
* `member_role in ('staff','manager')`
* `member_status='active'`

---

## 6. バリデーション（業務ルール）

### 6.1 stayの妥当性

* `stay.company_id = company_id`
* `stay.stay_status = 'active'`（すでにclosedなら409）
* `checkout_at >= checkin_at`（整合性）

### 6.2 二重チェックアウト防止

* すでに `stay_status='closed'` の場合は 409（`CONFLICT_ALREADY_CLOSED`）

---

## 7. DB更新方式（RPC）

チェックアウトは複数テーブル更新＋集計があるため、**RPCでトランザクション**を必須とする。

### 7.1 RPC名

* `ops_checkout`

### 7.2 引数

| 引数                        | 型           | 必須  | 説明        |
| ------------------------- | ----------- | --- | --------- |
| p_company_id              | uuid        | YES | 会社ID      |
| p_stay_id                 | uuid        | YES | 滞在ID      |
| p_actor_company_member_id | uuid        | YES | 操作者所属ID   |
| p_checkout_at             | timestamptz | NO  | nullならnow |

### 7.3 戻り値

* `stay_id uuid`
* `checkout_at timestamptz`
* `confirmed_count int`
* `rejected_count int`
* `queued_receipt_count int`

---

## 8. チェックアウト時のKudos確定ルール（MVP）

### 8.1 確定対象

* `kudos.stay_id = stay_id` かつ `kudos_status='pending'` のもの

### 8.2 rejected に落とす条件（MVP）

* `kudos_moderation.moderation_decision='block'` が存在する kudos

  * moderationレコードが存在しない場合は `allow` 相当（MVPでは許容）

### 8.3 confirmed にする条件（MVP）

* 上記 blocked を除いた pending kudos は confirmed にする

---

## 9. chain_receipt 作成ルール（MVP）

### 9.1 作成対象

* `confirmed` になった kudos のみ

### 9.2 作成内容

* `chain_receipt.kudos_id = kudos_id`（unique）
* `receipt_status='queued'`
* `chain_name` は固定値（例: `Avalanche C-Chain`）
* `points_awarded` は `kudos.points_awarded` をコピー
* `anchor_hash` は以下どちらか

  * A) RPC内で計算して保存（MVPで一気通貫にしたい場合）
  * B) queuedジョブ側で計算して update（より現実的だが設計が増える）

MVP推奨: A（RPC内計算）
理由: 後段ジョブは「チェーン書き込み」に集中でき、proof照合も早期に整う。

---

## 10. 排他・競合設計

### 10.1 想定競合

* 同一stayを複数端末で同時にcheckout
* checkout中にkudos投稿が入る（タイミング競合）

### 10.2 対策（RPC）

* `stay` を `SELECT ... FOR UPDATE` でロック
* kudos確定は `kudos` を対象条件で `UPDATE ... WHERE ...` し、checkout後に投稿されるものは原則投稿API側で受付期限/状態で弾く
* DB制約（推奨）

  * `stay` の closed は一方向（アプリ層で保証）
  * `chain_receipt` は `unique(kudos_id)`（重複作成防止）

---

## 11. 監査ログ（audit_log）

### 11.1 記録内容（CHECKOUT）

* `action='CHECKOUT'`
* `target_table='stay'`
* `target_id=stay_id`
* `actor_company_member_id=操作者`
* `company_id=対象会社`
* `detail_json`：

  * `checkout_at`
  * `confirmed_count/rejected_count`
  * （任意）`queued_receipt_count`

---

## 12. エラー設計

レスポンス形式:

```json
{
  "error_code": "CONFLICT_ALREADY_CLOSED",
  "message": "Stay already closed.",
  "details": { "stay_id": "..." }
}
```

| HTTP | error_code               | 条件                                 |
| ---- | ------------------------ | ---------------------------------- |
| 401  | UNAUTHORIZED             | トークン不正                             |
| 403  | FORBIDDEN                | 所属/権限なし                            |
| 400  | VALIDATION_ERROR         | 必須項目欠落、形式不正、checkout_at<checkin_at |
| 404  | NOT_FOUND                | stayが存在しない（companyスコープ内で）          |
| 409  | CONFLICT_ALREADY_CLOSED  | stayがすでにclosed                     |
| 409  | CONFLICT_STAY_NOT_ACTIVE | stay_statusがactiveでない              |
| 500  | INTERNAL_ERROR           | 予期しない例外                            |

※404/403の出し分けは情報漏えい防止の観点で統一してもよい（MVPでは404に寄せるのが無難）。

---

## 13. インデックス/制約（推奨）

* `stay(company_id, stay_status)`（滞在検索）
* `kudos(stay_id, kudos_status)`（確定対象抽出）
* `kudos_moderation(kudos_id)`（join）
* `chain_receipt(kudos_id)` unique（既存）

---

## 14. RPC（SQL雛形 / MVP）

### 14.1 前提

* `gen_random_uuid()` 利用
* `security definer`
* エラーは `raise exception` でシンプルにし、Edge Function で `error_code` にマッピングする（MVP）

### 14.2 ops_checkout（RPC）SQL雛形

```sql id="8w6v0g"
create or replace function ops_checkout(
  p_company_id uuid,
  p_stay_id uuid,
  p_actor_company_member_id uuid,
  p_checkout_at timestamptz default null
)
returns table (
  stay_id uuid,
  checkout_at timestamptz,
  confirmed_count int,
  rejected_count int,
  queued_receipt_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := coalesce(p_checkout_at, now());
  v_checkin_at timestamptz;
  v_stay_status text;
  v_rules jsonb;
  v_chain_name text := 'Avalanche C-Chain';
begin
  -- 1) lock stay
  select s.checkin_at, s.stay_status, s.rules_snapshot
    into v_checkin_at, v_stay_status, v_rules
  from stay s
  where s.stay_id = p_stay_id
    and s.company_id = p_company_id
  for update;

  if not found then
    raise exception 'NOT_FOUND: stay' using errcode = 'P0001';
  end if;

  if v_stay_status <> 'active' then
    if v_stay_status = 'closed' then
      raise exception 'CONFLICT_ALREADY_CLOSED' using errcode = 'P0001';
    end if;
    raise exception 'CONFLICT_STAY_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  if v_now < v_checkin_at then
    raise exception 'VALIDATION_ERROR: checkout_at < checkin_at' using errcode = 'P0001';
  end if;

  -- 2) close stay
  update stay
  set stay_status = 'closed',
      checkout_at = v_now,
      closed_by_company_member_id = p_actor_company_member_id,
      version = version + 1,
      updated_at = now()
  where stay_id = p_stay_id;

  -- 3) reject blocked kudos (pending only)
  update kudos k
  set kudos_status = 'rejected',
      rejected_at = now(),
      version = version + 1,
      updated_at = now()
  from kudos_moderation m
  where k.kudos_id = m.kudos_id
    and k.stay_id = p_stay_id
    and k.kudos_status = 'pending'
    and m.moderation_decision = 'block';

  get diagnostics rejected_count = row_count;

  -- 4) confirm remaining pending kudos
  update kudos k
  set kudos_status = 'confirmed',
      confirmed_at = now(),
      version = version + 1,
      updated_at = now()
  where k.stay_id = p_stay_id
    and k.kudos_status = 'pending';

  get diagnostics confirmed_count = row_count;

  -- 5) create chain_receipt for confirmed kudos (idempotent via unique(kudos_id))
  -- anchor_hash (MVP): hash over stable fields WITHOUT message/PII
  insert into chain_receipt (
    chain_receipt_id,
    kudos_id,
    chain_name,
    anchor_hash,
    tx_hash,
    points_awarded,
    receipt_status,
    submitted_at,
    confirmed_at,
    fail_reason,
    version,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    k.kudos_id,
    v_chain_name,
    encode(digest(
      concat_ws(':',
        k.kudos_id::text,
        k.company_id::text,
        k.stay_id::text,
        k.receiver_company_member_id::text,
        k.category,
        k.points_awarded::text,
        date_trunc('second', k.created_at)::text
      )::bytea,
      'sha256'
    ), 'hex') as anchor_hash,
    null,
    k.points_awarded,
    'queued',
    null,
    null,
    null,
    1,
    now(),
    now()
  from kudos k
  where k.stay_id = p_stay_id
    and k.kudos_status = 'confirmed'
  on conflict (kudos_id) do nothing;

  get diagnostics queued_receipt_count = row_count;

  -- 6) audit log
  insert into audit_log (
    audit_log_id,
    actor_company_member_id,
    company_id,
    action,
    target_table,
    target_id,
    detail_json,
    version,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    p_actor_company_member_id,
    p_company_id,
    'CHECKOUT',
    'stay',
    p_stay_id,
    jsonb_build_object(
      'checkout_at', v_now,
      'confirmed_count', confirmed_count,
      'rejected_count', rejected_count,
      'queued_receipt_count', queued_receipt_count
    ),
    1,
    now(),
    now()
  );

  stay_id := p_stay_id;
  checkout_at := v_now;
  return;
end;
$$;
```

> 注意:
>
> * `digest` を使うため `pgcrypto` 拡張が必要（Supabaseは一般に有効化可能）。
> * anchor_hash に `message_text` は含めない（要件どおり）。
> * `created_at` を hash に含める場合は `date_trunc('second', ...)` 等で安定化させる（クライアント差分回避）。

---

## 15. Edge Function 実装仕様（擬似コード）

### 15.1 Edge Functionの責務

* Supabase Authでユーザー特定（`auth.getUser()`）
* `company_member` による認可（staff/manager）
* RPC `ops_checkout` の呼び出し
* DB例外を `error_code` に変換しHTTPで返却
* `client_request_id` による相関ログ

### 15.2 擬似コード（TypeScript/Deno）

```ts id="f5r9zb"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return json(401, err("UNAUTHORIZED", "Missing token"));

    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) return json(401, err("UNAUTHORIZED", "Invalid token"));

    const authUserId = userData.user.id;

    const body = await req.json().catch(() => null);
    const { company_id, stay_id, checkout_at, client_request_id } = body ?? {};
    if (!company_id || !stay_id) return json(400, err("VALIDATION_ERROR", "Missing fields", { client_request_id }));

    const supabaseSvc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: member } = await supabaseSvc
      .from("company_member")
      .select("company_member_id, member_role, member_status")
      .eq("company_id", company_id)
      .eq("user_id", authUserId)
      .maybeSingle();

    if (!member) return json(403, err("FORBIDDEN", "No membership", { client_request_id }));
    if (!["staff","manager"].includes(member.member_role) || member.member_status !== "active") {
      return json(403, err("FORBIDDEN", "Insufficient role", { client_request_id }));
    }

    const { data: rpcData, error: rpcErr } = await supabaseSvc.rpc("ops_checkout", {
      p_company_id: company_id,
      p_stay_id: stay_id,
      p_actor_company_member_id: member.company_member_id,
      p_checkout_at: checkout_at ?? null
    });

    if (rpcErr) {
      const mapped = mapRpcError(rpcErr.message ?? "");
      return json(mapped.http, err(mapped.error_code, mapped.message, { client_request_id }));
    }

    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return json(200, {
      stay_id: result.stay_id,
      stay_status: "closed",
      checkout_at: result.checkout_at,
      finalized: {
        confirmed_count: result.confirmed_count,
        rejected_count: result.rejected_count,
        queued_receipt_count: result.queued_receipt_count
      }
    });

  } catch (_e) {
    return json(500, err("INTERNAL_ERROR", "Unexpected error"));
  }
});

function mapRpcError(msg: string) {
  if (msg.includes("CONFLICT_ALREADY_CLOSED")) return { http: 409, error_code: "CONFLICT_ALREADY_CLOSED", message: "Stay already closed." };
  if (msg.includes("CONFLICT_STAY_NOT_ACTIVE")) return { http: 409, error_code: "CONFLICT_STAY_NOT_ACTIVE", message: "Stay is not active." };
  if (msg.includes("NOT_FOUND")) return { http: 404, error_code: "NOT_FOUND", message: "Stay not found." };
  if (msg.includes("VALIDATION_ERROR")) return { http: 400, error_code: "VALIDATION_ERROR", message: "Validation error." };
  return { http: 500, error_code: "INTERNAL_ERROR", message: "Internal error." };
}

function err(error_code: string, message: string, details: any = undefined) {
  return { error_code, message, details };
}
function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

---

## 16. インデックス/制約（推奨）

* `stay(stay_id)`（PK）
* `stay(company_id, stay_status)`（一覧用）
* `kudos(stay_id, kudos_status)`（確定対象抽出）
* `kudos_moderation(kudos_id)`（join）
* `chain_receipt(kudos_id)` unique（重複作成防止）

（既存）チェックイン側で定義した `ux_stay_active_room / ux_stay_active_card` も前提。

---

## 17. テスト観点（MVP）

### 17.1 正常系

* active stay を checkout → stayがclosed、pending kudosがconfirmed/rejected、chain_receiptがqueued作成、audit_logが残る

### 17.2 異常系

* すでにclosedのstayをcheckout → 409（CONFLICT_ALREADY_CLOSED）
* company違いのstay_idを指定 → 404（または403で統一）
* staff権限なし（employee）→ 403
* checkout_at が checkin_at より前 → 400（VALIDATION_ERROR）
* checkout中に二重実行 → 片方成功、片方409

---

```
```
