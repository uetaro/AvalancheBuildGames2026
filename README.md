# Heartel

## English

Heartel is a hospitality MVP that turns a guest's "thank you" into portable `career evidence` for hotel staff.  
Guests can send Kudos during their stay, staff can turn that recognition into visible career value, operators can manage both hotel operations and talent flows, and key events are anchored on Avalanche Fuji for later verification.

## Quick Review Guide

For technical review, these are the fastest entry points.

If you want the exact hands-on walkthrough, see `Recommended Demo Flow` below. It explains step by step how to operate the ops screen, guest flow, and staff mobile flow in the intended review order.

- **Public GitHub repository**: this repository
- **Live MVP site**: [https://d1zjxii34l6keu.cloudfront.net/](https://d1zjxii34l6keu.cloudfront.net/)
- **Mobile preview**: [https://d1zjxii34l6keu.cloudfront.net/preview](https://d1zjxii34l6keu.cloudfront.net/preview)
- **Verified smart contract (Sourcify)**: [ReceiptRegistry on Fuji](https://repo.sourcify.dev/43113/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67)
- **Explorer link (Snowtrace Fuji)**: [0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67](https://testnet.snowtrace.io/address/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67?chainId=43113)

## Why Heartel

In hospitality, meaningful guest appreciation often disappears as verbal feedback or one-time survey comments. Heartel is designed to change that.

- Turn guest appreciation into immediate and specific Kudos
- Turn staff performance into visible career data
- Turn service activity into operational insight for hotels
- Turn key recognition events into verifiable records on Avalanche

## What You Can Experience

This MVP includes three hands-on surfaces.

- **Guest Mobile**
  - Start a lightweight guest flow from the room-card entry concept
  - Browse on-duty staff and send Kudos
  - Experience AI moderation before submission
- **Staff Mobile**
  - Log in and view work status, Kudos, points, profile, and Career History
  - Check affiliation history and on-chain verification
  - Use AI career support
- **Staff Web / Ops Dashboard**
  - Manage rooms, cards, and stays
  - Operate guest check-in / check-out
  - Review and approve affiliation requests
  - View analytics

## Live MVP Access

### Web / Mobile URLs

- **Ops dashboard**: [https://d1zjxii34l6keu.cloudfront.net/](https://d1zjxii34l6keu.cloudfront.net/)
- **2-device mobile preview**: [https://d1zjxii34l6keu.cloudfront.net/preview](https://d1zjxii34l6keu.cloudfront.net/preview)

### How To Read The Preview

- `preview` shows two mobile apps side by side
- **Left** is `Staff Mobile`
- **Right** is `Guest Mobile`

### Access Notes

- **Guest Mobile** does not require login
- **Staff Mobile / Staff Web** use Supabase Auth accounts
- For local reproduction, `schema.sql` includes an initial operator record with `operator@example.com`
- The actual login password must be created and managed in Supabase Auth

## Recommended Demo Flow

This is the easiest end-to-end review path for judges and operators.

1. Open `preview` and confirm that the **left side is Staff Mobile** and the **right side is Guest Mobile**
2. In **Staff Web / Ops Dashboard**, start with check-in:
   - drag the card for room `401` onto the `401` room slot
   - this binds the card to room `401`
   - in the actual product, the guest would then tap the NFC card with a phone to verify and enter the guest flow
   - for this review, since the physical card cannot be handed over, simply press the yellow **Continue as Guest** button
3. In **Guest Mobile**, press **Send Kudos**
   - the screen will show staff currently on duty
   - for this demo, choose **Avax**
   - select a category and enter a message
   - the moderation model is intentionally strict: only concrete and positive messages are accepted with a score-based check
   - if you try vague or negative text, it may be rejected, which is also part of the intended demo
4. After the message passes moderation, move to **Staff Mobile**
   - log in as `avax@testuser.com`
   - password: `Password`
   - open the **Kudos** tab from the bottom navigation
   - confirm that the Kudos you just sent is visible there
5. Open the Kudos detail on **Staff Mobile**
   - you can confirm that the record is linked to on-chain verification
   - the top-right area shows the current status
   - that status does **not** become final until the guest checks out
6. Go back to **Staff Web / Ops Dashboard**
   - check out room `401` using the **Check-out** button
   - after check-out, the status changes and the Kudos is treated as finalized correctly
7. If needed, continue from the UI to the explorer links and verify the Avalanche-side proof

### User Flow Board

For a higher-level operational view, the Figma board below summarizes the major use-case flows across the MVP:

- guest check-in / check-out
- staff work check-in / check-out
- Kudos submission

Figma flow board: [Heartel user flow board](https://www.figma.com/board/NsSJBjYQc09JJugpI3n44T/%E7%84%A1%E9%A1%8C?node-id=0-1&t=uLwziHayZxXeW7Oc-1)

## Full User Journeys

### A. Guest Flow

1. The guest enters the guest flow by tapping a room card
2. The system verifies the active stay linked to that card
3. A `guest_session` is issued so the guest can continue with a lightweight token
4. The guest sees staff currently on duty at the hotel they are staying in
5. The guest selects a staff member and sends Kudos
6. The guest enters a category and free-text message
7. AI moderation checks the content
8. If approved, the system stores Kudos and creates a `chain_receipt` in `queued` status
9. The UI returns a completion state and remaining quota
10. A background worker sends the record to Avalanche and verification appears later

### B. Staff Flow

1. Staff log in
2. Staff check in / out using the NFC work tag flow
3. Staff review received Kudos
4. Staff view point balance and history
5. Staff use AI career support
6. Staff open the Career History screen to view affiliation history and on-chain verification
7. Recorded transactions can be opened in an explorer from the UI

### C. Ops / Manager Flow

1. The operator logs into the management dashboard
2. They manage rooms, cards, and stays
3. They run guest check-in / check-out operations
4. They review affiliation requests
5. On approval, `company_member` is created or updated
6. At the same time, `chain_affiliation` is queued
7. A worker executes `recordAffiliation`
8. Staff can later see proof that they belonged to that company

## What Ops Can Actually Do

This README is intended to make operator actions clear as well.

- **Stay operations**
  - guest check-in / check-out
  - room and card binding management
  - active stay tracking
- **People operations**
  - affiliation request review and approval / rejection
  - company member creation and updates
  - staff information review
- **Visibility**
  - analytics for Kudos and usage activity
  - visibility into staff activity and recognition
- **Verification**
  - status review of on-chain Kudos / affiliation proofs

Heartel is not just a compliment app. It is an MVP that connects **operations, people management, and verifiable proof** in one product.

## Why The Architecture Looks Like This

### Why three separate frontends

- Guest, staff, and operator roles have very different goals, permissions, and interaction density
- Guests need minimal friction
- Staff need a mobile-first daily-use experience
- Operators need a web dashboard optimized for management actions

### Why a unified backend API

- For an MVP, delivery speed and maintainability matter
- A single unified API with `guest / staff / ops / chain worker` domains is easier to reason about than fragmented functions
- It centralizes CORS, authentication, logging, and shared client creation

### Why on-chain processing is asynchronous

- Waiting for blockchain submission during Kudos posting would make the UX too heavy
- So the system saves to the DB first, queues `chain_receipt` / `chain_affiliation`, and lets a worker submit asynchronously
- This balances **fast UX** with **verifiable proof**

### Why personal data is not written directly on-chain

- Company IDs, user IDs, and message bodies are not stored directly on-chain
- The system stores proof using `anchor_hash`, `company_hash`, and `staff_hash`
- On-chain is the **proof layer**, while off-chain is the **operations layer**

## System Architecture

### Main Components

- `10_UI/guest_mobile`
  - guest session entry from the room-card concept
  - staff list
  - Kudos submission
  - AI moderation
- `10_UI/staff_mobile`
  - work status
  - Kudos dashboard
  - point balance
  - Career History
  - AI career support
- `10_UI/staff_web`
  - room management
  - card management
  - stay management
  - affiliation approval
  - analytics
- `50_API/supabase/functions/api`
  - unified API
  - grouped guest / staff / ops / chain worker routes
- `60_AVALANCHE/src/ReceiptRegistry.sol`
  - contract that records Kudos and affiliation proofs

### Representative Data Tables

- `company`, `company_member`, `company_member_request`
- `room`, `card`, `card_room_binding`, `stay`
- `guest_session`
- `kudos`, `kudos_moderation`
- `chain_receipt`, `chain_affiliation`
- `audit_log`
- `point_exchange`

### Data Flow

1. A frontend sends a request to the API
2. The API checks authentication and authorization
3. Postgres stores the normalized business data
4. If the event is eligible, the system creates `chain_receipt` or `chain_affiliation` with `queued` status
5. `pg_cron` triggers worker routes
6. The worker uses `ethers` to submit to Avalanche Fuji
7. The DB is updated with `submitted / confirmed / failed`
8. The UI visualizes that state and exposes explorer links

## Avalanche / Web3 Implementation

Heartel uses Avalanche to make recognition not only visible, but verifiable.

- **Network**: Avalanche Fuji Testnet (`43113`)
- **Smart Contract**: `ReceiptRegistry`
- **Current On-Chain Scope**:
  - Kudos proofs
  - staff affiliation history proofs
- **Verification Model**:
  - queue creation on Kudos / affiliation save
  - worker submission to Avalanche
  - UI-level verification using `tx_hash` and `anchor_hash`

### Verified Contract Links

- **Sourcify**: [ReceiptRegistry verified source](https://repo.sourcify.dev/43113/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67)
- **Snowtrace Fuji**: [Contract explorer page](https://testnet.snowtrace.io/address/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67?chainId=43113)

### Contract Design

- `recordReceipt`
- `recordAffiliation`
- `isRecorded`
- `isAffiliationRecorded`
- idempotent design to prevent duplicates

### Why This Matters

- Kudos does not end as just another DB log
- affiliation history is also elevated into a proof target
- it creates the basis for career evidence that is not trapped inside one hotel

## Technical Stack

### Frontend

- `React 18 + TypeScript + Vite`
- `Tailwind CSS`
- `Radix UI`
- `MUI`
- `lucide-react`
- `motion`
- `lottie-react` for the guest AI check experience

### Backend

- `Supabase Edge Functions + Deno + Hono`
- `Supabase Postgres`
- `Supabase Auth`
- `Supabase Storage`
- `pg_cron` + `pg_net`
- `OpenAI API`

### Blockchain

- `Solidity 0.8.20`
- `OpenZeppelin Ownable`
- `ethers v6`
- Avalanche Fuji target with future subnet-oriented expansion in mind

## Evaluation Criteria Mapping

### Technical Implementation Quality

- separated UIs by role
- unified API with clear guest / staff / ops / chain worker responsibilities
- queue + worker model instead of synchronous on-chain blocking
- duplicate prevention, retry logic, and status transitions
- hash-based proof model without exposing personal data directly on-chain

### Use of Avalanche Technologies

- a Solidity contract deployed for Avalanche Fuji
- a publicly verifiable contract via Sourcify
- verifiable UX through `tx_hash` and `anchor_hash`
- architecture that can evolve toward subnet-like specialization

### MVP Architecture Design

- clear boundaries across `guest_mobile + staff_mobile + staff_web + unified backend + async chain worker + Avalanche`
- designed for practical operations, not just demo-only flows

### UX Design

- low-friction guest experience from the room-card concept
- AI moderation that shapes the experience rather than just rejecting content
- staff-facing self-view through Kudos, points, and Career History
- operator-facing visibility across hotel operations and people management

## Repository Structure

```text
10_UI/
  guest_mobile/
  staff_mobile/
  staff_web/
  deploy/
50_API/
  supabase/functions/api/
60_AVALANCHE/
  src/ReceiptRegistry.sol
  hardhat.config.ts
00_DOCUMENT/
  02_ONCHAIN/
  03_DOCUMENT/
    031_API/
    032_DISPLAY/
  04_DATA/
```

## Related Docs

- `00_DOCUMENT/02_ONCHAIN/flow_and_why.md` - on-chain design intent and judging context
- `00_DOCUMENT/04_DATA/schema.sql` - schema, seed data, and cron setup
- `00_DOCUMENT/03_DOCUMENT/031_API` - detailed API design
- `00_DOCUMENT/03_DOCUMENT/032_DISPLAY` - screen specifications
- Figma workflow board: [Heartel workflow board](https://www.figma.com/board/NsSJBjYQc09JJugpI3n44T/%E7%84%A1%E9%A1%8C?node-id=0-1&t=uLwziHayZxXeW7Oc-1)

## Current MVP Trade-Offs

- end users do not connect wallets directly
- the issuer wallet is server-side
- only minimum hash-based proofs are written on-chain
- asynchronous processing is currently `pg_cron`-based

These are deliberate choices to balance **something people can use now** with **something they can verify later**.

## Future Direction

Heartel is not intended to remain only a Kudos app.  
The direction is a **verifiable career infrastructure** for hospitality talent.

The next directions we are considering include:

- moving from a Fuji MVP toward more production-ready C-Chain / subnet-oriented design
- replacing `pg_cron` with `AWS SQS` or similar for stronger asynchronous reliability
- expanding affiliation into stronger long-term career proof
- using AI for strengths extraction, growth trend analysis, and recommendation drafting
- building a portable career graph across multiple hotels

## Core Message

The most important value of Heartel is this: **turning guest appreciation into proof staff can carry into their future**.  
To do that, the UX stays warm, operations stay practical, and proof is backed by Avalanche.

---

## 日本語

Heartel は、ホテルスタッフの日々のすばらしい接客を、その場限りの「ありがとう」で終わらせず、将来に持ち運べる `career evidence` に変えるホスピタリティ向け MVP です。  
ゲストは滞在中にその場で Kudos を送り、スタッフはその評価を自分の実績として受け取り、運営は現場オペレーションと人材価値の両方を管理できます。重要なイベントは Avalanche Fuji に記録され、後から検証可能です。

## Quick Review Guide

技術審査でまず見てほしいものを、最初にまとめます。

実際の操作手順をそのまま追いたい場合は、この下の `Recommended Demo Flow` を見てください。運営画面、ゲスト側、スタッフ側をどの順にどう触るかを、審査向けの流れで具体的に書いています。

- **Public GitHub repository**: このリポジトリ
- **Live MVP site**: [https://d1zjxii34l6keu.cloudfront.net/](https://d1zjxii34l6keu.cloudfront.net/)
- **Mobile preview**: [https://d1zjxii34l6keu.cloudfront.net/preview](https://d1zjxii34l6keu.cloudfront.net/preview)
- **Verified smart contract (Sourcify)**: [ReceiptRegistry on Fuji](https://repo.sourcify.dev/43113/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67)
- **Explorer link (Snowtrace Fuji)**: [0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67](https://testnet.snowtrace.io/address/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67?chainId=43113)

## Why Heartel

ホテルの現場では、ゲストからの感謝は本来とても価値があるのに、多くが口頭やアンケートで消えてしまいます。Heartel はそこを変えます。

- ゲストの感謝を、即時で具体的な Kudos に変える
- スタッフの実績を、見えるキャリアデータに変える
- ホテル運営の改善に使えるデータに変える
- 重要な承認イベントを、Avalanche 上の検証可能な証跡に変える

## What You Can Experience

この MVP では、以下の 3 つの体験を実際に確認できます。

- **Guest Mobile**
  - ルームカード起点で軽量 guest flow に入る
  - 出勤中スタッフを見て Kudos を送る
  - AI モデレーションで内容チェックを受ける
- **Staff Mobile**
  - ログインして勤務状態、Kudos、ポイント、プロフィール、Career History を見る
  - 自分の所属履歴と on-chain verification を確認する
  - AI career support を使う
- **Staff Web / Ops Dashboard**
  - room / card / stay を管理する
  - guest check-in / check-out を操作する
  - affiliation request を承認する
  - analytics を確認する

## Live MVP Access

### Web / Mobile URLs

- **運営ダッシュボード**: [https://d1zjxii34l6keu.cloudfront.net/](https://d1zjxii34l6keu.cloudfront.net/)
- **モバイル 2 台プレビュー**: [https://d1zjxii34l6keu.cloudfront.net/preview](https://d1zjxii34l6keu.cloudfront.net/preview)

### Preview の見方

- `preview` は 2 台のモバイルを横並びで見せるページです
- **左** が `Staff Mobile`
- **右** が `Guest Mobile`

### Access Notes

- **Guest Mobile** はログイン不要です
- **Staff Mobile / Staff Web** は Supabase Auth のアカウントでログインします
- ローカル再現時は、`schema.sql` に `operator@example.com` の初期オペレーター用レコードがあります
- ただし、**ログインに必要なパスワード自体は Supabase Auth 側で作成・管理** する必要があります

## Recommended Demo Flow

実際に触るときは、次の順番がいちばん分かりやすいです。

1. `preview` を開き、**左が Staff Mobile**、**右が Guest Mobile** であることを確認します
2. まず **Staff Web / 運営画面** でチェックインを行います
   - `401` 号室のカードを `401` 号室の枠にドラッグ&ドロップしてください
   - これでそのカードが `401` 号室に紐づきます
   - 本来は、その後ゲストが NFC カードをスマホにかざすことで検証され、ゲストフローに入れます
   - 今回は実物カードを渡せないため、そのまま黄色い **Continue as Guest** を押してください
3. 次に **Guest Mobile** で **Send Kudos** を押してください
   - 現在勤務中のスタッフが表示されます
   - 今回は **Avax** を選択してください
   - カテゴリーを選び、メッセージを入力してください
   - ここでは「具体的でポジティブなメッセージ」のみをスコアで判定して通す設計にしています
   - 適当な文言やネガティブな文言は弾かれることがあるので、その挙動も確認してみてください
4. 正常に通ったら **Staff Mobile** に移動してください
   - `avax@testuser.com` でログインします
   - パスワードは `Password` です
   - 下部ナビゲーションから **Kudos** を開いてください
   - 先ほど送った Kudos が表示されていることを確認してください
   - オンチェーン記録はキューで非同期処理しているため、反映やステータス更新に少し時間がかかる場合があります
5. その Kudos の詳細を開くと、**オンチェーン上に記録されていること** や **検証導線** を確認できます
   - 右上には現在のステータスが表示されます
   - このステータスは、ユーザーがチェックアウトするまで **確定** にはなりません
6. 最後に **Staff Web / 運営画面** に戻り、最初にチェックインした `401` 号室を **Check-out** ボタンでチェックアウトしてください
   - これによりステータスが変更され、Kudos も正常に **確定** になります
7. 必要に応じて、そのまま UI 上の verification 導線から Avalanche 側の記録も確認できます

### ユースケースフローボード

MVP 全体の業務フローを俯瞰したい場合は、以下の Figma ボードを参照してください。特に次のフローをまとめています。

- check-in / check-out
- 出退勤
- Kudos 送信

Figma フローボード: [Heartel user flow board](https://www.figma.com/board/NsSJBjYQc09JJugpI3n44T/%E7%84%A1%E9%A1%8C?node-id=0-1&t=uLwziHayZxXeW7Oc-1)

## Full User Journeys

### A. Guest Flow

1. ゲストが部屋カードをタップして guest flow に入る
2. システムがそのカードに紐づくアクティブ滞在を確認する
3. `guest_session` を発行し、以後は軽量トークンで操作できる
4. ゲストが宿泊中のホテルに出勤しているスタッフ一覧を見る
5. スタッフを選んで Kudos を送る
6. カテゴリと自由記述メッセージを入力する
7. AI モデレーションが内容をチェックする
8. 問題なければ Kudos を保存し、同時に `chain_receipt` を `queued` で作る
9. UI では送信完了と残り quota を返す
10. 裏側で worker が Avalanche に送信し、後から verification が付く

### B. Staff Flow

1. スタッフがログインする
2. NFC の work tag で出勤・退勤する
3. 自分に届いた Kudos を確認する
4. ポイント残高や履歴を見る
5. AI career support でキャリア相談する
6. Career History 画面で、自分の所属履歴と on-chain verification を見る
7. 実際に記録された transaction はブラウザから explorer へ飛べる

### C. Ops / Manager Flow

1. 管理画面にログインする
2. room, card, stay を管理する
3. guest check-in / check-out を行う
4. affiliation request を確認する
5. 承認時に `company_member` が生成・更新される
6. 同時に `chain_affiliation` が queue 化される
7. worker が `recordAffiliation` を実行する
8. スタッフ側で「この会社に所属していた」という証跡が確認可能になる

## What Ops Can Actually Do

運営側のユースケースが README から伝わるよう、操作対象を明示します。

- **滞在管理**
  - guest check-in / check-out
  - room と card の紐付け管理
  - アクティブ滞在の把握
- **人材管理**
  - affiliation request の確認と承認 / 却下
  - company member の生成・更新
  - スタッフ情報の閲覧
- **可視化**
  - Kudos や利用状況の analytics
  - スタッフの活動・評価を見える化
- **検証**
  - on-chain に送った Kudos / affiliation proof の状態確認

つまり Heartel は、単なる「褒めるアプリ」ではなく、**現場運営・人材管理・証明基盤を 1 つに束ねた MVP** です。

## Why The Architecture Looks Like This

### なぜ 3 つのフロントを分けたか

- ゲスト、スタッフ、運営者では求める操作量・導線・権限がまったく違うためです
- ゲストは friction を極小化したい
- スタッフは日常利用しやすいモバイル UX が必要
- 運営は管理操作が多く、Web ダッシュボードが適しています

### なぜバックエンドを Unified API にしたか

- MVP では開発速度と保守性を優先しました
- Supabase Function を細かく散らすより、1 本の Unified API の中で `guest / staff / ops / chain worker` を分ける方が分かりやすく、共通処理もまとめやすいです
- CORS、認証、ログ、共通クライアント生成を統一できます

### なぜオンチェーン処理を同期にしないか

- ゲストが Kudos を送るたびにチェーン確定を待つと UX が重くなります
- そこで、まず DB に保存し、次に `chain_receipt` / `chain_affiliation` に queue を積み、worker が非同期で Avalanche に送る方式にしています
- これは **投稿体験の軽さ** と **検証可能性** の両立のためです

### なぜ個人情報をそのままチェーンに載せないか

- 会社 ID、ユーザー ID、本文そのものは載せません
- `anchor_hash`、`company_hash`、`staff_hash` のような hash ベースの証跡にしています
- オンチェーンは **証明レイヤー**、オフチェーンは **運用レイヤー** という分担です

## System Architecture

### Main Components

- `10_UI/guest_mobile`
  - ルームカード起点の guest session
  - スタッフ一覧
  - Kudos 投稿
  - AI moderation
- `10_UI/staff_mobile`
  - 出退勤
  - Kudos ダッシュボード
  - ポイント残高
  - Career History
  - AI career support
- `10_UI/staff_web`
  - room 管理
  - card 管理
  - stay 管理
  - affiliation 承認
  - analytics
- `50_API/supabase/functions/api`
  - Unified API
  - guest / staff / ops / chain worker の各ルートを束ねる
- `60_AVALANCHE/src/ReceiptRegistry.sol`
  - Kudos と Affiliation の証跡を記録するコントラクト

### Representative Data Tables

- `company`, `company_member`, `company_member_request`
- `room`, `card`, `card_room_binding`, `stay`
- `guest_session`
- `kudos`, `kudos_moderation`
- `chain_receipt`, `chain_affiliation`
- `audit_log`
- `point_exchange`

### Data Flow

1. フロントエンドから API にリクエストが入る
2. API が認証 / 権限を確認する
3. Postgres に正規データを保存する
4. 対象イベントであれば `chain_receipt` または `chain_affiliation` を `queued` で作成する
5. `pg_cron` が worker route を定期実行する
6. worker が `ethers` を使って Avalanche Fuji に送信する
7. `submitted / confirmed / failed` を DB に反映する
8. UI がその状態を可視化し、explorer への導線を出す

## Avalanche / Web3 Implementation

Heartel は、感謝を「見える」だけでなく **検証できる** ものにするために Avalanche を使っています。

- **Network**: Avalanche Fuji Testnet (`43113`)
- **Smart Contract**: `ReceiptRegistry`
- **Current On-Chain Scope**:
  - Kudos の証跡
  - スタッフ所属履歴（Affiliation）の証跡
- **Verification Model**:
  - Kudos / affiliation の保存時に queue を作成
  - worker が Avalanche に送信
  - `tx_hash` と `anchor_hash` を UI から追える

### Verified Contract Links

- **Sourcify**: [ReceiptRegistry verified source](https://repo.sourcify.dev/43113/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67)
- **Snowtrace Fuji**: [Contract explorer page](https://testnet.snowtrace.io/address/0x4576Ae934Ca08ded60aD94F31b7b4F9545B37a67?chainId=43113)

### Contract Design

- `recordReceipt`
- `recordAffiliation`
- `isRecorded`
- `isAffiliationRecorded`
- duplicate を防ぐ idempotent 設計

### Why This Matters

- Kudos を単なる DB ログで終わらせない
- 会社所属の履歴も証明対象に広げる
- ホテルの中だけに閉じない career evidence の土台を作る

## Technical Stack

### Frontend

- `React 18 + TypeScript + Vite`
- `Tailwind CSS`
- `Radix UI`
- `MUI`
- `lucide-react`
- `motion`
- `lottie-react` for guest AI check experience

### Backend

- `Supabase Edge Functions + Deno + Hono`
- `Supabase Postgres`
- `Supabase Auth`
- `Supabase Storage`
- `pg_cron` + `pg_net`
- `OpenAI API`

### Blockchain

- `Solidity 0.8.20`
- `OpenZeppelin Ownable`
- `ethers v6`
- Avalanche Fuji target, with future subnet-oriented expansion in mind

## Evaluation Criteria Mapping

### Technical Implementation Quality

- 役割別に UI を分離している
- API は統合しつつ、guest / staff / ops / chain worker に責務分離している
- on-chain を同期化せず、queue + worker で扱っている
- duplicate 防止、retry、状態遷移の設計がある
- 個人情報を直接チェーンに載せず、hash ベースにしている

### Use of Avalanche Technologies

- Avalanche Fuji 上で動作する Solidity コントラクトを実装している
- Sourcify で検証済みコントラクトを公開している
- `tx_hash` と `anchor_hash` による verifiable UX を作っている
- 将来的な subnet 的拡張とも相性が良い設計にしている

### MVP Architecture Design

- `guest_mobile + staff_mobile + staff_web + unified backend + async chain worker + Avalanche` という境界が明確です
- 実運用を意識し、業務導線と証跡導線を分離しすぎず接続しています

### UX Design

- ゲストは room card 起点で friction が低い
- AI moderation が rejection だけでなく、柔らかい体験を作る
- スタッフは Kudos、ポイント、Career History を自分軸で見られる
- 運営は現場管理と人材管理を同じ文脈で扱える

## Repository Structure

```text
10_UI/
  guest_mobile/
  staff_mobile/
  staff_web/
  deploy/
50_API/
  supabase/functions/api/
60_AVALANCHE/
  src/ReceiptRegistry.sol
  hardhat.config.ts
00_DOCUMENT/
  02_ONCHAIN/
  03_DOCUMENT/
    031_API/
    032_DISPLAY/
  04_DATA/
```

## Related Docs

- `00_DOCUMENT/02_ONCHAIN/flow_and_why.md` - オンチェーン設計の意図と評価観点
- `00_DOCUMENT/04_DATA/schema.sql` - スキーマ、初期データ、cron 設定
- `00_DOCUMENT/03_DOCUMENT/031_API` - API 詳細設計
- `00_DOCUMENT/03_DOCUMENT/032_DISPLAY` - 画面仕様
- Figma workflow board: [Heartel workflow board](https://www.figma.com/board/NsSJBjYQc09JJugpI3n44T/%E7%84%A1%E9%A1%8C?node-id=0-1&t=uLwziHayZxXeW7Oc-1)

## Current MVP Trade-Offs

- エンドユーザーに wallet 接続は要求していません
- issuer wallet はサーバー側で保持しています
- on-chain には最小限の hash ベース証跡だけを載せています
- 非同期処理は現時点では `pg_cron` ベースです

これは「いま現場で触れること」と「将来の検証可能性」を両立するための割り切りです。

## Future Direction

Heartel は、単なる Kudos アプリで終わるつもりはありません。  
目指しているのは、ホスピタリティ人材のための **verifiable career infrastructure** です。

今後の方向性として考えているのは次の通りです。

- Fuji MVP から、より本番運用に近い C-Chain / subnet 的設計へ進む
- `pg_cron` から `AWS SQS` などへ移行し、より信頼性の高い非同期処理にする
- Kudos だけでなく affiliation をさらに強い career proof に育てる
- AI による強み抽出、成長傾向分析、推薦文生成へ広げる
- 複数ホテル横断で持ち運べる career graph を構築する

## Core Message

Heartel の一番大事な価値は、**ゲストの感謝を、スタッフの将来に持ち運べる証拠に変えること** です。  
そのために、UX は柔らかく、運用は現実的に、証明は Avalanche で担保する。このバランスが Heartel の設計の中心です。
