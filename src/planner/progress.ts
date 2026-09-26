import { groupedBuildingsForColony, limitsAt } from "./buildings";
import type { BuildingType, Catalog } from "./catalog";
import type { ColonyBuildings } from "../store/colonyStore";

export type ColonyProgress = {
  overall: number;
  current: number;
};

function capacity(types: BuildingType[], starBaseLevel: number): number {
  return types.reduce((sum, type) => {
    const limits = limitsAt(type, starBaseLevel);
    return sum + limits.maxCount * limits.maxLevel;
  }, 0);
}

function reached(types: BuildingType[], starBaseLevel: number, buildings: ColonyBuildings): number {
  return types.reduce((sum, type) => {
    const limits = limitsAt(type, starBaseLevel);
    const levels = (buildings[type.id] ?? []).slice(0, limits.maxCount);
    return sum + levels.reduce((total, level) => total + Math.min(level, limits.maxLevel), 0);
  }, 0);
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

export function colonyProgress(
  catalog: Catalog,
  colonyId: string,
  starBaseLevel: number,
  buildings: ColonyBuildings,
): ColonyProgress {
  const types = groupedBuildingsForColony(catalog, colonyId).flatMap((group) => group.types);
  const highest = Math.max(0, ...catalog.starBase.map((info) => info.level));
  return {
    overall: ratio(reached(types, highest, buildings), capacity(types, highest)),
    current: ratio(reached(types, starBaseLevel, buildings), capacity(types, starBaseLevel)),
  };
}
