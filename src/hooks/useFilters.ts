import { useState, useCallback } from 'react';
import type { ServerName, PotentialType, CubeType, Grade, ManualEntryRecord } from '@/types';

/**
 * Filter values for manual entry records.
 */
export type FilterValues = {
  server: ServerName | 'all';
  potential: PotentialType | 'all';
  cube: CubeType | 'all';
  grade_before: Grade | 'all';
  grade_after: Grade | 'all';
  quantity_min: number | null;
  quantity_max: number | null;
  character: string;
  date_from: string; // YYYY-MM-DD
  date_to: string; // YYYY-MM-DD
};

/**
 * Simple sanitization for free-text filter inputs.
 * Strips characters that could be used for injection if the value were ever rendered unsafely.
 */
function sanitizeFilterInput(input: string): string {
  return input
    .replace(/[<>&"']/g, '') // remove HTML-significant chars
    .trim();
}

/**
 * Hook that manages filter state and provides a function to apply those filters to a list of records.
 */
export function useFilters() {
  const [server, setServer] = useState<FilterValues['server']>('all');
  const [potential, setPotential] = useState<FilterValues['potential']>('all');
  const [cube, setCube] = useState<FilterValues['cube']>('all');
  const [gradeBefore, setGradeBefore] = useState<FilterValues['grade_before']>('all');
  const [gradeAfter, setGradeAfter] = useState<FilterValues['grade_after']>('all');
  const [quantityMin, setQuantityMin] = useState<FilterValues['quantity_min']>(null);
  const [quantityMax, setQuantityMax] = useState<FilterValues['quantity_max']>(null);
  const [character, setCharacter] = useState<FilterValues['character']>('');
  const [dateFrom, setDateFrom] = useState<FilterValues['date_from']>('');
  const [dateTo, setDateTo] = useState<FilterValues['date_to']>('');

  const setServerCb = useCallback((s: ServerName | 'all') => setServer(s), []);
  const setPotentialCb = useCallback((p: PotentialType | 'all') => setPotential(p), []);
  const setCubeCb = useCallback((c: CubeType | 'all') => setCube(c), []);
  const setGradeBeforeCb = useCallback((g: Grade | 'all') => setGradeBefore(g), []);
  const setGradeAfterCb = useCallback((g: Grade | 'all') => setGradeAfter(g), []);
  const setQuantityMinCb = useCallback((n: number | null) => setQuantityMin(n), []);
  const setQuantityMaxCb = useCallback((n: number | null) => setQuantityMax(n), []);
  const setCharacterCb = useCallback((s: string) => setCharacter(sanitizeFilterInput(s)), []);
  const setDateFromCb = useCallback((d: string) => setDateFrom(d), []);
  const setDateToCb = useCallback((d: string) => setDateTo(d), []);

  const filters: FilterValues = {
    server,
    potential,
    cube,
    grade_before: gradeBefore,
    grade_after: gradeAfter,
    quantity_min: quantityMin,
    quantity_max: quantityMax,
    character,
    date_from: dateFrom,
    date_to: dateTo,
  };

  const applyFilters = useCallback(
    (records: ManualEntryRecord[]) => {
      return records.filter((r) => {
        // server filter
        if (filters.server !== 'all' && r.server_name !== filters.server) return false;
        // potential filter
        if (filters.potential !== 'all' && r.potential_type !== filters.potential) return false;
        // cube filter
        if (filters.cube !== 'all' && r.cube_type !== filters.cube) return false;
        // grade before filter
        if (filters.grade_before !== 'all' && r.grade_before !== filters.grade_before) return false;
        // grade after filter
        if (filters.grade_after !== 'all' && r.grade_after !== filters.grade_after) return false;
        // quantity min filter
        if (filters.quantity_min !== null && r.quantity_used < filters.quantity_min) return false;
        // quantity max filter
        if (filters.quantity_max !== null && r.quantity_used > filters.quantity_max) return false;
        // character filter (exact match if non‑empty)
        if (filters.character) {
          const name = r.character_name ?? '';
          if (name !== filters.character) return false;
        }
        // date range filter – compare timestamp date
        if (filters.date_from) {
          const dateStr = new Date(r.timestamp * 1000).toISOString().split('T')[0];
          if (dateStr < filters.date_from) return false;
        }
        if (filters.date_to) {
          const dateStr = new Date(r.timestamp * 1000).toISOString().split('T')[0];
          if (dateStr > filters.date_to) return false;
        }
        return true;
      });
    },
    [filters]
  );

  const setAll = (newVals: FilterValues) => {
    setServer(newVals.server);
    setPotential(newVals.potential);
    setCube(newVals.cube);
    setGradeBefore(newVals.grade_before);
    setGradeAfter(newVals.grade_after);
    setQuantityMin(newVals.quantity_min);
    setQuantityMax(newVals.quantity_max);
    setCharacter(newVals.character);
    setDateFrom(newVals.date_from);
    setDateTo(newVals.date_to);
  };

  return {
    filters,
    setServer: setServerCb,
    setPotential: setPotentialCb,
    setCube: setCubeCb,
    setGradeBefore: setGradeBeforeCb,
    setGradeAfter: setGradeAfterCb,
    setQuantityMin: setQuantityMinCb,
    setQuantityMax: setQuantityMaxCb,
    setCharacter: setCharacterCb,
    setDateFrom: setDateFromCb,
    setDateTo: setDateToCb,
    applyFilters,
    setAll,
  };
}
