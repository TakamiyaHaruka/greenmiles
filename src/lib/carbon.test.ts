import { describe, it, expect } from 'vitest';
import {
  calculateCarbonEmission,
  projectedOffsetKg,
  getCarbonAnalogy,
  formatEmission,
  AIRCRAFT_TYPES,
  CABIN_CLASSES,
  PRESET_ROUTES,
} from './carbon';

describe('AIRCRAFT_TYPES', () => {
  it('has 4 aircraft types', () => {
    expect(Object.keys(AIRCRAFT_TYPES)).toHaveLength(4);
  });

  it('has correct coefficients', () => {
    expect(AIRCRAFT_TYPES.NARROW_EFFICIENT.coefficient).toBe(0.075);
    expect(AIRCRAFT_TYPES.NARROW_STANDARD.coefficient).toBe(0.090);
    expect(AIRCRAFT_TYPES.WIDE_EFFICIENT.coefficient).toBe(0.110);
    expect(AIRCRAFT_TYPES.WIDE_LARGE.coefficient).toBe(0.140);
  });
});

describe('CABIN_CLASSES', () => {
  it('has 4 cabin classes', () => {
    expect(Object.keys(CABIN_CLASSES)).toHaveLength(4);
  });

  it('has correct multipliers', () => {
    expect(CABIN_CLASSES.Y.multiplier).toBe(1.0);
    expect(CABIN_CLASSES.W.multiplier).toBe(1.5);
    expect(CABIN_CLASSES.C.multiplier).toBe(2.5);
    expect(CABIN_CLASSES.F.multiplier).toBe(4.0);
  });
});

describe('PRESET_ROUTES', () => {
  it('has 4 preset routes', () => {
    expect(PRESET_ROUTES).toHaveLength(4);
  });

  it('is defined as airport pairs (distances derive from airports.ts)', () => {
    expect(PRESET_ROUTES[0]).toEqual({ from: 'PEK', to: 'SHA' });
  });
});

describe('calculateCarbonEmission', () => {
  it('calculates correctly for NARROW_EFFICIENT + Y (economy)', () => {
    // 1075 * 0.075 * 1.0 = 80.625 → 80.63
    expect(calculateCarbonEmission(1075, 'NARROW_EFFICIENT', 'Y')).toBe(80.63);
  });

  it('calculates correctly for WIDE_LARGE + F (first class)', () => {
    // 1075 * 0.140 * 4.0 = 602
    expect(calculateCarbonEmission(1075, 'WIDE_LARGE', 'F')).toBe(602);
  });

  it('calculates correctly for NARROW_STANDARD + C (business)', () => {
    // 1000 * 0.090 * 2.5 = 225
    expect(calculateCarbonEmission(1000, 'NARROW_STANDARD', 'C')).toBe(225);
  });

  it('calculates correctly for WIDE_EFFICIENT + W (premium economy)', () => {
    // 500 * 0.110 * 1.5 = 82.5
    expect(calculateCarbonEmission(500, 'WIDE_EFFICIENT', 'W')).toBe(82.5);
  });

  it('rounds to 2 decimal places', () => {
    // 333 * 0.075 * 1.0 = 24.975 → 24.98
    expect(calculateCarbonEmission(333, 'NARROW_EFFICIENT', 'Y')).toBe(24.98);
  });

  it('throws for negative distance', () => {
    expect(() => calculateCarbonEmission(-100, 'NARROW_EFFICIENT', 'Y')).toThrow();
  });

  it('throws for zero distance', () => {
    expect(() => calculateCarbonEmission(0, 'NARROW_EFFICIENT', 'Y')).toThrow();
  });
});

describe('projectedOffsetKg', () => {
  it('projects 22 kg per tree per year', () => {
    expect(projectedOffsetKg(1, 10)).toBe(220);
    expect(projectedOffsetKg(3, 10)).toBe(660);
  });

  it('defaults to a 10-year horizon', () => {
    expect(projectedOffsetKg(2)).toBe(440);
  });

  it('returns 0 for no trees or a non-positive horizon', () => {
    expect(projectedOffsetKg(0)).toBe(0);
    expect(projectedOffsetKg(-1)).toBe(0);
    expect(projectedOffsetKg(1, 0)).toBe(0);
  });
});

describe('getCarbonAnalogy', () => {
  it('returns no-emission string for 0', () => {
    expect(getCarbonAnalogy(0)).toBe('无碳排放');
  });

  it('returns tree-days analogy for small values (< 50)', () => {
    const result = getCarbonAnalogy(30);
    expect(result).toContain('树');
    expect(result).toContain('天');
  });

  it('returns car-km analogy for medium values (50-200)', () => {
    const result = getCarbonAnalogy(100);
    expect(result).toContain('开车');
    expect(result).toContain('公里');
  });

  it('returns tree-months analogy for large values (>= 200)', () => {
    const result = getCarbonAnalogy(300);
    expect(result).toContain('树');
    expect(result).toContain('个月');
  });
});

describe('formatEmission', () => {
  it('formats with one decimal place', () => {
    expect(formatEmission(80.625)).toBe('80.6 kg CO₂');
  });

  it('formats zero correctly', () => {
    expect(formatEmission(0)).toBe('0.0 kg CO₂');
  });

  it('formats large numbers correctly', () => {
    expect(formatEmission(1234.567)).toBe('1234.6 kg CO₂');
  });
});
