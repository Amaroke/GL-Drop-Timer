import type { ColonyBuildings } from "../store/colonyStore";

export type ColonyDefinition = {
  id: string;
  name: string;
  shortName: string;
  requiredObservatoryLevel: number;
};

export const MAIN_COLONY_ID = "main";

const ORDINAL_SUFFIXES: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };

function ordinal(n: number): string {
  return `${n}${ORDINAL_SUFFIXES[n] ?? "th"}`;
}

export const COLONIES: ColonyDefinition[] = [
  { id: MAIN_COLONY_ID, name: "Main planet", shortName: "Main", requiredObservatoryLevel: 0 },
  ...Array.from({ length: 11 }, (_, index) => ({
    id: `colony-${index + 1}`,
    name: `Colony ${index + 1}`,
    shortName: ordinal(index + 1),
    requiredObservatoryLevel: index + 1,
  })),
];

const OBSERVATORY_ID = "observatory";

export function observatoryLevel(mainBuildings: ColonyBuildings): number {
  return mainBuildings[OBSERVATORY_ID]?.[0] ?? 0;
}

export function isColonyUnlocked(colony: ColonyDefinition, observatory: number): boolean {
  return colony.requiredObservatoryLevel <= observatory;
}
