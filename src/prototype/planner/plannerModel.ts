import raw from "./data/galaxyLifeBuildings.json";

export type Category = "Main" | "Resource" | "Military" | "Defensive";
export type Cost = Record<string, number>;
export type LevelInfo = { level: number; time: string | null; cost: Cost };
export type Unlock = { starBase: number; maxLevel: number; maxCount: number };

export type BuildingType = {
  id: string;
  name: string;
  category: Category;
  mainOnly: boolean;
  unlocks: Unlock[];
  levels: LevelInfo[];
};

export const CATEGORIES: Category[] = ["Main", "Resource", "Military", "Defensive"];
export const CATALOG = raw.buildings as BuildingType[];
export const MAX_STAR_BASE = raw.starBase.length;

export function unlockAt(type: BuildingType, sb: number): Unlock {
  return type.unlocks[Math.min(sb, MAX_STAR_BASE) - 1];
}

export function maxCount(type: BuildingType, sb: number): number {
  return unlockAt(type, sb).maxCount;
}

export function maxLevel(type: BuildingType, sb: number): number {
  return unlockAt(type, sb).maxLevel;
}

export function unlocksAtStarBase(type: BuildingType): number {
  return type.unlocks.find((u) => u.maxCount > 0)?.starBase ?? MAX_STAR_BASE;
}

const UNIT_SECONDS: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };

export function parseDuration(text: string | null): number | null {
  if (text === null) return null;
  let total = 0;
  for (const match of text.matchAll(/(\d+)\s*([wdhms])/g)) {
    total += Number(match[1]) * UNIT_SECONDS[match[2]];
  }
  return total;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "time unknown";
  if (seconds === 0) return "instant";
  const parts: string[] = [];
  let rest = seconds;
  for (const [unit, size] of [
    ["w", 604800],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
    ["s", 1],
  ] as const) {
    const n = Math.floor(rest / size);
    rest -= n * size;
    if (n > 0) parts.push(`${n}${unit}`);
  }
  return parts.slice(0, 2).join(" ");
}

const COST_LABELS: Record<string, string> = {
  coins: "coins",
  minerals: "minerals",
  sphere: "sphere",
};

export function formatCost(cost: Cost): string {
  const entries = Object.entries(cost).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return "free";
  return entries
    .map(([key, amount]) => `${amount.toLocaleString("en-US")} ${COST_LABELS[key] ?? key}`)
    .join(" + ");
}

export function addCost(a: Cost, b: Cost, times = 1): Cost {
  const out = { ...a };
  for (const [key, amount] of Object.entries(b)) out[key] = (out[key] ?? 0) + amount * times;
  return out;
}

export function stepInfo(type: BuildingType, toLevel: number): LevelInfo | undefined {
  return type.levels[toLevel - 1];
}

export function stepsBetween(type: BuildingType, from: number, to: number) {
  let cost: Cost = {};
  let seconds = 0;
  let unknownTime = false;
  for (let level = from + 1; level <= to; level++) {
    const info = stepInfo(type, level);
    if (!info) continue;
    cost = addCost(cost, info.cost);
    const s = parseDuration(info.time);
    if (s === null) unknownTime = true;
    else seconds += s;
  }
  return { cost, seconds, unknownTime };
}

export type ColonyRef = { id: string; name: string; requires: number };

export const COLONIES: ColonyRef[] = [
  { id: "main", name: "Planet", requires: 0 },
  ...Array.from({ length: 11 }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Colony ${i + 1}`,
    requires: i + 1,
  })),
];

export type ColonyData = { starBase: number; buildings: Record<string, number[]> };
export type PlannerState = Record<string, ColonyData>;

export function initialState(): PlannerState {
  const state: PlannerState = {};
  for (const colony of COLONIES) state[colony.id] = { starBase: 1, buildings: {} };
  state.main = {
    starBase: 6,
    buildings: {
      observatory: [4],
      "alliance-building": [1],
      "compact-house": [9, 9, 9, 8, 8, 7, 6, 6, 4, 3],
      mine: [9, 9, 9, 8, 8, 7, 5, 5, 4, 3],
      bank: [9, 8, 6, 4],
      silo: [9, 8, 6],
      "training-camp": [2, 2],
      factory: [2],
      "warp-gate": [5, 4],
      laboratory: [3],
      "cannon-blast": [6, 6, 5, 4, 3],
      "sniper-tower": [6, 6, 4, 2],
      walls: [2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
  };
  state.c1 = {
    starBase: 4,
    buildings: {
      "compact-house": [7, 7, 5, 5, 3],
      mine: [7, 6, 4, 4],
      bank: [6, 4],
      "training-camp": [3],
      "cannon-blast": [4, 4, 1],
    },
  };
  state.c2 = { starBase: 2, buildings: { "compact-house": [5, 3], mine: [4], bank: [2] } };
  state.c4 = { starBase: 3, buildings: { "compact-house": [7, 7], bank: [3] } };
  return state;
}

export type Action =
  | { kind: "starBase"; colony: string; value: number }
  | { kind: "count"; colony: string; type: string; value: number }
  | { kind: "level"; colony: string; type: string; index: number; value: number };

export function reducer(state: PlannerState, action: Action): PlannerState {
  const colony = state[action.colony];
  if (action.kind === "starBase") {
    const value = Math.max(1, Math.min(MAX_STAR_BASE, action.value));
    return { ...state, [action.colony]: { ...colony, starBase: value } };
  }
  const type = CATALOG.find((t) => t.id === action.type)!;
  const levels = colony.buildings[action.type] ?? [];
  if (action.kind === "count") {
    const cap = Math.max(maxCount(type, colony.starBase), levels.length);
    const target = Math.max(0, Math.min(cap, action.value));
    const next = levels.slice(0, target);
    while (next.length < target) next.push(1);
    return {
      ...state,
      [action.colony]: { ...colony, buildings: { ...colony.buildings, [action.type]: next } },
    };
  }
  const cap = Math.max(maxLevel(type, colony.starBase), levels[action.index] ?? 1);
  const value = Math.max(1, Math.min(cap, action.value));
  const next = levels.map((l, i) => (i === action.index ? value : l));
  return {
    ...state,
    [action.colony]: { ...colony, buildings: { ...colony.buildings, [action.type]: next } },
  };
}

export type Row = {
  type: BuildingType;
  levels: number[];
  owned: number;
  maxCount: number;
  maxLevel: number;
  locked: boolean;
  missing: number;
  below: number;
  over: boolean;
  todo: boolean;
};

export function rowsFor(colonyId: string, data: ColonyData): Row[] {
  return CATALOG.filter((t) => colonyId === "main" || !t.mainOnly).map((type) => {
    const levels = data.buildings[type.id] ?? [];
    const mc = maxCount(type, data.starBase);
    const ml = maxLevel(type, data.starBase);
    const locked = mc === 0;
    const missing = locked ? 0 : Math.max(0, mc - levels.length);
    const below = locked ? 0 : levels.filter((l) => l < ml).length;
    const over = levels.length > mc || levels.some((l) => l > ml);
    return {
      type,
      levels,
      owned: levels.length,
      maxCount: mc,
      maxLevel: ml,
      locked,
      missing,
      below,
      over,
      todo: missing > 0 || below > 0 || over,
    };
  });
}

export type Progress = { done: number; total: number };

export function progressAgainst(rows: Row[], sb: number): Progress {
  let done = 0;
  let total = 0;
  for (const r of rows) {
    const mc = maxCount(r.type, sb);
    const ml = maxLevel(r.type, sb);
    total += mc * ml;
    const best = [...r.levels].sort((a, b) => b - a).slice(0, mc);
    done += best.reduce((sum, l) => sum + Math.min(l, ml), 0);
  }
  return { done, total };
}

export function percent(p: Progress): number {
  return p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
}

export type Suggestion = {
  key: string;
  type: BuildingType;
  kind: "build" | "upgrade";
  fromLevel: number;
  toLevel: number;
  count: number;
  seconds: number | null;
  cost: Cost;
};

export function suggestionsFor(rows: Row[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const row of rows) {
    if (row.locked) continue;
    if (row.missing > 0) {
      const info = stepInfo(row.type, 1);
      out.push({
        key: `${row.type.id}-build`,
        type: row.type,
        kind: "build",
        fromLevel: 0,
        toLevel: 1,
        count: row.missing,
        seconds: parseDuration(info?.time ?? null),
        cost: info?.cost ?? {},
      });
    }
    const groups = new Map<number, number>();
    for (const level of row.levels) {
      if (level < row.maxLevel) groups.set(level, (groups.get(level) ?? 0) + 1);
    }
    for (const [level, count] of groups) {
      const info = stepInfo(row.type, level + 1);
      out.push({
        key: `${row.type.id}-up-${level}`,
        type: row.type,
        kind: "upgrade",
        fromLevel: level,
        toLevel: level + 1,
        count,
        seconds: parseDuration(info?.time ?? null),
        cost: info?.cost ?? {},
      });
    }
  }
  return out;
}

export type SortMode = "category" | "fastest" | "cheapest";

export function sortSuggestions(list: Suggestion[], mode: SortMode): Suggestion[] {
  const categoryRank = (s: Suggestion) => CATEGORIES.indexOf(s.type.category);
  const coins = (s: Suggestion) => (s.cost.coins ?? 0) + (s.cost.minerals ?? 0);
  const time = (s: Suggestion) => s.seconds ?? Number.POSITIVE_INFINITY;
  return [...list].sort((a, b) => {
    if (mode === "fastest") return time(a) - time(b) || coins(a) - coins(b);
    if (mode === "cheapest") return coins(a) - coins(b) || time(a) - time(b);
    return categoryRank(a) - categoryRank(b) || time(a) - time(b);
  });
}

export function remainingToMax(rows: Row[]) {
  let cost: Cost = {};
  let seconds = 0;
  let unknownTime = false;
  for (const row of rows) {
    if (row.locked) continue;
    for (const level of row.levels) {
      const steps = stepsBetween(row.type, level, row.maxLevel);
      cost = addCost(cost, steps.cost);
      seconds += steps.seconds;
      unknownTime ||= steps.unknownTime;
    }
    if (row.missing > 0) {
      const steps = stepsBetween(row.type, 0, row.maxLevel);
      cost = addCost(cost, steps.cost, row.missing);
      seconds += steps.seconds * row.missing;
      unknownTime ||= steps.unknownTime;
    }
  }
  return { cost, seconds, unknownTime };
}

export const STAR_BASE_LEVELS = raw.starBase as {
  level: number;
  time: string | null;
  cost: Cost;
  requirements: Record<string, number>;
}[];
