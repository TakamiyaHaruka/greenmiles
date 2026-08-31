import { describe, it, expect } from 'vitest';
import { AIRPORTS, getAirport, airportLabel, haversineKm, flightDistanceKm } from './airports';

describe('AIRPORTS', () => {
  it('covers the domestic trunk and common international hubs', () => {
    for (const code of ['PEK', 'SHA', 'CAN', 'SZX', 'CTU', 'HKG', 'NRT', 'SIN', 'LHR', 'LAX', 'SYD']) {
      expect(AIRPORTS[code], code).toBeDefined();
    }
  });

  it('looks airports up case-insensitively', () => {
    expect(getAirport('pek')?.city).toBe('北京');
    expect(getAirport('NOPE')).toBeUndefined();
  });

  it('labels airports as 城市+机场+代码', () => {
    expect(airportLabel('PEK')).toBe('北京首都 PEK');
    expect(airportLabel('NOPE')).toBe('NOPE');
  });
});

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm({ lat: 40, lon: 116 }, { lat: 40, lon: 116 })).toBe(0);
  });

  it('computes PEK→SHA at roughly 1077 km (known great-circle)', () => {
    const d = haversineKm(AIRPORTS.PEK, AIRPORTS.SHA);
    expect(d).toBeGreaterThan(1060);
    expect(d).toBeLessThan(1090);
  });

  it('is symmetric', () => {
    expect(haversineKm(AIRPORTS.PEK, AIRPORTS.LAX)).toBeCloseTo(
      haversineKm(AIRPORTS.LAX, AIRPORTS.PEK),
      6
    );
  });
});

describe('flightDistanceKm', () => {
  it('returns whole-km distances for known pairs', () => {
    expect(flightDistanceKm('PEK', 'SHA')).toBe(1077);
    expect(flightDistanceKm('PEK', 'LAX')).toBe(10037);
  });

  it('returns null when either airport is unknown', () => {
    expect(flightDistanceKm('PEK', 'NOPE')).toBeNull();
    expect(flightDistanceKm('NOPE', 'SHA')).toBeNull();
  });
});
