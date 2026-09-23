import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryDropStore } from "./dropStore";
import { mergeLocalIntoAccount } from "./syncedDropStore";

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

const KEYS = ["gl-timer-star-battery", "gl-timer-tool-case"];

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-gl-upgrade-planner-sync",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe("mergeLocalIntoAccount", () => {
  it("writes the local value when the account has no document yet", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const localStore = createMemoryDropStore();
    localStore.set("gl-timer-star-battery", 1000, 500);

    await mergeLocalIntoAccount(db, "player-1", localStore, KEYS);

    const snapshot = await getDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"));
    expect(snapshot.data()).toEqual({ readyAt: 1000, updatedAt: 500 });
  });

  it("replaces the account value when the local one is more recent", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    await setDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"), {
      readyAt: 2000,
      updatedAt: 100,
    });
    const localStore = createMemoryDropStore();
    localStore.set("gl-timer-star-battery", 1000, 500);

    await mergeLocalIntoAccount(db, "player-1", localStore, KEYS);

    const snapshot = await getDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"));
    expect(snapshot.data()).toEqual({ readyAt: 1000, updatedAt: 500 });
  });

  it("keeps the account value when it is more recent than the local one", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    await setDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"), {
      readyAt: 2000,
      updatedAt: 900,
    });
    const localStore = createMemoryDropStore();
    localStore.set("gl-timer-star-battery", 1000, 500);

    await mergeLocalIntoAccount(db, "player-1", localStore, KEYS);

    const snapshot = await getDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"));
    expect(snapshot.data()).toEqual({ readyAt: 2000, updatedAt: 900 });
  });

  it("keeps the account value when both share the same updated-at", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    await setDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"), {
      readyAt: 2000,
      updatedAt: 500,
    });
    const localStore = createMemoryDropStore();
    localStore.set("gl-timer-star-battery", 1000, 500);

    await mergeLocalIntoAccount(db, "player-1", localStore, KEYS);

    const snapshot = await getDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"));
    expect(snapshot.data()).toEqual({ readyAt: 2000, updatedAt: 500 });
  });

  it("does nothing for a key with no local value", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const localStore = createMemoryDropStore();

    await mergeLocalIntoAccount(db, "player-1", localStore, KEYS);

    const snapshot = await getDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"));
    expect(snapshot.exists()).toBe(false);
  });

  it("merges each key independently", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    await setDoc(doc(db, "users/player-1/drops/gl-timer-tool-case"), {
      readyAt: 8000,
      updatedAt: 900,
    });
    const localStore = createMemoryDropStore();
    localStore.set("gl-timer-star-battery", 1000, 500);
    localStore.set("gl-timer-tool-case", 3000, 100);

    await mergeLocalIntoAccount(db, "player-1", localStore, KEYS);

    const starBattery = await getDoc(doc(db, "users/player-1/drops/gl-timer-star-battery"));
    const toolCase = await getDoc(doc(db, "users/player-1/drops/gl-timer-tool-case"));
    expect(starBattery.data()).toEqual({ readyAt: 1000, updatedAt: 500 });
    expect(toolCase.data()).toEqual({ readyAt: 8000, updatedAt: 900 });
  });
});
