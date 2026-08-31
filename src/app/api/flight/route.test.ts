import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/api/flight${query}`);
}

describe('GET /api/flight', () => {
  it('resolves a seeded flight with distance and labels', async () => {
    const response = await GET(makeRequest('?flightNo=CA1501&date=2026-09-15'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual({
      flightNo: 'CA1501',
      airline: '国航',
      dep: 'PEK',
      arr: 'SHA',
      distanceKm: 1077,
      aircraftCode: 'A20N',
      aircraftType: 'NARROW_EFFICIENT',
      source: 'mock',
      depLabel: '北京首都 PEK',
      arrLabel: '上海虹桥 SHA',
    });
  });

  it('rejects malformed flight numbers', async () => {
    const response = await GET(makeRequest('?flightNo=not-a-flight'));
    expect(response.status).toBe(400);
  });

  it('rejects malformed dates', async () => {
    const response = await GET(makeRequest('?flightNo=CA1501&date=2026/09/15'));
    expect(response.status).toBe(400);
  });

  it('returns 404 with a hint for unknown flights', async () => {
    const response = await GET(makeRequest('?flightNo=ZZ9999'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('手动选择起降机场');
  });

  it('works without a date parameter', async () => {
    const response = await GET(makeRequest('?flightNo=MU5137'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.dep).toBe('SHA');
    expect(data.data.arr).toBe('CAN');
  });
});
