import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createFirestoreDropStore } from "./firestoreDropStore";

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-gl-drop-timer-adapter",
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

  it("reflects a Ready date it wrote once the snapshot arrives", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const store = createFirestoreDropStore(db, "player-1");

    await new Promise<void>((resolve) => {
      const unsubscribe = store.subscribe("gl-timer-star-battery", () => {
        unsubscribe();
        resolve();
      });
      store.set("gl-timer-star-battery", 1000, 500);
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
});
