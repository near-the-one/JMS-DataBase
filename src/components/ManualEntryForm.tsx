import { useState, useRef, useMemo, useEffect } from "react";
import type { ServerName, PotentialType, CubeType, Grade } from "@/types";
import { SERVER_NAMES, GRADE_LABELS, GRADE_ORDER } from "@/types";

export interface ManualEntryInput {
  server_name: ServerName | null;
  potential_type: PotentialType;
  cube_type: CubeType;
  grade_before: Grade;
  grade_after?: Grade | null;
  result: "success" | "fail";
  quantity_used: number;
  character_name: string | null;
  timestamp: number;
  part?: string;
  // used_at removed; timestamp is used for datetime
}

type FormErrors = Record<string, string>;

// Validation constants
// 半角最大14文字、全角最大7文字（半角1、全角2として合計14以内）
const MAX_NAME_WIDTH = 14;

interface ManualEntryFormProps {
  onSubmit: (data: ManualEntryInput & { id?: number }) => void;
  initialData?: Partial<ManualEntryInput>;
  editId?: number;
}

const SERVER_OPTIONS: { value: ServerName; label: string }[] =
  SERVER_NAMES.map((s) => ({ value: s, label: s }));

const POTENTIAL_OPTIONS: { value: PotentialType; label: string }[] = [
  { value: "potential", label: "潜在能力" },
  { value: "additional_potential", label: "アディショナル潜在能力" },
];

const filteredCubeOptions_MAP: Record<PotentialType, { value: CubeType; label: string }[]> = {
  potential: [
    { value: "neo", label: "ネオキューブ" },
    { value: "mega", label: "メガキューブ" },
  ],
  additional_potential: [
    { value: "neo_additional", label: "ネオアディショナルキューブ" },
  ],
};

const PART_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "-- 選択してください --" },
  { value: "weapon", label: "武器" },
  { value: "hat", label: "帽子" },
  { value: "gloves", label: "手袋" },
  { value: "shoes", label: "靴" },
  { value: "overall", label: "全身" },
  { value: "accessory", label: "アクセサリー" },
];

/** default quantity value exposed for tests */
const DEFAULT_QUANTITY = "100";

/** Sanitize free-text input: trim and remove potentially dangerous characters */
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>&"']/g, '') // strip HTML-significant chars
    .trim();
}

/** Validate datetime-local string format (YYYY-MM-DDTHH:MM) */
function getNameWidth(name: string): number {
  let width = 0;
  for (const ch of name) {
    // 半角は ASCII 0x00-0xFF とみなす
    if (/[-ÿ]/.test(ch)) {
      width += 1;
    } else {
      width += 2;
    }
    if (width > MAX_NAME_WIDTH) break;
  }
  return width;
}

function isValidDatetimeLocal(value: string): boolean {
  // Basic regex for datetime-local format
  const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  if (!regex.test(value)) return false;
  // Check if it parses to a valid date
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function ManualEntryForm({
  onSubmit,
  initialData,
  editId,
}: ManualEntryFormProps) {
  const [serverName, setServerName] = useState<string | null>(
    initialData?.server_name ?? null,
  );

  const [potentialType, setPotentialType] = useState<PotentialType>(
    initialData?.potential_type ?? "potential",
  );

  // キューブ選択肢を潜在能力種別に応じて動的に切り替える
  const filteredCubeOptions = useMemo(() => filteredCubeOptions_MAP[potentialType] ?? [], [potentialType]);

  // 初期値は渡されたデータがあればそれ、なければ潜在能力種別に合わせたデフォルト
  const [cubeType, setCubeType] = useState<CubeType>(
    initialData?.cube_type ?? (potentialType === "potential" ? "neo" : "neo_additional"),
  );

  // 潜在能力が変わったときにキューブをデフォルトにリセット（UIの位置は変わらない）
  useEffect(() => {
    const defaultCube = filteredCubeOptions[0]?.value || (potentialType === "potential" ? "neo" : "neo_additional");
    if (cubeType !== defaultCube) {
      setCubeType(defaultCube as CubeType);
    }
  }, [potentialType, filteredCubeOptions]);

  // 挑戦した等級（結果は別途 result で success/fail を選ぶ。unique→legendaryが最頻出なのでデフォルトはunique）
  // 最後の等級(legendary)は「挑戦する等級」にはなり得ないので候補から除外
  const GRADE_BEFORE_OPTIONS = GRADE_ORDER.slice(0, -1).map((g) => ({
    value: g,
    label: `${GRADE_LABELS[g]} → ${GRADE_LABELS[GRADE_ORDER[GRADE_ORDER.indexOf(g) + 1]]}`,
  }));

  const [gradeBefore, setGradeBefore] = useState<Grade>(
    initialData?.grade_before ?? "unique",
  );

  // 結果: 上昇した(success) / 上昇しなかった(fail)。生存バイアス対策のため両方を登録できるようにする
  const [result, setResult] = useState<"success" | "fail">(
    initialData?.grade_after ? "success" : "fail",
  );

  const [quantity, setQuantity] = useState<string>(
    initialData?.quantity_used?.toString() ?? DEFAULT_QUANTITY,
  );

  const [characterName, setCharacterName] = useState(
    initialData?.character_name ?? "",
  );

  const [part, setPart] = useState<string>(
    initialData?.part ?? "",
  );

  // 使用日時（datetime-local） デフォルトは現在日時
  const [timestamp, setTimestamp] = useState<string>(
    initialData?.timestamp
      ? (() => {
        const jst = new Date(initialData.timestamp + 9 * 60 * 60 * 1000);
        const year = jst.getUTCFullYear();
        const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
        const day = String(jst.getUTCDate()).padStart(2, '0');
        const hours = String(jst.getUTCHours()).padStart(2, '0');
        const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      })()
      : (() => {
        const now = new Date();
        const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const year = jst.getUTCFullYear();
        const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
        const day = String(jst.getUTCDate()).padStart(2, '0');
        const hours = String(jst.getUTCHours()).padStart(2, '0');
        const minutes = String(jst.getUTCMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      })(),
  );

  const [timestampChanged, setTimestampChanged] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  const hasInteractedRef = useRef(!!editId || !!initialData);

  const markInteracted = () => {
    hasInteractedRef.current = true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markInteracted();

    const newErrors: FormErrors = {};

    if (!potentialType) newErrors.potential_type = "potential_typeは必須です";
    if (!cubeType) newErrors.cube_type = "cube_typeは必須です";

    if (!GRADE_ORDER.includes(gradeBefore) || GRADE_ORDER.indexOf(gradeBefore) >= GRADE_ORDER.length - 1) {
      newErrors.grade_before = "有効な等級を選択してください";
    }
    if (result !== "success" && result !== "fail") {
      newErrors.result = "結果を選択してください";
    }

    if (Number(quantity) < 1) {
      newErrors.quantity = "使用個数は1以上で入力してください";
    }

    if (potentialType === "additional_potential" && cubeType !== "neo_additional") {
      newErrors.cube_type = "アディショナル潜在能力ではネオアディショナルキューブのみ選択可能です";
    }

    if (getNameWidth(characterName) > MAX_NAME_WIDTH) {
      newErrors.character_name = `キャラクター名は${MAX_NAME_WIDTH}文字以内で入力してください`;
    }

    if (timestampChanged && timestamp && !isValidDatetimeLocal(timestamp)) {
      newErrors.timestamp = "正しい日時形式で入力してください (YYYY-MM-DDTHH:MM)";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    let timestampValue: number;
    if (initialData?.timestamp) {
      timestampValue = new Date(`${timestamp}:00+09:00`).getTime();
    } else if (timestampChanged && timestamp) {
      timestampValue = new Date(`${timestamp}:00+09:00`).getTime();
    } else {
      timestampValue = Date.now();
    }

    // 結果(success/fail)から grade_after を導出する。fail の場合は等級は変わらないので null
    const nextGrade = GRADE_ORDER[GRADE_ORDER.indexOf(gradeBefore) + 1];

    onSubmit({
      server_name: serverName as ServerName | null,
      potential_type: potentialType,
      cube_type: cubeType,
      grade_before: gradeBefore,
      grade_after: result === "success" ? nextGrade : null,
      result,
      quantity_used: Number(quantity),
      character_name: characterName ? sanitizeInput(characterName) : null,
      part: part || "other",
      timestamp: timestampValue,
      ...(editId ? { id: editId } : {}),
    });
  };

  return (
    <form className="form-card" data-testid="manual-entry-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="server_name">
            サーバー名（任意）
            <select
              id="server_name"
              value={serverName ?? ""}
              onChange={(e) => {
                markInteracted();
                setServerName(e.target.value as ServerName | null);
              }}
            >
              <option value="">-- 選択してください --</option>
              {SERVER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {errors.server_name && (
            <span className="error">{errors.server_name}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="character_name">
            キャラクター名（任意）
            <input
              id="character_name"
              type="text"
              value={characterName}
              onChange={(e) => {
                markInteracted();
                const sanitized = sanitizeInput(e.target.value);
                setCharacterName(sanitized.slice(0, MAX_NAME_WIDTH));
              }}
              maxLength={MAX_NAME_WIDTH}
            />
          </label>
          {errors.character_name && (
            <span className="error">{errors.character_name}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="potential_type">
            潜在能力種別
            <select
              id="potential_type"
              value={potentialType}
              onChange={(e) => {
                markInteracted();
                setPotentialType(e.target.value as PotentialType);
              }}
            >
              {POTENTIAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {errors.potential_type && (
            <span className="error">{errors.potential_type}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="cube_type">
            キューブ種類
            <select
              id="cube_type"
              value={cubeType}
              onChange={(e) => {
                markInteracted();
                setCubeType(e.target.value as CubeType);
              }}
            >
              {filteredCubeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {errors.cube_type && (
            <span className="error">{errors.cube_type}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="grade_before">
            挑戦した等級
            <select
              id="grade_before"
              value={gradeBefore}
              onChange={(e) => {
                markInteracted();
                setGradeBefore(e.target.value as Grade);
              }}
            >
              {GRADE_BEFORE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <p className="field-hint">
            「→{GRADE_LABELS[GRADE_ORDER[GRADE_ORDER.indexOf(gradeBefore) + 1]]}」への昇級を目指した回として登録します。結果は次の項目で選んでください。
          </p>
          {errors.grade_before && (
            <span className="error">{errors.grade_before}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="quantity">
            使用個数
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => {
                markInteracted();
                setQuantity(e.target.value);
              }}
            />
          </label>
          {errors.quantity && (
            <span className="error">{errors.quantity}</span>
          )}
        </div>

        {/* 結果（成功/失敗）。失敗データも登録できるようにして生存バイアスを防ぐ */}
        <div className="field full">
          <label>
            結果
          </label>
          <div className="result-segwrap" role="group" aria-label="結果">
            <button
              type="button"
              className={`result-seg fail${result === "fail" ? " active" : ""}`}
              aria-pressed={result === "fail"}
              onClick={() => {
                markInteracted();
                setResult("fail");
              }}
            >
              ❌ 上昇しなかった
            </button>
            <button
              type="button"
              className={`result-seg success${result === "success" ? " active" : ""}`}
              aria-pressed={result === "success"}
              onClick={() => {
                markInteracted();
                setResult("success");
              }}
            >
              ✅ 上昇した（→{GRADE_LABELS[GRADE_ORDER[GRADE_ORDER.indexOf(gradeBefore) + 1]]}）
            </button>
          </div>
          <p className="field-encourage">
            💡 上昇しなかった記録もとても貴重なデータです。「爆死」こそ、確率の正確さを支えます。ぜひ登録してください。
          </p>
          {errors.result && <span className="error">{errors.result}</span>}
        </div>

        {/* 部位選択 */}
        <div className="field full">
          <label htmlFor="part">
            部位（任意）
            <select
              id="part"
              value={part}
              onChange={(e) => {
                markInteracted();
                setPart(e.target.value);
              }}
            >
              {PART_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 使用日時入力 */}
        <div className="field full">
          <label htmlFor="timestamp">
            使用日時（任意）
            <input
              id="timestamp"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => {
                markInteracted();
                setTimestamp(e.target.value);
                setTimestampChanged(true);
              }}
            />
          </label>
          {errors.timestamp && (
            <span className="error">{errors.timestamp}</span>
          )}
        </div>
      </div>

      <button className="btn-primary" type="submit">{editId ? "更新" : "登録する"}</button>
    </form>
  );
}
