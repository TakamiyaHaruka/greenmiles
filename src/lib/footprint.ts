// Aggregations over a member's carbon_records for the footprint page:
// monthly trend buckets for the bar chart and quarterly report buckets.

export interface FootprintRecord {
  id: number;
  distance: number;
  aircraft_type: string;
  cabin_class: string;
  co2_kg: number;
  route: string | null;
  created_at: string;
}

export interface FootprintBucket {
  key: string; // '2026-08' for months, '2026-Q3' for quarters
  label: string; // '08月' for months, '2026 Q3' for quarters
  count: number;
  co2Kg: number; // rounded to 2 decimals
}

type Interval = 'month' | 'quarter';

function bucketKey(createdAt: string, interval: Interval): { key: string; label: string } | null {
  // created_at is SQLite CURRENT_TIMESTAMP: 'YYYY-MM-DD hh:mm:ss' (UTC)
  const match = createdAt.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const [, year, month] = match;
  if (interval === 'month') {
    return { key: `${year}-${month}`, label: `${Number(month)}月` };
  }
  const quarter = Math.floor((Number(month) - 1) / 3) + 1;
  return { key: `${year}-Q${quarter}`, label: `${year} Q${quarter}` };
}

function group(records: FootprintRecord[], interval: Interval): FootprintBucket[] {
  const buckets = new Map<string, FootprintBucket>();
  for (const record of records) {
    const bucket = bucketKey(record.created_at, interval);
    if (!bucket) continue;
    const existing = buckets.get(bucket.key) || { key: bucket.key, label: bucket.label, count: 0, co2Kg: 0 };
    existing.count += 1;
    existing.co2Kg = Math.round((existing.co2Kg + record.co2_kg) * 100) / 100;
    buckets.set(bucket.key, existing);
  }
  // Ascending by key so charts read left-to-right through time
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function groupByMonth(records: FootprintRecord[]): FootprintBucket[] {
  return group(records, 'month');
}

export function groupByQuarter(records: FootprintRecord[]): FootprintBucket[] {
  return group(records, 'quarter');
}
