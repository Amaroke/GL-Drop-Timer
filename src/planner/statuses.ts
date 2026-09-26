import { limitsAt, type CategoryGroup } from "./buildings";
import type { BuildingType, Unlock } from "./catalog";
import type { ColonyBuildings } from "../store/colonyStore";

export type TypeStatus = "missing" | "below-limit" | "over-limit" | "maxed";
export type InstanceStatus = "below-limit" | "over-limit";

export function instanceStatus(
  limits: Unlock,
  index: number,
  level: number,
): InstanceStatus | null {
  if (index >= limits.maxCount || level > limits.maxLevel) return "over-limit";
  if (level < limits.maxLevel) return "below-limit";
  return null;
}

export function typeStatuses(
  type: BuildingType,
  starBaseLevel: number,
  levels: number[],
): TypeStatus[] {
  const limits = limitsAt(type, starBaseLevel);
  const instances = levels.map((level, index) => instanceStatus(limits, index, level));
  const missing = levels.length < limits.maxCount;
  const belowLimit = instances.includes("below-limit");
  const overLimit = instances.includes("over-limit");
  const maxed = limits.maxCount > 0 && !missing && !belowLimit && !overLimit;
  const statuses: TypeStatus[] = [];
  if (missing) statuses.push("missing");
  if (belowLimit) statuses.push("below-limit");
  if (overLimit) statuses.push("over-limit");
  if (maxed) statuses.push("maxed");
  return statuses;
}

export function unlocksAt(type: BuildingType, starBaseLevel: number): number | null {
  if (limitsAt(type, starBaseLevel).maxCount > 0) return null;
  const unlock = type.unlocks.find((entry) => entry.maxCount > 0);
  return unlock?.starBase ?? null;
}

export function needsUpgrade(statuses: TypeStatus[]): boolean {
  return statuses.includes("missing") || statuses.includes("below-limit");
}

export function filterToUpgrade(
  groups: CategoryGroup[],
  starBaseLevel: number,
  buildings: ColonyBuildings,
): CategoryGroup[] {
  return groups
    .map((group) => ({
      ...group,
      types: group.types.filter((type) =>
        needsUpgrade(typeStatuses(type, starBaseLevel, buildings[type.id] ?? [])),
      ),
    }))
    .filter((group) => group.types.length > 0);
}
