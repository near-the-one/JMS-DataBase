import { useState, useCallback } from 'react';
import type { TimingType } from '@/types';

// Simple stub: default timing is "normal"
export function useTimingFilter() {
  // timing filter can be "all" or specific timing
  const [timing, setTiming] = useState<'all' | TimingType>('all');
  const set = useCallback((t: 'all' | TimingType) => setTiming(t), []);
  return { timing, setTiming: set };
}
