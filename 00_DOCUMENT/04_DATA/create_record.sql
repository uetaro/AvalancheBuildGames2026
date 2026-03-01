-- =============================================================================
-- 初期投入データ（create_tables.sql 実行後に実行すること）
-- 固定UUIDを使用し、参照整合性を満たす順で INSERT
-- 本番投入前に cognito_sub / 会社名・スラッグ等は環境に合わせて変更すること
-- =============================================================================

-- 固定UUID（参照用）
-- user_id:         a0000001-0000-4000-8000-000000000001
-- company_id:     a0000002-0000-4000-8000-000000000002
-- company_group_id: a0000003-0000-4000-8000-000000000003
-- company_group_company_id: a0000004-0000-4000-8000-000000000004
-- company_member_id: a0000005-0000-4000-8000-000000000005
-- room_id:        a0000010 / a0000011 / a0000012
-- card_id:        a0000020-0000-4000-8000-000000000020
-- card_room_binding_id: a0000030-0000-4000-8000-000000000030

-- -----------------------------------------------------------------------------
-- 1. user（初期オペレーター／管理者）
-- -----------------------------------------------------------------------------
INSERT INTO "user" (
  user_id,
  cognito_sub,
  email,
  display_name,
  user_type,
  version,
  created_at,
  updated_at
) VALUES (
  'a0000001-0000-4000-8000-000000000001',
  'initial-operator-sub',  -- 本番では Cognito の sub に差し替える
  'operator@example.com',
  '初期オペレーター',
  'operator',
  1,
  now(),
  now()
)
ON CONFLICT (cognito_sub) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. company（サンプル会社／ホテル）
-- -----------------------------------------------------------------------------
INSERT INTO company (
  company_id,
  company_name,
  company_slug,
  company_country_code,
  company_region,
  company_city,
  timezone,
  company_status,
  version,
  created_at,
  updated_at
) VALUES (
  'a0000002-0000-4000-8000-000000000002',
  'サンプルホテル',
  'sample-hotel',
  'JP',
  '東京都',
  '渋谷区',
  'Asia/Tokyo',
  'active',
  1,
  now(),
  now()
)
ON CONFLICT (company_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. company_group（サンプルグループ）
-- -----------------------------------------------------------------------------
INSERT INTO company_group (
  company_group_id,
  company_group_name,
  company_group_slug,
  timezone,
  company_group_status,
  version,
  created_at,
  updated_at
) VALUES (
  'a0000003-0000-4000-8000-000000000003',
  'サンプルグループ',
  'sample-group',
  'Asia/Tokyo',
  'active',
  1,
  now(),
  now()
)
ON CONFLICT (company_group_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. company_group_company（会社をグループに所属）
-- -----------------------------------------------------------------------------
INSERT INTO company_group_company (
  company_group_company_id,
  company_group_id,
  company_id,
  membership_status,
  joined_at,
  is_primary,
  version,
  created_at,
  updated_at
) VALUES (
  'a0000004-0000-4000-8000-000000000004',
  'a0000003-0000-4000-8000-000000000003',
  'a0000002-0000-4000-8000-000000000002',
  'active',
  now(),
  true,
  1,
  now(),
  now()
)
ON CONFLICT (company_group_company_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. company_member（ユーザーを会社に所属・マネージャー）
-- -----------------------------------------------------------------------------
INSERT INTO company_member (
  company_member_id,
  company_id,
  user_id,
  member_role,
  member_status,
  job_title,
  visibility_scope,
  version,
  created_at,
  updated_at
) VALUES (
  'a0000005-0000-4000-8000-000000000005',
  'a0000002-0000-4000-8000-000000000002',
  'a0000001-0000-4000-8000-000000000001',
  'manager',
  'active',
  '運営担当',
  'company',
  1,
  now(),
  now()
)
ON CONFLICT (company_id, user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. room（部屋マスタ：サンプル3部屋）
-- -----------------------------------------------------------------------------
INSERT INTO room (room_id, company_id, room_code, room_label, is_active, version, created_at, updated_at) VALUES
  ('a0000010-0000-4000-8000-000000000010', 'a0000002-0000-4000-8000-000000000002', '101', '101号室', true, 1, now(), now()),
  ('a0000011-0000-4000-8000-000000000011', 'a0000002-0000-4000-8000-000000000002', '102', '102号室', true, 1, now(), now()),
  ('a0000012-0000-4000-8000-000000000012', 'a0000002-0000-4000-8000-000000000002', '103', '103号室', true, 1, now(), now())
ON CONFLICT (company_id, room_code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. card（サンプルカード1枚）
-- -----------------------------------------------------------------------------
INSERT INTO card (
  card_id,
  company_id,
  card_uid,
  card_status,
  issued_at,
  version,
  created_at,
  updated_at
) VALUES (
  'a0000020-0000-4000-8000-000000000020',
  'a0000002-0000-4000-8000-000000000002',
  'CARD-UID-SAMPLE-001',
  'active',
  now(),
  1,
  now(),
  now()
)
ON CONFLICT (company_id, card_uid) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. card_room_binding（カードを101号室に割当）
-- -----------------------------------------------------------------------------
INSERT INTO card_room_binding (
  card_room_binding_id,
  company_id,
  card_id,
  room_id,
  bound_at,
  updated_by_company_member_id,
  version,
  created_at,
  updated_at
) VALUES (
  'a0000030-0000-4000-8000-000000000030',
  'a0000002-0000-4000-8000-000000000002',
  'a0000020-0000-4000-8000-000000000020',
  'a0000010-0000-4000-8000-000000000010',
  now(),
  'a0000005-0000-4000-8000-000000000005',
  1,
  now(),
  now()
)
ON CONFLICT (card_room_binding_id) DO NOTHING;

-- =============================================================================
-- 以上：user, company, company_group, company_group_company, company_member,
--       room(3), card(1), card_room_binding(1) の初期投入
-- stay / guest_session / kudos 等は運用で発生するデータのため未投入
-- =============================================================================
