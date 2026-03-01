-- =============================================================================
-- 全テーブル作成スクリプト（table.md に基づく）
-- PostgreSQL 想定: PK=uuid(gen_random_uuid()), 時刻=timestamptz, 楽観ロック=version
-- 実行順は参照整合性を満たすため依存順
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user（ユーザー）
-- -----------------------------------------------------------------------------
CREATE TABLE "user" (
  user_id       uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cognito_sub   text         NOT NULL,
  email         text,
  phone         text,
  display_name  text,
  user_type     text         NOT NULL,
  version       integer      NOT NULL DEFAULT 1,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_cognito_sub UNIQUE (cognito_sub)
);

-- -----------------------------------------------------------------------------
-- 2. company（会社/ホテル）
-- -----------------------------------------------------------------------------
CREATE TABLE company (
  company_id                uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name              text          NOT NULL,
  company_slug              text,
  company_homepage_url      text,
  company_overview          text,
  company_logo_url          text,
  company_cover_image_url   text,
  company_images_json       jsonb,
  company_country           text,
  company_country_code      text,
  company_region            text,
  company_city              text,
  company_address_line1    text,
  company_address_line2    text,
  company_postal_code       text,
  company_latitude          numeric(9,6),
  company_longitude         numeric(9,6),
  timezone                  text          NOT NULL,
  company_status            text          NOT NULL,
  version                   integer       NOT NULL DEFAULT 1,
  created_at                timestamptz  NOT NULL DEFAULT now(),
  updated_at                timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_company_slug ON company (company_slug) WHERE company_slug IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. company_group（会社グループ/チェーン）
-- -----------------------------------------------------------------------------
CREATE TABLE company_group (
  company_group_id                uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_name              text         NOT NULL,
  company_group_slug              text,
  company_group_homepage_url      text,
  company_group_overview          text,
  company_group_logo_url          text,
  company_group_cover_image_url   text,
  company_group_images_json       jsonb,
  company_group_country           text,
  company_group_country_code      text,
  company_group_region           text,
  company_group_city              text,
  timezone                       text         NOT NULL,
  company_group_status            text         NOT NULL,
  version                        integer      NOT NULL DEFAULT 1,
  created_at                     timestamptz  NOT NULL DEFAULT now(),
  updated_at                     timestamptz  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_company_group_slug ON company_group (company_group_slug) WHERE company_group_slug IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. company_group_company（会社グループ所属）
-- -----------------------------------------------------------------------------
CREATE TABLE company_group_company (
  company_group_company_id  uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_id          uuid         NOT NULL REFERENCES company_group (company_group_id),
  company_id                uuid         NOT NULL REFERENCES company (company_id),
  membership_status        text         NOT NULL,
  joined_at                 timestamptz NOT NULL,
  ended_at                  timestamptz,
  is_primary                boolean      NOT NULL,
  note                      text,
  version                   integer      NOT NULL DEFAULT 1,
  created_at                timestamptz  NOT NULL DEFAULT now(),
  updated_at                timestamptz  NOT NULL DEFAULT now()
);

-- 単一グループ同時所属にする場合の推奨制約
CREATE UNIQUE INDEX idx_company_group_company_active
  ON company_group_company (company_id) WHERE membership_status = 'active';

-- -----------------------------------------------------------------------------
-- 5. company_member（所属/会社メンバー）
-- -----------------------------------------------------------------------------
CREATE TABLE company_member (
  company_member_id     uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id            uuid         NOT NULL REFERENCES company (company_id),
  user_id               uuid         NOT NULL REFERENCES "user" (user_id),
  member_role           text         NOT NULL,
  member_status         text         NOT NULL,
  job_title             text,
  display_name_override text,
  public_profile_json   jsonb,
  visibility_scope      text         NOT NULL,
  ended_at              timestamptz,
  version               integer      NOT NULL DEFAULT 1,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_company_member_company_user UNIQUE (company_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 6. room（部屋マスタ）
-- -----------------------------------------------------------------------------
CREATE TABLE room (
  room_id      uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid         NOT NULL REFERENCES company (company_id),
  room_code   text         NOT NULL,
  room_label  text,
  is_active   boolean      NOT NULL DEFAULT true,
  version     integer      NOT NULL DEFAULT 1,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_room_company_code UNIQUE (company_id, room_code)
);

-- -----------------------------------------------------------------------------
-- 7. card（カード）
-- -----------------------------------------------------------------------------
CREATE TABLE card (
  card_id      uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id   uuid         NOT NULL REFERENCES company (company_id),
  card_uid     text         NOT NULL,
  card_status  text         NOT NULL,
  issued_at    timestamptz  NOT NULL,
  revoked_at   timestamptz,
  version      integer      NOT NULL DEFAULT 1,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_card_company_uid UNIQUE (company_id, card_uid)
);

-- -----------------------------------------------------------------------------
-- 8. card_room_binding（カード割当履歴）
-- -----------------------------------------------------------------------------
CREATE TABLE card_room_binding (
  card_room_binding_id         uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id                   uuid         NOT NULL REFERENCES company (company_id),
  card_id                      uuid         NOT NULL REFERENCES card (card_id),
  room_id                      uuid         NOT NULL REFERENCES room (room_id),
  bound_at                     timestamptz  NOT NULL,
  unbound_at                   timestamptz,
  updated_by_company_member_id uuid         REFERENCES company_member (company_member_id),
  version                      integer      NOT NULL DEFAULT 1,
  created_at                   timestamptz  NOT NULL DEFAULT now(),
  updated_at                   timestamptz  NOT NULL DEFAULT now()
);

-- 1カードにつき現行割当1件
CREATE UNIQUE INDEX idx_card_room_binding_current
  ON card_room_binding (card_id) WHERE unbound_at IS NULL;

-- -----------------------------------------------------------------------------
-- 9. stay（滞在）
-- -----------------------------------------------------------------------------
CREATE TABLE stay (
  stay_id                        uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id                     uuid         NOT NULL REFERENCES company (company_id),
  room_id                        uuid         NOT NULL REFERENCES room (room_id),
  card_id                        uuid         NOT NULL REFERENCES card (card_id),
  stay_status                    text         NOT NULL,
  checkin_at                     timestamptz  NOT NULL,
  checkout_at                    timestamptz,
  rules_snapshot                 jsonb        NOT NULL,
  created_by_company_member_id   uuid         REFERENCES company_member (company_member_id),
  closed_by_company_member_id    uuid         REFERENCES company_member (company_member_id),
  version                        integer      NOT NULL DEFAULT 1,
  created_at                     timestamptz  NOT NULL DEFAULT now(),
  updated_at                     timestamptz  NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 10. guest_session（ゲストセッション）
-- -----------------------------------------------------------------------------
CREATE TABLE guest_session (
  guest_session_id   uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id            uuid         NOT NULL REFERENCES stay (stay_id),
  card_id            uuid         NOT NULL REFERENCES card (card_id),
  session_token_hash text         NOT NULL,
  expires_at         timestamptz  NOT NULL,
  last_seen_at       timestamptz,
  revoked_at         timestamptz,
  version            integer     NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_guest_session_token UNIQUE (session_token_hash)
);

-- -----------------------------------------------------------------------------
-- 11. entry_token_use（入場トークン使用記録：リプレイ対策）
-- -----------------------------------------------------------------------------
CREATE TABLE entry_token_use (
  entry_token_use_id uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash         text         NOT NULL,
  card_id            uuid         REFERENCES card (card_id),
  used_at            timestamptz  NOT NULL,
  use_result         text         NOT NULL,
  version            integer      NOT NULL DEFAULT 1,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_entry_token_use_hash UNIQUE (token_hash)
);

-- -----------------------------------------------------------------------------
-- 12. on_duty_session（勤務中セッション）
-- -----------------------------------------------------------------------------
CREATE TABLE on_duty_session (
  on_duty_session_id uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id         uuid         NOT NULL REFERENCES company (company_id),
  company_member_id  uuid         NOT NULL REFERENCES company_member (company_member_id),
  duty_status        text         NOT NULL,
  started_at         timestamptz  NOT NULL,
  ended_at           timestamptz,
  version            integer      NOT NULL DEFAULT 1,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);

-- 1所属につき勤務中1件
CREATE UNIQUE INDEX idx_on_duty_session_active
  ON on_duty_session (company_member_id) WHERE duty_status = 'active';

-- -----------------------------------------------------------------------------
-- 13. kudos（Kudos）
-- -----------------------------------------------------------------------------
CREATE TABLE kudos (
  kudos_id                     uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id                   uuid         NOT NULL REFERENCES company (company_id),
  stay_id                      uuid         NOT NULL REFERENCES stay (stay_id),
  receiver_company_member_id   uuid         NOT NULL REFERENCES company_member (company_member_id),
  category                     text         NOT NULL,
  message_text                  text         NOT NULL,
  message_is_masked             boolean      NOT NULL DEFAULT false,
  kudos_status                 text         NOT NULL,
  points_awarded               integer      NOT NULL,
  guest_session_id             uuid         REFERENCES guest_session (guest_session_id),
  confirmed_at                 timestamptz,
  rejected_at                   timestamptz,
  version                      integer      NOT NULL DEFAULT 1,
  created_at                   timestamptz  NOT NULL DEFAULT now(),
  updated_at                   timestamptz  NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 14. kudos_moderation（モデレーション）
-- -----------------------------------------------------------------------------
CREATE TABLE kudos_moderation (
  kudos_moderation_id   uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kudos_id              uuid         NOT NULL REFERENCES kudos (kudos_id),
  moderation_decision   text         NOT NULL,
  reason_codes          text[],
  score_json            jsonb,
  model_name            text,
  reviewed_by_user_id    uuid         REFERENCES "user" (user_id),
  reviewed_at            timestamptz,
  version               integer      NOT NULL DEFAULT 1,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_kudos_moderation_kudos UNIQUE (kudos_id)
);

-- -----------------------------------------------------------------------------
-- 15. chain_receipt（オンチェーン受領証）
-- -----------------------------------------------------------------------------
CREATE TABLE chain_receipt (
  chain_receipt_id uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kudos_id         uuid         NOT NULL REFERENCES kudos (kudos_id),
  chain_name      text         NOT NULL,
  anchor_hash     text         NOT NULL,
  tx_hash         text,
  points_awarded  integer      NOT NULL,
  receipt_status  text         NOT NULL,
  submitted_at    timestamptz,
  confirmed_at    timestamptz,
  fail_reason     text,
  version         integer      NOT NULL DEFAULT 1,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_chain_receipt_kudos UNIQUE (kudos_id)
);

-- -----------------------------------------------------------------------------
-- 16. audit_log（監査ログ）
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
  audit_log_id            uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id           uuid         REFERENCES "user" (user_id),
  actor_company_member_id uuid         REFERENCES company_member (company_member_id),
  company_id              uuid         REFERENCES company (company_id),
  action                  text         NOT NULL,
  target_table            text,
  target_id               uuid,
  detail_json             jsonb,
  version                 integer      NOT NULL DEFAULT 1,
  created_at              timestamptz  NOT NULL DEFAULT now(),
  updated_at              timestamptz  NOT NULL DEFAULT now()
);

-- =============================================================================
-- 以上で全16テーブル作成完了
-- =============================================================================
