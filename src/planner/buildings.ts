import { MAIN_COLONY_ID } from "./colonies";
import { CATEGORIES, type BuildingType, type Catalog, type Category, type Unlock } from "./catalog";

export const MIN_LEVEL = 1;

export type CategoryGroup = {
  category: Category;
  types: BuildingType[];
};

export function limitsAt(type: BuildingType, starBaseLevel: number): Unlock {
  return (
    type.unlocks.find((unlock) => unlock.starBase === starBaseLevel) ?? {
      starBase: starBaseLevel,
      maxLevel: 0,
      maxCount: 0,
    }
  );
}

export function groupedBuildingsForColony(catalog: Catalog, colonyId: string): CategoryGroup[] {
  const visible = catalog.buildings.filter((type) => !type.mainOnly || colonyId === MAIN_COLONY_ID);
  return CATEGORIES.map((category) => ({
    category,
    types: visible.filter((type) => type.category === category),
  })).filter((group) => group.types.length > 0);
}

export function withCount(levels: number[], count: number): number[] {
  if (count <= levels.length) return levels.slice(0, count);
  return [...levels, ...Array<number>(count - levels.length).fill(MIN_LEVEL)];
}

export function withLevel(levels: number[], index: number, level: number): number[] {
  return levels.map((current, i) => (i === index ? level : current)).sort((a, b) => b - a);
}
