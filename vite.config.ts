import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// 環境変数でSupabase URLを切り替え（ローカル開発時はローカルSupabase、本番は本番Supabase）
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hfvwgqubodiqftnfvceg.supabase.co";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/functions": {
        target: supabaseUrl,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    dangerouslyIgnoreUnhandledErrors: true,
  },
});