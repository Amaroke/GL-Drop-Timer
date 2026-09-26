import { limitsAt, groupedBuildingsForColony } from "./buildings";
import { CATEGORIES, type BuildingType, type Catalog, type Category, type Cost } from "./catalog";
import { instanceStatus } from "./statuses";
import type { ColonyBuildings } from "../store/colonyStore";

export type StepOrder = "category" | "fastest";

export type NextStep = {
  kind: "build" | "upgrade";
  typeId: string;
  typeName: string;
  category: Category;
  instance: number;
  targetLevel: number;
  time: string | null;
  seconds: number | null;
  cost: Cost;
};

const UNIT_SECONDS: Record<string, number> = {
  w: 7 * 24 * 3600,
  d: 24 * 3600,
  h: 3600,
  m: 60,
  s: 1,
};

export function parseDuration(time: string | null): number | null {
  if (time === null) return null;
  let total = 0;
  for (const [, amount, unit] of time.matchAll(/(\d+)([wdhms])/g)) {
    total += Number(amount) * UNIT_SECONDS[unit];
  }
  return total;
}

function stepFor(
  type: BuildingType,
  kind: NextStep["kind"],
  instance: number,
  targetLevel: number,
): NextStep {
  const info = type.levels.find((entry) => entry.level === targetLevel);
  const time = info?.time ?? null;
  return {
    kind,
    typeId: type.id,
    typeName: type.name,
    category: type.category,
    instance,
    targetLevel,
    time,
    seconds: parseDuration(time),
    cost: info?.cost ?? {},
  };
}

function stepsForType(type: BuildingType, starBaseLevel: number, levels: number[]): NextStep[] {
  const limits = limitsAt(type, starBaseLevel);
  const upgrades = levels.flatMap((level, index) =>
    instanceStatus(limits, index, level) === "below-limit"
      ? [stepFor(type, "upgrade", index + 1, level + 1)]
      : [],
  );
  const builds = Array.from({ length: Math.max(0, limits.maxCount - levels.length) }, (_, offset) =>
    stepFor(type, "build", levels.length + offset + 1, 1),
  );
  return [...upgrades, ...builds];
}

function compareTime(a: NextStep, b: NextStep): number {
  if (a.seconds === b.seconds) return 0;
  if (a.seconds === null) return 1;
  if (b.seconds === null) return -1;
  return a.seconds - b.seconds;
}

function compareCategoryThenTime(a: NextStep, b: NextStep): number {
  return CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || compareTime(a, b);
}

export function nextSteps(
  catalog: Catalog,
  colonyId: string,
  starBaseLevel: number,
  buildings: ColonyBuildings,
  order: StepOrder,
): NextStep[] {
  return groupedBuildingsForColony(catalog, colonyId)
    .flatMap((group) => group.types)
    .flatMap((type) => stepsForType(type, starBaseLevel, buildings[type.id] ?? []))
    .sort(order === "fastest" ? compareTime : compareCategoryThenTime);
}
