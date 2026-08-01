import { useCallback } from 'react';

// Simple stub for worker control – start/stop are no‑ops in this placeholder.
export function useWorker() {
  const startWorker = useCallback(() => {
    // placeholder: would start a WebWorker in real code
  }, []);
  const stopWorker = useCallback(() => {
    // placeholder: would stop the worker
  }, []);
  return { startWorker, stopWorker };
}
