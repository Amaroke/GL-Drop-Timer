import { useState } from "react";
import { AccountControl } from "./AccountControl";
import type { AuthService } from "./auth";
import type { DropStore } from "./dropStore";
import { DROPS } from "./drops";
import { Modal } from "./Modal";
import { NotificationsControl } from "./NotificationsControl";
import { PlannerPlaceholder } from "./PlannerPlaceholder";
import { TimerCard } from "./TimerCard";
import { TimerChip } from "./TimerChip";
import { useDropsTimers } from "./useDropsTimers";
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
  const timers = useDropsTimers(DROPS, store, now);
  const [advancedDropKey, setAdvancedDropKey] = useState<string | null>(null);
  const advancedDrop = DROPS.find((drop) => drop.storageKey === advancedDropKey) ?? null;

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-6 py-8">
      <main className="flex flex-1 flex-col">
        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="hidden sm:block sm:flex-shrink-0">
            <NotificationsControl permission={permission} requestPermission={requestPermission} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:flex-nowrap sm:justify-center sm:gap-4">
            {DROPS.map((drop) => (
              <TimerChip
                key={drop.storageKey}
                {...drop}
                {...timers[drop.storageKey]}
                onOpenAdvanced={() => setAdvancedDropKey(drop.storageKey)}
              />
            ))}
          </div>

          <div className="sm:flex-shrink-0">
            <AccountControl auth={auth} />
          </div>
        </div>

        <PlannerPlaceholder />
      </main>

      {advancedDrop && (
        <Modal
          label={`Advanced settings for ${advancedDrop.name}`}
          onClose={() => setAdvancedDropKey(null)}
        >
          <TimerCard
            key={advancedDrop.storageKey}
            {...advancedDrop}
            {...timers[advancedDrop.storageKey]}
            now={now}
          />
        </Modal>
      )}

      <footer className="mt-12 text-center text-sm text-white/30">
        Timers are saved in your browser.
      </footer>
    </div>
  );
}

export default App;
