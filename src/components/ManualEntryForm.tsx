import { useState, useRef, useMemo, useEffect } from "react";
import common from "./common.module.css";
import type { ServerName, PotentialType, CubeType, Grade } from "@/types";
import { SERVER_NAMES, GRADE_LABELS, GRADE_ORDER } from "@/types";

export interface ManualEntryInput {
  server_name: ServerName;
  potential_type: PotentialType;
  cube_type: CubeType;
  grade_before: Grade;
  grade_after: Grade;
  quantity_used: number;
  character_name: string | null;
  timestamp: number;
  part?: string;
  // used_at removed; timestamp is used for datetime
}

type FormErrors = Record<string, string>;

// Validation constants
const MAX_CHARACTER_NAME_LENGTH = 50;
const MAX_SERVER_NAME_LENGTH = 20;

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

// filteredCubeOptions will be defined inside the component using useMemo

const PART_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "-- 選択してください --" },
  { value: "weapon", label: "武器" },
  { value: "hat", label: "帽子" },
  { value: "gloves", label: "手袋" },
  { value: "shoes", label: "靴" },
  { value: "overall", label: "全身" },
  { value: "accessory", label: "アクセサリー" },
];

const GRADE_OPTIONS: { value: Grade; label: string }[] = GRADE_ORDER.map(
  (g) => ({ value: g, label: GRADE_LABELS[g] }),
);

/** default quantity value exposed for tests */
const DEFAULT_QUANTITY = "1";

/** Sanitize free-text input: trim and remove potentially dangerous characters */
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>&"']/g, '') // strip HTML-significant chars
    .trim();
}

/** Validate datetime-local string format (YYYY-MM-DDTHH:MM) */
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
  const [serverName, setServerName] = useState<string>(
    initialData?.server_name ?? "",
  );
  const [potentialType, setPotentialType] = useState<PotentialType>(
    initialData?.potential_type ?? "potential",
  );

  // キューブ選択肢を潜在能力種別に応じて動的に切り替える
  const filteredCubeOptions = useMemo(() => filteredCubeOptions_MAP[potentialType] ?? [], [potentialType]);
  const [cubeType, setCubeType] = useState<CubeType>(
    // 初期値は潜在能力種別に合わせて設定
    initialData?.cube_type ?? ("potential" === (initialData?.potential_type ?? "potential") ? "neo" : "neo_additional"),
  );

  // 潜在能力が変わったときにキューブをデフォルトにリセット
  useEffect(() => {
    const defaultCube = filteredCubeOptions[0]?.value;
    if (defaultCube && defaultCube !== cubeType) {
      setCubeType(defaultCube);
    }
  }, [potentialType, filteredCubeOptions]);
  // grade transition state (combined start and end grade)
  // Only allow adjacent grade transitions (e.g., rare→epic, epic→unique, unique→legendary)
  const GRADE_TRANSITION_OPTIONS = GRADE_ORDER.slice(0, -1).map((from, i) => ({
    value: `${from}-${GRADE_ORDER[i + 1]}`,
    label: `${GRADE_LABELS[from]} → ${GRADE_LABELS[GRADE_ORDER[i + 1]]}`,
  }));
  const [gradeTransition, setGradeTransition] = useState<string>(
    (() => {
      if (initialData?.grade_before && initialData?.grade_after) {
        return `${initialData.grade_before}-${initialData.grade_after}`;
      }
      // default transition: first two grades
      return `${GRADE_ORDER[0]}-${GRADE_ORDER[1]}`;
    })()
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
    // 使用日時（datetime-local） デフォルト空
  // 使用日時（datetime-local） デフォルトは現在日時
  const [timestamp, setTimestamp] = useState<string>(
    initialData?.timestamp
      ? (() => {
          const d = new Date(initialData.timestamp);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          const hours = String(d.getUTCHours()).padStart(2, '0');
          const minutes = String(d.getUTCMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        })()
      : (() => {
          const now = new Date();
          const year = now.getUTCFullYear();
          const month = String(now.getUTCMonth() + 1).padStart(2, '0');
          const day = String(now.getUTCDate()).padStart(2, '0');
          const hours = String(now.getUTCHours()).padStart(2, '0');
          const minutes = String(now.getUTCMinutes()).padStart(2, '0');
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
    // Validate grade transition format and order
    const [startGrade, endGrade] = gradeTransition.split("-");
    if (!startGrade || !endGrade) {
      newErrors.grade_transition = "等級遷移は '開始-終了' の形式で入力してください";
    } else {
      const startIdx = GRADE_ORDER.indexOf(startGrade as Grade);
      const endIdx = GRADE_ORDER.indexOf(endGrade as Grade);
      if (startIdx === -1 || endIdx === -1) {
        newErrors.grade_transition = "有効な等級を選択してください";
      } else if (startIdx >= endIdx) {
        newErrors.grade_transition = "開始等級は終了等級より前";
      }
    }

    if (Number(quantity) < 1) {
      newErrors.quantity = "使用個数は1以上で入力してください";
    }

    // grade transition validation is handled by the select options; no extra checks needed
    // 追加: アディショナル潜在能力の場合はネオアディショナルキューブのみ許可
    if (potentialType === "additional_potential" && cubeType !== "neo_additional") {
      newErrors.cube_type = "アディショナル潜在能力ではネオアディショナルキューブのみ選択可能です";
    }
    // サーバー名は意図的に必須ではない（オプション項目として扱う）
    // バリデーションチェックは行われない

    // Validate character name length
    if (characterName.length > MAX_CHARACTER_NAME_LENGTH) {
      newErrors.character_name = `キャラクター名は${MAX_CHARACTER_NAME_LENGTH}文字以内で入力してください`;
    }

    // Validate timestamp format if user has interacted with it
    if (timestampChanged && !isValidDatetimeLocal(timestamp)) {
      newErrors.timestamp = "正しい日時形式で入力してください (YYYY-MM-DDTHH:MM)";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Parse grade transition into before/after grades
    // startGrade/endGrade already defined earlier
    // DB 用に整形したデータを送信
    const gradeIdx = GRADE_ORDER.indexOf(startGrade as Grade);
    const gradeTransitionId = gradeIdx + 1; // 1=Rare→Epic, 2=Epic→Unique, 3=Unique→Legendary
    // Determine timestamp value: use provided initialData timestamp if present, otherwise use user-changed value or current time
    let timestampValue: number;
    if (initialData?.timestamp) {
      timestampValue = Number(new Date(timestamp).getTime());
    } else if (timestampChanged) {
      timestampValue = Number(new Date(timestamp).getTime());
    } else {
      timestampValue = Date.now();
    }
    onSubmit({
      server_name: serverName || null,
      potential_type: potentialType,
      cube_type: cubeType,
      grade_before: startGrade as Grade,
      grade_after: endGrade as Grade,
      quantity_used: Number(quantity),
      character_name: characterName ? sanitizeInput(characterName) : null,
      part: part || "other",
      // used_at omitted; timestamp is used for datetime
      timestamp: timestampValue,
      ...(editId ? { id: editId } : {}),
    });
  };

  return (
    <form className="container" data-testid="manual-entry-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="server_name">
          サーバー名（任意）
          <select
            id="server_name"
            value={serverName}
            onChange={(e) => {
              markInteracted();
              setServerName(e.target.value as ServerName);
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

      {/* キャラクター名（任意） */}
      <div>
        <label htmlFor="character_name">
          キャラクター名（任意）
          <input
            id="character_name"
            type="text"
            value={characterName}
            onChange={(e) => {
              markInteracted();
              const sanitized = sanitizeInput(e.target.value);
              setCharacterName(sanitized.slice(0, MAX_CHARACTER_NAME_LENGTH));
            }}
            maxLength={MAX_CHARACTER_NAME_LENGTH}
          />
        </label>
        {errors.character_name && (
          <span className="error">{errors.character_name}</span>
        )}
      </div>

      <div>
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

      <div>
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

      <div>
        <label htmlFor="grade_transition">
          等級遷移
          <select
            id="grade_transition"
            value={gradeTransition}
            onChange={(e) => {
              markInteracted();
              setGradeTransition(e.target.value);
            }}
          >
            {GRADE_TRANSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {errors.grade_transition && (
          <span className="error">{errors.grade_transition}</span>
        )}
      </div>

      <div>
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


      {/* 部位選択 */}
      <div>
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
      <div>
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


      <button className="button" type="submit">{editId ? "更新" : "登録"}</button>
    </form>
  );
}