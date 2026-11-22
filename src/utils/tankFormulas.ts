import { FuelTank, TankShape } from '../types';

export interface TankCalculationResult {
  shape: TankShape;
  currentLiters: number;
  totalCapacityLiters: number;
  percentageFull: number;
  remainingLitersToFull: number;
  dipCm: number;
  heightCm: number;
  diameterCm?: number;
}

export function getTankShape(tank: Pick<FuelTank, 'shape'>): TankShape {
  return tank.shape === 'spherical' ? 'spherical' : 'rectangular';
}

export function calculateSphericalCapacityLiters(
  diameterCm: number,
  heightCm: number
): number {
  const d = Math.max(1, Number(diameterCm) || 150);
  const h = Math.max(1, Number(heightCm) || 150);
  const r = d / 2;
  const volumeCm3 = Math.PI * Math.pow(r, 2) * h;
  return Math.round(volumeCm3 / 1000);
}

export function calculateTankVolume(tank: FuelTank, dipCm: number): TankCalculationResult {
  const shape = getTankShape(tank);

  if (shape === 'spherical') {
    const diameter = Math.max(1, Number(tank.diameterCm) || Number(tank.lengthCm) || 150);
    const totalHeight = Math.max(1, Number(tank.heightCm) || diameter);
    const radius = diameter / 2;
    const validDip = Math.max(0, Math.min(dipCm, totalHeight));

    // Round-section tank volume using diameter & tank height: V = π * r^2 * h
    const totalCm3 = Math.PI * Math.pow(radius, 2) * totalHeight;
    const currentCm3 = Math.PI * Math.pow(radius, 2) * validDip;

    const totalLiters = Math.round(totalCm3 / 1000);
    const currentLiters = Math.min(totalLiters, Math.max(0, Math.round(currentCm3 / 1000)));
    const percentageFull = totalHeight > 0
      ? Math.min(100, Math.max(0, Math.round((validDip / totalHeight) * 100)))
      : 0;
    const remainingLitersToFull = Math.max(0, totalLiters - currentLiters);

    return {
      shape,
      currentLiters,
      totalCapacityLiters: totalLiters,
      percentageFull,
      remainingLitersToFull,
      dipCm: validDip,
      heightCm: totalHeight,
      diameterCm: diameter
    };
  }

  const l = Number(tank.lengthCm) || 200;
  const w = Number(tank.widthCm) || 100;
  const h = Number(tank.heightCm) || 150;

  const validDip = Math.max(0, Math.min(dipCm, h));

  // Volume in Liters: (cm * cm * cm) / 1000
  const totalLiters = Math.round((l * w * h) / 1000);
  const currentLiters = Math.round((l * w * validDip) / 1000);
  const percentageFull = totalLiters > 0 ? Math.min(100, Math.max(0, Math.round((currentLiters / totalLiters) * 100))) : 0;
  const remainingLitersToFull = Math.max(0, totalLiters - currentLiters);

  return {
    shape,
    currentLiters,
    totalCapacityLiters: totalLiters,
    percentageFull,
    remainingLitersToFull,
    dipCm: validDip,
    heightCm: h
  };
}
