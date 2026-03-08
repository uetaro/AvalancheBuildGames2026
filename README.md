# Heartel

Heartel is a career-first hospitality MVP designed to help hotel staff build visible, trusted, and portable career value from the great work they do every day. Guests can send real-time "Kudos" to on-duty staff during their stay, hotels gain operational and talent insights, and key recognition events can be anchored on Avalanche.

## Career-First Vision

Heartel starts from one belief: the most important asset in hospitality is the growth of hotel staff careers.

We are building a system where day-to-day guest appreciation does not disappear as temporary feedback, but becomes:

- visible proof of service quality
- reusable career data for staff growth
- trusted records that can be verified beyond a single company

## What It Does

- Guests tap a room card to enter a lightweight guest flow.
- Guests can browse on-duty staff and send a Kudos message with a category.
- Staff can view received Kudos, work status, profile, and point-related screens in a mobile app.
- Hotel operators and managers can manage stays, rooms, cards, affiliation requests, and analytics in a web dashboard.
- Each Kudos can be anchored on Avalanche through an on-chain receipt flow using `ReceiptRegistry` on Fuji testnet.

## Why It Matters

Hospitality staff create meaningful guest experiences every day, but appreciation is often informal, delayed, trapped inside one workplace, or impossible to reuse in a staff member's long-term career story. Heartel is not designed as a negative performance review tool. Instead, it is designed to collect concrete, positive, and memorable guest comments about what was especially great during the stay.

To preserve that quality, the product is designed to accept only specific and positive Kudos through AI-assisted moderation. Over time, these verified Kudos can complement a staff member's traditional resume or work history by adding real examples of hospitality excellence, guest trust, and service strengths.

Heartel turns guest appreciation into:

- immediate, specific, and positive feedback for staff
- reusable career evidence that can complement a traditional resume
- measurable operational insight for hotels
- tamper-resistant proof of recognition using Avalanche

## MVP Scope

This repository contains a functional prototype with:

- `10_UI/guest_mobile` - Guest-facing mobile web app
- `10_UI/staff_mobile` - Staff-facing mobile web app
- `10_UI/staff_web` - Staff and manager operations dashboard
- `50_API/supabase/functions/api` - Unified Supabase Edge Function backend
- `60_AVALANCHE/src/ReceiptRegistry.sol` - Avalanche receipt registry smart contract

## Core User Flows

### Guest Flow

1. Tap room card
2. Verify active stay and create guest session
3. View on-duty staff
4. Send Kudos with category and message
5. Receive confirmation and remaining quota feedback

### Staff Flow

1. Log in
2. Check in/out via work tag
3. View Kudos dashboard and recent recognition
4. Track points and profile information
5. Access AI career support

### Hotel Operations Flow

1. Manage active stays
2. Bind cards to rooms
3. Check guests in and out
4. Review and decide affiliation requests
5. Monitor hotel and member analytics

## Avalanche / Web3 Implementation

Heartel uses Avalanche to make recognition verifiable rather than just visible.

- Network: Avalanche Fuji Testnet (`43113`)
- Smart contract: `ReceiptRegistry`
- Contract role: store receipt anchors for Kudos submissions
- Worker flow: queued receipts are submitted and confirmed asynchronously
- Verification model: a `chain_receipt` is created when Kudos is sent, then anchored on-chain by worker routes

### On-Chain Design

- `public-kudos-send` creates a Kudos record and computes an `anchor_hash`
- `chain_receipt` is created with queued status
- `chain-worker-submit` sends the receipt to Avalanche
- `chain-worker-confirm` confirms transaction finality
- `ReceiptRegistry` prevents duplicate receipt recording through idempotent checks

## Technical Architecture

### Frontend

- React-based guest mobile app
- React-based staff mobile app
- React-based web admin dashboard

### Backend

- Supabase Edge Functions
- Unified Hono API router
- Supabase Auth
- Supabase Postgres
- Supabase Storage

### Smart Contract Layer

- Solidity contract for receipt recording
- Avalanche Fuji testnet deployment target

## Technical Implementation Details

### Backend API Domains

- Ops APIs for check-in, check-out, rooms, cards, members, and analytics
- Staff APIs for work status, Kudos, profile, affiliation, and career chat
- Guest APIs for entry verification, staff list, and Kudos sending
- Chain worker APIs for asynchronous Avalanche submission and confirmation

### Quality / Architecture Decisions

- One unified backend instead of fragmented function entry points
- Clear separation between guest, staff, ops, and chain worker routes
- Asynchronous blockchain submission to keep guest UX responsive
- AI moderation before storing/sending Kudos
- Optimistic locking where needed for review and profile update flows

## Evaluation Criteria Mapping

### Technical Implementation Quality

- Unified API architecture with role-specific route domains
- Async queue-based on-chain submission design
- Authenticated flows for staff/ops and tokenized guest session flow
- Separate frontend surfaces optimized for each user type

### Use of Avalanche Technologies

- Avalanche Fuji smart contract integration
- On-chain receipt anchoring for recognition events
- Explorer-verifiable transaction model through `tx_hash` and `anchor_hash`

### MVP Architecture Design

- Guest mobile + staff mobile + staff web + Supabase backend + Avalanche contract
- Designed as a practical hospitality MVP with production-oriented boundaries

### UX Design

- Lightweight guest flow with minimal friction
- Staff-focused mobile experience for daily usage
- Web dashboard for operational management and analytics

## Project Documentation

- `00_DOCUMENT/03_DOCUMENT/031_API` - API detailed design documents
- `00_DOCUMENT/03_DOCUMENT/032_DISPLAY` - Screen specifications
- `00_DOCUMENT/02_ONCHAIN/flow_and_why.md` - On-chain flow rationale

## Local Development

### UI

Each UI project can be started independently from `10_UI/*`.

### Backend

Use Supabase Edge Functions locally:

```bash
cd 50_API
supabase functions serve api --env-file .env.local
```

### Smart Contract

`ReceiptRegistry.sol` targets Avalanche Fuji for MVP verification.

## Repository Structure

```text
10_UI/
  guest_mobile/
  staff_mobile/
  staff_web/
50_API/
  supabase/functions/api/
60_AVALANCHE/
  src/ReceiptRegistry.sol
00_DOCUMENT/
  03_DOCUMENT/
    031_API/
    032_DISPLAY/
```

## Future Architecture Direction

We chose Avalanche not only because it is practical for MVP verification on Fuji, but because its architecture matches the long-term product direction of Heartel.

What we want to build over time is not just a single app that stores Kudos in one database, but a trusted career infrastructure for hospitality talent. For that goal, the important idea is the Avalanche `subnet` concept.

In this context, a subnet means a dedicated blockchain environment that can be designed for a specific industry or application domain. Instead of putting every future function into one generic public flow, Heartel could eventually run career-related records in a hospitality-focused network design with its own rules, validation model, and data responsibilities. That matters because staff recognition, affiliation history, and career evidence may need a structure that is shared across organizations while still being domain-specific.

Avalanche is a strong fit for that direction because:

- it supports an evolution path from MVP testnet verification to more application-specific network design
- it is suitable for systems that need verifiable records without forcing every product decision into a one-size-fits-all architecture
- it gives us a clear path to anchor important career events on-chain while keeping product logic flexible off-chain
- it makes future interoperability between hotels, operators, and career records easier to reason about than a closed single-company database model

The future direction we are considering includes:

- moving from Fuji-based MVP anchoring toward a subnet-oriented architecture for hospitality career records
- using AWS SQS for more real-time, scalable, and reliable asynchronous on-chain processing than the current cron-style worker approach
- recording not only Kudos receipts but also company-to-staff affiliation relationships on-chain, so a staff member's career history is not limited to one employer's database
- adding AI-powered Kudos analysis to extract concrete strengths, growth trends, recurring praise patterns, and career development signals from guest feedback
- evolving from simple recognition storage into a verifiable career layer for hospitality professionals

Current state: a functional hackathon MVP with core frontend flows, unified backend APIs, and Avalanche-based receipt anchoring as the first implementation step toward that larger career infrastructure.

---

# Heartel

Heartel は、ホテルスタッフのキャリア形成を最重要テーマに据えたホスピタリティ向け MVP です。滞在中のゲストがその場でスタッフへ「Kudos」を送り、その評価をスタッフの成長につながる可視化された実績、ホテル運営の分析データ、そして Avalanche 上の検証可能な証跡へと変換します。

## キャリアファーストの考え方

Heartel が最初に解決したいのは、ホテルスタッフのキャリアが日々の素晴らしい接客に比べて、十分に記録・可視化・証明されていないことです。

私たちは、日々のゲストからの感謝を一時的な感想で終わらせず、次の価値に変えていきたいと考えています。

- スタッフの実力を示す見える実績
- キャリア成長に再利用できるデータ
- 会社をまたいでも信頼できる記録

## できること

- ゲストがルームカードをタップして簡易フローに入る
- 出勤中スタッフを一覧表示し、カテゴリ付きの Kudos メッセージを送る
- スタッフがモバイルアプリで Kudos、勤務状態、プロフィール、ポイント関連情報を確認する
- ホテル運営者・管理者が Web ダッシュボードで滞在、部屋、カード、所属申請、分析を管理する
- Kudos の送信事実を `ReceiptRegistry` により Avalanche Fuji 上へ記録できる

## 解決したい課題

ホテルスタッフへの感謝は、これまで口頭やアンケートに留まりやすく、即時性や検証性がなく、また一つの職場の中だけに閉じがちでした。Heartel は、スタッフをネガティブに評価するための仕組みではなく、「何が特に素晴らしかったのか」を具体的かつポジティブに残すための仕組みとして設計しています。

そのため、AI を用いて、具体性があり前向きな Kudos のみを受け付ける方向で設計しています。こうして蓄積された Kudos は、単なる一時的な称賛ではなく、将来的にはスタッフ本人の従来の経歴書や職務経歴の補足資料として活用されることを想定しています。

Heartel はゲストの感謝を次の価値に変えます。

- スタッフへの即時かつ具体的でポジティブなフィードバック
- 従来の経歴書に補完的に加えられるキャリア実績
- ホテル運営に使える定量データ
- Avalanche による改ざん耐性のある証跡

## MVP の範囲

このリポジトリには、以下を含む機能プロトタイプが入っています。

- `10_UI/guest_mobile` - ゲスト向けモバイル Web
- `10_UI/staff_mobile` - スタッフ向けモバイル Web
- `10_UI/staff_web` - スタッフ / 管理者向け運用ダッシュボード
- `50_API/supabase/functions/api` - 統合 Supabase Edge Function バックエンド
- `60_AVALANCHE/src/ReceiptRegistry.sol` - Avalanche 用レシート登録コントラクト

## 主要ユーザーフロー

### ゲストフロー

1. ルームカードをタップ
2. アクティブ滞在を検証し、ゲストセッションを生成
3. 出勤中スタッフを表示
4. カテゴリとメッセージ付きで Kudos を送信
5. 送信完了と残り送信可能数を確認

### スタッフフロー

1. ログイン
2. 勤務タグで出退勤
3. Kudos ダッシュボードで評価を確認
4. ポイントやプロフィール情報を確認
5. AI キャリア支援を利用

### ホテル運営フロー

1. 滞在を管理
2. カードと部屋を紐付け
3. チェックイン / チェックアウトを実施
4. 所属申請を承認 / 却下
5. ホテル全体・個人別の分析を確認

## Avalanche / Web3 実装

Heartel は、感謝の可視化だけでなく、検証可能性を実現するために Avalanche を利用しています。

- 対応ネットワーク: Avalanche Fuji Testnet (`43113`)
- コントラクト: `ReceiptRegistry`
- 役割: Kudos 送信時のレシートアンカーをオンチェーンに保存
- ワーカーフロー: キュー化したレシートを非同期に送信・確認
- 検証モデル: Kudos 送信時に `chain_receipt` を作成し、ワーカー経由でオンチェーンへ記録

### オンチェーン設計

- `public-kudos-send` で Kudos を作成し、`anchor_hash` を計算
- `chain_receipt` を queued 状態で登録
- `chain-worker-submit` が Avalanche へ送信
- `chain-worker-confirm` がトランザクション確定を確認
- `ReceiptRegistry` で同一レシートの二重記録を防止

## 技術アーキテクチャ

### フロントエンド

- React ベースのゲスト向けモバイルアプリ
- React ベースのスタッフ向けモバイルアプリ
- React ベースの Web 管理ダッシュボード

### バックエンド

- Supabase Edge Functions
- Hono による統合 API ルーター
- Supabase Auth
- Supabase Postgres
- Supabase Storage

### スマートコントラクト層

- レシート記録用 Solidity コントラクト
- Avalanche Fuji へのデプロイを想定

## 技術実装のポイント

### バックエンド API の責務分割

- Ops API: チェックイン、チェックアウト、部屋、カード、メンバー、分析
- Staff API: 勤務状態、Kudos、プロフィール、所属申請、キャリアチャット
- Guest API: 入室検証、スタッフ一覧、Kudos 送信
- Chain Worker API: Avalanche への非同期送信と確認

### 設計上の工夫

- 分散していた関数群を 1 本の統合バックエンドへ整理
- guest / staff / ops / chain worker ごとの明確な責務分離
- ゲスト UX を阻害しない非同期ブロックチェーン送信
- Kudos 保存前の AI モデレーション
- 審査や更新系フローでの楽観ロック採用

## Evaluation Criteria への対応

### Technical implementation quality

- ロール別に整理された統合 API アーキテクチャ
- キューを用いた非同期オンチェーン送信
- スタッフ / 管理者認証とゲストセッションの分離
- 利用者ごとに最適化した 3 つのフロントエンド

### Use of Avalanche technologies

- Avalanche Fuji 上のスマートコントラクト連携
- Kudos イベントのオンチェーンアンカー化
- `tx_hash` と `anchor_hash` による検証可能モデル

### MVP architecture design

- guest mobile + staff mobile + staff web + Supabase backend + Avalanche contract の構成
- 実運用を見据えた責務分離と導線設計

### UX design

- ゲスト向けはカードタップ起点の低摩擦フロー
- スタッフ向けは日常業務に寄せたモバイル体験
- 運営者向けは管理・分析に特化した Web 画面

## 関連ドキュメント

- `00_DOCUMENT/03_DOCUMENT/031_API` - API 詳細設計書
- `00_DOCUMENT/03_DOCUMENT/032_DISPLAY` - 画面仕様書
- `00_DOCUMENT/02_ONCHAIN/flow_and_why.md` - オンチェーン設計の意図

## ローカル開発

### UI

各 UI は `10_UI/*` 配下で個別に起動できます。

### バックエンド

Supabase Edge Functions をローカル実行します。

```bash
cd 50_API
supabase functions serve api --env-file .env.local
```

### スマートコントラクト

`ReceiptRegistry.sol` は MVP 検証用として Avalanche Fuji をターゲットにしています。

## リポジトリ構成

```text
10_UI/
  guest_mobile/
  staff_mobile/
  staff_web/
50_API/
  supabase/functions/api/
60_AVALANCHE/
  src/ReceiptRegistry.sol
00_DOCUMENT/
  03_DOCUMENT/
    031_API/
    032_DISPLAY/
```

## 今後のアーキテクチャ構想

Heartel が Avalanche を採用している理由は、単に Fuji 上で MVP を動かしやすいからではありません。Heartel の将来像が、単なるアプリではなく、ホテルスタッフのキャリアを支える「信頼できる記録基盤」にあるためです。その方向性と Avalanche の設計思想が合っていると考えています。

ここで重要になるのが `subnet` という考え方です。subnet とは、特定の業界や用途に合わせて設計できる専用のブロックチェーン環境の考え方です。Heartel の場合、将来的にはホスピタリティ業界に特化した形で、Kudos、所属履歴、実績証明のようなキャリア関連データを扱うためのネットワーク設計へ発展させることを想定しています。つまり、汎用的な 1 本の公開チェーンの使い方だけではなく、「ホテルスタッフのキャリア記録」という用途に合ったルールや責務を持つ基盤へ拡張できる余地があることが重要です。

Avalanche を使う理由は主に以下です。

- MVP 段階では Fuji で検証しつつ、将来はより用途特化のネットワーク設計へ発展できること
- 重要なキャリアイベントだけをオンチェーンで検証可能にし、その他のプロダクトロジックは柔軟にオフチェーンで構成できること
- 一社の閉じた DB に閉じず、ホテル・運営会社・スタッフをまたいだ実績証明のあり方を考えやすいこと
- 「感謝の記録」を将来的に「キャリアの証明」へ育てていくための拡張性があること

今後検討している構成は以下です。

- Fuji 上の MVP 検証から発展し、Avalanche の subnet 概念を活かしたホスピタリティ向けキャリア記録基盤へ移行する
- 現在の cron ベースの非同期処理に加え、AWS SQS を使うことで、よりリアルタイムかつスケーラブルで信頼性の高いオンチェーン処理へ移行する
- Kudos の受領証だけでなく、会社とスタッフの所属関係そのものもオンチェーンに記録し、キャリア履歴を一社の DB に閉じない形にする
- AI による Kudos 分析を導入し、ゲストコメントからスタッフの強み、成長傾向、繰り返し評価される特徴、キャリア開発の示唆を抽出できるようにする
- 単なる感謝データの保存ではなく、ホテルスタッフのための検証可能なキャリアレイヤーへ進化させる

現時点では、その第一歩として、主要フロントエンド導線、統合バックエンド API、Avalanche を用いたレシートアンカー基盤を備えたハッカソン向け機能プロトタイプを実装しています。
