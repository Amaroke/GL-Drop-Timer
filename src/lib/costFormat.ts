import type { Cost, LevelInfo } from "../planner/catalog";

export function formatCost(cost: Cost): string {
  const entries = Object.entries(cost);
  if (entries.length === 0) return "No cost listed";
  return entries
    .map(([currency, amount]) => `${amount.toLocaleString("en-US")} ${currency}`)
    .join(", ");
}

export function formatTime(time: string | null): string {
  return time ?? "time unknown";
}

export function formatLevelInfo({ time, cost }: LevelInfo): string {
  return `${formatTime(time)}, ${formatCost(cost)}`;
}
