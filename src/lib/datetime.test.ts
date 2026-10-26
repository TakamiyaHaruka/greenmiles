import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateTime, parseDatabaseDateTime } from './datetime';

afterEach(() => vi.unstubAllEnvs());

describe('parseDatabaseDateTime', () => {
  it.each([
    '2026-10-26 12:00:00',
    '2026-10-26T12:00:00',
    '2026-10-26T12:00:00Z',
    '2026-10-26T20:00:00+08:00',
    '2026-10-26 20:00:00+0800',
    '2026-10-26T08:00:00-04:00',
    ' 2026-10-26 12:00:00 ',
  ])('parses %s as the same UTC instant', (value) => {
    expect(parseDatabaseDateTime(value)?.toISOString()).toBe('2026-10-26T12:00:00.000Z');
  });

  it.each(['UTC', 'Asia/Hong_Kong', 'America/New_York', 'Asia/Kathmandu'])('parses naive timestamps independently of %s', (zone) => {
    vi.stubEnv('TZ', zone);
    expect(parseDatabaseDateTime('2026-10-26 12:00:00')?.toISOString()).toBe('2026-10-26T12:00:00.000Z');
  });

  it.each([
    ['2024-02-29 23:59:59.1', '2024-02-29T23:59:59.100Z'],
    ['2026-10-26T12:00:00.12Z', '2026-10-26T12:00:00.120Z'],
    ['2026-10-26T00:15:00.123+05:45', '2026-10-25T18:30:00.123Z'],
    ['2026-10-26T23:15:00-03:30', '2026-10-27T02:45:00.000Z'],
    ['0099-01-01 00:00:00', '0099-01-01T00:00:00.000Z'],
  ])('preserves calendar fields and offsets in %s', (value, expected) => {
    expect(parseDatabaseDateTime(value)?.toISOString()).toBe(expected);
  });

  it.each([
    '', ' ', 'invalid', '2026-10-26', '10/26/2026 12:00:00',
    '2026-02-29 12:00:00', '2026-02-30T12:00:00+08:00',
    '2026-04-31 12:00:00', '2026-00-01 12:00:00', '2026-13-01 12:00:00',
    '2026-10-00 12:00:00', '2026-10-26 24:00:00', '2026-10-26 12:60:00',
    '2026-10-26 12:00:60', '2026-10-26T12:00:00+24:00',
    '2026-10-26T12:00:00+08:60', '2026-10-26T12:00:00ZZ',
  ])('rejects invalid timestamp %s safely', (value) => {
    expect(parseDatabaseDateTime(value)).toBeNull();
    expect(formatDateTime(value)).toBe('时间未知');
  });
});

describe('formatDateTime', () => {
  it.each([
    ['UTC', '2026-10-26 12:00:00', '2026/10/26 12:00:00'],
    ['Asia/Hong_Kong', '2026-10-26 12:00:00', '2026/10/26 20:00:00'],
    ['Asia/Hong_Kong', '2026-10-26 20:30:00', '2026/10/27 04:30:00'],
    ['Asia/Hong_Kong', '2026-10-26 16:00:00', '2026/10/27 00:00:00'],
    ['America/New_York', '2026-10-26 01:30:00', '2026/10/25 21:30:00'],
    ['Asia/Kathmandu', '2026-10-26 20:30:00', '2026/10/27 02:15:00'],
    ['America/New_York', '2026-03-08 06:59:59', '2026/03/08 01:59:59'],
    ['America/New_York', '2026-03-08 07:00:00', '2026/03/08 03:00:00'],
    ['America/New_York', '2026-11-01 05:59:59', '2026/11/01 01:59:59'],
    ['America/New_York', '2026-11-01 06:00:00', '2026/11/01 01:00:00'],
  ])('formats %s local date and time for %s', (zone, value, expected) => {
    vi.stubEnv('TZ', zone);
    expect(formatDateTime(value)).toBe(expected);
  });
});
