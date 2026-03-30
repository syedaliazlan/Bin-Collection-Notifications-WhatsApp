import { BinType } from "./models/Schedule";

/**
 * Get the week number of the year (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Determine which bin types should be collected based on week number
 * Preston council calendar: even weeks = General waste, odd weeks = Paper/card + Glass/cans/plastics
 */
export function getBinTypesForWeek(isOddWeek: boolean): BinType[] {
  if (isOddWeek) {
    return ["paper_card", "glass_cans_plastics"];
  } else {
    return ["general_waste"];
  }
}
