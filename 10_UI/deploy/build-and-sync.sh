#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Heartel — Build all 3 apps and upload to a single S3 bucket
#
# Usage:
#   ./deploy/build-and-sync.sh <S3_BUCKET_NAME>
#
# Example:
#   ./deploy/build-and-sync.sh heartel-webapp-dev
#
# S3 layout:
#   /                → staff_web    (admin / preview)
#   /staff-mobile/   → staff_mobile
#   /guest-mobile/   → guest_mobile
# ──────────────────────────────────────────────────────────────────────────────

BUCKET="${1:?Usage: $0 <S3_BUCKET_NAME> [AWS_PROFILE]}"
PROFILE="${2:-stg-heartel-uehara}"
UI_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Building staff_web ==="
cd "$UI_DIR/staff_web"
npm run build:s3

echo ""
echo "=== Building staff_mobile ==="
cd "$UI_DIR/staff_mobile"
npm run build:s3

echo ""
echo "=== Building guest_mobile ==="
cd "$UI_DIR/guest_mobile"
npm run build:s3

echo ""
echo "=== Syncing to s3://${BUCKET} ==="

# staff_web → bucket root
aws s3 sync "$UI_DIR/staff_web/dist/" "s3://${BUCKET}/" \
  --delete \
  --exclude "staff-mobile/*" \
  --exclude "guest-mobile/*" \
  --profile "${PROFILE}"

# staff_mobile → /staff-mobile/
aws s3 sync "$UI_DIR/staff_mobile/dist/" "s3://${BUCKET}/staff-mobile/" \
  --delete \
  --profile "${PROFILE}"

# guest_mobile → /guest-mobile/
aws s3 sync "$UI_DIR/guest_mobile/dist/" "s3://${BUCKET}/guest-mobile/" \
  --delete \
  --profile "${PROFILE}"

echo ""
echo "=== Done ==="
echo "Deployed to s3://${BUCKET}"
echo ""
echo "S3 Layout:"
echo "  /               → staff_web (admin + /preview)"
echo "  /staff-mobile/  → staff_mobile"
echo "  /guest-mobile/  → guest_mobile"
