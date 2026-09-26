import { describe, expect, it } from "vitest";
import { COLONIES, isColonyUnlocked, MAIN_COLONY_ID, observatoryLevel } from "./colonies";

function colony(id: string) {
  const found = COLONIES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`unknown Colony ${id}`);
  return found;
}

describe("observatoryLevel", () => {
  it("is 0 when no Observatory is owned", () => {
    expect(observatoryLevel({})).toBe(0);
    expect(observatoryLevel({ observatory: [] })).toBe(0);
  });

  it("is the level of the Observatory", () => {
    expect(observatoryLevel({ observatory: [4] })).toBe(4);
  });

  it("ignores the other Building types", () => {
    expect(observatoryLevel({ mine: [9] })).toBe(0);
  });
});

describe("isColonyUnlocked", () => {
  it("keeps the main planet unlocked whatever the Observatory level", () => {
    expect(isColonyUnlocked(colony(MAIN_COLONY_ID), 0)).toBe(true);
  });

  it("unlocks Colony N once the Observatory level is at least N", () => {
    expect(isColonyUnlocked(colony("colony-3"), 2)).toBe(false);
    expect(isColonyUnlocked(colony("colony-3"), 3)).toBe(true);
    expect(isColonyUnlocked(colony("colony-3"), 5)).toBe(true);
  });

  it("unlocks one Colony per Observatory level, in order", () => {
    const unlocked = COLONIES.filter((candidate) => isColonyUnlocked(candidate, 4)).map(
      (candidate) => candidate.id,
    );
    expect(unlocked).toEqual([MAIN_COLONY_ID, "colony-1", "colony-2", "colony-3", "colony-4"]);
  });
});
