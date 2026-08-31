import { describe, it, expect } from 'vitest';
import {
  MockFlightProvider,
  getFlightProvider,
  ICAO_AIRCRAFT_MAP,
  type FlightInfoProvider,
} from './flightInfo';

describe('ICAO_AIRCRAFT_MAP', () => {
  it('maps neo/MAX narrow-bodies to the efficient tier', () => {
    expect(ICAO_AIRCRAFT_MAP.A20N).toBe('NARROW_EFFICIENT');
    expect(ICAO_AIRCRAFT_MAP.B38M).toBe('NARROW_EFFICIENT');
  });

  it('maps current-gen narrow-bodies to the standard tier', () => {
    expect(ICAO_AIRCRAFT_MAP.A321).toBe('NARROW_STANDARD');
    expect(ICAO_AIRCRAFT_MAP.B738).toBe('NARROW_STANDARD');
  });

  it('maps 787/A350 to the efficient wide-body tier', () => {
    expect(ICAO_AIRCRAFT_MAP.B789).toBe('WIDE_EFFICIENT');
    expect(ICAO_AIRCRAFT_MAP.A359).toBe('WIDE_EFFICIENT');
  });

  it('maps 777/747/A380 to the large wide-body tier', () => {
    expect(ICAO_AIRCRAFT_MAP.B77W).toBe('WIDE_LARGE');
    expect(ICAO_AIRCRAFT_MAP.A388).toBe('WIDE_LARGE');
  });
});

describe('MockFlightProvider', () => {
  // Typed as the interface so the lookup signature is exercised as callers use it
  const provider: FlightInfoProvider = new MockFlightProvider();

  it('resolves a seeded flight with locally computed distance', async () => {
    const info = await provider.lookup('ca1501', '2026-09-15');
    expect(info).not.toBeNull();
    expect(info!.flightNo).toBe('CA1501');
    expect(info!.airline).toBe('国航');
    expect(info!.dep).toBe('PEK');
    expect(info!.arr).toBe('SHA');
    expect(info!.distanceKm).toBe(1077);
    expect(info!.aircraftCode).toBe('A20N');
    expect(info!.aircraftType).toBe('NARROW_EFFICIENT');
    expect(info!.source).toBe('mock');
  });

  it('maps a wide-body long-haul flight', async () => {
    const info = await provider.lookup('CA987');
    expect(info!.dep).toBe('PEK');
    expect(info!.arr).toBe('LAX');
    expect(info!.distanceKm).toBe(10037);
    expect(info!.aircraftType).toBe('WIDE_LARGE');
  });

  it('returns null for unknown flight numbers', async () => {
    expect(await provider.lookup('ZZ9999')).toBeNull();
  });
});

describe('getFlightProvider', () => {
  it('returns the mock provider until a real adapter is wired', () => {
    expect(getFlightProvider().source).toBe('mock');
  });
});
