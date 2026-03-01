# 共通ルール（全テーブル）

* PK：uuid（`gen_random_uuid()` 想定）
* 時刻：`timestamptz`
* 楽観ロック：`version integer not null default 1`（更新時 `WHERE ... AND version=?`、成功時 `version=version+1`）
* `created_at`, `updated_at`：`default now()`（更新時は `updated_at=now()` を推奨）

---

## 1. user（ユーザー）

| 英名           | 日本語名        | キー | 参照キー | 型           | NULL許容 | 説明（詳しく）                           | 備考                                                  |
|----------------|-----------------|-----|----------|--------------|----------|-----------------------------------------|-------------------------------------------------------|
| user_id        | ユーザーID      | PK  |          | uuid         | NO       | 内部主キー                               |                                                       |
| cognito_sub    | Cognito sub     | UK  |          | text         | NO       | Cognito JWTの`sub`（一意）               | unique必須                                            |
| email          | メール          |     |          | text         | YES      | 連絡先（同期用）                         | MVP任意                                               |
| phone          | 電話            |     |          | text         | YES      | 電話（E.164推奨）                        | MVP任意                                               |
| display_name   | 表示名          |     |          | text         | YES      | 表示用の名前                             | 会社内表示は `company_member.display_name_override` で上書き可 |
| user_type      | ユーザー種別    |     |          | text         | NO       | `employee/staff/manager/operator`       | 実権限はCognito Group＋company_memberで担保           |
| version        | バージョン      |     |          | integer      | NO       | 楽観ロック                               | default 1                                             |
| created_at     | 作成日時        |     |          | timestamptz  | NO       | 作成                                    | default now()                                         |
| updated_at     | 更新日時        |     |          | timestamptz  | NO       | 更新                                    | default now()                                         |

推奨制約：`unique(cognito_sub)`

---

## 2. company（会社/ホテル）

| 英名                      | 日本語名     | キー | 参照キー | 型            | NULL許容 | 説明（詳しく）              | 備考                           |
|---------------------------|--------------|-----|----------|---------------|----------|-----------------------------|--------------------------------|
| company_id                | 会社ID       | PK  |          | uuid          | NO       | ホテル運用主体の主キー      |                                |
| company_name              | 会社名       |     |          | text          | NO       | 表示名                      |                                |
| company_slug              | 会社スラッグ | UK  |          | text          | YES      | URL用識別子                 | あるならunique推奨             |
| company_homepage_url      | 公式HP URL   |     |          | text          | YES      | HP用URL                     |                                |
| company_overview           | 概要         |     |          | text          | YES      | 会社/ホテル説明             |                                |
| company_logo_url           | ロゴ画像URL  |     |          | text          | YES      | ロゴ（S3/CDNのURL）         | DBに画像は入れない             |
| company_cover_image_url   | カバー画像URL|     |          | text          | YES      | カバー画像URL               |                                |
| company_images_json       | 画像一覧     |     |          | jsonb         | YES      | 追加画像等の拡張枠          |                                |
| company_country           | 国           |     |          | text          | YES      | 国名                        |                                |
| company_country_code      | 国コード     |     |          | text          | YES      | ISO 3166-1                  | 例：JP                         |
| company_region            | 都道府県/州  |     |          | text          | YES      | 地域                        |                                |
| company_city              | 市区町村     |     |          | text          | YES      | 市区町村                    |                                |
| company_address_line1    | 住所1        |     |          | text          | YES      | 番地等                      |                                |
| company_address_line2    | 住所2        |     |          | text          | YES      | 建物名等                    |                                |
| company_postal_code      | 郵便番号     |     |          | text          | YES      | 郵便番号                    |                                |
| company_latitude          | 緯度         |     |          | numeric(9,6)  | YES      | 緯度                        |                                |
| company_longitude         | 経度         |     |          | numeric(9,6)  | YES      | 経度                        |                                |
| timezone                  | タイムゾーン |     |          | text          | NO       | 例：Asia/Tokyo              |                                |
| company_status            | 状態         |     |          | text          | NO       | `active/suspended` 等      | suspendedは運用停止（ログイン/運用API制限） |
| version                   | バージョン   |     |          | integer       | NO       | 楽観ロック                  |                                |
| created_at                | 作成日時     |     |          | timestamptz   | NO       |                             |                                |
| updated_at                | 更新日時     |     |          | timestamptz   | NO       |                             |                                |

---

## 3. company_group（会社グループ/チェーン）

| 英名                            | 日本語名       | キー | 参照キー | 型           | NULL許容 | 説明（詳しく）              | 備考           |
|---------------------------------|----------------|-----|----------|--------------|----------|-----------------------------|----------------|
| company_group_id                | 会社グループID | PK  |          | uuid         | NO       | チェーン/運営グループ主キー |                |
| company_group_name              | グループ名     |     |          | text         | NO       | 表示名                      |                |
| company_group_slug              | グループスラッグ| UK  |          | text         | YES      | URL用識別子                 | あるならunique推奨 |
| company_group_homepage_url      | グループHP URL |     |          | text         | YES      | 公式HP                      |                |
| company_group_overview          | 概要           |     |          | text         | YES      | グループ説明                |                |
| company_group_logo_url           | ロゴ画像URL    |     |          | text         | YES      | ロゴURL                     |                |
| company_group_cover_image_url   | カバー画像URL  |     |          | text         | YES      | カバーURL                   |                |
| company_group_images_json       | 画像一覧       |     |          | jsonb        | YES      | 追加画像等                  |                |
| company_group_country           | 国             |     |          | text         | YES      | 国名                        | 任意           |
| company_group_country_code      | 国コード       |     |          | text         | YES      | ISO 3166-1                  |                |
| company_group_region            | 都道府県/州    |     |          | text         | YES      | 地域                        |                |
| company_group_city              | 市区町村       |     |          | text         | YES      | 市区町村                    |                |
| timezone                        | タイムゾーン   |     |          | text         | NO       | 基準TZ                      |                |
| company_group_status            | 状態           |     |          | text         | NO       | `active/suspended` 等       |                |
| version                         | バージョン     |     |          | integer      | NO       | 楽観ロック                  |                |
| created_at                      | 作成日時       |     |          | timestamptz  | NO       |                             |                |
| updated_at                      | 更新日時       |     |          | timestamptz  | NO       |                             |                |

---

## 4. company_group_company（会社グループ所属）

| 英名                       | 日本語名     | キー | 参照キー                           | 型           | NULL許容 | 説明（詳しく）        | 備考                            |
|----------------------------|--------------|-----|------------------------------------|--------------|----------|------------------------|---------------------------------|
| company_group_company_id   | グループ所属ID| PK  |                                    | uuid         | NO       | 所属関係主キー         |                                 |
| company_group_id           | 会社グループID| FK  | company_group.company_group_id     | uuid         | NO       | 所属先グループ         |                                 |
| company_id                 | 会社ID       | FK  | company.company_id                 | uuid         | NO       | 所属する会社           |                                 |
| membership_status         | 所属状態     |     |                                    | text         | NO       | `active/ended`         | 同時所属制約は運用方針で決める   |
| joined_at                 | 所属開始日時 |     |                                    | timestamptz  | NO       | 所属開始               |                                 |
| ended_at                  | 所属終了日時 |     |                                    | timestamptz  | YES      | 離脱日時               | `membership_status=ended`でセット |
| is_primary                | 主所属       |     |                                    | boolean      | NO       | 複数所属許容時の主所属 | 単一所属運用なら常にtrue         |
| note                      | 備考         |     |                                    | text         | YES      | 統合/M&A等のメモ       |                                 |
| version                   | バージョン   |     |                                    | integer      | NO       | 楽観ロック             |                                 |
| created_at                | 作成日時     |     |                                    | timestamptz  | NO       |                        |                                 |
| updated_at                | 更新日時     |     |                                    | timestamptz  | NO       |                        |                                 |

推奨制約（単一グループ同時所属にするなら）：`partial unique(company_id) where membership_status='active'`

---

## 5. company_member（所属/会社メンバー）

| 英名                    | 日本語名     | キー | 参照キー               | 型           | NULL許容 | 説明（詳しく）                  | 備考                               |
|-------------------------|--------------|-----|-------------------------|--------------|----------|---------------------------------|------------------------------------|
| company_member_id       | 所属ID       | PK  |                        | uuid         | NO       | 所属主キー                      |                                    |
| company_id              | 会社ID       | FK  | company.company_id      | uuid         | NO       | 所属先                          |                                    |
| user_id                 | ユーザーID   | FK  | user.user_id            | uuid         | NO       | 所属ユーザー                    |                                    |
| member_role             | ロール       |     |                        | text         | NO       | `employee/staff/manager`       | Cognito Groupと整合                 |
| member_status           | 所属状態     |     |                        | text         | NO       | `pending/active/ended`         | endedは在籍終了                     |
| job_title               | 職種         |     |                        | text         | YES      | 職種/部門                      | スタッフ一覧の表示・フィルタ        |
| display_name_override   | 会社内表示名 |     |                        | text         | YES      | 会社内呼称                      |                                    |
| public_profile_json     | 公開プロフィール|    |                        | jsonb        | YES      | 経歴/資格/言語など              |                                    |
| visibility_scope        | 公開範囲     |     |                        | text         | NO       | `company/group/platform`        | group判定はcompany_group_companyで実現 |
| ended_at                | 終了日時     |     |                        | timestamptz  | YES      | ended日時                      |                                    |
| version                 | バージョン   |     |                        | integer      | NO       | 楽観ロック                      |                                    |
| created_at              | 作成日時     |     |                        | timestamptz  | NO       |                                |                                    |
| updated_at              | 更新日時     |     |                        | timestamptz  | NO       |                                |                                    |

推奨制約：`unique(company_id, user_id)`

---

## 6. room（部屋マスタ）

| 英名         | 日本語名   | キー | 参照キー               | 型           | NULL許容 | 説明（詳しく）  | 備考                                 |
|--------------|------------|-----|-------------------------|--------------|----------|-----------------|--------------------------------------|
| room_id      | 部屋ID     | PK  |                        | uuid         | NO       | 部屋主キー      |                                      |
| company_id   | 会社ID     | FK  | company.company_id      | uuid         | NO       | 会社スコープ    |                                      |
| room_code    | 部屋コード |     |                        | text         | NO       | 部屋識別子      | `unique(company_id, room_code)` 推奨  |
| room_label   | 表示ラベル |     |                        | text         | YES      | UI表示用        |                                      |
| is_active    | 有効フラグ |     |                        | boolean      | NO       | 無効なら選択不可| default true                          |
| version      | バージョン |     |                        | integer      | NO       | 楽観ロック      |                                      |
| created_at   | 作成日時   |     |                        | timestamptz  | NO       |                |                                      |
| updated_at   | 更新日時   |     |                        | timestamptz  | NO       |                |                                      |

---

## 7. card（カード）

| 英名          | 日本語名   | キー | 参照キー               | 型           | NULL許容 | 説明（詳しく）                 | 備考                                |
|---------------|------------|-----|-------------------------|--------------|----------|--------------------------------|-------------------------------------|
| card_id       | カードID   | PK  |                        | uuid         | NO       | カード主キー                   |                                     |
| company_id    | 会社ID     | FK  | company.company_id      | uuid         | NO       | 発行先会社                     |                                     |
| card_uid      | カードUID  |     |                        | text         | NO       | NFC固有ID等                    | `unique(company_id, card_uid)` 推奨  |
| card_status   | 状態       |     |                        | text         | NO       | `issued/active/revoked`        | revokedは入場検証で拒否              |
| issued_at     | 発行日時   |     |                        | timestamptz  | NO       | 発行日時                       |                                     |
| revoked_at    | 失効日時   |     |                        | timestamptz  | YES      | revoked時                      |                                     |
| version       | バージョン |     |                        | integer      | NO       | 楽観ロック                     |                                     |
| created_at    | 作成日時   |     |                        | timestamptz  | NO       |                                |                                     |
| updated_at    | 更新日時   |     |                        | timestamptz  | NO       |                                |                                     |

---

## 8. card_room_binding（カード割当履歴）

| 英名                           | 日本語名    | キー | 参照キー                             | 型           | NULL許容 | 説明（詳しく）         | 備考        |
|--------------------------------|-------------|-----|--------------------------------------|--------------|----------|------------------------|-------------|
| card_room_binding_id           | 割当ID      | PK  |                                      | uuid         | NO       | 割当履歴主キー         |             |
| company_id                     | 会社ID      | FK  | company.company_id                   | uuid         | NO       | 会社スコープ           |             |
| card_id                        | カードID    | FK  | card.card_id                         | uuid         | NO       | 対象カード             |             |
| room_id                        | 部屋ID      | FK  | room.room_id                         | uuid         | NO       | 割当先部屋             |             |
| bound_at                       | 割当日時    |     |                                      | timestamptz  | NO       | 割当開始               |             |
| unbound_at                     | 割当解除日時|     |                                      | timestamptz  | YES      | 解除/変更時            | NULLが現行割当 |
| updated_by_company_member_id   | 更新者所属ID| FK  | company_member.company_member_id    | uuid         | YES      | staff/manager操作     |             |
| version                        | バージョン  |     |                                      | integer      | NO       | 楽観ロック             |             |
| created_at                     | 作成日時    |     |                                      | timestamptz  | NO       |                        |             |
| updated_at                     | 更新日時    |     |                                      | timestamptz  | NO       |                        |             |

推奨制約：`partial unique(card_id) where unbound_at is null`

---

## 9. stay（滞在）

| 英名                           | 日本語名        | キー | 参照キー                             | 型           | NULL許容     | 説明（詳しく）                      | 備考              |
|--------------------------------|-----------------|-----|--------------------------------------|--------------|--------------|-------------------------------------|-------------------|
| stay_id                        | 滞在ID          | PK  |                                      | uuid         | NO          | チェックインで作成される滞在         |                   |
| company_id                     | 会社ID          | FK  | company.company_id                   | uuid         | NO          | 滞在先会社                          |                   |
| room_id                        | 部屋ID          | FK  | room.room_id                         | uuid         | NO          | 滞在部屋                            |                   |
| card_id                        | カードID        | FK  | card.card_id                         | uuid         | NO          | 手渡したカード                      |                   |
| stay_status                    | 状態            |     |                                      | text         | NO          | `active/closed`                     | checkoutでclosed  |
| checkin_at                     | チェックイン日時 |     |                                      | timestamptz  | NO          | 滞在開始                            |                   |
| checkout_at                    | チェックアウト日時|    |                                      | timestamptz  | YES         | 滞在終了                            |                   |
| rules_snapshot                 | ルールスナップショット|  |                                      | jsonb        | NO          | quota/cooldown/期限/points等を固定  | 後から設定変更しても滞在は固定 |
| created_by_company_member_id   | 作成者所属ID    | FK  | company_member.company_member_id     | YES          | チェックイン実行者  |                              |                 |
| closed_by_company_member_id   | 終了者所属ID    | FK  | company_member.company_member_id     | YES          | チェックアウト実行者 |                              |                 |
| version                        | バージョン      |     |                                      | integer      | NO          | 楽観ロック                          |                   |
| created_at                     | 作成日時        |     |                                      | timestamptz  | NO          |                                    |                   |
| updated_at                     | 更新日時        |     |                                      | timestamptz  | NO          |                                    |                   |

備考：`stay_status=closed` へ遷移したタイミングで、当該stayのKudos確定・オンチェーン発行へ進める

---

## 10. guest_session（ゲストセッション）

| 英名                 | 日本語名       | キー | 参照キー         | 型           | NULL許容 | 説明（詳しく）              | 備考              |
|----------------------|----------------|-----|------------------|--------------|----------|-----------------------------|-------------------|
| guest_session_id     | ゲストセッションID| PK  |                  | uuid         | NO       | 入場token検証後の短期セッション |                   |
| stay_id              | 滞在ID         | FK  | stay.stay_id     | uuid         | NO       | 1滞在に固定                  | “滞在スコープ固定”が不正耐性 |
| card_id              | カードID       | FK  | card.card_id     | uuid         | NO       | 入場元カード                  |                   |
| session_token_hash   | トークンハッシュ| UK  |                  | text         | NO       | Bearerのハッシュ（平文保持しない）| 片方向ハッシュ     |
| expires_at           | 期限           |     |                  | timestamptz  | NO       | TTL                         | 期限切れは再タップ   |
| last_seen_at         | 最終アクセス   |     |                  | timestamptz  | YES      | 監視用                      | 任意               |
| revoked_at           | 失効日時       |     |                  | timestamptz  | YES      | 不正検知等                  |                   |
| version              | バージョン     |     |                  | integer      | NO       | 楽観ロック                  |                   |
| created_at            | 作成日時       |     |                  | timestamptz  | NO       |                             |                   |
| updated_at            | 更新日時       |     |                  | timestamptz  | NO       |                             |                   |

---

## 11. entry_token_use（入場トークン使用記録：リプレイ対策）

| 英名                 | 日本語名     | キー | 参照キー         | 型           | NULL許容 | 説明（詳しく）             | 備考                |
|----------------------|--------------|-----|------------------|--------------|----------|----------------------------|---------------------|
| entry_token_use_id   | 使用記録ID   | PK  |                  | uuid         | NO       | 使用済み記録主キー          |                     |
| token_hash           | トークンハッシュ| UK  |                  | text         | NO       | 入場tokenのハッシュ         | 同一tokenの再利用遮断 |
| card_id              | カードID     | FK  | card.card_id     | uuid         | YES      | tokenにcardが入るなら保存   |                     |
| used_at              | 使用日時     |     |                  | timestamptz  | NO       | 使用時刻                   |                     |
| use_result           | 使用結果     |     |                  | text         | NO       | `accepted/rejected`        | rejectedも残すと監視に効く |
| version              | バージョン   |     |                  | integer      | NO       | 楽観ロック                 |                     |
| created_at           | 作成日時     |     |                  | timestamptz  | NO       | 作成                       | used_atと同値で可   |
| updated_at           | 更新日時     |     |                  | timestamptz  | NO       | 更新                       | 実質更新しない想定でも列は統一 |

---

## 12. on_duty_session（勤務中セッション）

| 英名                 | 日本語名      | キー | 参照キー                             | 型           | NULL許容 | 説明（詳しく）        | 備考         |
|----------------------|---------------|-----|--------------------------------------|--------------|----------|-----------------------|--------------|
| on_duty_session_id   | 勤務セッションID| PK  |                                      | uuid         | NO       | 勤務開始で作成         |              |
| company_id           | 会社ID        | FK  | company.company_id                   | uuid         | NO       | 勤務先会社             |              |
| company_member_id    | 所属ID        | FK  | company_member.company_member_id     | uuid         | NO       | 勤務者（employee）     | スタッフ一覧の根拠 |
| duty_status         | 状態          |     |                                      | text         | NO       | `active/ended`        | endedは勤務終了 |
| started_at           | 開始日時      |     |                                      | timestamptz  | NO       | 勤務開始              |              |
| ended_at             | 終了日時      |     |                                      | timestamptz  | YES      | 勤務終了              |              |
| version              | バージョン    |     |                                      | integer      | NO       | 楽観ロック            |              |
| created_at           | 作成日時      |     |                                      | timestamptz  | NO       |                       |              |
| updated_at           | 更新日時      |     |                                      | timestamptz  | NO       |                       |              |

推奨制約：`partial unique(company_member_id) where duty_status='active'`

---

## 13. kudos（Kudos）

| 英名                         | 日本語名       | キー | 参照キー                             | 型           | NULL許容 | 説明（詳しく）                      | 備考                       |
|------------------------------|----------------|-----|--------------------------------------|--------------|----------|-------------------------------------|----------------------------|
| kudos_id                     | KudosID        | PK  |                                      | uuid         | NO       | 投稿主キー                          |                            |
| company_id                   | 会社ID         | FK  | company.company_id                   | uuid         | NO       | 滞在先会社                          | 集計軸                      |
| stay_id                      | 滞在ID         | FK  | stay.stay_id                         | uuid         | NO       | どの滞在か                          | “実滞在者のみ”根拠          |
| receiver_company_member_id   | 受領者所属ID   | FK  | company_member.company_member_id     | uuid         | NO       | 受領スタッフ                        | 勤務中(on_duty)のみ選択可（サーバ強制） |
| category                     | カテゴリ       |     |                                      | text         | NO       | Kudosカテゴリ                       | enum化は後回し可            |
| message_text                 | 本文（オフチェーン）|    |                                      | text         | NO       | ゲスト本文                          | オンチェーンには載せない    |
| message_is_masked            | 本文マスク済み |     |                                      | boolean      | NO       | 本文非表示化したか                  | default false              |
| kudos_status                 | 状態           |     |                                      | text         | NO       | `pending/confirmed/rejected`        | 投稿時pending、checkoutで確定 |
| points_awarded               | 付与ポイント   |     |                                      | integer      | NO       | 会社制度ポイント                    | stay.rules_snapshot等から算出 |
| guest_session_id             | ゲストセッションID| FK  | guest_session.guest_session_id      | YES          | 投稿元    | 監査/不正検知                      |                            |
| confirmed_at                 | 確定日時       |     |                                      | timestamptz  | YES      | confirmed時                        |                            |
| rejected_at                  | 却下日時       |     |                                      | timestamptz  | YES      | rejected時                         |                            |
| version                      | バージョン     |     |                                      | integer      | NO       | 楽観ロック                          |                            |
| created_at                   | 作成日時       |     |                                      | timestamptz  | NO       | 投稿日時                            |                            |
| updated_at                   | 更新日時       |     |                                      | timestamptz  | NO       |                                    |                            |

備考（制限挙動）：回数上限/クールダウン/受付期限は `stay.rules_snapshot` を基準にAPI側で強制（DBはindexで支援）

---

## 14. kudos_moderation（モデレーション）

| 英名                  | 日本語名        | キー    | 参照キー           | 型           | NULL許容     | 説明（詳しく）              | 備考                               |
|-----------------------|-----------------|---------|--------------------|--------------|--------------|-----------------------------|------------------------------------|
| kudos_moderation_id   | モデレーションID| PK      |                    | uuid         | NO           | 判定主キー                  |                                    |
| kudos_id              | KudosID         | FK/UK   | kudos.kudos_id     | uuid         | NO           | 対象Kudos                  | `unique(kudos_id)` 推奨（最新1件運用） |
| moderation_decision   | 判定            |         |                    | text         | NO           | `allow/review/block`        | blockは却下候補（checkout確定でrejectedへ） |
| reason_codes          | 理由コード      |         |                    | text[]       | YES          | NG理由配列                  |                                    |
| score_json            | スコア          |         |                    | jsonb        | YES          | モデルスコア等              |                                    |
| model_name            | モデル名        |         |                    | text         | YES          |                             |                                    |
| reviewed_by_user_id   | レビュー者ユーザーID| FK    | user.user_id       | YES          | 人手レビュー（運営） | MVPはnullでも可                    |                                    |
| reviewed_at           | レビュー日時    |         |                    | timestamptz  | YES          |                             |                                    |
| version               | バージョン      |         |                    | integer      | NO           | 楽観ロック                  |                                    |
| created_at            | 作成日時        |         |                    | timestamptz  | NO           | AI判定生成日時              |                                    |
| updated_at            | 更新日時        |         |                    | timestamptz  | NO           |                             |                                    |

---

## 15. chain_receipt（オンチェーン受領証）

| 英名               | 日本語名     | キー    | 参照キー           | 型           | NULL許容 | 説明（詳しく）                             | 備考                            |
|--------------------|--------------|---------|--------------------|--------------|----------|--------------------------------------------|---------------------------------|
| chain_receipt_id   | 受領証ID     | PK      |                    | uuid         | NO       | 受領証主キー                                |                                 |
| kudos_id           | KudosID      | FK/UK   | kudos.kudos_id     | uuid         | NO       | 1Kudosに1受領証                            | `unique(kudos_id)`              |
| chain_name         | チェーン名   |         |                    | text         | NO       | 例：Avalanche C-Chain                       |                                 |
| anchor_hash        | アンカーハッシュ|        |                    | text         | NO       | 本文/PIIを含まないハッシュ                  | 検証の基準                      |
| tx_hash            | txハッシュ   |         |                    | text         | YES      | トランザクションID                          | 送信後にセット                  |
| points_awarded     | 付与ポイント |         |                    | integer      | NO       | 受領証にも保持するポイント                  | `kudos.points_awarded` と一致させる |
| receipt_status     | 状態         |         |                    | text         | NO       | `queued/submitted/confirmed/failed`        | failedはリトライ対象            |
| submitted_at       | 送信日時     |         |                    | timestamptz  | YES      |                                            |                                 |
| confirmed_at       | 確認日時     |         |                    | timestamptz  | YES      |                                            |                                 |
| fail_reason        | 失敗理由     |         |                    | text         | YES      | 失敗要因                                   |                                 |
| version            | バージョン   |         |                    | integer      | NO       | 楽観ロック                                  |                                 |
| created_at         | 作成日時     |         |                    | timestamptz  | NO       |                                            |                                 |
| updated_at         | 更新日時     |         |                    | timestamptz  | NO       |                                            |                                 |

備考：proof照合は `anchor_hash` 再計算＋オンチェーン値一致確認（`tx_hash` は参照用）

---

## 16. audit_log（監査ログ）

| 英名                      | 日本語名      | キー | 参照キー                             | 型           | NULL許容 | 説明（詳しく）                                    | 備考            |
|---------------------------|---------------|-----|--------------------------------------|--------------|----------|---------------------------------------------------|-----------------|
| audit_log_id              | ログID        | PK  |                                      | uuid         | NO       | 監査ログ主キー                                    |                 |
| actor_user_id             | 操作者ユーザーID| FK  | user.user_id                         | uuid         | YES      | 操作ユーザー                                      | guest操作はNULL可 |
| actor_company_member_id    | 操作者所属ID  | FK  | company_member.company_member_id      | uuid         | YES      | 会社運用操作の主体                                |                 |
| company_id                | 会社ID        | FK  | company.company_id                   | uuid         | YES      | スコープ                                          |                 |
| action                    | 操作種別      |     |                                      | text         | NO       | 例：CHECKIN/CHECKOUT/CARD_ASSIGN/CARD_REVOKE      | 定数化推奨      |
| target_table              | 対象テーブル  |     |                                      | text         | YES      | 例：stay/kudos                                    |                 |
| target_id                 | 対象ID        |     |                                      | uuid         | YES      | 対象主キー                                        |                 |
| detail_json               | 詳細          |     |                                      | jsonb        | YES      | 変更内容/理由等                                   | 機微情報は入れない |
| version                   | バージョン    |     |                                      | integer      | NO       | 楽観ロック                                        |                 |
| created_at                | 作成日時      |     |                                      | timestamptz  | NO       |                                                   |                 |
| updated_at                | 更新日時      |     |                                      | timestamptz  | NO       |                                                   |                 |

---

## 補足（比較をしやすくするためのJOINの起点）

* 会社→グループ：`company.company_id` → `company_group_company.company_id` → `company_group_company.company_group_id`
* グループ比較集計：`kudos.company_id` を上のJOINで `company_group_id` に持ち上げて集計
