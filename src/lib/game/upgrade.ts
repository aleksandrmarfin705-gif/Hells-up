/** Шанс успеха в базисных пунктах (10000 = 100%). Зеркалит SQL-функцию upgrade_chance_bp. */
export function upgradeChanceBp(inPrice: number, targetPrice: number, edgeBp = 500, maxBp = 9500): number {
  if (inPrice <= 0 || targetPrice <= 0) return 0;
  return Math.min(maxBp, Math.floor(((inPrice * 10000) / targetPrice) * ((10000 - edgeBp) / 10000)));
}
export const MIN_UPGRADE_CHANCE_BP = 100;
