# オンチェーン運用の流れと「なぜ必要か」

## 1. なぜオンチェーンに記録するのか

- **目的**: Kudos の「送信事実」を**改ざんしづらい形**で残す。
- オフチェーン（DB）だけだと、管理者が後からレコードを書き換える余地がある。
- ブロックチェーンに「anchor_hash」を載せておくと、「この Kudos はこの時点で送信された」という証跡が第三者でも検証できる。
- 本文や個人情報は載せず、**証跡用のハッシュとポイントだけ**をオンチェーンに載せる。

---

## 2. なぜ「送信した瞬間」にキューに入れるのか（Option B）

- チェックアウトまで待つと、その間に DB の Kudos やポイントをいじる「改ざんの窓」が開く。
- そこで **送信した瞬間に**「この Kudos をオンチェーンに載せる」ことを約束（キューに 1 件入れる）する設計にした。
- キューに入れるだけなら速いので、ゲストのリクエストはすぐ返せる。

---

## 3. なぜ「その場でブロックチェーンに送信」しないのか

- ブロックチェーンへの送信は **数秒〜十数秒** かかることがある。
- RPC が混雑したり落ちたりすると、Kudos 送信 API が長く待たされたり、タイムアウトしたりする。
- ゲストには「送信できました」とすぐ返したいので、**その場ではキューに入れるだけ**にして、実際の送信は **別の処理（worker）** に任せる。

---

## 4. 運用の流れ（誰が・いつ・何をするか）

```
[ゲスト] Kudos 送信
    ↓
[API] ・Kudos を DB に保存
      ・chain_receipt を 1 件追加（receipt_status = queued）
      ・「送信できました」を返す
    ↓
[pg_cron] 定期的に chain-worker-submit を呼ぶ（例: 5分ごと）
    ↓
[chain-worker-submit] ・queued の chain_receipt を最大5件取得
                      ・Avalanche に recordReceipt(anchor_hash, points) を送信
                      ・tx_hash を保存し、receipt_status = submitted に更新
    ↓
[pg_cron] 定期的に chain-worker-confirm を呼ぶ（例: 5分ごと）
    ↓
[chain-worker-confirm] ・submitted の chain_receipt を最大10件取得
                       ・各 tx_hash がブロックに載ったか RPC で確認
                       ・載っていたら receipt_status = confirmed、confirmed_at をセット
                       ・revert していたら failed にしてリトライ用に next_attempt_at をセット
```

- **ゲスト**は「送信」した時点で完了。オンチェーンは裏で進む。
- **worker**は「キューを消化する役」と「確定を確認する役」の 2 段階。

---

## 5. なぜ submit と confirm の 2 段階か

- ブロックチェーンに Tx を投げると、まず **tx_hash** が返る（送信はできた）。
- 実際に **ブロックに載って確定**するのは、もう少し時間がかかる。
- なので
  - **submit**: 「送信した」までを担当（queued → submitted）
  - **confirm**: 「ブロックに載って確定したか」を後から確認（submitted → confirmed / failed）
- 2 段階に分けることで、送信と確定を分けて管理し、失敗時はリトライや failed 更新がしやすい。

---

## 6. まとめ（「その機能」が必要な理由）

| 役割 | 必要な理由 |
|------|------------|
| **キュー（chain_receipt queued）** | 送信リクエストをすぐ返しつつ、オンチェーン送信は後でまとめて・安全にやりたいから。 |
| **chain-worker-submit** | キューに溜まった「載せたいレシート」を、実際にブロックチェーンに送るため。 |
| **chain-worker-confirm** | 送った Tx が本当にブロックに載ったかを確認し、DB を「確定」か「失敗」で更新するため。 |
| **pg_cron** | submit / confirm を**定期的に**実行するためのトリガー。手動で叩かずに運用するため。 |

「送信した瞬間に証跡を約束する（キューに入れる）」＋「送信・確定は非同期で確実にやる（worker＋cron）」という仕様・運用の流れになっている。

---

## 7. Affiliation（所属）もオンチェーンに記録する理由

### なぜ所属関係を記録するのか

- キャリア証明の根幹：「この人はこの会社で働いていた」という事実は、履歴書のベースになる。
- DB だけでは、管理者が後から「在籍していなかった」と書き換えられる余地がある。
- ブロックチェーンに「所属開始」の証跡を載せておけば、**第三者が検証可能な職歴証明**になる。
- 本人情報は載せず、**ハッシュ（company_hash, staff_hash）だけ**をオンチェーンに記録する。

### 何を記録するのか

| フィールド | 内容 |
|-----------|------|
| **anchorHash** | `keccak256(affiliation:{company_member_id}:{company_id}:{user_id})` — 一意な所属証跡ハッシュ |
| **companyHash** | `keccak256(company_id)` — 会社を特定するハッシュ |
| **staffHash** | `keccak256(user_id)` — スタッフを特定するハッシュ |

### 運用の流れ

```
[マネージャー] Affiliation リクエストを承認
    ↓
[API] ・company_member を作成（or 再有効化）
      ・chain_affiliation を 1 件追加（receipt_status = queued）
      ・承認完了レスポンスを返す
    ↓
[pg_cron] 定期的に chain-worker-affiliation-submit を呼ぶ（5分ごと）
    ↓
[chain-worker-affiliation-submit]
      ・queued の chain_affiliation を最大5件取得
      ・Avalanche に recordAffiliation(anchor_hash, company_hash, staff_hash) を送信
      ・tx_hash を保存し、receipt_status = submitted に更新
    ↓
[pg_cron] 定期的に chain-worker-affiliation-confirm を呼ぶ（5分ごと）
    ↓
[chain-worker-affiliation-confirm]
      ・submitted の chain_affiliation を最大10件取得
      ・各 tx_hash がブロックに載ったか確認
      ・載っていたら confirmed、revert していたら failed
```

### Kudos との違い

| 項目 | Kudos Receipt | Affiliation |
|------|--------------|-------------|
| **トリガー** | ゲストが Kudos を送信した瞬間 | マネージャーが所属リクエストを承認した瞬間 |
| **記録内容** | anchorHash + points | anchorHash + companyHash + staffHash |
| **用途** | 「この感謝は確かに送られた」の証明 | 「この人はこの会社に所属していた」の証明 |
| **キャリアへの影響** | Kudos 履歴の信頼性担保 | 職歴そのものの信頼性担保 |

### 検証シナリオ

1. スタッフが転職先に「自分はこのホテルで働いていた」と主張
2. 転職先が `anchorHash` を使い `getAffiliation()` をコントラクトに問い合わせ
3. `companyHash` と `staffHash` が一致すれば、ブロックチェーン上で所属が証明される
4. `affiliatedAt` のタイムスタンプで「いつから所属していたか」も検証可能
