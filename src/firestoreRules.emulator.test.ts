import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

function firestoreOf(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

const VALID_ENTRY = { readyAt: 1000, updatedAt: 500 };
const OWNER_PATH = "users/player-1/drops/gl-timer-star-battery";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-gl-drop-timer-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe("Firestore security rules", () => {
  it("lets a signed-in player read and write their own drop documents", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const ref = doc(db, OWNER_PATH);

    await assertSucceeds(setDoc(ref, VALID_ENTRY));
    const snapshot = await assertSucceeds(getDoc(ref));
    expect(snapshot.data()).toEqual(VALID_ENTRY);
  });

  it("denies another player from reading or writing those documents", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(firestoreOf(context), OWNER_PATH), VALID_ENTRY);
    });

    const db = firestoreOf(testEnv.authenticatedContext("player-2"));
    const ref = doc(db, OWNER_PATH);

    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, VALID_ENTRY));
  });

  it("denies unauthenticated reads and writes", async () => {
    const db = firestoreOf(testEnv.unauthenticatedContext());
    const ref = doc(db, OWNER_PATH);

    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, VALID_ENTRY));
  });

  it("rejects a write whose fields do not match the expected types", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const ref = doc(db, OWNER_PATH);

    await assertFails(setDoc(ref, { readyAt: "soon", updatedAt: 500 }));
    await assertFails(setDoc(ref, { readyAt: 1000, updatedAt: "500" }));
    await assertFails(setDoc(ref, { readyAt: 1000, updatedAt: 500, extra: true }));
  });

  it("rejects a write with a non-finite timestamp", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const ref = doc(db, OWNER_PATH);

    await assertFails(setDoc(ref, { readyAt: Number.NaN, updatedAt: 500 }));
    await assertFails(setDoc(ref, { readyAt: 1000, updatedAt: Number.POSITIVE_INFINITY }));
    await assertFails(setDoc(ref, { readyAt: -1, updatedAt: 500 }));
  });

  it("lets an owner delete their own drop document", async () => {
    const db = firestoreOf(testEnv.authenticatedContext("player-1"));
    const ref = doc(db, OWNER_PATH);
    await assertSucceeds(setDoc(ref, VALID_ENTRY));

    await assertSucceeds(deleteDoc(ref));
  });

  it("denies another player from deleting that document", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(firestoreOf(context), OWNER_PATH), VALID_ENTRY);
    });

    const db = firestoreOf(testEnv.authenticatedContext("player-2"));
    await assertFails(deleteDoc(doc(db, OWNER_PATH)));
  });
});
