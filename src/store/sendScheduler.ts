import { createNotifier } from "./pubSub";

export type SyncStatus = "synced" | "sending" | "pending" | "offline" | "error";

export type SyncStatusStore = {
  getStatus(): SyncStatus;
  getNextSendAt(): number | null;
  subscribe(onChange: () => void): () => void;
  saveNow(): void;
};

export type SendSource = {
  hasPending(): boolean;
  send(): Promise<void>;
};

export const SEND_INTERVAL_MS = 5 * 60 * 1000;
export const SEND_TIMEOUT_MS = 30 * 1000;

function withTimeout(promise: Promise<unknown>, timeoutMs: number) {
  let id: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error("send timed out")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
}

export function createSendScheduler(options: { intervalMs?: number } = {}) {
  const intervalMs = options.intervalMs ?? SEND_INTERVAL_MS;
  const sources = new Set<SendSource>();
  const notifier = createNotifier();

  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextSendAt: number | null = null;
  let sending = false;
  let sendFailed = false;
  let resendRequested = false;
  let readFailed = false;
  let isOnline = typeof navigator?.onLine === "boolean" ? navigator.onLine : true;
  let disposed = false;

  const hasPending = () => [...sources].some((source) => source.hasPending());

  function computeStatus(): SyncStatus {
    const pending = hasPending();
    if (sending) return isOnline ? "sending" : "offline";
    if (pending && !isOnline) return "offline";
    if (sendFailed || readFailed) return "error";
    return pending ? "pending" : "synced";
  }

  let status = computeStatus();
  let publishedNextSendAt: number | null = nextSendAt;
  function refresh() {
    const next = computeStatus();
    if (next === status && nextSendAt === publishedNextSendAt) return;
    status = next;
    publishedNextSendAt = nextSendAt;
    notifier.notify();
  }

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    nextSendAt = null;
  }

  function startTimer() {
    if (disposed || timer !== null) return;
    nextSendAt = Date.now() + intervalMs;
    timer = setTimeout(() => void flush(), intervalMs);
  }

  async function flush() {
    clearTimer();
    if (sending) resendRequested = true;
    if (disposed || sending || !isOnline) return refresh();
    const dirty = [...sources].filter((source) => source.hasPending());
    if (dirty.length === 0) return refresh();
    sending = true;
    refresh();
    try {
      await withTimeout(Promise.all(dirty.map((source) => source.send())), SEND_TIMEOUT_MS);
      sendFailed = false;
    } catch {
      sendFailed = true;
    } finally {
      sending = false;
      const sendAgain = resendRequested && !sendFailed && hasPending();
      resendRequested = false;
      if (sendAgain) void flush();
      else if (hasPending()) startTimer();
      refresh();
    }
  }

  function handleOnline() {
    isOnline = true;
    void flush();
    refresh();
  }

  function handleOffline() {
    isOnline = false;
    refresh();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") void flush();
  }

  function handlePageHide() {
    void flush();
  }

  const hasBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  if (hasBrowser) {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return {
    register(source: SendSource) {
      sources.add(source);
      return () => sources.delete(source);
    },
    changed() {
      if (hasPending() && !sending) startTimer();
      refresh();
    },
    setReadFailed(failed: boolean) {
      readFailed = failed;
      refresh();
    },
    flush,
    dispose() {
      disposed = true;
      clearTimer();
      if (!hasBrowser) return;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
    syncStatus: {
      getStatus: () => status,
      getNextSendAt: () => nextSendAt,
      subscribe: notifier.subscribe,
      saveNow: () => void flush(),
    } satisfies SyncStatusStore,
  };
}

export type SendScheduler = ReturnType<typeof createSendScheduler>;
