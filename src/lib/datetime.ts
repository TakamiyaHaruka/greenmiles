// SQLite CURRENT_TIMESTAMP has no timezone suffix but always represents UTC.
// Also accept ISO date-times, preserving an explicit Z or numeric offset.
const DATABASE_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?([Zz]|[+-]\d{2}:?\d{2})?$/;

export function parseDatabaseDateTime(value: string): Date | null {
  if (typeof value !== 'string') return null;
  const parts = DATABASE_DATE_TIME.exec(value.trim());
  if (!parts) return null;

  const [, year, month, day, hour, minute, second, fraction, zone] = parts;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  date.setUTCHours(Number(hour), Number(minute), Number(second), Number((fraction ?? '').padEnd(3, '0')));

  // Date normalizes overflows (e.g. February 30); reject them instead.
  if (date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(month) - 1
    || date.getUTCDate() !== Number(day)
    || date.getUTCHours() !== Number(hour)
    || date.getUTCMinutes() !== Number(minute)
    || date.getUTCSeconds() !== Number(second)) return null;

  if (zone && zone.toUpperCase() !== 'Z') {
    const offset = zone.slice(1).replace(':', '');
    const offsetHours = Number(offset.slice(0, 2));
    const offsetMinutes = Number(offset.slice(2));
    if (offsetHours > 23 || offsetMinutes > 59) return null;
    const direction = zone[0] === '+' ? 1 : -1;
    date.setTime(date.getTime() - direction * (offsetHours * 60 + offsetMinutes) * 60_000);
  }

  return date;
}

/** Display an instant in the browser's local timezone, consistently across views. */
export function formatDateTime(value: string): string {
  const date = parseDatabaseDateTime(value);
  if (!date) return '时间未知';

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
