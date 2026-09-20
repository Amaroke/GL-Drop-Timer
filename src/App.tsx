import type { DropStore } from "./dropStore";
import { DROPS } from "./drops";
import { TimerCard } from "./TimerCard";
import { useReadyDropTitle } from "./useReadyDropTitle";
import { useReadyNotifications } from "./useReadyNotifications";

type AppProps = {
  store: DropStore;
  now: () => number;
};

const STORAGE_KEYS = DROPS.map((drop) => drop.storageKey);

function App({ store, now }: AppProps) {
  useReadyDropTitle(store, STORAGE_KEYS, now);
  const { permission, requestPermission } = useReadyNotifications(DROPS, store, now);

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col items-center justify-center px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">GL Drop Timer</h1>
        <p className="mt-2 text-white/50">Track the cooldown of your free Galaxy Life items</p>
        {permission === "default" && (
          <button
            type="button"
            onClick={requestPermission}
            className="mt-4 rounded-xl bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Enable notifications
          </button>
        )}
        {permission === "granted" && (
          <p className="mt-4 text-sm text-white/40">Notifications enabled</p>
        )}
        {permission === "denied" && (
          <p className="mt-4 text-sm text-white/40">Notifications blocked</p>
        )}
      </header>

      <main className="grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        {DROPS.map((drop) => (
          <TimerCard key={drop.storageKey} {...drop} store={store} now={now} />
        ))}
      </main>

      <footer className="mt-12 text-center text-sm text-white/30">
        Timers are saved in your browser.
      </footer>
    </div>
  );
}

export default App;
