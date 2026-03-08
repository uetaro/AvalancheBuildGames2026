# ゲストモバイル: ホーム画面

## 画面概要
滞在情報と Kudos 残数を表示し、Send Kudos や Sent Kudos への導線を提供する。

## パス
`/home`

## 表示項目

| 項目 | 説明 |
|------|------|
| 会社名 | stay_data.company_name |
| マイページボタン | ヘッダ右、User アイコン |
| Welcome / Guest | ウェルカム文言 |
| Room | 部屋コード、部屋ラベル |
| Kudos Available | remaining_quota / total_quota |
| カード風エリア | ロゴ、Room、Card Number、Check-in 日時 |
| Send Kudos | メインCTA（残数0で無効化） |
| Sent Kudos | 送信履歴へのリンク |
| Have an Account? | ログイン/サインアップへの導線 |

## 操作・アクション

| 操作 | 動作 |
|------|------|
| マイページ | /my-page へ遷移 |
| Send Kudos | remaining_quota > 0 の場合 /staff へ遷移 |
| Sent Kudos | /my-page/kudos へ遷移 |
| Login or Sign Up | /account/create へ遷移 |

## データソース
- localStorage: stay_data, remaining_quota, rules_snapshot
- focus / visibilitychange で quota を再読み込み

## 遷移先
- `/my-page` — マイページ
- `/staff` — スタッフ選択
- `/my-page/kudos` — Kudos 履歴
- `/account/create` — アカウント作成
