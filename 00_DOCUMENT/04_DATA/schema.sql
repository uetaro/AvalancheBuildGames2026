-- =============================================================================
-- schema.sql — Full database schema, migrations, seed data, and cron setup
-- Combined from 00_DOCUMENT/04_DATA (create_tables, create_record) and 50_API/db
--
-- Run in: Supabase Dashboard → SQL Editor
-- Order: Run Part 1 first (tables). Part 2 (chain_receipt alters) if chain_receipt
--        already existed. Part 3–4 (seeds) and Part 5 (cron) as needed.
-- =============================================================================


-- ##############################################################################
-- PART 1: Create all tables (from table.md; dependency order)
-- ##############################################################################

-- -----------------------------------------------------------------------------
-- 1. user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "user" (
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
-- 2. company
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_slug ON company (company_slug) WHERE company_slug IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. company_group
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_group (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_group_slug ON company_group (company_group_slug) WHERE company_group_slug IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. company_group_company
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_group_company (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_group_company_active
  ON company_group_company (company_id) WHERE membership_status = 'active';

-- -----------------------------------------------------------------------------
-- 5. company_member
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_member (
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
-- 6. room
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room (
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
-- 7. card
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card (
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
-- 8. card_room_binding
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_room_binding (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_room_binding_current
  ON card_room_binding (card_id) WHERE unbound_at IS NULL;

-- -----------------------------------------------------------------------------
-- 9. stay
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stay (
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
-- 10. guest_session
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guest_session (
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
-- 11. entry_token_use
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entry_token_use (
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
-- 12. on_duty_session
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS on_duty_session (
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_on_duty_session_active
  ON on_duty_session (company_member_id) WHERE duty_status = 'active';

-- -----------------------------------------------------------------------------
-- 13. kudos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kudos (
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
-- 14. kudos_moderation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kudos_moderation (
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
-- 15. chain_receipt
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chain_receipt (
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
-- 16. audit_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
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

-- -----------------------------------------------------------------------------
-- 17. point_exchange (staff point exchange history)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_exchange (
  exchange_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_member_id   uuid NOT NULL REFERENCES company_member (company_member_id),
  gift_name           text NOT NULL,
  points_used         int NOT NULL CHECK (points_used > 0),
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_point_exchange_member_created
  ON point_exchange (company_member_id, created_at DESC);


-- ##############################################################################
-- PART 2: chain_receipt — On-chain Worker columns (DD-OPS-CHECKOUT-ONCHAIN §3.2)
-- ##############################################################################

ALTER TABLE chain_receipt ADD COLUMN IF NOT EXISTS chain_id          INT          NOT NULL DEFAULT 43113;
ALTER TABLE chain_receipt ADD COLUMN IF NOT EXISTS contract_address  TEXT         NULL;
ALTER TABLE chain_receipt ADD COLUMN IF NOT EXISTS hash_alg          TEXT         NOT NULL DEFAULT 'keccak256';
ALTER TABLE chain_receipt ADD COLUMN IF NOT EXISTS retry_count       INT          NOT NULL DEFAULT 0;
ALTER TABLE chain_receipt ADD COLUMN IF NOT EXISTS next_attempt_at   TIMESTAMPTZ  NULL;
ALTER TABLE chain_receipt ADD COLUMN IF NOT EXISTS last_attempt_at    TIMESTAMPTZ  NULL;
ALTER TABLE chain_receipt ADD COLUMN IF NOT EXISTS tx_error          TEXT         NULL;

CREATE INDEX IF NOT EXISTS idx_chain_receipt_worker_submit
  ON chain_receipt (receipt_status, next_attempt_at, created_at)
  WHERE receipt_status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS idx_chain_receipt_worker_confirm
  ON chain_receipt (receipt_status, confirmed_at)
  WHERE receipt_status = 'submitted';

UPDATE chain_receipt SET chain_id = 43113, hash_alg = 'keccak256'
  WHERE chain_id IS NULL OR hash_alg IS NULL;


-- ##############################################################################
-- PART 3: Initial seed data (run after Part 1; change IDs/values for production)
-- ##############################################################################

-- 1. user
INSERT INTO "user" (user_id, cognito_sub, email, display_name, user_type, version, created_at, updated_at)
VALUES (
  'a0000001-0000-4000-8000-000000000001',
  'initial-operator-sub',
  'operator@example.com',
  'Initial Operator',
  'operator',
  1, now(), now()
)
ON CONFLICT (cognito_sub) DO NOTHING;

-- 2. company
INSERT INTO company (company_id, company_name, company_slug, company_country_code, company_region, company_city, timezone, company_status, version, created_at, updated_at)
VALUES (
  'a0000002-0000-4000-8000-000000000002',
  'Sample Hotel',
  'sample-hotel',
  'JP',
  'Tokyo',
  'Shibuya',
  'Asia/Tokyo',
  'active',
  1, now(), now()
)
ON CONFLICT (company_id) DO NOTHING;

-- 3. company_group
INSERT INTO company_group (company_group_id, company_group_name, company_group_slug, timezone, company_group_status, version, created_at, updated_at)
VALUES (
  'a0000003-0000-4000-8000-000000000003',
  'Sample Group',
  'sample-group',
  'Asia/Tokyo',
  'active',
  1, now(), now()
)
ON CONFLICT (company_group_id) DO NOTHING;

-- 4. company_group_company
INSERT INTO company_group_company (company_group_company_id, company_group_id, company_id, membership_status, joined_at, is_primary, version, created_at, updated_at)
VALUES (
  'a0000004-0000-4000-8000-000000000004',
  'a0000003-0000-4000-8000-000000000003',
  'a0000002-0000-4000-8000-000000000002',
  'active', now(), true, 1, now(), now()
)
ON CONFLICT (company_group_company_id) DO NOTHING;

-- 5. company_member
INSERT INTO company_member (company_member_id, company_id, user_id, member_role, member_status, job_title, visibility_scope, version, created_at, updated_at)
VALUES (
  'a0000005-0000-4000-8000-000000000005',
  'a0000002-0000-4000-8000-000000000002',
  'a0000001-0000-4000-8000-000000000001',
  'manager', 'active', 'Operations', 'company', 1, now(), now()
)
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 6. room (3 sample rooms)
INSERT INTO room (room_id, company_id, room_code, room_label, is_active, version, created_at, updated_at) VALUES
  ('a0000010-0000-4000-8000-000000000010', 'a0000002-0000-4000-8000-000000000002', '101', '101', true, 1, now(), now()),
  ('a0000011-0000-4000-8000-000000000011', 'a0000002-0000-4000-8000-000000000002', '102', '102', true, 1, now(), now()),
  ('a0000012-0000-4000-8000-000000000012', 'a0000002-0000-4000-8000-000000000002', '103', '103', true, 1, now(), now())
ON CONFLICT (company_id, room_code) DO NOTHING;

-- 7. card
INSERT INTO card (card_id, company_id, card_uid, card_status, issued_at, version, created_at, updated_at)
VALUES (
  'a0000020-0000-4000-8000-000000000020',
  'a0000002-0000-4000-8000-000000000002',
  'CARD-UID-SAMPLE-001',
  'active', now(), 1, now(), now()
)
ON CONFLICT (company_id, card_uid) DO NOTHING;

-- 8. card_room_binding
INSERT INTO card_room_binding (card_room_binding_id, company_id, card_id, room_id, bound_at, updated_by_company_member_id, version, created_at, updated_at)
VALUES (
  'a0000030-0000-4000-8000-000000000030',
  'a0000002-0000-4000-8000-000000000002',
  'a0000020-0000-4000-8000-000000000020',
  'a0000010-0000-4000-8000-000000000010',
  now(), 'a0000005-0000-4000-8000-000000000005', 1, now(), now()
)
ON CONFLICT (card_room_binding_id) DO NOTHING;


-- ##############################################################################
-- PART 4: Seed point_exchange (optional; user_id 05ea5d2d-... must have company_member)
-- ##############################################################################

INSERT INTO point_exchange (company_member_id, gift_name, points_used, status, created_at, completed_at)
SELECT
  (SELECT company_member_id FROM company_member WHERE user_id = '05ea5d2d-7c11-41a3-a39c-8f68e01690de' AND member_status = 'active' LIMIT 1),
  row.gift_name, row.points_used, row.status, row.created_at::timestamptz, row.completed_at::timestamptz
FROM (VALUES
  ('Amazon Gift Card $50', 500, 'completed', '2026-02-18 14:30:00+00', '2026-02-18 14:30:00+00'),
  ('Starbucks Card $25', 250, 'completed', '2026-02-15 10:15:00+00', '2026-02-15 10:15:00+00'),
  ('Restaurant Voucher $80', 800, 'completed', '2026-02-12 19:00:00+00', '2026-02-12 19:00:00+00'),
  ('Movie Tickets (2x)', 300, 'completed', '2026-02-08 16:45:00+00', '2026-02-08 16:45:00+00'),
  ('Spa Day Package', 1500, 'completed', '2026-02-05 09:00:00+00', '2026-02-05 09:00:00+00'),
  ('Convenience Store Voucher $20', 200, 'completed', '2026-01-28 08:30:00+00', '2026-01-28 08:30:00+00'),
  ('Fitness Class Pass', 600, 'completed', '2026-01-22 12:00:00+00', '2026-01-22 12:00:00+00'),
  ('Amazon Gift Card $50', 500, 'completed', '2026-01-15 11:20:00+00', '2026-01-15 11:20:00+00'),
  ('Wellness Program Voucher', 400, 'completed', '2026-01-10 14:00:00+00', '2026-01-10 14:00:00+00')
) AS row(gift_name, points_used, status, created_at, completed_at);


-- ##############################################################################
-- PART 5: pg_cron + pg_net — On-chain Worker (Supabase Pro+). Replace URLs/keys.
-- ##############################################################################

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_project_url  TEXT := 'https://<your-project-ref>.supabase.co';
  v_service_key  TEXT := '<your-service-role-key>';
  v_submit_url   TEXT;
  v_confirm_url  TEXT;
BEGIN
  v_submit_url  := v_project_url || '/functions/v1/api/chain-worker-submit';
  v_confirm_url := v_project_url || '/functions/v1/api/chain-worker-confirm';

  PERFORM cron.schedule(
    'heartel-chain-worker-submit',
    '*/5 * * * *',
    format(
      $$ SELECT net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L), body := '{}'::jsonb); $$,
      v_submit_url, v_service_key
    )
  );

  PERFORM cron.schedule(
    'heartel-chain-worker-confirm',
    '*/5 * * * *',
    format(
      $$ SELECT net.http_post(url := %L, headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L), body := '{}'::jsonb); $$,
      v_confirm_url, v_service_key
    )
  );

  RAISE NOTICE 'Cron jobs registered: heartel-chain-worker-submit / heartel-chain-worker-confirm';
END;
$$;
