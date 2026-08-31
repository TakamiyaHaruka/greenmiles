import { z } from 'zod';

// CO2 offset attributed to one redeemed tree (kg per year).
// Kept consistent with the tree analogy in getCarbonAnalogy().
export const CARBON_OFFSET_PER_TREE_KG = 22;

// Aircraft types with their emission coefficients (kg CO2 per km)
export const AIRCRAFT_TYPES = {
  NARROW_EFFICIENT: { coefficient: 0.075, label: '窄体高效机型' },
  NARROW_STANDARD: { coefficient: 0.090, label: '窄体标准机型' },
  WIDE_EFFICIENT: { coefficient: 0.110, label: '宽体高效机型' },
  WIDE_LARGE: { coefficient: 0.140, label: '宽体大型机型' },
} as const;

export type AircraftType = keyof typeof AIRCRAFT_TYPES;

// Cabin classes with their multipliers
export const CABIN_CLASSES = {
  Y: { multiplier: 1.0, label: '经济舱' },
  W: { multiplier: 1.5, label: '超级经济舱' },
  C: { multiplier: 2.5, label: '商务舱' },
  F: { multiplier: 4.0, label: '头等舱' },
} as const;

export type CabinClass = keyof typeof CABIN_CLASSES;

// Preset routes — airport pairs; the distance is derived from coordinates (airports.ts)
export const PRESET_ROUTES = [
  { from: 'PEK', to: 'SHA' },
  { from: 'PEK', to: 'CAN' },
  { from: 'SHA', to: 'SZX' },
  { from: 'PEK', to: 'CTU' },
] as const;

// Zod schema for carbon calculation input
export const CarbonCalculationSchema = z.object({
  distance: z.number().positive('距离必须大于 0'),
  aircraftType: z.enum(['NARROW_EFFICIENT', 'NARROW_STANDARD', 'WIDE_EFFICIENT', 'WIDE_LARGE'], {
    message: '请选择有效的机型',
  }),
  cabinClass: z.enum(['Y', 'W', 'C', 'F'], {
    message: '请选择有效的舱位',
  }),
  // Optional route label for the footprint history, e.g. "PEK→SHA"
  route: z.string().trim().max(20).optional(),
});

export type CarbonCalculationInput = z.infer<typeof CarbonCalculationSchema>;

/**
 * Calculate carbon emission for a flight
 * Formula: CO2(kg) = distance(km) × aircraft_coefficient(kg/km) × cabin_multiplier
 */
export function calculateCarbonEmission(
  distance: number,
  aircraftType: AircraftType,
  cabinClass: CabinClass
): number {
  // Validate input
  const result = CarbonCalculationSchema.safeParse({
    distance,
    aircraftType,
    cabinClass,
  });

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || '参数无效');
  }

  const coefficient = AIRCRAFT_TYPES[aircraftType].coefficient;
  const multiplier = CABIN_CLASSES[cabinClass].multiplier;

  return Math.round(distance * coefficient * multiplier * 100) / 100;
}

/**
 * Total CO2 a grove of redeemed trees will have absorbed after N years,
 * at 22 kg per tree per year. Powers the "ten-year projection" on the
 * footprint page and tree certificates.
 */
export function projectedOffsetKg(trees: number, years = 10): number {
  if (trees <= 0 || years <= 0) return 0;
  return trees * CARBON_OFFSET_PER_TREE_KG * years;
}

/**
 * Get a human-readable analogy for carbon emission
 */
export function getCarbonAnalogy(co2Kg: number): string {
  if (co2Kg <= 0) {
    return '无碳排放';
  }

  // A mature tree absorbs about 22kg of CO2 per year (roughly 0.06kg per day)
  const treeDays = Math.round(co2Kg / 0.06);

  if (co2Kg < 50) {
    return `相当于一棵树 ${treeDays} 天的吸收量`;
  }

  // Average car emits about 0.12kg CO2 per km
  const carKm = Math.round(co2Kg / 0.12);

  if (co2Kg < 200) {
    return `相当于开车行驶 ${carKm} 公里`;
  }

  // For larger emissions, convert to months
  const treeMonths = Math.round(treeDays / 30);
  return `相当于一棵树 ${treeMonths} 个月的吸收量`;
}

/**
 * Format carbon emission for display
 */
export function formatEmission(co2Kg: number): string {
  return `${co2Kg.toFixed(1)} kg CO₂`;
}
