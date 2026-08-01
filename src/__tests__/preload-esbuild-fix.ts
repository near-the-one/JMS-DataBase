// Phase 7: esbuild invariant check 回避用のプリロードファイル
// vitest --import で実行時に、esbuild よりも先に TextEncoder を修正する
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const util = req("node:util") as { TextEncoder: typeof globalThis.TextEncoder; TextDecoder: typeof globalThis.TextDecoder };

(globalThis as Record<string, unknown>).TextEncoder = util.TextEncoder;
(globalThis as Record<string, unknown>).TextDecoder = util.TextDecoder;