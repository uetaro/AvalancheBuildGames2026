````md id="kq7c9a"
# Heartel 詳細設計書（MVP）
# Guest：スタッフ一覧取得（G-03 / Staff List On-Duty Only）※Guestは匿名・guest_session必須

- ドキュメントID: DD-GUEST-STAFF-LIST
- 版数: v1.0
- 対象: MVP
- 作成日: 2026-03-01
- 対象画面: Guest (Mobile) G-03 スタッフ一覧（勤務中のみ）
- 目的: ゲストが「滞在中の会社（ホテル）」に所属し、かつ勤務中（on_duty_sessionがactive）のスタッフのみを一覧表示できるようにする

---

## 1. 概要

### 1.1 目的
ゲストが滞在ホーム（G-02）から「スタッフを選ぶ」を押すと、勤務中スタッフ一覧を取得し表示する。  
勤務中の根拠は `on_duty_session.duty_status='active'` とし、会社スコープは `guest_session -> stay -> company_id` で固定する。

### 1.2 MVPの完了条件
- `guest_session_token` を持つゲストが一覧取得できる
- 対象会社（滞在中の company_id）に所属し、勤務中（on_duty active）のスタッフのみ返る
- 表示するプロフィールは最小限（名前/職種程度）でよい
- 勤務中スタッフが0人の場合、空状態を返してUIが案内できる

---

## 2. 前提・スコープ

### 2.1 Guestは匿名（Supabase Authなし）
- Guestは `guest_session_token`（短TTL）でのみアクセスできる
- `guest_session_token` は Entry Verify（DD-GUEST-ENTRY）で発行される

### 2.2 対象会社の決定
- クライアントから `company_id` を渡さない（IDOR対策）
- サーバは `guest_session -> stay -> company_id` で対象会社を確定する

### 2.3 対象外（MVP）
- 高度検索（全文検索、並び替えの自由度）
- 匿名ベンチマーク、詳細プロフィールの深掘り
- 多言語表示の高度化（表示名のローカライズ等）

---

## 3. 画面仕様（G-03）

### 3.1 表示項目（MVP）
各スタッフ行（カード）に表示:
- `display_name`（会社内表示名優先）
- `job_title`（任意）
- （任意）`avatar_url`（MVPは省略可）
- 「選択」アクション（押下で Kudos 投稿画面へ）

### 3.2 空状態
- 一覧が空の場合:
  - 「現在勤務中のスタッフがいません。フロントにお声がけください。」等の文言

---

## 4. API設計（Edge Function）

### 4.1 Endpoint
- Method: `GET`
- Path: `/functions/v1/public-staff-list`
- Auth: `guest_session_token`（Bearer）

### 4.2 Headers
- `Authorization: Bearer <GUEST_SESSION_TOKEN>`

### 4.3 Query Parameters（入力 / MVP）
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| limit | integer | NO | 1ページ件数（default 50, max 200） |
| cursor | timestamptz | NO | ページング用（started_at基準） |
| job_title | text | NO | 職種フィルタ（完全一致/部分一致は運用で選択） |

例:
- `/public-staff-list?limit=50`
- `/public-staff-list?job_title=Front%20Desk`

### 4.4 Response（出力）
| 項目 | 型 | 説明 |
|---|---|---|
| items | array | スタッフ一覧 |
| next_cursor | timestamptz/null | 次ページ用 |

items要素（MVP）:
| 項目 | 型 | 説明 |
|---|---|---|
| company_member_id | uuid | Kudos送信先として使うID |
| display_name | text | 表示名（override優先） |
| job_title | text/null | 職種 |
| on_duty_started_at | timestamptz | 勤務開始時刻（任意表示） |

出力例:
```json
{
  "items": [
    {
      "company_member_id": "0f08a7b1-2a7c-4b23-8d11-8a9c11c1a111",
      "display_name": "Sato",
      "job_title": "Front Desk",
      "on_duty_started_at": "2026-03-01T12:30:00+09:00"
    }
  ],
  "next_cursor": null
}
````

---

## 5. 認証（guest_session_token）

### 5.1 検証方式（MVP）

* `guest_session_token` は opaque token
* DBには `guest_session.session_token_hash` を保存
* Edge Functionは token を sha256 等でハッシュ化し、DB照合する

### 5.2 有効条件

* `guest_session.expires_at > now()`
* `guest_session.revoked_at is null`

無効なら 401（`GUEST_SESSION_EXPIRED` 等）。

---

## 6. 対象会社の解決（必須）

1. `guest_session` を token_hash で取得
2. `stay` を `guest_session.stay_id` で取得（または join）
3. `stay.company_id` を対象会社とする

※クライアントが company_id を指定しても無視する（または受け取らない）。

---

## 7. 抽出条件（勤務中スタッフ）

### 7.1 必須条件（MVP）

* `on_duty_session.company_id = stay.company_id`
* `on_duty_session.duty_status = 'active'`

### 7.2 所属整合（必須）

* `company_member.company_member_id = on_duty_session.company_member_id`
* `company_member.company_id = stay.company_id`
* `company_member.member_status = 'active'`
* `company_member.member_role = 'employee'`（MVPでは employeeのみを“称賛対象”とする）

  * もし staff/manager も称賛対象に含めたい場合は `in ('employee','staff','manager')` に変更

---

## 8. 表示名の決定ロジック（MVP）

`display_name` は以下の優先順位で決定:

1. `company_member.display_name_override`（存在すれば）
2. `user.display_name`（存在すれば）
3. fallback: `"(No Name)"`（MVPでは空を許容してもよいが、UIが困るので推奨しない）

---

## 9. 実装方式（Edge Function）

### 9.1 DB参照テーブル

* `guest_session`（token検証）
* `stay`（company_id確定）
* `on_duty_session`（勤務中抽出）
* `company_member`（所属/状態/表示名）
* `user`（display_nameのfallback）

### 9.2 推奨インデックス

* `guest_session(session_token_hash)` unique
* `on_duty_session(company_id, duty_status, started_at desc)`
* `company_member(company_id, member_status, member_role)`
* `user(user_id)`（PK）

---

## 10. エラー設計

エラー形式:

```json
{
  "error_code": "GUEST_SESSION_EXPIRED",
  "message": "Guest session expired.",
  "details": {}
}
```

| HTTP | error_code            | 条件                         |
| ---- | --------------------- | -------------------------- |
| 401  | UNAUTHORIZED          | Bearerなし/不正                |
| 401  | GUEST_SESSION_EXPIRED | expires_at <= now          |
| 401  | GUEST_SESSION_REVOKED | revoked_at not null        |
| 404  | STAY_NOT_FOUND        | stayが見つからない（基本は内部エラー扱いでも可） |
| 500  | INTERNAL_ERROR        | 予期しない例外                    |

---

## 11. 擬似コード（Edge Function / TypeScript）

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHash } from "https://deno.land/std@0.224.0/hash/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return json(401, err("UNAUTHORIZED", "Missing token"));

    const hash = new createHash("sha256").update(token).toString();
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) guest_session
    const { data: gs } = await db
      .from("guest_session")
      .select("guest_session_id, stay_id, expires_at, revoked_at")
      .eq("session_token_hash", hash)
      .maybeSingle();

    if (!gs) return json(401, err("UNAUTHORIZED", "Invalid session"));
    if (gs.revoked_at) return json(401, err("GUEST_SESSION_REVOKED", "Session revoked"));
    if (new Date(gs.expires_at).getTime() <= Date.now()) return json(401, err("GUEST_SESSION_EXPIRED", "Session expired"));

    // 2) stay -> company_id
    const { data: stay } = await db
      .from("stay")
      .select("stay_id, company_id")
      .eq("stay_id", gs.stay_id)
      .maybeSingle();

    if (!stay) return json(404, err("STAY_NOT_FOUND", "Stay not found"));

    // 3) on_duty staff list
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
    const jobTitle = url.searchParams.get("job_title"); // optional

    let q = db
      .from("on_duty_session")
      .select("company_member_id, started_at")
      .eq("company_id", stay.company_id)
      .eq("duty_status", "active")
      .order("started_at", { ascending: false })
      .limit(limit);

    // job_title filter is applied via join in a second query (MVP simplification)

    const { data: sessions } = await q;

    if (!sessions || sessions.length === 0) {
      return json(200, { items: [], next_cursor: null });
    }

    const memberIds = sessions.map(s => s.company_member_id);

    // 4) load members + users
    const { data: members } = await db
      .from("company_member")
      .select("company_member_id, user_id, job_title, display_name_override, member_status, member_role")
      .in("company_member_id", memberIds)
      .eq("company_id", stay.company_id)
      .eq("member_status", "active")
      .eq("member_role", "employee");

    const userIds = (members ?? []).map(m => m.user_id);
    const { data: users } = await db
      .from("user")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const userMap = new Map((users ?? []).map(u => [u.user_id, u.display_name]));
    const sessionMap = new Map(sessions.map(s => [s.company_member_id, s.started_at]));

    // 5) assemble
    const items = (members ?? [])
      .filter(m => !jobTitle || (m.job_title ?? "").includes(jobTitle))
      .map(m => ({
        company_member_id: m.company_member_id,
        display_name: m.display_name_override ?? userMap.get(m.user_id) ?? "(No Name)",
        job_title: m.job_title ?? null,
        on_duty_started_at: sessionMap.get(m.company_member_id)
      }));

    return json(200, { items, next_cursor: null });

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

## 12. テスト観点（MVP）

正常系

* 有効なguest_sessionでアクセス → 勤務中スタッフのみ返る
* 所属employeeが複数勤務中 → items複数

異常系

* guest_session_tokenなし → 401
* 期限切れ → 401（GUEST_SESSION_EXPIRED）
* revoked → 401（GUEST_SESSION_REVOKED）
* stayが消えている（不整合）→ 404/500
* on_dutyが0件 → items=[] を返す（空状態）

---

## 13. 補足（設計上の注意）

* クライアントから company_id を受け取らない（IDOR対策）
* on_duty_session を根拠にするため、従業員アプリ側の「勤務開始/終了」が前提
* staff/managerも称賛対象にするかは要件次第（本書は employee のみを対象）
* 大規模ホテルで人数が多い場合は cursor paging（started_at + company_member_id）に拡張

---

```
```
