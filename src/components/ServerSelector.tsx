import type { ServerName } from "@/types";
import { SERVER_NAMES } from "@/types";

export type ServerFilter = ServerName | "all";

interface ServerSelectorProps {
  value?: ServerFilter;
  onChange?: (server: ServerFilter) => void;
}

export function ServerSelector({ value, onChange }: ServerSelectorProps) {
  const defaultValue: ServerFilter = "all";
  return (
    <label>
      サーバー
      <select
        value={value ?? defaultValue}
        onChange={(e) => onChange?.(e.target.value as ServerFilter)}
      >
        <option value="all">全鯖</option>
        {SERVER_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}