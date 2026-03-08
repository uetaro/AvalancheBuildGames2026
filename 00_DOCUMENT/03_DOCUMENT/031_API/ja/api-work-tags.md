# API: work-tags

## 概要
利用可能な勤務タグを一覧表示する（デバッグ/管理用）。

## エンドポイント
- **メソッド:** GET
- **パス:** `/api/make-server-c253248c/work-tags`

## 入力

| 項目 | 型 | 必須 | 説明 |
|------|------|----------|-------------|
| Authorization | header | ○ | Bearer トークン |

## 出力（成功: 200）

| 項目 | 型 | 説明 |
|------|------|-------------|
| tags | array | 勤務タグリスト |
| tags[].work_tag_id | string | タグID |
| tags[].work_tag_public_id | string | 公開ID |
| tags[].company_id | string | 会社ID |
| tags[].intended_action | string | clockin, clockout, auto |
| tags[].work_tag_status | string | active |
| tags[].work_tag_label | string | ラベル |

## 処理説明

1. 認証する。
2. work_tag_status=active の work_tag をクエリする。
3. created_at 降順でソートする。
4. tags を返す。
