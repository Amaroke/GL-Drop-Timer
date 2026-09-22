import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onSnapshot, setDoc } from "firebase/firestore";
import { createFirestoreDropStore } from "./firestoreDropStore";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  onSnapshot: vi.fn(() => vi.fn()),
  setDoc: vi.fn(() => Promise.resolve()),
  initializeFirestore: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const FAKE_DB = {} as never;

async function flush() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe("createFirestoreDropStore sync status", () => {
  beforeEach(() => {
    vi.mocked(onSnapshot).mockReturnValue(vi.fn());
    vi.mocked(setDoc).mockReturnValue(Promise.resolve());
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts synced when nothing is pending", () => {
    const store = createFirestoreDropStore(FAKE_DB, "player-1");
    expect(store.syncStatus.getStatus()).toBe("synced");
  });

  it("reports syncing while a write is in flight, then synced once it resolves", async () => {
    const write = deferred<void>();
    vi.mocked(setDoc).mockReturnValueOnce(write.promise);
    const store = createFirestoreDropStore(FAKE_DB, "player-1");

    store.set("gl-timer-star-battery", 1000, 500);
    expect(store.syncStatus.getStatus()).toBe("syncing");

    write.resolve();
    await flush();

    expect(store.syncStatus.getStatus()).toBe("synced");
  });

  it("reports error when a write fails with a non-transient error", async () => {
    const write = deferred<void>();
    vi.mocked(setDoc).mockReturnValueOnce(write.promise);
    const store = createFirestoreDropStore(FAKE_DB, "player-1");

    store.set("gl-timer-star-battery", 1000, 500);
    write.reject({ code: "permission-denied" });
    await flush();

    expect(store.syncStatus.getStatus()).toBe("error");
  });

  it("does not treat a transient write failure as an error", async () => {
    const write = deferred<void>();
    vi.mocked(setDoc).mockReturnValueOnce(write.promise);
    const store = createFirestoreDropStore(FAKE_DB, "player-1");

    store.set("gl-timer-star-battery", 1000, 500);
    write.reject({ code: "unavailable" });
    await flush();

    expect(store.syncStatus.getStatus()).toBe("synced");
  });

  it("clears a previous error once a later write succeeds", async () => {
    const failingWrite = deferred<void>();
    vi.mocked(setDoc).mockReturnValueOnce(failingWrite.promise);
    const store = createFirestoreDropStore(FAKE_DB, "player-1");

    store.set("gl-timer-star-battery", 1000, 500);
    failingWrite.reject({ code: "permission-denied" });
    await flush();
    expect(store.syncStatus.getStatus()).toBe("error");

    const okWrite = deferred<void>();
    vi.mocked(setDoc).mockReturnValueOnce(okWrite.promise);
    store.set("gl-timer-star-battery", 2000, 600);
    okWrite.resolve();
    await flush();

    expect(store.syncStatus.getStatus()).toBe("synced");
  });

  it("reports offline when the browser loses connectivity, and recovers when it returns", () => {
    const store = createFirestoreDropStore(FAKE_DB, "player-1");

    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    window.dispatchEvent(new Event("offline"));
    expect(store.syncStatus.getStatus()).toBe("offline");

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    window.dispatchEvent(new Event("online"));
    expect(store.syncStatus.getStatus()).toBe("synced");
  });

  it("reports error when the snapshot listener fails with a non-transient error", () => {
    let errorCallback: ((error: unknown) => void) | undefined;
    vi.mocked(onSnapshot).mockImplementation((...args: unknown[]) => {
      errorCallback = args[2] as (error: unknown) => void;
      return vi.fn();
    });
    const store = createFirestoreDropStore(FAKE_DB, "player-1");
    store.get("gl-timer-star-battery");

    errorCallback?.({ code: "permission-denied" });

    expect(store.syncStatus.getStatus()).toBe("error");
  });

  it("does not recreate the listener on repeated access after a non-transient error", () => {
    let errorCallback: ((error: unknown) => void) | undefined;
    vi.mocked(onSnapshot).mockImplementation((...args: unknown[]) => {
      errorCallback = args[2] as (error: unknown) => void;
      return vi.fn();
    });
    const store = createFirestoreDropStore(FAKE_DB, "player-1");
    store.get("gl-timer-star-battery");
    expect(onSnapshot).toHaveBeenCalledTimes(1);

    errorCallback?.({ code: "permission-denied" });
    store.get("gl-timer-star-battery");
    store.get("gl-timer-star-battery");

    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });

  it("clears a previous error once a later snapshot succeeds", () => {
    let onNext: ((snapshot: unknown) => void) | undefined;
    let errorCallback: ((error: unknown) => void) | undefined;
    vi.mocked(onSnapshot).mockImplementation((...args: unknown[]) => {
      onNext = args[1] as (snapshot: unknown) => void;
      errorCallback = args[2] as (error: unknown) => void;
      return vi.fn();
    });
    const store = createFirestoreDropStore(FAKE_DB, "player-1");
    store.get("gl-timer-star-battery");
    errorCallback?.({ code: "permission-denied" });
    expect(store.syncStatus.getStatus()).toBe("error");

    onNext?.({ data: () => undefined });

    expect(store.syncStatus.getStatus()).toBe("synced");
  });

  it("notifies subscribers only when the status actually changes", async () => {
    const write = deferred<void>();
    vi.mocked(setDoc).mockReturnValueOnce(write.promise);
    const store = createFirestoreDropStore(FAKE_DB, "player-1");
    const onChange = vi.fn();
    store.syncStatus.subscribe(onChange);

    store.set("gl-timer-star-battery", 1000, 500);
    expect(onChange).toHaveBeenCalledTimes(1);

    write.resolve();
    await flush();

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
