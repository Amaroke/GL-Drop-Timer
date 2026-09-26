import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";

const DURATION = /^(\d+[wdhms])( \d+[wdhms])*$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CATEGORIES = ["Resource", "Military", "Tower", "Defense"];

function assertTimeParseable(time: string | null) {
  if (time === null) return;
  expect(time).toMatch(DURATION);
}

describe("catalog", () => {
  it("has a version", () => {
    expect(Number.isInteger(CATALOG.version)).toBe(true);
  });

  describe("Star Base table", () => {
    it("covers consecutive levels starting at 1", () => {
      expect(CATALOG.starBase.length).toBeGreaterThan(0);
      CATALOG.starBase.forEach((entry, index) => {
        expect(entry.level).toBe(index + 1);
      });
    });

    it("has a parseable time for every level", () => {
      for (const entry of CATALOG.starBase) {
        assertTimeParseable(entry.time);
        expect(Object.keys(entry)).toEqual(["level", "time"]);
      }
    });
  });

  describe("Building types", () => {
    it("has at least one Building type", () => {
      expect(CATALOG.buildings.length).toBeGreaterThan(0);
    });

    it("has unique stable slug identifiers", () => {
      const ids = CATALOG.buildings.map((type) => type.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(SLUG);
    });

    it("has a name and a known category", () => {
      for (const type of CATALOG.buildings) {
        expect(type.name.length).toBeGreaterThan(0);
        expect(CATEGORIES).toContain(type.category);
        expect(typeof type.mainOnly).toBe("boolean");
        expect(["undefined", "boolean"]).toContain(typeof type.sharedLevel);
      }
    });

    it("excludes Decorations", () => {
      for (const type of CATALOG.buildings) {
        expect(type.id).not.toMatch(/decoration/);
        expect(type.name).not.toMatch(/decoration/i);
        expect(type.category).not.toMatch(/decoration/i);
      }
    });

    it("has one limit entry per Star Base level", () => {
      for (const type of CATALOG.buildings) {
        expect(type.unlocks.map((unlock) => unlock.starBase)).toEqual(
          CATALOG.starBase.map((entry) => entry.level),
        );
      }
    });

    it("never lowers the maximum level or count as the Star Base level rises", () => {
      for (const type of CATALOG.buildings) {
        type.unlocks.forEach((unlock, index) => {
          expect(Number.isInteger(unlock.maxLevel)).toBe(true);
          expect(Number.isInteger(unlock.maxCount)).toBe(true);
          expect(unlock.maxLevel).toBeGreaterThanOrEqual(0);
          expect(unlock.maxCount).toBeGreaterThanOrEqual(0);
          expect(unlock.maxLevel === 0).toBe(unlock.maxCount === 0);
          if (index > 0) {
            expect(unlock.maxLevel).toBeGreaterThanOrEqual(type.unlocks[index - 1].maxLevel);
            expect(unlock.maxCount).toBeGreaterThanOrEqual(type.unlocks[index - 1].maxCount);
          }
        });
      }
    });

    it("unlocks at some Star Base level", () => {
      for (const type of CATALOG.buildings) {
        expect(type.unlocks.some((unlock) => unlock.maxCount > 0)).toBe(true);
      }
    });

    it("has a time entry for every level up to the maximum level", () => {
      for (const type of CATALOG.buildings) {
        const highestMaxLevel = Math.max(...type.unlocks.map((unlock) => unlock.maxLevel));
        expect(type.levels.map((entry) => entry.level)).toEqual(
          Array.from({ length: type.levels.length }, (_, index) => index + 1),
        );
        expect(type.levels.length).toBeGreaterThanOrEqual(highestMaxLevel);
        for (const entry of type.levels) {
          assertTimeParseable(entry.time);
          expect(Object.keys(entry)).toEqual(["level", "time"]);
        }
      }
    });

    it("gives Walls one shared level, six levels and the Star Base limits of the wiki", () => {
      const walls = CATALOG.buildings.find((type) => type.id === "walls");
      expect(walls?.sharedLevel).toBe(true);
      expect(walls?.levels).toEqual([
        { level: 1, time: "0s" },
        { level: 2, time: "0s" },
        { level: 3, time: "0s" },
        { level: 4, time: "0s" },
        { level: 5, time: "0s" },
        { level: 6, time: "0s" },
      ]);
      expect(walls?.unlocks.map(({ maxCount, maxLevel }) => [maxCount, maxLevel])).toEqual([
        [0, 0],
        [30, 1],
        [60, 2],
        [120, 3],
        [200, 4],
        [220, 5],
        [280, 5],
        [300, 6],
        [300, 6],
      ]);
    });

    it("keeps the Observatory on the main planet only", () => {
      const observatory = CATALOG.buildings.find((type) => type.id === "observatory");
      expect(observatory?.mainOnly).toBe(true);
    });
  });
});
