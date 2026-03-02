````md
# Heartel 詳細設計書（MVP）
# チェックイン（W-02 / Company Web）※Supabase Auth 前提

- ドキュメントID: DD-OPS-CHECKIN
- 版数: v1.3
- 対象: MVP
- 作成日: 2026-02-28
- Backend: Supabase（Auth + Postgres + Edge Functions + RPC）
- 関連画面: W-01（滞在一覧・運用）/ W-02（チェックイン）

---

## 1. 概要

### 1.1 目的
Company Web（staff/manager）がチェックイン操作を行うことで `stay`（滞在）レコードを作成し、当該滞在に適用されるルール（Kudos回数上限、クールダウン、checkout後受付期限、付与ポイント等）を `stay.rules_snapshot` として確定・固定する。

以後、ゲストがカードタップ（NFC/QR）した際に当該 `stay` を参照できる状態を作る。

### 1.2 MVPの完了条件（この機能で満たすべきこと）
- チェックインで `stay` が1件作成され `stay_status='active'` になる
- 同一 `room_id` / 同一 `card_id` に active stay が同時に存在しない（競合防止）
- `rules_snapshot` が stay に保存される（後続の投稿制御で参照できる）
- 監査ログ（`audit_log`）に CHECKIN が記録される

---

## 2. スコープ

### 2.1 対象ロール
- Company Web: staff / manager
  - `company_member.member_role in ('staff','manager')`
  - `company_member.member_status = 'active'`

### 2.2 対象画面
- W-01 滞在一覧・運用（主画面）
  - W-02 チェックイン（同画面内のパネル/フォーム）
※モーダル/ダイアログは使用しない（主画面内で完結）。

### 2.3 対象外（MVPではやらない）
- 予約データとの統合
- チェックイン時の本人確認（顔認証等）
- 会社別ルール管理UI（rules_snapshotを固定値から拡張するのは将来）

---

## 3. 前提・方式（Supabase構成）

### 3.1 認証
- 認証は Supabase Auth を使用する
- Company Web はログイン後に `access_token` を取得し、Edge Function呼び出し時に `Authorization: Bearer <token>` を付与する
- Edge Function 内で `auth.getUser()` によりトークン検証し、`auth_user_id`（UUID）を取得する

### 3.2 認可（RBAC）
- `company_member` テーブルで会社スコープとロール（staff/manager）を判定する

### 3.3 実装方針（MVP推奨）
- Company Web → Edge Function（業務API）
- Edge Function → RPC（Postgres Function）でトランザクション更新
- Edge Function は service_role でDB操作（RLSをバイパス）
  - 代わりに Edge Function が認証・認可・入力検証の責務を持つ
  - service_role は Edge Function の Secrets のみで保持し、ブラウザに絶対に出さない

---

## 4. 対象データ（関連テーブル）

### 4.1 参照テーブル
- `company_member`：操作者の所属/権限確認
- `room`：会社一致、有効（`is_active=true`）
- `card`：会社一致、失効（revoked）でない
- `card_room_binding`：カードと部屋の現行割当（`unbound_at is null`）
- `stay`：同時active滞在の有無

### 4.2 更新テーブル
- `stay`：INSERT（`active`）
- `audit_log`：INSERT（CHECKINログ）

---

## 5. UI仕様（W-02 チェックイン）

### 5.1 入力
- 部屋選択（`room_id`）
- カード選択（`card_id`）
- 確定ボタン

### 5.2 表示/制御
- 部屋に active stay がある場合：チェックイン不可（UIで表示）
- revokedカード：候補に出さない
- カード候補：基本は「当該部屋の現行割当カードのみ」
  - UIで絞り込み（快適性）
  - サーバでも必ず検証（安全性）
- 成功時：滞在一覧を再取得（または該当行のみ更新）し、active化を反映

---

## 6. API仕様（Edge Function）

### 6.1 Endpoint
- Method: `POST`
- Path: `/functions/v1/ops-checkin`

### 6.2 Headers
- `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
- `Content-Type: application/json`
- （任意）`Idempotency-Key: <string>`（MVPは未実装でも可）

### 6.3 入力（Request Body）
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| company_id | uuid | YES | 操作対象会社 |
| room_id | uuid | YES | チェックイン対象部屋 |
| card_id | uuid | YES | 配布するカード |
| checkin_at | timestamptz | NO | 未指定は now() |
| client_request_id | text | NO | ログ相関用 |

入力例:
```json
{
  "company_id": "7bb7d2d4-2bb2-4bf0-a5e1-8c4f4e6e2f8d",
  "room_id": "c5a1f7f2-6c40-43d2-b3e8-0c8a8c75c1aa",
  "card_id": "c5b2a1a9-4b5b-4f5e-9d08-d3c7f7e1a5d0",
  "checkin_at": "2026-02-28T13:00:00+09:00",
  "client_request_id": "ui-req-20260228-000123"
}
````

### 6.4 出力（Response Body）

| 項目             | 型           | 説明         |
| -------------- | ----------- | ---------- |
| stay_id        | uuid        | 作成された滞在ID  |
| stay_status    | text        | `"active"` |
| checkin_at     | timestamptz | チェックイン日時   |
| rules_snapshot | json        | 固定されたルール   |

出力例:

```json
{
  "stay_id": "4a2b7a9b-7b07-4a06-9c7c-9fb3c2f8a92d",
  "stay_status": "active",
  "checkin_at": "2026-02-28T13:00:00+09:00",
  "rules_snapshot": {
    "kudos_quota": 3,
    "cooldown_sec": 600,
    "post_checkout_window_sec": 3600,
    "points_award": 100
  }
}
```

---

## 7. 認証・認可（Edge Function内の要件）

### 7.1 認証（必須）

* `Authorization` の Bearer token から Supabase Auth を検証し、`auth_user_id` が取得できること
* 取得できない場合は 401

### 7.2 認可（必須）

以下を満たす `company_member` が存在すること（存在しない場合403）:

* `company_member.company_id = request.company_id`
* `company_member.user_id = auth_user_id`（Supabase auth uid）
* `company_member.member_role in ('staff','manager')`
* `company_member.member_status = 'active'`

---

## 8. バリデーション（業務ルール）

### 8.1 部屋の妥当性

* `room.company_id = company_id`
* `room.is_active = true`

### 8.2 カードの妥当性

* `card.company_id = company_id`
* `card.card_status != 'revoked'`

### 8.3 カード割当の整合（必須）

* `card_room_binding` に **現行割当** が存在し一致する

  * `card_id = request.card_id`
  * `unbound_at is null`
  * `room_id = request.room_id`

### 8.4 二重チェックイン防止（必須）

以下が存在しない（存在する場合409）:

* `stay.room_id = room_id AND stay_status='active'`
* `stay.card_id = card_id AND stay_status='active'`

---

## 9. 状態遷移

### 9.1 stay

* 作成時: `stay_status = 'active'`
* チェックアウト時: `stay_status = 'closed'`

### 9.2 rules_snapshot

* `stay` 作成時点で確定・固定
* 後続（ゲスト投稿等）は必ず `stay.rules_snapshot` を参照して投稿制御する

---

## 10. rules_snapshot 仕様（MVP）

### 10.1 JSONスキーマ

| key                      | 型       | 必須  | 説明               |
| ------------------------ | ------- | --- | ---------------- |
| kudos_quota              | integer | YES | 滞在あたりKudos上限     |
| cooldown_sec             | integer | YES | 投稿クールダウン秒        |
| post_checkout_window_sec | integer | YES | checkout後受付期限（秒） |
| points_award             | integer | YES | 1Kudosあたり付与ポイント  |

### 10.2 値の決定（MVP）

* MVPは固定値（例: 3 / 600 / 3600 / 100）
* 将来拡張（本機能スコープ外）:

  * `company.default_rules_json` を追加して会社別設定
  * もしくは `company_policy` テーブル等で運用

---

## 11. 排他・競合設計

### 11.1 想定競合

* 同一roomへの同時チェックイン（連打/複数端末）
* 同一cardの同時利用（別room）
* カード割当変更とチェックインの競合

### 11.2 対策

* RPC内で `room` と `card` を `FOR UPDATE` ロック
* DB制約（部分ユニーク）で最後の砦を作る（12章）

---

## 12. DB制約・インデックス（DDL）

### 12.1 部分ユニーク（推奨）

```sql
-- stay: active stay uniqueness
create unique index if not exists ux_stay_active_room
on stay(room_id)
where stay_status = 'active';

create unique index if not exists ux_stay_active_card
on stay(card_id)
where stay_status = 'active';

-- card_room_binding: current binding uniqueness
create unique index if not exists ux_card_room_binding_current_card
on card_room_binding(card_id)
where unbound_at is null;
```

### 12.2 検索用インデックス（最低限の推奨）

```sql
create index if not exists ix_stay_company_status_checkin
on stay(company_id, stay_status, checkin_at desc);

create index if not exists ix_card_room_binding_room_current
on card_room_binding(room_id)
where unbound_at is null;
```

---

## 13. RPC設計（Postgres Function）

### 13.1 RPC名

* `ops_checkin`

### 13.2 引数

| 引数                        | 型           | 必須  | 説明        |
| ------------------------- | ----------- | --- | --------- |
| p_company_id              | uuid        | YES | 会社ID      |
| p_room_id                 | uuid        | YES | 部屋ID      |
| p_card_id                 | uuid        | YES | カードID     |
| p_actor_company_member_id | uuid        | YES | 操作者所属ID   |
| p_checkin_at              | timestamptz | NO  | nullならnow |

### 13.3 戻り値

* `stay_id uuid`
* `checkin_at timestamptz`
* `rules_snapshot jsonb`

### 13.4 RPC（SQL雛形 / MVP）

```sql
create or replace function ops_checkin(
  p_company_id uuid,
  p_room_id uuid,
  p_card_id uuid,
  p_actor_company_member_id uuid,
  p_checkin_at timestamptz default null
)
returns table (
  stay_id uuid,
  checkin_at timestamptz,
  rules_snapshot jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := coalesce(p_checkin_at, now());
  v_room_company_id uuid;
  v_room_is_active boolean;
  v_card_company_id uuid;
  v_card_status text;
  v_binding_room_id uuid;
  v_existing_stay_id uuid;
  v_rules jsonb;
begin
  -- lock room
  select r.company_id, r.is_active
    into v_room_company_id, v_room_is_active
  from room r
  where r.room_id = p_room_id
  for update;

  if not found then
    raise exception 'VALIDATION_ERROR: room not found' using errcode = 'P0001';
  end if;

  if v_room_company_id <> p_company_id then
    raise exception 'FORBIDDEN: room company mismatch' using errcode = 'P0001';
  end if;

  if v_room_is_active is distinct from true then
    raise exception 'CONFLICT_ROOM_INACTIVE' using errcode = 'P0001';
  end if;

  -- lock card
  select c.company_id, c.card_status
    into v_card_company_id, v_card_status
  from card c
  where c.card_id = p_card_id
  for update;

  if not found then
    raise exception 'VALIDATION_ERROR: card not found' using errcode = 'P0001';
  end if;

  if v_card_company_id <> p_company_id then
    raise exception 'FORBIDDEN: card company mismatch' using errcode = 'P0001';
  end if;

  if v_card_status = 'revoked' then
    raise exception 'CONFLICT_CARD_REVOKED' using errcode = 'P0001';
  end if;

  -- verify current binding (card -> room)
  select b.room_id
    into v_binding_room_id
  from card_room_binding b
  where b.card_id = p_card_id
    and b.unbound_at is null
  limit 1;

  if not found then
    raise exception 'CONFLICT_CARD_NOT_BOUND' using errcode = 'P0001';
  end if;

  if v_binding_room_id <> p_room_id then
    raise exception 'CONFLICT_CARD_NOT_BOUND' using errcode = 'P0001';
  end if;

  -- prevent active stay on room
  select s.stay_id into v_existing_stay_id
  from stay s
  where s.room_id = p_room_id and s.stay_status = 'active'
  limit 1;

  if found then
    raise exception 'CONFLICT_ACTIVE_STAY_ROOM' using errcode = 'P0001';
  end if;

  -- prevent active stay on card
  select s.stay_id into v_existing_stay_id
  from stay s
  where s.card_id = p_card_id and s.stay_status = 'active'
  limit 1;

  if found then
    raise exception 'CONFLICT_ACTIVE_STAY_CARD' using errcode = 'P0001';
  end if;

  -- rules snapshot (MVP fixed)
  v_rules := jsonb_build_object(
    'kudos_quota', 3,
    'cooldown_sec', 600,
    'post_checkout_window_sec', 3600,
    'points_award', 100
  );

  -- insert stay
  insert into stay (
    stay_id,
    company_id,
    room_id,
    card_id,
    stay_status,
    checkin_at,
    rules_snapshot,
    created_by_company_member_id,
    version,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    p_company_id,
    p_room_id,
    p_card_id,
    'active',
    v_now,
    v_rules,
    p_actor_company_member_id,
    1,
    now(),
    now()
  )
  returning stay.stay_id, stay.checkin_at, stay.rules_snapshot
  into stay_id, checkin_at, rules_snapshot;

  -- audit log
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
    'CHECKIN',
    'stay',
    stay_id,
    jsonb_build_object(
      'room_id', p_room_id,
      'card_id', p_card_id,
      'checkin_at', v_now,
      'rules_snapshot', v_rules
    ),
    1,
    now(),
    now()
  );

  return;
end;
$$;
```

---

## 14. Edge Function 実装仕様（擬似コード）

### 14.1 Edge Functionの責務

* Supabase Authでユーザー特定（`auth.getUser()`）
* `company_member` で認可（staff/manager）
* RPC `ops_checkin` 呼び出し
* DB例外を `error_code` にマッピングし、HTTPで返却
* `client_request_id` をログ相関に利用

### 14.2 擬似コード（TypeScript/Deno）

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json(401, err("UNAUTHORIZED", "Missing token"));

    // 1) verify user by Supabase Auth
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) return json(401, err("UNAUTHORIZED", "Invalid token"));

    const authUserId = userData.user.id; // uuid

    // 2) parse body
    const body = await req.json().catch(() => null);
    const { company_id, room_id, card_id, checkin_at, client_request_id } = body ?? {};
    if (!company_id || !room_id || !card_id) {
      return json(400, err("VALIDATION_ERROR", "Missing fields", { client_request_id }));
    }

    // 3) authorize by company_member
    const supabaseSvc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: member, error: memErr } = await supabaseSvc
      .from("company_member")
      .select("company_member_id, member_role, member_status")
      .eq("company_id", company_id)
      .eq("user_id", authUserId)
      .maybeSingle();

    if (memErr || !member) return json(403, err("FORBIDDEN", "No membership", { client_request_id }));
    if (!["staff","manager"].includes(member.member_role) || member.member_status !== "active") {
      return json(403, err("FORBIDDEN", "Insufficient role", { client_request_id }));
    }

    // 4) call RPC
    const { data: rpcData, error: rpcErr } = await supabaseSvc.rpc("ops_checkin", {
      p_company_id: company_id,
      p_room_id: room_id,
      p_card_id: card_id,
      p_actor_company_member_id: member.company_member_id,
      p_checkin_at: checkin_at ?? null
    });

    if (rpcErr) {
      // MVP: simple string matching (later: errcode mapping)
      const mapped = mapRpcError(rpcErr.message ?? "");
      return json(mapped.http, err(mapped.error_code, mapped.message, { client_request_id }));
    }

    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;

    return json(200, {
      stay_id: result.stay_id,
      stay_status: "active",
      checkin_at: result.checkin_at,
      rules_snapshot: result.rules_snapshot
    });

  } catch (_e) {
    return json(500, err("INTERNAL_ERROR", "Unexpected error"));
  }
});

function mapRpcError(msg: string) {
  if (msg.includes("CONFLICT_ACTIVE_STAY_ROOM")) return { http: 409, error_code: "CONFLICT_ACTIVE_STAY_ROOM", message: "Room already has an active stay." };
  if (msg.includes("CONFLICT_ACTIVE_STAY_CARD")) return { http: 409, error_code: "CONFLICT_ACTIVE_STAY_CARD", message: "Card already used by an active stay." };
  if (msg.includes("CONFLICT_CARD_NOT_BOUND")) return { http: 409, error_code: "CONFLICT_CARD_NOT_BOUND", message: "Card is not bound to the room." };
  if (msg.includes("CONFLICT_CARD_REVOKED")) return { http: 409, error_code: "CONFLICT_CARD_REVOKED", message: "Card is revoked." };
  if (msg.includes("CONFLICT_ROOM_INACTIVE")) return { http: 409, error_code: "CONFLICT_ROOM_INACTIVE", message: "Room is inactive." };
  if (msg.includes("FORBIDDEN")) return { http: 403, error_code: "FORBIDDEN", message: "Forbidden." };
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

## 15. 監査ログ（audit_log）

### 15.1 記録内容（CHECKIN）

* `action = 'CHECKIN'`
* `target_table = 'stay'`
* `target_id = stay_id`
* `actor_company_member_id = 操作者`
* `company_id = 対象会社`
* `detail_json` に以下を格納

  * `room_id`, `card_id`, `checkin_at`, `rules_snapshot`

---

## 16. ロギング/モニタリング（MVP）

### 16.1 ログ（最低限）

* Edge Functionログに以下を出す

  * `client_request_id`
  * `auth_user_id`
  * `company_id`
  * 成否（HTTP / error_code）

### 16.2 指標（最低限）

* チェックイン成功数/失敗数（error_code別）
* 409競合率（room/card）
* 応答時間（p50/p95）

---

## 17. テスト観点（MVP）

### 17.1 正常系

* staffが割当済みカード＋有効部屋でチェックイン

  * stay作成（active）
  * rules_snapshot保存
  * audit_log作成

### 17.2 異常系

* 同一roomで同時チェックイン → 片方が409（CONFLICT_ACTIVE_STAY_ROOM）
* cardが別room割当 → 409（CONFLICT_CARD_NOT_BOUND）
* revoked card → 409（CONFLICT_CARD_REVOKED）
* inactive room → 409（CONFLICT_ROOM_INACTIVE）
* employee権限で実行 → 403（FORBIDDEN）
* company違いのroom/card指定 → 403（FORBIDDEN、情報漏えいしない文言）

---

```
```
