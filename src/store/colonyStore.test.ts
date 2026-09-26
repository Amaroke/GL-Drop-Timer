import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLocalStorageColonyStore,
  createMemoryColonyStore,
  type ColonyStore,
} from "./colonyStore";

function behavesLikeAColonyStore(name: string, create: () => ColonyStore) {
  describe(name, () => {
    it("returns null for a Colony that was never set", () => {
      expect(create().get("main")).toBeNull();
    });

    it("records the Star Base level and the updatedAt timestamp", () => {
      const store = create();
      store.set("main", 4, 500);
      expect(store.get("main")).toEqual({ starBaseLevel: 4, updatedAt: 500 });
    });

    it("keeps each Colony separate", () => {
      const store = create();
      store.set("main", 4, 500);
      store.set("colony-1", 2, 600);
      expect(store.get("main")?.starBaseLevel).toBe(4);
      expect(store.get("colony-1")?.starBaseLevel).toBe(2);
    });

    it("notifies subscribers of that Colony when its level changes", () => {
      const store = create();
      const onMain = vi.fn();
      const onOther = vi.fn();
      store.subscribe("main", onMain);
      store.subscribe("colony-1", onOther);

      store.set("main", 3, 500);

      expect(onMain).toHaveBeenCalledTimes(1);
      expect(onOther).not.toHaveBeenCalled();
    });

    it("stops notifying after unsubscribe", () => {
      const store = create();
      const onChange = vi.fn();
      const unsubscribe = store.subscribe("main", onChange);
      unsubscribe();

      store.set("main", 3, 500);

      expect(onChange).not.toHaveBeenCalled();
    });
  });
}

behavesLikeAColonyStore("createMemoryColonyStore", () => createMemoryColonyStore());

describe("createLocalStorageColonyStore", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  behavesLikeAColonyStore("as a Colony store", () => createLocalStorageColonyStore());

  it("keeps a Star Base level across a new store instance", () => {
    createLocalStorageColonyStore().set("main", 5, 700);
    expect(createLocalStorageColonyStore().get("main")).toEqual({
      starBaseLevel: 5,
      updatedAt: 700,
    });
  });

  it.each(["abc", "null", "{}", '{"starBaseLevel":"x","updatedAt":1}', '{"starBaseLevel":2}'])(
    "treats the corrupted stored value %s as never set",
    (value) => {
      localStorage.setItem("gl-colony-main", value);
      expect(createLocalStorageColonyStore().get("main")).toBeNull();
    },
  );

  it("notifies when another tab writes the same Colony", () => {
    const store = createLocalStorageColonyStore();
    const onChange = vi.fn();
    store.subscribe("main", onChange);

    window.dispatchEvent(
      new StorageEvent("storage", { key: "gl-colony-main", storageArea: localStorage }),
    );

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
