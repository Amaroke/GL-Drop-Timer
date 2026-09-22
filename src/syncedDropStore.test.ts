import { describe, expect, it, vi } from "vitest";
import { createAuthStore, type AuthService } from "./auth";
import { createMemoryDropStore, type DropStore } from "./dropStore";
import type { SyncStatus, SyncStatusStore } from "./firestoreDropStore";
import { createSyncedDropStore } from "./syncedDropStore";

function fakeRemoteStore(initial: Record<string, number> = {}) {
  const store = createMemoryDropStore(initial);
  let status: SyncStatus = "synced";
  const listeners = new Set<() => void>();
  const syncStatus: SyncStatusStore = {
    getStatus: () => status,
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
  return {
    store: Object.assign({}, store, { syncStatus }) as DropStore & { syncStatus: SyncStatusStore },
    setStatus(next: SyncStatus) {
      status = next;
      listeners.forEach((onChange) => onChange());
    },
  };
}

function authServiceFrom(store: ReturnType<typeof createAuthStore>): AuthService {
  return {
    getState: store.getState,
    subscribe: store.subscribe,
    signIn: async () => {},
    signOut: async () => {},
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createSyncedDropStore", () => {
  it("uses the local store while signed out", () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => createMemoryDropStore(),
      mergeLocalIntoRemote: async () => {},
    });

    expect(store.get("drop-a")?.readyAt).toBe(1000);
    store.set("drop-a", 2000, 50);
    expect(localStore.get("drop-a")).toEqual({ readyAt: 2000, updatedAt: 50 });
  });

  it("keeps using the local store while the merge into the account is in flight", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore();
    const merge = deferred<void>();
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: () => merge.promise,
    });

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });

    expect(store.get("drop-a")?.readyAt).toBe(1000);
    store.set("drop-a", 3000, 60);
    expect(remoteStore.get("drop-a")).toBeNull();
  });

  it("switches to the account store once the merge completes", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore({ "drop-a": 4000 });
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {},
    });

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(store.get("drop-a")?.readyAt).toBe(4000);
    store.set("drop-a", 5000, 70);
    expect(remoteStore.get("drop-a")).toEqual({ readyAt: 5000, updatedAt: 70 });
    expect(localStore.get("drop-a")?.readyAt).toBe(1000);
  });

  it("notifies existing subscribers when the backing store switches", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore();
    const remoteStore = createMemoryDropStore({ "drop-a": 9000 });
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {},
    });
    const onChange = vi.fn();
    store.subscribe("drop-a", onChange);

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(onChange).toHaveBeenCalled();
    expect(store.get("drop-a")?.readyAt).toBe(9000);
  });

  it("stops reacting to local store changes once switched to the account store", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore();
    const remoteStore = createMemoryDropStore();
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {},
    });
    const onChange = vi.fn();
    store.subscribe("drop-a", onChange);
    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();
    onChange.mockClear();

    localStore.set("drop-a", 1234, 1);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("reverts to the local store when signing out", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore({ "drop-a": 9000 });
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {},
    });
    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(store.get("drop-a")?.readyAt).toBe(9000);

    authStore.setState({ status: "signed-out" });

    expect(store.get("drop-a")?.readyAt).toBe(1000);
  });

  it("does not tear down and rebuild subscriptions when auth re-fires signed-in for the same uid", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore();
    const remoteStore = createMemoryDropStore({ "drop-a": 9000 });
    const subscribeSpy = vi.spyOn(remoteStore, "subscribe");
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {},
    });
    const onChange = vi.fn();
    store.subscribe("drop-a", onChange);

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();
    subscribeSpy.mockClear();

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it("re-merges before switching when a write races the in-flight merge", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore();
    let resolveFirstMerge!: () => void;
    const firstMergeGate = new Promise<void>((resolve) => (resolveFirstMerge = resolve));
    let mergeCalls = 0;
    const mergeLocalIntoRemote = async () => {
      mergeCalls += 1;
      if (mergeCalls === 1) await firstMergeGate;
      const local = localStore.get("drop-a");
      const remote = remoteStore.get("drop-a");
      if (!local) return;
      if (remote && remote.updatedAt >= local.updatedAt) return;
      remoteStore.set("drop-a", local.readyAt, local.updatedAt);
    };
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote,
    });

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    store.set("drop-a", 2000, 999);
    resolveFirstMerge();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mergeCalls).toBe(2);
    expect(store.get("drop-a")?.readyAt).toBe(2000);
  });

  it("does not get stuck on the local store when the merge rejects", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore({ "drop-a": 9000 });
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {
        throw new Error("network error");
      },
    });

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(store.get("drop-a")?.readyAt).toBe(9000);
  });

  it("stays on the local store while auth is restoring", () => {
    const authStore = createAuthStore({ status: "restoring" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore({ "drop-a": 9000 });
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {},
    });

    expect(store.get("drop-a")?.readyAt).toBe(1000);
  });

  it("switches to the account store once restoring resolves to signed-in", async () => {
    const authStore = createAuthStore({ status: "restoring" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore({ "drop-a": 9000 });
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: async () => {},
    });

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(store.get("drop-a")?.readyAt).toBe(9000);
  });

  it("ignores a stale merge result when the user signs out before it resolves", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const localStore = createMemoryDropStore({ "drop-a": 1000 });
    const remoteStore = createMemoryDropStore({ "drop-a": 9000 });
    const merge = deferred<void>();
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore,
      createRemoteStore: () => remoteStore,
      mergeLocalIntoRemote: () => merge.promise,
    });

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    authStore.setState({ status: "signed-out" });
    merge.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.get("drop-a")?.readyAt).toBe(1000);
  });
});

describe("createSyncedDropStore sync status", () => {
  it("reports no sync status while signed out", () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const remote = fakeRemoteStore();
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore: createMemoryDropStore(),
      createRemoteStore: () => remote.store,
      mergeLocalIntoRemote: async () => {},
    });

    expect(store.getSyncStatus()).toBeNull();
  });

  it("forwards the remote store's sync status once switched over", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const remote = fakeRemoteStore();
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore: createMemoryDropStore(),
      createRemoteStore: () => remote.store,
      mergeLocalIntoRemote: async () => {},
    });

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getSyncStatus()).toBe("synced");
    remote.setStatus("syncing");
    expect(store.getSyncStatus()).toBe("syncing");
  });

  it("notifies sync status subscribers when the remote status changes", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const remote = fakeRemoteStore();
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore: createMemoryDropStore(),
      createRemoteStore: () => remote.store,
      mergeLocalIntoRemote: async () => {},
    });
    const onChange = vi.fn();
    store.subscribeSyncStatus(onChange);

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();
    onChange.mockClear();

    remote.setStatus("error");

    expect(onChange).toHaveBeenCalled();
  });

  it("reverts to no sync status on sign-out and stops reacting to the old remote status", async () => {
    const authStore = createAuthStore({ status: "signed-out" });
    const remote = fakeRemoteStore();
    const store = createSyncedDropStore({
      auth: authServiceFrom(authStore),
      localStore: createMemoryDropStore(),
      createRemoteStore: () => remote.store,
      mergeLocalIntoRemote: async () => {},
    });
    const onChange = vi.fn();
    store.subscribeSyncStatus(onChange);

    authStore.setState({
      status: "signed-in",
      user: { uid: "1", displayName: null, email: null },
    });
    await Promise.resolve();
    await Promise.resolve();

    authStore.setState({ status: "signed-out" });
    expect(store.getSyncStatus()).toBeNull();

    onChange.mockClear();
    remote.setStatus("error");
    expect(onChange).not.toHaveBeenCalled();
  });
});
