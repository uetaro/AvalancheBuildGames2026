# API: public-staff-list

## 概要
ゲストの滞在会社の勤務中スタッフを返す。ゲストセッションが必要。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-14a1e5b0/public-staff-list`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| X-Guest-Session-Token | header | ○ | ゲストセッショントークン |
| limit | query | - | ページサイズ（1–200、デフォルト: 50） |
| job_title | query | - | 役職でフィルター（部分一致） |
| cursor | query | - | ページネーションカーソル（started_at） |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| items | array | スタッフリスト |
| items[].company_member_id | string | メンバーID |
| items[].display_name | string | 表示名 |
| items[].job_title | string \| null | 役職 |
| items[].profile_image_url | string \| null | アバター署名付きURL |
| items[].on_duty_started_at | string \| null | 勤務開始時刻 |
| next_cursor | string \| null | 次ページカーソル |

## 処理説明

1. ゲストセッションを検証し、company_id を取得する。
2. 会社のアクティブな on_duty_sessions を取得する。
3. company_members（アクティブ、employee/staff/manager）を取得する。
4. 表示名フォールバックのため user と結合する。
5. Storage からアバター署名付きURLを取得する。
6. job_title フィルターを適用し、on_duty_started_at 降順でソートする。
7. items、next_cursor を返す。
