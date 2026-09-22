import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStorageDropStore, createMemoryDropStore, OLDEST_UPDATED_AT } from "./dropStore";

describe("createMemoryDropStore", () => {
  it("returns null for a key that was never set", () => {
    const store = createMemoryDropStore();
    expect(store.get("gl-timer-star-battery")).toBeNull();
  });

  it("records the given updatedAt when a Ready date is set", () => {
    const store = createMemoryDropStore();
    store.set("gl-timer-star-battery", 1000, 500);
    expect(store.get("gl-timer-star-battery")).toEqual({ readyAt: 1000, updatedAt: 500 });
  });

  it("records the given updatedAt when a Ready date is reset to null", () => {
    const store = createMemoryDropStore();
    store.set("gl-timer-star-battery", 1000, 500);
    store.set("gl-timer-star-battery", null, 900);
    expect(store.get("gl-timer-star-battery")).toEqual({ readyAt: null, updatedAt: 900 });
  });

  it("treats a seeded initial value as the oldest possible value", () => {
    const store = createMemoryDropStore({ "gl-timer-star-battery": 1000 });
    expect(store.get("gl-timer-star-battery")).toEqual({
      readyAt: 1000,
      updatedAt: OLDEST_UPDATED_AT,
    });
  });
});

describe("createLocalStorageDropStore", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("returns null for a key that was never set", () => {
    const store = createLocalStorageDropStore();
    expect(store.get("gl-timer-star-battery")).toBeNull();
  });

  it("records the given updatedAt when a Ready date is set", () => {
    const store = createLocalStorageDropStore();
    store.set("gl-timer-star-battery", 1000, 500);
    expect(store.get("gl-timer-star-battery")).toEqual({ readyAt: 1000, updatedAt: 500 });
  });

  it("records the given updatedAt when a Ready date is reset to null", () => {
    const store = createLocalStorageDropStore();
    store.set("gl-timer-star-battery", 1000, 500);
    store.set("gl-timer-star-battery", null, 900);
    expect(store.get("gl-timer-star-battery")).toEqual({ readyAt: null, updatedAt: 900 });
  });

  it("treats a legacy value written before this change as the oldest possible value", () => {
    localStorage.setItem("gl-timer-star-battery", String(1000));

    const store = createLocalStorageDropStore();

    expect(store.get("gl-timer-star-battery")).toEqual({
      readyAt: 1000,
      updatedAt: OLDEST_UPDATED_AT,
    });
  });

  it.each(["abc", "NaN", "Infinity", "-Infinity", ""])(
    "treats a corrupted stored value %s as no entry",
    (value) => {
      localStorage.setItem("gl-timer-star-battery", value);

      const store = createLocalStorageDropStore();

      expect(store.get("gl-timer-star-battery")).toBeNull();
    },
  );
});
