import { useState, useCallback } from 'react';
import type { ServerName } from '@/types';

// Simple stub: default server is the first listed in SERVER_NAMES
export function useServerFilter() {
  // server filter can be "all" or a specific server name
  const [server, setServer] = useState<ServerName | "all">('all');
  // removed previous default server definition
  const set = useCallback((s: ServerName) => setServer(s), []);
  return { server, setServer: set };
}
