````md
# Heartel 詳細設計書（MVP）
# チェックアウト時のオンチェーン処理（On-chain Receipt Issuance）

- ドキュメントID: DD-OPS-CHECKOUT-ONCHAIN
- 版数: v1.0
- 作成日: 2026-03-02
- 対象: Company Web（staff/manager）チェックアウト実行後の「オンチェーン受領証（Receipt）」発行
- Backend: Supabase（Postgres + Edge Functions + pg_cron/pg_net + RPC）
- Chain: Avalanche C-Chain（MVPは Fuji Testnet 推奨。ChainId=43113） :contentReference[oaicite:0]{index=0}

---

## 1. 目的・要件

### 1.1 目的
チェックアウト時に、当該滞在（stay）で送られたKudosを確定（confirmed/rejected）し、confirmed のKudosについて「改ざん困難な受領証（Receipt）」をオンチェーンに記録する。

### 1.2 要件（プライバシー/監査）
- オンチェーンには **本文（message_text）やPIIを載せない**
- オンチェーンに載せるのは「証跡としての最小データ」
  - `anchor_hash`（bytes32）
  - `points_awarded`（制度ポイント）
  - `issuer`（発行者＝ホテル/運営の発行アカウント）
  - `issued_at`（ブロック時刻 or サーバ時刻）
- オフチェーン（DB）には、検証に必要な参照情報（kudos_id, stay_id等）を保持し、`anchor_hash` で紐づける

---

## 2. 全体アーキテクチャ（責務分離）

### 2.1 コンポーネント
1) Checkout RPC（同期・業務トランザクション）
- `stay` を `closed` にする
- `kudos` を confirmed/rejected に確定する
- confirmed kudos 分の `chain_receipt` を **queued** で作成する（=オンチェーン発行の“キュー投入”）

2) On-chain Worker（非同期・再試行あり）
- `chain_receipt.receipt_status='queued'` を拾ってオンチェーンTxを送信
- `tx_hash` を保存し `submitted` に更新
- Tx receipt を監視し `confirmed` / `failed` に更新
- 失敗は指数バックオフでリトライ

### 2.2 スケジューリング
Supabaseでは、Postgres側の `pg_cron` と `pg_net` を使って Edge Function を定期実行できる（MVPはこの方式が最短）。 :contentReference[oaicite:1]{index=1}

---

## 3. データ設計（DB）

### 3.1 既存テーブル（前提）
- `kudos`（確定結果）
- `chain_receipt`（オンチェーン発行キュー＆結果管理）

既存 `chain_receipt` の主な列（想定）
- `chain_receipt_id`（PK）
- `kudos_id`（unique）
- `anchor_hash`（text/hex でも可、実体は bytes32 相当）
- `points_awarded`（int）
- `receipt_status`（queued/submitted/confirmed/failed）
- `tx_hash`（text）
- `submitted_at`, `confirmed_at`
- `fail_reason`
- `version`, `created_at`, `updated_at`

### 3.2 追加推奨（オンチェーン運用を安定させる最低限）
MVPでも入れておくと事故が減る列：

- `chain_id int not null default 43113`（環境切替のため）
- `contract_address text not null`（ReceiptRegistry）
- `retry_count int not null default 0`
- `next_attempt_at timestamptz null`（バックオフ）
- `last_attempt_at timestamptz null`
- `tx_error text null`（失敗時の詳細）
- `hash_alg text not null default 'keccak256'`（sha256運用が混ざる事故防止）

※最小でやるなら `retry_count/next_attempt_at` だけでも良い。

---

## 4. スマートコントラクト設計（ReceiptRegistry）

### 4.1 方針
- オンチェーンは「証跡のアンカー（anchor_hash）」と「制度ポイント（points）」のみを保存
- 二重記録を防ぐ（idempotency）
- 読み出し用の view を用意（検証UIが作りやすい）

### 4.2 Solidity I/F（例）
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReceiptRegistry {
    error AlreadyRecorded(bytes32 anchorHash);
    error NotIssuer(address caller);

    struct Receipt {
        uint32 points;
        uint64 issuedAt;   // block timestamp
        address issuer;    // who recorded
    }

    mapping(bytes32 => Receipt) public receipts;
    mapping(address => bool) public issuers; // simple role list

    event ReceiptRecorded(bytes32 indexed anchorHash, uint32 points, address indexed issuer, uint64 issuedAt);

    modifier onlyIssuer() {
        if (!issuers[msg.sender]) revert NotIssuer(msg.sender);
        _;
    }

    constructor(address[] memory initialIssuers) {
        for (uint i = 0; i < initialIssuers.length; i++) {
            issuers[initialIssuers[i]] = true;
        }
    }

    function setIssuer(address issuer, bool allowed) external /*onlyOwner*/ {
        // MVP: owner省略はNG。実装ではOwnable等を必ず付与。
        issuers[issuer] = allowed;
    }

    function recordReceipt(bytes32 anchorHash, uint32 points) external onlyIssuer {
        if (receipts[anchorHash].issuer != address(0)) revert AlreadyRecorded(anchorHash);

        Receipt memory r = Receipt({
            points: points,
            issuedAt: uint64(block.timestamp),
            issuer: msg.sender
        });

        receipts[anchorHash] = r;
        emit ReceiptRecorded(anchorHash, points, msg.sender, r.issuedAt);
    }

    function isRecorded(bytes32 anchorHash) external view returns (bool) {
        return receipts[anchorHash].issuer != address(0);
    }
}
````

### 4.3 メソッド定義（この設計での“具体メソッド”）

* `recordReceipt(bytes32 anchorHash, uint32 points)`

  * チェックアウト確定後の「受領証発行Tx」で呼ぶ主メソッド
* `receipts(bytes32 anchorHash) -> (points, issuedAt, issuer)`

  * 検証UIで `anchor_hash` をキーに照合する
* `isRecorded(bytes32 anchorHash) -> bool`

  * 冪等処理・復旧時の確認に使う

---

## 5. anchor_hash 生成ロジック（重要：決め打ち）

### 5.1 原則

* `anchor_hash` は **本文を含めない**
* “どのKudosの証跡か”が検証できるだけの情報で構成する
* 同じKudosなら必ず同じ anchor になる（決定性）

### 5.2 推奨フォーマット（keccak256 + ABIエンコード）

以下の「型＋順序」を固定する（実装者が変わっても一致する）。

* `SCHEMA_ID = keccak256("HEARTEL_RECEIPT_V1")`（bytes32）
* `kudos_uuid_bytes16`（UUIDを16バイトに）
* `stay_uuid_bytes16`
* `company_uuid_bytes16`
* `receiver_company_member_uuid_bytes16`
* `category_hash = keccak256(utf8(category))`（bytes32）
* `points_awarded`（uint32）
* `issued_at_epoch_sec`（uint64）※kudos.created_at を秒に丸めたもの

anchor:

* `anchor_hash = keccak256(abi.encode(SCHEMA_ID, kudos, stay, company, receiver, category_hash, points, issued_at))`

備考：

* UUIDは文字列ハッシュではなく **16バイト** を推奨（表現ゆれ防止）
* `issued_at` は「kudos.created_at（秒）」を推奨（後で再計算が容易）

---

## 6. Checkout 時のロジック（オンチェーン処理の起点）

### 6.1 同期処理（Checkout RPC：ops_checkout）

1. `stay` を `closed`（checkout_at set）
2. `kudos` の pending を `confirmed/rejected` に確定
3. confirmed kudos について、`chain_receipt` を作成（status=queued）

   * `anchor_hash` をここで計算し保存（推奨：後段を単純化）
   * `points_awarded` を保存
   * `chain_id`, `contract_address`, `hash_alg='keccak256'` を保存（推奨）
   * `receipt_status='queued'`
   * `retry_count=0`, `next_attempt_at=null`

### 6.2 重要な性質

* Checkout RPC は “オンチェーンTx送信” をしない（遅延/失敗でUIが詰まるため）
* オンチェーンはあくまで **非同期ジョブ** に委譲する

---

## 7. On-chain Worker（具体ロジック）

### 7.1 Worker 構成

Edge Function（例）

* `POST /functions/v1/chain-worker-submit`（送信フェーズ）
* `POST /functions/v1/chain-worker-confirm`（確認フェーズ）

Cron（例）

* submit：毎分
* confirm：毎分（submitと同じ関数でも可）

Supabase Cron / Scheduling Edge Functions は `pg_cron` + `pg_net` で実現できる。 ([Supabase][1])

---

## 8. 送信フェーズ（chain-worker-submit）

### 8.1 対象取得（DB）

対象：`chain_receipt.receipt_status in ('queued','failed')` かつ

* `next_attempt_at is null OR next_attempt_at <= now()`

ロック方式（推奨）

* RPC `chain_pick_receipts(limit)` を用意し、`FOR UPDATE SKIP LOCKED` で行ロックして “取り出しと状態変更” を一括で行う

例：状態遷移

* `queued/failed` → `submitting`（内部ステータス。無ければ `submitted` 直前でも良い）
* `last_attempt_at=now()`

### 8.2 Tx送信（EVM）

1. Provider生成（RPC URL）
2. Signer生成（issuer private key）
3. Contract生成（contract_address）
4. `recordReceipt(anchorHash, points)` を呼ぶ
5. tx_hash を受け取り、DB更新

   * `receipt_status='submitted'`
   * `tx_hash=...`
   * `submitted_at=now()`
   * `tx_error=null`

### 8.3 例外処理

* `AlreadyRecorded(anchorHash)` revert の場合

  * `isRecorded(anchorHash)` を call して true なら

    * `receipt_status='confirmed'`
    * `confirmed_at=now()`
    * `fail_reason='already_recorded'`（情報として残す）
* ネットワークエラー / gas / nonce 等

  * `receipt_status='failed'`
  * `retry_count += 1`
  * `next_attempt_at = now() + backoff(retry_count)`
  * `tx_error` にエラー概要（長文は避ける）

バックオフ例（指数）

* `delay = min(2^retry_count minutes, 60 minutes)`

---

## 9. 確認フェーズ（chain-worker-confirm）

### 9.1 対象

* `receipt_status='submitted'`
* `tx_hash is not null`
* `confirmed_at is null`

### 9.2 ロジック

1. `eth_getTransactionReceipt(tx_hash)` を取得
2. 取得できない（pending）場合：何もしない（次回へ）
3. receipt.status==1：

   * `receipt_status='confirmed'`
   * `confirmed_at=now()`
4. receipt.status==0：

   * `receipt_status='failed'`
   * `retry_count += 1`
   * `next_attempt_at=now()+backoff`
   * `tx_error='tx_reverted'` など

---

## 10. Supabase での定期実行（具体）

### 10.1 方針

* `pg_cron` で定期実行
* `pg_net` で Edge Function を HTTP 呼び出し

Supabaseは「Scheduling Edge Functions」を `pg_cron` と `pg_net` の組み合わせで実現することを明記している。 ([Supabase][1])

### 10.2 例（概念SQL：cron登録）

※実際のSQLはプロジェクトURL/認証ヘッダ管理（Vault等）に合わせて調整する。

* submit：毎分 `chain-worker-submit` を叩く
* confirm：毎分 `chain-worker-confirm` を叩く

（Vaultにシークレットを置く運用が推奨されている） ([Supabase][1])

---

## 11. セキュリティ（鍵管理）

### 11.1 Issuer鍵（最重要）

* `ISSUER_PRIVATE_KEY` は **Edge FunctionのSecrets/Vault** にのみ保持
* DBに保存しない
* クライアントに絶対に出さない

### 11.2 権限（コントラクト）

* `recordReceipt` は `onlyIssuer`
* issuerアドレスはホテル運用者（またはプラットフォーム運営者）に限定
* MVPでも owner/role 管理は必須（雑に公開すると荒らされる）

---

## 12. 監視・運用

### 12.1 監視指標（最低限）

* `receipt_status` 別件数（queued/submitted/confirmed/failed）
* `failed` の retry_count 分布
* tx 失敗率（failed / submitted）
* 平均確定時間（confirmed_at - created_at）

### 12.2 アラート（最低限）

* `queued` が一定時間（例：10分）以上滞留
* `failed` が一定回数（例：retry_count>=5）を超える
* RPCノードエラー率が上がる

---

## 13. テスト観点（具体）

### 13.1 正常系

* checkout → chain_receipt queued作成
* worker-submit → tx送信・submittedへ
* worker-confirm → confirmedへ

### 13.2 異常系（必須）

* RPCエラーで送信失敗 → failed + backoff
* tx revert（AlreadyRecorded）→ confirmed（already_recorded扱い）
* tx revert（その他）→ failed + backoff
* ノンス競合（並列実行）→ 片方失敗 → リトライで回復

---

## 14. 実装メモ（MVP推奨の最小セット）

1. コントラクト：ReceiptRegistry（上記）を Fuji にデプロイ
2. Checkout RPC：`chain_receipt` を queued 作成（anchor_hash含む）
3. Worker-submit：queued→submitted（tx_hash保存）
4. Worker-confirm：submitted→confirmed/failed
5. Cron：毎分 submit/confirm を起動

これで「チェックアウト時にオンチェーン証跡が残る」まで到達する。

---

```
::contentReference[oaicite:5]{index=5}
```

[1]: https://supabase.com/docs/guides/functions/schedule-functions?utm_source=chatgpt.com "Scheduling Edge Functions | Supabase Docs"
