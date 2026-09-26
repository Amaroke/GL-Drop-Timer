import raw from "./data/catalog.json";

export type Category = "Resource" | "Military" | "Tower" | "Defense";
export const CATEGORIES: Category[] = ["Resource", "Military", "Tower", "Defense"];

export type LevelInfo = {
  level: number;
  time: string | null;
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
  sharedLevel?: boolean;
  unlocks: Unlock[];
  levels: LevelInfo[];
};

export type Catalog = {
  version: number;
  starBase: LevelInfo[];
  buildings: BuildingType[];
};

export const CATALOG: Catalog = raw as Catalog;
