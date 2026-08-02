# 重要な設定: Supabase Edge Function の環境変数

上記のコード変更により、`cube-stats` Edge Function は **service_role_key** を使用して RLS をバイパスし、`miracle_time_schedules` テーブルにアクセスします。

## 必要な設定手順

1. Supabase ダッシュボードにアクセス
2. 左メニューから **Edge Functions** → `cube-stats` を選択
3. **環境変数** タブを開く
4. 次の変数を追加:
   - **キー**: `SUPABASE_SERVICE_ROLE_KEY`
   - **値**: プロジェクト設定 → API から取得できる `service_role_key`（anonキーではない）
5. **保存**してから **再デプロイ** を実行

## なぜこれが必要か？

- `security_policies.sql` で `anon` ロールの `miracle_time_schedules` テーブルへのアクセスをすべて削除しました
- したがって、Edge Function が `anon` キーでアクセスすると `permission denied` エラーになります
- `service_role_key` は RLS をバイパスし、データベースレベルのポリシーを無視してフルアクセスを提供します
- これにより、ダッシュボードからのみテーブルを管理し、API からは読み取り専用で運用できます

## デプロイ後の動作確認

設定とデプロイが完了したら、次のURLで動作を確認してください：

```
https://jms-data-base-near-the-ones-projects.vercel.app/functions/v1/cube-stats
```

正常に動作している場合は、以下のような JSON レスポンスが返ってきます：

```json
{
  "stats": [...],
  "meta": {...},
  "participant_users": 5,
  "is_miracle_time": false
}
```

以上で設定は完了です。セキュリティはデータベースレベル（RLS）と API レベル（Edge Function の制限）の二重構造になっています。