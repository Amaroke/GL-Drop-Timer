import raw from "./data/catalog.json";

export type Category = "Resource" | "Military" | "Tower" | "Defense";
export const CATEGORIES: Category[] = ["Resource", "Military", "Tower", "Defense"];
export type Cost = Record<string, number>;

export type LevelInfo = {
  level: number;
  time: string | null;
  cost: Cost;
};

export type Unlock = {
  starBase: number;
  maxLevel: number;
  maxCount: number;
};

export type BuildingType = {
  id: string;
  name: string;
  category: Category;
  mainOnly: boolean;
  unlocks: Unlock[];
  levels: LevelInfo[];
};

export type StarBaseLevel = LevelInfo & {
  requirements: Record<string, number>;
};

export type Catalog = {
  version: number;
  starBase: StarBaseLevel[];
  buildings: BuildingType[];
};

export const CATALOG: Catalog = raw as Catalog;
