import { renderHook, act } from '@testing-library/react';
import { useFilters } from '@/hooks/useFilters';
import type { ManualEntryRecord } from '@/types';

describe('useFilters hook', () => {
  const records: ManualEntryRecord[] = [
    {
      id: 1,
      server_name: 'かえで',
      potential_type: 'potential',
      cube_type: 'neo',
      grade_before: 'rare',
      grade_after: 'epic',
      quantity_used: 5,
      character_name: 'Alice',
      timestamp: 1722288000,
    },
    {
      id: 2,
      server_name: 'ゆかり',
      potential_type: 'additional_potential',
      cube_type: 'mega',
      grade_before: 'epic',
      grade_after: 'unique',
      quantity_used: 3,
      character_name: 'Bob',
      timestamp: 1722374400,
    },
  ];

  it('filters by server correctly', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setServer('かえで');
    });
    const filtered = result.current.applyFilters(records);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].server_name).toBe('かえで');
  });
});
