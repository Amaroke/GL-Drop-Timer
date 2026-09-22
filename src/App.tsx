import { AccountControl } from "./AccountControl";
import type { AuthService } from "./auth";
import type { DropStore } from "./dropStore";
import { DROPS } from "./drops";
import { NotificationsControl } from "./NotificationsControl";
import { PlannerPlaceholder } from "./PlannerPlaceholder";
import { TimerCard } from "./TimerCard";
import { useReadyDropTitle } from "./useReadyDropTitle";
import { useReadyNotifications } from "./useReadyNotifications";

type AppProps = {
  store: DropStore;
  auth: AuthService;
  now: () => number;
};

const STORAGE_KEYS = DROPS.map((drop) => drop.storageKey);

function App({ store, auth, now }: AppProps) {
  useReadyDropTitle(store, STORAGE_KEYS, now);
  const { permission, requestPermission } = useReadyNotifications(DROPS, store, now);

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col px-6 py-8">
      <main className="flex flex-1 flex-col">
        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="hidden sm:block">
            <NotificationsControl permission={permission} requestPermission={requestPermission} />
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:flex-1 sm:grid-cols-3 sm:gap-6">
            {DROPS.map((drop) => (
              <TimerCard key={drop.storageKey} {...drop} store={store} now={now} />
            ))}
          </div>

          <AccountControl auth={auth} />
        </div>

        <PlannerPlaceholder />
      </main>

      <footer className="mt-12 text-center text-sm text-white/30">
        Timers are saved in your browser.
      </footer>
    </div>
  );
}

export default App;
