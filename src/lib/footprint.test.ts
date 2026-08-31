import { describe, it, expect } from 'vitest';
import { groupByMonth, groupByQuarter, type FootprintRecord } from './footprint';

function record(id: number, createdAt: string, co2Kg: number): FootprintRecord {
  return {
    id,
    distance: 1077,
    aircraft_type: 'NARROW_EFFICIENT',
    cabin_class: 'Y',
    co2_kg: co2Kg,
    route: 'PEK→SHA',
    created_at: createdAt,
  };
}

describe('groupByMonth', () => {
  it('buckets records per month with summed, rounded co2', () => {
    const buckets = groupByMonth([
      record(1, '2026-07-14 08:00:00', 96.75),
      record(2, '2026-07-20 09:00:00', 80.77),
      record(3, '2026-08-01 10:00:00', 96.93),
    ]);

    expect(buckets).toEqual([
      { key: '2026-07', label: '7月', count: 2, co2Kg: 177.52 },
      { key: '2026-08', label: '8月', count: 1, co2Kg: 96.93 },
    ]);
  });

  it('sorts ascending regardless of input order', () => {
    const buckets = groupByMonth([
      record(1, '2026-09-01 10:00:00', 50),
      record(2, '2026-01-01 10:00:00', 10),
    ]);
    expect(buckets.map((b) => b.key)).toEqual(['2026-01', '2026-09']);
  });

  it('skips records with malformed timestamps', () => {
    expect(groupByMonth([record(1, 'not-a-date', 50)])).toEqual([]);
  });
});

describe('groupByQuarter', () => {
  it('groups months into quarters', () => {
    const buckets = groupByQuarter([
      record(1, '2026-01-05 08:00:00', 10),
      record(2, '2026-03-30 08:00:00', 20),
      record(3, '2026-04-02 08:00:00', 40),
      record(4, '2026-10-01 08:00:00', 80),
    ]);

    expect(buckets).toEqual([
      { key: '2026-Q1', label: '2026 Q1', count: 2, co2Kg: 30 },
      { key: '2026-Q2', label: '2026 Q2', count: 1, co2Kg: 40 },
      { key: '2026-Q4', label: '2026 Q4', count: 1, co2Kg: 80 },
    ]);
  });

  it('returns an empty array for no records', () => {
    expect(groupByQuarter([])).toEqual([]);
  });
});
