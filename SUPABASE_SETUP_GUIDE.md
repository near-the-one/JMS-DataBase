# Supabase セットアップガイド

## 1. SQL を Supabase ダッシュボードで実行

`supabase/security_policies.sql` の内容をコピーし、以下で実行してください：

**Supabase ダッシュボード → SQL Editor → 新しいクエリ → 貼り付け → 実行**

これにより以下が設定されます：
- RLS（行レベルセキュリティ）の有効化
- `cube_usage_events`: 匿名アクセスは SELECT と INSERT のみ
- `miracle_time_schedules`: 匿名アクセスは SELECT のみ（書き込みはダッシュボードからのみ）
- 実際のスキーマに合わせた制約条件の設定

---

## 2. Edge Function の環境変数設定

1. **Supabase ダッシュボード → Edge Functions → `cube-stats` を選択**
2. **「環境変数」タブを開く**
3. 以下を追加して保存：

| キー | 値 |
|------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | プロジェクト設定 → API の `service_role_key`（anonキーではない） |

4. **保存後、「再デプロイ」ボタンをクリック**

---

## 3. なぜこれが必要か？

| テーブル | 匿名（anonキー） | service_roleキー（Edge Function） | ダッシュボード |
|----------|------------------|----------------------------------|----------------|
| `cube_usage_events` | SELECT, INSERT | ALL（RLSバイパス） | ALL |
| `miracle_time_schedules` | **SELECT のみ** | ALL（RLSバイパス） | ALL |

- SQL で `anon` の書き込み権限を削除し、SELECT のみに制限しました
- Edge Function は `service_role_key` を使って RLS をバイパスし、必要なデータにアクセスします
- これにより「ダッシュボードからのみ管理」「外部からは参照と登録のみ」が実現されます

---

## 4. 動作確認

デプロイ完了後、以下にアクセスして JSON が返ってくることを確認：

```
https://jms-data-base-near-the-ones-projects.vercel.app/functions/v1/cube-stats
```

正常なレスポンス例：
```json
{
  "stats": [...],
  "meta": {...},
  "participant_users": 5,
  "is_miracle_time": false
}
```

---

## 5. トラブルシューティング

| エラー | 対処 |
|--------|------|
| SQL 実行でエラー | ステップごとに分けて実行（RLS有効化 → ポリシー → 制約 → 権限） |
| Edge Function で 403/401 | `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されてるか確認 |
| Vercel で 404 | GitHub へプッシュして Vercel デプロイが完了してるか確認 |

---

## 6. セキュリティモデルまとめ

- **データベース層**: RLS + CHECK制約で不正データを防止（最重要）
- **API層**: Edge Function は service_role_key 使用だが、レート制限・キャッシュ・入力検証で保護
- **クライアント層**: リポジトリ検証はUX向上と二重防御

以上で「DBは管理画面からのみ操作」「外部からはSELECTと登録のINSERTのみ」という要件を満たします。