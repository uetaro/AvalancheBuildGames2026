````md
# Heartel 詳細設計書（MVP）
# Guest Entry（NFC/QR → ブラウザ遷移 → 滞在開始）※Supabase Auth「非」前提（Guestは匿名）

- ドキュメントID: DD-GUEST-ENTRY
- 版数: v1.0
- 対象: MVP
- 作成日: 2026-03-01
- 対象画面: Guest (Mobile) G-01 カードタップ起動 → G-02 滞在ホーム
- 目的: NFC/QR でカードを読み取り、カードが「有効・部屋割当済み・チェックイン中（active stayあり）」であることを検証し、滞在スコープ固定の `guest_session` を発行してGuest導線を開始する

---

## 1. 概要

### 1.1 目的
ゲストがNFCカードをタップ（またはQRを読み取り）するとブラウザが開き、`/entry` に遷移する。  
`/entry` は公開識別子（`card_public_id`）を受け取り、サーバ検証のうえ `guest_session` を発行し、滞在ホーム（G-02）へ遷移させる。

### 1.2 MVPの完了条件
- NFC/QRからブラウザ遷移できる（URLが開く）
- `card_public_id` を用いてカードを特定できる
- サーバ側で「カード有効」「部屋割当あり」「active stayあり」を検証できる
- 検証成功で `guest_session` を発行し、以後のGuest API呼び出しに利用できる
- 失敗時は原因別にエラー画面を表示できる（invalid / revoked / no stay / not bound 等）

---

## 2. 前提・方式

### 2.1 GuestはSupabase Authを使わない
- Guestはログイン不要（匿名）
- 認証の代わりに「カードに紐づく active stay」検証で“実滞在者のみ”を担保する

### 2.2 NFCカードに書き込む内容
- NFCタグ（NDEF）には **URL（HTTPS）** を書く
- URLは一度書いたらカード側をロック（write-protect）できる前提

#### NFC NDEF URL（例）
- `https://app.heartel.xyz/entry?c=<card_public_id>`

> 注意: URLに `card_id`（内部PK）を載せるのは避け、公開用ID `card_public_id` を使用する。

---

## 3. 追加スキーマ（必要）

### 3.1 card_public_id（必須）
`card` テーブルに公開IDを追加する。

- `card.card_public_id uuid not null default gen_random_uuid()`
- unique制約を付与

DDL例:
```sql
alter table card
  add column card_public_id uuid not null default gen_random_uuid();

create unique index if not exists ux_card_public_id
on card(card_public_id);
````

### 3.2 company_public_id（任意だが推奨）

要望の「company_public_id」について：MVPで必須ではないが、以下用途があるなら追加推奨。

用途例:

* URLに company も含めて “誤会社参照” を早期に弾きたい（`/entry?co=<company_public_id>&c=<card_public_id>`）
* 将来マルチテナントで会社識別を外部に出す必要がある（ブランディング/公開URL）

ただし、`card_public_id` だけで card→company を決定できるため、MVPの検証自体は `company_public_id` なしでも成立する。

推奨スキーマ:

* `company.company_public_id uuid not null default gen_random_uuid()`
* unique制約

DDL例:

```sql
alter table company
  add column company_public_id uuid not null default gen_random_uuid();

create unique index if not exists ux_company_public_id
on company(company_public_id);
```

URLに含める場合（任意）:

* `https://app.heartel.xyz/entry?co=<company_public_id>&c=<card_public_id>`
* サーバは `co` があるとき `card.company_id` と整合を確認し、不一致ならエラー（IDOR抑止/運用ミス検知）

---

## 4. 画面仕様（Guest）

### 4.1 G-01 エントリ（検証中）画面

* 表示

  * 「カードを確認しています…」スピナー
  * 通信失敗時のリトライ導線
* 処理

  * URLクエリの `c`（card_public_id）を読み取り
  * `POST /public/entry/verify` を呼び出す
  * 成功なら `guest_session_token` を保存して G-02へ遷移
  * 失敗なら G-01-ERR（エラー状態）へ

### 4.2 G-01-ERR エラー表示（MVP必須）

エラー種別ごとの表示と導線:

* `CARD_NOT_FOUND`：カードが不正。フロントへ案内
* `CARD_REVOKED`：カードが失効。フロントへ案内
* `CARD_NOT_BOUND`：カード割当が未設定。フロントへ案内
* `NO_ACTIVE_STAY`：チェックインが未実施。フロントへ案内
* `COMPANY_SUSPENDED`（任意）：ホテルが利用停止。フロントへ案内
* `NETWORK_ERROR`：再試行導線

### 4.3 G-02 滞在ホーム（遷移先の前提情報）

検証成功時に以下を表示できること（最低限）:

* ホテル名（company_name）
* 残り回数（remaining_quota）
* 受付期限（post_checkout_deadline など）
* CTA「スタッフを選ぶ」

---

## 5. API設計（Entry Verify）

### 5.1 Endpoint

* Method: `POST`
* Path: `/functions/v1/public-entry-verify`（Edge Function）
* Auth: なし（Guestは匿名）
* Rate limit: IP/UA単位で軽い制限推奨（DoS/総当たり抑止）

### 5.2 Request（入力）

Headers:

* `Content-Type: application/json`

Body:

| 項目                 | 型    | 必須  | 説明                |
| ------------------ | ---- | --- | ----------------- |
| card_public_id     | uuid | YES | NFC/QRから得た公開カードID |
| company_public_id  | uuid | NO  | URLに含める場合のみ       |
| client_device_hint | text | NO  | 端末ヒント（UA摘要など）     |
| client_request_id  | text | NO  | 相関用               |

入力例（company_public_idなし）:

```json
{
  "card_public_id": "9b2b9b51-0f49-4a8c-a3d8-3a4fd0a0b6b3",
  "client_request_id": "guest-entry-20260301-0001"
}
```

入力例（company_public_idあり）:

```json
{
  "company_public_id": "1b3a34e8-6c2c-4a9c-9d83-087b2c2f4d17",
  "card_public_id": "9b2b9b51-0f49-4a8c-a3d8-3a4fd0a0b6b3",
  "client_request_id": "guest-entry-20260301-0001"
}
```

### 5.3 Response（出力）

成功時:

| 項目                  | 型           | 説明                         |
| ------------------- | ----------- | -------------------------- |
| guest_session_token | text        | Guest API用Bearerトークン（短TTL） |
| expires_at          | timestamptz | セッション期限                    |
| stay                | object      | 滞在コンテキスト                   |
| rules_snapshot      | json        | 滞在ルール                      |
| remaining_quota     | integer     | 残り回数（計算結果）                 |

`stay`（最低限）:

* `stay_id`
* `company_id`
* `company_name`
* `checkin_at`
* `post_checkout_deadline`（計算）

成功例:

```json
{
  "guest_session_token": "gs_7c7d9b...<opaque>",
  "expires_at": "2026-03-01T15:30:00+09:00",
  "stay": {
    "stay_id": "4a2b7a9b-7b07-4a06-9c7c-9fb3c2f8a92d",
    "company_id": "7bb7d2d4-2bb2-4bf0-a5e1-8c4f4e6e2f8d",
    "company_name": "Heartel Hotel Tokyo",
    "checkin_at": "2026-03-01T12:00:00+09:00",
    "post_checkout_deadline": "2026-03-02T12:00:00+09:00"
  },
  "rules_snapshot": {
    "kudos_quota": 3,
    "cooldown_sec": 600,
    "post_checkout_window_sec": 3600,
    "points_award": 100
  },
  "remaining_quota": 2
}
```

---

## 6. サーバ側検証ロジック（必須）

入力 `card_public_id` から以下を満たすことを確認する。

1. カード存在

* `card.card_public_id = :card_public_id`

2. カード有効

* `card.card_status != 'revoked'`
* （運用上）`card.card_status` は `active` を推奨（issuedは運用により許容/不許可を決める）

  * MVP推奨: `active` のみ通す（`issued` は弾く） → `CARD_NOT_ACTIVE`

3. カードが現行割当されている

* `card_room_binding` に `card_id = card.card_id AND unbound_at is null` が存在
* 存在しない場合 `CARD_NOT_BOUND`

4. active stay が存在

* `stay` に `card_id = card.card_id AND stay_status='active'` が存在
* 存在しない場合 `NO_ACTIVE_STAY`

5. （任意）company_public_id 整合

* request.company_public_id が指定されている場合、

  * `company.company_public_id = :company_public_id` を引き、
  * `card.company_id == company.company_id` を確認
  * 不一致なら `COMPANY_MISMATCH`

6. （任意）会社停止

* `company.company_status='active'` 以外なら `COMPANY_SUSPENDED`

---

## 7. セッション発行（guest_session）

### 7.1 方式

* `guest_session` テーブルにレコードを作成し、`guest_session_token` を返す
* `guest_session_token` は **opaque token**（ランダム）を推奨
* DBには平文を保存せず `session_token_hash` を保存する（漏えい耐性）

### 7.2 guest_session テーブル（前提）

* `guest_session_id uuid`
* `stay_id uuid`
* `card_id uuid`
* `session_token_hash text (unique)`
* `expires_at timestamptz`
* `last_seen_at timestamptz null`
* `revoked_at timestamptz null`
* `version int`
* `created_at/updated_at`

### 7.3 TTL（MVP推奨）

* 15分〜60分（例：30分）
* 期限切れは再タップで再発行（UXは許容）

### 7.4 remaining_quota の計算（MVP）

* `stay.rules_snapshot.kudos_quota` を `quota` とする
* `kudos` から `stay_id` の投稿数をカウント（`pending/confirmed` を対象、`rejected` は除外）
* `remaining_quota = max(0, quota - count)`

---

## 8. 画面遷移（ブラウザ内）

1. `/entry?c=...` が開く
2. G-01（検証中）を表示しつつ `public-entry-verify` を呼ぶ
3. 成功:

   * `guest_session_token` を保存（localStorage等。保存先はMVPで簡易）
   * `/stay`（G-02）へ遷移
4. 失敗:

   * G-01-ERR（エラー）表示
   * 再試行導線（再タップ/再読み込み）

---

## 9. エラー設計

### 9.1 返却形式

```json
{
  "error_code": "NO_ACTIVE_STAY",
  "message": "No active stay found for this card.",
  "details": { "card_public_id": "..." }
}
```

### 9.2 error_code一覧（MVP）

| HTTP | error_code        | 条件                             |
| ---- | ----------------- | ------------------------------ |
| 400  | VALIDATION_ERROR  | card_public_id欠落/形式不正          |
| 404  | CARD_NOT_FOUND    | card_public_idに一致するカードがない      |
| 409  | CARD_NOT_ACTIVE   | card_statusがactiveでない（issued等） |
| 409  | CARD_REVOKED      | card_status='revoked'          |
| 409  | CARD_NOT_BOUND    | 現行割当がない                        |
| 409  | NO_ACTIVE_STAY    | active stay がない                |
| 409  | COMPANY_MISMATCH  | company_public_id不一致（指定時）      |
| 423  | COMPANY_SUSPENDED | company_status!='active'       |
| 429  | TOO_MANY_REQUESTS | レート制限                          |
| 500  | INTERNAL_ERROR    | 予期せぬ例外                         |

---

## 10. セキュリティ・不正対策（MVPレベル）

* **公開IDは card_public_id を使う**（内部PKを外に出さない）
* `guest_session_token` は短TTL
* `session_token_hash` 保存（平文保存しない）
* レート制限（IP/UA単位）で総当たり/DoSを軽減
* `card_status='revoked'` を即時に反映できる（運用の最後の砦）
* 追加強化（P1）

  * `guest_session` に `device_fingerprint_hash` を入れて端末バインド
  * `entry_token_use` のようなワンタイム化（ただし固定URL運用だと設計が増える）

---

## 11. 実装方式（Edge Function）

### 11.1 Endpoint

* `/functions/v1/public-entry-verify`

### 11.2 処理フロー（サーバ）

1. body parse（card_public_id / company_public_id）
2. card取得（public id）
3. card_status検証（activeのみ or revoked拒否）
4. 現行割当確認（card_room_binding）
5. active stay取得（stay）
6. company情報取得（company_name/status、company_public_id整合（任意））
7. remaining_quota計算（kudos集計）
8. guest_session発行（token生成→hash保存→DB insert）
9. response返却

---

## 12. 擬似コード（Edge Function / TypeScript）

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.224.0/hash/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => null);
    const { card_public_id, company_public_id, client_request_id } = body ?? {};
    if (!card_public_id) return json(400, err("VALIDATION_ERROR", "card_public_id is required", { client_request_id }));

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) card by public id
    const { data: card } = await db
      .from("card")
      .select("card_id, company_id, card_status")
      .eq("card_public_id", card_public_id)
      .maybeSingle();

    if (!card) return json(404, err("CARD_NOT_FOUND", "Card not found", { client_request_id }));

    if (card.card_status === "revoked") return json(409, err("CARD_REVOKED", "Card revoked", { client_request_id }));
    if (card.card_status !== "active") return json(409, err("CARD_NOT_ACTIVE", "Card not active", { client_request_id }));

    // 2) current binding
    const { data: binding } = await db
      .from("card_room_binding")
      .select("room_id")
      .eq("card_id", card.card_id)
      .is("unbound_at", null)
      .maybeSingle();

    if (!binding) return json(409, err("CARD_NOT_BOUND", "Card is not bound to a room", { client_request_id }));

    // 3) active stay
    const { data: stay } = await db
      .from("stay")
      .select("stay_id, checkin_at, rules_snapshot, stay_status")
      .eq("card_id", card.card_id)
      .eq("stay_status", "active")
      .maybeSingle();

    if (!stay) return json(409, err("NO_ACTIVE_STAY", "No active stay found", { client_request_id }));

    // 4) company
    const { data: company } = await db
      .from("company")
      .select("company_id, company_name, company_status, timezone, company_public_id")
      .eq("company_id", card.company_id)
      .maybeSingle();

    if (!company) return json(500, err("INTERNAL_ERROR", "Company not found", { client_request_id }));
    if (company.company_status !== "active") return json(423, err("COMPANY_SUSPENDED", "Company is suspended", { client_request_id }));

    if (company_public_id && company.company_public_id && company_public_id !== company.company_public_id) {
      return json(409, err("COMPANY_MISMATCH", "Company mismatch", { client_request_id }));
    }

    // 5) remaining quota (MVP)
    const quota = stay.rules_snapshot?.kudos_quota ?? 0;
    const { count } = await db
      .from("kudos")
      .select("kudos_id", { count: "exact", head: true })
      .eq("stay_id", stay.stay_id)
      .in("kudos_status", ["pending", "confirmed"]); // rejected excluded

    const used = count ?? 0;
    const remaining_quota = Math.max(0, quota - used);

    // 6) create guest session
    const token = crypto.randomUUID() + crypto.randomUUID(); // opaque
    const hash = new createHash("sha256").update(token).toString();

    const ttlMinutes = 30;
    const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { data: gs, error: gsErr } = await db
      .from("guest_session")
      .insert({
        guest_session_id: crypto.randomUUID(),
        stay_id: stay.stay_id,
        card_id: card.card_id,
        session_token_hash: hash,
        expires_at,
        version: 1
      })
      .select("guest_session_id")
      .single();

    if (gsErr) return json(500, err("INTERNAL_ERROR", "Failed to create guest session", { client_request_id }));

    // 7) response
    return json(200, {
      guest_session_token: token,
      expires_at,
      stay: {
        stay_id: stay.stay_id,
        company_id: company.company_id,
        company_name: company.company_name,
        checkin_at: stay.checkin_at,
        post_checkout_deadline: null // checkout後計算はG-02用に後で追加可能
      },
      rules_snapshot: stay.rules_snapshot,
      remaining_quota
    });

  } catch (_e) {
    return json(500, err("INTERNAL_ERROR", "Unexpected error"));
  }
});

function err(error_code: string, message: string, details: any = undefined) {
  return { error_code, message, details };
}
function json(status: number, body: any) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
```

---

## 13. インデックス（推奨）

* `card(card_public_id)` unique
* `card_room_binding(card_id) where unbound_at is null`
* `stay(card_id) where stay_status='active'`（active stay の高速取得）
* `kudos(stay_id, kudos_status)`（quota計算）

---

## 14. テスト観点（MVP）

正常系

* activeカード + 現行割当あり + active stayあり → guest_session発行、滞在ホームへ遷移

異常系

* card_public_id 不正 → 404（CARD_NOT_FOUND）
* card_status revoked → 409（CARD_REVOKED）
* card_status active以外 → 409（CARD_NOT_ACTIVE）
* 現行割当なし → 409（CARD_NOT_BOUND）
* active stayなし → 409（NO_ACTIVE_STAY）
* company_status suspended → 423（COMPANY_SUSPENDED）
* （company_public_id指定時）不一致 → 409（COMPANY_MISMATCH）
* レート制限超過 → 429

---

## 15. 運用メモ（NFC書き込み/ロック）

* NFCタグに URL を書き込む工程が必要
* 書き込み後に write-protect（ロック）可能なタグを採用すること
* 紛失/事故時は `card.card_status='revoked'` で即時無効化する（運用の最後の砦）

---

```
```
