// Flight info providers: turn "flight number + date" into a route + aircraft,
// so the calculator can be prefilled instead of hand-typed.
//
// Distance is NOT fetched from a provider — it is derived locally from airport
// coordinates (see airports.ts). A provider only needs to return the two
// airports and, when known, the ICAO aircraft type designator.
//
// VariFlight and FlightAware's AeroAPI both fit this interface, but both are
// commercial (enterprise contract / monthly credit). The demo therefore ships
// with a seeded MockProvider; a real adapter can be swapped in later by
// implementing FlightInfoProvider and extending getFlightProvider().

import type { AircraftType } from '@/lib/carbon';
import { flightDistanceKm } from '@/lib/airports';

export interface FlightInfo {
  /** Uppercase flight number, e.g. CA1501 */
  flightNo: string;
  /** Airline display name, e.g. 国航 — omitted when the provider doesn't know */
  airline?: string;
  /** Departure airport IATA code */
  dep: string;
  /** Arrival airport IATA code */
  arr: string;
  /** Great-circle distance in km (computed locally) */
  distanceKm: number;
  /** ICAO type designator, e.g. A20N — omitted when the provider doesn't know */
  aircraftCode?: string;
  /** Coefficient tier mapped from aircraftCode — omitted when unmapped */
  aircraftType?: AircraftType;
  /** Which provider served this lookup, surfaced for demo transparency */
  source: 'mock' | 'aeroapi' | 'variflight';
}

export interface FlightInfoProvider {
  readonly source: FlightInfo['source'];
  lookup(flightNo: string, date?: string): Promise<FlightInfo | null>;
}

/** ICAO type designators → the 4 coefficient tiers in carbon.ts */
export const ICAO_AIRCRAFT_MAP: Record<string, AircraftType> = {
  // Narrow-body, new generation (A320neo / B737 MAX family)
  A20N: 'NARROW_EFFICIENT', A21N: 'NARROW_EFFICIENT', B38M: 'NARROW_EFFICIENT',
  // Narrow-body, current generation
  A319: 'NARROW_STANDARD', A320: 'NARROW_STANDARD', A321: 'NARROW_STANDARD',
  B737: 'NARROW_STANDARD', B738: 'NARROW_STANDARD', B739: 'NARROW_STANDARD',
  // Wide-body, efficient (787 / A350 / A330neo)
  B788: 'WIDE_EFFICIENT', B789: 'WIDE_EFFICIENT', B78X: 'WIDE_EFFICIENT',
  A339: 'WIDE_EFFICIENT', A359: 'WIDE_EFFICIENT', A35K: 'WIDE_EFFICIENT',
  // Wide-body, large (777 / 747 / A380)
  B772: 'WIDE_LARGE', B773: 'WIDE_LARGE', B77W: 'WIDE_LARGE', B77L: 'WIDE_LARGE',
  B744: 'WIDE_LARGE', B748: 'WIDE_LARGE', A388: 'WIDE_LARGE',
};

/** Seeded demo flights (realistic route/aircraft pairings, dates ignored) */
const MOCK_FLIGHTS: Record<string, { dep: string; arr: string; aircraftCode: string; airline: string }> = {
  CA1501: { dep: 'PEK', arr: 'SHA', aircraftCode: 'A20N', airline: '国航' },
  CA987: { dep: 'PEK', arr: 'LAX', aircraftCode: 'B77W', airline: '国航' },
  MU5137: { dep: 'SHA', arr: 'CAN', aircraftCode: 'B38M', airline: '东航' },
  MU583: { dep: 'PVG', arr: 'LAX', aircraftCode: 'A359', airline: '东航' },
  CZ343: { dep: 'CAN', arr: 'CTU', aircraftCode: 'A321', airline: '南航' },
  HU7147: { dep: 'PEK', arr: 'SZX', aircraftCode: 'B789', airline: '海航' },
  SQ831: { dep: 'SIN', arr: 'PVG', aircraftCode: 'B78X', airline: '新航' },
  TG615: { dep: 'BKK', arr: 'PEK', aircraftCode: 'A359', airline: '泰航' },
};

export class MockFlightProvider implements FlightInfoProvider {
  readonly source = 'mock' as const;

  // Dates are ignored — seeded flights operate daily
  async lookup(flightNo: string): Promise<FlightInfo | null> {
    const flight = MOCK_FLIGHTS[flightNo.toUpperCase()];
    if (!flight) return null;

    const distanceKm = flightDistanceKm(flight.dep, flight.arr);
    if (distanceKm === null) return null;

    return {
      flightNo: flightNo.toUpperCase(),
      airline: flight.airline,
      dep: flight.dep,
      arr: flight.arr,
      distanceKm,
      aircraftCode: flight.aircraftCode,
      aircraftType: ICAO_AIRCRAFT_MAP[flight.aircraftCode],
      source: this.source,
    };
  }
}

/**
 * Chooses the active provider. Only the seeded mock is wired today; a real
 * adapter (AeroAPI/VariFlight, enabled via env key) plugs in here later.
 */
export function getFlightProvider(): FlightInfoProvider {
  return new MockFlightProvider();
}
