import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { disableNetwork, enableNetwork, type Firestore } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createFirestoreDropStore } from "./firestoreDropStore";

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-gl-upgrade-planner-adapter",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe("createFirestoreDropStore", () => {
  it("returns null for a key that was never set", () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const store = createFirestoreDropStore(db, "player-1");

    expect(store.get("gl-timer-star-battery")).toBeNull();
  });

  it("reflects a Ready date synchronously right after writing it", () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const store = createFirestoreDropStore(db, "player-1");

    store.set("gl-timer-star-battery", 1000, 500);

    expect(store.get("gl-timer-star-battery")).toEqual({ readyAt: 1000, updatedAt: 500 });
  });

  it("keeps reflecting the written value once the server confirms it", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const store = createFirestoreDropStore(db, "player-1");
    store.set("gl-timer-star-battery", 1000, 500);

    await new Promise<void>((resolve) => {
      const unsubscribe = store.subscribe("gl-timer-star-battery", () => {
        if (store.get("gl-timer-star-battery")?.readyAt !== 1000) return;
        unsubscribe();
        resolve();
      });
    });

    expect(store.get("gl-timer-star-battery")).toEqual({ readyAt: 1000, updatedAt: 500 });
  });

  it("notifies subscribers when another writer changes the same document", async () => {
    const writerStore = createFirestoreDropStore(
      firestoreOf(testEnv.authenticatedContext("player-1")),
      "player-1",
    );
    const readerStore = createFirestoreDropStore(
      firestoreOf(testEnv.authenticatedContext("player-1")),
      "player-1",
    );
    readerStore.get("gl-timer-star-battery");

    await new Promise<void>((resolve) => {
      const unsubscribe = readerStore.subscribe("gl-timer-star-battery", () => {
        if (readerStore.get("gl-timer-star-battery")?.readyAt !== 1000) return;
        unsubscribe();
        resolve();
      });
      writerStore.set("gl-timer-star-battery", 1000, 500);
    });

    expect(readerStore.get("gl-timer-star-battery")).toEqual({ readyAt: 1000, updatedAt: 500 });
  });

  it("keeps reading and writing while offline, then delivers the write once back online", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const store = createFirestoreDropStore(db, "player-1");
    store.set("gl-timer-star-battery", 1000, 500);
    await new Promise<void>((resolve) => {
      const unsubscribe = store.subscribe("gl-timer-star-battery", () => {
        if (store.get("gl-timer-star-battery")?.readyAt !== 1000) return;
        unsubscribe();
        resolve();
      });
    });

    await disableNetwork(db);
    store.set("gl-timer-star-battery", 2000, 600);
    expect(store.get("gl-timer-star-battery")).toEqual({ readyAt: 2000, updatedAt: 600 });
    expect(store.syncStatus.getStatus()).toBe("syncing");

    const readerStore = createFirestoreDropStore(
      firestoreOf(testEnv.authenticatedContext("player-1")),
      "player-1",
    );

    await enableNetwork(db);
    await new Promise<void>((resolve) => {
      const unsubscribe = readerStore.subscribe("gl-timer-star-battery", () => {
        if (readerStore.get("gl-timer-star-battery")?.readyAt !== 2000) return;
        unsubscribe();
        resolve();
      });
    });

    expect(readerStore.get("gl-timer-star-battery")).toEqual({ readyAt: 2000, updatedAt: 600 });
  });
});
